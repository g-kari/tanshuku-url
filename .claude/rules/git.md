# Git ルール

## コミットメッセージ

日本語で記述。プレフィックスは以下を使う:
- `機能追加:` 新機能
- `バグ修正:` バグ修正
- `UI改善:` デザイン・スタイル変更
- `リファクタリング:` 機能変更なしの改善
- `インフラ:` wrangler.toml, schema.sql 等
- `設定:` 設定ファイル変更

## 変更前チェック

バックエンド変更後:
```bash
npx tsc --noEmit
```

フロントエンド変更後:
```bash
cd frontend && npx tsc --noEmit && npx vite build
```

## ブランチ

`master` がメインブランチ。
