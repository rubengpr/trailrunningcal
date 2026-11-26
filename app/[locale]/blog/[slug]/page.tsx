import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
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
import { buildBlogJsonLd, buildBreadcrumbJsonLd } from '@/lib/seo/json-ld';
import { JsonLd } from '@/components/seo/json-ld';
import { getTranslations } from 'next-intl/server';
import { BlogPostCard } from '@/components/blog/blog-post-card';

import styles from '@/components/blog/blog-article.module.css';

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

  const [tNav, tBlog] = await Promise.all([
    getTranslations({ locale, namespace: 'navigation' }),
    getTranslations({ locale, namespace: 'blog' }),
  ]);
  const MDXContent = await renderMDXFile(post.filePath, locale, post.readTime);
  const jsonLd = buildBlogJsonLd(post);

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: tNav('calendar'), url: `${BASE_URL}/${locale}` },
    { name: tNav('blog'), url: `${BASE_URL}/${locale}/blog` },
    { name: post.title, url: `${BASE_URL}/${locale}/blog/${slug}` },
  ]);

  const relatedPosts = getPostsForLocale(locale).filter((p) => p.slug !== slug);

  return (
    <>
      <JsonLd data={jsonLd} />
      <JsonLd data={breadcrumbJsonLd} />
      <div className="mx-auto max-w-[62rem] px-5 pb-14 pt-5 sm:px-8 sm:pb-20 sm:pt-8">
        <div className="mx-auto mb-2 max-w-3xl sm:mb-4">
          <Link
            href={`/${locale}/blog`}
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-emerald-900 underline-offset-4 hover:underline"
          >
            <ArrowLeft className="size-4" />
            {tBlog('backToBlog')}
          </Link>
        </div>
        <article className={`${styles.article} text-base text-gray-800 sm:text-[1.0625rem]`}>
          <MDXContent />
        </article>
        {relatedPosts.length > 0 && (
          <section className="mx-auto mt-10 max-w-3xl border-t border-gray-200 pt-8 sm:mt-14 sm:pt-10">
            <h2 className="mb-6 text-2xl font-semibold tracking-tight text-gray-950 sm:text-[1.75rem]">
              {tBlog('relatedPosts')}
            </h2>
            <div className="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
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
          </section>
        )}
      </div>
    </>
  );
}
