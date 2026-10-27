-- One row per real inference request. The key fences replayed writes from durable steps.
create table public.blog_inference_costs (
  id uuid primary key default gen_random_uuid(),
  call_key text not null unique check (char_length(call_key) between 1 and 200),
  stage text not null check (stage in ('research','writing','evaluation')),
  draft_id uuid references public.blog_drafts(id) on delete cascade,
  research_result_id uuid references public.blog_research_results(id) on delete cascade,
  evaluation_attempt_id uuid,
  status text not null check (status in ('succeeded','incomplete','failed')),
  error_code text,
  requested_model text not null,
  model text,
  service_tier text,
  response_id text,
  -- Original provider usage, kept verbatim for audits.
  usage jsonb,
  search_calls integer check (search_calls >= 0),
  -- Applied rates and their version; null when the cost could not be estimated.
  rates jsonb check (rates is null or jsonb_typeof(rates) = 'object'),
  tokens jsonb check (tokens is null or jsonb_typeof(tokens) = 'object'),
  breakdown jsonb check (breakdown is null or jsonb_typeof(breakdown) = 'object'),
  cost_usd numeric(14,8) check (cost_usd >= 0),
  unavailable_reason text check (unavailable_reason in ('usage_missing','usage_invalid','model_unpriced','tier_unknown')),
  created_at timestamptz not null default now(),
  check ((stage = 'research') = (research_result_id is not null)),
  check (stage = 'research' or draft_id is not null),
  check ((stage = 'evaluation') = (evaluation_attempt_id is not null)),
  check ((cost_usd is null) = (unavailable_reason is not null)),
  check ((cost_usd is null) = (rates is null) and (cost_usd is null) = (tokens is null) and (cost_usd is null) = (breakdown is null))
);
create index blog_inference_costs_draft_idx on public.blog_inference_costs(draft_id, created_at) where draft_id is not null;
create index blog_inference_costs_result_idx on public.blog_inference_costs(research_result_id) where research_result_id is not null;

alter table public.blog_inference_costs enable row level security;
revoke all on table public.blog_inference_costs from public, anon, authenticated;
grant select, insert, delete on table public.blog_inference_costs to service_role;
