import { describe, expect, it } from 'vitest';
import { imageText, insertImage, moveImage, textBlocks } from './article-blocks';
import type { ImageBlock } from '@/types/blog-article-block.types';
const image: ImageBlock = { id: 'image', type: 'image', path: 'private/path', alt: '', caption: '', metadata: { width: 10, height: 20, bytes: 100, format: 'png' } };
describe('article blocks', () => {
  it('preserves top-level paragraphs, headings, lists and approved links', () => {
    const blocks = textBlocks('<p>Introducción <strong>útil</strong>.</p>\n<h2>Evento</h2><ul><li>Texto</li></ul><p><a href="/es">Calendario</a></p>', ['/es']);
    expect(blocks.map(block => block.id)).toEqual(['text-0', 'text-1', 'text-2', 'text-3']);
    expect(blocks[0]).toMatchObject({ html: '<p>Introducción <strong>útil</strong>.</p>' });
    expect(blocks[3]).toMatchObject({ html: '<p><a href="/es">Calendario</a></p>' });
  });
  it('sanitizes legacy HTML before exposing blocks', () => {
    const blocks = textBlocks('<script>alert(1)</script><p onclick="evil()">Texto<img src="evil"></p>', []);
    expect(blocks).toEqual([{ id: 'text-0', type: 'text', html: '<p>Texto</p>' }]);
  });
  it('inserts before, between or after text without mutating it', () => {
    const blocks = textBlocks('<p>A</p><p>B</p>', []);
    for (const afterId of [null, 'text-0', 'text-1']) {
      const next = insertImage(blocks, image, afterId);
      expect(next.filter(block => block.type === 'text')).toEqual(blocks);
      expect(next.indexOf(image)).toBe(afterId === null ? 0 : afterId === 'text-0' ? 1 : 2);
    }
    expect(() => insertImage(blocks, image, 'missing')).toThrow('article_conflict');
  });
  it('moves images while retaining text order and handles the boundaries', () => {
    const blocks = textBlocks('<p>A</p><p>B</p>', []);
    const middle = insertImage(blocks, image, 'text-0');
    const up = moveImage(middle, 'image', 'up');
    expect(up[0]).toBe(image); expect(moveImage(up, 'image', 'up')).toEqual(up);
    const down = moveImage(middle, 'image', 'down');
    expect(down.at(-1)).toBe(image); expect(moveImage(down, 'image', 'down')).toEqual(down);
    expect(down.filter(block => block.type === 'text')).toEqual(blocks);
    expect(() => moveImage(middle, 'text-0', 'up')).toThrow('Image not found');
  });
  it('normalizes editable text and enforces its limits', () => {
    expect(imageText('  Una montaña  ', 300)).toBe('Una montaña');
    expect(() => imageText('a'.repeat(301), 300)).toThrow('invalid_image_text');
  });
});
