import { Breadcrumb } from '@/components/layout/breadcrumb';

interface BreadcrumbItem {
  name: string;
  href?: string;
}

interface CategoryHeroSectionProps {
  title: string;
  description: string;
  breadcrumbItems: BreadcrumbItem[];
  body?: string;
}

export default function CategoryHeroSection({
  title,
  body,
  breadcrumbItems,
}: CategoryHeroSectionProps) {
  return (
    <section className="bg-gray-50 border-b border-gray-100">
      <div className="max-w-5xl mx-auto px-6 sm:px-8 py-14 sm:py-20">
        <Breadcrumb items={breadcrumbItems} />
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
