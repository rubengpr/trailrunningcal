import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } }) }));
import { addImage, editImage, readImage, removeImage, replaceImage, requireDocument } from '@/lib/services/blog-article-images';
import { cleanImages, saveImage as saveCover } from '@/lib/services/blog-publication';
import type { ImageBlock } from '@/types/blog-article-block.types';
const integration = process.env.RUN_SUPABASE_INTEGRATION_TESTS === 'true' ? describe : describe.skip;
integration('inline article images on trailrunningcal-local', () => {
  it('preserves text, cover, evaluation and image order through reload, concurrent edits and deletion', async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    if (new URL(url).hostname !== 'wghqldoshvwulyqqbqln.supabase.co') throw new Error('Local only');
    const client = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
    const id = randomUUID(), html = '<p>Introducción original.</p><h2>Evento</h2><p>Recorrido original.</p>';
    const { error } = await client.from('blog_drafts').insert({ id, instructions: 'Temporary inline image integration test', status: 'completed', title: 'Temporary article image test', content_html: html, primary_keyword: 'temporary images', slug: `test-${id}`, seo_title: 'Temporary title', meta_description: 'Temporary description' });
    if (error) throw error;
    try {
      const buffer = await sharp({ create: { width: 12, height: 8, channels: 3, background: 'green' } }).png().toBuffer();
      const file = new File([new Uint8Array(buffer)], 'photo.png', { type: 'image/png' });
      const cover = await saveCover(id, file, 0);
      const original = await requireDocument(id);
      expect(original.blocks.map(block => block.id)).toEqual(['text-0', 'text-1', 'text-2']);
      const added = await addImage(id, file, 'text-0', 0);
      const image = added.blocks[1] as ImageBlock;
      expect(image.type).toBe('image'); expect(image.metadata).toMatchObject({ width: 12, height: 8, bytes: buffer.length });
      expect((await readImage(id, image.id)).size).toBe(buffer.length);
      expect(await requireDocument(id)).toEqual(added);
      const competing = await Promise.allSettled([
        editImage(id, image.id, { action: 'update', alt: 'Una cima', caption: 'Pie A', version: 1 }),
        editImage(id, image.id, { action: 'update', alt: 'Otra cima', caption: 'Pie B', version: 1 }),
      ]);
      expect(competing.filter(result => result.status === 'fulfilled')).toHaveLength(1);
      expect(competing.filter(result => result.status === 'rejected')).toHaveLength(1);
      const moved = await editImage(id, image.id, { action: 'move', direction: 'up', version: 2 });
      expect(moved.blocks[0].id).toBe(image.id);
      expect(moved.blocks.filter(block => block.type === 'text')).toEqual(original.blocks);
      const replaced = await replaceImage(id, image.id, file, 3);
      expect(replaced.blocks[0]).toMatchObject({ id: image.id, alt: '', caption: '' });
      expect((await client.storage.from('blog-draft-images').download(image.path)).error).toBeTruthy();
      const removed = await removeImage(id, image.id, 4);
      expect(removed.blocks).toEqual(original.blocks);
      await expect(readImage(id, image.id)).rejects.toMatchObject({ status: 404 });
      expect((await client.storage.from('blog-draft-images').download(cover.imagePath!)).error).toBeNull();
      const row = await client.from('blog_drafts').select('content_html,status,evaluation_status,publication_image_path').eq('id', id).single();
      expect(row.data).toMatchObject({ content_html: html, status: 'completed', evaluation_status: 'not_evaluated', publication_image_path: cover.imagePath });
    } finally {
      await client.from('blog_drafts').delete().eq('id', id); await cleanImages(id);
      expect((await client.storage.from('blog-draft-images').list(id)).data).toEqual([]);
    }
  }, 30000);
});
