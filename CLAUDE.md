# CLAUDE.md — tanshuku-url

## プロジェクト概要

Cloudflare完結の短縮URLサービス。Workers (Hono) + D1 + KV + Workers Static Assets。

## 技術スタック

- **ランタイム**: Cloudflare Workers
- **フレームワーク**: Hono
- **DB**: Cloudflare D1 (SQLite)
- **キャッシュ**: Cloudflare KV
- **フロントエンド**: React + Vite + Tailwind CSS v4
- **チャート**: Recharts
- **データフェッチ**: @tanstack/react-query

## ディレクトリ構成

```
src/              # Cloudflare Worker (Hono)
├── index.ts      # エントリポイント・ルート定義
├── routes/       # APIルート (shorten, redirect, analytics)
└── lib/          # ユーティリティ (code生成, UTM, SafeBrowsing, 型)
frontend/         # React SPA
├── src/
│   ├── pages/    # Home, Preview, Dashboard
│   └── components/
schema.sql        # D1スキーマ
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

| メソッド | パス | 説明 |
|---------|------|------|
| POST | /api/shorten | URL短縮 |
| GET | /:code | リダイレクト |
| GET | /:code+ | プレビューへ302 |
| GET | /api/analytics/summary | サマリー統計 |
| GET | /api/analytics/urls | URL一覧 |
| GET | /api/analytics/clicks/:code | クリック時系列 |
| GET | /api/analytics/preview/:code | プレビュー情報 |

## デザインシステム

katasu.me のデザインを踏襲:
- カラー: warm-black (#483030) / warm-white (#fefbfb) の2トーン
- フォント: Reddit Sans + IBM Plex Sans JP
- 背景: ドットグリッドパターン (16px間隔)
- ボタン: rounded-xl, border, magnetic easing
- アニメーション: cubic-bezier(.16,1,.3,1)

## 環境変数・Secrets

- `SHORT_DOMAIN`: 短縮URLのベースドメイン (wrangler.toml [vars])
- `GOOGLE_SAFE_BROWSING_API_KEY`: Safe Browsing APIキー (`wrangler secret put`)

## コミットメッセージ

日本語で記述。
