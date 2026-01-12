import type { PriceTier } from '@/types/race.types';
import type { Locale } from '@/i18n';
import { formatDateToSpanish, formatDateToCatalan } from '@/lib/date-utils';

interface PriceTiersTableProps {
  tiers: PriceTier[];
  locale: Locale;
}

export default function PriceTiersTable({
  tiers,
  locale,
}: PriceTiersTableProps) {
  const formatDate = (dateString: string) => {
    return locale === 'ca'
      ? formatDateToCatalan(dateString)
      : formatDateToSpanish(dateString);
  };

  return (
    <div className="w-full mb-6 sm:mb-8 border-2 border-gray-300 rounded-xl bg-gray-100 overflow-hidden">
      <div className="px-4 sm:px-6 py-4">
        <div className="overflow-x-auto">
          <table className="w-full">
            <tbody>
              {tiers.map((tier, index) => {
                const isLastTier = tier.until === null;
                const dateLabel = isLastTier
                  ? locale === 'ca'
                    ? 'Preu final'
                    : 'Precio final'
                  : locale === 'ca'
                    ? `Fins a ${formatDate(tier.until!)}`
                    : `Hasta ${formatDate(tier.until!)}`;

                return (
                  <tr
                    key={index}
                    className="border-b border-gray-300 last:border-b-0"
                  >
                    <td className="py-3 text-sm sm:text-base lg:text-lg text-gray-900">
                      {dateLabel}
                    </td>
                    <td className="py-3 text-right text-sm sm:text-base lg:text-lg font-semibold text-gray-900">
                      {tier.price}€
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
