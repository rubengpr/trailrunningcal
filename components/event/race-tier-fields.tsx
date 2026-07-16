'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { NumberInput } from '@/components/ui/number-input';
import { MAX_RACE_TIERS } from '@/lib/events/constants';
import {
  validateRaceTierSchedule,
  type RaceTierScheduleValidationError,
} from '@/lib/events/tier-validation';
import type {
  EventRaceTier,
  EventRaceTierWriteInput,
} from '@/types/event.types';

export interface RaceTierDraft {
  id?: string;
  priceEur: string;
  endsAt: string;
}

export type RaceTierValidationError = RaceTierScheduleValidationError;

interface RaceTierFieldsProps {
  idPrefix: string;
  tiers: RaceTierDraft[];
  disabled?: boolean;
  onChange: (tiers: RaceTierDraft[]) => void;
}

const inputClass =
  'h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:cursor-not-allowed disabled:opacity-50';
export function emptyRaceTierDraft(): RaceTierDraft {
  return {
    priceEur: '',
    endsAt: '',
  };
}

export function toRaceTierDrafts(tiers: EventRaceTier[]): RaceTierDraft[] {
  return [...tiers]
    .sort((a, b) =>
      (a.endsAt ?? '9999-12-31').localeCompare(b.endsAt ?? '9999-12-31'),
    )
    .map((tier) => ({
      id: tier.id,
      priceEur: String(tier.priceEur),
      endsAt: tier.endsAt ?? '',
    }));
}

export function validateRaceTierDrafts(
  tiers: RaceTierDraft[],
): RaceTierValidationError | null {
  return validateRaceTierSchedule(
    tiers.map((tier) => ({
      priceEur: /^\d+$/.test(tier.priceEur)
        ? Number(tier.priceEur)
        : Number.NaN,
      endsAt: tier.endsAt || null,
    })),
  );
}

export function toRaceTierWriteInputs(
  tiers: RaceTierDraft[],
): EventRaceTierWriteInput[] {
  return tiers.map((tier) => ({
    priceEur: Number(tier.priceEur),
    endsAt: tier.endsAt || null,
  }));
}

export function RaceTierFields({
  idPrefix,
  tiers,
  disabled = false,
  onChange,
}: RaceTierFieldsProps): React.ReactElement {
  const t = useTranslations('adminEvents.form.tiers');

  const updateTier = (
    index: number,
    field: keyof Pick<RaceTierDraft, 'priceEur' | 'endsAt'>,
    value: string,
  ): void => {
    onChange(
      tiers.map((tier, tierIndex) =>
        tierIndex === index ? { ...tier, [field]: value } : tier,
      ),
    );
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-gray-100 bg-gray-50/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-medium text-gray-900">{t('title')}</h4>
          <p className="mt-1 text-xs text-gray-500">
            {t('description', { count: MAX_RACE_TIERS })}
          </p>
        </div>
        <button
          type="button"
          disabled={disabled || tiers.length >= MAX_RACE_TIERS}
          onClick={() => {
            if (tiers.length < MAX_RACE_TIERS) {
              onChange([...tiers, emptyRaceTierDraft()]);
            }
          }}
          className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-50"
        >
          <Plus className="size-4" strokeWidth={2} />
          {t('add')}
        </button>
      </div>

      {tiers.length === 0 ? (
        <p className="rounded-md border border-dashed border-gray-200 bg-white px-3 py-4 text-center text-sm text-gray-500">
          {t('empty')}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {tiers.map((tier, index) => (
            <div
              key={tier.id ?? `new-tier-${index}`}
              className="grid gap-3 rounded-md border border-gray-200 bg-white p-3 sm:grid-cols-[minmax(7rem,0.75fr)_minmax(9rem,1fr)_2.5rem] sm:items-end"
            >
              <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
                {t('price')}
                <NumberInput
                  id={`${idPrefix}-tier-price-${index}`}
                  min="0"
                  max="9999"
                  step="1"
                  inputMode="numeric"
                  className={inputClass}
                  value={tier.priceEur}
                  disabled={disabled}
                  onChange={(event) =>
                    updateTier(index, 'priceEur', event.target.value)
                  }
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
                {t('endsAt')}
                <input
                  id={`${idPrefix}-tier-end-${index}`}
                  type="date"
                  className={inputClass}
                  value={tier.endsAt}
                  disabled={disabled}
                  onChange={(event) =>
                    updateTier(index, 'endsAt', event.target.value)
                  }
                />
              </label>
              <button
                type="button"
                title={t('remove')}
                disabled={disabled}
                onClick={() =>
                  onChange(tiers.filter((_, tierIndex) => tierIndex !== index))
                }
                className="inline-flex size-10 cursor-pointer items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:pointer-events-none disabled:opacity-50"
              >
                <Trash2 className="size-4" strokeWidth={1.5} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
