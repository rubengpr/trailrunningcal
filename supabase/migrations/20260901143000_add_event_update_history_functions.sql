create or replace function public.get_event_update_batch_summary(p_batch_id uuid)
returns table (
  total bigint,
  drafted bigint,
  skipped bigint,
  failed bigint,
  pending bigint,
  running bigint
)
language sql
security invoker
set search_path = ''
as $$
  select
    count(item.id),
    count(item.id) filter (where item.outcome = 'drafted'),
    count(item.id) filter (where item.outcome = 'skipped'),
    count(item.id) filter (where item.status = 'failed'),
    count(item.id) filter (where item.status = 'pending'),
    count(item.id) filter (where item.status = 'running')
  from public.event_update_batch_items item
  where item.batch_id = p_batch_id;
$$;

create or replace function public.list_event_update_batch_history(p_limit integer default 20)
returns table (
  id uuid,
  status text,
  workflow_run_id text,
  created_at timestamptz,
  updated_at timestamptz,
  finished_at timestamptz,
  failure_reason text,
  total bigint,
  drafted bigint,
  skipped bigint,
  failed bigint,
  pending bigint,
  running bigint
)
language sql
security invoker
set search_path = ''
as $$
  select
    batch.id,
    batch.status,
    batch.workflow_run_id,
    batch.created_at,
    batch.updated_at,
    batch.finished_at,
    batch.failure_reason,
    count(item.id),
    count(item.id) filter (where item.outcome = 'drafted'),
    count(item.id) filter (where item.outcome = 'skipped'),
    count(item.id) filter (where item.status = 'failed'),
    count(item.id) filter (where item.status = 'pending'),
    count(item.id) filter (where item.status = 'running')
  from public.event_update_batches batch
  left join public.event_update_batch_items item on item.batch_id = batch.id
  group by batch.id
  order by batch.created_at desc
  limit greatest(1, least(coalesce(p_limit, 20), 100));
$$;

revoke execute on function public.get_event_update_batch_summary(uuid)
  from public, anon, authenticated;
revoke execute on function public.list_event_update_batch_history(integer)
  from public, anon, authenticated;
grant execute on function public.get_event_update_batch_summary(uuid)
  to service_role;
grant execute on function public.list_event_update_batch_history(integer)
  to service_role;
