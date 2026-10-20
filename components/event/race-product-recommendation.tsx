'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { ArrowUpRight, ChevronDown } from 'lucide-react';
import posthog from 'posthog-js';
import { useTranslations } from 'next-intl';
import { useProductRecommendationVariants } from '@/hooks/use-product-recommendation-variants';
import { useVisibleImpression } from '@/hooks/use-visible-impression';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/track';
import { buildProductUrl, getDistanceBand, getProductRecommendations, orderProducts } from '@/lib/sponsors/product-recommendation';
import { withSimulatedReferencePrice } from '@/lib/sponsors/reference-price-preview';
import { localeTags } from '@/i18n';
import type { Locale } from '@/i18n';
import type { ProductId, ProductInteraction, RecommendationContext, RecommendedProduct } from '@/types/product-recommendation.types';

interface RaceProductRecommendationsProps {
  eventId: string;
  eventSlug: string;
  raceId: string;
  raceName?: string;
  distanceKm: number;
  elevationGainM: number | null;
  locale: Locale;
}

const brandLogos: Record<RecommendedProduct['brand'], { src: string; width: number; height: number }> = {
  'Näak': { src: '/assets/sponsors/brands/naak.svg', width: 21, height: 16 },
  Baouw: { src: '/assets/sponsors/brands/baouw.svg', width: 30, height: 14 },
  LEKI: { src: '/assets/sponsors/brands/leki.svg', width: 32, height: 10 },
  'Kailas FUGA': { src: '/assets/sponsors/brands/kailas-fuga.webp', width: 54, height: 12 },
  ASICS: { src: '/assets/sponsors/brands/asics.svg', width: 34, height: 12 },
};

