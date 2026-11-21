interface ImportListFieldProps {
  id: string;
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  disabled: boolean;
  hint?: string;
  spellCheck?: boolean;
  className?: string;
}

export function ImportListField({
  id,
  label,
  value,
  onValueChange,
  placeholder,
  disabled,
  hint,
  spellCheck,
  className = '',
}: ImportListFieldProps) {
  return (
    <div className={`grid gap-2 ${className}`.trim()}>
      <label htmlFor={id} className="text-sm font-medium leading-none text-gray-900">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="min-h-32 w-full resize-y rounded-xl border border-gray-200 bg-white p-3 text-sm text-gray-800 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-200/80 disabled:cursor-not-allowed disabled:opacity-60"
        spellCheck={spellCheck}
      />
      {hint !== undefined ? <p className="text-xs text-gray-500">{hint}</p> : null}
    </div>
  );
}
