import type { MDXComponents } from 'mdx/types';
import Image from 'next/image';
import Link from 'next/link';
import DateAuthorString from './components/blog-date-author-string';
import BlogHeaderImage from './components/blog-header-image';
import BlogDivider from './components/blog-divider';
import RaceCard from '@/components/race-card';

const components: MDXComponents = {
  h1: ({ children }) => (
    <h1 className="text-3xl sm:text-5xl font-bold my-2">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-3xl font-bold mb-3 mt-14">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-2xl font-bold mb-2 mt-4">{children}</h3>
  ),
  p: ({ children }) => <p className="mb-4 leading-relaxed">{children}</p>,
  ul: ({ children }) => (
    <ul className="list-disc list-inside mb-4 space-y-2">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-inside mb-4 space-y-2">{children}</ol>
  ),
  li: ({ children }) => <li className="ml-4">{children}</li>,
  strong: ({ children }) => <strong className="font-bold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ href, children, ...props }) => {
    const isExternal =
      href?.startsWith('http://') || href?.startsWith('https://');

    if (isExternal) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-black font-semibold underline"
          {...props}
        >
          {children}
        </a>
      );
    }

    return (
      <Link
        href={href || '#'}
        className="text-black font-semibold underline"
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
        <div className="relative w-full aspect-video rounded-lg overflow-hidden shadow-lg">
          <Image
            src={src as string}
            alt={alt || ''}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1600px) 80vw, 1200px"
          />
        </div>
      </figure>
    );
  },
  DateAuthorString,
  BlogHeaderImage,
  BlogDivider,
  RaceCard,
};

export function useMDXComponents(): MDXComponents {
  return components;
}

// Export components directly for use in non-React contexts
export { components };
