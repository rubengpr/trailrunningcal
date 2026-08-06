import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n';
import type { MapPageLabels } from '@/types/map.types';
import type {
  PublicEventPage,
  PublicEventScope,
} from '@/types/public-events.types';
import { buildFaqJsonLd, type FaqItem } from '@/lib/seo/json-ld';
import { HeroSection } from '@/components/layout/hero-section';
import { FaqSection } from '@/components/layout/faq-section';
import { EventsExplorerClient } from '@/components/events-map/events-explorer-client';

interface BreadcrumbItem {
  name: string;
  href?: string;
}

interface CategoryMapPageProps {
  locale: Locale;
  initialPage: PublicEventPage;
  scope: PublicEventScope;
  breadcrumbJsonLd: object;
  heroBody: string;
  heroTitleStart: string;
  heroTitlePlace: string;
  heroSubtitle?: string;
  breadcrumbItems: BreadcrumbItem[];
  labels: MapPageLabels;
  showProvinceFilter?: boolean;
  showDistanceFilter?: boolean;
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
  contentSections,
  contentSectionsHeading,
}: CategoryMapPageProps) {
  const t = await getTranslations({ locale, namespace: 'landing' });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
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
        />
      </div>
      {contentSections && contentSections.length > 0 && contentSectionsHeading && (
        <>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(buildFaqJsonLd(contentSections)) }}
          />
          <FaqSection sections={contentSections} heading={contentSectionsHeading} />
        </>
      )}
    </>
  );
}
