import { ExternalLink } from 'lucide-react';

interface PromoBannerProps {
  message: string;
  code: string;
}

export function PromoBanner({ message, code }: PromoBannerProps) {
  return (
    <aside className="w-full border-b border-[#000000] bg-[#ef482b] px-3 py-2 text-center">
      <p className="flex min-w-0 items-center justify-center gap-1 truncate text-[10px] font-semibold leading-4 text-[#ffffff] sm:text-xs">
        <span className="min-w-0 truncate">{message}</span>
        <span className="min-w-0 truncate underline font-bold">{code}</span>
        <ExternalLink className="size-3 shrink-0" strokeWidth={2} />
      </p>
    </aside>
  );
}
