'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import { BaseModal } from '@/components/ui/base-modal';

interface ImagePreviewModalProps {
  src: string;
  alt: string;
  title: string;
  closeLabel: string;
  onClose: () => void;
}

export function ImagePreviewModal({
  src,
  alt,
  title,
  closeLabel,
  onClose,
}: ImagePreviewModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.querySelector('button')?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, []);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onKeyDown={(event) => {
        if (event.key === 'Tab') {
          event.preventDefault();
          dialogRef.current?.querySelector('button')?.focus();
        }
      }}
    >
      <BaseModal isOpen title={title} closeLabel={closeLabel} maxWidth="5xl" onClose={onClose}>
        <Image
          src={src}
          alt={alt}
          width={2940}
          height={1672}
          priority
          className="max-h-[70dvh] w-full rounded-md object-contain"
        />
      </BaseModal>
    </div>
  );
}
