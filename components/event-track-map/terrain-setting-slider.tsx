interface TerrainSettingSliderProps {
  id: string;
  label: string;
  displayValue: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}

export function TerrainSettingSlider({
  id,
  label,
  displayValue,
  min,
  max,
  step,
  value,
  onChange,
}: TerrainSettingSliderProps) {
  return (
    <label className="mt-3 block">
      <span className="flex items-center justify-between text-xs font-medium">
        <span>{label}</span>
        <output htmlFor={id}>{displayValue}</output>
      </span>
      <input
        id={id}
        className="event-track-map-range mt-2 w-full"
        data-testid={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
