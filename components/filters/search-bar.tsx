'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { track } from '@/lib/analytics/track';

interface SearchBarProps {
  initialSearchTerm?: string;
  onSearchChange: (term: string) => void;
  placeholder?: string;
}

export default function SearchBar({
  initialSearchTerm = '',
  onSearchChange,
  placeholder,
}: SearchBarProps) {
  const t = useTranslations('search');
  const [searchTerm, setSearchTerm] = useState<string>(initialSearchTerm);

  // Sync internal state with prop changes (if parent needs to reset it)
  useEffect(() => {
    setSearchTerm(initialSearchTerm);
  }, [initialSearchTerm]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    setSearchTerm(newValue);
    onSearchChange(newValue);
    track(ANALYTICS_EVENTS.SEARCH_INPUT_CHANGED, { search_term_length: newValue.length });
  };

  const handleClear = () => {
    track(ANALYTICS_EVENTS.SEARCH_CLEARED, { cleared_term_length: searchTerm.length });
    setSearchTerm('');
    onSearchChange('');
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
          <svg
            className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          placeholder={placeholder || t('placeholder')}
          className="block w-full pl-10 sm:pl-12 pr-10 sm:pr-12 py-2.5 sm:py-2 bg-white border-2 border-gray-300 rounded-xl text-sm sm:text-base placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500 transition-colors"
        />
        {searchTerm && (
          <button
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 sm:pr-4 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 rounded-md transition-colors cursor-pointer"
          >
            <svg
              className="h-5 w-5 sm:h-6 sm:w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
