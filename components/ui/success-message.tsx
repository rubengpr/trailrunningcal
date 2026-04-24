import { Check } from 'lucide-react';

interface SuccessMessageProps {
  title: string;
  description?: string;
  className?: string;
}

export function SuccessMessage({ title, description, className = '' }: SuccessMessageProps) {
  return (
    <div className={`flex flex-col items-center space-y-4 p-6 ${className}`.trim()}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
        <Check className="text-green-600" size={24} />
      </div>
      <div className="flex flex-col space-y-2 text-center">
        <h3 className="text-2xl font-semibold leading-none tracking-tight">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-gray-600">{description}</p>
        )}
      </div>
    </div>
  );
}
