import Image from 'next/image';
import { BookOpen } from 'lucide-react';
import { formatDateToSpanish, formatDateToCatalan } from '@/lib/utils/date';
import type { Locale } from '@/i18n';

const AUTHOR_AVATARS: Record<string, string> = {
  'Ruben Godoy': '/assets/authors/ruben-godoy.webp',
};

interface DateAuthorStringProps {
  date?: string;
  author?: string;
  locale?: Locale;
  readingTime?: string;
}

export function DateAuthorString({
  date,
  author = 'Ruben Godoy',
  locale = 'es',
  readingTime,
}: DateAuthorStringProps) {
  const formattedDate = date
    ? locale === 'ca'
      ? formatDateToCatalan(date)
      : formatDateToSpanish(date)
    : '';
  const avatar = AUTHOR_AVATARS[author];

  return (
    <div className="flex items-center gap-2.5 text-sm leading-tight">
      {avatar ? (
        <Image
          src={avatar}
          alt=""
          width={32}
          height={32}
          className="size-8 shrink-0 rounded-full object-cover"
        />
      ) : null}
      <div>
        <p className="font-medium text-gray-900">{author}</p>
        {formattedDate || readingTime ? (
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
            {formattedDate ? <time dateTime={date}>{formattedDate}</time> : null}
            {formattedDate && readingTime ? <span aria-hidden="true">·</span> : null}
            {readingTime ? (
              <span className="inline-flex items-center gap-1">
                <BookOpen className="size-3" aria-hidden="true" />
                {readingTime}
              </span>
            ) : null}
          </p>
        ) : null}
      </div>
    </div>
  );
}
