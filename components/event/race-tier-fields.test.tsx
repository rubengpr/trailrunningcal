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
        id: 'tier-2',
        priceEur: 40,
        endsAt: '2027-03-31',
      },
      {
        id: 'tier-1',
        priceEur: 35,
        endsAt: '2026-12-31',
      },
    ]);

    render(<Harness initial={drafts} />);

    expect(screen.getAllByLabelText('price')).toHaveLength(2);
    expect(screen.queryByLabelText('startsAt')).toBeNull();
    expect(screen.getAllByLabelText('endsAt')[0]).toHaveProperty(
      'value',
      '2026-12-31',
    );
    expect(toRaceTierWriteInputs(drafts)).toEqual([
      {
        priceEur: 35,
        endsAt: '2026-12-31',
      },
      { priceEur: 40, endsAt: '2027-03-31' },
    ]);
    expect(toRaceTierWriteInputs([
      { priceEur: '0', endsAt: '' },
    ])).toEqual([{ priceEur: 0, endsAt: null }]);
  });

  it('disables adding at five tiers and re-enables it after removal', () => {
    const initial = Array.from({ length: MAX_RACE_TIERS }, (_, index) => ({
      id: `tier-${index}`,
      priceEur: String(30 + index),
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

  it('preserves the remaining deadline when a tier is removed', () => {
    render(<Harness initial={[
      { id: 'tier-1', priceEur: '35', endsAt: '2027-01-31' },
      { id: 'tier-2', priceEur: '40', endsAt: '2027-02-28' },
    ]} />);

    fireEvent.click(screen.getAllByTitle('remove')[0]);

    expect(screen.getByLabelText('endsAt')).toHaveProperty(
      'value',
      '2027-02-28',
    );
  });
});

describe('race tier translations', () => {
  it('defines the helper and deadline errors in Spanish and Catalan', () => {
    expect(es.adminEvents.form.tiers.description).toContain('inclusivas');
    expect(ca.adminEvents.form.tiers.description).toContain('inclusives');
    expect(es.adminEvents.form.errors.tierLimit).toContain('5');
    expect(ca.adminEvents.form.errors.tierLimit).toContain('5');
    expect(es.adminEvents.form.errors.tierDeadlineRequired).toContain(
      'fecha límite',
    );
    expect(ca.adminEvents.form.errors.tierDeadlineRequired).toContain(
      'data límit',
    );
    expect(es.adminEvents.form.errors.tierDeadline).toContain('válida');
    expect(ca.adminEvents.form.errors.tierDeadline).toContain('vàlida');
    expect(es.adminEvents.form.errors.tierDeadlineOrder).toContain('únicas');
    expect(ca.adminEvents.form.errors.tierDeadlineOrder).toContain('úniques');
  });
});

describe('validateRaceTierDrafts', () => {
  it('accepts zero, single tiers, and ordered deadline tiers', () => {
    expect(validateRaceTierDrafts([])).toBeNull();
    expect(validateRaceTierDrafts([{ priceEur: '0', endsAt: '' }])).toBeNull();
    expect(validateRaceTierDrafts([
      { priceEur: '35', endsAt: '2026-12-31' },
      {
        priceEur: '40',
        endsAt: '2027-03-31',
      },
    ])).toBeNull();
  });

  it('accepts five ascending deadline tiers', () => {
    const tiers = Array.from({ length: MAX_RACE_TIERS }, (_, index) => ({
      priceEur: String(30 + index),
      endsAt: `2027-0${index + 1}-28`,
    }));

    expect(validateRaceTierDrafts(tiers)).toBeNull();
  });

  it('rejects more than five tiers', () => {
    const tiers = Array.from({ length: MAX_RACE_TIERS + 1 }, () => ({
      priceEur: '35',
      endsAt: '',
    }));

    expect(validateRaceTierDrafts(tiers)).toBe('tierLimit');
  });

  it.each([
    [[{ priceEur: '', endsAt: '' }], 'tierPrice'],
    [[{ priceEur: '10.5', endsAt: '' }], 'tierPrice'],
    [[{ priceEur: '10000', endsAt: '' }], 'tierPrice'],
    [[{ priceEur: '20', endsAt: '2026-02-30' }], 'tierDeadline'],
    [[
      { priceEur: '20', endsAt: '2026-12-31' },
      { priceEur: '25', endsAt: '' },
    ], 'tierDeadlineRequired'],
    [[
      { priceEur: '20', endsAt: '2026-12-31' },
      { priceEur: '25', endsAt: '2026-12-31' },
    ], 'tierDeadlineOrder'],
    [[
      { priceEur: '20', endsAt: '2027-03-31' },
      { priceEur: '25', endsAt: '2026-12-31' },
    ], 'tierDeadlineOrder'],
  ])('returns the expected validation error %#', (tiers, error) => {
    expect(validateRaceTierDrafts(tiers)).toBe(error);
  });
});
