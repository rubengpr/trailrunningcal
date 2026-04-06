'use client';

import { useTranslations } from 'next-intl';

export type DesktopLayout = 'list' | 'both' | 'map';

interface LayoutToggleProps {
  value: DesktopLayout;
  onChange: (layout: DesktopLayout) => void;
}

function ListIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="2.5" width="14" height="2" rx="1" />
      <rect x="1" y="7" width="14" height="2" rx="1" />
      <rect x="1" y="11.5" width="14" height="2" rx="1" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z" />
      <path d="M15 5.764v15" />
      <path d="M9 3.236v15" />
    </svg>
  );
}

export function LayoutToggle({ value, onChange }: LayoutToggleProps) {
  const t = useTranslations('layoutToggle');

  const listActive = value !== 'map';
  const mapActive = value !== 'list';

  const handleListClick = () => {
    if (!mapActive) return;
    onChange(listActive ? 'map' : 'both');
  };

  const handleMapClick = () => {
    if (!listActive) return;
    onChange(mapActive ? 'list' : 'both');
  };

  return (
    <div className="flex items-center overflow-hidden rounded-full border border-gray-200 bg-white">
      <button
        type="button"
        title={t('list')}
        onClick={handleListClick}
        className={`cursor-pointer px-3 py-1.5 transition-colors ${
          listActive ? 'bg-gray-900 text-white' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'
        }`}
      >
        <ListIcon />
      </button>
      <button
        type="button"
        title={t('map')}
        onClick={handleMapClick}
        className={`cursor-pointer px-3 py-1.5 transition-colors ${
          mapActive ? 'bg-gray-900 text-white' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'
        }`}
      >
        <MapIcon />
      </button>
    </div>
  );
}
