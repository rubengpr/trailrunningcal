import Link from 'next/link';
import Image from 'next/image';
import { BookOpen } from 'lucide-react';
import type { Locale } from '@/i18n';
import { formatDateByLocale } from '@/lib/utils/date';

type BlogPostCardVariant = 'default' | 'compact' | 'featured';

interface BlogPostCardProps {
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  slug: string;
  locale: Locale;
  image: string;
  imageAlt: string;
  categoryLabel?: string;
  priority?: boolean;
  variant?: BlogPostCardVariant;
}

const styles: Record<BlogPostCardVariant, {
  article: string;
  image: string;
  sizes: string;
  meta: string;
  icon: string;
  title: string;
  excerpt: string | null;
}> = {
  default: {
    article: 'flex flex-col',
    image: 'aspect-16/10 mb-4',
    sizes: '(max-width: 639px) calc(100vw - 2.5rem), (max-width: 1023px) calc(50vw - 3rem), 20rem',
    meta: 'mb-2 text-[0.8125rem]',
    icon: 'size-3.5',
    title: 'mb-2 text-lg sm:text-xl',
    excerpt: 'line-clamp-3 text-[0.9375rem]',
  },
  compact: {
    article: 'flex flex-col',
    image: 'aspect-16/9 mb-3',
    sizes: '(max-width: 639px) calc(100vw - 2.5rem), (max-width: 1023px) calc(50vw - 3rem), 15rem',
    meta: 'mb-1.5 text-xs',
    icon: 'size-3',
    title: 'text-[0.9375rem]',
    excerpt: null,
  },
  featured: {
    article: 'flex flex-col sm:grid sm:grid-cols-2 sm:items-center sm:gap-8 lg:gap-10',
    image: 'aspect-16/10 mb-4 sm:mb-0',
    sizes: '(max-width: 639px) calc(100vw - 2.5rem), 30rem',
    meta: 'mb-2 text-sm sm:mb-3',
    icon: 'size-3.5',
    title: 'mb-2 text-xl sm:mb-3 sm:text-[1.75rem] lg:text-[2rem]',
    excerpt: 'line-clamp-3 text-[0.9375rem] sm:line-clamp-4 sm:text-base',
  },
};

export function BlogPostCard({
  title,
  excerpt,
  date,
  readTime,
  slug,
  locale,
  image,
  imageAlt,
  categoryLabel,
  priority = false,
  variant = 'default',
}: BlogPostCardProps) {
  const style = styles[variant];

  return (
    <Link href={`/${locale}/blog/${slug}`} prefetch={false}>
      <article className={`cursor-pointer ${style.article}`}>
        <div className={`relative w-full overflow-hidden rounded-xl bg-gray-100 ${style.image}`}>
          <Image
            src={image}
            alt={imageAlt}
            fill
            className="object-cover"
            sizes={style.sizes}
            priority={priority}
          />
        </div>

        <div className="flex grow flex-col">
          <div className={`flex flex-wrap items-center gap-x-1.5 gap-y-1 text-gray-500 ${style.meta}`}>
            {categoryLabel ? (
              <>
                <span className="font-semibold text-emerald-800">{categoryLabel}</span>
                <span aria-hidden="true">·</span>
              </>
            ) : null}
            <time dateTime={date}>
              {formatDateByLocale(date, locale, variant === 'featured' ? 'long' : 'short')}
            </time>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              <BookOpen className={style.icon} aria-hidden="true" />
              {readTime}
            </span>
          </div>

          <h3 className={`text-pretty font-semibold leading-snug tracking-tight text-gray-950 ${style.title}`}>
            {title}
          </h3>

          {style.excerpt ? (
            <p className={`leading-relaxed text-gray-600 ${style.excerpt}`}>
              {excerpt}
            </p>
          ) : null}
        </div>
      </article>
    </Link>
  );
}
