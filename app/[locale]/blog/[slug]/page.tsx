import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { Locale } from '@/i18n';
import {
  getAllBlogPosts,
  getPostBySlug,
  getPostsForLocale,
} from '@/lib/content/blog-utils';
import { renderMDXFile } from '@/lib/content/mdx-renderer';
import { BASE_URL } from '@/lib/config';
import { generateMetadataFromOptions } from '@/lib/seo/meta-config';
import { buildBlogPostAlternateLinks } from '@/lib/content/alternate-links';
import { buildBlogJsonLd } from '@/lib/seo/json-ld';
import { buildBreadcrumbJsonLd } from '@/lib/seo/json-ld';
import { getTranslations } from 'next-intl/server';
import { BlogPostCard } from '@/components/blog/blog-post-card';

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
  const jsonLd = buildBlogJsonLd(post);
  const tNav = await getTranslations({ locale, namespace: 'navigation' });
  const tBlog = await getTranslations({ locale, namespace: 'blog' });

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: tNav('calendar'), url: `${BASE_URL}/${locale}` },
    { name: tNav('blog'), url: `${BASE_URL}/${locale}/blog` },
    { name: post.title, url: `${BASE_URL}/${locale}/blog/${slug}` },
  ]);

  const relatedPosts = getPostsForLocale(locale).filter((p) => p.slug !== slug);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <div className="w-full px-6 sm:px-10 lg:px-16 sm:py-8 lg:py-12">
        <MDXContent />
      </div>
      {relatedPosts.length > 0 && (
        <div className="w-full px-6 sm:px-10 lg:px-16 pb-12 border-t border-gray-100 pt-10">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            {tBlog('relatedPosts')}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-6 lg:max-w-4xl">
            {relatedPosts.map((relatedPost) => (
              <BlogPostCard
                key={relatedPost.slug}
                title={relatedPost.title}
                excerpt={relatedPost.excerpt}
                date={relatedPost.date}
                readTime={relatedPost.readTime}
                slug={relatedPost.slug}
                locale={locale}
                image={relatedPost.image}
                imageAlt={relatedPost.imageAlt}
                compact
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
