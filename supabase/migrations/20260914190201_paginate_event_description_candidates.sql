create function public.get_event_description_candidates_page(
  p_limit integer,
  p_offset integer
)
returns table (
  candidates jsonb,
  total_count bigint
)
language plpgsql
stable
security invoker
set search_path to ''
as $$
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
  with event_index as (
    select
      event.id,
      event.name,
      count(race.id)::bigint as race_count
    from public.events as event
    left join public.races as race on race.event_id = event.id
    group by event.id, event.name
  ),
  page_events as (
    select indexed.id, indexed.race_count
    from event_index as indexed
    order by lower(indexed.name), indexed.id
    limit p_limit
    offset p_offset
  )
  select
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', event.id,
          'name', event.name,
          'slug', event.slug,
          'website_url', event.website_url,
          'description', event.description,
          'updated_at', event.updated_at,
          'race_count', page.race_count
        )
        order by lower(event.name), event.id
      ),
      '[]'::jsonb
    ) as candidates,
    (select count(*) from event_index)::bigint as total_count
  from page_events as page
  join public.events as event on event.id = page.id;
end;
$$;

revoke all on function public.get_event_description_candidates_page(
  integer,
  integer
) from public, anon, authenticated;

grant execute on function public.get_event_description_candidates_page(
  integer,
  integer
) to service_role;

drop function if exists public.get_events_with_races();
