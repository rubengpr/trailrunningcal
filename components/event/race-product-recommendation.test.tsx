// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ImageProps } from 'next/image';
import es from '@/locales/es/translation.json';
import ca from '@/locales/ca/translation.json';
import en from '@/locales/en/translation.json';
import fr from '@/locales/fr/translation.json';
import { useFeatureFlagVariant } from '@/hooks/use-feature-flag-variant';
import { track } from '@/lib/analytics/track';
import { RaceProductRecommendations } from '@/components/event/race-product-recommendation';
import { EventProductRecommendations } from '@/components/event/event-product-recommendations';
import { PRICE_FLAG, SHOES_FLAG } from '@/lib/sponsors/product-recommendation';

vi.mock('@/hooks/use-feature-flag-variant', () => ({ useFeatureFlagVariant: vi.fn() }));
vi.mock('@/lib/analytics/track', () => ({ track: vi.fn() }));
vi.mock('posthog-js', () => ({ default: { get_distinct_id: () => 'visitor-1' } }));
vi.mock('next/image', () => ({ default: ({ src, alt }: ImageProps) => <span data-src={String(src)} role="img" aria-label={alt} /> }));
const observers: Array<{ callback: IntersectionObserverCallback; element?: Element }> = [];

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(useFeatureFlagVariant).mockReturnValue('naak');
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })));
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  vi.stubGlobal('IntersectionObserver', class {
    state: (typeof observers)[number];
    constructor(callback: IntersectionObserverCallback) { this.state = { callback }; observers.push(this.state); }
    observe(element: Element) { this.state.element = element; }
    disconnect() {}
  });
});
afterEach(() => { cleanup(); observers.length = 0; vi.useRealTimers(); vi.clearAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

function show(distanceKm = 30, elevationGainM: number | null = 1800, locale: 'es' | 'ca' | 'en' | 'fr' = 'es') {
  return render(<NextIntlClientProvider locale={locale} messages={{ es, ca, en, fr }[locale]}>
    <RaceProductRecommendations eventId="event-1" eventSlug="sample" raceId="race-1" distanceKm={distanceKm} elevationGainM={elevationGainM} locale={locale} />
  </NextIntlClientProvider>);
}
function intersect(ratio: number) {
  act(() => { for (const observer of observers) observer.callback([{ isIntersecting: ratio > 0, intersectionRatio: ratio } as IntersectionObserverEntry], {} as IntersectionObserver); });
}
function advance(ms: number) { act(() => { vi.advanceTimersByTime(ms); }); }
const calls = (name: string) => vi.mocked(track).mock.calls.filter(([event]) => event === name);

describe('event product recommendation section', () => {
  const races = [
    { id: 'short', name: 'Sprint', distanceKm: 11, elevationGainM: 300 },
    { id: 'ultra', name: 'Ultra', distanceKm: 60, elevationGainM: 2000 },
  ];
  function showSection(items = races) {
    return render(<NextIntlClientProvider locale="es" messages={es}>
      <EventProductRecommendations eventId="event-1" eventName="Trail" eventSlug="trail" races={items} locale="es" />
    </NextIntlClientProvider>);
  }
  it('groups gear by named race without repeating distances under a single section heading', () => {
    showSection();
    expect(screen.getAllByRole('heading', { level: 2, name: 'Material recomendado' })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 3, name: 'Sprint' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 3, name: 'Ultra' })).toBeTruthy();
    expect(screen.queryByText('11 km')).toBeNull();
    expect(screen.queryByText('60 km')).toBeNull();
    expect(screen.getByRole('button', { name: /FUGA EX 3$/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /FUGA EX 330/ })).toBeTruthy();
  });
  it('leaves no empty section for control while preserving reach exposure', () => {
    vi.mocked(useFeatureFlagVariant).mockReturnValue('control');
    showSection();
    expect(screen.queryByRole('heading')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    intersect(1); advance(1000);
    expect(calls('race_products_exposed')).toHaveLength(2);
    expect(calls('race_products_exposed')[0][1]).toEqual(expect.objectContaining({ recommendation_placement: 'after_distances' }));
  });
  it('does not leave a section when there is no assignment or eligible distance', () => {
    const view = showSection([{ ...races[0], distanceKm: 0 }]);
    expect(view.container.innerHTML).toBe('');
    cleanup();
    vi.mocked(useFeatureFlagVariant).mockReturnValue(undefined);
    expect(showSection().container.innerHTML).toBe('');
  });
});

describe('race product recommendations', () => {
  it.each(['control', 'show-price'] as const)('records ASICS shoe exposure and outbound clicks with the %s price variant', (priceVariant) => {
    vi.mocked(useFeatureFlagVariant).mockImplementation((key) => key === SHOES_FLAG ? 'asics' : key === PRICE_FLAG ? priceVariant : 'baouw');
    show(42, 1800);
    expect(screen.queryByRole('button', { name: /FUGA EX PRO/ })).toBeNull();
    expect(screen.getByRole('button', { name: /frambuesa/ })).toBeTruthy();
    const shoe = screen.getByRole('button', { name: /METAFUJI TRAIL 2/ });
    fireEvent.click(shoe);
    expect(calls('race_product_clicked')).toHaveLength(0);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toContain('asics.com/es/es-es/metafuji-trail-2');
    fireEvent.click(link);
    for (const event of ['race_product_impression', 'race_product_clicked']) {
      expect(calls(event)[0][1]).toEqual(expect.objectContaining({
        product_id: 'asics-metafuji-trail-2', category: 'shoes', brand: 'ASICS',
        shoe_variant: 'asics', '$feature/race-product-shoes': 'asics', price_variant: priceVariant,
        recommendation_variant: 'baouw', recommendation_placement: 'after_distances',
      }));
    }
  });
  it('keeps Kailas available when the shoe experiment is disabled without inventing its assignment', () => {
    vi.mocked(useFeatureFlagVariant).mockImplementation((key) => key === SHOES_FLAG ? false : 'naak');
    show(11, null); intersect(1); advance(1000);
    expect(screen.getByRole('button', { name: /FUGA EX 3/ })).toBeTruthy();
    const properties = calls('race_product_impression')[0][1];
    expect(properties).toEqual(expect.objectContaining({ shoe_variant: null }));
    expect(properties).not.toHaveProperty('$feature/race-product-shoes');
  });
  it('preserves the no-recommendations control even when ASICS is assigned', () => {
    vi.mocked(useFeatureFlagVariant).mockImplementation((key) => key === SHOES_FLAG ? 'asics' : 'control');
    show(42, 1800);
    expect(screen.queryByRole('button')).toBeNull();
    intersect(1); advance(1000);
    expect(calls('race_product_impression')).toHaveLength(0);
    expect(calls('race_products_exposed')).toHaveLength(1);
  });
  it.each(['control', 'asics'] as const)('records a shoe impression if %s arrives after the fallback was seen', (variant) => {
    const assignment: { value: string | undefined } = { value: undefined };
    vi.mocked(useFeatureFlagVariant).mockImplementation((key) => key === SHOES_FLAG ? assignment.value : 'naak');
    const view = show(11, null); intersect(1); advance(1000);
    assignment.value = variant;
    view.rerender(<NextIntlClientProvider locale="es" messages={es}>
      <RaceProductRecommendations eventId="event-1" eventSlug="sample" raceId="race-1" distanceKm={11} elevationGainM={null} locale="es" />
    </NextIntlClientProvider>);
    intersect(1); advance(1000);
    expect(calls('race_product_impression')).toHaveLength(2);
    expect(calls('race_product_impression')[1][1]).toEqual(expect.objectContaining({ shoe_variant: variant, '$feature/race-product-shoes': variant }));
  });
  it.each(['es', 'ca', 'en', 'fr'] as const)('renders the ASICS ultra catalog in %s', (locale) => {
    vi.mocked(useFeatureFlagVariant).mockImplementation((key) => key === SHOES_FLAG ? 'asics' : 'naak');
    show(60, 1800, locale);
    expect(screen.getByRole('button', { name: /TRABUCO MAX 5/ })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'ASICS' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /TRABUCO MAX 5/ }).textContent).toContain('180');
  });
  it.each(['control', 'show-price', 'show-discount'] as const)('applies the independent %s price variant on mobile and desktop', (priceVariant) => {
    vi.mocked(useFeatureFlagVariant).mockImplementation((key) => key === PRICE_FLAG ? priceVariant : 'baouw');
    show(15, null);
    const button = screen.getByRole('button', { name: /frambuesa/ });
    expect(button.textContent?.includes('3,25')).toBe(priceVariant !== 'control');
    intersect(1); advance(1000);
    expect(calls('race_product_impression')[0][1]).toEqual(expect.objectContaining({
      price_variant: priceVariant, '$feature/race-product-price': priceVariant,
      recommendation_variant: 'baouw', layout: 'mobile', price_placement: priceVariant === 'control' ? 'details' : 'row',
    }));
    // The same assigned variant governs both layouts, including after a resize.
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
    fireEvent.click(button);
    expect(screen.getAllByText(/3,25/)).toHaveLength(1);
    fireEvent.click(screen.getByRole('link'));
    expect(calls('race_product_clicked')[0][1]).toEqual(expect.objectContaining({
      price_variant: priceVariant, layout: 'desktop', price_placement: priceVariant === 'control' ? 'details' : 'row',
    }));
  });
  it('does not include legacy presentation in the price experiment when its flag is off', () => {
    vi.mocked(useFeatureFlagVariant).mockImplementation((key) => key === PRICE_FLAG ? false : 'naak');
    show(15, null); intersect(1); advance(1000);
    const properties = calls('race_product_impression')[0][1];
    expect(properties).toEqual(expect.objectContaining({ price_variant: null }));
    expect(properties).not.toHaveProperty('$feature/race-product-price');
  });
  it('measures a newly loaded price assignment even if the legacy row was already seen', () => {
    const assignment: { value: string | undefined } = { value: undefined };
    vi.mocked(useFeatureFlagVariant).mockImplementation((key) => key === PRICE_FLAG ? assignment.value : 'naak');
    const view = show(15, null); intersect(1); advance(1000);
    assignment.value = 'show-price';
    view.rerender(<NextIntlClientProvider locale="es" messages={es}>
      <RaceProductRecommendations eventId="event-1" eventSlug="sample" raceId="race-1" distanceKm={15} elevationGainM={null} locale="es" />
    </NextIntlClientProvider>);
    intersect(1); advance(1000);
    expect(calls('race_product_impression')).toHaveLength(4);
    expect(calls('race_product_impression')[3][1]).toEqual(expect.objectContaining({ price_variant: 'show-price' }));
  });
  it.each([undefined, false, 'unknown'])('renders nothing without a recognized assignment (%s)', (variant) => {
    vi.mocked(useFeatureFlagVariant).mockReturnValue(variant);
    expect(show().container.innerHTML).toBe('');
    expect(track).not.toHaveBeenCalled();
  });
  it('measures control exposure without showing products', () => {
    vi.mocked(useFeatureFlagVariant).mockReturnValue('control');
    show();
    expect(screen.queryByRole('button')).toBeNull();
    intersect(1); advance(1000);
    expect(calls('race_products_exposed')).toHaveLength(1);
    expect(calls('race_products_exposed')[0][1]).toEqual(expect.objectContaining({ recommendation_variant: 'control', '$feature/race-product-recommendations': 'control' }));
    expect(calls('race_product_impression')).toHaveLength(0);
  });
  it('waits for continuous visibility and deduplicates impressions', () => {
    show(); intersect(0.5); advance(500); intersect(0); advance(1000);
    expect(track).not.toHaveBeenCalled();
    intersect(0.49); advance(1000);
    expect(track).not.toHaveBeenCalled();
    intersect(0.5); advance(999);
    expect(track).not.toHaveBeenCalled();
    advance(1);
    expect(calls('race_products_exposed')).toHaveLength(1);
    expect(calls('race_product_impression')).toHaveLength(3);
    intersect(0); intersect(1); advance(2000);
    expect(calls('race_product_impression')).toHaveLength(3);
  });
  it('pauses the visibility clock in a hidden tab', () => {
    show(); intersect(1); advance(500);
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    act(() => document.dispatchEvent(new Event('visibilitychange'))); advance(2000);
    expect(track).not.toHaveBeenCalled();
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    act(() => document.dispatchEvent(new Event('visibilitychange'))); advance(1000);
    expect(calls('race_product_impression')).toHaveLength(3);
  });
  it('separates expanding details from an outbound click and preserves the official URL', () => {
    vi.mocked(useFeatureFlagVariant).mockReturnValue('baouw');
    show(15, null);
    fireEvent.click(screen.getByRole('button', { name: /frambuesa y granada/ }));
    expect(calls('race_product_details_opened')).toHaveLength(1);
    expect(calls('race_product_clicked')).toHaveLength(0);
    const link = screen.getByRole('link', { name: 'Ver producto' });
    expect(link.getAttribute('href')).toContain('baouw-organic-nutrition.com');
    expect(link.getAttribute('href')).toContain('utm_content=baouw-gel');
    fireEvent.click(link);
    expect(calls('race_product_clicked')).toHaveLength(1);
    expect(calls('race_product_impression')).toHaveLength(1);
    expect(calls('race_product_clicked')[0][1]).toEqual(expect.objectContaining({ product_id: 'baouw-gel', distance_km: 15, race_id: 'race-1', position: 2, locale: 'es' }));
  });
  it.each(['show-price', 'show-discount'] as const)('tracks shoe impressions and outbound clicks with the selected colour and %s variant', (priceVariant) => {
    vi.mocked(useFeatureFlagVariant).mockImplementation((key) => key === PRICE_FLAG ? priceVariant : 'naak');
    show(11, null);
    const button = screen.getByRole('button', { name: /FUGA EX 3/ });
    expect(button.textContent).toContain('144,00');
    expect(button.textContent?.includes('160,00')).toBe(priceVariant === 'show-discount');
    fireEvent.click(button);
    const link = screen.getByRole('link');
    expect(link.getAttribute('href')).toContain('variant=53545285026157');
    expect(link.getAttribute('href')).toContain('utm_content=kailas-fuga-ex-3');
    fireEvent.click(link);
    expect(calls('race_product_clicked')[0][1]).toEqual(expect.objectContaining({
      category: 'shoes', brand: 'Kailas FUGA', product_id: 'kailas-fuga-ex-3',
      catalog_version: 'v3', price_variant: priceVariant, '$feature/race-product-price': priceVariant, position: 1,
      price_placement: 'row', reference_price_eur: 160, discount_shown: priceVariant === 'show-discount',
    }));
  });
  it.each(['control', 'show-price', 'show-discount'] as const)('strikes through the reference price only in show-discount (%s)', (priceVariant) => {
    vi.mocked(useFeatureFlagVariant).mockImplementation((key) => key === PRICE_FLAG ? priceVariant : 'naak');
    show(11, null);
    fireEvent.click(screen.getByRole('button', { name: /FUGA EX 3/ }));
    expect(screen.queryAllByText(/160,00/).map((element) => element.tagName)).toEqual(priceVariant === 'show-discount' ? ['DEL'] : []);
  });
  it('strikes through nutrition reference prices in show-discount', () => {
    vi.mocked(useFeatureFlagVariant).mockImplementation((key) => key === PRICE_FLAG ? 'show-discount' : 'baouw');
    show(15, null);
    const button = screen.getByRole('button', { name: /frambuesa/ });
    expect(button.querySelector('del')?.textContent).toContain('4,00');
    intersect(1); advance(1000);
    expect(calls('race_product_impression').find(([, properties]) => properties && 'product_id' in properties && properties.product_id === 'baouw-gel')?.[1]).toEqual(expect.objectContaining({
      price_variant: 'show-discount', price_placement: 'row', reference_price_eur: 4, discount_shown: true,
    }));
  });
  it('keeps details and native outbound links usable if capture fails', () => {
    vi.mocked(track).mockImplementation(() => { throw new Error('offline'); });
    show(15, null);
    fireEvent.click(screen.getByRole('button', { name: /BOOST Gel/ }));
    expect(screen.getByRole('link').getAttribute('href')).toContain('utm_source=trailrunningcal');
    expect(() => fireEvent.click(screen.getByRole('link'))).not.toThrow();
    vi.mocked(track).mockReset();
  });
  it('shows only footwear below 15 km without eligible poles', () => {
    show(14, null);
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByRole('button', { name: /FUGA EX 3/ })).toBeTruthy();
  });
  it('formats the official price and keeps only one product expanded', () => {
    vi.mocked(useFeatureFlagVariant).mockReturnValue('baouw');
    show(30, 1800);
    expect(screen.getByText(/3,25/)).toBeTruthy();
    expect(screen.getByText(/180,00/)).toBeTruthy();
    const nutrition = screen.getByRole('button', { name: /frambuesa/ });
    const poles = screen.getByRole('button', { name: /Ultratrail/ });
    fireEvent.click(nutrition);
    expect(nutrition.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getAllByText(/3,25/)).toHaveLength(2);
    fireEvent.click(poles);
    expect(nutrition.getAttribute('aria-expanded')).toBe('false');
    expect(poles.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });
  it('cancels pending impressions on unmount', () => {
    const view = show(); intersect(1); advance(500); view.unmount(); advance(1000);
    expect(track).not.toHaveBeenCalled();
  });
  it('uses a development preview without capturing experiment traffic', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_PRODUCT_RECOMMENDATION_PREVIEW', 'baouw');
    vi.mocked(useFeatureFlagVariant).mockReturnValue(undefined);
    show(15, null);
    fireEvent.click(screen.getByRole('button', { name: /frambuesa/ }));
    fireEvent.click(screen.getByRole('link'));
    intersect(1); advance(1000);
    expect(track).not.toHaveBeenCalled();
  });
  it('keeps simulated reference prices off by default in development', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.mocked(useFeatureFlagVariant).mockReturnValue(undefined);
    show(30, 1800);
    expect(screen.queryByText(/220,00/)).toBeNull();
    expect(screen.queryByText(/4,00/)).toBeNull();
  });
  it('shows simulated reference prices without capturing traffic', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_PRODUCT_REFERENCE_PRICE_PREVIEW', 'simulated');
    vi.stubEnv('NEXT_PUBLIC_PRODUCT_RECOMMENDATION_PREVIEW', '');
    vi.stubEnv('NEXT_PUBLIC_PRODUCT_PRICE_PREVIEW', '');
    vi.stubEnv('NEXT_PUBLIC_PRODUCT_SHOES_PREVIEW', '');
    vi.mocked(useFeatureFlagVariant).mockImplementation((flag) => flag === PRICE_FLAG ? 'show-price' : flag === SHOES_FLAG ? 'control' : 'baouw');
    render(<NextIntlClientProvider locale="es" messages={es}>
      <EventProductRecommendations eventId="event-1" eventName="Trail" eventSlug="trail" races={[{ id: 'race-1', name: 'Trail', distanceKm: 30, elevationGainM: 1800 }]} locale="es" />
    </NextIntlClientProvider>);
    expect(screen.getByText(/230,00/).tagName).toBe('DEL');
    expect(screen.getByText(/4,00/).tagName).toBe('DEL');
    expect(screen.getByText(/220,00/).tagName).toBe('DEL');
    fireEvent.click(screen.getByRole('button', { name: /frambuesa/ }));
    fireEvent.click(screen.getByRole('link'));
    expect(screen.getByRole('link').getAttribute('href')).toContain('utm_content=baouw-gel');
    intersect(1); advance(1000);
    expect(track).not.toHaveBeenCalled();
  });
  it('ignores preview overrides in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_PRODUCT_RECOMMENDATION_PREVIEW', 'baouw');
    vi.stubEnv('NEXT_PUBLIC_PRODUCT_REFERENCE_PRICE_PREVIEW', 'simulated');
    vi.mocked(useFeatureFlagVariant).mockReturnValue(undefined);
    expect(show().container.innerHTML).toBe('');
  });
  it('does not invent viewport impressions without IntersectionObserver', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    // Some browsers have no property at all, rather than an undefined value.
    Reflect.deleteProperty(window, 'IntersectionObserver');
    show(15, null); advance(2000);
    expect(track).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /BOOST Gel/ }));
    expect(calls('race_product_impression')).toHaveLength(1);
    expect(calls('race_product_impression')[0][1]).toEqual(expect.objectContaining({ impression_trigger: 'interaction' }));
  });
  it.each(['es', 'ca', 'en', 'fr'] as const)('renders the real ultra catalog in %s', (locale) => {
    vi.mocked(useFeatureFlagVariant).mockReturnValue('baouw');
    show(60, 2000, locale);
    expect(screen.getAllByRole('button')).toHaveLength(3);
    expect(screen.getByRole('img', { name: 'Baouw' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'LEKI' })).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Kailas FUGA' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /FUGA EX 330/ })).toBeTruthy();
    expect(screen.queryByText(/Trail Brand|Summit Fuel|Les Bâtons/)).toBeNull();
  });
});
