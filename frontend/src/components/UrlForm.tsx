import { useState } from 'react';

interface UrlFormProps {
  onSubmit: (data: {
    url: string;
    customCode?: string;
    utm?: {
      source?: string;
      medium?: string;
      campaign?: string;
      term?: string;
      content?: string;
    };
    expiresIn?: number;
  }) => void;
  isLoading: boolean;
}

export default function UrlForm({ onSubmit, isLoading }: UrlFormProps) {
  const [url, setUrl] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [customCode, setCustomCode] = useState('');
  const [utmSource, setUtmSource] = useState('');
  const [utmMedium, setUtmMedium] = useState('');
  const [utmCampaign, setUtmCampaign] = useState('');
  const [utmTerm, setUtmTerm] = useState('');
  const [utmContent, setUtmContent] = useState('');
  const [expiresIn, setExpiresIn] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const utm = {
      source: utmSource || undefined,
      medium: utmMedium || undefined,
      campaign: utmCampaign || undefined,
      term: utmTerm || undefined,
      content: utmContent || undefined,
    };
    const hasUtm = Object.values(utm).some(Boolean);

    onSubmit({
      url,
      customCode: customCode || undefined,
      utm: hasUtm ? utm : undefined,
      expiresIn: expiresIn ? parseInt(expiresIn) * 3600 : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="mb-2 block text-sm font-bold tracking-wide text-warm-black-50">
          URL
        </label>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          required
          className="w-full rounded-xl border border-warm-black-25 bg-warm-white px-4 py-3 text-warm-black tracking-wide placeholder:text-warm-black-50 focus:border-warm-black focus:outline-none transition-colors duration-400"
          style={{ transitionTimingFunction: 'var(--ease-magnetic)' }}
        />
      </div>

      <button
        type="button"
        onClick={() => setShowOptions(!showOptions)}
        className="text-sm tracking-wide text-warm-black-50 hover:text-warm-black transition-colors duration-400"
        style={{ transitionTimingFunction: 'var(--ease-magnetic)' }}
      >
        {showOptions ? '- オプションを閉じる' : '+ オプション（UTM・カスタムコード・有効期限）'}
      </button>

      {showOptions && (
        <div className="space-y-4 rounded-xl border border-warm-black-25 p-5">
          <div>
            <label className="mb-1 block text-xs font-bold tracking-wide text-warm-black-50">
              カスタムコード
            </label>
            <input
              type="text"
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value)}
              placeholder="my-link"
              pattern="[A-Za-z0-9_-]+"
              className="w-full rounded-lg border border-warm-black-25 bg-warm-white px-3 py-2 text-sm text-warm-black tracking-wide placeholder:text-warm-black-50 focus:border-warm-black focus:outline-none transition-colors duration-400"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold tracking-wide text-warm-black-50">
              有効期限（時間）
            </label>
            <input
              type="number"
              value={expiresIn}
              onChange={(e) => setExpiresIn(e.target.value)}
              placeholder="72"
              min="1"
              className="w-full rounded-lg border border-warm-black-25 bg-warm-white px-3 py-2 text-sm text-warm-black tracking-wide placeholder:text-warm-black-50 focus:border-warm-black focus:outline-none transition-colors duration-400"
            />
          </div>

          <fieldset>
            <legend className="mb-2 text-xs font-bold tracking-wide text-warm-black-50">
              UTM パラメータ
            </legend>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Source', value: utmSource, set: setUtmSource },
                { label: 'Medium', value: utmMedium, set: setUtmMedium },
                { label: 'Campaign', value: utmCampaign, set: setUtmCampaign },
                { label: 'Term', value: utmTerm, set: setUtmTerm },
                { label: 'Content', value: utmContent, set: setUtmContent },
              ].map((f) => (
                <input
                  key={f.label}
                  type="text"
                  value={f.value}
                  onChange={(e) => f.set(e.target.value)}
                  placeholder={f.label}
                  className="rounded-lg border border-warm-black-25 bg-warm-white px-3 py-2 text-sm text-warm-black tracking-wide placeholder:text-warm-black-50 focus:border-warm-black focus:outline-none transition-colors duration-400"
                />
              ))}
            </div>
          </fieldset>
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading || !url}
        className="interactive-scale w-full rounded-xl border border-warm-black bg-warm-black px-8 py-3 text-sm font-bold tracking-widest text-warm-white shadow-sm hover:shadow-lg disabled:opacity-40 disabled:pointer-events-none transition-all duration-400"
        style={{ transitionTimingFunction: 'var(--ease-magnetic)' }}
      >
        {isLoading ? '生成中...' : '短縮する'}
      </button>
    </form>
  );
}
