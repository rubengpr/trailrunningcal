import { Map } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MapToggleFabProps {
  view: 'map' | 'list';
  label: string;
  className: string;
  onClick: () => void;
}

export function MapToggleFab({ view, label, className, onClick }: MapToggleFabProps) {
  return (
    <Button type="button" variant="primary" className={className} onClick={onClick}>
      {view === 'map' ? (
        <Map width={18} height={18} strokeWidth={2} className="mr-2 shrink-0" />
      ) : (
        <svg
          width="20"
          height="20"
          viewBox="0 0 16 16"
          fill="currentColor"
          className="mr-2 shrink-0"
        >
          <rect x="1" y="2.5" width="14" height="1.5" rx="1"></rect>
          <rect x="1" y="7" width="14" height="1.5" rx="1"></rect>
          <rect x="1" y="11.5" width="14" height="1.5" rx="1"></rect>
        </svg>
      )}
      {label}
    </Button>
  );
}
