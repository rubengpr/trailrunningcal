import { describe, expect, it, vi } from 'vitest';
import type { BlogPost } from '@/lib/content/blog-utils';
const mocks = vi.hoisted(() => ({ posts: vi.fn() }));
vi.mock('@/lib/content/blog-utils', () => ({ getPostsForLocale: mocks.posts }));
import { getRecentIntroductions } from '@/lib/content/blog-introductions';
const post = (title: string, content: string, date = '2020-01-01') => ({ title, content, date } as BlogPost);

describe('recent introductions', () => {
  it('extracts visible introductory paragraphs without MDX components or event sections', () => {
    mocks.posts.mockReturnValue([post('Título', '# Título\n\n<DateAuthorString />\n\n<BlogHeaderImage\n src="imagen.png"\n/>\n\nUna **apertura** con [enlace](/es).\n\nOtro párrafo.\n\n## Evento\n\nNo incluir.')]);
    expect(getRecentIntroductions()).toEqual([{title:'Título',introduction:'Una apertura con enlace.\n\nOtro párrafo.'}]);
    expect(mocks.posts).toHaveBeenCalledWith('es');
  });
  it('skips future, undated and empty posts, keeps catalog order and limits context to three', () => {
    mocks.posts.mockReturnValue([post('Futuro','Texto','2999-01-01'),post('Sin fecha','Texto',''),post('Vacío','## Sección\nTexto'),...['Uno','Dos','Tres','Cuatro'].map(title=>post(title,'x'.repeat(3000)))]);
    const result=getRecentIntroductions();
    expect(result.map(p=>p.title)).toEqual(['Uno','Dos','Tres']);
    expect(result.every(p=>p.introduction.length===2500)).toBe(true);
  });
  it('allows a project with no published introductions', () => {
    mocks.posts.mockReturnValue([]);
    expect(getRecentIntroductions()).toEqual([]);
  });
});
