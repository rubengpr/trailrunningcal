import Image from 'next/image';

interface BlogHeaderImageProps {
  src: string;
  alt: string;
}

export default function BlogHeaderImage({ src, alt }: BlogHeaderImageProps) {
  return (
    <div className="my-8 w-full relative aspect-4/1 rounded-lg overflow-hidden ">
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, (max-width: 1600px) 80vw, 1200px"
        priority
      />
    </div>
  );
}
