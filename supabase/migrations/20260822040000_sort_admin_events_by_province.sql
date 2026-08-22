create or replace function public.get_admin_events_page(
  p_limit integer,
  p_offset integer,
  p_search text default null,
  p_sort_column text default 'dates',
  p_sort_direction text default 'asc'
)
returns table (
  event_ids uuid[],
  total_count bigint
)
language plpgsql
stable
security invoker
set search_path to ''
as $$
declare
  v_search text := lower(nullif(btrim(p_search), ''));
begin
  if p_limit < 1 or p_limit > 100 then
    raise exception 'p_limit must be between 1 and 100'
      using errcode = '22023';
  end if;

  if p_offset < 0 then
    raise exception 'p_offset must be non-negative'
      using errcode = '22023';
  end if;

  if p_sort_column not in ('dates', 'name', 'province') then
    raise exception 'p_sort_column must be dates, name or province'
      using errcode = '22023';
  end if;

  if p_sort_direction not in ('asc', 'desc') then
    raise exception 'p_sort_direction must be asc or desc'
      using errcode = '22023';
  end if;

  return query
  with race_anchor as (
    select
      race.event_id,
      coalesce(
        min(race.date) filter (where race.date >= current_date),
        max(race.date)
      ) as anchor_date
    from public.races as race
    where race.date is not null
    group by race.event_id
  ),
  event_start as (
    select
      race.event_id,
      min(race.date) as start_date
    from public.races as race
    join race_anchor as anchor on anchor.event_id = race.event_id
    where race.date is not null
      and extract(year from race.date) = extract(year from anchor.anchor_date)
    group by race.event_id
  ),
  event_province as (
    select
      race.event_id,
      string_agg(distinct race.province, ', ' order by race.province) as provinces
    from public.races as race
    group by race.event_id
  ),
  event_index as (
    select
      event.id,
      event.name,
      event_start.start_date,
      event_province.provinces
    from public.events as event
    left join event_start on event_start.event_id = event.id
    left join event_province on event_province.event_id = event.id
    where
      v_search is null
      or strpos(lower(event.name), v_search) > 0
      or strpos(lower(coalesce(event.website_url, '')), v_search) > 0
  ),
  ordered_events as (
    select
      event_index.id,
      row_number() over (
        order by
          case
            when p_sort_column = 'dates' and p_sort_direction = 'asc'
              then event_index.start_date
          end asc nulls first,
          case
            when p_sort_column = 'dates' and p_sort_direction = 'desc'
              then event_index.start_date
          end desc nulls first,
          case
            when p_sort_column = 'name' and p_sort_direction = 'asc'
              then lower(event_index.name)
          end asc,
          case
            when p_sort_column = 'name' and p_sort_direction = 'desc'
              then lower(event_index.name)
          end desc,
          case
            when p_sort_column = 'province' and p_sort_direction = 'asc'
              then lower(event_index.provinces)
          end asc nulls last,
          case
            when p_sort_column = 'province' and p_sort_direction = 'desc'
              then lower(event_index.provinces)
          end desc nulls last,
          lower(event_index.name) asc,
          event_index.id asc
      ) as position
    from event_index
  ),
  page_events as (
    select ordered_event.id, ordered_event.position
    from ordered_events as ordered_event
    where
      ordered_event.position > p_offset
      and ordered_event.position <= p_offset + p_limit
  )
  select
    coalesce(
      array_agg(page_event.id order by page_event.position),
      '{}'::uuid[]
    ) as event_ids,
    (select count(*) from event_index)::bigint as total_count
  from page_events as page_event;
end;
$$;

revoke all on function public.get_admin_events_page(
  integer,
  integer,
  text,
  text,
  text
) from public;

revoke all on function public.get_admin_events_page(
  integer,
  integer,
  text,
  text,
  text
) from anon, authenticated;

grant execute on function public.get_admin_events_page(
  integer,
  integer,
  text,
  text,
  text
) to service_role;
