'use client';
import { useTranslations } from 'next-intl';
import { CircleCheck } from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';
import { measureLength, type LengthField } from '@/lib/blog/length-targets';

export function BlogLengthIndicator({ field, value }: { field: LengthField; value: string }) {
  const t = useTranslations('admin.blog.length');
  const measures = measureLength(field, value);
  const failing = measures.filter(measure => !measure.inRange);
  const shown = failing.length ? failing : measures;
  const outside = failing.some(measure => measure.status === 'outside');
  const text = shown.map(measure => t(measure.status, {
    count: measure.count, min: measure.min, max: measure.max, unit: t(measure.unit, { count: measure.count }),
  })).join(' · ');
  return (
    <Tooltip text={text} size="sm" className="align-middle">
      {failing.length ? (
        <span className={`inline-flex items-center rounded-full px-1.5 text-[11px] font-medium tabular-nums ${outside ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>
          {(failing.find(measure => measure.status === 'outside') ?? failing[0]).count}
        </span>
      ) : (
        <CircleCheck aria-hidden="true" strokeWidth={2} className="size-3.5 text-green-600" />
      )}
    </Tooltip>
  );
}
