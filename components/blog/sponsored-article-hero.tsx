import Image from 'next/image';

interface SponsoredArticleHeroProps {
  brand: string;
  brandLogo: string;
  image: string;
  imageAlt: string;
  productName: string;
  sponsorshipLabel?: string;
}

export function SponsoredArticleHero({
  brand,
  brandLogo,
  image,
  imageAlt,
  productName,
  sponsorshipLabel = 'Contenido patrocinado',
}: SponsoredArticleHeroProps) {
  return (
    <figure className="relative my-8 min-h-72 overflow-hidden rounded-2xl bg-[#e8e5dd] sm:min-h-96">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_16%,rgba(255,255,255,0.8),transparent_27%),linear-gradient(130deg,rgba(255,255,255,0.68),rgba(222,218,207,0.25))]" />
      <div className="relative flex min-h-72 flex-col justify-between p-6 sm:min-h-96 sm:p-10">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-600">
          <span className="h-px w-6 bg-gray-500" />
          {sponsorshipLabel}
        </div>
        <div className="max-w-[58%] pb-1 sm:max-w-[52%]">
          <Image
            src={brandLogo}
            alt={brand}
            width={118}
            height={40}
            className="h-7 w-auto object-contain object-left sm:h-8"
          />
          <p className="mt-3 text-sm font-medium text-gray-700 sm:text-base">
            {productName}
          </p>
        </div>
      </div>
      <Image
        src={image}
        alt={imageAlt}
        width={1254}
        height={1254}
        priority
        className="absolute -bottom-[18%] -right-[8%] h-[112%] w-auto max-w-[64%] object-contain drop-shadow-[0_22px_24px_rgba(38,40,35,0.25)] sm:-bottom-[17%] sm:right-[2%] sm:max-w-[52%]"
      />
    </figure>
  );
}
