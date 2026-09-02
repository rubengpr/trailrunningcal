update public.event_update_batches
set finished_at = updated_at
where status in ('completed', 'failed')
  and finished_at is null;

update public.event_update_batches
set failure_reason = 'Workflow did not finish'
where status = 'failed'
  and failure_reason is null;
