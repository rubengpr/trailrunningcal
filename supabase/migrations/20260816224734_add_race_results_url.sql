alter table public.races
add column if not exists results_url text;

do $block$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'races_results_url_http_check'
      and conrelid = 'public.races'::regclass
  ) then
    alter table public.races
    add constraint races_results_url_http_check
    check (results_url is null or results_url ~* '^https?://');
  end if;
end;
$block$;

grant select (results_url) on public.races to anon;

create or replace function public.create_event_with_results(
  p_event jsonb,
  p_races jsonb
)
returns uuid
language plpgsql
security invoker
set search_path to ''
as $function$
declare
  v_event_id uuid;
  v_index integer := 0;
  v_marked_name text;
  v_marked_races jsonb := '[]'::jsonb;
  v_marker text := '__trc_results_' || gen_random_uuid()::text || '_';
  v_race jsonb;
begin
  for v_race in select value from jsonb_array_elements(p_races) loop
    v_index := v_index + 1;
    v_marked_name := coalesce(v_race ->> 'name', '') || v_marker || v_index::text;
    v_marked_races := v_marked_races || jsonb_build_array(
      jsonb_set(v_race, '{name}', to_jsonb(v_marked_name))
    );
  end loop;

  v_event_id := public.create_event_with_races(p_event, v_marked_races);

  v_index := 0;
  for v_race in select value from jsonb_array_elements(p_races) loop
    v_index := v_index + 1;
    v_marked_name := coalesce(v_race ->> 'name', '') || v_marker || v_index::text;

    update public.races
    set
      name = nullif(trim(v_race ->> 'name'), ''),
      results_url = nullif(trim(v_race ->> 'results_url'), ''),
      updated_at = now()
    where event_id = v_event_id
      and name = v_marked_name;

    if not found then
      raise exception 'Created race could not be identified' using errcode = 'P0001';
    end if;
  end loop;

  return v_event_id;
end;
$function$;

revoke all on function public.create_event_with_results(jsonb, jsonb) from public;
revoke all on function public.create_event_with_results(jsonb, jsonb) from anon;
grant execute on function public.create_event_with_results(jsonb, jsonb) to authenticated;
grant execute on function public.create_event_with_results(jsonb, jsonb) to service_role;

create or replace function public.create_event_edition_with_results(
  p_event_id uuid,
  p_event jsonb,
  p_races jsonb
)
returns uuid
language plpgsql
security invoker
set search_path to ''
as $function$
declare
  v_index integer := 0;
  v_marked_name text;
  v_marked_races jsonb := '[]'::jsonb;
  v_marker text := '__trc_results_' || gen_random_uuid()::text || '_';
  v_race jsonb;
  v_updated_event_id uuid;
begin
  for v_race in select value from jsonb_array_elements(p_races) loop
    v_index := v_index + 1;
    v_marked_name := coalesce(v_race ->> 'name', '') || v_marker || v_index::text;
    v_marked_races := v_marked_races || jsonb_build_array(
      jsonb_set(v_race, '{name}', to_jsonb(v_marked_name))
    );
  end loop;

  v_updated_event_id := public.create_event_edition(
    p_event_id,
    p_event,
    v_marked_races
  );

  v_index := 0;
  for v_race in select value from jsonb_array_elements(p_races) loop
    v_index := v_index + 1;
    v_marked_name := coalesce(v_race ->> 'name', '') || v_marker || v_index::text;

    update public.races
    set
      name = nullif(trim(v_race ->> 'name'), ''),
      results_url = nullif(trim(v_race ->> 'results_url'), ''),
      updated_at = now()
    where event_id = p_event_id
      and name = v_marked_name;

    if not found then
      raise exception 'Created race could not be identified' using errcode = 'P0001';
    end if;
  end loop;

  return v_updated_event_id;
end;
$function$;

revoke all on function public.create_event_edition_with_results(uuid, jsonb, jsonb) from public;
revoke all on function public.create_event_edition_with_results(uuid, jsonb, jsonb) from anon;
grant execute on function public.create_event_edition_with_results(uuid, jsonb, jsonb) to authenticated;
grant execute on function public.create_event_edition_with_results(uuid, jsonb, jsonb) to service_role;

create or replace function public.update_event_with_results(
  p_event_id uuid,
  p_event jsonb,
  p_races jsonb
)
returns uuid
language plpgsql
security invoker
set search_path to ''
as $function$
declare
  v_updated_event_id uuid;
  v_index integer := 0;
  v_marked_name text;
  v_marked_races jsonb := '[]'::jsonb;
  v_marker text := '__trc_results_' || gen_random_uuid()::text || '_';
  v_race jsonb;
  v_race_id uuid;
