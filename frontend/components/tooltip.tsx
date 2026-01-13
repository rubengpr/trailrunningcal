import { ReactNode } from 'react';

interface TooltipProps {
  text: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function Tooltip({
  text,
  children,
  size = 'md',
  className = '',
}: TooltipProps) {
  const sizeMap = {
    sm: { textSize: 'text-xs', padding: 'px-2 py-1' },
    md: { textSize: 'text-xs', padding: 'px-2 py-1' },
    lg: { textSize: 'text-sm', padding: 'px-3 py-1.5' },
  };

  const { textSize, padding } = sizeMap[size];

  return (
    <div className={`group relative ${className}`}>
      {children}
      <div
        className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 ${padding} bg-white text-black ${textSize} rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 shadow-lg`}
      >
        {text}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-white"></div>
      </div>
    </div>
  );
}
