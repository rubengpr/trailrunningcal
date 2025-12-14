import path from 'path';
import type { Metadata } from 'next';
import { renderMDXFile } from '@/lib/mdx-renderer';
import { getBlogPostBySlug } from '@/lib/blog-utils';
import { BASE_URL } from '@/lib/config';
import { generateMetadataFromOptions } from '@/seo/meta-config';

const POST_SLUG = 'mejores-medias-maraton-trail-running-cataluna-2026';

export async function generateMetadata(): Promise<Metadata> {
  const post = getBlogPostBySlug(POST_SLUG);

  if (!post) {
    return {
      title: 'Post no encontrado',
      description: 'El post solicitado no existe',
    };
  }

  // Blog posts are Spanish-only for now
  const canonicalUrl = `${BASE_URL}/es/blog/${POST_SLUG}`;

  return generateMetadataFromOptions({
    title: post.title,
    description: post.excerpt,
    canonicalUrl,
    locale: 'es',
    ogImageUrl: post.image,
    ogImageAlt: post.imageAlt || post.title,
    ogType: 'article',
    publishedTime: post.date,
  });
}

export default async function BlogPostPage() {
  const contentPath = path.join(
    process.cwd(),
    'app/[locale]/blog/(posts)/mejores-medias-maraton-trail-running-cataluna-2026/content.mdx',
  );

  const MDXContent = await renderMDXFile(contentPath);

  return <MDXContent />;
}
