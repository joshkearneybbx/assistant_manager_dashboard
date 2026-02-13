import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message = 'Failed to load data.', onRetry }: ErrorStateProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-status-red bg-status-red-light p-4">
      <AlertTriangle size={18} className="shrink-0 text-status-red" />
      <span className="text-sm text-status-red">{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-status-red/30 bg-white px-3 py-1.5 text-xs font-medium text-status-red transition-colors hover:bg-status-red-light"
        >
          <RefreshCw size={12} />
          Retry
        </button>
      )}
    </div>
  );
}
