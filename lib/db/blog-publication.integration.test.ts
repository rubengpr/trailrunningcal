import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } }) }));
import { requireCompleted, removeImage, saveDetails, saveImage, readImage, cleanImages } from '@/lib/services/blog-publication';
import { getPublication } from './blog-publication';
const integration = process.env.RUN_SUPABASE_INTEGRATION_TESTS === 'true' ? describe : describe.skip;
integration('publication on trailrunningcal-local', () => {
  it('persists metadata, private files, concurrency and cleanup without changing content', async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    if (new URL(url).hostname !== 'wghqldoshvwulyqqbqln.supabase.co') throw new Error('Local only');
    const client = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
    const id = randomUUID();
    const { error } = await client.from('blog_drafts').insert({ id, instructions: 'Temporary publication test', status: 'completed', title: 'Temporary publication article', content_html: '<p>Preserve this content</p>', primary_keyword: 'temporary article', slug: `temporary-${id}`, seo_title: 'Temporary article', meta_description: 'Temporary integration check' });
    if (error) throw error;
    try {
      const initial = await requireCompleted(id); expect(initial.version).toBe(0);
      const details = await saveDetails(id, { author: 'Ruben Godoy', date: '2026-10-28', imageAlt: '', version: 0 });
      expect(details).toMatchObject({ version: 1, date: '2026-10-28' });
      const buffer = await sharp({ create: { width: 8, height: 6, channels: 3, background: 'red' } }).png().toBuffer();
      const file = new File([new Uint8Array(buffer)], 'test.png', { type: 'image/png' });
      const uploaded = await saveImage(id, file, 1);
      expect(uploaded.version).toBe(2);
      expect((await readImage(id)).blob.size).toBe(buffer.length);
      const races = await Promise.allSettled([
        saveDetails(id, { author: 'Author A', date: '2026-10-28', imageAlt: 'Test image', version: 2 }),
        saveDetails(id, { author: 'Author B', date: '2026-10-28', imageAlt: 'Test image', version: 2 }),
      ]);
      expect(races.filter(result => result.status === 'fulfilled')).toHaveLength(1);
      expect(races.filter(result => result.status === 'rejected')).toHaveLength(1);
      const replaced = await saveImage(id, file, 3);
      expect(replaced.imagePath).not.toBe(uploaded.imagePath); expect(replaced.imageAlt).toBeNull();
      expect((await client.storage.from('blog-draft-images').download(uploaded.imagePath!)).error).toBeTruthy();
      const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
      expect((await anon.storage.from('blog-draft-images').download(replaced.imagePath!)).error).toBeTruthy();
      const row = await client.from('blog_drafts').select('content_html').eq('id', id).single();
      expect(row.data?.content_html).toBe('<p>Preserve this content</p>');
      expect((await getPublication(id))?.publication.version).toBe(4);
      const removed = await removeImage(id, 4);
      expect(removed).toMatchObject({ imagePath: null, imageAlt: null, version: 5 });
      expect(removed.author).toMatch(/^Author [AB]$/);
      expect((await client.storage.from('blog-draft-images').download(replaced.imagePath!)).error).toBeTruthy();
    } finally {
      await client.from('blog_drafts').delete().eq('id', id);
      await cleanImages(id);
      expect((await client.storage.from('blog-draft-images').list(id)).data).toEqual([]);
    }
  }, 30000);
});
