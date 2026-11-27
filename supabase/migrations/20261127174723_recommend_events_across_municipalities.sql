create or replace function public.get_recommended_events(
  p_province text,
  p_exclude_event_id uuid,
  p_after_date date,
  p_limit integer default 7
)
returns table (
  id uuid,
  name text,
  slug text,
  website_url text,
  organizer_id uuid,
  description text,
  hero_image_filename text,
  races jsonb
)
language sql
stable
security invoker
as $function$
with event_start_dates as (
    select
      e.id,
      min(r.date) as selected_start_date
    from public.events e
    join public.races r on r.event_id = e.id
    where e.id <> p_exclude_event_id
      and r.date >= p_after_date
    group by e.id
  ),
  selected_races as (
    select
      esd.id as event_id,
      esd.selected_start_date,
      r.id,
      r.name,
      r.date,
      r.distance_km,
      r.elevation_gain_m,
      r.city,
      r.province,
      r.map_url
    from event_start_dates esd
    join public.races r on r.event_id = esd.id
    where r.date is not null
      and extract(year from r.date) = extract(year from esd.selected_start_date)
  ),
  province_events as (
    select
      event_id,
      min(selected_start_date) as selected_start_date
    from selected_races
    group by event_id
    having count(distinct nullif(trim(province), '')) = 1
      and min(nullif(trim(province), '')) = p_province
  ),
  limited_events as (
    select
      e.id,
      e.name,
      e.slug,
      e.website_url,
      e.organizer_id,
      e.description,
      e.hero_image_filename,
      sle.selected_start_date
    from province_events sle
    join public.events e on e.id = sle.event_id
    order by sle.selected_start_date asc, e.name asc
    limit p_limit
  )
  select
    le.id,
    le.name,
    le.slug,
    le.website_url,
    le.organizer_id,
    le.description,
    le.hero_image_filename,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', sr.id,
          'name', sr.name,
          'date', sr.date,
          'distance_km', sr.distance_km,
          'elevation_gain_m', sr.elevation_gain_m,
          'city', sr.city,
          'province', sr.province,
          'map_url', sr.map_url,
          'race_tiers', null
        )
        order by sr.distance_km desc, sr.name asc
      ),
      '[]'::jsonb
    ) as races
  from limited_events le
  join selected_races sr on sr.event_id = le.id
  group by
    le.id,
    le.name,
    le.slug,
    le.website_url,
    le.organizer_id,
    le.description,
    le.hero_image_filename,
    le.selected_start_date
  order by le.selected_start_date asc, le.name asc;
$function$;

revoke execute on function public.get_recommended_events(text, uuid, date, integer) from public;
grant execute on function public.get_recommended_events(text, uuid, date, integer)
  to anon, authenticated, service_role;
