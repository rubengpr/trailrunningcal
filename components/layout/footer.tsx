import Image from 'next/image';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { getPostsForLocale } from '@/lib/blog-utils';
import type { Locale } from '@/i18n';
import { PROVINCE_SLUGS } from '@/lib/constants';

const CATEGORY_SLUGS = [
  { slug: 'ultra-trail', key: 'ultraTrail' },
  { slug: 'maraton', key: 'maraton' },
  { slug: 'media-maraton', key: 'mediaMaraton' },
  { slug: 'marcha', key: 'marcha' },
  { slug: 'km-vertical', key: 'kmVertical' },
  { slug: 'backyard', key: 'backyard' },
] as const;

const MAX_FOOTER_POSTS = 5;

export default async function Footer() {
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations('footer');
  const tNav = await getTranslations('navigation');
  const blogPosts = getPostsForLocale(locale).slice(0, MAX_FOOTER_POSTS);

  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-3 max-w-sm">
            <Link href={`/${locale}`} className="flex items-center gap-2 w-fit">
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
                    href={`/${locale}/${slug}`}
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
              <div className="flex flex-col gap-1">
                {PROVINCE_SLUGS.map((province) => (
                  <Link
                    key={province}
                    href={`/${locale}/provincia/${province}`}
                    className="text-xs sm:text-sm text-gray-600 hover:text-gray-900 hover:underline transition-colors py-1"
                  >
                    {tNav(province)}
                  </Link>
                ))}
              </div>
            </div>
            <div className="col-span-2 sm:col-span-1 flex flex-col gap-2">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                {t('blog')}
              </p>
              <div className="flex flex-col gap-1">
                <Link
                  href={`/${locale}/blog`}
                  className="text-xs sm:text-sm text-gray-600 hover:text-gray-900 hover:underline transition-colors py-1"
                >
                  {t('blog')}
                </Link>
                {blogPosts.map((post) => (
                  <Link
                    key={post.slug}
                    href={`/${locale}/blog/${post.slug}`}
                    className="text-xs sm:text-sm text-gray-600 hover:text-gray-900 hover:underline transition-colors py-1 line-clamp-1"
                  >
                    {post.title}
                  </Link>
                ))}
              </div>
            </div>
          </nav>
        </div>
        <div className="mt-8 pt-6 border-t border-gray-100 flex items-center gap-4">
          <p className="text-sm text-gray-500">
            {t('copyright', { year: new Date().getFullYear() })}
          </p>
          <Link
            href={`/${locale}/${locale === 'ca' ? 'contacte' : 'contacto'}`}
            className="text-sm text-gray-500 hover:text-gray-900 hover:underline transition-colors"
          >
            {t('contact')}
          </Link>
        </div>
      </div>
    </footer>
  );
}
