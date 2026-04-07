import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface ClickChartProps {
  data: { day: number; count: number }[];
}

export default function ClickChart({ data }: ClickChartProps) {
  const formatted = data.map((d) => ({
    date: new Date(d.day * 1000).toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
    }),
    clicks: d.count,
  }));

  if (formatted.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm tracking-wide text-warm-black-50">
        クリックデータがありません
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={formatted}>
        <CartesianGrid stroke="#dfd7d7" strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: '#a39696' }}
          axisLine={{ stroke: '#dfd7d7' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#a39696' }}
          axisLine={{ stroke: '#dfd7d7' }}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            background: '#fefbfb',
            border: '1px solid #dfd7d7',
            borderRadius: '0.75rem',
            fontSize: '0.875rem',
          }}
        />
        <Line
          type="monotone"
          dataKey="clicks"
          stroke="#483030"
          strokeWidth={2}
          dot={{ fill: '#483030', r: 3 }}
          activeDot={{ fill: '#ff340b', r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
