import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import BlogPostCard from '@/components/blog-post-card';
import type { Locale } from '@/i18n';
import { getPostsForLocale } from '@/lib/blog-utils';
import {
  getSeoMetaConfig,
  generateMetadataFromOptions,
} from '@/seo/meta-config';

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
    alternateLinks: Object.fromEntries(
      seoMeta.alternateLinks.map((link) => [link.hrefLang, link.href]),
    ),
  });
}

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const blogPosts = getPostsForLocale(locale);
  const t = await getTranslations({ locale });

  return (
    <>
      {/* Header Section */}
      <div className="py-16 sm:py-24 text-center px-4">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
          {t('blog.title')}
        </h1>
        <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
          {t('blog.description')}
        </p>
      </div>

      {/* Blog Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-16">
          {blogPosts.map((post) => (
            <BlogPostCard
              key={`${post.locale}-${post.slug}`}
              {...post}
              locale={locale}
            />
          ))}
        </div>
      </div>
    </>
  );
}
