import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { locales } from '@/i18n';
import {
  revalidateCategoryPages,
  revalidateDestinationPages,
  revalidateEventPages,
  revalidateProvincePage,
} from './revalidation';
import { DESTINATION_PROVINCE_IDS, REGION_IDS } from '@/lib/geography/destinations';
import { RACE_CATEGORY_SLUGS } from '@/lib/races/race-types';

const { revalidatePath, revalidateTag } = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock('next/cache', () => ({ revalidatePath, revalidateTag }));

const consoleInfo = vi.spyOn(console, 'info').mockImplementation(() => {});

afterAll(() => consoleInfo.mockRestore());

describe('revalidateProvincePage', () => {
  beforeEach(() => {
    revalidatePath.mockReset();
    revalidateTag.mockReset();
  });

  it('revalidates every localized destination page for a newly supported province', () => {
    revalidateProvincePage('Granada', 'test');

    // Every locale of the province page, plus its community page.
    expect(revalidatePath).toHaveBeenCalledTimes(locales.length * 2);
    expect(revalidatePath).toHaveBeenCalledWith('/es/d/andalucia/granada');
    expect(revalidatePath).toHaveBeenCalledWith('/ca/d/andalucia/granada');
    expect(revalidatePath).toHaveBeenCalledWith('/en/d/andalucia/granada');
    expect(revalidatePath).toHaveBeenCalledWith('/fr/d/andalucia/granada');
    expect(revalidatePath).toHaveBeenCalledWith('/es/d/andalucia');
    expect(revalidatePath).toHaveBeenCalledWith('/fr/d/andalucia');
    expect(consoleInfo).toHaveBeenCalledWith(expect.stringContaining(
      '"affectedPathCount":4',
    ));
  });
});

describe('revalidateEventPages', () => {
  beforeEach(() => {
    revalidatePath.mockReset();
  });

  it('revalidates every localized public event page', () => {
    revalidateEventPages('vertical-la-bandera', 'test');

    expect(revalidatePath).toHaveBeenCalledTimes(locales.length);
    expect(revalidatePath).toHaveBeenCalledWith('/es/e/vertical-la-bandera');
    expect(revalidatePath).toHaveBeenCalledWith('/ca/e/vertical-la-bandera');
    expect(revalidatePath).toHaveBeenCalledWith('/en/e/vertical-la-bandera');
    expect(revalidatePath).toHaveBeenCalledWith('/fr/e/vertical-la-bandera');
    expect(consoleInfo).toHaveBeenLastCalledWith(expect.stringContaining(
      '"source":"test"',
    ));
  });

  it('records one aggregate count for an event batch', () => {
    revalidateEventPages(['event-one', 'event-two'], 'translation-promotion');

    expect(revalidatePath).toHaveBeenCalledTimes(locales.length * 2);
    expect(consoleInfo).toHaveBeenLastCalledWith(expect.stringContaining(
      `"affectedPathCount":${locales.length * 2}`,
    ));
  });
});

describe('public listing page revalidation', () => {
  beforeEach(() => {
    revalidatePath.mockReset();
  });

  it('revalidates every localized event-type page', () => {
    revalidateCategoryPages('test');

    expect(revalidatePath).toHaveBeenCalledTimes(
      locales.length * RACE_CATEGORY_SLUGS.length,
    );
    expect(revalidatePath).toHaveBeenCalledWith('/es/t/ultra-trail');
    expect(revalidatePath).toHaveBeenCalledWith('/fr/t/backyard');
  });

  it('revalidates every localized region and destination page', () => {
    revalidateDestinationPages('test');

    expect(revalidatePath).toHaveBeenCalledTimes(
      locales.length * (REGION_IDS.length + DESTINATION_PROVINCE_IDS.length),
    );
    expect(revalidatePath).toHaveBeenCalledWith('/es/d/cataluna');
    expect(revalidatePath).toHaveBeenCalledWith('/fr/d/cataluna/barcelona');
  });
});
