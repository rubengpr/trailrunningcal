import VerifiedBadge from './verified-badge';
import Tooltip from './tooltip';

interface VerifiedBadgeWithTooltipProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function VerifiedBadgeWithTooltip({
  size = 'md',
  className = '',
}: VerifiedBadgeWithTooltipProps) {
  return (
    <Tooltip text="Organizador verificado" size={size} className={className}>
      <VerifiedBadge size={size} />
    </Tooltip>
  );
}
