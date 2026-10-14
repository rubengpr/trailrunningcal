alter table public.blog_drafts add column generation_context jsonb;
comment on column public.blog_drafts.generation_context is 'Immutable source snapshot for regional article generation; null for legacy drafts.';
