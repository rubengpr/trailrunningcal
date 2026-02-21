import { ReactNode } from 'react';

interface CenteredFormLayoutProps {
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg';
}

export function CenteredFormLayout({
  children,
  maxWidth = 'sm',
}: CenteredFormLayoutProps) {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
  };

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className={`w-full ${maxWidthClasses[maxWidth]}`}>
        {children}
      </div>
    </div>
  );
}
