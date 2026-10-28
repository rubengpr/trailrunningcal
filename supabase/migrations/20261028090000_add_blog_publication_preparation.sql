alter table public.blog_drafts
  add column publication_author text,
  add column publication_date date,
  add column publication_image_path text,
  add column publication_image_alt text,
  add column publication_version integer not null default 0,
  add constraint blog_publication_author_length check (publication_author is null or char_length(btrim(publication_author)) between 1 and 120),
  add constraint blog_publication_alt_length check (publication_image_alt is null or char_length(publication_image_alt) <= 300),
  add constraint blog_publication_version_positive check (publication_version >= 0);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('blog-draft-images', 'blog-draft-images', false, 2097152, array['image/jpeg', 'image/png', 'image/webp']);
-- No client storage policies: only the backend service role can access this bucket.
