import Image from 'next/image';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { getPostsForLocale } from '@/lib/content/blog-utils';
import { isBlogLocale, type Locale } from '@/i18n';
import { getContactPath } from '@/lib/i18n/paths';
import { getTypePath } from '@/lib/races/race-types';
import {
  DESTINATION_PROVINCE_GROUPS,
  GEOGRAPHY,
  getDestinationPath,
  getRegionPath,
  getSingleProvinceId,
} from '@/lib/geography/destinations';

const CATEGORY_SLUGS = [
  { slug: 'ultra-trail', key: 'ultraTrail' },
  { slug: 'maraton', key: 'maraton' },
  { slug: 'media-maraton', key: 'mediaMaraton' },
  { slug: 'marcha', key: 'marcha' },
  { slug: 'km-vertical', key: 'kmVertical' },
  { slug: 'backyard', key: 'backyard' },
] as const;

const MAX_FOOTER_POSTS = 5;

export async function Footer() {
  const locale = (await getLocale()) as Locale;
  const [t, tNav, tProvince, tGeography] = await Promise.all([
    getTranslations('footer'),
    getTranslations('navigation'),
    getTranslations('provincia.names'),
    getTranslations('geography.regions'),
  ]);
  const blogPosts = isBlogLocale(locale)
    ? getPostsForLocale(locale).slice(0, MAX_FOOTER_POSTS)
    : [];

  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-3 max-w-sm">
            <Link href={`/${locale}`} prefetch={false} className="flex items-center gap-2 w-fit">
              <Image
                src="/logo.svg"
                width={32}
                height={32}
                className="w-8 h-8"
                alt="Trail Running Cal logo"
                unoptimized
              />
              <span className="font-semibold text-sm text-gray-900">
                {tNav('appName')}
              </span>
            </Link>
            <p className="text-sm text-gray-600 leading-relaxed">
              {t('description')}
            </p>
          </div>
          <nav className="grid grid-cols-2 gap-x-8 gap-y-6 sm:flex sm:flex-row sm:gap-10">
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {t('byDistance')}
              </p>
              <div className="flex flex-col gap-1">
                {CATEGORY_SLUGS.map(({ slug, key }) => (
                  <Link
                    key={slug}
                    href={getTypePath(locale, slug)}
                    prefetch={false}
                    className="text-xs sm:text-sm text-gray-600 hover:text-gray-900 hover:underline transition-colors py-1"
                  >
                    {tNav(key)}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {t('byProvince')}
              </p>
              <div className="max-h-80 overflow-y-auto pr-2">
                {DESTINATION_PROVINCE_GROUPS.map(({ regionId, provinceIds }) => (
                  <section key={regionId} className="mb-3 last:mb-0">
                    {getSingleProvinceId(regionId) ? (
                      <p className="text-xs font-semibold text-gray-500">{tGeography(regionId)}</p>
                    ) : (
                      <Link
                        href={getRegionPath(locale, regionId)}
                        prefetch={false}
                        className="text-xs font-semibold text-gray-500 hover:text-gray-900 hover:underline transition-colors"
                      >
                        {tGeography(regionId)}
                      </Link>
                    )}
                    <div className="mt-1 flex flex-col gap-1">
                      {provinceIds.map((provinceId) => {
                        const province = GEOGRAPHY.provinces[provinceId];

                        return (
                          <Link
                            key={provinceId}
                            href={getDestinationPath(locale, province.regionId, provinceId)}
                            prefetch={false}
                            className="text-xs sm:text-sm text-gray-600 hover:text-gray-900 hover:underline transition-colors py-1"
                          >
                            {tProvince(provinceId)}
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            </div>
            {isBlogLocale(locale) && <div className="col-span-2 sm:col-span-1 flex flex-col gap-2">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {t('blog')}
              </p>
              <div className="flex flex-col gap-1">
                <Link
                  href={`/${locale}/blog`}
                  prefetch={false}
                  className="text-xs sm:text-sm text-gray-600 hover:text-gray-900 hover:underline transition-colors py-1"
                >
                  {t('blog')}
                </Link>
                {blogPosts.map((post) => (
                  <Link
                    key={post.slug}
                    href={`/${locale}/blog/${post.slug}`}
                    prefetch={false}
                    className="text-xs sm:text-sm text-gray-600 hover:text-gray-900 hover:underline transition-colors py-1 line-clamp-1"
                  >
                    {post.title}
                  </Link>
                ))}
              </div>
            </div>}
          </nav>
        </div>
        <div className="mt-8 pt-6 border-t border-gray-100 flex items-center gap-4">
          <p className="text-sm text-gray-500">
            {t('copyright', { year: new Date().getFullYear() })}
          </p>
          <Link
            href={getContactPath(locale)}
            prefetch={false}
            className="text-sm text-gray-500 hover:text-gray-900 hover:underline transition-colors"
          >
            {t('contact')}
          </Link>
        </div>
      </div>
    </footer>
  );
}
