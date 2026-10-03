import Image from 'next/image';
import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { ArrowRight } from 'lucide-react';
import { FacebookIcon, InstagramIcon, LinkedInIcon, XIcon } from '@/components/icons/brand-icons';
import { getPostsForLocale } from '@/lib/content/blog-utils';
import { isBlogLocale, type Locale } from '@/i18n';
import { getLegalPath, LEGAL_DOCUMENT_IDS } from '@/lib/i18n/paths';
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

const FOOTER_BLOG_TITLE_KEYS: Record<string, string> = {
  'como-elegir-zapatillas-ultras-tecnicos': 'technicalUltras',
  'mejores-medias-maraton-trail-running-cataluna-2026': 'halfMarathonsCatalonia',
  'mejores-carreras-trail-running-espana-2026': 'bestRacesSpain',
};

export async function Footer() {
  const locale = (await getLocale()) as Locale;
  const [t, tNav, tProvince, tGeography, tLegal] = await Promise.all([
    getTranslations('footer'),
    getTranslations('navigation'),
    getTranslations('provincia.names'),
    getTranslations('geography.regions'),
    getTranslations('legal'),
  ]);
  const blogLocale = isBlogLocale(locale) ? locale : 'es';
  const blogPosts = getPostsForLocale(blogLocale).slice(0, MAX_FOOTER_POSTS);

  return (
    <>
      <footer className="relative isolate overflow-hidden border-t border-[#d8d2c3] bg-[#f6f1e4] xl:aspect-[1672/941]">
      <Image
        src="/assets/footer/pyrenees-meadow-cows.png"
        alt=""
        fill
        sizes="100vw"
        className="-z-20 object-cover object-center"
        priority={false}
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#f6f1e4]/95 via-[#f6f1e4]/85 to-[#f6f1e4]/45 xl:hidden" />
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 xl:px-8 xl:py-12">
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 xl:grid-cols-[minmax(12rem,1.25fr)_minmax(7rem,0.75fr)_minmax(7rem,0.75fr)_minmax(9rem,1fr)_minmax(15rem,1.35fr)] xl:gap-x-6 xl:gap-y-7">
          <div className="order-1 col-span-2 flex max-w-sm flex-col gap-3 md:col-span-1">
            <Link href={`/${locale}`} prefetch={false} className="flex items-center gap-2 w-fit">
              <Image
                src="/assets/web-app-manifest-192x192.png"
                width={40}
                height={40}
                className="h-10 w-10 [filter:invert(11%)_sepia(29%)_saturate(1334%)_hue-rotate(114deg)_brightness(89%)_contrast(98%)]"
                alt="Trail Running Cal logo"
              />
              <span className="text-xl font-semibold text-[#05291f]">
                {t('brandName')}
              </span>
            </Link>
            <p className="text-base leading-relaxed text-gray-600">{t('description')}</p>
            <div className="mt-3 flex items-center gap-4 text-[#31564b]">
              <a
                href="https://www.instagram.com/trailrunningcal"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="transition-colors hover:text-[#082f26]"
              >
                <InstagramIcon className="size-5" />
              </a>
              <FacebookIcon className="size-5" />
              <a
                href="https://x.com/trailrunningcal"
                target="_blank"
                rel="noreferrer"
                aria-label="X"
                className="transition-colors hover:text-[#082f26]"
              >
                <XIcon className="size-4" />
              </a>
              <a
                href="https://www.linkedin.com/company/trailrunningcal"
                target="_blank"
                rel="noreferrer"
                aria-label="LinkedIn"
                className="transition-colors hover:text-[#082f26]"
              >
                <LinkedInIcon className="size-5" />
              </a>
            </div>
          </div>
          <div className="order-2 col-span-2 mt-4 flex flex-col gap-4 md:col-span-1 md:mt-0 xl:order-5">
            <p className="text-sm font-medium uppercase tracking-wider text-[#31564b]">
              {t('newsletterTitle')}
            </p>
            <p className="text-sm leading-relaxed text-[#547064]">{t('newsletterDescription')}</p>
            <form className="flex w-full max-w-sm border border-[#547064] bg-[#f6f1e4]/70">
              <label className="sr-only" htmlFor="footer-newsletter-email">
                {t('newsletterEmailLabel')}
              </label>
              <input
                id="footer-newsletter-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder={t('newsletterEmailPlaceholder')}
                className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-[#082f26] outline-none placeholder:text-[#547064]"
              />
              <button
                type="button"
                aria-label={t('newsletterSubmit')}
                className="flex size-11 shrink-0 items-center justify-center border-l border-[#547064] text-[#31564b] transition-colors hover:bg-[#31564b] hover:text-[#f6f1e4]"
              >
                <ArrowRight className="size-5" strokeWidth={1.5} />
              </button>
            </form>
          </div>
          <nav className="contents">
            <div className="order-3 flex flex-col gap-4 xl:order-2 xl:mr-6">
              <p className="text-sm font-medium uppercase tracking-wider text-[#31564b]">
                {t('byDistance')}
              </p>
              <div className="flex flex-col gap-1">
                {CATEGORY_SLUGS.map(({ slug, key }) => (
                  <Link
                    key={slug}
                    href={getTypePath(locale, slug)}
                    prefetch={false}
                    className="py-1 text-xs leading-relaxed text-[#547064] transition-colors hover:text-[#082f26] hover:underline sm:text-sm"
                  >
                    {tNav(key)}
                  </Link>
                ))}
              </div>
            </div>
            <div className="order-4 flex flex-col gap-4 xl:order-3">
              <p className="text-sm font-medium uppercase tracking-wider text-[#31564b]">
                {t('byProvince')}
              </p>
              <div className="flex max-h-64 flex-col gap-3 overflow-y-auto pr-2">
                {DESTINATION_PROVINCE_GROUPS.map(({ regionId, provinceIds }) => (
                  <section key={regionId}>
                    {getSingleProvinceId(regionId) ? (
                      <p className="text-xs font-semibold text-[#547064]">{tGeography(regionId)}</p>
                    ) : (
                      <Link
                        href={getRegionPath(locale, regionId)}
                        prefetch={false}
                        className="text-xs font-semibold leading-relaxed text-[#547064] transition-colors hover:text-[#082f26] hover:underline"
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
                            className="py-1 text-xs leading-relaxed text-[#547064] transition-colors hover:text-[#082f26] hover:underline sm:text-sm"
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
            <div className="order-5 col-span-2 flex flex-col gap-4 md:col-span-1 xl:order-4">
              <p className="text-sm font-medium uppercase tracking-wider text-[#123d31]">
                {t('blog')}
              </p>
              <div className="flex flex-col gap-1">
                {blogPosts.map((post) => (
                  <Link
                    key={post.slug}
                    href={`/${blogLocale}/blog/${post.slug}`}
                    prefetch={false}
                    className="py-1 text-xs leading-relaxed text-[#173f34] transition-colors hover:text-[#082f26] hover:underline sm:text-sm"
                  >
                    {isBlogLocale(locale)
                      ? post.footerTitle ?? post.title
                      : t(`blogPosts.${FOOTER_BLOG_TITLE_KEYS[post.slug]}`)}
                  </Link>
                ))}
              </div>
            </div>
          </nav>
        </div>
      </div>
      </footer>
      <nav
        className="border-t border-[#d8d2c3] bg-[#f6f1e4] px-4 py-5 sm:px-6 xl:px-8"
        aria-label={tLegal('navigationLabel')}
      >
        <div className="mx-auto flex max-w-7xl flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-[#547064] sm:text-sm">
          {LEGAL_DOCUMENT_IDS.map((documentId) => (
            <Link
              key={documentId}
              href={getLegalPath(locale, documentId)}
              prefetch={false}
              className="leading-relaxed transition-colors hover:text-[#082f26] hover:underline"
            >
              {tLegal(`documents.${documentId}.shortTitle`)}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
