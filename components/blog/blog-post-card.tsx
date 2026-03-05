import Link from 'next/link';
import Image from 'next/image';
import type { Locale } from '@/i18n';
import { formatDateToSpanish, formatDateToCatalan } from '@/lib/date-utils';

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
}

export default function BlogPostCard({
  title,
  excerpt,
  date,
  readTime,
  slug,
  locale,
  image,
  imageAlt,
  priority = false,
}: BlogPostCardProps) {
  return (
    <Link href={`/${locale}/blog/${slug}`}>
      <article className="flex flex-col group cursor-pointer p-4 -m-4 rounded-2xl transition-all duration-200 hover:bg-white hover:ring-1 hover:ring-gray-200 hover:shadow-lg">
        {/* Image */}
        <div className="aspect-16/10 w-full rounded-xl overflow-hidden mb-6 relative shadow-sm">
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
          <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
            <time dateTime={date}>
              {locale === 'ca'
                ? formatDateToCatalan(date)
                : formatDateToSpanish(date)}
            </time>
            <span>•</span>
            <span>{readTime}</span>
          </div>

          <h3 className="text-xl font-bold text-gray-700 mb-3 group-hover:text-gray-950 transition-colors">
            {title}
          </h3>

          <p className="text-gray-600 leading-relaxed line-clamp-3">
            {excerpt}
          </p>
        </div>
      </article>
    </Link>
  );
}
