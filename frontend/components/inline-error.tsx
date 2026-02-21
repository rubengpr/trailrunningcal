interface InlineErrorProps {
  error?: string;
  className?: string;
}

export function InlineError({ error, className = '' }: InlineErrorProps) {
  if (!error) return null;

  return (
    <p className={`text-sm text-red-500 ${className}`.trim()}>
      {error}
    </p>
  );
}
