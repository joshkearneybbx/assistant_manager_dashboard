import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatDuration } from '../../lib/format';
import { ClientTimeBreakdownRow } from '../../types';

interface CategoryBreakdownProps {
  data: ClientTimeBreakdownRow[];
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-sand-300 bg-white px-3 py-2 shadow-sm">
      <div className="text-xs font-medium text-base-black">{label}</div>
      <div className="mt-0.5 text-sm tabular-nums text-grey-400">{formatDuration(Number(payload[0].value))}</div>
    </div>
  );
}

export function CategoryBreakdown({ data }: CategoryBreakdownProps) {
  if (!data.length) {
    return <div className="text-sm text-grey-400">No time data for this period.</div>;
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E8E5E0" />
          <XAxis dataKey="category" tick={{ fill: '#696968', fontSize: 12 }} interval={0} angle={-30} textAnchor="end" height={50} />
          <YAxis tick={{ fill: '#696968', fontSize: 12 }} tickFormatter={(value) => formatDuration(Number(value))} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="minutes" fill="#274346" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