begin
  for v_race in select value from jsonb_array_elements(p_races) loop
    v_race_id := nullif(v_race ->> 'id', '')::uuid;

    if v_race_id is null then
      v_index := v_index + 1;
      v_marked_name := coalesce(v_race ->> 'name', '') || v_marker || v_index::text;
      v_marked_races := v_marked_races || jsonb_build_array(
        jsonb_set(v_race, '{name}', to_jsonb(v_marked_name))
      );
    else
      v_marked_races := v_marked_races || jsonb_build_array(v_race);
    end if;
  end loop;

  v_updated_event_id := public.update_event_with_races(
    p_event_id,
    p_event,
    v_marked_races
  );

  v_index := 0;
  for v_race in select value from jsonb_array_elements(p_races) loop
    v_race_id := nullif(v_race ->> 'id', '')::uuid;

    if v_race_id is null then
      v_index := v_index + 1;
      v_marked_name := coalesce(v_race ->> 'name', '') || v_marker || v_index::text;

      update public.races
      set
        name = nullif(trim(v_race ->> 'name'), ''),
        results_url = case
          when v_race ? 'results_url' then nullif(trim(v_race ->> 'results_url'), '')
          else results_url
        end,
        updated_at = now()
      where event_id = p_event_id
        and name = v_marked_name;

      if not found then
        raise exception 'Created race could not be identified' using errcode = 'P0001';
      end if;
    elsif v_race ? 'results_url' then
      update public.races
      set
        results_url = nullif(trim(v_race ->> 'results_url'), ''),
        updated_at = now()
      where id = v_race_id
        and event_id = p_event_id;
    end if;
  end loop;

  return v_updated_event_id;
end;
$function$;

revoke all on function public.update_event_with_results(uuid, jsonb, jsonb) from public;
revoke all on function public.update_event_with_results(uuid, jsonb, jsonb) from anon;
grant execute on function public.update_event_with_results(uuid, jsonb, jsonb) to authenticated;
grant execute on function public.update_event_with_results(uuid, jsonb, jsonb) to service_role;

create or replace function public.update_organizer_event_with_results(
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
  v_updated_event_id uuid;
  v_index integer := 0;
  v_marked_name text;
  v_marked_races jsonb := '[]'::jsonb;
  v_marker text := '__trc_results_' || gen_random_uuid()::text || '_';
  v_race jsonb;
  v_race_id uuid;
begin
  for v_race in select value from jsonb_array_elements(p_races) loop
    v_race_id := nullif(v_race ->> 'id', '')::uuid;

    if v_race_id is null then
      v_index := v_index + 1;
      v_marked_name := coalesce(v_race ->> 'name', '') || v_marker || v_index::text;
      v_marked_races := v_marked_races || jsonb_build_array(
        jsonb_set(v_race, '{name}', to_jsonb(v_marked_name))
      );
    else
      v_marked_races := v_marked_races || jsonb_build_array(v_race);
    end if;
  end loop;

  v_updated_event_id := public.update_organizer_event_with_races(
    p_event_id,
    p_organizer_id,
    p_event,
    v_marked_races
  );

  v_index := 0;
  for v_race in select value from jsonb_array_elements(p_races) loop
    v_race_id := nullif(v_race ->> 'id', '')::uuid;

    if v_race_id is null then
      v_index := v_index + 1;
      v_marked_name := coalesce(v_race ->> 'name', '') || v_marker || v_index::text;

      update public.races as race
      set
        name = nullif(trim(v_race ->> 'name'), ''),
        results_url = case
          when v_race ? 'results_url' then nullif(trim(v_race ->> 'results_url'), '')
          else race.results_url
        end,
        updated_at = now()
      from public.events as event
      where race.event_id = p_event_id
        and race.name = v_marked_name
        and event.id = race.event_id
        and event.organizer_id = p_organizer_id;

      if not found then
        raise exception 'Created race could not be identified' using errcode = 'P0001';
      end if;
    elsif v_race ? 'results_url' then
      update public.races as race
      set
        results_url = nullif(trim(v_race ->> 'results_url'), ''),
        updated_at = now()
      from public.events as event
      where race.id = v_race_id
        and race.event_id = p_event_id
        and event.id = race.event_id
        and event.organizer_id = p_organizer_id;
    end if;
  end loop;

  return v_updated_event_id;
end;
$function$;

revoke all on function public.update_organizer_event_with_results(uuid, uuid, jsonb, jsonb) from public;
revoke all on function public.update_organizer_event_with_results(uuid, uuid, jsonb, jsonb) from anon;
grant execute on function public.update_organizer_event_with_results(uuid, uuid, jsonb, jsonb) to authenticated;
grant execute on function public.update_organizer_event_with_results(uuid, uuid, jsonb, jsonb) to service_role;

update public.races as race
set results_url = case race.distance_km
  when 36 then 'https://www.9hsports.cat/ca/live/3148/3839'
  when 24 then 'https://www.9hsports.cat/ca/live/3149/3839'
  when 12 then 'https://www.9hsports.cat/ca/live/3150/3839'
end
from public.events as event
where event.id = race.event_id
  and event.slug = 'trail-moixero'
  and race.date = date '2026-08-15'
  and race.distance_km in (12, 24, 36);
