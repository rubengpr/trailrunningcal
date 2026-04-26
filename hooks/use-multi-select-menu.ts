'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface UseMultiSelectMenuOptions {
  usePortalPosition?: boolean;
  minWidth?: number;
  offset?: number;
}

interface DropdownStyle {
  top: number;
  left: number;
  minWidth: number;
}

const DEFAULT_DROPDOWN_STYLE: DropdownStyle = {
  top: 0,
  left: 0,
  minWidth: 0,
};

export function useMultiSelectMenu({
  usePortalPosition = false,
  minWidth = 160,
  offset = 4,
}: UseMultiSelectMenuOptions = {}) {
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<DropdownStyle>(DEFAULT_DROPDOWN_STYLE);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const closeMenu = useCallback((): void => {
    setOpen(false);
  }, []);

  const toggleOpen = useCallback((): void => {
    if (!open && usePortalPosition && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const computedMinWidth = Math.max(rect.width, minWidth);
      const wouldOverflowRight = rect.left + computedMinWidth > window.innerWidth;
      const left = wouldOverflowRight
        ? rect.right + window.scrollX - computedMinWidth
        : rect.left + window.scrollX;

      setDropdownStyle({
        top: rect.bottom + window.scrollY + offset,
        left,
        minWidth: computedMinWidth,
      });
    }

    setOpen((prev) => !prev);
  }, [open, usePortalPosition, minWidth, offset]);

  useEffect(() => {
    if (!open) return;

    const handleOutsideClick = (event: MouseEvent): void => {
      const target = event.target as Node;
      const insideContainer = containerRef.current?.contains(target);
      const insideDropdown = dropdownRef.current?.contains(target);
      if (!insideContainer && !insideDropdown) closeMenu();
    };

    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') closeMenu();
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, closeMenu]);

  return {
    open,
    containerRef,
    triggerRef,
    dropdownRef,
    dropdownStyle,
    toggleOpen,
    closeMenu,
  };
}
