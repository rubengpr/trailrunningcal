create index if not exists races_date_event_id_idx
on public.races (date, event_id)
where date is not null;

create or replace function public.get_public_events_page(
  p_reference_date date,
  p_offset integer default 0,
  p_months smallint[] default '{}'::smallint[],
  p_provinces text[] default '{}'::text[],
  p_distance_ranges text[] default '{}'::text[],
  p_race_types text[] default '{}'::text[],
  p_scope_province text default null,
  p_scope_race_type text default null
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
    select
      r.event_id,
      min(r.date) as start_date
    from public.races r
    where r.date > p_reference_date
    group by r.event_id
  ),
  relevant_races as (
    select
      r.id,
      r.event_id,
      r.name,
      r.date,
      r.distance_km,
      r.elevation_gain_m,
      r.city,
      r.province,
      array_remove(
        array[
          case
            when lower(coalesce(r.name, '')) like any (
              array['%marcha%', '%marxa%', '%caminada%']
            ) then 'marcha'
          end,
          case
            when lower(coalesce(r.name, '')) like '%backyard%' then 'backyard'
          end,
          case
            when lower(coalesce(r.name, '')) like any (
              array[
                '%kilómetro vertical%',
                '%quilòmetre vertical%',
                '%km vertical%'
              ]
            )
              or lower(coalesce(r.name, '')) like 'kv %'
              or lower(coalesce(r.name, '')) like '% kv'
              or lower(coalesce(r.name, '')) like '% kv %'
              or (
                r.distance_km < 4
                and r.elevation_gain_m >= 600
              )
              then 'km-vertical'
          end,
          case when r.distance_km >= 50 then 'ultra-trail' end,
          case
            when r.distance_km >= 40 and r.distance_km < 50 then 'maraton'
          end,
          case
            when r.distance_km >= 20 and r.distance_km <= 24
              then 'media-maraton'
          end
        ],
        null
      ) as categories
    from public.races r
    join upcoming_dates u on u.event_id = r.event_id
    where r.date > p_reference_date
      and extract(year from r.date) = extract(year from u.start_date)
  ),
  event_summaries as (
    select
      e.id,
      e.name,
      e.slug,
      u.start_date,
      max(rr.date) as end_date
    from public.events e
    join upcoming_dates u on u.event_id = e.id
    join relevant_races rr on rr.event_id = e.id
    group by e.id, e.name, e.slug, u.start_date
  ),
  filtered_events as (
    select es.*
    from event_summaries es
    where (
      coalesce(cardinality(p_months), 0) = 0
      or extract(month from es.start_date)::smallint = any(p_months)
    )
      and (
        p_scope_province is null
        or exists (
          select 1
          from relevant_races rr
          where rr.event_id = es.id
            and rr.province = p_scope_province
        )
      )
      and (
        coalesce(cardinality(p_provinces), 0) = 0
        or exists (
          select 1
          from relevant_races rr
          where rr.event_id = es.id
            and rr.province = any(p_provinces)
        )
      )
      and (
        coalesce(cardinality(p_distance_ranges), 0) = 0
        or exists (
          select 1
          from relevant_races rr
          where rr.event_id = es.id
            and exists (
              select 1
              from unnest(p_distance_ranges) as selected(distance_range)
              where case selected.distance_range
                when '0-10' then rr.distance_km >= 0 and rr.distance_km < 10
                when '10-20' then rr.distance_km >= 10 and rr.distance_km < 20
                when '20-30' then rr.distance_km >= 20 and rr.distance_km < 30
                when '30-40' then rr.distance_km >= 30 and rr.distance_km < 40
                when '40-50' then rr.distance_km >= 40 and rr.distance_km < 50
                when '50+' then rr.distance_km >= 50
                else false
              end
            )
        )
      )
      and (
        coalesce(cardinality(p_race_types), 0) = 0
        or exists (
          select 1
          from relevant_races rr
          where rr.event_id = es.id
            and rr.categories && p_race_types
        )
      )
      and (
        p_scope_race_type is null
        or exists (
          select 1
          from relevant_races rr
          where rr.event_id = es.id
            and p_scope_race_type = any(rr.categories)
        )
      )
  ),
  counted_events as (
    select
      fe.*,
      count(*) over () as total_count
    from filtered_events fe
  ),
  paged_events as (
    select ce.*
    from counted_events ce
    order by ce.start_date, ce.name, ce.id
    offset greatest(coalesce(p_offset, 0), 0)
    limit 100
  )
  select
    pe.id,
    pe.name,
    pe.slug,
    pe.start_date,
    pe.end_date,
    pe.total_count,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'event_id', rr.event_id,
          'id', rr.id,
          'name', rr.name,
          'date', rr.date,
          'distance_km', rr.distance_km,
          'elevation_gain_m', rr.elevation_gain_m,
          'city', rr.city,
          'province', rr.province,
          'latitude', cl.latitude,
          'longitude', cl.longitude
        )
        order by rr.date, rr.distance_km desc, rr.name, rr.id
      ),
      '[]'::jsonb
    ) as races
  from paged_events pe
  join relevant_races rr on rr.event_id = pe.id
  left join public.city_locations cl
    on cl.city = rr.city
    and cl.province = rr.province
  group by
    pe.id,
    pe.name,
    pe.slug,
    pe.start_date,
    pe.end_date,
    pe.total_count
  order by pe.start_date, pe.name, pe.id;
$function$;

revoke all on function public.get_public_events_page(
  date,
  integer,
  smallint[],
  text[],
  text[],
  text[],
  text,
  text
) from public;

grant execute on function public.get_public_events_page(
  date,
  integer,
  smallint[],
  text[],
  text[],
  text[],
  text,
  text
) to anon, authenticated, service_role;
