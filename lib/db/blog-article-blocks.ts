import { createAdminClient } from '@/lib/supabase/server';
import { textBlocks } from '@/lib/blog/article-blocks';
import { allowedLinks } from '@/lib/blog/links';
import type { ArticleBlock, ArticleDocument } from '@/types/blog-article-block.types';
import type { SelectionContext } from '@/types/blog-selection.types';

export async function getDocument(id: string): Promise<{ status: string; document: ArticleDocument } | null> {
  const { data, error } = await createAdminClient().from('blog_drafts')
    .select('status,content_html,article_blocks,article_version,article_links,generation_context').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const links = data.article_links?.length ? data.article_links : allowedLinks(data.generation_context as SelectionContext | null);
  return { status: data.status, document: { version: data.article_version, blocks: data.article_blocks ?? textBlocks(data.content_html ?? '', links) } };
}
export async function saveDocument(id: string, version: number, blocks: ArticleBlock[]): Promise<ArticleDocument | null> {
  const { data, error } = await createAdminClient().from('blog_drafts').update({ article_blocks: blocks, article_version: version + 1 })
    .eq('id', id).eq('status', 'completed').eq('article_version', version).select('article_version').maybeSingle();
  if (error) throw error;
  return data ? { blocks, version: data.article_version } : null;
}
