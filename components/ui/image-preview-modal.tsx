'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import { BaseModal } from '@/components/ui/base-modal';

export function ImagePreviewModal({ src, alt, title, closeLabel, onClose }: {
  src: string; alt: string; title: string; closeLabel: string; onClose: () => void;
}) {
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.querySelector('button')?.focus();
    return () => { document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  return <div ref={dialog} role="dialog" aria-modal="true" aria-label={title}
    onKeyDown={event => { if (event.key === 'Tab') event.preventDefault(); }}>
    <BaseModal isOpen title={title} closeLabel={closeLabel} maxWidth="5xl" onClose={onClose}>
      <Image src={src} alt={alt} width={1600} height={1000} unoptimized className="max-h-[70dvh] w-full rounded-md object-contain" />
    </BaseModal>
  </div>;
}
