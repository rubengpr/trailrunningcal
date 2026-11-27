'use client';

import type { ComponentProps } from 'react';
import { createPortal } from 'react-dom';
import { MultiSelectOptionsMenu } from '@/components/ui/multi-select-options-menu';
import type { useFilterOptionsMenu } from '@/hooks/use-filter-options-menu';

interface FilterOptionsMenuProps
  extends Omit<ComponentProps<typeof MultiSelectOptionsMenu>, 'dropdownRef' | 'style'> {
  menu: ReturnType<typeof useFilterOptionsMenu>;
}

export function FilterOptionsMenu({ menu, ...props }: FilterOptionsMenuProps) {
  if (!menu.open || typeof document === 'undefined') return null;

  return createPortal(
    <MultiSelectOptionsMenu
      {...props}
      dropdownRef={menu.dropdownRef}
      style={{ position: 'absolute', ...menu.dropdownStyle, zIndex: 9999 }}
    />,
    document.body,
  );
}
