import Image from 'next/image';

interface RaceInfoCardProps {
  title: string;
  image: string;
  imageAlt: string;
  distance: string;
  elevation: string;
  when: string;
  level: string;
  terrain: string;
  region: string;
}

const IconDistance = () => (
  <svg
    className="w-4 h-4 text-slate-400"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
    />
  </svg>
);

const IconCalendar = () => (
  <svg
    className="w-4 h-4 text-slate-400"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>
);

const IconLevel = () => (
  <svg
    className="w-4 h-4 text-slate-400"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
    />
  </svg>
);

const IconTerrain = () => (
  <svg
    className="w-4 h-4 text-slate-400"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 12h18M3 16h18M3 20h18"
    />
  </svg>
);

export default function RaceInfoCard({
  title,
  image,
  imageAlt,
  distance,
  elevation,
  when,
  level,
  terrain,
  region,
}: RaceInfoCardProps) {
  return (
    <div className="my-6 bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div className="relative w-full h-64 sm:h-80 overflow-hidden">
        <Image
          src={image}
          alt={imageAlt}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
        />
      </div>
      <div className="p-5">
        <h3 className="text-2xl font-bold text-slate-900 mb-4">{title}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-3 text-slate-700">
            <IconDistance />
            <div className="flex items-center gap-2 flex-wrap text-slate-700">
              <p className="text-base">{distance}</p>
              <span>-</span>
              <p className="text-base">{elevation}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-slate-700">
            <IconCalendar />
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-base">{when}</p>
              <span>-</span>
              <p className="text-base">{region}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-slate-700">
            <IconLevel />
            <div>
              <span className="text-base">{level}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-slate-700">
            <IconTerrain />
            <div>
              <span className="text-base">{terrain}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
