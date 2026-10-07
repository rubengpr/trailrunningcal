'use client';

import { useId, useState } from 'react';
import type { CSSProperties, RefObject } from 'react';
import { useTranslations } from 'next-intl';
import { Search } from 'lucide-react';
import { FormInput } from '@/components/ui/form-input';
import { MultiSelectOption } from '@/components/ui/multi-select-option';

export const MULTI_SELECT_MENU_MAX_HEIGHT = 448;

export interface MultiSelectOptionItem {
  value: string;
  label: string;
  group?: string;
}

interface MultiSelectOptionsMenuProps {
  options: MultiSelectOptionItem[];
  selectedValues: string[];
  searchable?: boolean;
  onToggleOption: (value: string) => void;
  dropdownRef?: RefObject<HTMLDivElement | null>;
  style?: CSSProperties;
}

export function MultiSelectOptionsMenu({
  options,
  selectedValues,
  searchable = false,
  onToggleOption,
  dropdownRef,
  style,
}: MultiSelectOptionsMenuProps) {
  const t = useTranslations('filters');
  const searchId = useId();
  const [query, setQuery] = useState('');
  const normalize = (text: string) =>
    text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const normalizedQuery = normalize(query.trim());
  const filteredOptions = searchable ? options.filter((option) =>
    normalize(option.label).includes(normalizedQuery),
  ) : options;

  return (
    <div
      ref={dropdownRef}
      style={style}
      className="z-[9999] flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg animate-filter-select-in"
    >
      {searchable && (
        <div className="relative shrink-0 border-b border-gray-100 p-1.5">
          <Search
            size={14}
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-gray-400"
          />
          <FormInput
            id={searchId}
            aria-label={t('searchOptions')}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('searchOptions')}
            reserveMessageSpace={false}
            autoComplete="off"
            autoFocus
            className="h-8! pl-7! pr-2! py-1! text-xs! focus-visible:ring-1 focus-visible:ring-gray-300"
          />
        </div>
      )}
      <div className="min-h-0 overflow-y-auto p-1">
        {filteredOptions.length === 0 && (
          <p className="px-3 py-2 text-sm text-gray-500">{t('noMatchingOptions')}</p>
        )}

        {filteredOptions.map((option, index) => {
          const selected = selectedValues.includes(option.value);
          const previousGroup = index > 0 ? filteredOptions[index - 1].group : undefined;
          const showGroup = option.group && option.group !== previousGroup;

          return (
            <div key={option.value}>
              {showGroup ? (
                <p className="px-3 pt-3 pb-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {option.group}
                </p>
              ) : null}
              <MultiSelectOption
                label={option.label}
                selected={selected}
                onClick={() => onToggleOption(option.value)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
