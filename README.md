# tanshuku-url

Cloudflare完結のURL短縮サービス。Workers (Hono) + D1 + KV + Workers Static Assets で構成。

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
        KV["Cloudflare KV\n(URLキャッシュ)"]
        D1["Cloudflare D1\n(SQLite — 永続ストレージ)"]
    end

    subgraph External["外部サービス"]
        SafeBrowsing["Google Safe Browsing API\n(URL安全性チェック)"]
    end

    User -->|"HTTPS リクエスト"| Worker
    Worker -->|"SPAフォールバック"| Assets
    Assets -->|"静的ファイル配信"| User
    Worker -->|"KV GET/PUT\n(キャッシュヒット優先)"| KV
    Worker -->|"D1 SELECT/INSERT\n(キャッシュミス時)"| D1
    Worker -->|"POST /threatMatches:find\n(URL短縮時のみ)"| SafeBrowsing
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

[[d1_databases]]
database_id = "<your-d1-id>"

[[kv_namespaces]]
id = "<your-kv-id>"
preview_id = "<your-kv-preview-id>"
```

### 3. Secrets 設定（任意）

```bash
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
