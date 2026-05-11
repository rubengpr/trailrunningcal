type AlertBannerVariant = 'info' | 'warning' | 'error' | 'success';

const variantStyles: Record<AlertBannerVariant, string> = {
    info: 'bg-gray-50 border-gray-200 text-gray-700',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    success: 'bg-green-50 border-green-200 text-green-800',
};

interface AlertBannerProps {
    title: string;
    variant?: AlertBannerVariant;
    children?: React.ReactNode;
    className?: string;
}

export function AlertBanner({ title, variant = 'info', children, className = '' }: AlertBannerProps) {
    return (
        <div className={`rounded-lg border p-4 ${variantStyles[variant]} ${className}`}>
            <p className="text-sm font-medium">{title}</p>
            {children && <div className="mt-2">{children}</div>}
        </div>
    );
}
