import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n';
import type { MapPageLabels } from '@/types/map.types';
import type {
  PublicEventPage,
  PublicEventScope,
} from '@/types/public-events.types';
import { buildFaqJsonLd, type FaqItem } from '@/lib/seo/json-ld';
import { JsonLd } from '@/components/seo/json-ld';
import { HeroSection } from '@/components/layout/hero-section';
import { FaqSection } from '@/components/layout/faq-section';
import { EventsExplorerClient } from '@/components/events-map/events-explorer-client';
import type { RegionId } from '@/lib/geography/destinations';

interface BreadcrumbItem {
  name: string;
  href?: string;
}

interface ChildLink {
  name: string;
  href: string;
}

interface CategoryMapPageProps {
  locale: Locale;
  initialPage: PublicEventPage;
  scope: PublicEventScope;
  breadcrumbJsonLd: Record<string, unknown>;
  heroBody: string;
  heroTitleStart: string;
  heroTitlePlace: string;
  heroSubtitle?: string;
  breadcrumbItems: BreadcrumbItem[];
  labels: MapPageLabels;
  showProvinceFilter?: boolean;
  showDistanceFilter?: boolean;
  regionId?: RegionId;
  childLinks?: ChildLink[];
  childLinksHeading?: string;
  contentSections?: FaqItem[];
  contentSectionsHeading?: string;
}

export async function CategoryMapPage({
  locale,
  initialPage,
  scope,
  breadcrumbJsonLd,
  heroBody,
  heroTitleStart,
  heroTitlePlace,
  heroSubtitle,
  breadcrumbItems,
  labels,
  showProvinceFilter = true,
  showDistanceFilter = false,
  regionId,
  childLinks,
  childLinksHeading,
  contentSections,
  contentSectionsHeading,
}: CategoryMapPageProps) {
  const t = await getTranslations({ locale, namespace: 'landing' });

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      <HeroSection
        titleStart={heroTitleStart}
        titlePlace={heroTitlePlace}
        subtitle={heroSubtitle ?? heroBody ?? ''}
        ctaLabel={t('cta')}
        breadcrumbItems={breadcrumbItems}
      />
      <div id="calendar" className="mx-auto w-full pt-6 pb-16 sm:pt-10 lg:pt-4 scroll-mt-18 sm:scroll-mt-20">
        <EventsExplorerClient
          initialPage={initialPage}
          scope={scope}
          locale={locale}
          labels={labels}
          showProvinceFilter={showProvinceFilter}
          showDistanceFilter={showDistanceFilter}
          regionId={regionId}
        />
      </div>
      {childLinks && childLinks.length > 0 && childLinksHeading && (
        <section className="mx-auto w-full max-w-4xl px-4 pb-16 sm:px-6 lg:max-w-7xl lg:px-8">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">
            {childLinksHeading}
          </h2>
          <div className="flex flex-wrap gap-2">
            {childLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-100 hover:text-gray-900"
              >
                {link.name}
              </Link>
            ))}
          </div>
        </section>
      )}
      {contentSections && contentSections.length > 0 && contentSectionsHeading && (
        <>
          <JsonLd data={buildFaqJsonLd(contentSections)} />
          <FaqSection sections={contentSections} heading={contentSectionsHeading} />
        </>
      )}
    </>
  );
}
