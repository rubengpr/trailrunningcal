import Image from 'next/image';

export function BlogImage({ src, alt, width, height, caption }: {
  src: string; alt: string; width: string; height: string; caption?: string;
}) {
  return <figure className="my-8">
    <Image src={src} alt={alt} width={Number(width)} height={Number(height)}
      sizes="(max-width: 768px) 100vw, 1200px" className="h-auto w-full rounded-lg" />
    {caption ? <figcaption className="mt-2 text-center text-sm text-gray-500">{caption}</figcaption> : null}
  </figure>;
}
