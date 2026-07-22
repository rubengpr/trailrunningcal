alter table public.event_import_batch_items
  add column review_status text not null default 'pending',
  add column accepted_event_id uuid references public.events(id) on delete set null,
  add column reviewed_at timestamptz,
  add constraint event_import_batch_items_review_status_check
    check (review_status in ('pending', 'accepted')),
  add constraint event_import_batch_items_review_state_check
    check (
      (
        review_status = 'pending'
        and accepted_event_id is null
        and reviewed_at is null
      )
      or (
        review_status = 'accepted'
        and status = 'completed'
        and reviewed_at is not null
      )
    );

create index event_import_batch_items_accepted_event_id_idx
  on public.event_import_batch_items (accepted_event_id)
  where accepted_event_id is not null;

create or replace function public.accept_event_import_item(p_item_id uuid)
returns uuid
language plpgsql
security invoker
set search_path to ''
as $function$
declare
  v_item public.event_import_batch_items%rowtype;
  v_event_id uuid;
  v_races jsonb;
begin
  select item.*
  into v_item
  from public.event_import_batch_items as item
  where item.id = p_item_id
    and item.status = 'completed'
    and item.result is not null
  for update;

  if not found then
    raise exception 'Item not found' using errcode = 'P0002';
  end if;

  if v_item.review_status = 'accepted' then
    if v_item.accepted_event_id is null
      or not exists (
        select 1
        from public.events as event
        where event.id = v_item.accepted_event_id
      )
    then
      raise exception 'Accepted event not found' using errcode = 'P0003';
    end if;

    return v_item.accepted_event_id;
  end if;

  if jsonb_typeof(v_item.result -> 'event') is distinct from 'object'
    or jsonb_typeof(v_item.result -> 'races') is distinct from 'array'
    or jsonb_array_length(v_item.result -> 'races') = 0
  then
    raise exception 'Item not found' using errcode = 'P0002';
  end if;

  select jsonb_agg(
    jsonb_build_object(
      'name', race.value -> 'name',
      'date', race.value -> 'date',
      'city', race.value -> 'city',
      'province', race.value -> 'province',
      'distance_km', race.value -> 'distanceKm',
      'elevation_gain_m', race.value -> 'elevationGainM',
      'tiers', coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'price_eur', tier.value -> 'priceEur',
              'ends_at', tier.value -> 'endsAt'
            )
            order by tier.ordinality
          )
          from jsonb_array_elements(coalesce(race.value -> 'tiers', '[]'::jsonb))
            with ordinality as tier(value, ordinality)
        ),
        '[]'::jsonb
      )
    )
    order by race.ordinality
  )
  into v_races
  from jsonb_array_elements(v_item.result -> 'races')
    with ordinality as race(value, ordinality);

  v_event_id := public.create_event_with_races(
    v_item.result -> 'event',
    v_races
  );

  update public.event_import_batch_items
  set review_status = 'accepted',
      accepted_event_id = v_event_id,
      reviewed_at = now(),
      updated_at = now()
  where id = p_item_id;

  return v_event_id;
end;
$function$;

revoke all on function public.accept_event_import_item(uuid) from public;
revoke all on function public.accept_event_import_item(uuid) from anon;
revoke all on function public.accept_event_import_item(uuid) from authenticated;
grant execute on function public.accept_event_import_item(uuid) to service_role;
