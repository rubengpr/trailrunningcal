import { TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

interface TerrainStatusPillProps {
  icon: ReactNode;
  message: string;
  action?: { label: string; onClick: () => void };
}

export function TerrainStatusPill({ icon, message, action }: TerrainStatusPillProps) {
  return (
    <div
      className="absolute left-1/2 top-3 z-20 flex max-w-[calc(100%-6rem)] -translate-x-1/2 items-center gap-2 rounded-full border border-white/70 bg-white/90 px-3 py-2 text-xs font-medium text-stone-800 shadow-sm"
      data-testid="event-track-map-terrain-status"
    >
      {icon}
      <span>{message}</span>
      {action ? (
        <button
          type="button"
          className="shrink-0 cursor-pointer rounded-full bg-stone-900 px-2.5 py-1 text-white transition-colors hover:bg-stone-700"
          onClick={action.onClick}
        >
          {action.label}
        </button>
      ) : null}
    </div>
  );
}

interface TerrainLoadErrorProps {
  message: string;
  onRetry: () => void;
  retryLabel: string;
}

export function TerrainLoadError({
  message,
  onRetry,
  retryLabel,
}: TerrainLoadErrorProps) {
  return (
    <TerrainStatusPill
      icon={<TriangleAlert className="h-4 w-4 shrink-0 text-red-500" />}
      message={message}
      action={{ label: retryLabel, onClick: onRetry }}
    />
  );
}
