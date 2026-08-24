create or replace function public.event_slug(p_name text)
returns text
language sql
immutable
set search_path to ''
as $function$
  select coalesce(
    nullif(
      trim(both '-' from regexp_replace(
        lower(translate(
          regexp_replace(p_name, '[''’ʼ´`·]', '', 'g'),
          'àáâäãåèéêëìíîïòóôöõøùúûüçñýÿŀÀÁÂÄÃÅÈÉÊËÌÍÎÏÒÓÔÖÕØÙÚÛÜÇÑÝĿ',
          'aaaaaaeeeeiiiioooooouuuucnyylAAAAAAEEEEIIIIOOOOOOUUUUCNYL'
        )),
        '[^a-z0-9]+', '-', 'g'
      )),
      ''
    ),
    'event'
  );
$function$;

revoke all on function public.event_slug(text) from public;
grant execute on function public.event_slug(text) to authenticated;
grant execute on function public.event_slug(text) to service_role;

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
  v_tier_count integer;
  v_tier_price numeric;
  v_tier_end_text text;
  v_tier_end date;
  v_previous_tier_end date;
begin
  if p_event is null or jsonb_typeof(p_event) <> 'object' then
    raise exception 'Event is required' using errcode = 'P0001';
  end if;

  if p_races is null or jsonb_typeof(p_races) <> 'array' or jsonb_array_length(p_races) = 0 then
    raise exception 'At least one race is required' using errcode = 'P0001';
  end if;

  for v_race in select value from jsonb_array_elements(p_races) loop
    v_tiers := coalesce(v_race -> 'tiers', '[]'::jsonb);
    if jsonb_typeof(v_tiers) <> 'array' then
      raise exception 'Race tiers must be an array' using errcode = 'P0001';
    end if;

    v_tier_count := jsonb_array_length(v_tiers);
    if v_tier_count > 5 then
      raise exception 'Race tiers cannot exceed 5' using errcode = 'P0001';
    end if;

    v_previous_tier_end := null;
    for v_tier in select value from jsonb_array_elements(v_tiers) loop
      if jsonb_typeof(v_tier) <> 'object' then
        raise exception 'Race tier must be an object' using errcode = 'P0001';
      end if;

      if jsonb_typeof(v_tier -> 'price_eur') is distinct from 'number' then
        raise exception 'Race tier price must be an integer between 0 and 9999' using errcode = 'P0001';
      end if;

      v_tier_price := (v_tier ->> 'price_eur')::numeric;
      if trunc(v_tier_price) <> v_tier_price or v_tier_price < 0 or v_tier_price > 9999 then
        raise exception 'Race tier price must be an integer between 0 and 9999' using errcode = 'P0001';
      end if;

      v_tier_end_text := nullif(trim(coalesce(v_tier ->> 'ends_at', '')), '');
      if v_tier_count > 1 and v_tier_end_text is null then
        raise exception 'Race tier deadline is required when multiple tiers are submitted' using errcode = 'P0001';
      end if;

      if v_tier_end_text is not null then
        if jsonb_typeof(v_tier -> 'ends_at') is distinct from 'string'
          or v_tier_end_text !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        then
          raise exception 'Race tier deadline is invalid' using errcode = 'P0001';
        end if;

        begin
          v_tier_end := v_tier_end_text::date;
        exception
          when datetime_field_overflow or invalid_datetime_format then
            raise exception 'Race tier deadline is invalid' using errcode = 'P0001';
        end;

        if v_previous_tier_end is not null and v_tier_end <= v_previous_tier_end then
          raise exception 'Race tier deadlines must be strictly increasing' using errcode = 'P0001';
        end if;

        v_previous_tier_end := v_tier_end;
      end if;
    end loop;
  end loop;

  v_name := nullif(trim(p_event ->> 'name'), '');
  v_description := nullif(trim(coalesce(p_event ->> 'description', '')), '');
  v_website_url := nullif(trim(coalesce(p_event ->> 'website_url', p_event ->> 'websiteUrl', '')), '');

  if v_name is null then
    raise exception 'Event name is required' using errcode = 'P0001';
  end if;

  v_base_slug := public.event_slug(v_name);
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
