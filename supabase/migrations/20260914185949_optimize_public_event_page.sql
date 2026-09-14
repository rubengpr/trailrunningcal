create index if not exists races_event_id_date_idx
on public.races (event_id, date)
where date is not null;

create or replace function public.get_public_events_page(
  p_reference_date date,
  p_offset integer default 0,
  p_months smallint[] default '{}'::smallint[],
  p_provinces text[] default '{}'::text[],
  p_distance_ranges text[] default '{}'::text[],
  p_race_types text[] default '{}'::text[],
  p_scope_province text default null,
  p_scope_provinces text[] default '{}'::text[],
  p_scope_race_type text default null,
  p_include_locations boolean default true
)
returns table(
  id uuid,
  name text,
  slug text,
  start_date date,
  end_date date,
  total_count bigint,
  races jsonb
)
language sql
stable
security invoker
set search_path to ''
as $function$
  with upcoming_dates as (
    select distinct on (race.event_id)
      race.event_id,
      race.date as start_date
    from public.races as race
    where race.date > p_reference_date
    order by race.event_id, race.date, race.id
  ),
  relevant_races as materialized (
    select
      race.id,
      race.event_id,
      race.name,
      race.date,
      race.distance_km,
      race.elevation_gain_m,
      race.city,
      race.province,
      array_remove(
        array[
          case
            when lower(coalesce(race.name, '')) like any (
              array['%marcha%', '%marxa%', '%caminada%']
            ) then 'marcha'
          end,
          case
            when lower(coalesce(race.name, '')) like '%backyard%' then 'backyard'
          end,
          case
            when lower(concat_ws(' ', event.name, race.name)) like '%vertical%'
              or lower(concat_ws(' ', event.name, race.name)) like '%vertik%'
              or lower(concat_ws(' ', event.name, race.name)) ~ '(^|[^[:alnum:]])kmv([^[:alnum:]]|$)'
              or lower(concat_ws(' ', event.name, race.name)) ~ '(^|[^[:alnum:]])kv([^[:alnum:]]|$)|kv$'
              or (
                race.distance_km <= 8
                and race.elevation_gain_m >= 500
                and race.elevation_gain_m::numeric / nullif(race.distance_km, 0) >= 100
              ) then 'km-vertical'
          end,
          case when race.distance_km >= 50 then 'ultra-trail' end,
          case when race.distance_km >= 40 and race.distance_km < 50 then 'maraton' end,
          case when race.distance_km >= 20 and race.distance_km <= 24 then 'media-maraton' end
        ],
        null
      ) as categories
    from upcoming_dates as upcoming
    join public.races as race
      on race.event_id = upcoming.event_id
      and race.date >= make_date(extract(year from upcoming.start_date)::integer, 1, 1)
      and race.date < make_date(extract(year from upcoming.start_date)::integer + 1, 1, 1)
    join public.events as event on event.id = race.event_id
  ),
  event_summaries as (
    select
      event.id,
      event.name,
      event.slug,
      upcoming.start_date,
      max(race.date) as end_date,
      bool_or(race.province = p_scope_province) as matches_scope_province,
      bool_or(race.province = any(p_scope_provinces)) as matches_scope_provinces,
      bool_or(race.province = any(p_provinces)) as matches_provinces,
      bool_or(
        ('0-10' = any(p_distance_ranges) and race.distance_km >= 0 and race.distance_km < 10)
        or ('10-20' = any(p_distance_ranges) and race.distance_km >= 10 and race.distance_km < 20)
        or ('20-30' = any(p_distance_ranges) and race.distance_km >= 20 and race.distance_km < 30)
        or ('30-40' = any(p_distance_ranges) and race.distance_km >= 30 and race.distance_km < 40)
        or ('40-50' = any(p_distance_ranges) and race.distance_km >= 40 and race.distance_km < 50)
        or ('50+' = any(p_distance_ranges) and race.distance_km >= 50)
      ) as matches_distance,
      bool_or(race.categories && p_race_types) as matches_race_types,
      bool_or(p_scope_race_type = any(race.categories)) as matches_scope_race_type
    from public.events as event
    join upcoming_dates as upcoming on upcoming.event_id = event.id
    join relevant_races as race on race.event_id = event.id
    group by event.id, event.name, event.slug, upcoming.start_date
  ),
  filtered_events as (
    select summary.*
    from event_summaries as summary
    where (
      coalesce(cardinality(p_months), 0) = 0
      or extract(month from summary.start_date)::smallint = any(p_months)
    )
      and (p_scope_province is null or summary.matches_scope_province)
      and (
        coalesce(cardinality(p_scope_provinces), 0) = 0
        or summary.matches_scope_provinces
      )
      and (
        coalesce(cardinality(p_provinces), 0) = 0
        or summary.matches_provinces
      )
      and (
        coalesce(cardinality(p_distance_ranges), 0) = 0
        or summary.matches_distance
      )
      and (
        coalesce(cardinality(p_race_types), 0) = 0
        or summary.matches_race_types
      )
      and (p_scope_race_type is null or summary.matches_scope_race_type)
  ),
  paged_events as (
    select
      filtered.*,
      count(*) over () as total_count
    from filtered_events as filtered
    order by filtered.start_date, filtered.name, filtered.id
    offset greatest(coalesce(p_offset, 0), 0)
    limit 100
  )
  select
    page.id,
    page.name,
    page.slug,
    page.start_date,
    page.end_date,
    page.total_count,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'event_id', race.event_id,
          'id', race.id,
          'name', race.name,
          'date', race.date,
          'distance_km', race.distance_km,
          'elevation_gain_m', race.elevation_gain_m,
          'city', race.city,
          'province', race.province
        ) || case
          when p_include_locations then jsonb_build_object(
            'latitude', location.latitude,
            'longitude', location.longitude
          )
          else '{}'::jsonb
        end
        order by race.date, race.distance_km desc, race.name, race.id
      ),
      '[]'::jsonb
    ) as races
  from paged_events as page
  join relevant_races as race on race.event_id = page.id
  left join public.city_locations as location
    on p_include_locations
    and location.city = race.city
    and location.province = race.province
  group by
    page.id,
    page.name,
    page.slug,
    page.start_date,
    page.end_date,
    page.total_count
  order by page.start_date, page.name, page.id;
$function$;

revoke all on function public.get_public_events_page(
  date,
  integer,
  smallint[],
  text[],
  text[],
  text[],
  text,
  text[],
  text,
  boolean
) from public;

grant execute on function public.get_public_events_page(
  date,
  integer,
  smallint[],
  text[],
  text[],
  text[],
  text,
  text[],
  text,
  boolean
) to anon, authenticated, service_role;
