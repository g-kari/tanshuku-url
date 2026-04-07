# tanshuku-url

Cloudflare完結のURL短縮サービス。Workers (Hono) + D1 + KV + Workers Static Assets で構成。
0g0 ID (id.0g0.xyz) によるOIDC/OAuth2認証 (PKCE) を搭載。

---

## インフラ構成

```mermaid
graph TB
    subgraph Internet
        User[ユーザー / ブラウザ]
    end

    subgraph Cloudflare["Cloudflare Edge (Global PoP)"]
        direction TB
        Worker["Cloudflare Workers\n(Hono フレームワーク)"]
        Assets["Workers Static Assets\n(React SPA)"]
        KV_URL["Cloudflare KV\n(URLキャッシュ)"]
        KV_SESSION["Cloudflare KV\n(セッション管理)"]
        D1["Cloudflare D1\n(SQLite — 永続ストレージ)"]
    end

    subgraph External["外部サービス"]
        SafeBrowsing["Google Safe Browsing API\n(URL安全性チェック)"]
        OgOID["0g0 ID\n(OIDC/OAuth2認証)"]
    end

    User -->|"HTTPS リクエスト"| Worker
    Worker -->|"SPAフォールバック"| Assets
    Assets -->|"静的ファイル配信"| User
    Worker -->|"KV GET/PUT\n(キャッシュヒット優先)"| KV_URL
    Worker -->|"セッション管理"| KV_SESSION
    Worker -->|"D1 SELECT/INSERT\n(キャッシュミス時)"| D1
    Worker -->|"POST /threatMatches:find\n(URL短縮時のみ)"| SafeBrowsing
    Worker -->|"OIDC認証フロー\n(PKCE S256)"| OgOID
```

---

## 認証フロー (0g0 ID OIDC + PKCE)

```mermaid
sequenceDiagram
    actor User
    participant SPA as React SPA
    participant Worker as Cloudflare Worker
    participant KV as KV (Sessions)
    participant D1 as D1 Database
    participant OIDC as 0g0 ID (id.0g0.xyz)

    Note over User,OIDC: ログインフロー
    User->>SPA: ログインボタンクリック
    SPA->>Worker: GET /api/auth/login?redirect_to=/
    Worker->>Worker: PKCE生成 (code_verifier, code_challenge S256)
    Worker->>Worker: state生成 (ランダム)
    Worker->>KV: PUT pkce:{state} (TTL 5分)
    Worker-->>User: 302 → id.0g0.xyz/auth/login?client_id&state&code_challenge

    User->>OIDC: ユーザー認証 (Google/GitHub/X等)
    OIDC-->>User: 302 → /api/auth/callback?code&state

    User->>Worker: GET /api/auth/callback?code&state
    Worker->>KV: GET pkce:{state} → code_verifier (削除)
    Worker->>OIDC: POST /auth/exchange { code, redirect_to }
    OIDC-->>Worker: { access_token, refresh_token, user }
    Worker->>D1: UPSERT users (id, email, name, picture)
    Worker->>KV: PUT session:{id} (TTL 30日)
    Worker-->>User: Set-Cookie: session={id}, 302 → /

    Note over User,OIDC: 認証済みAPIアクセス
    User->>Worker: POST /api/shorten (Cookie: session=xxx)
    Worker->>KV: GET session:{id}
    alt アクセストークン期限切れ
        Worker->>OIDC: POST /auth/refresh { refresh_token }
        OIDC-->>Worker: 新トークンペア
        Worker->>KV: PUT session:{id} (更新)
    end
    Worker->>D1: SELECT * FROM users WHERE id = ?
    Worker->>Worker: c.set('user', user)
    Worker->>D1: INSERT urls (created_by = user.id)
    Worker-->>User: { code, shortUrl }

    Note over User,OIDC: ログアウト
    User->>Worker: POST /api/auth/logout (Cookie: session=xxx)
    Worker->>KV: GET session:{id}
    Worker->>OIDC: POST /auth/logout { refresh_token }
    Worker->>KV: DELETE session:{id}
    Worker-->>User: Clear-Cookie, { ok: true }
```

---

## リクエストフロー

### URL短縮 (`POST /api/shorten`)

```mermaid
sequenceDiagram
    actor User
    participant Worker as Cloudflare Worker
    participant SB as Safe Browsing API
    participant D1 as D1 Database
    participant KV as KV Cache

    User->>Worker: POST /api/shorten { url, customCode?, utm?, expiresIn? }
    Worker->>Worker: URLバリデーション (URL形式, プロトコル)
    Worker->>SB: POST /threatMatches:find
    SB-->>Worker: { matches? } → safe: boolean
    Worker->>Worker: code生成 (base62 7文字 or カスタム)
    Worker->>D1: SELECT code 衝突チェック
    Worker->>D1: INSERT urls
    Worker->>KV: PUT url:{code} (TTL設定)
    Worker-->>User: { code, shortUrl, previewUrl, safe, warning? }
```

### リダイレクト (`GET /:code`)

```mermaid
sequenceDiagram
    actor User
    participant Worker as Cloudflare Worker
    participant KV as KV Cache
    participant D1 as D1 Database

    User->>Worker: GET /:code

    alt code ends with "+"
        Worker-->>User: 302 Redirect → /preview/{code} (SPA)
    else 通常リダイレクト
        Worker->>KV: GET url:{code}
        alt KV ヒット
            KV-->>Worker: cached JSON
        else KV ミス
            Worker->>D1: SELECT * FROM urls WHERE code = ?
            D1-->>Worker: UrlRecord
            Worker->>KV: PUT url:{code} (再キャッシュ)
        end

        alt safe = false
            Worker-->>User: 451 安全でない旨のテキスト
        else 有効期限切れ
            Worker-->>User: 410 Gone
        else 正常
            Worker->>Worker: buildRedirectUrl (UTMパラメータ合成)
            Worker-->>User: 302 Redirect → originalUrl + UTM
            Note over Worker: waitUntil(recordClick) — 非同期クリック記録
        end
    end
```

