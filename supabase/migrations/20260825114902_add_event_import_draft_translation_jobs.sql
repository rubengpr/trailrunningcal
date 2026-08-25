create table public.event_import_draft_translation_jobs (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.event_import_drafts(id) on delete cascade,
  source_description text not null,
  status text not null default 'pending'
    check (status in ('pending', 'running', 'completed', 'failed')),
  workflow_run_id text unique,
  accepted_event_id uuid references public.events(id) on delete cascade,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_import_draft_translation_jobs_completed_event_check check (
    (status = 'completed' and accepted_event_id is not null and error is null)
    or (status <> 'completed' and accepted_event_id is null)
  )
);

create unique index event_import_draft_translation_jobs_active_draft_idx
  on public.event_import_draft_translation_jobs (draft_id)
  where status in ('pending', 'running');

create index event_import_draft_translation_jobs_draft_created_idx
  on public.event_import_draft_translation_jobs (draft_id, created_at desc);

create table public.event_import_draft_translation_job_items (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.event_import_draft_translation_jobs(id) on delete cascade,
  locale text not null check (locale in ('ca', 'en', 'fr')),
  status text not null default 'pending'
    check (status in ('pending', 'running', 'completed', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  description text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, locale),
  constraint event_import_draft_translation_job_items_completed_description_check check (
    (status = 'completed' and description is not null and error is null)
    or status <> 'completed'
  )
);

create index event_import_draft_translation_job_items_job_idx
  on public.event_import_draft_translation_job_items (job_id, created_at);

alter table public.event_import_draft_translation_jobs enable row level security;
alter table public.event_import_draft_translation_job_items enable row level security;

revoke all on public.event_import_draft_translation_jobs from anon, authenticated;
revoke all on public.event_import_draft_translation_job_items from anon, authenticated;
grant select, insert, update, delete on public.event_import_draft_translation_jobs to service_role;
grant select, insert, update, delete on public.event_import_draft_translation_job_items to service_role;

create function public.create_event_import_draft_translation_job(p_draft_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path to ''
as $function$
declare
  v_draft public.event_import_drafts%rowtype;
  v_job public.event_import_draft_translation_jobs%rowtype;
  v_event_slug text;
begin
  select * into v_draft
  from public.event_import_drafts
  where id = p_draft_id
  for update;

  if not found then
    raise exception 'Draft not found' using errcode = 'P0002';
  end if;

  if v_draft.status = 'accepted' then
    select slug into v_event_slug from public.events where id = v_draft.accepted_event_id;
    if not found then
      raise exception 'Accepted event not found' using errcode = 'P0003';
    end if;
    return jsonb_build_object(
      'status', 'accepted',
      'event_id', v_draft.accepted_event_id,
      'event_slug', v_event_slug
    );
  end if;

  if v_draft.status <> 'draft' then
    raise exception 'Draft not found' using errcode = 'P0002';
  end if;

  select * into v_job
  from public.event_import_draft_translation_jobs
  where draft_id = v_draft.id and status in ('pending', 'running')
  order by created_at desc
  limit 1;

  if found then
    return jsonb_build_object('status', v_job.status, 'job_id', v_job.id, 'created', false);
  end if;

  insert into public.event_import_draft_translation_jobs (draft_id, source_description)
  values (
    v_draft.id,
    coalesce(nullif(trim(v_draft.data -> 'event' ->> 'description'), ''), '')
  )
  returning * into v_job;

  insert into public.event_import_draft_translation_job_items (job_id, locale)
  values (v_job.id, 'ca'), (v_job.id, 'en'), (v_job.id, 'fr');

  return jsonb_build_object('status', v_job.status, 'job_id', v_job.id, 'created', true);
end;
$function$;

create function public.publish_event_import_draft_with_translations(
  p_job_id uuid,
  p_translations jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path to ''
as $function$
declare
  v_job public.event_import_draft_translation_jobs%rowtype;
  v_draft public.event_import_drafts%rowtype;
  v_result jsonb;
  v_event_id uuid;
  v_event_slug text;
  v_source_description text;
begin
  select * into v_job
  from public.event_import_draft_translation_jobs
  where id = p_job_id
  for update;

  if not found then
    raise exception 'Translation job not found' using errcode = 'P0002';
  end if;

  if v_job.status = 'completed' then
    select slug into v_event_slug from public.events where id = v_job.accepted_event_id;
    if not found then
      raise exception 'Accepted event not found' using errcode = 'P0003';
    end if;
    return jsonb_build_object('event_id', v_job.accepted_event_id, 'event_slug', v_event_slug);
  end if;

  if v_job.status <> 'running' then
    raise exception 'Translation job is not running' using errcode = 'P0006';
  end if;

  if jsonb_typeof(p_translations) <> 'array'
    or jsonb_array_length(p_translations) <> 3
    or exists (
      select 1
      from jsonb_array_elements(p_translations) as translation(value)
      where jsonb_typeof(translation.value) <> 'object'
        or translation.value ->> 'locale' not in ('ca', 'en', 'fr')
        or nullif(trim(translation.value ->> 'description'), '') is null
    )
    or (select count(distinct translation.value ->> 'locale')
        from jsonb_array_elements(p_translations) as translation(value)) <> 3 then
    raise exception 'Translations are invalid' using errcode = 'P0007';
  end if;

  select * into v_draft
  from public.event_import_drafts
  where id = v_job.draft_id
  for update;

  if not found or v_draft.status <> 'draft' then
    raise exception 'Draft is no longer publishable' using errcode = 'P0005';
  end if;

  v_source_description := coalesce(nullif(trim(v_draft.data -> 'event' ->> 'description'), ''), '');
  if v_source_description <> v_job.source_description then
    raise exception 'Draft description changed during translation' using errcode = 'P0005';
  end if;

  v_result := public.accept_event_import_draft(v_draft.id);
  v_event_id := (v_result ->> 'event_id')::uuid;
  v_event_slug := v_result ->> 'event_slug';

  insert into public.event_translations (event_id, locale, description)
  select
    v_event_id,
    translation.value ->> 'locale',
    trim(translation.value ->> 'description')
  from jsonb_array_elements(p_translations) as translation(value);

  update public.event_import_draft_translation_jobs
  set status = 'completed', accepted_event_id = v_event_id, error = null, updated_at = now()
  where id = v_job.id;

  return jsonb_build_object('event_id', v_event_id, 'event_slug', v_event_slug);
end;
$function$;

revoke all on function public.create_event_import_draft_translation_job(uuid) from public;
revoke all on function public.create_event_import_draft_translation_job(uuid) from anon;
revoke all on function public.publish_event_import_draft_with_translations(uuid, jsonb) from public;
revoke all on function public.publish_event_import_draft_with_translations(uuid, jsonb) from anon;
grant execute on function public.create_event_import_draft_translation_job(uuid) to service_role;
grant execute on function public.publish_event_import_draft_with_translations(uuid, jsonb) to service_role;
