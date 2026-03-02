'use client';

import { useState } from 'react';

interface ProvinceFilterProps {
  onProvinceSelect: (province: string) => void;
}

const PROVINCES = ['Barcelona', 'Girona', 'Lleida', 'Tarragona'];

export default function ProvinceFilter({
  onProvinceSelect,
}: ProvinceFilterProps) {
  const [selectedProvince, setSelectedProvince] = useState<string>('');

  const handleProvinceClick = (provinceName: string) => {
    const newProvince = provinceName === selectedProvince ? '' : provinceName;
    setSelectedProvince(newProvince);
    onProvinceSelect(newProvince);
  };

  return (
    <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-center">
      {PROVINCES.map((province) => (
        <button
          key={province}
          onClick={() => handleProvinceClick(province)}
          className={`px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all duration-200
            border border-gray-300 hover:border-gray-400 cursor-pointer
            focus:outline-none ${
              selectedProvince === province
                ? 'bg-black text-white border-black shadow-md'
                : 'bg-white text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            }`}
        >
          {province}
        </button>
      ))}
    </div>
  );
}
