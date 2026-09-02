import type { ButtonHTMLAttributes } from 'react';

type TableActionButtonTone = 'default' | 'success' | 'warning' | 'destructive';

interface TableActionButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'className' | 'title' | 'type'
> {
  title: string;
  tone?: TableActionButtonTone;
}

const TONE_CLASSES: Record<TableActionButtonTone, string> = {
  default: 'text-gray-400 hover:bg-gray-100 hover:text-gray-800',
  success: 'text-gray-400 hover:bg-gray-100 hover:text-green-700',
  warning: 'text-amber-600 hover:bg-amber-100 hover:text-amber-700',
  destructive: 'text-gray-400 hover:bg-red-50 hover:text-red-600',
};

export function TableActionButton({
  title,
  tone = 'default',
  children,
  ...props
}: TableActionButtonProps): React.ReactElement {
  return (
    <button
      type="button"
      title={title}
      className={`inline-flex size-8 cursor-pointer items-center justify-center rounded transition-colors disabled:pointer-events-none disabled:opacity-40 ${TONE_CLASSES[tone]}`}
      {...props}
    >
      {children}
    </button>
  );
}
