create or replace function public.enqueue_pending_events(p_urls text[])
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_url text;
  v_row public.pending_events%rowtype;
  v_added jsonb := '[]'::jsonb;
  v_skipped jsonb := '[]'::jsonb;
begin
  if p_urls is null then
    raise exception using errcode = '22023', message = 'URLs are required';
  end if;

  -- Acquire locks in a stable order so concurrent queue requests cannot insert
  -- the same URL and cannot deadlock when their input order differs.
  for v_url in
    select distinct candidate.url
    from pg_catalog.unnest(p_urls) as candidate(url)
    order by candidate.url
  loop
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(v_url, 0)
    );
  end loop;

  foreach v_url in array p_urls
  loop
    if exists (
      select 1
      from public.events
      where website_url = v_url
    ) then
      v_skipped := v_skipped || pg_catalog.jsonb_build_array(
        pg_catalog.jsonb_build_object(
          'url', v_url,
          'reason', 'alreadyInEvents'
        )
      );
    elsif exists (
      select 1
      from public.pending_events
      where url = v_url
    ) then
      v_skipped := v_skipped || pg_catalog.jsonb_build_array(
        pg_catalog.jsonb_build_object(
          'url', v_url,
          'reason', 'alreadyInQueue'
        )
      );
    else
      insert into public.pending_events (url)
      values (v_url)
      returning * into v_row;

      v_added := v_added || pg_catalog.jsonb_build_array(
        pg_catalog.jsonb_build_object(
          'id', v_row.id,
          'url', v_row.url,
          'status', v_row.status,
          'createdAt', v_row.created_at,
          'updatedAt', v_row.updated_at
        )
      );
    end if;
  end loop;

  return pg_catalog.jsonb_build_object(
    'added', v_added,
    'skipped', v_skipped
  );
end;
$$;

revoke all on function public.enqueue_pending_events(text[]) from public, anon, authenticated;
grant execute on function public.enqueue_pending_events(text[]) to service_role;
