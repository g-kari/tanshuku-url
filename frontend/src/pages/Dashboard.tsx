import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import ClickChart from '../components/ClickChart';

interface Summary {
  totalUrls: number;
  totalClicks: number;
  todayClicks: number;
}

interface UrlEntry {
  code: string;
  original_url: string;
  safe: number;
  created_at: number;
  click_count: number;
}

interface UrlsResponse {
  urls: UrlEntry[];
  total: number;
  page: number;
  limit: number;
}

interface ClickData {
  code: string;
  clicks: { day: number; count: number }[];
}

export default function Dashboard() {
  const [page, setPage] = useState(1);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  const { data: summary } = useQuery<Summary>({
    queryKey: ['summary'],
    queryFn: async () => {
      const res = await fetch('/api/analytics/summary', { credentials: 'include' });
      return res.json();
    },
  });

  const { data: urls } = useQuery<UrlsResponse>({
    queryKey: ['urls', page],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/urls?page=${page}&limit=10`, { credentials: 'include' });
      return res.json();
    },
  });

  const { data: clickData } = useQuery<ClickData>({
    queryKey: ['clicks', selectedCode],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/clicks/${selectedCode}`, { credentials: 'include' });
      return res.json();
    },
    enabled: !!selectedCode,
  });

  const totalPages = urls ? Math.ceil(urls.total / urls.limit) : 0;

  return (
    <div className="space-y-12 pt-8">
      <h2 className="text-2xl font-bold tracking-widest text-warm-black">
        Dashboard
      </h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: '総URL数', value: summary?.totalUrls ?? 0 },
          { label: '総クリック', value: summary?.totalClicks ?? 0 },
          { label: '今日のクリック', value: summary?.todayClicks ?? 0 },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-warm-black-25 bg-warm-white p-6 shadow-sm"
          >
            <p className="text-xs font-bold tracking-wide text-warm-black-50">
              {card.label}
            </p>
            <p className="mt-2 text-3xl font-bold tracking-wide text-warm-black">
              {card.value.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {/* Click Chart */}
      {selectedCode && clickData && (
        <section className="space-y-4 rounded-2xl border border-warm-black-25 bg-warm-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold tracking-wide text-warm-black">
              /{selectedCode} のクリック推移
            </h3>
            <button
              onClick={() => setSelectedCode(null)}
              className="text-xs tracking-wide text-warm-black-50 hover:text-warm-black transition-colors duration-400"
            >
              閉じる
            </button>
          </div>
          <ClickChart data={clickData.clicks} />
        </section>
      )}

      {/* URL Table */}
      <section className="space-y-4">
        <div className="overflow-hidden rounded-2xl border border-warm-black-25 bg-warm-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-warm-black-25">
                <th className="px-5 py-3 text-xs font-bold tracking-wide text-warm-black-50">
                  コード
                </th>
                <th className="px-5 py-3 text-xs font-bold tracking-wide text-warm-black-50">
                  宛先URL
                </th>
                <th className="px-5 py-3 text-xs font-bold tracking-wide text-warm-black-50 text-right">
                  クリック
                </th>
                <th className="px-5 py-3 text-xs font-bold tracking-wide text-warm-black-50 text-right">
                  作成日
                </th>
              </tr>
            </thead>
            <tbody>
              {urls?.urls.map((u) => (
                <tr
                  key={u.code}
                  onClick={() => setSelectedCode(u.code)}
                  className="border-b border-warm-black-10 cursor-pointer hover:bg-warm-black-10 transition-colors duration-400"
                  style={{ transitionTimingFunction: 'var(--ease-magnetic)' }}
                >
                  <td className="px-5 py-3 tracking-wide font-bold">
                    /{u.code}
                  </td>
                  <td className="px-5 py-3 tracking-wide text-warm-black-50 truncate max-w-[200px]">
                    {u.original_url}
                  </td>
                  <td className="px-5 py-3 tracking-wide text-right">
                    {u.click_count}
                  </td>
                  <td className="px-5 py-3 tracking-wide text-warm-black-50 text-right">
                    {new Date(u.created_at * 1000).toLocaleDateString('ja-JP')}
                  </td>
                </tr>
              ))}
              {(!urls || urls.urls.length === 0) && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-8 text-center text-sm tracking-wide text-warm-black-50"
                  >
                    URLがまだありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-xl border border-warm-black px-4 py-1.5 text-sm tracking-wide text-warm-black hover:bg-warm-black hover:text-warm-white disabled:opacity-30 disabled:pointer-events-none transition-all duration-400"
              style={{ transitionTimingFunction: 'var(--ease-magnetic)' }}
            >
              Prev
            </button>
            <span className="text-sm tracking-wide text-warm-black-50">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-xl border border-warm-black px-4 py-1.5 text-sm tracking-wide text-warm-black hover:bg-warm-black hover:text-warm-white disabled:opacity-30 disabled:pointer-events-none transition-all duration-400"
              style={{ transitionTimingFunction: 'var(--ease-magnetic)' }}
            >
              Next
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
