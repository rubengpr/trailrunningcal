create table public.event_drafts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  status text not null default 'pending',
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_drafts_status_check
    check (status in ('pending', 'accepted', 'rejected')),
  constraint event_drafts_data_check
    check (
      jsonb_typeof(data) = 'object'
      and jsonb_typeof(data->'event') = 'object'
      and jsonb_typeof(data->'races') = 'array'
      and jsonb_array_length(data->'races') > 0
    )
);

create unique index event_drafts_one_pending_per_event_idx
  on public.event_drafts(event_id)
  where status = 'pending';

create index event_drafts_event_id_idx
  on public.event_drafts(event_id);

alter table public.event_drafts enable row level security;

create or replace function public.accept_event_draft(
  p_draft_id uuid
)
returns uuid
language plpgsql
set search_path to ''
as $function$
declare
  v_draft public.event_drafts%rowtype;
  v_event_website_url text;
  v_race jsonb;
begin
  select *
  into v_draft
  from public.event_drafts
  where id = p_draft_id
    and status = 'pending'
  for update;

  if not found then
    raise exception 'Draft not found' using errcode = 'P0002';
  end if;

  if not exists (select 1 from public.events where id = v_draft.event_id) then
    raise exception 'Event not found' using errcode = 'P0003';
  end if;

  update public.events
  set
    name = v_draft.data->'event'->>'name',
    website_url = nullif(v_draft.data->'event'->>'websiteUrl', ''),
    description = nullif(v_draft.data->'event'->>'description', ''),
    updated_at = now()
  where id = v_draft.event_id
  returning website_url into v_event_website_url;

  for v_race in select value from jsonb_array_elements(v_draft.data->'races') loop
    insert into public.races (
      event_id,
      name,
      date,
      city,
      province,
      distance_km,
      elevation_gain_m,
      website_url,
      description,
      organizer_id
    )
    values (
      v_draft.event_id,
      v_race->>'name',
      nullif(v_race->>'date', '')::date,
      v_race->>'city',
      v_race->>'province',
      (v_race->>'distanceKm')::numeric,
      nullif(v_race->>'elevationGainM', '')::integer,
      v_event_website_url,
      null,
      null
    );
  end loop;

  update public.event_drafts
  set
    status = 'accepted',
    updated_at = now()
  where id = v_draft.id;

  return v_draft.event_id;
end;
$function$;

grant execute on function public.accept_event_draft(uuid) to authenticated;
grant execute on function public.accept_event_draft(uuid) to service_role;
