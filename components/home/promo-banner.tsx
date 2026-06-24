import Image from 'next/image';
import { ExternalLink } from 'lucide-react';

interface PromoBannerProps {
  alt: string;
  className?: string;
  isVisible?: boolean;
}

interface PromoTextStripProps {
  message: string;
  code: string;
  isVisible?: boolean;
}

export function PromoBanner({
  alt,
  className = '',
  isVisible = false,
}: PromoBannerProps) {
  if (!isVisible) return null;

  return (
    <aside className={`w-full min-w-0 ${className}`}>
      <div className="relative aspect-5961/794 w-full min-w-0 overflow-hidden rounded-[10px] shadow-sm">
        <Image
          src="/assets/sponsors/crown.png"
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
  isVisible = false,
}: PromoTextStripProps) {
  if (!isVisible) return null;

  return (
    <aside className="w-full border-b border-black bg-[#d93600] px-3 py-2 text-center">
      <p className="flex min-w-0 items-center justify-center gap-1 truncate text-[10px] font-semibold leading-4 text-[#ffffff] sm:text-xs">
        <span className="min-w-0 truncate">{message}</span>
        <span className="min-w-0 truncate font-bold underline">{code}</span>
        <ExternalLink className="size-3 shrink-0" strokeWidth={2} />
      </p>
    </aside>
  );
}
