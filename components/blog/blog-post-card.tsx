import Link from 'next/link';
import Image from 'next/image';
import { BookOpen } from 'lucide-react';
import type { Locale } from '@/i18n';
import { formatDateToSpanish, formatDateToCatalan } from '@/lib/utils/date';

interface BlogPostCardProps {
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  slug: string;
  locale: Locale;
  image: string;
  imageAlt: string;
  priority?: boolean;
  compact?: boolean;
}

export function BlogPostCard({
  title,
  excerpt,
  date,
  readTime,
  slug,
  locale,
  image,
  imageAlt,
  priority = false,
  compact = false,
}: BlogPostCardProps) {
  return (
    <Link href={`/${locale}/blog/${slug}`} prefetch={false}>
      <article className="flex cursor-pointer flex-col">
        {/* Image */}
        <div className={`relative w-full overflow-hidden rounded-xl bg-gray-100 ${compact ? 'aspect-16/9 mb-3' : 'aspect-16/10 mb-5'}`}>
          <Image
            src={image}
            alt={imageAlt}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority={priority}
          />
        </div>

        {/* Content */}
        <div className="flex flex-col grow">
          <div className={`flex items-center gap-1.5 text-gray-500 ${compact ? 'mb-1.5 text-xs' : 'mb-2 text-sm'}`}>
            <time dateTime={date}>
              {locale === 'ca'
                ? formatDateToCatalan(date)
                : formatDateToSpanish(date)}
            </time>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              <BookOpen className={compact ? 'size-3' : 'size-3.5'} aria-hidden="true" />
              {readTime}
            </span>
          </div>

          <h3 className={`text-pretty font-semibold leading-snug tracking-tight text-gray-950 ${compact ? 'text-[0.9375rem]' : 'mb-3 text-xl'}`}>
            {title}
          </h3>

          {!compact && (
            <p className="text-gray-600 leading-relaxed line-clamp-3">
              {excerpt}
            </p>
          )}
        </div>
      </article>
    </Link>
  );
}
