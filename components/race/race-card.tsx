import Image from 'next/image';
import { Montserrat } from 'next/font/google';

const montserratExtrabold = Montserrat({
  weight: '800',
  subsets: ['latin'],
  variable: '--font-montserrat-extrabold',
});

const montserratMedium = Montserrat({
  weight: '500',
  subsets: ['latin'],
  variable: '--font-montserrat-medium',
});

interface RaceCardProps {
  raceName: string;
  distance: string;
  elevationGain: string;
  location: string;
  date: string;
  backgroundImage: string;
  imageAlt: string;
}

export function RaceCard({
  raceName,
  distance,
  elevationGain,
  location,
  date,
  backgroundImage,
  imageAlt,
}: RaceCardProps) {
  return (
    <div className="relative my-5 w-full overflow-hidden rounded-xl sm:my-6">
      {/* Background Image */}
      <Image
        src={backgroundImage}
        alt={imageAlt}
        fill
        className="object-cover"
        sizes="(max-width: 639px) calc(100vw - 2.5rem), (max-width: 831px) calc(100vw - 4rem), 48rem"
        loading="lazy"
      />

      {/* Dark Overlay for better text readability */}
      <div className="absolute inset-0 bg-linear-to-b from-transparent from-30% to-black" />

      {/* Content - All info at bottom */}
      <div className="relative flex min-h-56 flex-col justify-end p-5 sm:min-h-80 sm:p-7">
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          {/* Race Name, Distance and Elevation - Bottom Left */}
          <div className="text-white">
            <h3
              className={`${montserratExtrabold.className} mb-1 text-xl leading-tight text-white sm:text-[1.75rem]`}
            >
              {raceName}
            </h3>
            <p
              className={`${montserratMedium.className} text-sm sm:text-base`}
            >
              {distance} - {elevationGain}
            </p>
          </div>

          {/* Location and Date - Bottom Right */}
          <div className="flex flex-wrap items-center gap-x-1.5 text-white sm:flex-col sm:items-end sm:text-right">
            <p
              className={`${montserratMedium.className} text-xs sm:text-sm`}
            >
              {location}
            </p>
            <span className="text-xs sm:hidden">·</span>
            <p
              className={`${montserratMedium.className} text-xs sm:text-sm`}
            >
              {date}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
