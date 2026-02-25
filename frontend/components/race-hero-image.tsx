import Image from 'next/image';

interface RaceHeroImageProps {
  imageUrl: string;
  alt: string;
}

export function RaceHeroImage({ imageUrl, alt }: RaceHeroImageProps) {
  return (
    <div className="mt-6 sm:mt-8 w-full relative aspect-video sm:aspect-21/9 lg:aspect-16/7 rounded-lg overflow-hidden">
      <Image
        src={imageUrl}
        alt={alt}
        fill
        priority
        className="object-cover"
        sizes="(max-width: 768px) 100vw, (max-width: 1600px) 80vw, 1200px"
      />
    </div>
  );
}
