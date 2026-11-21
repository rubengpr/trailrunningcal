import type { LucideIcon } from 'lucide-react';

interface EventSectionHeadingProps {
  icon: LucideIcon;
  title: string;
  className?: string;
}

export function EventSectionHeading({ icon: Icon, title, className = '' }: EventSectionHeadingProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`.trim()}>
      <Icon className="h-5 w-5 text-gray-500" />
      <h2 className="text-xl font-semibold text-gray-950 sm:text-2xl">{title}</h2>
    </div>
  );
}
