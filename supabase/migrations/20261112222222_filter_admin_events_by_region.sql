drop function public.get_admin_events_page(integer, integer, text, text, text, text);

create function public.get_admin_events_page(
  p_limit integer,
  p_offset integer,
  p_search text default null,
  p_province text default null,
  p_sort_column text default 'dates',
  p_sort_direction text default 'asc',
  p_provinces text[] default null
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
  v_province text := nullif(btrim(p_province), '');
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
      (v_search is null
        or strpos(lower(event.name), v_search) > 0
        or strpos(lower(coalesce(event.website_url, '')), v_search) > 0)
      and (p_provinces is null or exists (
        select 1 from public.races as race
        where race.event_id = event.id and race.province = any(p_provinces)
      ))
      and (
        v_province is null
        or exists (
          select 1
          from public.races as race
          where race.event_id = event.id
            and race.province = v_province
        )
      )
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

revoke all on function public.get_admin_events_page(integer, integer, text, text, text, text, text[]) from public, anon, authenticated;
grant execute on function public.get_admin_events_page(integer, integer, text, text, text, text, text[]) to service_role;

drop function public.get_event_import_drafts_page(integer, integer, text, uuid, text, text, text);

create function public.get_event_import_drafts_page(
  p_limit integer,
  p_offset integer,
  p_search text default null,
  p_draft_id uuid default null,
  p_sort_column text default 'dates',
  p_sort_direction text default 'asc',
  p_province text default null,
  p_provinces text[] default null
)
returns table (
  draft_ids uuid[],
  total_count bigint,
  publications jsonb
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
    raise exception 'p_limit must be between 1 and 100' using errcode = '22023';
  end if;

  if p_offset < 0 then
    raise exception 'p_offset must be non-negative' using errcode = '22023';
  end if;

  if p_sort_column not in ('dates', 'name', 'races') then
    raise exception 'p_sort_column must be dates, name or races' using errcode = '22023';
  end if;

  if p_sort_direction not in ('asc', 'desc') then
    raise exception 'p_sort_direction must be asc or desc' using errcode = '22023';
  end if;

  return query
  with filtered_drafts as (
    select
      draft.id,
      draft.data -> 'event' ->> 'name' as name,
      jsonb_array_length(coalesce(draft.data -> 'races', '[]'::jsonb)) as race_count,
      (
        select min(case
          when race ->> 'date' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
            and pg_input_is_valid(race ->> 'date', 'date')
          then (race ->> 'date')::date
        end)
        from jsonb_array_elements(coalesce(draft.data -> 'races', '[]'::jsonb)) as race
      ) as start_date
    from public.event_import_drafts as draft
    where draft.status = 'draft'
      and (p_draft_id is null or draft.id = p_draft_id)
      and (p_provinces is null or exists (
        select 1 from jsonb_array_elements(coalesce(draft.data -> 'races', '[]'::jsonb)) as race
        where race ->> 'province' = any(p_provinces)
      ))
      and (
        p_province is null
        or exists (
          select 1
          from jsonb_array_elements(coalesce(draft.data -> 'races', '[]'::jsonb)) as race
          where race ->> 'province' = p_province
        )
      )
      and (
        p_draft_id is not null
        or v_search is null
        or strpos(lower(draft.data -> 'event' ->> 'name'), v_search) > 0
        or strpos(lower(coalesce(draft.source_url, '')), v_search) > 0
      )
  ),
  ordered_drafts as (
    select
      filtered.id,
      row_number() over (
        order by
          case when p_sort_column = 'dates' and p_sort_direction = 'asc' then filtered.start_date end asc nulls first,
          case when p_sort_column = 'dates' and p_sort_direction = 'desc' then filtered.start_date end desc nulls first,
          case when p_sort_column = 'name' and p_sort_direction = 'asc' then lower(filtered.name) end asc,
          case when p_sort_column = 'name' and p_sort_direction = 'desc' then lower(filtered.name) end desc,
          case when p_sort_column = 'races' and p_sort_direction = 'asc' then filtered.race_count end asc,
          case when p_sort_column = 'races' and p_sort_direction = 'desc' then filtered.race_count end desc,
          lower(filtered.name) asc,
          filtered.id asc
      ) as position
    from filtered_drafts as filtered
  ),
  page_drafts as (
    select ordered.id, ordered.position
    from ordered_drafts as ordered
    where ordered.position > p_offset
      and ordered.position <= p_offset + p_limit
  ),
  page_publications as (
    select
      page.id as draft_id,
      page.position,
      publication.id,
      publication.status,
      publication.error
    from page_drafts as page
    left join lateral (
      select job.id, job.status, job.error
      from public.event_import_draft_translation_jobs as job
      where job.draft_id = page.id
      order by job.created_at desc, job.id desc
      limit 1
    ) as publication on true
  )
  select
    coalesce(array_agg(page.draft_id order by page.position), '{}'::uuid[]),
    (select count(*) from filtered_drafts)::bigint,
    coalesce(
      jsonb_agg(
        jsonb_build_object('id', page.id, 'draft_id', page.draft_id, 'status', page.status, 'error', page.error)
        order by page.position
      ) filter (where page.id is not null),
      '[]'::jsonb
    )
  from page_publications as page;
end;
$$;

revoke all on function public.get_event_import_drafts_page(integer, integer, text, uuid, text, text, text, text[]) from public, anon, authenticated;
grant execute on function public.get_event_import_drafts_page(integer, integer, text, uuid, text, text, text, text[]) to service_role;
