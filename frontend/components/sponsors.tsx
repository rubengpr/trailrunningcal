import Image from 'next/image';

interface SponsorsProps {
  sponsors: string[];
}

export default function Sponsors({ sponsors }: SponsorsProps) {
  return (
    <div className="flex flex-row flex-wrap justify-center items-center py-4 md:py-8 gap-2 md:gap-4 lg:gap-6">
      {sponsors.map((sponsor, index) => (
        <div key={index} className="shrink-0">
          <Image
            src={sponsor}
            width={200}
            height={200}
            alt={`Sponsor logo ${index + 1}`}
            className="w-20 h-20 md:w-32 md:h-32 lg:w-48 lg:h-48 object-contain"
          />
        </div>
      ))}
    </div>
  );
}
