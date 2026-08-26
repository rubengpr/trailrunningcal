import { beforeEach, describe, expect, it, vi } from 'vitest';
import { locales } from '@/i18n';
import { revalidateProvincePage } from './revalidation';

const { revalidatePath } = vi.hoisted(() => ({ revalidatePath: vi.fn() }));

vi.mock('next/cache', () => ({ revalidatePath }));

describe('revalidateProvincePage', () => {
  beforeEach(() => {
    revalidatePath.mockReset();
  });

  it('revalidates every localized destination page for a newly supported province', () => {
    revalidateProvincePage('Granada');

    expect(revalidatePath).toHaveBeenCalledTimes(locales.length);
    expect(revalidatePath).toHaveBeenCalledWith('/es/d/andalucia/granada');
    expect(revalidatePath).toHaveBeenCalledWith('/ca/d/andalucia/granada');
    expect(revalidatePath).toHaveBeenCalledWith('/en/d/andalucia/granada');
    expect(revalidatePath).toHaveBeenCalledWith('/fr/d/andalucia/granada');
  });
});
