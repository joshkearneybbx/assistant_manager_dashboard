interface StatCardProps {
  label: string;
  value: number | string;
}

export function StatCard({ label, value }: StatCardProps) {
  return (
    <article className="rounded-lg border border-sand-300 bg-white p-4 shadow-sm">
      <div className="text-sm text-grey-400">{label}</div>
      <div className="mt-2 text-2xl font-semibold tabular-nums text-base-black">{value}</div>
    </article>
  );
}
