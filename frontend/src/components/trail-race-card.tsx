interface TrailRaceCardProps {
  date: string | null;
  name: string;
  distanceKm: number;
  elevationGainM: number | null;
  priceEur: number | null;
  city: string;
  province: string;
  websiteUrl: string | null;
  difficulty: 'fácil' | 'moderado' | 'difícil' | 'experto' | null;
}

const formatDate = (dateString: string | null) => {
  if (!dateString) {
    return { day: '-', month: '-', dayOfWeek: '-' };
  }
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.toLocaleDateString('es-ES', { month: 'short' });
  const dayOfWeek = date.toLocaleDateString('es-ES', { weekday: 'short' });
  return { day, month, dayOfWeek };
};

export default function TrailRaceCard({
  date,
  name,
  distanceKm,
  elevationGainM,
  priceEur,
  city,
  province,
  websiteUrl,
  difficulty,
}: TrailRaceCardProps) {
  const { day, month, dayOfWeek } = formatDate(date);
  return (
    <article
      className="w-full bg-white rounded-lg shadow hover:shadow-md transition-shadow"
      role="article"
      aria-labelledby={`race-title-${name.replace(/\s+/g, '-').toLowerCase()}`}
    >
      <div className="w-full p-2 sm:p-4">
        <div className="flex items-start sm:justify-between mb-1">
          <div className="flex gap-4">
            <div className="flex flex-col items-center justify-center min-w-[50px] px-3 py-2 bg-indigo-100 text-indigo-700 rounded-sm">
              <span className="text-[8px] sm:text-[10px] font-medium uppercase tracking-wide">
                {dayOfWeek}
              </span>
              <span className="text-base sm:text-lg font-bold">{day}</span>
              <span className="text-[10px] sm:text-xs font-medium capitalize">
                {month}
              </span>
            </div>
            <div className="flex-1">
              <h3
                id={`race-title-${name.replace(/\s+/g, '-').toLowerCase()}`}
                className="text-xs sm:text-lg font-bold text-gray-900 mb-1"
              >
                {name}
              </h3>
              <div
                className="flex gap-3 text-[10px] sm:text-sm text-gray-600 mb-2"
                role="group"
                aria-label="Detalles de la carrera"
              >
                <span aria-label={`Distancia: ${distanceKm} kilómetros`}>
                  {distanceKm}km
                </span>
                <span
                  aria-label={`Desnivel: ${elevationGainM ? elevationGainM + ' metros' : 'No especificado'}`}
                >
                  {elevationGainM ? `${elevationGainM}m+` : '-'}
                </span>
                <span
                  className="truncate"
                  aria-label={`Ubicación: ${city}, ${province}`}
                >
                  {city}, {province}
                </span>
              </div>
              <div className="flex justify-start items-center gap-2">
                <span
                  className={`hidden sm:block px-2 py-0.5 text-[10px] sm:text-xs font-medium rounded-sm ${
                    difficulty === 'fácil'
                      ? 'bg-green-100 text-green-800'
                      : difficulty === 'moderado'
                        ? 'bg-yellow-100 text-yellow-800'
                        : difficulty === 'difícil'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-red-100 text-red-800'
                  }`}
                  aria-label={`Dificultad: ${difficulty || 'No especificada'}`}
                >
                  {difficulty
                    ? difficulty.charAt(0).toUpperCase() + difficulty.slice(1)
                    : 'N/A'}
                </span>
                {websiteUrl && (
                  <a
                    href={websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Visitar página web de ${name} (se abre en nueva pestaña)`}
                    className="sm:hidden inline-block bg-indigo-600 text-white px-2 py-0.5 rounded-sm text-[10px] font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
                  >
                    Web →
                  </a>
                )}
                <div
                  className="block sm:hidden font-semibold text-gray-900 text-xs sm:text-lg"
                  aria-label={`Precio: ${priceEur ? priceEur + ' euros' : 'No especificado'}`}
                >
                  {priceEur ? `${priceEur}€` : '—'}
                </div>
              </div>
            </div>
          </div>
          <div className="hidden sm:flex flex-col items-end gap-2">
            <div
              className="font-semibold text-gray-900 text-xs sm:text-lg"
              aria-label={`Precio: ${priceEur ? priceEur + ' euros' : 'No especificado'}`}
            >
              {priceEur ? `${priceEur}€` : '—'}
            </div>
            {websiteUrl && (
              <a
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Visitar página web de ${name} (se abre en nueva pestaña)`}
                className="hidden sm:inline-block bg-indigo-600 text-white px-3 py-1 rounded-md text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
              >
                Web →
              </a>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
