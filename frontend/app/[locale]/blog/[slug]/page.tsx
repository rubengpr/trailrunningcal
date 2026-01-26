import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { Locale } from '@/i18n';
import {
  getAllBlogPosts,
  getPostBySlug,
} from '@/lib/blog-utils';
import { renderMDXFile } from '@/lib/mdx-renderer';
import { BASE_URL } from '@/lib/config';
import { generateMetadataFromOptions } from '@/seo/meta-config';
import { buildBlogPostAlternateLinks } from '@/lib/alternate-links';

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
    alternateLinks: buildBlogPostAlternateLinks(locale, slug),
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
