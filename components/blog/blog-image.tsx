import Image from 'next/image';
import { BlogImageLightbox } from './blog-image-lightbox';

export function BlogImage({ src, alt, width, height, caption, credit }: {
  src: string; alt: string; width: string; height: string; caption?: string; credit?: string;
}) {
  return <figure className="my-8">
    <BlogImageLightbox src={src} alt={alt} caption={caption ?? alt} credit={credit}
      className="relative w-full overflow-hidden rounded-xl">
      <Image src={src} alt={alt} width={Number(width)} height={Number(height)}
        sizes="(max-width: 639px) calc(100vw - 2.5rem), (max-width: 831px) calc(100vw - 4rem), 48rem" className="h-auto w-full" />
    </BlogImageLightbox>
  </figure>;
}
