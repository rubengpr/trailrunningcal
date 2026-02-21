interface SuccessMessageProps {
  title: string;
  description?: string;
  className?: string;
}

export function SuccessMessage({ title, description, className = '' }: SuccessMessageProps) {
  return (
    <div className={`flex flex-col items-center space-y-4 p-6 ${className}`.trim()}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-green-600"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
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
