import type { ReactNode } from 'react';

interface ReviewActionButtonProps {
  title: string;
  onClick: () => void;
  disabled: boolean;
  children: ReactNode;
  variant?: 'default' | 'primary';
}

export function ReviewActionButton({
  title,
  onClick,
  disabled,
  children,
  variant = 'default',
}: ReviewActionButtonProps): React.ReactElement {
  const classes = variant === 'primary'
    ? 'text-gray-900 hover:bg-gray-100'
    : 'text-gray-700 hover:bg-gray-100';

  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-35 ${classes}`}
    >
      {children}
    </button>
  );
}
