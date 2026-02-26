import Image from 'next/image';

interface SponsorsProps {
  sponsors: string[];
}

function getSponsorAltFromUrl(url: string): string {
  const filename = url.split('/').pop() ?? url;
  const nameWithoutExt = filename.replace(/\.[^.]+$/, '');
  const words = nameWithoutExt.replace(/[-_]/g, ' ').split(/\s+/);
  const capitalized = words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  return capitalized ? `${capitalized} logo` : 'Sponsor logo';
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
            alt={getSponsorAltFromUrl(sponsor)}
            className="w-20 h-20 md:w-32 md:h-32 lg:w-48 lg:h-48 object-contain"
          />
        </div>
      ))}
    </div>
  );
}
