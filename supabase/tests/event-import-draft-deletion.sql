-- Run with psql -v ON_ERROR_STOP=1 -f supabase/tests/event-import-draft-deletion.sql.
-- All fixtures and deletions are rolled back.
begin;

do $test$
declare
  v_event_id uuid;
  v_draft_id uuid;
  v_data jsonb := '{"event":{"name":"Deletion regression"},"races":[{"date":"2027-05-01"}]}';
  v_status text;
begin
  insert into public.events (name, slug)
  values ('Deletion regression', 'deletion-regression-' || gen_random_uuid())
  returning id into v_event_id;

  insert into public.event_import_drafts (status, accepted_event_id, data)
  values ('accepted', v_event_id, v_data)
  returning id into v_draft_id;

  -- Pending and rejected drafts must still have no published event link.
  foreach v_status in array array['draft', 'rejected'] loop
    begin
      insert into public.event_import_drafts (status, accepted_event_id, data)
      values (v_status, v_event_id, v_data);
      raise exception 'Invalid % draft was allowed', v_status;
    exception when check_violation then
      null;
    end;
  end loop;

  perform public.delete_event_with_races(v_event_id);

  if exists (select 1 from public.events where id = v_event_id) then
    raise exception 'Event was not deleted';
  end if;

  if not exists (
    select 1 from public.event_import_drafts
    where id = v_draft_id
      and status = 'accepted'
      and accepted_event_id is null
      and data = v_data
  ) then
    raise exception 'Accepted draft history was not preserved';
  end if;

  -- An accepted draft must never silently republish a deleted event.
  begin
    perform public.accept_event_import_draft(v_draft_id);
    raise exception 'Deleted event was accepted again';
  exception when sqlstate 'P0003' then
    null;
  end;

  begin
    perform public.delete_event_with_races(v_event_id);
    raise exception 'Deleting a missing event succeeded';
  exception when sqlstate 'P0002' then
    null;
  end;
end;
$test$;

rollback;
