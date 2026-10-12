create table public.blog_drafts (
  id uuid primary key default gen_random_uuid(),
  instructions text not null
    check (char_length(btrim(instructions)) between 10 and 5000),
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'failed')),
  title text,
  content_html text,
  primary_keyword text,
  slug text,
  seo_title text,
  meta_description text,
  model text,
  workflow_run_id text,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint blog_drafts_completed_content_check check (
    status <> 'completed' or (
      nullif(btrim(title), '') is not null
      and nullif(btrim(content_html), '') is not null
      and nullif(btrim(primary_keyword), '') is not null
      and nullif(btrim(slug), '') is not null
      and nullif(btrim(seo_title), '') is not null
      and nullif(btrim(meta_description), '') is not null
    )
  ),
  constraint blog_drafts_error_check check (
    (status = 'failed' and nullif(btrim(error_code), '') is not null)
    or (status <> 'failed' and error_code is null)
  )
);

create index blog_drafts_created_at_idx
  on public.blog_drafts (created_at desc, id desc);

create table public.blog_draft_evaluations (
  draft_id uuid primary key references public.blog_drafts(id) on delete cascade,
  score integer not null check (score between 0 and 100),
  criteria jsonb not null check (jsonb_typeof(criteria) = 'array'),
  created_at timestamptz not null default now()
);

alter table public.blog_drafts enable row level security;
alter table public.blog_draft_evaluations enable row level security;

-- Admin authorization is enforced by the backend before using service_role.
-- Browser roles have no direct access to draft content or evaluations.
revoke all on table public.blog_drafts from public, anon, authenticated;
revoke all on table public.blog_draft_evaluations from public, anon, authenticated;
grant select, insert, update, delete on table public.blog_drafts to service_role;
grant select, insert, update, delete on table public.blog_draft_evaluations to service_role;
