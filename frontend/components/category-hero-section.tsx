interface CategoryHeroSectionProps {
  title: string;
  subtitle: string;
  description: string;
  breadcrumb: string;
}

export default function CategoryHeroSection({
  title,
  subtitle,
  description,
  breadcrumb,
}: CategoryHeroSectionProps) {
  return (
    <section className="bg-gradient-to-b from-gray-50 to-white px-6 py-10">
      <div className="flex justify-center items-center text-center">
        <div className="flex flex-col items-center justify-center max-w-4xl mx-auto">
          <span className="text-xs sm:text-sm text-gray-500 font-medium uppercase tracking-wide mb-3">
            {breadcrumb}
          </span>
          <h1 className="text-2xl sm:text-4xl font-extrabold leading-tight">
            {title}
          </h1>
          <p className="mt-2 text-sm sm:text-lg text-gray-700 max-w-xl">
            {subtitle}
          </p>
          <p className="mt-2 text-xs sm:text-sm text-gray-500 max-w-xl">
            {description}
          </p>
        </div>
      </div>
    </section>
  );
}
