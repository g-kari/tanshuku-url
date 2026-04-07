import { useState } from 'react';
import UrlForm from '../components/UrlForm';

interface ShortenResult {
  code: string;
  shortUrl: string;
  previewUrl: string;
  safe: boolean;
  warning?: string;
}

export default function Home() {
  const [result, setResult] = useState<ShortenResult | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (data: {
    url: string;
    customCode?: string;
    utm?: Record<string, string | undefined>;
    expiresIn?: number;
  }) => {
    setIsLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'エラーが発生しました');
      } else {
        setResult(json as ShortenResult);
      }
    } catch {
      setError('通信エラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="space-y-4 pt-16 text-center">
        <h1 className="text-4xl font-bold tracking-widest text-warm-black">
          tanshuku
        </h1>
        <p className="text-sm tracking-wide text-warm-black-50">
          URLを短くする。それだけ。
        </p>
      </section>

      {/* Form */}
      <section className="rounded-2xl border border-warm-black-25 bg-warm-white p-8 shadow-sm">
        <UrlForm onSubmit={handleSubmit} isLoading={isLoading} />
      </section>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-vivid-red/30 bg-vivid-red/5 px-5 py-3 text-sm tracking-wide text-vivid-red">
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <section className="space-y-4 rounded-2xl border border-warm-black-25 bg-warm-white p-8 shadow-sm">
          {!result.safe && (
            <div className="rounded-xl border border-vivid-red/30 bg-vivid-red/5 px-5 py-3 text-sm tracking-wide text-vivid-red">
              {result.warning}
            </div>
          )}

          <div className="space-y-3">
            <label className="block text-xs font-bold tracking-wide text-warm-black-50">
              短縮URL
            </label>
            <div className="flex items-center gap-3">
              <code className="flex-1 rounded-lg border border-warm-black-25 bg-warm-black-10 px-4 py-2.5 text-sm tracking-wide text-warm-black">
                {result.shortUrl}
              </code>
              <button
                onClick={() => copyToClipboard(result.shortUrl)}
                className="interactive-scale rounded-xl border border-warm-black px-4 py-2 text-sm tracking-wide text-warm-black hover:bg-warm-black hover:text-warm-white transition-all duration-400"
                style={{ transitionTimingFunction: 'var(--ease-magnetic)' }}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold tracking-wide text-warm-black-50">
              プレビューURL
            </label>
            <code className="block rounded-lg border border-warm-black-25 bg-warm-black-10 px-4 py-2.5 text-sm tracking-wide text-warm-black-50">
              {result.previewUrl}
            </code>
          </div>
        </section>
      )}
    </div>
  );
}
