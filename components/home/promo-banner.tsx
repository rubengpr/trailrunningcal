'use client';

import Image from 'next/image';

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
