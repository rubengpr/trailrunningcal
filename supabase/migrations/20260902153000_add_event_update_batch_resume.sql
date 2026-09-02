create or replace function public.resume_event_update_batch(p_batch_id uuid)
returns integer
language plpgsql
security invoker
set search_path to ''
as $$
declare
  v_resumable_count integer;
begin
  perform 1
  from public.event_update_batches
  where id = p_batch_id
    and status = 'failed'
  for update;

  if not found then
    raise exception 'Event update batch is not resumable' using errcode = 'P0004';
  end if;

  update public.event_update_batch_items
  set
    status = 'pending',
    error = 'Previous workflow interrupted',
    updated_at = now()
  where batch_id = p_batch_id
    and status = 'running';

  select count(*)::integer into v_resumable_count
  from public.event_update_batch_items
  where batch_id = p_batch_id
    and status = 'pending';

  if v_resumable_count = 0 then
    raise exception 'Event update batch is not resumable' using errcode = 'P0004';
  end if;

  update public.event_update_batches
  set
    status = 'pending',
    finished_at = null,
    failure_reason = null,
    updated_at = now()
  where id = p_batch_id;

  return v_resumable_count;
end;
$$;

revoke execute on function public.resume_event_update_batch(uuid) from public, anon, authenticated;
grant execute on function public.resume_event_update_batch(uuid) to service_role;
