# CLAUDE.md — tanshuku-url

## プロジェクト概要

Cloudflare完結の短縮URLサービス。Workers (Hono) + D1 + KV + Workers Static Assets。
0g0 ID (id.0g0.xyz) によるOIDC/OAuth2認証 (PKCE) を搭載。

## Serena (MCP) 利用ポリシー

**シンボル検索・コード読解にはSerenaを優先的に使用すること。**

- ファイル内のシンボル一覧取得: `get_symbols_overview` を使う
- 特定のクラス・関数の検索: `find_symbol` を使う (name_path + relative_path)
- シンボルの参照元検索: `find_referencing_symbols` を使う
- コード内パターン検索: `search_for_pattern` を使う
- ファイル全体を読む前に、まずシンボル概要で構造を把握する
- シンボルの本文は必要なときだけ読む (`include_body: true`)
- ファイル一覧: `list_dir`、ファイル検索: `find_file` を使う

## 技術スタック

- **ランタイム**: Cloudflare Workers
- **フレームワーク**: Hono
- **DB**: Cloudflare D1 (SQLite)
- **キャッシュ**: Cloudflare KV
- **認証**: 0g0 ID (OIDC/OAuth2 + PKCE)
- **フロントエンド**: React + Vite + Tailwind CSS v4
- **チャート**: Recharts
- **データフェッチ**: @tanstack/react-query

## ディレクトリ構成

```
src/              # Cloudflare Worker (Hono)
├── index.ts      # エントリポイント・ルート定義
├── routes/       # APIルート (auth, shorten, redirect, analytics)
├── middleware/    # requireAuth ミドルウェア
└── lib/          # ユーティリティ (crypto, session, oidc, code, UTM, SafeBrowsing, 型)
migrations/       # D1マイグレーションSQL
frontend/         # React SPA
├── src/
│   ├── pages/        # Home, Preview, Dashboard
│   ├── components/   # UrlForm, ClickChart, AuthGuard
│   ├── contexts/     # AuthContext
│   └── lib/          # auth ヘルパー
schema.sql        # D1初期スキーマ
wrangler.toml     # Cloudflare設定
```

## 開発コマンド

```bash
# 依存関係インストール
npm install && cd frontend && npm install

# ローカルD1初期化
npm run db:migrate:local

# 開発サーバー起動
npm run dev:all      # Worker + Vite同時起動

# フロントエンドビルド
npm run build

# デプロイ
npm run deploy

# 型チェック
npx tsc --noEmit                     # バックエンド
cd frontend && npx tsc --noEmit      # フロントエンド
```

## API エンドポイント

| メソッド | パス | 認証 | 説明 |
|---------|------|------|------|
| GET | /api/auth/login | - | ログイン開始 → 0g0 IDへリダイレクト |
| GET | /api/auth/callback | - | OIDCコールバック |
| POST | /api/auth/logout | - | ログアウト |
| GET | /api/auth/me | 必須 | 現在のユーザー情報 |
| POST | /api/shorten | 必須 | URL短縮 |
| GET | /:code | - | リダイレクト (公開) |
| GET | /:code+ | - | プレビューへ302 (公開) |
| GET | /api/preview/:code | - | プレビュー情報 (公開) |
| GET | /api/analytics/summary | 必須 | サマリー統計 |
| GET | /api/analytics/urls | 必須 | URL一覧 |
| GET | /api/analytics/clicks/:code | 必須 | クリック時系列 |

## デザインシステム

katasu.me のデザインを踏襲:
- カラー: warm-black (#483030) / warm-white (#fefbfb) の2トーン
- フォント: Reddit Sans + IBM Plex Sans JP
- 背景: ドットグリッドパターン (16px間隔)
- ボタン: rounded-xl, border, magnetic easing
- アニメーション: cubic-bezier(.16,1,.3,1)

## 環境変数・Secrets

- `SHORT_DOMAIN`: 短縮URLのベースドメイン (wrangler.toml [vars])
- `OIDC_ISSUER`: 0g0 ID発行者URL (wrangler.toml [vars])
- `OIDC_CLIENT_ID`: OIDCクライアントID (`wrangler secret put`)
- `OIDC_CLIENT_SECRET`: OIDCクライアントシークレット (`wrangler secret put`)
- `GOOGLE_SAFE_BROWSING_API_KEY`: Safe Browsing APIキー (`wrangler secret put`)

## コミットメッセージ

日本語で記述。
