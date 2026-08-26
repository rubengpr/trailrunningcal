import { createStaticClient } from '@/lib/supabase/server';
import type { SitemapEvent } from '@/types/event.types';

const SITEMAP_EVENTS_PAGE_SIZE = 1000;

interface SitemapEventRow {
  slug: string;
  updated_at: string | null;
}

interface SitemapProvinceRow {
  province: string | null;
}

export async function getSitemapEvents(): Promise<SitemapEvent[]> {
  const supabase = createStaticClient();
  const events: SitemapEvent[] = [];

  for (let offset = 0; ; offset += SITEMAP_EVENTS_PAGE_SIZE) {
    const { data, error } = await supabase
      .from('events')
      .select('slug, updated_at')
      .order('slug', { ascending: true })
      .range(offset, offset + SITEMAP_EVENTS_PAGE_SIZE - 1);

    if (error) {
      console.error('Failed to fetch sitemap events:', error);
      throw new Error('Failed to fetch sitemap events');
    }

    const rows = (data ?? []) as SitemapEventRow[];
    events.push(...rows.map((row) => ({
      slug: row.slug,
      updatedAt: row.updated_at,
    })));

    if (rows.length < SITEMAP_EVENTS_PAGE_SIZE) {
      return events;
    }
  }
}

/** Provinces with at least one upcoming race, so the sitemap skips empty destination pages. */
export async function getSitemapProvinces(): Promise<string[]> {
  const supabase = createStaticClient();
  const referenceDate = new Date().toISOString().slice(0, 10);
  const provinces = new Set<string>();

  for (let offset = 0; ; offset += SITEMAP_EVENTS_PAGE_SIZE) {
    const { data, error } = await supabase
      .from('races')
      .select('province')
      .gt('date', referenceDate)
      .order('province', { ascending: true })
      .range(offset, offset + SITEMAP_EVENTS_PAGE_SIZE - 1);

    if (error) {
      console.error('Failed to fetch sitemap provinces:', error);
      throw new Error('Failed to fetch sitemap provinces');
    }

    const rows = (data ?? []) as SitemapProvinceRow[];
    for (const row of rows) {
      if (row.province) provinces.add(row.province);
    }

    if (rows.length < SITEMAP_EVENTS_PAGE_SIZE) {
      return [...provinces];
    }
  }
}
