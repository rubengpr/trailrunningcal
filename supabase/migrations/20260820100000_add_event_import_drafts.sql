create table public.event_import_drafts (
  id uuid primary key default gen_random_uuid(),
  source_url text,
  batch_item_id uuid unique references public.event_import_batch_items(id) on delete set null,
  status text not null default 'draft'
    check (status in ('draft', 'accepted', 'rejected')),
  accepted_event_id uuid references public.events(id) on delete set null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_import_drafts_state_check check (
    (status = 'draft' and accepted_event_id is null)
    or (status = 'rejected' and accepted_event_id is null)
    or (status = 'accepted' and accepted_event_id is not null)
  ),
  constraint event_import_drafts_data_check check (
    jsonb_typeof(data -> 'event') = 'object'
    and jsonb_typeof(data -> 'races') = 'array'
    and jsonb_array_length(data -> 'races') > 0
  )
);

create index event_import_drafts_draft_updated_idx
  on public.event_import_drafts (updated_at desc)
  where status = 'draft';

alter table public.event_import_drafts enable row level security;

alter table public.event_import_batch_items
  add column saved_draft_id uuid unique references public.event_import_drafts(id) on delete set null;

create or replace function public.create_event_import_draft(
  p_data jsonb,
  p_source_url text default null,
  p_batch_item_id uuid default null
)
returns jsonb
language plpgsql
security invoker
set search_path to ''
as $function$
declare
  v_draft public.event_import_drafts%rowtype;
begin
  if p_batch_item_id is not null then
    if not exists (
      select 1 from public.event_import_batch_items
      where id = p_batch_item_id
        and status = 'completed'
        and saved_draft_id is null
    ) then
      raise exception 'Batch item not found' using errcode = 'P0002';
    end if;
  end if;

  insert into public.event_import_drafts (source_url, batch_item_id, data)
  values (nullif(trim(p_source_url), ''), p_batch_item_id, p_data)
  returning * into v_draft;

  if p_batch_item_id is not null then
    update public.event_import_batch_items
    set saved_draft_id = v_draft.id, updated_at = now()
    where id = p_batch_item_id;
  end if;

  return jsonb_build_object('id', v_draft.id);
end;
$function$;

create or replace function public.accept_event_import_draft(p_draft_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path to ''
as $function$
declare
  v_draft public.event_import_drafts%rowtype;
  v_event_id uuid;
  v_event_slug text;
  v_website_url text;
  v_event jsonb;
  v_races jsonb;
begin
  select * into v_draft
  from public.event_import_drafts
  where id = p_draft_id
  for update;

  if not found then
    raise exception 'Draft not found' using errcode = 'P0002';
  end if;

  if v_draft.status = 'accepted' then
    select slug into v_event_slug from public.events where id = v_draft.accepted_event_id;
    if not found then
      raise exception 'Accepted event not found' using errcode = 'P0003';
    end if;
    return jsonb_build_object('event_id', v_draft.accepted_event_id, 'event_slug', v_event_slug);
  end if;

  if v_draft.status <> 'draft' then
    raise exception 'Draft not found' using errcode = 'P0002';
  end if;

  v_event := jsonb_build_object(
    'name', v_draft.data -> 'event' ->> 'name',
    'description', v_draft.data -> 'event' ->> 'description',
    'website_url', v_draft.data -> 'event' ->> 'websiteUrl'
  );

  v_website_url := nullif(trim(v_draft.data -> 'event' ->> 'websiteUrl'), '');
  if v_website_url is not null then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(v_website_url, 0)
    );
    if exists (select 1 from public.events where website_url = v_website_url) then
      raise exception 'Event already exists' using errcode = 'P0004';
    end if;
  end if;

  select jsonb_agg(jsonb_build_object(
    'name', race.value -> 'name',
    'date', race.value -> 'date',
    'city', race.value -> 'city',
    'province', race.value -> 'province',
    'distance_km', race.value -> 'distanceKm',
    'elevation_gain_m', race.value -> 'elevationGainM',
    'results_url', race.value -> 'resultsUrl',
    'tiers', coalesce(race.value -> 'tiers', '[]'::jsonb)
  ) order by race.ordinality)
  into v_races
  from jsonb_array_elements(v_draft.data -> 'races') with ordinality as race(value, ordinality);

  v_event_id := public.create_event_with_results(v_event, v_races);

  update public.event_import_drafts
  set status = 'accepted', accepted_event_id = v_event_id, updated_at = now()
  where id = v_draft.id;

  select slug into v_event_slug from public.events where id = v_event_id;
  return jsonb_build_object('event_id', v_event_id, 'event_slug', v_event_slug);
end;
$function$;

revoke all on function public.create_event_import_draft(jsonb, text, uuid) from public;
revoke all on function public.create_event_import_draft(jsonb, text, uuid) from anon;
revoke all on function public.accept_event_import_draft(uuid) from public;
revoke all on function public.accept_event_import_draft(uuid) from anon;
grant execute on function public.create_event_import_draft(jsonb, text, uuid) to service_role;
grant execute on function public.accept_event_import_draft(uuid) to service_role;
