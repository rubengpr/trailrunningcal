'use client';

import Image from 'next/image';
import { ExternalLink } from 'lucide-react';

interface PromoBannerProps {
  alt: string;
  className?: string;
  desktopImage?: {
    src: string;
    width: number;
    height: number;
  };
  href?: string;
  isVisible?: boolean;
  mobileImage?: {
    src: string;
    width: number;
    height: number;
  };
  onClick?: () => void;
}

export function PromoBanner({
  alt,
  className = '',
  desktopImage = {
    src: '/assets/sponsors/trc-banner-desktop.webp',
    width: 1800,
    height: 300,
  },
  href,
  isVisible = false,
  mobileImage,
  onClick,
}: PromoBannerProps) {
  if (!isVisible) return null;

  const content = (
    <div className="w-full min-w-0 overflow-hidden rounded-[10px] bg-white shadow-sm">
      {mobileImage && (
        <Image
          src={mobileImage.src}
          width={mobileImage.width}
          height={mobileImage.height}
          alt={alt}
          sizes="100vw"
          className="block h-auto w-full sm:hidden"
          priority={false}
        />
      )}
      <Image
        src={desktopImage.src}
        width={desktopImage.width}
        height={desktopImage.height}
        alt={alt}
        sizes="(min-width: 1024px) 50vw, 100vw"
        className={`${mobileImage ? 'hidden sm:block' : 'block'} h-auto w-full`}
        priority={false}
      />
    </div>
  );

  return (
    <aside className={`w-full min-w-0 ${className}`}>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClick}
          className="block w-full min-w-0"
        >
          {content}
        </a>
      ) : content}
    </aside>
  );
}

interface PromoTextStripProps {
  backgroundColor: string;
  code: string;
  href?: string;
  isVisible?: boolean;
  message: string;
  onClick?: () => void;
}

export function PromoTextStrip({
  backgroundColor,
  code,
  href,
  isVisible = false,
  message,
  onClick,
}: PromoTextStripProps) {
  if (!isVisible) return null;

  const content = (
    <p className="flex min-h-9 items-center justify-center gap-1.5 px-4 py-2 text-center text-xs font-medium text-white sm:text-sm">
      <span>{message}</span>
      <span className="font-semibold underline underline-offset-2">{code}</span>
      {href && <ExternalLink aria-hidden className="size-3 shrink-0" />}
    </p>
  );

  return (
    <aside
      className="w-full border-b border-black/15"
      style={{ backgroundColor }}
    >
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClick}
          className="block w-full"
        >
          {content}
        </a>
      ) : (
        content
      )}
    </aside>
  );
}
