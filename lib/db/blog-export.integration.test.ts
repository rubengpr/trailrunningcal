import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
vi.mock('next/font/google', () => ({ Montserrat: () => ({ className: 'font-test' }) }));
import { exportFixture } from '@/tests/fixtures/blog-export';
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } }) }));
import { exportDraft } from '@/lib/services/blog-export';
import { saveDetails, saveImage, cleanImages } from '@/lib/services/blog-publication';
import { addImage } from '@/lib/services/blog-article-images';
import { getAllBlogPosts } from '@/lib/content/blog-utils';
import { renderMDXFile } from '@/lib/content/mdx-renderer';
import { buildBlogJsonLd } from '@/lib/seo/json-ld';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
const integration = process.env.RUN_SUPABASE_INTEGRATION_TESTS === 'true' ? describe : describe.skip;
integration('local MDX publication', () => {
  it('exports repeatably, renders from the catalog and preserves public files after draft deletion', async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    if (new URL(url).hostname !== 'wghqldoshvwulyqqbqln.supabase.co') throw new Error('Local only');
    const client = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
    const id = randomUUID(), slug = `test-export-${id}`, folder = join(process.cwd(), 'content/blog', slug);
    const { error } = await client.from('blog_drafts').insert({ id, status: 'completed', instructions: 'Temporary export test', title: exportFixture.title, slug, primary_keyword: 'trail running', seo_title: exportFixture.seoTitle, meta_description: exportFixture.metaDescription, content_html: '<h2>Una ruta</h2><p>Texto con {llaves} y montaña.</p>' });
    if (error) throw error;
    const published: string[] = [];
    try {
      const makeFile = async (color: string) => new File([new Uint8Array(await sharp({ create: { width: 8, height: 6, channels: 3, background: color } }).png().toBuffer())], 'test.png', { type: 'image/png' });
      await saveImage(id, await makeFile('red'), 0);
      await saveDetails(id, { author: 'Autor de prueba', date: '2026-11-10', imageAlt: 'Portada de prueba', version: 1 });
      const document = await addImage(id, await makeFile('blue'), 'text-0', 0);
      await client.from('blog_drafts').update({ article_blocks: document.blocks.map(block => block.type === 'image' ? { ...block, alt: 'Imagen interior', caption: 'Pie de prueba' } : block) }).eq('id', id);
      const first = await exportDraft(id), second = await exportDraft(id);
      expect(first).toEqual(second);
      const listing = await client.storage.from('blog-publications').list(id);
      if (listing.error) throw listing.error;
      published.push(...listing.data.map(file => `${id}/${file.name}`)); expect(published).toHaveLength(2);
      await mkdir(folder, { recursive: true }); await writeFile(join(folder, 'es.mdx'), first.content);
      const post = getAllBlogPosts().find(post => post.slug === slug)!;
      expect(post).toMatchObject({ seoTitle: exportFixture.seoTitle, author: 'Autor de prueba' });
      expect(buildBlogJsonLd(post).author).toEqual({ '@type': 'Person', name: 'Autor de prueba' });
      const Content = await renderMDXFile(post.filePath, 'es');
      const rendered = renderToStaticMarkup(createElement(Content));
      expect(rendered).toContain('Texto con {llaves}'); expect(rendered).toContain('Pie de prueba'); expect(rendered).toContain('Autor de prueba');
      await client.from('blog_drafts').delete().eq('id', id); await cleanImages(id);
      for (const path of published) {
        const publicUrl = client.storage.from('blog-publications').getPublicUrl(path).data.publicUrl;
        expect((await fetch(publicUrl)).status).toBe(200);
      }
      // Anonymous users can read public files but cannot mutate them.
      const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
      expect((await anon.storage.from('blog-publications').upload(`${id}/forbidden.png`, new Blob(['no']))).error).toBeTruthy();
    } finally {
      await rm(folder, { recursive: true, force: true }); await client.from('blog_drafts').delete().eq('id', id); await cleanImages(id);
      const leftovers = await client.storage.from('blog-publications').list(id);
      if (leftovers.data?.length) await client.storage.from('blog-publications').remove(leftovers.data.map(file => `${id}/${file.name}`));
    }
  }, 60000);
});
