import { Heart } from 'lucide-react';

interface FavoriteButtonProps {
  isFavorited: boolean;
  onToggle: () => void;
  label: string;
  iconOnly?: boolean;
  className?: string;
  title?: string;
}

export function FavoriteButton({ isFavorited, onToggle, label, iconOnly = false, className = '', title }: FavoriteButtonProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle();
  };

  return (
    <button
      onClick={handleClick}
      title={title ?? label}
      className={`flex items-center justify-center gap-1.5 rounded-md font-medium border transition-colors cursor-pointer whitespace-nowrap ${iconOnly ? 'p-2' : 'px-4 py-2'} ${className} ${isFavorited
        ? 'border-red-200 bg-red-50 text-red-500 hover:bg-red-100'
        : 'border-gray-200 bg-white text-gray-400 hover:text-red-400 hover:border-red-200'
        }`}
    >
      {isFavorited ? (
        <Heart className="w-5 h-5 text-red-500 shrink-0" fill="currentColor" stroke="none" />
      ) : (
        <Heart className="w-5 h-5 shrink-0" strokeWidth={1.5} />
      )}
      {iconOnly ? (
        <span className="sm:hidden">{label}</span>
      ) : (
        <span>{label}</span>
      )}
    </button>
  );
}
