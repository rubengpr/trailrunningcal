-- Accepted drafts are import history even after their published event is deleted.
-- Allow the existing ON DELETE SET NULL foreign key to clear that event link.
alter table public.event_import_drafts
  drop constraint event_import_drafts_state_check,
  add constraint event_import_drafts_state_check check (
    (status in ('draft', 'rejected') and accepted_event_id is null)
    or status = 'accepted'
  );
