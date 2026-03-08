import Link from 'next/link';

interface BreadcrumbItem {
  name: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1.5 text-sm text-gray-500 mb-4">
      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-1.5">
          {index > 0 && <span>/</span>}
          {item.href ? (
            <Link href={item.href} className="hover:text-gray-900 transition-colors">
              {item.name}
            </Link>
          ) : (
            <span className="text-gray-700">{item.name}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
