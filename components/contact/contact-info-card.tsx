import type { ReactNode } from 'react';

interface ContactInfoCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}

export function ContactInfoCard({
  icon,
  title,
  description,
  children,
}: ContactInfoCardProps): React.ReactElement {
  return (
    <div className="bg-white rounded-lg p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-gray-100 rounded-lg">
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      <p className="text-gray-600 mb-2">{description}</p>
      {children}
    </div>
  );
}
