import { BlogImage } from '@/components/blog/blog-image';
import type { MDXComponents } from 'mdx/types';
import Image from 'next/image';
import Link from 'next/link';
import { DateAuthorString } from '@/components/blog/blog-date-author-string';
import { BlogHeaderImage } from '@/components/blog/blog-header-image';
import { BlogDivider } from '@/components/blog/blog-divider';
import { RaceCard } from '@/components/race/race-card';
import { SponsoredArticleHero } from '@/components/blog/sponsored-article-hero';
import { BlogImageLightbox } from '@/components/blog/blog-image-lightbox';

const components: MDXComponents = {
  h1: ({ children }) => (
    <h1 className="mb-4 text-pretty text-[length:clamp(1.875rem,4vw,2.75rem)] font-semibold leading-[1.1] tracking-tight text-gray-950 sm:mb-6">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-4 mt-6 text-pretty text-2xl font-semibold leading-tight tracking-tight text-gray-950 sm:mt-8 sm:text-[1.75rem]">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 mt-4 text-xl font-semibold leading-snug tracking-tight text-gray-950 sm:text-[1.375rem]">
      {children}
    </h3>
  ),
  p: ({ children }) => <p className="mb-5 leading-[1.7]">{children}</p>,
  ul: ({ children }) => (
    <ul className="mb-5 list-disc space-y-2 pl-6 leading-[1.7]">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-5 list-decimal space-y-2 pl-6 leading-[1.7]">{children}</ol>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-6 border-l-2 border-emerald-900/40 pl-5 text-gray-600 [&>p:last-child]:mb-0">
      {children}
    </blockquote>
  ),
  strong: ({ children }) => <strong className="font-bold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ href, children, ...props }) => {
    const isExternal =
      href?.startsWith('http://') || href?.startsWith('https://');
    const className = 'cursor-pointer text-emerald-800 underline decoration-emerald-800/50 decoration-1 underline-offset-3 transition-colors hover:text-emerald-900 hover:decoration-emerald-900';

    if (isExternal) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={className}
          {...props}
        >
          {children}
        </a>
      );
    }

    return (
      <Link
        href={href || '#'}
        className={className}
        {...props}
      >
        {children}
      </Link>
    );
  },
  img: (props) => {
    const { src, alt } = props;
    return (
      <figure className="my-8 w-full">
        <BlogImageLightbox
          src={src as string}
          alt={alt || ''}
          caption={alt || undefined}
          className="relative aspect-video w-full overflow-hidden rounded-xl"
        >
          <Image
            src={src as string}
            alt={alt || ''}
            fill
            className="object-cover"
            sizes="(max-width: 639px) calc(100vw - 2.5rem), (max-width: 831px) calc(100vw - 4rem), 48rem"
          />
        </BlogImageLightbox>
      </figure>
    );
  },
  BlogImage,
  DateAuthorString,
  BlogHeaderImage,
  BlogDivider,
  RaceCard,
  SponsoredArticleHero,
};

export function useMDXComponents(): MDXComponents {
  return components;
}

// Export components directly for use in non-React contexts
export { components };
