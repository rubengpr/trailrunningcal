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

export default function RaceCard({
  raceName,
  distance,
  elevationGain,
  location,
  date,
  backgroundImage,
  imageAlt,
}: RaceCardProps) {
  return (
    <div className="relative w-full h-[300px] sm:h-[400px] lg:h-[600px] rounded-lg overflow-hidden shadow-md my-6">
      {/* Background Image */}
      <Image
        src={backgroundImage}
        alt={imageAlt}
        fill
        className="object-cover"
        sizes="100vw"
        priority
      />

      {/* Dark Overlay for better text readability */}
      <div className="absolute inset-0 bg-linear-to-b from-transparent from-30% to-black" />

      {/* Content - All info at bottom */}
      <div className="relative h-full flex flex-col justify-end p-5 sm:p-8 lg:p-12">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-2">
          {/* Race Name, Distance and Elevation - Bottom Left */}
          <div className="text-white">
            <h3
              className={`${montserratExtrabold.className} text-xl sm:text-4xl lg:text-5xl xl:text-6xl text-white mb-1 sm:mb-2`}
            >
              {raceName}
            </h3>
            <p
              className={`${montserratMedium.className} text-xs sm:text-lg lg:text-xl`}
            >
              {distance} - {elevationGain}
            </p>
          </div>

          {/* Location and Date - Bottom Right */}
          <div className="flex flex-row sm:flex-col text-white text-right">
            <p
              className={`${montserratMedium.className} text-xs sm:text-lg lg:text-xl`}
            >
              {location}
            </p>
            <span className="text-xs">&nbsp;-&nbsp;</span>
            <p
              className={`${montserratMedium.className} text-xs sm:text-lg lg:text-xl`}
            >
              {date}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
