import Image from 'next/image';

interface VerifiedBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function VerifiedBadge({
  size = 'md',
  className = '',
}: VerifiedBadgeProps) {
  const sizeMap = {
    sm: { width: 16, height: 16 },
    md: { width: 20, height: 20 },
    lg: { width: 24, height: 24 },
  };

  const { width, height } = sizeMap[size];

  return (
    <Image
      src="/assets/verified.png"
      alt="Verified organizer"
      width={width}
      height={height}
      className={className}
    />
  );
}
