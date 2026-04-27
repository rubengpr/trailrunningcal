import type { Locale } from '@/i18n';
import type { TrailRace } from '@/types/race.types';
import type { RaceMapMarker, MapPageLabels } from '@/types/map.types';
import CategoryHeroSection from '@/components/layout/category-hero-section';
import RacesExplorerClient from '@/components/races-map/races-explorer-client';

interface BreadcrumbItem {
  name: string;
  href?: string;
}

interface CategoryMapPageProps {
  locale: Locale;
  races: TrailRace[];
  markers: RaceMapMarker[];
  breadcrumbJsonLd: object;
  heroTitle: string;
  heroBody: string;
  heroTitleStart?: string;
  heroTitlePlace?: string;
  heroSubtitle?: string;
  breadcrumbItems: BreadcrumbItem[];
  labels: MapPageLabels;
  showProvinceFilter?: boolean;
  showDistanceFilter?: boolean;
}

export default function CategoryMapPage({
  locale,
  races,
  markers,
  breadcrumbJsonLd,
  heroTitle,
  heroBody,
  heroTitleStart,
  heroTitlePlace,
  heroSubtitle,
  breadcrumbItems,
  labels,
  showProvinceFilter = true,
  showDistanceFilter = false,
}: CategoryMapPageProps) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <CategoryHeroSection
        title={heroTitle}
        titleStart={heroTitleStart}
        titlePlace={heroTitlePlace}
        body={heroBody}
        subtitle={heroSubtitle}
        breadcrumbItems={breadcrumbItems}
        locale={locale}
      />
      <div id="calendar" className="mx-auto w-full pt-6 pb-16 sm:pt-10 lg:pt-4 scroll-mt-18 sm:scroll-mt-20">
        <RacesExplorerClient
          races={races}
          markers={markers}
          locale={locale}
          labels={labels}
          showProvinceFilter={showProvinceFilter}
          showDistanceFilter={showDistanceFilter}
        />
      </div>
    </>
  );
}
