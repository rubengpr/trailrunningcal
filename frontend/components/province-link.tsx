import Link from 'next/link';
import Image from 'next/image';

interface ProvinceLinkProps {
  label: string;
  linkText: string;
  href: string;
  imageSrc?: string;
}

export default function ProvinceLink({ label, linkText, href, imageSrc }: ProvinceLinkProps) {
  return (
    <div className="flex flex-col gap-3 mt-6">
      <p className="text-sm sm:text-base font-bold">{label}</p>
      <Link
        href={href}
        className="border border-gray-200 rounded-lg overflow-hidden block w-72"
      >
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
          <span className="text-sm font-medium text-gray-900">{linkText}</span>
        </div>
      </Link>
    </div>
  );
}
