'use client';

import Image from 'next/image';
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface BlogImageLightboxProps {
  src: string;
  alt: string;
  caption?: string;
  credit?: string;
  className?: string;
  children: ReactNode;
}

export function BlogImageLightbox({
  src,
  alt,
  caption,
  credit,
  className,
  children,
}: BlogImageLightboxProps) {
  const t = useTranslations('blog');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (window.matchMedia('(min-width: 640px)').matches) setIsOpen(true);
        }}
        aria-label={t('expandImage')}
        className={`group block cursor-default sm:cursor-pointer sm:[&_img]:transition-transform sm:[&_img]:duration-700 sm:[&_img]:ease-out sm:hover:[&_img]:transform-[scale(1.03)] ${className ?? ''}`}
      >
        {children}
        <span className="pointer-events-none absolute inset-0 hidden bg-linear-to-t from-black/30 via-black/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 sm:block" />
        <span className="absolute bottom-3 right-3 hidden size-8 items-center justify-center rounded-full bg-black/35 text-white/90 backdrop-blur-sm transition duration-300 group-hover:scale-110 group-hover:bg-black/55 group-hover:text-white sm:flex">
          <Maximize2 className="size-4" strokeWidth={2} />
        </span>
      </button>
      {isOpen
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-label={alt}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-100 flex cursor-pointer flex-col items-center justify-center gap-4 bg-black/90 p-4 pt-16 sm:p-10 sm:pt-16"
            >
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label={t('closeImage')}
                className="absolute right-3 top-3 flex size-11 cursor-pointer items-center justify-center rounded-full text-white/80 hover:bg-white/10 hover:text-white"
              >
                <X className="size-6" />
              </button>
              <div className="relative w-full flex-1">
                <Image src={src} alt={alt} fill sizes="100vw" className="object-contain" />
              </div>
              {caption || credit ? (
                <div className="max-w-2xl text-center">
                  {caption ? <p className="text-sm leading-relaxed text-white/90">{caption}</p> : null}
                  {credit ? (
                    <p className="mt-1 text-xs text-white/55">{t('imageCredit', { credit })}</p>
                  ) : null}
                </div>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
