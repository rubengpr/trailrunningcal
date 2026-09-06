import { beforeEach, describe, expect, it, vi } from 'vitest';
import { locales } from '@/i18n';
import { revalidateEventPages, revalidateProvincePage } from './revalidation';

const { revalidatePath, revalidateTag } = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock('next/cache', () => ({ revalidatePath, revalidateTag }));

describe('revalidateProvincePage', () => {
  beforeEach(() => {
    revalidatePath.mockReset();
    revalidateTag.mockReset();
  });

  it('revalidates every localized destination page for a newly supported province', () => {
    revalidateProvincePage('Granada');

    // Every locale of the province page, plus its community page.
    expect(revalidatePath).toHaveBeenCalledTimes(locales.length * 2);
    expect(revalidatePath).toHaveBeenCalledWith('/es/d/andalucia/granada');
    expect(revalidatePath).toHaveBeenCalledWith('/ca/d/andalucia/granada');
    expect(revalidatePath).toHaveBeenCalledWith('/en/d/andalucia/granada');
    expect(revalidatePath).toHaveBeenCalledWith('/fr/d/andalucia/granada');
    expect(revalidatePath).toHaveBeenCalledWith('/es/d/andalucia');
    expect(revalidatePath).toHaveBeenCalledWith('/fr/d/andalucia');
  });
});

describe('revalidateEventPages', () => {
  beforeEach(() => {
    revalidatePath.mockReset();
  });

  it('revalidates every localized public event page', () => {
    revalidateEventPages('vertical-la-bandera');

    expect(revalidatePath).toHaveBeenCalledTimes(locales.length);
    expect(revalidatePath).toHaveBeenCalledWith('/es/e/vertical-la-bandera');
    expect(revalidatePath).toHaveBeenCalledWith('/ca/e/vertical-la-bandera');
    expect(revalidatePath).toHaveBeenCalledWith('/en/e/vertical-la-bandera');
    expect(revalidatePath).toHaveBeenCalledWith('/fr/e/vertical-la-bandera');
  });
});
