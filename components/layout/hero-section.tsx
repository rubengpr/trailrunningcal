'use client';

import { useState } from 'react';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import HeroCtaButton from '@/components/layout/hero-cta-button';

interface BreadcrumbItem {
  name: string;
  href?: string;
}

interface HeroSectionProps {
  titleStart: string;
  titlePlace: string;
  subtitle: string;
  ctaLabel: string;
  breadcrumbItems?: BreadcrumbItem[];
}

export default function HeroSection({
  titleStart,
  titlePlace,
  subtitle,
  ctaLabel,
  breadcrumbItems,
}: HeroSectionProps) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseEnter = () => {
    if (window.matchMedia('(hover: hover)').matches) setActive(true);
  };

  return (
    <section
      className="relative min-w-0 overflow-hidden h-[62svh] min-h-[360px] max-h-[680px] lg:h-[72svh] lg:max-h-[800px] bg-white bg-[url(/contour-lines-classic.jpg)] bg-cover bg-center"
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setActive(false)}
    >

      {/* White overlay — flashlight reveals image around cursor */}
      <div
        className="absolute inset-0 transition-none"
        style={{
          background: active
            ? `radial-gradient(circle 260px at ${pos.x}px ${pos.y}px, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.87) 100%)`
            : 'rgba(255,255,255,0.8)',
        }}
      />

      {/* Bottom fade to page background */}
      <div className="absolute bottom-0 left-0 right-0 h-[140px] bg-gradient-to-t from-white to-transparent pointer-events-none" />

      {/* Content */}
      <div className="relative h-full flex flex-col items-center justify-center px-6 text-center pb-16 lg:items-start lg:text-left lg:px-16 xl:px-24">

        {breadcrumbItems && (
          <div className="absolute top-8 sm:top-10 left-6 lg:left-16 xl:left-24">
            <Breadcrumb items={breadcrumbItems} />
          </div>
        )}

        {/* Title */}
        <h1 className="hero-animate text-slate-800 font-normal leading-tight tracking-tight text-3xl sm:text-4xl lg:text-5xl lg:whitespace-nowrap font-['Playfair_Display',serif] [animation-delay:80ms] mb-5 sm:mb-6">
          {titleStart}{' '}
          <span className="italic text-emerald-900">{titlePlace}</span>
        </h1>

        {/* Description */}
        <p className="hero-animate text-slate-700 leading-relaxed text-base max-w-[810px] mb-8 sm:mb-9 font-['DM_Sans',sans-serif] [animation-delay:160ms]">
          {subtitle}
        </p>

        {/* CTA */}
        <HeroCtaButton label={ctaLabel} />

      </div>
    </section>
  );
}
