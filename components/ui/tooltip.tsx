'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  text: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Tooltip({
  text,
  children,
  size = 'md',
  className = '',
}: TooltipProps) {
  const triggerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);

  const sizeMap = {
    sm: { textSize: 'text-xs', padding: 'px-2 py-1' },
    md: { textSize: 'text-xs', padding: 'px-2 py-1' },
    lg: { textSize: 'text-sm', padding: 'px-3 py-1.5' },
  };

  const { textSize, padding } = sizeMap[size];

  const showTooltip = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition({ left: rect.left + (rect.width / 2), top: rect.top });
  }, []);

  useEffect(() => {
    if (!position) return;
    window.addEventListener('scroll', showTooltip, true);
    window.addEventListener('resize', showTooltip);
    return () => {
      window.removeEventListener('scroll', showTooltip, true);
      window.removeEventListener('resize', showTooltip);
    };
  }, [position, showTooltip]);

  return (
    <div
      ref={triggerRef}
      className={`inline-flex ${className}`.trim()}
      onMouseEnter={showTooltip}
      onMouseLeave={() => setPosition(null)}
    >
      {children}
      {position ? createPortal(
        <div
          className={`pointer-events-none fixed z-[9999] -translate-x-1/2 -translate-y-[calc(100%+8px)] rounded-md bg-white ${padding} ${textSize} whitespace-nowrap text-black shadow-lg`}
          style={{ left: position.left, top: position.top }}
        >
          {text}
          <div className="absolute left-1/2 top-full -translate-x-1/2 -mt-1 border-4 border-transparent border-t-white" />
        </div>,
        document.body,
      ) : null}
    </div>
  );
}
