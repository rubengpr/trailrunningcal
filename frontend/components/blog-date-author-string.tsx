import { formatDateToSpanish } from '../lib/date-utils';

interface DateAuthorStringProps {
  date?: string;
  author?: string;
}

export default function DateAuthorString({
  date,
  author = 'Ruben Godoy',
}: DateAuthorStringProps) {
  const formattedDate = date ? formatDateToSpanish(date) : '';
  const dateText = formattedDate ? `${formattedDate}, por ${author}` : `por ${author}`;

  return (
    <p className="text-xs text-neutral-400 uppercase">
      {dateText}
    </p>
  );
}
