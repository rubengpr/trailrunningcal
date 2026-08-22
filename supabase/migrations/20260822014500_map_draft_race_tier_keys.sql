-- Draft and batch-item payloads use the agent's camelCase output schema, while
-- create_event_with_races validates database-style snake_case tier fields.
-- Normalize the tier objects at the acceptance boundary before validation.

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
    'tiers', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'price_eur', tier.value -> 'priceEur',
        'starts_at', tier.value -> 'startsAt',
        'ends_at', tier.value -> 'endsAt'
      ) order by tier.ordinality), '[]'::jsonb)
      from jsonb_array_elements(coalesce(race.value -> 'tiers', '[]'::jsonb))
        with ordinality as tier(value, ordinality)
    )
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

create or replace function public.accept_event_import_item(p_item_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path to ''
as $function$
declare
  v_item public.event_import_batch_items%rowtype;
  v_event_id uuid;
  v_event_slug text;
  v_races jsonb;
begin
  select item.* into v_item
  from public.event_import_batch_items as item
  where item.id = p_item_id and item.status = 'completed' and item.result is not null
  for update;
  if not found or v_item.saved_draft_id is not null then
    raise exception 'Item not found' using errcode = 'P0002';
  end if;
  if v_item.review_status = 'accepted' then
    select slug into v_event_slug from public.events where id = v_item.accepted_event_id;
    if not found then raise exception 'Accepted event not found' using errcode = 'P0003'; end if;
    return jsonb_build_object('event_id', v_item.accepted_event_id, 'event_slug', v_event_slug);
  end if;
  if jsonb_typeof(v_item.result -> 'event') is distinct from 'object'
    or jsonb_typeof(v_item.result -> 'races') is distinct from 'array'
    or jsonb_array_length(v_item.result -> 'races') = 0 then
    raise exception 'Item not found' using errcode = 'P0002';
  end if;
  select jsonb_agg(jsonb_build_object(
    'name', race.value -> 'name', 'date', race.value -> 'date',
    'city', race.value -> 'city', 'province', race.value -> 'province',
    'distance_km', race.value -> 'distanceKm',
    'elevation_gain_m', race.value -> 'elevationGainM',
    'tiers', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'price_eur', tier.value -> 'priceEur',
        'starts_at', tier.value -> 'startsAt',
        'ends_at', tier.value -> 'endsAt'
      ) order by tier.ordinality), '[]'::jsonb)
      from jsonb_array_elements(coalesce(race.value -> 'tiers', '[]'::jsonb))
        with ordinality as tier(value, ordinality)
    )
  ) order by race.ordinality) into v_races
  from jsonb_array_elements(v_item.result -> 'races') with ordinality as race(value, ordinality);
  v_event_id := public.create_event_with_races(v_item.result -> 'event', v_races);
  select slug into v_event_slug from public.events where id = v_event_id;
  update public.event_import_batch_items set review_status = 'accepted', accepted_event_id = v_event_id, reviewed_at = now(), updated_at = now() where id = p_item_id;
  return jsonb_build_object('event_id', v_event_id, 'event_slug', v_event_slug);
end;
$function$;

revoke all on function public.accept_event_import_draft(uuid) from public;
revoke all on function public.accept_event_import_draft(uuid) from anon;
revoke all on function public.accept_event_import_item(uuid) from public;
revoke all on function public.accept_event_import_item(uuid) from anon;
grant execute on function public.accept_event_import_draft(uuid) to service_role;
grant execute on function public.accept_event_import_item(uuid) to service_role;