export function RaceProductRecommendations({ eventId, eventSlug, raceId, raceName, distanceKm, elevationGainM, locale }: RaceProductRecommendationsProps) {
  const [expandedProduct, setExpandedProduct] = useState<ProductId | null>(null);
  const { variant, priceVariant, shoeVariant, simulatedReferencePrices, isPreview } = useProductRecommendationVariants();
  const eligible = getProductRecommendations(distanceKm, elevationGainM, 'naak').length > 0;
  const exposureKey = variant && eligible ? `${eventId}:${raceId}:${variant}` : null;
  const exposedRef = useRef<string | null>(null);
  const context: RecommendationContext | null = variant ? {
    event_id: eventId, event_slug: eventSlug, race_id: raceId,
    distance_km: distanceKm, elevation_gain_m: elevationGainM,
    distance_band: getDistanceBand(distanceKm), locale,
    recommendation_variant: variant, catalog_version: 'v3',
    recommendation_placement: 'after_distances',
    '$feature/race-product-recommendations': variant,
    price_variant: priceVariant,
    ...(priceVariant ? { '$feature/race-product-price': priceVariant } : {}),
    shoe_variant: shoeVariant,
    ...(shoeVariant ? { '$feature/race-product-shoes': shoeVariant } : {}),
  } : null;
  const captureExposure = () => {
    if (isPreview || !context || !exposureKey || exposedRef.current === exposureKey) return;
    try {
      track(ANALYTICS_EVENTS.RACE_PRODUCTS_EXPOSED, context);
      exposedRef.current = exposureKey;
    } catch { /* Recommendations remain usable without analytics. */ }
  };
  const exposureRef = useVisibleImpression(exposureKey, captureExposure);
  if (!context || !eligible) return null;

  const recommended = variant === 'naak' || variant === 'baouw'
    ? orderProducts(getProductRecommendations(distanceKm, elevationGainM, variant, shoeVariant === 'asics' ? 'asics' : 'kailas'), posthog.get_distinct_id() ?? '')
    : [];
  const products = simulatedReferencePrices ? recommended.map(withSimulatedReferencePrice) : recommended;

  return (
    <div>
      <div ref={exposureRef} className="h-px" data-testid="recommendations-exposure" />
      {products.length > 0 ? (
        <div>
          {raceName ? <div className="mb-1.5">
            <h3 title={raceName} className="truncate text-xs font-medium text-gray-600">{raceName}</h3>
          </div> : null}
          <div className="divide-y divide-gray-100 overflow-hidden rounded-md border border-gray-100 bg-white">
            {products.map((product, index) => (
              <ProductRow key={`${exposureKey}:${product.id}:${priceVariant}:${product.category === 'shoes' ? shoeVariant : ''}`} product={product} context={context} position={index + 1} onExposure={captureExposure} analyticsEnabled={!isPreview} simulatedReferencePrice={simulatedReferencePrices} expanded={expandedProduct === product.id} onToggle={() => setExpandedProduct(expandedProduct === product.id ? null : product.id)} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ProductRow({ product, context, position, onExposure, analyticsEnabled, simulatedReferencePrice, expanded, onToggle }: {
  product: RecommendedProduct;
  context: RecommendationContext;
  position: number;
  onExposure: () => void;
  analyticsEnabled: boolean;
  simulatedReferencePrice: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const t = useTranslations('event.productRecommendation');
  const impressionRef = useRef(false);
  const href = buildProductUrl(product);
  const showRowPrice = context.price_variant === 'show-price' || context.price_variant === 'show-discount';
  const legacyPrice = context.price_variant === null;
  const referencePriceEur = product.originalPriceEur !== undefined && product.originalPriceEur > product.priceEur ? product.originalPriceEur : null;
  // Only show-discount (and the pre-experiment fallback) strikes through the reference, so it is the sole difference from show-price.
  const discountShown = referencePriceEur !== null && (context.price_variant === 'show-discount' || legacyPrice || simulatedReferencePrice);
  const getProperties = (): ProductInteraction => {
    const desktop = window.matchMedia('(min-width: 640px)').matches;
    return { ...context, product_id: product.id, brand: product.brand, category: product.category, position, destination_url: href,
      layout: desktop ? 'desktop' : 'mobile', price_placement: showRowPrice || (legacyPrice && desktop) ? 'row' : 'details',
      reference_price_eur: referencePriceEur, discount_shown: discountShown };
  };
  const captureImpression = (trigger: 'visibility' | 'interaction') => {
    if (!analyticsEnabled) return;
    onExposure();
    if (impressionRef.current) return;
    try {
      track(ANALYTICS_EVENTS.RACE_PRODUCT_IMPRESSION, { ...getProperties(), impression_trigger: trigger });
      impressionRef.current = true;
    } catch { /* Analytics must not prevent interaction. */ }
  };
  const ref = useVisibleImpression(`${context.race_id}:${product.id}:${context.recommendation_variant}:${context.price_variant}`, () => captureImpression('visibility'));
  const captureClick = () => {
    if (!analyticsEnabled) return;
    captureImpression('interaction');
    try { track(ANALYTICS_EVENTS.RACE_PRODUCT_CLICKED, getProperties(), { transport: 'sendBeacon' }); } catch { /* Keep the native link usable. */ }
  };
  const name = t(`catalog.${product.id}.name`);
  const brandLogo = brandLogos[product.brand];
  const formatter = new Intl.NumberFormat(localeTags[context.locale], {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 2,
  });
  const price = formatter.format(product.priceEur);
  const originalPrice = discountShown && referencePriceEur !== null ? formatter.format(referencePriceEur) : null;

  return (
    <div ref={ref}>
      <button
        type="button"
        aria-expanded={expanded}
        aria-label={t('toggle', { product: name })}
        className="grid w-full cursor-pointer grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-x-2 px-2 py-1.5 text-left hover:bg-gray-50/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-950 sm:grid-cols-[3rem_10rem_minmax(0,1fr)_auto] sm:gap-x-3 sm:px-3"
        onClick={() => {
          onToggle();
          if (!expanded && analyticsEnabled) {
            captureImpression('interaction');
            try { track(ANALYTICS_EVENTS.RACE_PRODUCT_DETAILS_OPENED, getProperties()); } catch { /* Details remain available. */ }
          }
        }}
      >
        <span className="relative h-11 w-12 overflow-hidden rounded bg-gray-50">
          <Image src={product.image} alt="" fill sizes="48px" className="object-contain" />
        </span>
        <span className="min-w-0">
          <span title={name} className="line-clamp-2 text-[13px] font-medium leading-4 tracking-tight text-gray-800">{name}</span>
          <span className="mt-0.5 flex h-4 items-center">
            <Image src={brandLogo.src} alt={product.brand} width={brandLogo.width} height={brandLogo.height} style={{ width: brandLogo.width, height: brandLogo.height }} className={`object-contain ${product.brand === 'Kailas FUGA' ? 'invert' : ''}`} />
          </span>
        </span>
        {!expanded ? (
          <span className="hidden min-w-0 text-xs leading-4 text-gray-600 sm:block">{t(`catalog.${product.id}.reason`)}</span>
        ) : null}
        <span className="flex items-center gap-2 pl-1 sm:col-start-4">
          {showRowPrice || legacyPrice ? <span className={`${legacyPrice ? 'hidden sm:flex' : 'flex'} flex-col items-end gap-0.5 sm:flex-row sm:items-baseline sm:gap-1`}>
            <span className={simulatedReferencePrice ? 'text-[13px] font-semibold leading-4 text-gray-950' : 'text-xs font-medium text-gray-700'}>{price}</span>
            {originalPrice ? <del className="text-[11px] leading-3 text-gray-400">{originalPrice}</del> : null}
          </span> : null}
          <ChevronDown aria-hidden="true" className={`size-4 shrink-0 text-gray-400 transition-transform ${expanded ? 'rotate-0' : '-rotate-90'}`} />
        </span>
      </button>
      {expanded ? (
        <div className="border-t border-gray-100 bg-white px-3 py-2.5 sm:pl-[4.5rem] sm:pr-4">
          <p className="text-sm leading-5 text-gray-700">{t(`catalog.${product.id}.details`)}</p>
          {!showRowPrice ? <div className={`mt-2 ${legacyPrice ? 'sm:hidden' : ''}`}>
            <span className="flex items-baseline gap-1.5">
              <span className="text-sm font-semibold text-gray-950">{price}</span>
              {originalPrice ? <del className="text-[11px] text-gray-400">{originalPrice}</del> : null}
            </span>
          </div> : null}
          <a href={href} target="_blank" rel="noopener sponsored" onClick={captureClick} onAuxClick={(event) => { if (event.button === 1) captureClick(); }}
            className="mt-2 inline-flex cursor-pointer items-center gap-1 text-sm font-semibold text-gray-950 underline decoration-gray-300 underline-offset-4 hover:decoration-gray-950">
            {t('viewProduct')}<ArrowUpRight className="size-4" aria-hidden="true" />
          </a>
        </div>
      ) : null}
    </div>
  );
}
