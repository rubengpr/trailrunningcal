import { createAdminClient } from '@/lib/supabase/server';
import type { Publication } from '@/types/blog-publication.types';

const columns = 'publication_author,publication_date,publication_image_path,publication_image_alt,publication_version';
type Row = { publication_author: string | null; publication_date: string | null; publication_image_path: string | null; publication_image_alt: string | null; publication_version: number };
function map(row: Row): Publication {
  return { author: row.publication_author, date: row.publication_date, imagePath: row.publication_image_path, imageAlt: row.publication_image_alt, version: row.publication_version };
}
export async function getPublication(id: string): Promise<{ status: string; publication: Publication } | null> {
  const { data, error } = await createAdminClient().from('blog_drafts').select(`status,${columns}`).eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? { status: data.status, publication: map(data) } : null;
}
export async function savePublication(id: string, previous: Publication, next: Partial<Publication>): Promise<Publication | null> {
  const values = {
    ...(next.author !== undefined ? { publication_author: next.author } : {}),
    ...(next.date !== undefined ? { publication_date: next.date } : {}),
    ...(next.imagePath !== undefined ? { publication_image_path: next.imagePath } : {}),
    ...(next.imageAlt !== undefined ? { publication_image_alt: next.imageAlt } : {}),
    publication_version: previous.version + 1,
  };
  const { data, error } = await createAdminClient().from('blog_drafts').update(values)
    .eq('id', id).eq('status', 'completed').eq('publication_version', previous.version).select(columns).maybeSingle();
  if (error) throw error;
  return data ? map(data) : null;
}
