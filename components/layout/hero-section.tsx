'use client';

import { useState } from 'react';
import type { PointerEvent } from 'react';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { HeroCtaButton } from '@/components/layout/hero-cta-button';

const IMAGE_ASPECT_RATIO = 1774 / 887;
const MAX_ELEVATION = 3140;
const MIN_ELEVATION = 620;
const HIGHEST_TERRAIN_Y = 0.15;
const LOWEST_TERRAIN_Y = 0.98;

function getElevation(imageY: number) {
  const terrainProgress = Math.min(
    Math.max(
      (imageY - HIGHEST_TERRAIN_Y) /
        (LOWEST_TERRAIN_Y - HIGHEST_TERRAIN_Y),
      0,
    ),
    1,
  );
  const elevation =
    MAX_ELEVATION - (MAX_ELEVATION - MIN_ELEVATION) * terrainProgress;

  return Math.round(elevation / 10) * 10;
}

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

export function HeroSection({
  titleStart,
  titlePlace,
  subtitle,
  ctaLabel,
  breadcrumbItems,
}: HeroSectionProps) {
  const [pos, setPos] = useState({ x: 0, y: 0, labelX: 0, elevation: 0 });
  const [active, setActive] = useState(false);

  const updatePosition = (event: PointerEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Math.min(Math.max(event.clientX - rect.left, 0), rect.width);
    const y = Math.min(Math.max(event.clientY - rect.top, 0), rect.height);
    const renderedImageWidth = Math.max(
      rect.width,
      rect.height * IMAGE_ASPECT_RATIO,
    );
    const renderedImageHeight = renderedImageWidth / IMAGE_ASPECT_RATIO;
    const imageY = y / renderedImageHeight;

    setPos({
      x,
      y,
      labelX: Math.min(Math.max(x, 46), rect.width - 46),
      elevation: getElevation(imageY),
    });
  };

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === 'mouse' || event.buttons > 0) {
      updatePosition(event);
      setActive(true);
    }
  };

  const handlePointerDown = (event: PointerEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest('a, button')) return;

    updatePosition(event);
    setActive(true);
  };

  return (
    <section
      className="relative min-w-0 touch-pan-y overflow-hidden h-[62svh] min-h-[360px] max-h-[680px] lg:h-[72svh] lg:max-h-[800px] bg-white bg-[url(/mountain-contour-image.webp)] bg-cover bg-top"
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerDown}
      onPointerLeave={(event) => {
        if (event.pointerType === 'mouse') setActive(false);
      }}
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
      <div className="absolute bottom-0 left-0 right-0 h-[140px] bg-linear-to-t from-white to-transparent pointer-events-none" />

      {/* Illustrative elevation reading derived from vertical position in the artwork */}
      <div
        aria-hidden={!active}
        className={`pointer-events-none absolute inset-0 z-10 transition-opacity duration-200 ${
          active ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div
          className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-emerald-900 shadow-[0_2px_10px_rgba(6,78,59,0.35)]"
          style={{ left: pos.x, top: pos.y }}
        />
        <div
          className="absolute -translate-x-1/2 -translate-y-full rounded-full border border-emerald-900/15 bg-white/90 px-2.5 py-1 font-['DM_Sans',sans-serif] text-xs font-medium tabular-nums text-emerald-950 shadow-sm backdrop-blur-sm"
          style={{ left: pos.labelX, top: Math.max(pos.y - 12, 38) }}
        >
          {pos.elevation} m
        </div>
      </div>

      {/* Content */}
      <div className="relative z-20 h-full flex flex-col items-center justify-center px-6 text-center pt-16 pb-16 lg:pt-0 lg:items-start lg:text-left lg:px-16 xl:px-24">

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
