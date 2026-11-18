import { ChevronDown } from 'lucide-react';

interface DashboardSelectProps<Value extends string> {
  label: string;
  value: Value;
  options: { value: Value; label: string }[];
  onChange: (value: Value) => void;
}

export function DashboardSelect<Value extends string>({
  label,
  value,
  options,
  onChange,
}: DashboardSelectProps<Value>) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <select
        className="cursor-pointer appearance-none rounded-lg border border-stone-200 bg-white py-1.5 pl-2.5 pr-8 text-xs font-medium text-stone-700 shadow-sm outline-none transition-colors hover:border-stone-300 focus:border-stone-400"
        value={value}
        onChange={(event) => onChange(event.target.value as Value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-stone-500" />
    </label>
  );
}
