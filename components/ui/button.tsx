import { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react';

interface ButtonBaseProps {
  variant?: 'primary' | 'secondary';
  shape?: 'rounded' | 'pill';
  fullWidth?: boolean;
  className?: string;
  children?: React.ReactNode;
}

interface ButtonAsButton extends ButtonBaseProps, Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonBaseProps> {
  href?: undefined;
  isLoading?: boolean;
  loadingText?: string;
}

interface ButtonAsAnchor extends ButtonBaseProps, Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof ButtonBaseProps> {
  href: string;
  isLoading?: never;
  loadingText?: never;
  disabled?: never;
}

type ButtonProps = ButtonAsButton | ButtonAsAnchor;

export function Button({
  variant = 'primary',
  shape = 'rounded',
  fullWidth = false,
  className = '',
  children,
  ...props
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center px-4 text-sm font-medium transition-colors focus:outline-none disabled:pointer-events-none disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed';

  const variantClasses = {
    primary: 'bg-black text-white hover:bg-gray-800',
    secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2',
  };

  const shapeClasses = {
    rounded: 'rounded-xl py-2',
    pill: 'rounded-full py-4 sm:py-3',
  };

  const widthClass = fullWidth ? 'w-full' : '';
  const combinedClasses = `${baseClasses} ${variantClasses[variant]} ${shapeClasses[shape]} ${widthClass} ${className}`.trim();

  if ('href' in props && props.href !== undefined) {
    const { href, ...anchorProps } = props as ButtonAsAnchor;
    return (
      <a href={href} className={combinedClasses} {...anchorProps}>
        {children}
      </a>
    );
  }

  const { isLoading, loadingText, disabled, ...buttonProps } = props as ButtonAsButton;
  return (
    <button
      className={combinedClasses}
      disabled={disabled || isLoading}
      {...buttonProps}
    >
      {isLoading ? loadingText || children : children}
    </button>
  );
}
