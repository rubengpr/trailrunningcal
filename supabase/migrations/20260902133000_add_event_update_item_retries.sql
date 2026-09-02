alter table public.event_update_batch_items
  add column attempt_count integer not null default 0
    check (attempt_count >= 0);

create table public.event_update_batch_item_attempts (
  id uuid primary key default gen_random_uuid(),
  batch_item_id uuid not null references public.event_update_batch_items(id) on delete cascade,
  attempt_number integer not null check (attempt_number > 0),
  status text not null check (status in ('pending', 'running', 'completed', 'failed')),
  outcome text check (outcome is null or outcome in ('drafted', 'skipped')),
  draft_id uuid references public.event_drafts(id) on delete set null,
  skip_reason text,
  error text,
  workflow_run_id text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (batch_item_id, attempt_number)
);

alter table public.event_update_batch_item_attempts enable row level security;

create index event_update_batch_item_attempts_batch_item_id_idx
  on public.event_update_batch_item_attempts(batch_item_id);

create or replace function public.start_event_update_item_attempt(p_item_id uuid)
returns boolean
language plpgsql
security invoker
set search_path to ''
as $$
declare
  v_item public.event_update_batch_items%rowtype;
  v_attempt_number integer;
begin
  select * into v_item
  from public.event_update_batch_items
  where id = p_item_id and status = 'pending'
  for update;

  if not found then
    return false;
  end if;

  v_attempt_number := v_item.attempt_count;

  if v_attempt_number = 0 then
    v_attempt_number := 1;
    insert into public.event_update_batch_item_attempts (
      batch_item_id, attempt_number, status, started_at, updated_at
    ) values (
      v_item.id, v_attempt_number, 'running', now(), now()
    );
  else
    update public.event_update_batch_item_attempts
    set status = 'running', started_at = now(), updated_at = now()
    where batch_item_id = v_item.id
      and attempt_number = v_attempt_number
      and status = 'pending';

    if not found then
      raise exception 'Event update attempt is not startable' using errcode = 'P0004';
    end if;
  end if;

  update public.event_update_batch_items
  set
    status = 'running',
    attempt_count = v_attempt_number,
    error = null,
    outcome = null,
    draft_id = null,
    skip_reason = null,
    updated_at = now()
  where id = v_item.id;

  return true;
end;
$$;

create or replace function public.mark_event_update_item_skipped(
  p_item_id uuid,
  p_skip_reason text
)
returns void
language plpgsql
security invoker
set search_path to ''
as $$
declare
  v_item public.event_update_batch_items%rowtype;
begin
  select * into v_item
  from public.event_update_batch_items
  where id = p_item_id and status = 'running'
  for update;

  if not found then
    raise exception 'Event update item is not running' using errcode = 'P0004';
  end if;

  if v_item.attempt_count = 0 then
    raise exception 'Event update attempt was not started' using errcode = 'P0004';
  end if;

  update public.event_update_batch_item_attempts
  set
    status = 'completed',
    outcome = 'skipped',
    skip_reason = p_skip_reason,
    error = null,
    finished_at = now(),
    updated_at = now()
  where batch_item_id = v_item.id
    and attempt_number = v_item.attempt_count
    and status = 'running';

  if not found then
    raise exception 'Event update attempt is not running' using errcode = 'P0004';
  end if;

  update public.event_update_batch_items
  set
    status = 'completed',
    outcome = 'skipped',
    skip_reason = p_skip_reason,
    error = null,
    updated_at = now()
  where id = v_item.id;
end;
$$;

create or replace function public.fail_event_update_item(
  p_item_id uuid,
  p_error text
)
returns void
language plpgsql
security invoker
set search_path to ''
as $$
declare
  v_item public.event_update_batch_items%rowtype;
begin
  select * into v_item
  from public.event_update_batch_items
  where id = p_item_id and status = 'running'
  for update;

  if not found then
    raise exception 'Event update item is not running' using errcode = 'P0004';
  end if;

  if v_item.attempt_count = 0 then
    raise exception 'Event update attempt was not started' using errcode = 'P0004';
  end if;

  update public.event_update_batch_item_attempts
  set
    status = 'failed',
    outcome = null,
    draft_id = null,
    skip_reason = null,
    error = p_error,
    finished_at = now(),
    updated_at = now()
  where batch_item_id = v_item.id
    and attempt_number = v_item.attempt_count
    and status = 'running';

  if not found then
    raise exception 'Event update attempt is not running' using errcode = 'P0004';
  end if;

  update public.event_update_batch_items
  set
    status = 'failed',
    outcome = null,
    draft_id = null,
    skip_reason = null,
    error = p_error,
    updated_at = now()
  where id = v_item.id;
end;
$$;

create or replace function public.complete_event_update_item_with_draft(
  p_item_id uuid,
  p_draft_data jsonb
)
returns uuid
language plpgsql
security invoker
set search_path to ''
as $$
declare
  v_item public.event_update_batch_items%rowtype;
  v_draft_id uuid;
begin
  select * into v_item
  from public.event_update_batch_items
  where id = p_item_id and status = 'running'
  for update;

  if not found or v_item.attempt_count = 0 then
    raise exception 'Event update item is not running' using errcode = 'P0004';
  end if;

  insert into public.event_drafts (event_id, data)
  values (v_item.event_id, p_draft_data)
  returning id into v_draft_id;

  update public.event_update_batch_item_attempts
  set
    status = 'completed',
    outcome = 'drafted',
    draft_id = v_draft_id,
    skip_reason = null,
    error = null,
    finished_at = now(),
    updated_at = now()
  where batch_item_id = v_item.id
    and attempt_number = v_item.attempt_count
    and status = 'running';

  if not found then
    raise exception 'Event update attempt is not running' using errcode = 'P0004';
  end if;

  update public.event_update_batch_items
  set
    status = 'completed',
    outcome = 'drafted',
    draft_id = v_draft_id,
    skip_reason = null,
    error = null,
    updated_at = now()
  where id = v_item.id;

  return v_draft_id;
