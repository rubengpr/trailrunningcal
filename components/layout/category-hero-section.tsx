interface CategoryHeroSectionProps {
  title: string;
  description: string;
  breadcrumb: string;
  body?: string;
}

export default function CategoryHeroSection({
  title,
  body,
}: CategoryHeroSectionProps) {
  return (
    <section className="bg-gray-50 border-b border-gray-100">
      <div className="max-w-5xl mx-auto px-6 sm:px-8 py-14 sm:py-20">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-snug text-gray-900">
          {title}
        </h1>
        {body && (
          <p className="mt-4 text-sm text-gray-600 max-w-4xl leading-relaxed">
            {body}
          </p>
        )}
      </div>
    </section>
  );
}
