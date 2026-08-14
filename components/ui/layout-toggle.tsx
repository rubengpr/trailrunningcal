'use client';

import { useTranslations } from 'next-intl';
import { Map } from 'lucide-react';

export type DesktopLayout = 'list' | 'both' | 'map';

export type LayoutToggleButton = 'list' | 'map';
export type LayoutToggleVariant = 'control' | 'icon_text';

interface LayoutToggleProps {
  value: DesktopLayout;
  onChange: (layout: DesktopLayout, button: LayoutToggleButton) => void;
  variant?: LayoutToggleVariant;
}

function ListIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="2.75" width="14" height="1.5" rx="0.75" />
      <rect x="1" y="7.25" width="14" height="1.5" rx="0.75" />
      <rect x="1" y="11.75" width="14" height="1.5" rx="0.75" />
    </svg>
  );
}

function MapIcon() {
  return <Map width={20} height={20} strokeWidth={2} />;
}

export function LayoutToggle({
  value,
  onChange,
  variant = 'control',
}: LayoutToggleProps) {
  const t = useTranslations('layoutToggle');

  const listActive = value !== 'map';
  const mapActive = value !== 'list';

  const handleListClick = () => {
    if (!mapActive) return;
    onChange(listActive ? 'map' : 'both', 'list');
  };

  const handleMapClick = () => {
    if (!listActive) return;
    onChange(mapActive ? 'list' : 'both', 'map');
  };

  return (
    <div className="flex items-center overflow-hidden rounded-full border border-gray-200 bg-white">
      <button
        type="button"
        title={t('list')}
        onClick={handleListClick}
        className={`flex cursor-pointer items-center px-3 py-1.5 transition-colors ${
          listActive ? 'bg-gray-900 text-white' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'
        }`}
      >
        <ListIcon />
        {variant === 'icon_text' && (
          <span className="ml-1.5 text-sm font-medium">{t('shortList')}</span>
        )}
      </button>
      <button
        type="button"
        title={t('map')}
        onClick={handleMapClick}
        className={`flex cursor-pointer items-center px-3 py-1.5 transition-colors ${
          mapActive ? 'bg-gray-900 text-white' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'
        }`}
      >
        <MapIcon />
        {variant === 'icon_text' && (
          <span className="ml-1.5 text-sm font-medium">{t('shortMap')}</span>
        )}
      </button>
    </div>
  );
}
