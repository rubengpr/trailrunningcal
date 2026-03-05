import type { Locale } from '@/i18n';
import { getTranslations } from 'next-intl/server';

interface RaceServicesListProps {
  services: string[];
  locale: Locale;
}

export default async function RaceServicesList({
  services,
  locale,
}: RaceServicesListProps) {
  const t = await getTranslations({ locale, namespace: 'race' });

  if (!services || services.length === 0) {
    return null;
  }

  return (
    <div className="w-full mb-6 sm:mb-8 border-2 border-gray-300 rounded-xl bg-gray-100 overflow-hidden">
      <div className="px-4 sm:px-6 py-4">
        <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
          {t('services.title')}
        </h3>
        <ul className="space-y-2 sm:space-y-3">
          {services.map((service, index) => (
            <li
              key={index}
              className="text-sm sm:text-base lg:text-lg text-gray-900 flex items-start"
            >
              <span className="mr-2 sm:mr-3 text-gray-600">•</span>
              <span>{service}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
