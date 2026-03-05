import { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`text-center py-16 px-4 ${className}`.trim()}>
      <div className="max-w-md mx-auto">
        {icon && <div className="mb-6">{icon}</div>}
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {title}
        </h3>
        {description && (
          <p className="text-gray-600 mb-6">{description}</p>
        )}
        {action && <div>{action}</div>}
      </div>
    </div>
  );
}

interface EmptyStateIconProps {
  children: ReactNode;
  className?: string;
}

export function EmptyStateIcon({ children, className = '' }: EmptyStateIconProps) {
  return (
    <div className={`mx-auto h-16 w-16 text-gray-400 ${className}`.trim()}>
      {children}
    </div>
  );
}
