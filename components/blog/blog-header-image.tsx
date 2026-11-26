import Image from 'next/image';
import { BlogImageLightbox } from './blog-image-lightbox';
import styles from './blog-article.module.css';

interface BlogHeaderImageProps {
  src: string;
  alt: string;
  caption?: string;
  credit?: string;
  trimEdges?: boolean;
}

export function BlogHeaderImage({ src, alt, caption, credit, trimEdges = false }: BlogHeaderImageProps) {
  return (
    <BlogImageLightbox
      src={src}
      alt={alt}
      caption={caption ?? alt}
      credit={credit}
      className="relative mb-6 mt-6 aspect-16/10 w-full overflow-hidden rounded-xl sm:mb-8 sm:mt-8 sm:aspect-2/1"
    >
      <Image
        src={src}
        alt={alt}
        fill
        className={trimEdges ? `object-cover ${styles.trimEdges}` : 'object-cover'}
        sizes="(max-width: 639px) calc(100vw - 2.5rem), (max-width: 831px) calc(100vw - 4rem), 48rem"
        priority
      />
    </BlogImageLightbox>
  );
}
