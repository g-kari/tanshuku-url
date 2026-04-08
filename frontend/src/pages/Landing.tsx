import { useAuth } from '../contexts/AuthContext';

const features = [
  {
    icon: '⚡',
    title: 'ワンクリック短縮',
    desc: '長いURLを瞬時に短縮。コピーしてすぐ使える。',
  },
  {
    icon: '✏️',
    title: 'カスタムコード',
    desc: '自分だけのURLコードを設定。ブランドに合わせた短縮URLを。',
  },
  {
    icon: '📊',
    title: 'アナリティクス',
    desc: 'クリック数・推移をリアルタイムで確認。どのURLが使われているか一目瞭然。',
  },
  {
    icon: '🔖',
    title: 'UTMパラメータ',
    desc: 'マーケティング計測用パラメータを自動付与。GA4との連携もシームレス。',
  },
  {
    icon: '🔒',
    title: 'Safe Browsing',
    desc: 'Google Safe Browsingで悪意あるURLを自動検出・ブロック。',
  },
  {
    icon: '⏳',
    title: '有効期限設定',
    desc: '期限付き短縮URLを発行。キャンペーンや一時的な共有に。',
  },
];

export default function Landing() {
  const { login } = useAuth();

  return (
    <div className="space-y-24 pt-8">
      {/* Hero */}
      <section className="space-y-8 py-16 text-center">
        <div className="space-y-4">
          <p className="text-xs font-bold tracking-[0.3em] text-warm-black-50 uppercase">
            URL Shortener
          </p>
          <h1 className="text-6xl font-bold tracking-widest text-warm-black">
            tanshuku
          </h1>
          <p className="text-base tracking-wide text-warm-black-50">
            URLを、もっと短く。
          </p>
        </div>

        <button
          onClick={() => login()}
          className="interactive-scale inline-flex items-center gap-2 rounded-xl border border-warm-black bg-warm-black px-8 py-3 text-sm font-bold tracking-widest text-warm-white transition-all duration-400"
          style={{ transitionTimingFunction: 'var(--ease-magnetic)' }}
        >
          はじめる
        </button>
      </section>

      {/* Features */}
      <section className="space-y-8">
        <h2 className="text-center text-xs font-bold tracking-[0.3em] text-warm-black-50 uppercase">
          Features
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-warm-black-25 bg-warm-white p-6 shadow-sm"
            >
              <div className="mb-3 text-2xl">{f.icon}</div>
              <h3 className="mb-1 text-sm font-bold tracking-wide text-warm-black">
                {f.title}
              </h3>
              <p className="text-xs leading-relaxed tracking-wide text-warm-black-50">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="rounded-2xl border border-warm-black-25 bg-warm-white p-12 text-center shadow-sm">
        <p className="mb-6 text-sm tracking-wide text-warm-black-50">
          0g0 IDアカウントで今すぐ使える
        </p>
        <button
          onClick={() => login()}
          className="interactive-scale inline-flex items-center gap-2 rounded-xl border border-warm-black bg-warm-black px-8 py-3 text-sm font-bold tracking-widest text-warm-white transition-all duration-400"
          style={{ transitionTimingFunction: 'var(--ease-magnetic)' }}
        >
          ログインして使いはじめる
        </button>
      </section>
    </div>
  );
}
