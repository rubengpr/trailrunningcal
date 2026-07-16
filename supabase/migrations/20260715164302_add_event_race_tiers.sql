create or replace function public.create_event_with_races(
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
  v_name text;
  v_description text;
  v_website_url text;
  v_base_slug text;
  v_slug text;
  v_suffix integer := 1;
  v_race jsonb;
  v_race_id uuid;
  v_tier jsonb;
  v_tiers jsonb;
begin
  if p_event is null or jsonb_typeof(p_event) <> 'object' then
    raise exception 'Event is required' using errcode = 'P0001';
  end if;

  if p_races is null or jsonb_typeof(p_races) <> 'array' or jsonb_array_length(p_races) = 0 then
    raise exception 'At least one race is required' using errcode = 'P0001';
  end if;

  v_name := nullif(trim(p_event ->> 'name'), '');
  v_description := nullif(trim(coalesce(p_event ->> 'description', '')), '');
  v_website_url := nullif(trim(coalesce(p_event ->> 'website_url', p_event ->> 'websiteUrl', '')), '');

  if v_name is null then
    raise exception 'Event name is required' using errcode = 'P0001';
  end if;

  v_base_slug := trim(both '-' from regexp_replace(lower(v_name), '[^a-z0-9]+', '-', 'g'));
  if v_base_slug = '' then
    v_base_slug := 'event';
  end if;
  v_slug := v_base_slug;

  while exists (select 1 from public.events e where e.slug = v_slug) loop
    v_suffix := v_suffix + 1;
    v_slug := v_base_slug || '-' || v_suffix::text;
  end loop;

  insert into public.events (name, slug, website_url, description)
  values (v_name, v_slug, v_website_url, v_description)
  returning id into v_event_id;

  for v_race in select value from jsonb_array_elements(p_races) loop
    insert into public.races (
      event_id,
      name,
      date,
      distance_km,
      elevation_gain_m,
      website_url,
      city,
      province,
      description,
      organizer_id
    ) values (
      v_event_id,
      nullif(trim(v_race ->> 'name'), ''),
      nullif(trim(coalesce(v_race ->> 'date', '')), '')::date,
      (v_race ->> 'distance_km')::numeric,
      nullif(trim(coalesce(v_race ->> 'elevation_gain_m', '')), '')::integer,
      v_website_url,
      nullif(trim(v_race ->> 'city'), ''),
      nullif(trim(v_race ->> 'province'), ''),
      null,
      null
    )
    returning id into v_race_id;

    v_tiers := coalesce(v_race -> 'tiers', '[]'::jsonb);
    if jsonb_typeof(v_tiers) <> 'array' then
      raise exception 'Race tiers must be an array' using errcode = 'P0001';
    end if;

    for v_tier in select value from jsonb_array_elements(v_tiers) loop
      insert into public.race_tiers (race_id, price_eur, starts_at, ends_at)
      values (
        v_race_id,
        (v_tier ->> 'price_eur')::integer,
        nullif(v_tier ->> 'starts_at', '')::date,
        nullif(v_tier ->> 'ends_at', '')::date
      );
    end loop;
  end loop;

  return v_event_id;
end;
$function$;

revoke all on function public.create_event_with_races(jsonb, jsonb) from public;
grant execute on function public.create_event_with_races(jsonb, jsonb) to authenticated;
grant execute on function public.create_event_with_races(jsonb, jsonb) to service_role;

create or replace function public.update_event_with_races(
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
  v_race jsonb;
  v_race_id uuid;
  v_keep_race_ids uuid[] := '{}';
  v_tier jsonb;
  v_tiers jsonb;
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
    name = p_event ->> 'name',
    website_url = nullif(p_event ->> 'website_url', ''),
    description = nullif(p_event ->> 'description', ''),
    updated_at = now()
  where id = p_event_id;

  for v_race in select value from jsonb_array_elements(p_races) loop
    v_race_id := nullif(v_race ->> 'id', '')::uuid;

    if v_race_id is not null then
      if not exists (
        select 1
        from public.races
        where id = v_race_id
          and event_id = p_event_id
      ) then
        raise exception 'Race does not belong to event' using errcode = 'P0003';
      end if;

      update public.races
      set
        name = v_race ->> 'name',
        date = nullif(v_race ->> 'date', '')::date,
        city = v_race ->> 'city',
        province = v_race ->> 'province',
        distance_km = (v_race ->> 'distance_km')::numeric,
        elevation_gain_m = nullif(v_race ->> 'elevation_gain_m', '')::integer,
        updated_at = now()
      where id = v_race_id
        and event_id = p_event_id;
    else
      insert into public.races (
        event_id,
        name,
        date,
        city,
        province,
        distance_km,
        elevation_gain_m
      ) values (
        p_event_id,
        v_race ->> 'name',
        nullif(v_race ->> 'date', '')::date,
        v_race ->> 'city',
        v_race ->> 'province',
        (v_race ->> 'distance_km')::numeric,
        nullif(v_race ->> 'elevation_gain_m', '')::integer
      )
      returning id into v_race_id;
    end if;

    v_keep_race_ids := array_append(v_keep_race_ids, v_race_id);
    delete from public.race_tiers where race_id = v_race_id;

    v_tiers := coalesce(v_race -> 'tiers', '[]'::jsonb);
    if jsonb_typeof(v_tiers) <> 'array' then
      raise exception 'Race tiers must be an array' using errcode = 'P0001';
    end if;

    for v_tier in select value from jsonb_array_elements(v_tiers) loop
      insert into public.race_tiers (race_id, price_eur, starts_at, ends_at)
      values (
        v_race_id,
        (v_tier ->> 'price_eur')::integer,
        nullif(v_tier ->> 'starts_at', '')::date,
        nullif(v_tier ->> 'ends_at', '')::date
      );
    end loop;
  end loop;

  delete from public.races
  where event_id = p_event_id
    and not (id = any(v_keep_race_ids));

  return p_event_id;
end;
$function$;

revoke all on function public.update_event_with_races(uuid, jsonb, jsonb) from public;
grant execute on function public.update_event_with_races(uuid, jsonb, jsonb) to authenticated;
grant execute on function public.update_event_with_races(uuid, jsonb, jsonb) to service_role;

create or replace function public.create_event_edition(
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
  v_event_website_url text;
  v_race jsonb;
  v_race_id uuid;
  v_tier jsonb;
  v_tiers jsonb;
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
    name = p_event ->> 'name',
    website_url = nullif(p_event ->> 'website_url', ''),
    description = nullif(p_event ->> 'description', ''),
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
    ) values (
      p_event_id,
      v_race ->> 'name',
      nullif(v_race ->> 'date', '')::date,
      v_race ->> 'city',
      v_race ->> 'province',
      (v_race ->> 'distance_km')::numeric,
      nullif(v_race ->> 'elevation_gain_m', '')::integer,
      v_event_website_url,
      null,
      null
    )
    returning id into v_race_id;

    v_tiers := coalesce(v_race -> 'tiers', '[]'::jsonb);
    if jsonb_typeof(v_tiers) <> 'array' then
      raise exception 'Race tiers must be an array' using errcode = 'P0001';
    end if;

    for v_tier in select value from jsonb_array_elements(v_tiers) loop
      insert into public.race_tiers (race_id, price_eur, starts_at, ends_at)
      values (
        v_race_id,
        (v_tier ->> 'price_eur')::integer,
        nullif(v_tier ->> 'starts_at', '')::date,
        nullif(v_tier ->> 'ends_at', '')::date
      );
    end loop;
  end loop;

  return p_event_id;
end;
$function$;

revoke all on function public.create_event_edition(uuid, jsonb, jsonb) from public;
grant execute on function public.create_event_edition(uuid, jsonb, jsonb) to authenticated;
grant execute on function public.create_event_edition(uuid, jsonb, jsonb) to service_role;

drop policy if exists "Organizers can delete their own prices" on public.race_tiers;
create policy "Organizers can delete their own prices"
on public.race_tiers
for delete
to authenticated
using (
  exists (
    select 1
    from public.races r
    join public.organizers o on o.id = r.organizer_id
    where r.id = race_tiers.race_id
      and o.owner_id = (select auth.uid())
  )
);

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
  v_tier jsonb;
  v_tiers jsonb;
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

  update public.events
  set
    name = p_event ->> 'name',
    website_url = nullif(p_event ->> 'website_url', ''),
    description = nullif(p_event ->> 'description', ''),
    updated_at = now()
  where id = p_event_id
    and organizer_id = p_organizer_id
  returning website_url into v_event_website_url;

  for v_race in select value from jsonb_array_elements(p_races) loop
    v_race_id := nullif(v_race ->> 'id', '')::uuid;

    if v_race_id is not null then
      if not exists (
        select 1
        from public.races
        where id = v_race_id
          and event_id = p_event_id
      ) then
        raise exception 'Race does not belong to event' using errcode = 'P0003';
      end if;

      update public.races
      set
        name = v_race ->> 'name',
        date = nullif(v_race ->> 'date', '')::date,
        city = v_race ->> 'city',
        province = v_race ->> 'province',
        distance_km = (v_race ->> 'distance_km')::numeric,
        elevation_gain_m = nullif(v_race ->> 'elevation_gain_m', '')::integer,
        website_url = v_event_website_url,
        organizer_id = p_organizer_id,
        updated_at = now()
      where id = v_race_id
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
      ) values (
        p_event_id,
        v_race ->> 'name',
        nullif(v_race ->> 'date', '')::date,
        v_race ->> 'city',
        v_race ->> 'province',
        (v_race ->> 'distance_km')::numeric,
        nullif(v_race ->> 'elevation_gain_m', '')::integer,
        v_event_website_url,
        null,
        p_organizer_id
      )
      returning id into v_race_id;
    end if;

    v_kept_race_ids := array_append(v_kept_race_ids, v_race_id);
    delete from public.race_tiers where race_id = v_race_id;

    v_tiers := coalesce(v_race -> 'tiers', '[]'::jsonb);
    if jsonb_typeof(v_tiers) <> 'array' then
      raise exception 'Race tiers must be an array' using errcode = 'P0001';
    end if;

    for v_tier in select value from jsonb_array_elements(v_tiers) loop
      insert into public.race_tiers (race_id, price_eur, starts_at, ends_at)
      values (
        v_race_id,
        (v_tier ->> 'price_eur')::integer,
        nullif(v_tier ->> 'starts_at', '')::date,
        nullif(v_tier ->> 'ends_at', '')::date
      );
    end loop;
  end loop;

  delete from public.races
  where event_id = p_event_id
    and not (id = any(v_kept_race_ids));

  return p_event_id;
end;
$function$;

revoke all on function public.update_organizer_event_with_races(uuid, uuid, jsonb, jsonb) from public;
grant execute on function public.update_organizer_event_with_races(uuid, uuid, jsonb, jsonb) to authenticated;
grant execute on function public.update_organizer_event_with_races(uuid, uuid, jsonb, jsonb) to service_role;

create or replace function public.get_events_with_races()
returns table(
  id uuid,
  name text,
  slug text,
  website_url text,
  organizer_id uuid,
  description text,
  hero_image_filename text,
  updated_at timestamp with time zone,
  races jsonb
)
language sql
stable
security invoker
set search_path to ''
as $function$
  select
    e.id,
    e.name,
    e.slug,
    e.website_url,
    e.organizer_id,
    e.description,
    e.hero_image_filename,
    e.updated_at,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'event_id', r.event_id,
          'id', r.id,
          'name', r.name,
          'date', r.date,
          'distance_km', r.distance_km,
          'elevation_gain_m', r.elevation_gain_m,
          'city', r.city,
          'province', r.province,
          'map_url', r.map_url,
          'race_tiers', coalesce(t.tiers, '[]'::jsonb)
        )
        order by r.date nulls last, r.distance_km desc, r.name
      ) filter (where r.id is not null),
      '[]'::jsonb
    ) as races
  from public.events e
  left join public.races r on r.event_id = e.id
  left join lateral (
    select jsonb_agg(
      jsonb_build_object(
        'id', rt.id,
        'price_eur', rt.price_eur,
        'starts_at', rt.starts_at,
        'ends_at', rt.ends_at
      )
      order by rt.starts_at nulls last, rt.ends_at nulls last, rt.price_eur nulls last
    ) as tiers
    from public.race_tiers rt
    where rt.race_id = r.id
  ) t on true
  group by
    e.id,
    e.name,
    e.slug,
    e.website_url,
    e.organizer_id,
    e.description,
    e.hero_image_filename,
    e.updated_at
  order by e.name;
$function$;
