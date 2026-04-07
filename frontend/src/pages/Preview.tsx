import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

interface PreviewData {
  code: string;
  original_url: string;
  safe: boolean;
  clicks: number;
  created_at: number;
  expires_at: number | null;
}

export default function Preview() {
  const { code } = useParams<{ code: string }>();

  const { data, isLoading, error } = useQuery<PreviewData>({
    queryKey: ['preview', code],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/preview/${code}`);
      if (!res.ok) throw new Error('見つかりません');
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm tracking-wide text-warm-black-50">
        読み込み中...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm tracking-wide text-vivid-red">
        短縮URLが見つかりません
      </div>
    );
  }

  const domain = new URL(data.original_url).hostname;

  return (
    <div className="space-y-8 pt-16">
      <h2 className="text-2xl font-bold tracking-widest text-warm-black">
        リンクプレビュー
      </h2>

      <div className="space-y-6 rounded-2xl border border-warm-black-25 bg-warm-white p-8 shadow-sm">
        {!data.safe && (
          <div className="rounded-xl border border-vivid-red/30 bg-vivid-red/5 px-5 py-4 text-sm tracking-wide text-vivid-red">
            このリンクは安全でない可能性があります。アクセスする場合はご注意ください。
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold tracking-wide text-warm-black-50">
              宛先URL
            </label>
            <p className="mt-1 break-all text-sm tracking-wide text-warm-black">
              {data.original_url}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold tracking-wide text-warm-black-50">
                ドメイン
              </label>
              <p className="mt-1 text-sm tracking-wide text-warm-black">
                {domain}
              </p>
            </div>
            <div>
              <label className="text-xs font-bold tracking-wide text-warm-black-50">
                クリック数
              </label>
              <p className="mt-1 text-sm tracking-wide text-warm-black">
                {data.clicks.toLocaleString()}
              </p>
            </div>
            <div>
              <label className="text-xs font-bold tracking-wide text-warm-black-50">
                ステータス
              </label>
              <p className={`mt-1 text-sm tracking-wide ${data.safe ? 'text-warm-green' : 'text-vivid-red'}`}>
                {data.safe ? '安全' : '注意'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold tracking-wide text-warm-black-50">
                作成日時
              </label>
              <p className="mt-1 text-sm tracking-wide text-warm-black">
                {new Date(data.created_at * 1000).toLocaleDateString('ja-JP')}
              </p>
            </div>
            {data.expires_at && (
              <div>
                <label className="text-xs font-bold tracking-wide text-warm-black-50">
                  有効期限
                </label>
                <p className="mt-1 text-sm tracking-wide text-warm-black">
                  {new Date(data.expires_at * 1000).toLocaleDateString('ja-JP')}
                </p>
              </div>
            )}
          </div>
        </div>

        <a
          href={data.original_url}
          target="_blank"
          rel="noopener noreferrer"
          className="interactive-scale mt-4 block w-full rounded-xl border border-warm-black bg-warm-black px-8 py-3 text-center text-sm font-bold tracking-widest text-warm-white shadow-sm hover:shadow-lg transition-all duration-400"
          style={{ transitionTimingFunction: 'var(--ease-magnetic)' }}
        >
          このリンクを開く
        </a>
      </div>
    </div>
  );
}
