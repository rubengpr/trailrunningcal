create table public.event_research_batches (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending'
    check (status in ('pending', 'running', 'completed', 'failed')),
  model text not null,
  prompt_slug text not null,
  prompt_version text not null,
  search_context_size text not null,
  concurrency integer not null check (concurrency between 1 and 10),
  workflow_run_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.event_research_batch_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.event_research_batches(id) on delete cascade,
  event_name text not null check (char_length(trim(event_name)) between 2 and 200),
  status text not null default 'pending'
    check (status in ('pending', 'running', 'completed', 'failed')),
  result jsonb,
  sources jsonb not null default '[]'::jsonb
    check (jsonb_typeof(sources) = 'array'),
  usage jsonb,
  openai_response_id text,
  braintrust_root_span_id text,
  race_count integer check (race_count is null or race_count >= 0),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  error text,
  draft_id uuid unique references public.event_import_drafts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_research_batch_items_state_check check (
    (status = 'pending' and error is null)
    or status = 'running'
    or (status = 'completed' and result is not null and error is null)
    or (status = 'failed' and error is not null)
  )
);

create unique index event_research_batch_items_name_idx
  on public.event_research_batch_items (batch_id, lower(trim(event_name)));

create index event_research_batch_items_batch_idx
  on public.event_research_batch_items (batch_id, created_at);

alter table public.event_import_drafts
  add column research_batch_item_id uuid unique
    references public.event_research_batch_items(id) on delete set null;

alter table public.event_research_batches enable row level security;
alter table public.event_research_batch_items enable row level security;

revoke all on table public.event_research_batches from anon, authenticated;
revoke all on table public.event_research_batch_items from anon, authenticated;
grant select, insert, update, delete on table public.event_research_batches to service_role;
grant select, insert, update, delete on table public.event_research_batch_items to service_role;

create or replace function public.create_event_research_batch(
  p_event_names text[],
  p_model text,
  p_prompt_slug text,
  p_prompt_version text,
  p_search_context_size text,
  p_concurrency integer
)
returns setof public.event_research_batches
language plpgsql
security invoker
set search_path to ''
as $function$
declare
  v_batch public.event_research_batches%rowtype;
begin
  if coalesce(cardinality(p_event_names), 0) < 1
    or cardinality(p_event_names) > 50
    or p_concurrency not between 1 and 10
  then
    raise exception 'Invalid batch input' using errcode = '22023';
  end if;

  if exists (
    select 1
    from unnest(p_event_names) as source(name)
    where char_length(trim(source.name)) not between 2 and 200
  ) then
    raise exception 'Invalid event name' using errcode = '22023';
  end if;

  insert into public.event_research_batches (
    model,
    prompt_slug,
    prompt_version,
    search_context_size,
    concurrency
  ) values (
    p_model,
    p_prompt_slug,
    p_prompt_version,
    p_search_context_size,
    p_concurrency
  ) returning * into v_batch;

  insert into public.event_research_batch_items (batch_id, event_name)
  select v_batch.id, normalized.name
  from (
    select distinct on (lower(trim(source.name))) trim(source.name) as name, source.ordinality
    from unnest(p_event_names) with ordinality as source(name, ordinality)
    order by lower(trim(source.name)), source.ordinality
  ) as normalized
  order by normalized.ordinality;

  return next v_batch;
end;
$function$;

create or replace function public.start_event_research_item(p_item_id uuid)
returns boolean
language plpgsql
security invoker
set search_path to ''
as $function$
begin
  update public.event_research_batch_items
  set status = 'running',
      attempt_count = attempt_count + 1,
      error = null,
      updated_at = now()
  where id = p_item_id and status = 'pending';

  return found;
end;
$function$;

create or replace function public.complete_event_research_item(
  p_item_id uuid,
  p_result jsonb,
  p_sources jsonb,
  p_usage jsonb,
  p_openai_response_id text,
  p_braintrust_root_span_id text,
  p_race_count integer,
  p_draft_data jsonb default null,
  p_source_url text default null
)
returns jsonb
language plpgsql
security invoker
set search_path to ''
as $function$
declare
  v_item public.event_research_batch_items%rowtype;
  v_draft_id uuid;
