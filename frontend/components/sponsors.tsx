import Image from 'next/image';

interface SponsorsProps {
  sponsors: string[];
}

export default function Sponsors({ sponsors }: SponsorsProps) {
  return (
    <div className="flex flex-row justify-center items-center py-8 gap-4">
      {sponsors.map((sponsor, index) => (
        <Image
          key={index}
          src={sponsor}
          width={200}
          height={200}
          alt={`Sponsor logo ${index + 1}`}
        />
      ))}
    </div>
  );
}
