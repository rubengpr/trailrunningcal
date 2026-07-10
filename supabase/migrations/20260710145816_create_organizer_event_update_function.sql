create or replace function public.update_organizer_event_with_races(
  p_event_id uuid,
  p_organizer_id uuid,
  p_event jsonb,
  p_races jsonb
)
returns uuid
language plpgsql
security invoker
set search_path to ''
as $function$
declare
  v_event_website_url text;
  v_kept_race_ids uuid[] := '{}';
  v_race jsonb;
  v_race_id uuid;
begin
  if p_event is null or jsonb_typeof(p_event) <> 'object' then
    raise exception 'Event is required' using errcode = 'P0001';
  end if;

  if p_races is null or jsonb_typeof(p_races) <> 'array' or jsonb_array_length(p_races) = 0 then
    raise exception 'At least one race is required' using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.organizers
    where id = p_organizer_id
      and owner_id = (select auth.uid())
  ) then
    raise exception 'Forbidden' using errcode = 'P0004';
  end if;

  if not exists (
    select 1
    from public.events
    where id = p_event_id
      and organizer_id = p_organizer_id
  ) then
    raise exception 'Event not found' using errcode = 'P0002';
  end if;

  for v_race in select value from jsonb_array_elements(p_races) loop
    if nullif(v_race->>'id', '') is not null then
      v_race_id := (v_race->>'id')::uuid;

      if not exists (
        select 1
        from public.races
        where id = v_race_id
          and event_id = p_event_id
      ) then
        raise exception 'Race does not belong to event' using errcode = 'P0003';
      end if;

      v_kept_race_ids := array_append(v_kept_race_ids, v_race_id);
    end if;
  end loop;

  update public.events
  set
    name = p_event->>'name',
    website_url = nullif(p_event->>'website_url', ''),
    description = nullif(p_event->>'description', ''),
    updated_at = now()
  where id = p_event_id
    and organizer_id = p_organizer_id
  returning website_url into v_event_website_url;

  delete from public.races
  where event_id = p_event_id
    and not (id = any(v_kept_race_ids));

  for v_race in select value from jsonb_array_elements(p_races) loop
    if nullif(v_race->>'id', '') is not null then
      update public.races
      set
        name = v_race->>'name',
        date = nullif(v_race->>'date', '')::date,
        city = v_race->>'city',
        province = v_race->>'province',
        distance_km = (v_race->>'distance_km')::numeric,
        elevation_gain_m = nullif(v_race->>'elevation_gain_m', '')::integer,
        website_url = v_event_website_url,
        organizer_id = p_organizer_id,
        updated_at = now()
      where id = (v_race->>'id')::uuid
        and event_id = p_event_id;
    else
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
        p_event_id,
        v_race->>'name',
        nullif(v_race->>'date', '')::date,
        v_race->>'city',
        v_race->>'province',
        (v_race->>'distance_km')::numeric,
        nullif(v_race->>'elevation_gain_m', '')::integer,
        v_event_website_url,
        null,
        p_organizer_id
      );
    end if;
  end loop;

  return p_event_id;
end;
$function$;

revoke all on function public.update_organizer_event_with_races(uuid, uuid, jsonb, jsonb) from public;
grant execute on function public.update_organizer_event_with_races(uuid, uuid, jsonb, jsonb) to authenticated;
grant execute on function public.update_organizer_event_with_races(uuid, uuid, jsonb, jsonb) to service_role;
