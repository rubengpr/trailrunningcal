'use client';

import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { ExternalLink } from 'lucide-react';
import type { Locale } from '@/i18n';

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

interface PromoTextStripProps {
  message: string;
  backgroundColor?: string;
  code?: string;
  href?: string;
  locale?: Locale;
  isVisible?: boolean;
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

export function PromoTextStrip({
  message,
  backgroundColor = '#010101',
  code,
  href,
  locale,
  isVisible = false,
  onClick,
}: PromoTextStripProps) {
  const pathname = usePathname();
  const isSupportedPage = locale ? pathname === `/${locale}` : true;

  if (!isVisible) return null;
  if (!isSupportedPage) return null;

  const content = (
    <p className="text-center text-xs font-normal leading-4 text-[#ffffff]">
      <span>{message}</span>
      {code ? (
        <>
          {' '}
          <span className="inline-flex items-center gap-1 whitespace-nowrap align-[-0.125em]">
            <span className="font-bold underline">{code}</span>
            <ExternalLink className="size-3" strokeWidth={2} />
          </span>
        </>
      ) : (
        <ExternalLink
          className="ml-1 inline-block size-3 align-[-0.125em]"
          strokeWidth={2}
        />
      )}
    </p>
  );

  return (
    <aside
      className="w-full border-b border-black text-center"
      style={{ backgroundColor }}
    >
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClick}
          className="block w-full px-3 py-2"
        >
          {content}
        </a>
      ) : (
        <div className="w-full px-3 py-2">{content}</div>
      )}
    </aside>
  );
}
