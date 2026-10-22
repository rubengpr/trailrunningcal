'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { SponsorPage } from '@/lib/sponsors/banner-config';
import styles from './shokz-banner.module.css';

interface ShokzBannerProps {
  className?: string;
  page: SponsorPage;
  href: string;
  onClick?: () => void;
}

export function ShokzBanner({ className = '', href, onClick, page }: ShokzBannerProps) {
  const bannerRef = useRef<HTMLElement>(null);
  const t = useTranslations('banner.sponsors.shokz');

  useEffect(() => {
    const element = bannerRef.current;
    if (!element) return;

    let visible = !('IntersectionObserver' in window);
    const updateMotion = () => {
      element.dataset.motion = visible && !document.hidden ? 'running' : 'paused';
    };
    const observer = 'IntersectionObserver' in window
      ? new IntersectionObserver(([entry]) => {
          visible = entry?.isIntersecting ?? false;
          updateMotion();
        })
      : null;

    observer?.observe(element);
    document.addEventListener('visibilitychange', updateMotion);
    updateMotion();

    return () => {
      observer?.disconnect();
      document.removeEventListener('visibilitychange', updateMotion);
    };
  }, []);

  return (
    <aside ref={bannerRef} className={`w-full min-w-0 ${className}`} data-motion="paused">
      <a
        data-page={page}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
        className={`${styles.banner} cursor-pointer`}
      >
        <Image
          src="/assets/sponsors/shokz-logo.svg"
          width={100}
          height={40}
          alt={t('brand')}
          className={styles.logo}
        />
        <div className={styles.artwork}>
          <Image
            src="/assets/sponsors/shokz-openrun-pro-2-white.png"
            alt={t('productAlt')}
            fill
            sizes="(min-width: 1024px) 28vw, (min-width: 640px) 55vw, 100vw"
            className={styles.product}
          />
        </div>
        <div className={styles.copy}>
          <p className={styles.headline}>
            <span>{t('headlineStart')}</span>
            <span>{t('headlineEnd')}</span>
          </p>
          <div className={styles.footer}>
            <p className={styles.model}>{t('product')}</p>
            <span className={styles.cta}>
              {t('cta')} <ArrowUpRight size={14} aria-hidden="true" />
            </span>
          </div>
        </div>
      </a>
    </aside>
  );
}
