'use client';

import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import type { Locale } from '@/i18n';

interface PromoBannerProps {
  alt: string;
  className?: string;
  isVisible?: boolean;
  variant?: 'card' | 'wide';
}

interface PromoTextStripProps {
  message: string;
  code: string;
  locale?: Locale;
  isVisible?: boolean;
}

export function PromoBanner({
  alt,
  className = '',
  isVisible = false,
  variant = 'card',
}: PromoBannerProps) {
  if (!isVisible) return null;

  const aspectClass = variant === 'wide' ? 'aspect-8/1' : 'aspect-6/1';

  return (
    <aside className={`w-full min-w-0 ${className}`}>
      <div className={`relative ${aspectClass} w-full min-w-0 overflow-hidden rounded-[10px] bg-white shadow-sm`}>
        <Image
          src="/assets/sponsors/trc-banner-desktop.webp"
          alt={alt}
          fill
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
          priority={false}
        />
      </div>
    </aside>
  );
}

export function PromoTextStrip({
  message,
  code,
  locale,
  isVisible = false,
}: PromoTextStripProps) {
  const pathname = usePathname();
  const isSupportedPage = locale ? pathname === `/${locale}` : true;

  if (!isVisible) return null;
  if (!isSupportedPage) return null;

  return (
    <aside className="sticky top-18 z-20 w-full border-b border-black bg-[#010101] px-3 py-2 text-center sm:top-20">
      <p className="flex min-w-0 items-center justify-center gap-1 truncate text-sm font-semibold leading-4 text-[#ffffff] sm:text-xs">
        <span className="min-w-0 truncate">{message}</span>
        <span className="min-w-0 truncate font-bold underline">{code}</span>
        <ExternalLink className="size-3 shrink-0" strokeWidth={2} />
      </p>
    </aside>
  );
}
