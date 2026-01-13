import type { Locale } from '@/i18n';
import { getTranslations } from 'next-intl/server';

interface RaceResultsUrlsProps {
  resultsUrls: Array<{ year: number; url: string }>;
  locale: Locale;
}

export default async function RaceResultsUrls({
  resultsUrls,
  locale,
}: RaceResultsUrlsProps) {
  const t = await getTranslations({ locale, namespace: 'race' });

  if (!resultsUrls || resultsUrls.length === 0) {
    return null;
  }

  // Sort by year descending (newest first)
  const sortedResults = [...resultsUrls].sort((a, b) => b.year - a.year);

  return (
    <div className="w-full mb-6 sm:mb-8 border-2 border-gray-300 rounded-xl bg-gray-100 overflow-hidden">
      <div className="px-4 sm:px-6 py-4">
        <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
          {t('results.title')}
        </h3>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {sortedResults.map((result, index) => (
            <a
              key={index}
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gray-900 text-white px-4 py-2 rounded-md font-medium hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors cursor-pointer text-sm sm:text-base"
            >
              {result.year}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
