create function public.get_event_import_drafts_page(
  p_limit integer,
  p_offset integer,
  p_search text default null,
  p_draft_id uuid default null
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
    raise exception 'p_limit must be between 1 and 100'
      using errcode = '22023';
  end if;

  if p_offset < 0 then
    raise exception 'p_offset must be non-negative'
      using errcode = '22023';
  end if;

  return query
  with filtered_drafts as (
    select draft.id, draft.updated_at
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
  page_drafts as (
    select filtered.id, filtered.updated_at
    from filtered_drafts as filtered
    order by filtered.updated_at desc, filtered.id desc
    limit p_limit
    offset p_offset
  ),
  page_publications as (
    select
      page.id as draft_id,
      publication.id,
      publication.status,
      publication.error,
      page.updated_at
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
    coalesce(
      array_agg(page.draft_id order by page.updated_at desc, page.draft_id desc),
      '{}'::uuid[]
    ),
    (select count(*) from filtered_drafts)::bigint,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', page.id,
          'draft_id', page.draft_id,
          'status', page.status,
          'error', page.error
        )
        order by page.updated_at desc, page.draft_id desc
      ) filter (where page.id is not null),
      '[]'::jsonb
    )
  from page_publications as page;
end;
$$;

revoke all on function public.get_event_import_drafts_page(
  integer,
  integer,
  text,
  uuid
) from public, anon, authenticated;

grant execute on function public.get_event_import_drafts_page(
  integer,
  integer,
  text,
  uuid
) to service_role;
