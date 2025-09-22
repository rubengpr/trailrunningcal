interface TrailRaceCardProps {
  date: string;
  name: string;
  distanceKm: number;
  elevationGainM: number;
  priceEur: number | null;
  city: string;
  province: string;
  websiteUrl: string;
  difficulty: 'fácil' | 'moderado' | 'difícil' | 'experto';
}

const formatDate = (dateString: string) => {
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
    <article className="w-full bg-white rounded-lg shadow hover:shadow-md transition-shadow">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex gap-4">
            <div className="flex flex-col items-center justify-center min-w-[60px] px-3 py-2 bg-indigo-100 text-indigo-700 rounded-sm">
              <span className="text-[10px] font-medium uppercase tracking-wide">
                {dayOfWeek}
              </span>
              <span className="text-lg font-bold">{day}</span>
              <span className="text-xs font-medium capitalize">{month}</span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-1">{name}</h3>

              <div></div>
              <div className="flex gap-3 text-sm text-gray-600 my-2">
                <span>{distanceKm}km</span>
                <span>{elevationGainM}m+</span>
                <span className="truncate">
                  {city}, {province}
                </span>
              </div>
              <div className="flex justify-start">
                <span
                  className={`px-2 py-0.5 text-xs font-medium rounded-sm ${
                    difficulty === 'fácil'
                      ? 'bg-green-100 text-green-800'
                      : difficulty === 'moderado'
                        ? 'bg-yellow-100 text-yellow-800'
                        : difficulty === 'difícil'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-red-100 text-red-800'
                  }`}
                >
                  {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                </span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="font-semibold text-gray-900 mb-1">
              {priceEur ? `${priceEur}€` : '—'}
            </div>
            <a
              href={websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              Web →
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
