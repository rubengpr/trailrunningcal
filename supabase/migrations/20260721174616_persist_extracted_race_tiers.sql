create or replace function public.accept_event_draft(
  p_draft_id uuid
)
returns uuid
language plpgsql
security invoker
set search_path to ''
as $function$
declare
  v_draft public.event_drafts%rowtype;
  v_event_website_url text;
  v_race jsonb;
  v_race_id uuid;
  v_tiers jsonb;
  v_tier jsonb;
  v_tier_count integer;
  v_tier_price numeric;
  v_tier_end_text text;
  v_tier_end date;
  v_previous_tier_end date;
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

  if not exists (
    select 1 from public.events where id = v_draft.event_id
  ) then
    raise exception 'Event not found' using errcode = 'P0003';
  end if;

  for v_race in
    select value from jsonb_array_elements(v_draft.data -> 'races')
  loop
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

      if jsonb_typeof(v_tier -> 'priceEur') is distinct from 'number' then
        raise exception 'Race tier price must be an integer between 0 and 9999'
          using errcode = 'P0001';
      end if;

      v_tier_price := (v_tier ->> 'priceEur')::numeric;
      if trunc(v_tier_price) <> v_tier_price
        or v_tier_price < 0
        or v_tier_price > 9999
      then
        raise exception 'Race tier price must be an integer between 0 and 9999'
          using errcode = 'P0001';
      end if;

      v_tier_end_text := nullif(
        trim(coalesce(v_tier ->> 'endsAt', '')),
        ''
      );
      if v_tier_count > 1 and v_tier_end_text is null then
        raise exception 'Race tier deadline is required when multiple tiers are submitted'
          using errcode = 'P0001';
      end if;

      if v_tier_end_text is not null then
        if jsonb_typeof(v_tier -> 'endsAt') is distinct from 'string'
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

        if v_previous_tier_end is not null
          and v_tier_end <= v_previous_tier_end
        then
          raise exception 'Race tier deadlines must be strictly increasing'
            using errcode = 'P0001';
        end if;

        v_previous_tier_end := v_tier_end;
      end if;
    end loop;
  end loop;

  update public.events
  set
    name = v_draft.data -> 'event' ->> 'name',
    website_url = nullif(v_draft.data -> 'event' ->> 'websiteUrl', ''),
    description = nullif(v_draft.data -> 'event' ->> 'description', ''),
    updated_at = now()
  where id = v_draft.event_id
  returning website_url into v_event_website_url;

  for v_race in
    select value from jsonb_array_elements(v_draft.data -> 'races')
  loop
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
      v_race ->> 'name',
      nullif(v_race ->> 'date', '')::date,
      v_race ->> 'city',
      v_race ->> 'province',
      (v_race ->> 'distanceKm')::numeric,
      nullif(v_race ->> 'elevationGainM', '')::integer,
      v_event_website_url,
      null,
      null
    )
    returning id into v_race_id;

    v_tiers := coalesce(v_race -> 'tiers', '[]'::jsonb);
    for v_tier in select value from jsonb_array_elements(v_tiers) loop
      insert into public.race_tiers (race_id, price_eur, ends_at)
      values (
        v_race_id,
        (v_tier ->> 'priceEur')::integer,
        nullif(v_tier ->> 'endsAt', '')::date
      );
    end loop;
  end loop;

  update public.event_drafts
  set
    status = 'accepted',
    updated_at = now()
  where id = v_draft.id;

  return v_draft.event_id;
end;
$function$;

revoke all on function public.accept_event_draft(uuid) from public;
grant execute on function public.accept_event_draft(uuid) to authenticated;
grant execute on function public.accept_event_draft(uuid) to service_role;
