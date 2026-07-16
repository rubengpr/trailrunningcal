// @vitest-environment jsdom

import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  RaceTierFields,
  toRaceTierDrafts,
  toRaceTierWriteInputs,
  validateRaceTierDrafts,
} from './race-tier-fields';
import { MAX_RACE_TIERS } from '@/lib/events/constants';
import type { RaceTierDraft } from './race-tier-fields';
import ca from '@/locales/ca/translation.json';
import es from '@/locales/es/translation.json';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

afterEach(cleanup);

function Harness({ initial = [] }: { initial?: RaceTierDraft[] }) {
  const [tiers, setTiers] = useState(initial);
  return (
    <RaceTierFields
      idPrefix="race-1"
      tiers={tiers}
      onChange={setTiers}
    />
  );
}

describe('RaceTierFields', () => {
  it('shows an empty state and adds and removes controlled rows', () => {
    render(<Harness />);

    expect(screen.getByText('empty')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'add' }));
    expect(screen.getAllByLabelText('price')).toHaveLength(1);

    fireEvent.change(screen.getByLabelText('price'), {
      target: { value: '0' },
    });
    expect(screen.getByLabelText('price')).toHaveProperty('value', '0');

    fireEvent.click(screen.getByRole('button', { name: 'add' }));
    expect(screen.getAllByLabelText('price')).toHaveLength(2);
    fireEvent.click(screen.getAllByTitle('remove')[0]);
    expect(screen.getAllByLabelText('price')).toHaveLength(1);
  });

  it('hydrates existing tiers and converts them back to write inputs', () => {
    const drafts = toRaceTierDrafts([
      {
        id: 'tier-1',
        priceEur: 35,
        startsAt: '2026-09-01',
        endsAt: '2026-12-31',
      },
      {
        id: 'tier-2',
        priceEur: 40,
        startsAt: null,
        endsAt: null,
      },
    ]);

    render(<Harness initial={drafts} />);

    expect(screen.getAllByLabelText('price')).toHaveLength(2);
    expect(toRaceTierWriteInputs(drafts)).toEqual([
      {
        priceEur: 35,
        startsAt: '2026-09-01',
        endsAt: '2026-12-31',
      },
      { priceEur: 40, startsAt: null, endsAt: null },
    ]);
  });

  it('disables adding at five tiers and re-enables it after removal', () => {
    const initial = Array.from({ length: MAX_RACE_TIERS }, (_, index) => ({
      id: `tier-${index}`,
      priceEur: String(30 + index),
      startsAt: '',
      endsAt: '',
    }));

    render(<Harness initial={initial} />);

    const addButton = screen.getByRole('button', { name: 'add' });
    expect(addButton).toHaveProperty('disabled', true);
    fireEvent.click(addButton);
    expect(screen.getAllByLabelText('price')).toHaveLength(MAX_RACE_TIERS);

    fireEvent.click(screen.getAllByTitle('remove')[0]);
    expect(addButton).toHaveProperty('disabled', false);
    fireEvent.click(addButton);
    expect(screen.getAllByLabelText('price')).toHaveLength(MAX_RACE_TIERS);
  });
});

describe('race tier limit translations', () => {
  it('defines the limit error in Spanish and Catalan', () => {
    expect(es.adminEvents.form.errors.tierLimit).toContain('5');
    expect(ca.adminEvents.form.errors.tierLimit).toContain('5');
  });
});

describe('validateRaceTierDrafts', () => {
  it('accepts zero, multiple tiers, and optional date pairs', () => {
    expect(validateRaceTierDrafts([
      { priceEur: '0', startsAt: '', endsAt: '' },
      {
        priceEur: '35',
        startsAt: '2026-09-01',
        endsAt: '2026-12-31',
      },
    ])).toBeNull();
  });

  it('rejects more than five tiers', () => {
    const tiers = Array.from({ length: MAX_RACE_TIERS + 1 }, () => ({
      priceEur: '35',
      startsAt: '',
      endsAt: '',
    }));

    expect(validateRaceTierDrafts(tiers)).toBe('tierLimit');
  });

  it.each([
    [{ priceEur: '', startsAt: '', endsAt: '' }, 'tierPrice'],
    [{ priceEur: '10.5', startsAt: '', endsAt: '' }, 'tierPrice'],
    [{ priceEur: '10000', startsAt: '', endsAt: '' }, 'tierPrice'],
    [{ priceEur: '20', startsAt: '2026-09-01', endsAt: '' }, 'tierDates'],
    [{ priceEur: '20', startsAt: '2026-02-30', endsAt: '2026-03-01' }, 'tierDates'],
    [{ priceEur: '20', startsAt: '2026-12-31', endsAt: '2026-09-01' }, 'tierDateOrder'],
  ])('returns the expected validation error %#', (tier, error) => {
    expect(validateRaceTierDrafts([tier])).toBe(error);
  });
});
