# Confirmed duplicate rejection

Use only during an authorized refresh run. A dry run proposes `would_reject` and never
sends DELETE. Only reject drafts in the selected worklist; matches outside it may be
survivors, but losing matches outside it go to manual review.

## Confirm identity and choose the survivor

Apply the research standard's event identity rules. Record evidence that ties both
records to the same event and establishes their editions. Matching names, a shared
registration platform or organiser domain, or similar courses alone are insufficient.
An event-specific official URL plus compatible town and edition data can confirm a
duplicate; a rename needs a reliable source explicitly connecting the names. Conflicting
identity or dates → `duplicate_review`, with the conflicting evidence in the queue.

- A published instance of the same event with the same or a later confirmed edition wins
  over a draft. Verify the actual publication condition in the schema; mere presence in
  `events` is insufficient. An older published edition does not justify rejecting a newer draft.
- Between pending drafts of the same event, keep the later confirmed edition. For equal
  editions, keep the earliest `createdAt`, then the lexicographically smallest UUID.
  Apply the same ordering to the entire duplicate group, not just the current pair.
- Latest race dates help find candidates, but do not establish edition identity: different
  modalities on different days may belong to the same edition. If one same-edition draft
  contains unique, reliable modalities or facts missing from the proposed survivor, queue
  the pair for manual consolidation before rejecting either; do not silently merge them.
- Recheck the chosen survivor against published events and other matching drafts. Do not
  retain a draft already marked for rejection. A published survivor takes precedence;
  cycles, unclear editions, or a missing survivor require manual review.

## Audit before mutation

Read the losing draft through `GET /api/events/import/drafts/{id}` and require
`status = 'draft'`. Save its complete API `data` object (the full draft including status,
source URL, timestamps, and embedded event/races) in `rejections/<draftId>.json`, with:

- `draftId`, `eventName`, `duplicateOf: { type: 'event' | 'draft', id }`;
- identity and edition evidence with sources, the survivor snapshot, and the reason;
- `preparedAt`, `status: 'prepared'`, and later `attemptedAt`, HTTP result, and verification.

Also retain the embedded event/races in `backups/<draftId>.json`. Never overwrite an
existing pre-mutation snapshot. If preparation cannot be saved, do not send DELETE.
Do not persist tokens or Authorization headers.

Immediately before DELETE, reread the loser and survivor. Compare status, `updatedAt`,
and content with the snapshots and confirm that the survivor still qualifies. Requery
published survivors read-only; reread draft survivors via the API. If either changed or
disappeared, mark `blocked` and queue for reevaluation. Do not delete based on stale evidence.

## DELETE and verification

Production only, with the configured agent token and `reject` permission:
Persist `attemptedAt` and `status: 'attempting'` in the audit immediately before sending
the request, so an interruption leaves enough information to reconcile its result.

```bash
curl --fail-with-body --silent --show-error --request DELETE \
  "$API_BASE_URL/api/events/import/drafts/$DRAFT_ID" \
  -H "Authorization: Bearer $AGENT_API_TOKEN"
```

The current endpoint accepts only the ID; it has no conditional version parameter.
Rechecking reduces concurrent-change risk but is not an atomic compare-and-delete.
An observed concurrent edit blocks this item. DELETE sets `status = 'rejected'`; it does
not remove the row or modify the survivor. It does not save an audit itself.

- `200` with `{ success: true, data: null }`: reread the draft by ID. This GET can return
  non-pending drafts. Require `status = 'rejected'` before recording `rejected_duplicate`.
  Save response/verification timestamps and result in the audit and ledger.
- `401` / `403`: stop the run and report missing access. Never change permissions or
  fall back to a SQL write.
- `404`: do not retry blindly. Reread and record the actual state; missing or accepted
  drafts are `blocked`, not successful rejections by this run.
- Network error, timeout, or `5xx`: the DELETE may have succeeded. Read the state before
  any retry. If already rejected and there was a recorded attempt, reconcile the audit
  as rejected with uncertain attribution. If still pending and unchanged, revalidate
  the survivor and retry at most once. Otherwise mark `blocked` and queue it.
- Other errors, failed verification, or rejected state without a recorded attempt:
  `blocked`, preserving the audit and actual state. Never claim a successful rejection
  based only on the request having been sent.

On resume, reconcile `prepared`/attempted audits lacking a final ledger outcome before
processing new drafts. Do not repeat a verified rejection. A still-pending draft must
pass all identity, survivor, and freshness checks again. Historical `exists` results do
not substitute for this procedure.

## Manual review

Queue uncertain identity, conflicting dates, potential loss of same-edition information,
concurrent changes, and unresolved requests. Never auto-reject because a race stopped
running, its website disappeared, data is incomplete, or no newer edition was found.
No restore endpoint is documented: the snapshot supports manual recovery, not an
automatic rollback. Never create or publish a replacement as part of recovery.
