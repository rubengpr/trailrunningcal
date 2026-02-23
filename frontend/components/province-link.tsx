import ImageLinkCard from '@/components/image-link-card';

interface AdditionalCard {
  href: string;
  label: string;
  imageSrc?: string;
}

interface ProvinceLinkProps {
  label: string;
  linkText: string;
  href: string;
  imageSrc?: string;
  additionalCards?: AdditionalCard[];
}

export default function ProvinceLink({ label, linkText, href, imageSrc, additionalCards }: ProvinceLinkProps) {
  return (
    <div className="flex flex-col gap-3 mt-6">
      <p className="text-sm sm:text-base font-bold">{label}</p>
      <div className="flex flex-col gap-3 lg:flex-row">
        <ImageLinkCard href={href} label={linkText} imageSrc={imageSrc} />
        {additionalCards?.map((card) => (
          <ImageLinkCard key={card.href} href={card.href} label={card.label} imageSrc={card.imageSrc ?? imageSrc} />
        ))}
      </div>
    </div>
  );
}
