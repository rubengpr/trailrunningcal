import { formatDateToSpanish, formatDateToCatalan } from '../lib/date-utils';
import type { Locale } from '@/i18n';

interface DateAuthorStringProps {
  date?: string;
  author?: string;
  locale?: Locale;
}

export default function DateAuthorString({
  date,
  author = 'Ruben Godoy',
  locale = 'es',
}: DateAuthorStringProps) {
  const formattedDate = date
    ? locale === 'ca'
      ? formatDateToCatalan(date)
      : formatDateToSpanish(date)
    : '';
  const byText = locale === 'ca' ? 'per' : 'por';
  const dateText = formattedDate
    ? `${formattedDate}, ${byText} ${author}`
    : `${byText} ${author}`;

  return <p className="text-xs text-neutral-400 uppercase">{dateText}</p>;
}
