import type { Locale } from '@/i18n';
import type { TrailRace } from '@/types/race.types';
import type { RaceMapMarker, MapPageLabels } from '@/types/map.types';
import CategoryHeroSection from '@/components/layout/category-hero-section';
import MapaCalendarMapClient from '@/components/mapa/mapa-calendar-map-client';

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
  breadcrumbItems: BreadcrumbItem[];
  labels: MapPageLabels;
}

export default function CategoryMapPage({
  locale,
  races,
  markers,
  breadcrumbJsonLd,
  heroTitle,
  heroBody,
  breadcrumbItems,
  labels,
}: CategoryMapPageProps) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <CategoryHeroSection
        title={heroTitle}
        body={heroBody}
        breadcrumbItems={breadcrumbItems}
      />
      <div className="mx-auto w-full pt-6 pb-16 sm:pt-10 lg:pt-4">
        <MapaCalendarMapClient
          races={races}
          markers={markers}
          locale={locale}
          labels={labels}
          showProvinceFilter={false}
        />
      </div>
    </>
  );
}
