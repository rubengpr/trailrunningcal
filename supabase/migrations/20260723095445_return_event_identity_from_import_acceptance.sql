drop function public.accept_event_import_item(uuid);

create function public.accept_event_import_item(p_item_id uuid)
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
    if v_item.accepted_event_id is null then
      raise exception 'Accepted event not found' using errcode = 'P0003';
    end if;

    select event.slug
    into v_event_slug
    from public.events as event
    where event.id = v_item.accepted_event_id;

    if not found then
      raise exception 'Accepted event not found' using errcode = 'P0003';
    end if;

    return jsonb_build_object(
      'event_id', v_item.accepted_event_id,
      'event_slug', v_event_slug
    );
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

  select event.slug
  into v_event_slug
  from public.events as event
  where event.id = v_event_id;

  if not found then
    raise exception 'Accepted event not found' using errcode = 'P0003';
  end if;

  update public.event_import_batch_items
  set review_status = 'accepted',
      accepted_event_id = v_event_id,
      reviewed_at = now(),
      updated_at = now()
  where id = p_item_id;

  return jsonb_build_object(
    'event_id', v_event_id,
    'event_slug', v_event_slug
  );
end;
$function$;

revoke all on function public.accept_event_import_item(uuid) from public;
revoke all on function public.accept_event_import_item(uuid) from anon;
revoke all on function public.accept_event_import_item(uuid) from authenticated;
grant execute on function public.accept_event_import_item(uuid) to service_role;
