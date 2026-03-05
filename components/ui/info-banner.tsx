interface InfoBannerProps {
    children: React.ReactNode;
    className?: string;
}

export function InfoBanner({ children, className = '' }: InfoBannerProps) {
    return (
        <div
            className={`bg-gray-50 border border-gray-200 rounded-lg p-4 ${className}`}
        >
            <p className="text-sm text-gray-700">{children}</p>
        </div>
    );
}
