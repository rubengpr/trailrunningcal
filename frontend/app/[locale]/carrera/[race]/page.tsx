import Navbar from '@/components/navbar';
import { locales } from '@/i18n';
import { notFound } from 'next/navigation';
import { formatDateToSpanish, formatDateToCatalan } from '@/lib/date-utils';
import { getTranslations } from 'next-intl/server';
import type { Locale } from '@/i18n';
import { generateRaceSlug, getRaceBySlug } from '@/lib/race-utils';
import { races } from '@/data/races';

export async function generateStaticParams() {
  const params = locales.flatMap((locale) =>
    races.map((race) => ({
      locale,
      race: generateRaceSlug(race.name),
    })),
  );
  return params;
}

export default async function RacePage({
  params,
}: {
  params: Promise<{ locale: string; race: string }>;
}) {
  const { locale, race } = await params;

  const raceData = getRaceBySlug(race);

  if (!raceData) {
    notFound();
  }

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  // Get translations for the race page
  const tRace = await getTranslations({ locale, namespace: 'race' });

  const formattedDate = raceData.date
    ? locale === 'ca'
      ? formatDateToCatalan(raceData.date)
      : formatDateToSpanish(raceData.date)
    : '-';

  return (
    <div className="min-h-screen w-full text-gray-900 flex flex-col bg-white">
      <Navbar />
      <div className="flex flex-col mx-20 my-10">
        <div className="flex flex-row justify-between items-center">
          <div className="flex flex-col">
            <h1 className="text-4xl font-bold mb-1">{raceData.name}</h1>
            <div className="flex flex-row text-gray-600 gap-3">
              <h3 className="text-xl font-bold text-black">{formattedDate}</h3>
              <div className="flex flex-row gap-2">
                <div className="flex flex-row gap-1">
                  <h3 className="text-xl">{raceData.city}</h3>
                  <h3 className="text-xl">·</h3>
                  <h3 className="text-xl">{raceData.province}</h3>
                </div>
                <div>
                  <h3 className="text-xl">|</h3>
                </div>
                <div className="flex flex-row gap-1">
                  <h3 className="text-xl">{raceData.distanceKm}km</h3>
                  <h3 className="text-xl">+{raceData.elevationGainM}m</h3>
                </div>
              </div>
            </div>
          </div>
          <div>
            <a
              href={raceData.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gray-900 text-white px-4 py-2 rounded-md font-medium hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors cursor-pointer inline-block"
            >
              Web oficial
            </a>
          </div>
        </div>

        <div className="w-full my-6">
          <p>
            La Salomon Ultra Pirineu 100K® 2025 es una de las ultras de montaña
            más emblemáticas del sur de Europa. Con salida y llegada en Bagà, en
            el Parc Natural del Cadí-Moixeró, ofrece un recorrido de 100
            kilómetros y más de 6.000 metros de desnivel positivo, atravesando
            crestas, bosques y senderos técnicos del Pirineo catalán. Es una
            prueba exigente, diseñada para corredores con experiencia en larga
            distancia y terrenos de alta montaña. La carrera destaca también por
            su ambiente y su carácter épico, con tramos nocturnos,
            avituallamientos en lugares remotos y un fuerte apoyo del público
            local. Cada año reúne a atletas de élite y a corredores populares de
            todo el mundo, convirtiéndose en una experiencia intensa donde
            resistencia, estrategia y conexión con la montaña son clave para
            alcanzar la meta.
          </p>
        </div>
        <div className="flex flex-row justify-between items-center px-6 py-4 border-2 border-gray-300 rounded-xl bg-gray-100">
          <div className="flex flex-row justify-start items-center gap-4">
            <div className="flex flex-row w-20 h-20 justify-center items-center border-3 border-gray-300 rounded-full bg-gray-50">
              <p className="text-3xl">🏁</p>
            </div>
            <div className="flex flex-col justify-start">
              <h3 className="text-lg font-semibold mb-1">
                {tRace('organizerCard.title')}
              </h3>
              <p className="text-sm/5">
                {tRace('organizerCard.description')}
                <br />
                {tRace('organizerCard.benefits')}
              </p>
            </div>
          </div>
          <div className="flex flex-row justify-end items-center">
            <button className="bg-gray-900 text-white px-4 py-2 rounded-md font-medium hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors cursor-pointer">
              {tRace('organizerCard.claimButton')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
