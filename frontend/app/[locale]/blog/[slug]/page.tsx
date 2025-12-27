import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { Locale } from '@/i18n';
import {
  getAllBlogPosts,
  getPostBySlug,
  getPostTranslations,
} from '@/lib/blog-utils';
import { renderMDXFile } from '@/lib/mdx-renderer';
import { BASE_URL } from '@/lib/config';
import { generateMetadataFromOptions } from '@/seo/meta-config';

interface PageProps {
  params: Promise<{
    locale: Locale;
    slug: string;
  }>;
}

export async function generateStaticParams() {
  const posts = getAllBlogPosts();
  return posts.map((post) => ({
    locale: post.locale,
    slug: post.slug,
  }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = getPostBySlug(slug, locale);

  // If post doesn't exist, return minimal metadata (Next.js will handle 404)
  if (!post) {
    return {
      title: 'Post Not Found',
    };
  }

  // Get all translations for hreflang links
  const translations = getPostTranslations(post.translationKey);

  // Build alternate links object
  const alternateLinks: Record<string, string> = {};
  for (const translation of translations) {
    const translationUrl = `${BASE_URL}/${translation.locale}/blog/${translation.slug}`;
    alternateLinks[translation.locale] = translationUrl;
  }

  // Add x-default pointing to default locale (Spanish)
  const defaultTranslation = translations.find((t) => t.locale === 'es');
  if (defaultTranslation) {
    alternateLinks[
      'x-default'
    ] = `${BASE_URL}/es/blog/${defaultTranslation.slug}`;
  } else if (translations.length > 0) {
    // Fallback to first translation if Spanish not available
    const firstTranslation = translations[0];
    alternateLinks[
      'x-default'
    ] = `${BASE_URL}/${firstTranslation.locale}/blog/${firstTranslation.slug}`;
  }

  // Build canonical URL
  const canonicalUrl = `${BASE_URL}/${locale}/blog/${slug}`;

  return generateMetadataFromOptions({
    title: post.title,
    description: post.excerpt,
    canonicalUrl,
    locale: post.locale,
    ogImageUrl: post.image,
    ogImageAlt: post.imageAlt || post.title,
    ogType: 'article',
    publishedTime: post.date,
    alternateLinks,
  });
}

export default async function BlogPostPage({ params }: PageProps) {
  const { locale, slug } = await params;
  const post = getPostBySlug(slug, locale);

  // Handle 404 if post doesn't exist
  if (!post) {
    notFound();
  }

  // Render MDX content
  const MDXContent = await renderMDXFile(post.filePath, locale);

  return (
    <div className="w-full px-6 sm:px-10 lg:px-16 sm:py-8 lg:py-12">
      <MDXContent />
    </div>
  );
}
