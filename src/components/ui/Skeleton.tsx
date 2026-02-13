import clsx from 'clsx';

function Bone({ className }: { className?: string }) {
  return <div className={clsx('animate-pulse rounded bg-sand-300/60', className)} />;
}

export function SkeletonStatCards({ count = 3 }: { count?: number }) {
  return (
    <div className={`grid grid-cols-1 gap-4 md:grid-cols-${count}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border border-sand-300 bg-white p-4 shadow-sm">
          <Bone className="h-3 w-20" />
          <Bone className="mt-3 h-7 w-16" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonAlertCards() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-sand-300 bg-white p-4 shadow-sm">
          <Bone className="h-4 w-32" />
          <div className="mt-3 flex gap-4">
            <Bone className="h-5 w-16 rounded-full" />
            <Bone className="h-5 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-lg border border-sand-300 bg-white shadow-sm">
      <div className="bg-sand-100 px-4 py-3">
        <div className="flex gap-8">
          {Array.from({ length: cols }).map((_, i) => (
            <Bone key={i} className="h-3 w-20" />
          ))}
        </div>
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="border-t border-sand-300 px-4 py-3">
          <div className="flex gap-8">
            {Array.from({ length: cols }).map((_, j) => (
              <Bone key={j} className="h-4 w-24" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-sand-300 bg-white p-5 shadow-sm">
        <Bone className="h-7 w-48" />
        <Bone className="mt-2 h-4 w-80" />
      </div>
      <SkeletonStatCards count={3} />
      <SkeletonTable />
    </div>
  );
}
