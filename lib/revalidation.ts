import { revalidatePath } from 'next/cache';
import { locales } from '@/i18n';
import { generateRaceSlug } from '@/lib/race-utils';

export function revalidateHomepages() {
  for (const locale of locales) {
    revalidatePath(`/${locale}`, 'page');
  }
}

export function revalidateRacePages(raceName: string) {
  const slug = generateRaceSlug(raceName);
  for (const locale of locales) {
    revalidatePath(`/${locale}/carrera/${slug}`, 'page');
  }
}
