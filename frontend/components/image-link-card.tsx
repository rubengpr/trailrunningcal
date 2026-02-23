import Link from 'next/link';
import Image from 'next/image';

interface ImageLinkCardProps {
  href: string;
  label: string;
  imageSrc?: string;
}

export default function ImageLinkCard({ href, label, imageSrc }: ImageLinkCardProps) {
  return (
    <Link href={href} className="w-full lg:flex-1 border border-gray-200 rounded-lg overflow-hidden block">
      <div className="relative h-32 w-full bg-gray-100">
        {imageSrc && (
          <Image
            src={imageSrc}
            alt={label}
            fill
            className="object-cover"
          />
        )}
      </div>
      <div className="p-3">
        <span className="text-sm font-medium text-gray-900">{label}</span>
      </div>
    </Link>
  );
}