begin
  select * into v_item
  from public.event_research_batch_items
  where id = p_item_id and status = 'running'
  for update;

  if not found then
    raise exception 'Research item not found' using errcode = 'P0002';
  end if;

  if jsonb_typeof(p_result) is distinct from 'object'
    or jsonb_typeof(coalesce(p_sources, '[]'::jsonb)) is distinct from 'array'
    or p_race_count < 0
  then
    raise exception 'Invalid research result' using errcode = '22023';
  end if;

  if p_draft_data is not null then
    if jsonb_typeof(p_draft_data -> 'event') is distinct from 'object'
      or jsonb_typeof(p_draft_data -> 'races') is distinct from 'array'
      or jsonb_array_length(p_draft_data -> 'races') = 0
    then
      raise exception 'Invalid draft data' using errcode = '22023';
    end if;

    insert into public.event_import_drafts (
      source_url,
      research_batch_item_id,
      data
    ) values (
      nullif(trim(p_source_url), ''),
      p_item_id,
      p_draft_data
    ) returning id into v_draft_id;
  end if;

  update public.event_research_batch_items
  set status = 'completed',
      result = p_result,
      sources = coalesce(p_sources, '[]'::jsonb),
      usage = p_usage,
      openai_response_id = nullif(trim(p_openai_response_id), ''),
      braintrust_root_span_id = nullif(trim(p_braintrust_root_span_id), ''),
      race_count = p_race_count,
      error = null,
      draft_id = v_draft_id,
      updated_at = now()
  where id = p_item_id;

  return jsonb_build_object('draft_id', v_draft_id);
end;
$function$;

create or replace function public.fail_event_research_item(
  p_item_id uuid,
  p_error text,
  p_braintrust_root_span_id text default null
)
returns boolean
language plpgsql
security invoker
set search_path to ''
as $function$
begin
  if nullif(trim(p_error), '') is null then
    raise exception 'Invalid research error' using errcode = '22023';
  end if;

  update public.event_research_batch_items
  set status = 'failed',
      error = left(trim(p_error), 500),
      braintrust_root_span_id = nullif(trim(p_braintrust_root_span_id), ''),
      updated_at = now()
  where id = p_item_id and status = 'running';

  return found;
end;
$function$;

create or replace function public.retry_event_research_item(p_item_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path to ''
as $function$
declare
  v_item public.event_research_batch_items%rowtype;
begin
  select * into v_item
  from public.event_research_batch_items
  where id = p_item_id and status = 'failed'
  for update;

  if not found then
    raise exception 'Research item is not retryable' using errcode = 'P0004';
  end if;

  update public.event_research_batch_items
  set status = 'pending',
      result = null,
      sources = '[]'::jsonb,
      usage = null,
      openai_response_id = null,
      braintrust_root_span_id = null,
      race_count = null,
      error = null,
      updated_at = now()
  where id = p_item_id;

  update public.event_research_batches
  set status = 'running', updated_at = now()
  where id = v_item.batch_id;

  return jsonb_build_object(
    'batch_id', v_item.batch_id,
    'item_id', v_item.id,
    'event_name', v_item.event_name
  );
end;
$function$;

revoke all on function public.create_event_research_batch(text[], text, text, text, text, integer) from public, anon, authenticated;
revoke all on function public.start_event_research_item(uuid) from public, anon, authenticated;
revoke all on function public.complete_event_research_item(uuid, jsonb, jsonb, jsonb, text, text, integer, jsonb, text) from public, anon, authenticated;
revoke all on function public.fail_event_research_item(uuid, text, text) from public, anon, authenticated;
revoke all on function public.retry_event_research_item(uuid) from public, anon, authenticated;

grant execute on function public.create_event_research_batch(text[], text, text, text, text, integer) to service_role;
grant execute on function public.start_event_research_item(uuid) to service_role;
grant execute on function public.complete_event_research_item(uuid, jsonb, jsonb, jsonb, text, text, integer, jsonb, text) to service_role;
grant execute on function public.fail_event_research_item(uuid, text, text) to service_role;
grant execute on function public.retry_event_research_item(uuid) to service_role;

notify pgrst, 'reload schema';
