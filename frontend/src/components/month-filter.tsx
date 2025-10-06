interface MonthFilterProps {
  selectedMonth?: string;
  onMonthSelect?: (month: string) => void;
}

const months = [
  { key: 'ene', label: 'Ene' },
  { key: 'feb', label: 'Feb' },
  { key: 'mar', label: 'Mar' },
  { key: 'abr', label: 'Abr' },
  { key: 'may', label: 'May' },
  { key: 'jun', label: 'Jun' },
  { key: 'jul', label: 'Jul' },
  { key: 'ago', label: 'Ago' },
  { key: 'sep', label: 'Sep' },
  { key: 'oct', label: 'Oct' },
  { key: 'nov', label: 'Nov' },
  { key: 'dic', label: 'Dic' },
];

export default function MonthFilter({
  selectedMonth = '',
  onMonthSelect,
}: MonthFilterProps) {
  const handleMonthClick = (monthKey: string) => {
    const newSelectedMonth = selectedMonth === monthKey ? '' : monthKey;
    onMonthSelect?.(newSelectedMonth);
  };

  return (
    <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-center">
      {months.map((month) => (
        <button
          key={month.key}
          onClick={() => handleMonthClick(month.key)}
          className={`
            px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200
            border-2 border-gray-200 hover:border-indigo-300 hover:cursor-pointer
            ${
              selectedMonth === month.key
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                : 'bg-white text-gray-700 hover:bg-indigo-50 hover:text-indigo-700'
            }
          `}
        >
          {month.label}
        </button>
      ))}
    </div>
  );
}
