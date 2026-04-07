# フロントエンド ルール

## デザインシステム

katasu.me デザインを維持すること:
- カラークラス: `text-warm-black`, `bg-warm-white`, `border-warm-black-25` 等を使う
- ボタン: 必ず `rounded-xl`, `tracking-wide`, `transition-all duration-400`, `interactive-scale` クラスを付与
- マグネティックイージング: `style={{ transitionTimingFunction: 'var(--ease-magnetic)' }}`

## Tailwind CSS

v4を使用。`tailwind.config.ts` ではなく CSS の `@theme` ブロックで変数定義。
カスタムクラスは `index.css` に書く。

## データフェッチ

`@tanstack/react-query` の `useQuery` を使う。
直接の `useEffect + fetch` は使わない。

## APIパス

Vite の proxy 設定 (`/api` → `http://localhost:8787`) を前提とする。
本番では同一Workerが配信するためパス変更不要。

## コンポーネント設計

- ページコンポーネント: `src/pages/`
- 再利用コンポーネント: `src/components/`
- 1ページ1ファイルを原則とする
