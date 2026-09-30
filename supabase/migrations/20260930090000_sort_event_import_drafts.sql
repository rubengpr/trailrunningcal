drop function public.get_event_import_drafts_page(integer, integer, text, uuid);

create function public.get_event_import_drafts_page(
  p_limit integer,
  p_offset integer,
  p_search text default null,
  p_draft_id uuid default null,
  p_sort_column text default 'dates',
  p_sort_direction text default 'asc'
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
        select min((race ->> 'date')::date)
        from jsonb_array_elements(coalesce(draft.data -> 'races', '[]'::jsonb)) as race
        where race ->> 'date' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
      ) as start_date
    from public.event_import_drafts as draft
    where draft.status = 'draft'
      and (p_draft_id is null or draft.id = p_draft_id)
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

revoke all on function public.get_event_import_drafts_page(integer, integer, text, uuid, text, text) from public, anon, authenticated;
grant execute on function public.get_event_import_drafts_page(integer, integer, text, uuid, text, text) to service_role;
