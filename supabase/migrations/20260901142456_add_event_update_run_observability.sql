alter table public.event_update_batches
  add column finished_at timestamptz,
  add column failure_reason text;

alter table public.event_update_batch_items
  add column outcome text,
  add column draft_id uuid references public.event_drafts(id) on delete set null,
  add column skip_reason text,
  add constraint event_update_batch_items_outcome_check
    check (outcome is null or outcome in ('drafted', 'skipped'));

create index event_update_batch_items_batch_id_idx
  on public.event_update_batch_items(batch_id);

-- Preserve the explicit terminal result already encoded by the original workflow.
update public.event_update_batch_items
set
  outcome = 'skipped',
  skip_reason = nullif(btrim(substring(error from '^Skipped:\\s*(.*)$')), ''),
  error = null
where status = 'completed'
  and error like 'Skipped:%';

-- Link only legacy drafts whose event and processing window identify one source item.
with draft_matches as (
  select
    item.id as item_id,
    (array_agg(draft.id))[1] as draft_id
  from public.event_update_batch_items item
  join public.event_drafts draft
    on draft.event_id = item.event_id
   and draft.created_at between item.created_at and item.updated_at
  where item.status = 'completed'
    and item.outcome is null
  group by item.id
  having count(*) = 1
)
update public.event_update_batch_items item
set
  outcome = 'drafted',
  draft_id = draft_matches.draft_id
from draft_matches
where item.id = draft_matches.item_id;

create or replace function public.complete_event_update_item_with_draft(
  p_item_id uuid,
  p_draft_data jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_event_id uuid;
  v_draft_id uuid;
begin
  select event_id
  into v_event_id
  from public.event_update_batch_items
  where id = p_item_id
    and status = 'running'
  for update;

  if v_event_id is null then
    raise exception 'Event update item is not running';
  end if;

  insert into public.event_drafts (event_id, data)
  values (v_event_id, p_draft_data)
  returning id into v_draft_id;

  update public.event_update_batch_items
  set
    status = 'completed',
    outcome = 'drafted',
    draft_id = v_draft_id,
    error = null,
    skip_reason = null,
    updated_at = now()
  where id = p_item_id;

  return v_draft_id;
end;
$$;

revoke execute on function public.complete_event_update_item_with_draft(uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.complete_event_update_item_with_draft(uuid, jsonb)
  to service_role;