end;
$$;

create or replace function public.retry_event_update_batch_item(
  p_batch_id uuid,
  p_item_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path to ''
as $$
declare
  v_item public.event_update_batch_items%rowtype;
  v_attempt_number integer;
begin
  select * into v_item
  from public.event_update_batch_items
  where id = p_item_id
    and batch_id = p_batch_id
    and status = 'failed'
  for update;

  if not found then
    raise exception 'Event update item is not retryable' using errcode = 'P0004';
  end if;

  v_attempt_number := v_item.attempt_count;

  if v_attempt_number = 0 then
    v_attempt_number := 1;
    insert into public.event_update_batch_item_attempts (
      batch_item_id,
      attempt_number,
      status,
      outcome,
      draft_id,
      skip_reason,
      error,
      started_at,
      finished_at,
      created_at,
      updated_at
    ) values (
      v_item.id,
      v_attempt_number,
      'failed',
      v_item.outcome,
      v_item.draft_id,
      v_item.skip_reason,
      v_item.error,
      v_item.created_at,
      v_item.updated_at,
      v_item.created_at,
      v_item.updated_at
    );
  end if;

  v_attempt_number := v_attempt_number + 1;

  insert into public.event_update_batch_item_attempts (
    batch_item_id, attempt_number, status, created_at, updated_at
  ) values (
    v_item.id, v_attempt_number, 'pending', now(), now()
  );

  update public.event_update_batch_items
  set
    status = 'pending',
    attempt_count = v_attempt_number,
    outcome = null,
    draft_id = null,
    skip_reason = null,
    error = null,
    updated_at = now()
  where id = v_item.id;

  return jsonb_build_object(
    'batch_id', v_item.batch_id,
    'item_id', v_item.id,
    'event_id', v_item.event_id,
    'source_url', v_item.source_url,
    'target_year', v_item.target_year
  );
end;
$$;

create or replace function public.set_event_update_item_attempt_workflow_run_id(
  p_item_id uuid,
  p_workflow_run_id text
)
returns void
language plpgsql
security invoker
set search_path to ''
as $$
declare
  v_attempt_count integer;
begin
  select attempt_count into v_attempt_count
  from public.event_update_batch_items
  where id = p_item_id;

  if v_attempt_count is null or v_attempt_count = 0 then
    raise exception 'Event update attempt was not found' using errcode = 'P0004';
  end if;

  update public.event_update_batch_item_attempts
  set workflow_run_id = p_workflow_run_id, updated_at = now()
  where batch_item_id = p_item_id
    and attempt_number = v_attempt_count
    and status in ('pending', 'running');

  if not found then
    raise exception 'Event update attempt is not active' using errcode = 'P0004';
  end if;
end;
$$;

create or replace function public.fail_pending_event_update_item_attempt(
  p_item_id uuid,
  p_error text
)
returns void
language plpgsql
security invoker
set search_path to ''
as $$
declare
  v_item public.event_update_batch_items%rowtype;
begin
  select * into v_item
  from public.event_update_batch_items
  where id = p_item_id and status = 'pending'
  for update;

  if not found or v_item.attempt_count = 0 then
    raise exception 'Event update item is not pending' using errcode = 'P0004';
  end if;

  update public.event_update_batch_item_attempts
  set
    status = 'failed',
    error = p_error,
    started_at = coalesce(started_at, now()),
    finished_at = now(),
    updated_at = now()
  where batch_item_id = v_item.id
    and attempt_number = v_item.attempt_count
    and status = 'pending';

  if not found then
    raise exception 'Event update attempt is not pending' using errcode = 'P0004';
  end if;

  update public.event_update_batch_items
  set status = 'failed', error = p_error, updated_at = now()
  where id = v_item.id;
end;
$$;

revoke all on table public.event_update_batch_item_attempts from public, anon, authenticated;

revoke execute on function public.start_event_update_item_attempt(uuid) from public, anon, authenticated;
revoke execute on function public.mark_event_update_item_skipped(uuid, text) from public, anon, authenticated;
revoke execute on function public.fail_event_update_item(uuid, text) from public, anon, authenticated;
revoke execute on function public.complete_event_update_item_with_draft(uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.retry_event_update_batch_item(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.set_event_update_item_attempt_workflow_run_id(uuid, text) from public, anon, authenticated;
revoke execute on function public.fail_pending_event_update_item_attempt(uuid, text) from public, anon, authenticated;

grant execute on function public.start_event_update_item_attempt(uuid) to service_role;
grant execute on function public.mark_event_update_item_skipped(uuid, text) to service_role;
grant execute on function public.fail_event_update_item(uuid, text) to service_role;
grant execute on function public.complete_event_update_item_with_draft(uuid, jsonb) to service_role;
grant execute on function public.retry_event_update_batch_item(uuid, uuid) to service_role;
grant execute on function public.set_event_update_item_attempt_workflow_run_id(uuid, text) to service_role;
grant execute on function public.fail_pending_event_update_item_attempt(uuid, text) to service_role;
