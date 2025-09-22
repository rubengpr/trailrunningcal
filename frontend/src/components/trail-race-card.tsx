interface TrailRaceCardProps {
  date: string;
  name: string;
  distanceKm: number;
  elevationGainM: number;
  priceEur: number | null;
  city: string;
  province: string;
  websiteUrl: string;
}

export default function TrailRaceCard({
  date,
  name,
  distanceKm,
  elevationGainM,
  priceEur,
  city,
  province,
  websiteUrl,
}: TrailRaceCardProps) {
  return (
    <article className="w-full bg-white rounded-lg shadow hover:shadow-md transition-shadow">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-sm font-medium rounded">
              {date}
            </span>
            <h3 className="text-xl font-bold text-gray-900">{name}</h3>
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

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-500">Distancia:</span>
            <span className="ml-1 font-medium">{distanceKm} km</span>
          </div>
          <div>
            <span className="text-gray-500">Desnivel:</span>
            <span className="ml-1 font-medium">{elevationGainM} m</span>
          </div>
          <div>
            <span className="text-gray-500">Precio:</span>
            <span className="ml-1 font-medium">
              {priceEur ? `${priceEur} €` : '—'}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Lugar:</span>
            <span className="ml-1 font-medium">
              {city}, {province}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
