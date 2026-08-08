'use client';

import { useEffect } from 'react';
import { BaseModal } from '@/components/ui/base-modal';
import type { BaseModalMaxWidth } from '@/components/ui/base-modal';

interface EmbedModalProps {
  className?: string;
  embedTitle: string;
  isOpen: boolean;
  maxWidth?: BaseModalMaxWidth;
  onClose: () => void;
  src: string;
  title: string;
}

export function EmbedModal({
  className,
  embedTitle,
  isOpen,
  maxWidth,
  onClose,
  src,
  title,
}: EmbedModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  return (
    <BaseModal
      isOpen={isOpen}
      maxWidth={maxWidth}
      onClose={onClose}
      title={title}
    >
      <iframe
        allowFullScreen
        className={className}
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        src={src}
        title={embedTitle}
      />
    </BaseModal>
  );
}
