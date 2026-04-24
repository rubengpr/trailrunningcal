import Image from 'next/image';
import Tooltip from '@/components/ui/tooltip';

interface VerifiedBadgeProps {
  tooltip?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function VerifiedBadge({ tooltip, size = 'md', className = '' }: VerifiedBadgeProps) {
  const sizeMap = {
    sm: { width: 24, height: 24, classes: 'w-3 h-3 sm:w-4 sm:h-4' },
    md: { width: 40, height: 40, classes: 'w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7' },
    lg: { width: 48, height: 48, classes: 'w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8' },
  };
  const { width, height, classes } = sizeMap[size];

  const image = (
    <Image
      src="/assets/verified.png"
      alt={tooltip ?? 'Verified'}
      width={width}
      height={height}
      className={classes}
      unoptimized
    />
  );

  if (!tooltip) return <div className={className}>{image}</div>;

  return (
    <Tooltip text={tooltip} size={size} className={className}>
      {image}
    </Tooltip>
  );
}
