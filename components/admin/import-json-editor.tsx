'use client';

import { Button } from '@/components/ui/button';

interface ImportJsonEditorProps {
  value: string;
  error: string | null;
  applyLabel: string;
  cancelLabel: string;
  onChange: (value: string) => void;
  onApply: () => void;
  onCancel: () => void;
}

export function ImportJsonEditor({
  value,
  error,
  applyLabel,
  cancelLabel,
  onChange,
  onApply,
  onCancel,
}: ImportJsonEditorProps): React.ReactElement {
  return (
    <div className="flex max-w-3xl flex-col gap-3">
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full resize-y rounded-xl border border-gray-200 bg-white p-4 font-mono text-xs text-gray-800 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-200/80"
        rows={30}
        spellCheck={false}
      />
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      <div className="flex gap-2">
        <Button type="button" onClick={onApply}>{applyLabel}</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>{cancelLabel}</Button>
      </div>
    </div>
  );
}
