import type { FaqItem } from '@/lib/seo/faq-json-ld';

interface FaqSectionProps {
  sections: FaqItem[];
  heading: string;
}

export function FaqSection({ sections, heading }: FaqSectionProps) {
  if (!sections.length) return null;

  return (
    <div className="max-w-5xl mx-auto px-6 sm:px-8 py-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">{heading}</h2>
      {sections.map((section) => (
        <details key={section.question} className="group border-b border-gray-100 last:border-0">
          <summary className="flex items-center justify-between gap-4 py-5 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
            <h3 className="text-base font-semibold text-gray-900">
              {section.question}
            </h3>
            <span className="shrink-0 text-gray-400 text-lg leading-none group-open:hidden">+</span>
            <span className="shrink-0 text-gray-400 text-lg leading-none hidden group-open:block">−</span>
          </summary>
          <p className="text-sm text-gray-600 leading-relaxed pb-4">
            {section.answer}
          </p>
        </details>
      ))}
    </div>
  );
}
