'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface UseMultiSelectMenuOptions {
  usePortalPosition?: boolean;
  minWidth?: number;
  offset?: number;
  preferredMenuHeight?: number;
}

interface DropdownStyle {
  top: number;
  left: number;
  minWidth: number;
  maxHeight?: number;
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
  preferredMenuHeight,
}: UseMultiSelectMenuOptions = {}) {
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<DropdownStyle>(DEFAULT_DROPDOWN_STYLE);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const closeMenu = useCallback((): void => {
    setOpen(false);
  }, []);

  const openMenu = useCallback((): void => {
    if (usePortalPosition && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const computedMinWidth = Math.max(rect.width, minWidth);
      const wouldOverflowRight = rect.left + computedMinWidth > window.innerWidth;
      const left = wouldOverflowRight
        ? rect.right + window.scrollX - computedMinWidth
        : rect.left + window.scrollX;
      const viewportPadding = 8;
      const availableBelow = Math.max(
        0,
        window.innerHeight - rect.bottom - offset - viewportPadding,
      );
      const availableAbove = Math.max(
        0,
        rect.top - offset - viewportPadding,
      );
      const shouldOpenAbove = preferredMenuHeight !== undefined &&
        availableBelow < preferredMenuHeight &&
        availableAbove > availableBelow;
      const availableHeight = shouldOpenAbove
        ? availableAbove
        : availableBelow;
      const maxHeight = preferredMenuHeight === undefined
        ? undefined
        : Math.min(preferredMenuHeight, availableHeight);

      setDropdownStyle({
        top: shouldOpenAbove
          ? rect.top + window.scrollY - offset - (maxHeight ?? 0)
          : rect.bottom + window.scrollY + offset,
        left,
        minWidth: computedMinWidth,
        maxHeight,
      });
    }

    setOpen(true);
  }, [usePortalPosition, minWidth, offset, preferredMenuHeight]);

  const toggleOpen = useCallback((): void => {
    if (open) {
      closeMenu();
      return;
    }

    openMenu();
  }, [closeMenu, open, openMenu]);

  useEffect(() => {
    if (!open) return;

    const handleOutsideClick = (event: MouseEvent): void => {
      const target = event.target as Node;
      const insideContainer = containerRef.current?.contains(target);
      const insideDropdown = dropdownRef.current?.contains(target);
      if (!insideContainer && !insideDropdown) closeMenu();
    };

    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape, true);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape, true);
    };
  }, [open, closeMenu]);

  return {
    open,
    containerRef,
    triggerRef,
    dropdownRef,
    dropdownStyle,
    openMenu,
    toggleOpen,
    closeMenu,
  };
}
