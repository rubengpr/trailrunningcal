alter table public.blog_drafts
  add column article_blocks jsonb,
  add column article_version integer not null default 0,
  add constraint blog_article_blocks_array check (article_blocks is null or jsonb_typeof(article_blocks) = 'array'),
  add constraint blog_article_version_positive check (article_version >= 0);
comment on column public.blog_drafts.article_blocks is 'Ordered immutable text fragments and admin-inserted images. Null falls back to generated content_html.';
