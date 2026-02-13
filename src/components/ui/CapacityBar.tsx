interface CapacityBarProps {
  current: number;
  base: number;
  max: number;
}

export function CapacityBar({ current, base, max }: CapacityBarProps) {
  const pct = Math.min(100, Math.round((current / Math.max(max, 1)) * 100));
  const basePct = Math.min(100, Math.round((base / Math.max(max, 1)) * 100));
  const color = current >= max ? 'bg-status-red' : current > base ? 'bg-status-orange' : 'bg-status-green';

  return (
    <div
      className="w-full"
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={`${current} of ${max} clients`}
    >
      <div className="relative h-3 overflow-hidden rounded bg-sand-200">
        <div className={`h-full transition-all duration-300 ${color}`} style={{ width: `${pct}%` }} />
        {base > 0 && base < max && (
          <div
            className="absolute top-0 h-full w-0.5 bg-base-black/30"
            style={{ left: `${basePct}%` }}
            title={`Base capacity: ${base}`}
          />
        )}
      </div>
      <div className="mt-1 flex items-center justify-between text-xs tabular-nums text-grey-400">
        <span>{current}/{max} clients</span>
        <span>{pct}%</span>
      </div>
    </div>
  );
}
