create schema if not exists private;

-- Event editors can update their event without direct write access to translations.
create function private.invalidate_event_translations()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  delete from public.event_translations where event_id = new.id;
  return new;
end;
$function$;

revoke all on function private.invalidate_event_translations() from public, anon, authenticated;

create trigger invalidate_event_translations
after update of description on public.events
for each row
when (old.description is distinct from new.description)
execute function private.invalidate_event_translations();

create function public.insert_event_translations_for_source(p_entries jsonb)
returns setof public.event_translations
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  -- Serialize promotion against description edits, in a consistent order across batches.
  perform event.id
  from public.events as event
  where event.id in (
    select entry.event_id
    from jsonb_to_recordset(p_entries) as entry(event_id uuid)
  )
  order by event.id
  for update;

  if exists (
    select 1
    from jsonb_to_recordset(p_entries) as entry(event_id uuid, source text)
    left join public.events as event on event.id = entry.event_id
    where event.id is null
      or regexp_replace(event.description, '^[[:space:]]+|[[:space:]]+$', '', 'g') is distinct from entry.source
  ) then
    raise exception 'Translation source has changed' using errcode = 'P0005';
  end if;

  return query
  insert into public.event_translations (event_id, locale, description)
  select entry.event_id, entry.locale, entry.description
  from jsonb_to_recordset(p_entries) as entry(event_id uuid, locale text, description text)
  returning *;
end;
$function$;

revoke all on function public.insert_event_translations_for_source(jsonb) from public, anon, authenticated;
grant execute on function public.insert_event_translations_for_source(jsonb) to service_role;
