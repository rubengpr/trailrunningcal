import ImageLinkCard from '@/components/home/image-link-card';

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
  captureContext?: { race_id: string; race_slug: string };
}

export default function ProvinceLink({
  label,
  linkText,
  href,
  imageSrc,
  additionalCards,
  captureContext,
}: ProvinceLinkProps) {
  return (
    <div className="flex flex-col gap-3 mt-6">
      <p className="text-sm sm:text-base font-bold">{label}</p>
      <div className="flex flex-col gap-3 lg:flex-row">
        <ImageLinkCard
          href={href}
          label={linkText}
          imageSrc={imageSrc}
          captureEvent={captureContext ? 'race_province_link_clicked' : undefined}
          captureProperties={captureContext}
        />
        {additionalCards?.map((card) => (
          <ImageLinkCard
            key={card.href}
            href={card.href}
            label={card.label}
            imageSrc={card.imageSrc ?? imageSrc}
            captureEvent={captureContext ? 'race_recommended_race_clicked' : undefined}
            captureProperties={captureContext ? { ...captureContext, recommended_race: card.label, recommended_href: card.href } : undefined}
          />
        ))}
      </div>
    </div>
  );
}
