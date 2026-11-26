import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { BlogPostCard } from '@/components/blog/blog-post-card';
import type { Locale } from '@/i18n';
import { getPostsForLocale } from '@/lib/content/blog-utils';
import {
  getSeoMetaConfig,
  generateMetadataFromOptions,
} from '@/lib/seo/meta-config';
import { buildBlogListingAlternateLinks } from '@/lib/content/alternate-links';
import { buildBreadcrumbJsonLd } from '@/lib/seo/json-ld';
import { JsonLd } from '@/components/seo/json-ld';
import { BASE_URL } from '@/lib/config';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  const seoMeta = getSeoMetaConfig('blog', locale);

  const title = t(seoMeta.titleKey);
  const description = t(seoMeta.descriptionKey);

  return generateMetadataFromOptions({
    title,
    description,
    canonicalUrl: seoMeta.canonicalUrl,
    locale,
    ogImageUrl: seoMeta.ogImageUrl,
    ogType: seoMeta.ogType,
    alternateLinks: buildBlogListingAlternateLinks(),
  });
}

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const [featuredPost, ...otherPosts] = getPostsForLocale(locale);
  const t = await getTranslations({ locale });
  const tNav = await getTranslations({ locale, namespace: 'navigation' });

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: tNav('calendar'), url: `${BASE_URL}/${locale}` },
    { name: tNav('blog'), url: `${BASE_URL}/${locale}/blog` },
  ]);

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      <div className="mx-auto max-w-5xl px-5 pb-16 pt-8 sm:px-8 sm:pb-24 sm:pt-14">
        <header className="mb-14 sm:mb-20">
          <h1 className="mb-3 text-pretty text-[length:clamp(1.875rem,4vw,2.75rem)] font-semibold leading-[1.1] tracking-tight text-gray-950 sm:mb-4">
            {t('blog.title')}
          </h1>
          <p className="text-[0.9375rem] leading-relaxed text-gray-600 sm:hidden">
            {t('blog.description')}
          </p>
          <p className="hidden text-base leading-relaxed text-gray-600 sm:block">
            {t('blog.intro')}
          </p>
        </header>
        {featuredPost ? (
          <div className="mb-12 sm:mb-16">
            <BlogPostCard
              {...featuredPost}
              locale={locale}
              categoryLabel={featuredPost.category ? t(`blog.categories.${featuredPost.category}`) : undefined}
              variant="featured"
              priority
            />
          </div>
        ) : null}
        <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {otherPosts.map((post) => (
            <BlogPostCard
              key={`${post.locale}-${post.slug}`}
              {...post}
              locale={locale}
              categoryLabel={post.category ? t(`blog.categories.${post.category}`) : undefined}
            />
          ))}
        </div>
      </div>
    </>
  );
}