### クリック記録 (非同期)

```mermaid
sequenceDiagram
    participant Worker as Cloudflare Worker
    participant D1 as D1 Database

    Note over Worker: c.executionCtx.waitUntil()
    Worker->>D1: INSERT clicks (url_code, clicked_at, referer, user_agent, country, city)
```

---

## データモデル

```mermaid
erDiagram
    urls {
        TEXT code PK
        TEXT original_url
        INTEGER safe "1=safe, 0=unsafe"
        INTEGER custom_code "1=カスタム指定"
        TEXT utm_source
        TEXT utm_medium
        TEXT utm_campaign
        TEXT utm_term
        TEXT utm_content
        INTEGER created_at "Unix timestamp"
        INTEGER expires_at "NULL=永続"
    }

    clicks {
        INTEGER id PK
        TEXT url_code FK
        INTEGER clicked_at "Unix timestamp"
        TEXT referer
        TEXT user_agent
        TEXT country "CF-IPCountry"
        TEXT city "Cloudflare cf.city"
    }

    urls ||--o{ clicks : "has"
```

---

## KVキャッシュ設計

| キー | バリュー | TTL |
|------|---------|-----|
| `url:{code}` | `{ original_url, safe, utm_*, expires_at }` JSON | `expiresIn` or 30日 |

---

## SPAルーティング

```mermaid
graph LR
    subgraph Worker["Cloudflare Worker (ルーティング)"]
        R1["POST /api/shorten"]
        R2["GET /api/analytics/*"]
        R3["GET /:code"]
        R4["GET * (fallback)"]
    end

    subgraph SPA["React SPA (Workers Static Assets)"]
        P1["/  → Home.tsx\nURL短縮フォーム"]
        P2["/preview/:code → Preview.tsx\nリンクプレビュー"]
        P3["/dashboard → Dashboard.tsx\n分析ダッシュボード"]
    end

    R1 --> Response1["JSON レスポンス"]
    R2 --> Response2["JSON レスポンス"]
    R3 -->|"code+"| P2
    R3 -->|"通常"| Redirect["302 Redirect"]
    R4 --> P1
    R4 --> P3
```

---

## セットアップ

### 前提条件

- Node.js v18+
- Wrangler CLI (`npm i -g wrangler`)
- Cloudflare アカウント

### 1. リソース作成

```bash
# D1 データベース作成
wrangler d1 create tanshuku-db
# → database_id を wrangler.toml に記入

# KV Namespace 作成
wrangler kv namespace create URL_CACHE
wrangler kv namespace create URL_CACHE --preview
# → id / preview_id を wrangler.toml に記入
```

### 2. wrangler.toml 設定

```toml
[vars]
SHORT_DOMAIN = "https://<your-worker>.workers.dev"
OIDC_ISSUER = "https://id.0g0.xyz"

[[d1_databases]]
database_id = "<your-d1-id>"

[[kv_namespaces]]  # URL_CACHE
id = "<your-kv-id>"
preview_id = "<your-kv-preview-id>"

[[kv_namespaces]]  # SESSIONS
id = "<your-sessions-kv-id>"
preview_id = "<your-sessions-kv-preview-id>"
```

### 3. Secrets 設定

```bash
# 認証 (必須)
wrangler secret put OIDC_CLIENT_ID
wrangler secret put OIDC_CLIENT_SECRET

# Safe Browsing (任意)
wrangler secret put GOOGLE_SAFE_BROWSING_API_KEY
```

### 4. DBマイグレーション

```bash
# ローカル
npm run db:migrate:local

# 本番
npm run db:migrate
```

### 5. 開発

```bash
npm install
cd frontend && npm install && cd ..
npm run dev:all   # Worker (port 8787) + Vite (port 5173) 同時起動
```

### 6. デプロイ

```bash
npm run deploy    # frontend build → wrangler deploy
```

---

## API リファレンス

### `POST /api/shorten`

```json
// Request
{
  "url": "https://example.com/very/long/path",
  "customCode": "my-link",
  "utm": {
    "source": "twitter",
    "medium": "social",
    "campaign": "launch"
  },
  "expiresIn": 259200
}

// Response
{
  "code": "my-link",
  "shortUrl": "https://t.example.com/my-link",
  "previewUrl": "https://t.example.com/my-link+",
  "safe": true
}
```

### `GET /:code`

| 条件 | レスポンス |
|------|-----------|
| 通常 | 302 → `originalUrl?utm_*` |
| `+`サフィックス | 302 → `/preview/{code}` |
| 不明コード | 404 |
| 有効期限切れ | 410 |
| 安全でないURL | 451 |

### `GET /api/analytics/summary`

```json
{ "totalUrls": 42, "totalClicks": 1234, "todayClicks": 56 }
```

### `GET /api/analytics/urls?page=1&limit=20`

### `GET /api/analytics/clicks/:code?days=30`

### `GET /api/analytics/preview/:code`

---

## ローカルテスト

```bash
# URL短縮
curl -X POST http://localhost:8787/api/shorten \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://example.com","utm":{"source":"test"}}'

# リダイレクト確認
curl -L http://localhost:8787/{code}

# プレビューリダイレクト
curl -L "http://localhost:8787/{code}+"

# UI確認
open http://localhost:5173
open http://localhost:5173/dashboard
```
