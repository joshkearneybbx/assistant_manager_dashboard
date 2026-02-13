interface AlertCardProps {
  title: string;
  redCount: number;
  amberCount: number;
  onClick?: () => void;
}

export function AlertCard({ title, redCount, amberCount, onClick }: AlertCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-lg border border-sand-300 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:bg-sand-100"
    >
      <div className="text-sm font-semibold text-base-black">{title}</div>
      <div className="mt-3 flex gap-4">
        <span className="inline-flex items-center rounded-full border border-status-red bg-status-red-light px-2 py-0.5 text-xs font-semibold text-status-red">
          {redCount} Red
        </span>
        <span className="inline-flex items-center rounded-full border border-status-orange bg-status-orange-light px-2 py-0.5 text-xs font-semibold text-status-orange-text">
          {amberCount} Amber
        </span>
      </div>
    </button>
  );
}
