'use client';

import { MULTI_SELECT_MENU_MAX_HEIGHT } from '@/components/ui/multi-select-options-menu';
import { useMultiSelectMenu } from '@/hooks/use-multi-select-menu';

export function useFilterOptionsMenu(onClose?: () => void) {
  return useMultiSelectMenu({
    usePortalPosition: true,
    preferredMenuHeight: MULTI_SELECT_MENU_MAX_HEIGHT,
    placement: 'bottom',
    consumeOutsideTouch: true,
    onClose,
  });
}
