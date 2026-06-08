drop function if exists public.apply_event_update_suggestion(uuid, jsonb, jsonb);

create or replace function public.create_event_edition(
  p_event_id uuid,
  p_event jsonb,
  p_races jsonb
)
returns uuid
language plpgsql
set search_path to ''
as $function$
declare
  v_event_website_url text;
  v_race jsonb;
begin
  if p_event is null or jsonb_typeof(p_event) <> 'object' then
    raise exception 'Event is required' using errcode = 'P0001';
  end if;

  if p_races is null or jsonb_typeof(p_races) <> 'array' or jsonb_array_length(p_races) = 0 then
    raise exception 'At least one race is required' using errcode = 'P0001';
  end if;

  if not exists (select 1 from public.events where id = p_event_id) then
    raise exception 'Event not found' using errcode = 'P0002';
  end if;

  update public.events
  set
    name = p_event->>'name',
    website_url = nullif(p_event->>'website_url', ''),
    description = nullif(p_event->>'description', ''),
    updated_at = now()
  where id = p_event_id
  returning website_url into v_event_website_url;

  for v_race in select value from jsonb_array_elements(p_races) loop
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
      null
    );
  end loop;

  return p_event_id;
end;
$function$;

grant execute on function public.create_event_edition(uuid, jsonb, jsonb) to authenticated;
grant execute on function public.create_event_edition(uuid, jsonb, jsonb) to service_role;
