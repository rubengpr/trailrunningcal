import { ReactNode } from 'react';

interface FormCardProps {
  title?: string;
  description?: string;
  children: ReactNode;
  hideHeader?: boolean;
}

export function FormCard({ title, description, children, hideHeader = false }: FormCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      {!hideHeader && (title || description) && (
        <div className="flex flex-col space-y-1.5 p-6">
          {title && (
            <h3 className="text-2xl font-semibold leading-none tracking-tight">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-sm text-gray-500">{description}</p>
          )}
        </div>
      )}
      <div className={hideHeader || !(title || description) ? 'p-6' : 'p-6 pt-0'}>
        {children}
      </div>
    </div>
  );
}
