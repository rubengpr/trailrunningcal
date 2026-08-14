'use client';

import { useEffect } from 'react';
import { LayoutToggle } from '@/components/ui/layout-toggle';
import type {
  DesktopLayout,
  LayoutToggleButton,
  LayoutToggleVariant,
} from '@/components/ui/layout-toggle';
import { useFeatureFlagVariant } from '@/hooks/use-feature-flag-variant';

const LAYOUT_TOGGLE_FLAG_KEY = 'layout-toggle-labels';

interface DesktopLayoutToggleProps {
  value: DesktopLayout;
  onChange: (
    layout: DesktopLayout,
    button: LayoutToggleButton,
    variant: LayoutToggleVariant,
  ) => void;
  onVariantResolved: (variant: LayoutToggleVariant) => void;
}

function getVariant(flagVariant: string | boolean | undefined): LayoutToggleVariant {
  return flagVariant === 'icon_text' ? 'icon_text' : 'control';
}

export function DesktopLayoutToggle({
  value,
  onChange,
  onVariantResolved,
}: DesktopLayoutToggleProps) {
  const flagVariant = useFeatureFlagVariant(LAYOUT_TOGGLE_FLAG_KEY);
  const variant = getVariant(flagVariant);

  useEffect(() => {
    if (typeof flagVariant !== 'string') return;
    onVariantResolved(variant);
  }, [flagVariant, onVariantResolved, variant]);

  return (
    <LayoutToggle
      value={value}
      variant={variant}
      onChange={(layout, button) => onChange(layout, button, variant)}
    />
  );
}
