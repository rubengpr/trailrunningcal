import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n';
import { Breadcrumb } from '@/components/layout/breadcrumb';
import { HeroSection } from '@/components/layout/hero-section';

interface BreadcrumbItem {
  name: string;
  href?: string;
}

interface CategoryHeroSectionProps {
  title: string;
  titleStart?: string;
  titlePlace?: string;
  body?: string;
  subtitle?: string;
  breadcrumbItems: BreadcrumbItem[];
  locale: Locale;
}

export async function CategoryHeroSection({
  title,
  titleStart,
  titlePlace,
  body,
  subtitle,
  breadcrumbItems,
  locale,
}: CategoryHeroSectionProps) {
  if (titleStart && titlePlace) {
    const t = await getTranslations({ locale, namespace: 'landing' });

    return (
      <HeroSection
        titleStart={titleStart}
        titlePlace={titlePlace}
        subtitle={subtitle ?? body ?? ''}
        ctaLabel={t('cta')}
        breadcrumbItems={breadcrumbItems}
      />
    );
  }

  return (
    <section className="bg-gray-50 border-b border-gray-100">
      <div className="max-w-5xl mx-auto px-6 sm:px-8 py-14 sm:py-20">
        <Breadcrumb items={breadcrumbItems} />
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-snug text-gray-900">
          {title}
        </h1>
        {body && (
          <p className="mt-4 text-sm text-gray-600 max-w-4xl leading-relaxed">
            {body}
          </p>
        )}
      </div>
    </section>
  );
}
