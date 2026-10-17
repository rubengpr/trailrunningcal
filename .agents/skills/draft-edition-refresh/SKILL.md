---
name: draft-edition-refresh
description: Refresh stale event import drafts in production, using the default eight-month cutoff or a requested date range. Reject confirmed duplicates and rebuild drafts from newer editions via the agent drafts API. Use when asked to update existing drafts or bring them up to the new edition. Not for discovering new events or updating published events; never publishes.
---

# Draft edition refresh

Resumable job over existing `event_import_drafts` in **production**. For each stale draft:
decide whether a newer edition exists; if it does, replace the draft with a full rebuild
from that edition; if not, leave the draft untouched and record why. Confirmed duplicates
are rejected logically through the API, keeping one canonical event or draft. This skill
never creates, accepts, or publishes a draft. Editing this skill or counting candidates
does not start a production run; apply mutations only when the user requests execution.

## Required context

Read before the first event of a run:

- [references/research-standard.md](references/research-standard.md) — editorial bar and
  edition-selection rules. Every refreshed draft must meet it.
- [references/draft-payload.md](references/draft-payload.md) — PATCH requests, body shape,
  tier and province rules.
- [references/duplicate-rejection.md](references/duplicate-rejection.md) — identity evidence,
  survivor selection, DELETE, verification, and recovery. Read before rejecting duplicates.
- `docs/elevation-gain-backfill.md` — source ladder (official site → reglamento PDF →
  Wikiloc → past results) and D+ traps. Applies to every field, not only D+.
- The `product-context` skill — scope and what counts as a trail/mountain event.

## Invocation

`/draft-edition-refresh [--dry-run] [--limit N] [--from YYYY-MM-DD --through YYYY-MM-DD]`

- `--dry-run` — research and write proposals, but do not PATCH or DELETE. Record
  `would_update` / `would_reject` instead of `updated` / `rejected_duplicate`.
  Keep dry-run state in the run folder's `dry-run/` subfolder. It never marks a draft done
  for a real run; use it only as a lead and revalidate before any real mutation.
- `--limit N` — stop after N events processed in this run.
- `--from` / `--through` — inclusive bounds on each draft's **latest race date**, not its
  creation date. Require both valid ISO dates and `from <= through`; when omitted use the
  default cutoff. Example: `--from 2026-02-16 --through 2026-06-01`.

## Preconditions (verify; stop and say what is missing)

1. `AGENT_API_TOKEN` is set (check with `[ -n "$AGENT_API_TOKEN" ]`, never echo it) and
   `GET https://www.trailrunningcal.com/api/events/import/drafts?page=1` returns 200.
2. The Supabase MCP can query project `ppmdbmyxgtqvmvtbptmg` (production, `trailrunningcal`).
   Never use `.env.local` — it points at the dev copy. SQL is **read-only** here; all writes
   go through the API.
3. Real runs need API permissions `read,update,reject`; dry runs need only `read`.
   Unset `AGENT_API_PERMISSIONS` defaults to `read,update`, so rejection may need server
   configuration. Do not change credentials, permissions, or deployments automatically.
   A 401/403 stops the run; report the missing access.

## State files

Preserve existing run files. New runs use
`data/draft-edition-refresh/runs/<run-id>/`, including their own `dry-run/` subfolder.
Use a unique run ID containing the date range and execution date. Shared learnings remain
at `data/draft-edition-refresh/learnings.md`. Resume the selected run, never merge ranges
or overwrite historical outcomes. Legacy runs at the root remain readable.

| file | role |
|---|---|
| `worklist.json` | frozen list: `cutoff` or inclusive `from`/`through`, `createdAt`, and `rows: [{ draftId, eventName, latestDate }]` |
| `ledger.json` | one entry per processed draft; a draft with an entry is done |
| `review-queue.json` | everything a human must look at |
| `backups/<draftId>.json` | the draft's embedded event/races `data` exactly as read before PATCH or DELETE |
| `rejections/<draftId>.json` | full pre-rejection API snapshot, survivor ID/type, identity evidence, reason, request/result, verification |
| `payloads/<draftId>.json` | the body sent (or that would be sent, in dry run) |
| shared `learnings.md` | append-only field notes from every run (real and dry): traps, source tips, ambiguities and the call made |

Re-read this file, shared `learnings.md`, and the selected run's `worklist.json` and
`ledger.json` at the start of every turn. Learnings refine how to apply this skill; when a
learning contradicts this file or the references, this file wins and the conflict goes in the
next reflection. The ledger records completed outcomes; rejection audits also record
in-flight mutations that must be reconciled after an interruption. Real and dry runs each
write only their own folder; `worklist.json` may be shared within the same run.

## 1. Build the worklist (once per run)

If `worklist.json` is missing or the user asks for a new run, build it. `cutoff` = today
minus 8 months. Rules:

- No race with a date → skip (not in worklist).
- Latest race date **before** `cutoff` → in worklist.
- Latest race date on or after `cutoff` → skip.

For an explicit range, replace the cutoff predicate below with
`max(dt) >= date '<from>' and max(dt) <= date '<through>'`. Include only `status = 'draft'`.
Do not reuse the previous worklist or its ledger for a new range.

```sql
with r as (
  select d.id, d.data->'event'->>'name' as event_name, nullif(x->>'date', '')::date as dt
  from event_import_drafts d
  left join lateral jsonb_array_elements(d.data->'races') x on true
  where d.status = 'draft'
)
select id as "draftId", event_name as "eventName", max(dt) as "latestDate"
from r
group by id, event_name
having count(dt) > 0 and max(dt) < date '<cutoff>'
order by max(dt), id;
```

Print the count and date range, then continue.

## 2. Process one event at a time

Take worklist rows in order whose `draftId` is not in the ledger. **Fully finish one
event before starting the next**: never hold two events' research open at once, so facts
from different events or editions cannot bleed together. Print a `PROGRESS:` line every 10
events.

**Reflection checkpoint — every 5 processed events** (and once at the end of the run),
before taking the next event:

1. Review those 5 ledger entries and any subagent `notes`: what was slow, ambiguous, wrong,
   or decided without a rule? Which source or tactic worked?
2. Append one dated entry to `data/draft-edition-refresh/learnings.md` (never rewrite past
   entries; a clean batch adds nothing):
   ```
   ## <YYYY-MM-DD> batch <n> (<draft ids or event names>)
   - **<short title>** — what happened, the call made, and how to handle it next time.
   ```
3. If a learning shows a rule here is wrong or missing, do **not** edit the skill
   mid-run. Add it under `## Proposed skill changes` at the bottom of `learnings.md`, then
   keep applying the current rules. The user decides at the end whether to merge them.
4. If a learning means an already-processed event got a wrong outcome, fix its ledger and
   review-queue entries now, and note the correction in the reflection entry.
5. Print a `REFLECTION:` line with the number of new learnings and proposed changes.

Subagents read `learnings.md` before researching but never write to it; the orchestrator
writes the reflection from their notes.

**Parallel runs.** Events may be delegated to parallel subagents, one event per agent. The
in-app browser pane is shared: each agent must open its own tab with `tabs_create` and pass
that `tabId` on every browser call, never act on the fronted tab. The orchestrator alone
writes the ledger and review queue, after checking each returned payload.

For each draft:

1. **Read** the full draft via `GET /api/events/import/drafts/{id}`. Save `data` to
   `backups/<draftId>.json`. Read the description and races: they tell you where to look
   (website, town, distances), but they are not evidence for the new edition.
2. **Dedupe against published events.** Look for a published event that is the same event
   (name match after removing edition numbers and accents, or same website domain) with a
   race dated after the draft's latest date:
   ```sql
   select e.id, e.name, e.slug, e.website_url, max(r.date) as latest
   from events e join races r on r.event_id = e.id
   where e.name ilike '%<distinctive name term>%'
      or e.website_url ilike '%<website domain>%'
   group by e.id;
   ```
   Production has no `unaccent` extension: search with an accent-free distinctive term
   (e.g. `%Trail%Moral%`), and try both spellings when the name carries an accent.
   Also search by **course**, because events get renamed (Sky Gran Canaria became "Beyond
   the Coast Sky Tour"): published races in the draft's cities, or with the same distance and
   D+ in the same province.
   ```sql
   select e.name, e.slug, r.name, r.date, r.city, r.distance_km, r.elevation_gain_m
   from events e join races r on r.event_id = e.id
   where r.province = '<province>'
     and (r.city ilike any (array['<city>', …])
          or (r.distance_km between <km> - 1 and <km> + 1
              and r.elevation_gain_m between <d+> * 0.9 and <d+> * 1.1));
   ```
   If the **same event** is already published, with the same or a newer edition → follow
   `references/duplicate-rejection.md`: reject the duplicate when confirmed; otherwise
   queue it for manual review. Updating the published event is out of scope. Query matches
   must actually be published; inspect the schema's publication condition before using them.

   **Then dedupe against other drafts** (`status = 'draft'`), with the same matching rules
   (name terms, website domain, and also same city + similar distances):
   ```sql
   select id, data->'event'->>'name' as name, data->'event'->>'websiteUrl' as web,
          (select max(x->>'date') from jsonb_array_elements(data->'races') x) as latest,
          (select string_agg(distinct x->>'city', ', ') from jsonb_array_elements(data->'races') x) as cities
   from event_import_drafts
   where status = 'draft' and id <> '<draftId>'
     and (data->'event'->>'name' ilike '%<distinctive name term>%'
          or data->'event'->>'websiteUrl' ilike '%<website domain>%'
          or exists (select 1 from jsonb_array_elements(data->'races') x
                     where x->>'city' ilike '<city>'));
   ```
   Confirm identity and choose one survivor using `references/duplicate-rejection.md`.
   Keep the later edition; equal editions keep the earliest-created draft (then smallest ID).
   Reject only a losing draft in the selected worklist. If the survivor is the current
   draft, process it normally; losing drafts outside the worklist go to manual review.
   Ambiguous matches remain untouched with outcome `duplicate_review`. Search matches
   by name, domain, city, distance, or D+ are leads, not proof of identity.
3. **Research** to [references/research-standard.md](references/research-standard.md).
   Decide first: is there a newer edition, and which one? Then open the official site,
   find the reglamento for that edition, and extract every field from scratch.
4. **Decide the outcome**:
   - newer edition passes the safety gate → `updated` (or `would_update` in dry run);
   - no newer edition reliably established → `no_new_edition`, draft untouched;
   - edition identified but name/date/city/province not confirmable → `insufficient`, draft untouched;
   - confirmed duplicate rejected and verified → `rejected_duplicate` (`would_reject` in dry run);
   - possible duplicate without conclusive identity or survivor → `duplicate_review`, untouched;
   - API error after one retry, or 404 → `blocked`.
5. **Rebuild and PATCH** (only for `updated`). Write the full body to
   `payloads/<draftId>.json`: new `event.name`, a rewritten `event.description` that matches
   the new edition's distances, places, and prices, `event.websiteUrl`, and every adult
   modality of the new edition. Check it locally against the payload rules (description
   600–800 chars, 2 paragraphs; integer prices; tier order; province enum; ≥1 race). Then
   re-read the draft; if its `updatedAt` changed since step 1, stop on that draft and mark
   it `blocked`. Otherwise PATCH.
6. **Record** the ledger entry and any review-queue entries, then move on.

Only the orchestrator performs DELETE, sequentially. Subagents may propose a duplicate
and evidence but never reject it. Reconcile pending rejection audit files before taking
new work after an interruption. Legacy `exists` entries are historical outcomes, not
authorization or proof for a new rejection; include them in a new explicit scope to recheck.

## Ledger entry

```json
{
  "draftId": "<uuid>",
  "eventName": "<name as in the draft before>",
  "outcome": "updated | would_update | no_new_edition | rejected_duplicate | would_reject | duplicate_review | insufficient | blocked",
  "previousLatestDate": "2025-05-11",
  "edition": { "year": 2026, "status": "upcoming | past", "latestDate": "2026-05-10" },
  "changes": "short English summary: dates, renamed modalities, added/removed races, distance/D+/price changes, new website",
  "sources": ["https://… — what it confirmed"],
  "reason": "required unless outcome is updated/would_update — English, specific",
  "duplicateOf": { "type": "event | draft", "id": "<survivor UUID>" },
  "rejectionAudit": "rejections/<draftId>.json",
  "recheckAfter": "YYYY-MM-DD or null — for no_new_edition when the next edition is likely soon (e.g. held every December and announced in October): the date after which it is worth re-checking",
  "processedAt": "<ISO timestamp>"
}
```

`edition` and `changes` are `null` when nothing was written.
`duplicateOf` and `rejectionAudit` are included only for duplicate outcomes when known.
Rejected duplicates also keep `edition` / `changes` null; the reason and audit describe
the status change. Historical `exists` entries remain valid and must not be rewritten.

## Review queue

Add an entry for:

- every `insufficient`, `blocked`, and `duplicate_review` draft;
- historical `exists` candidates and confirmed duplicates outside the worklist;
- every `no_new_edition` draft whose reason is cancelled, suspended, discontinued, or site
  gone (a human may want to reject it);
- every race in an updated draft with `elevationGainM: null` or `tiers: []`.

```json
{
  "draftId": "<uuid>",
  "eventName": "<name>",
  "issue": "short label",
  "detail": "what is missing or wrong, and why",
  "attempted": ["https://… — what it yielded"],
  "distanceKm": 21
}
```

`attempted` must list every source actually checked. An empty or vague `attempted` is not
acceptable. Never write a guessed value to the draft to keep it out of the queue.
Successful `rejected_duplicate` entries belong in the audit and final report, not the
manual queue. Remove a resolved duplicate issue only from this run's queue, preserving
unrelated issues and historical run files.

## Stop condition and final report

Stop when every worklist row has a ledger entry, or `--limit` is reached. Print:

1. Counts by outcome.
2. A table for `updated` / `would_update`: event, previous date → new date, changes summary.
   Also list `rejected_duplicate` / `would_reject`: draft ID, survivor type/ID, reason,
   and audit path. Clearly distinguish dry-run proposals from verified rejections.
3. The full review queue, one line per entry with its `issue` and `detail`.
4. Drafts with a `recheckAfter` date, sorted by that date.
5. The `## Proposed skill changes` from `learnings.md`, for the user to accept or reject.

Report the draft IDs so the user can review them in the admin import-drafts UI.

## Rules

- Production only, through the agent API. Never edit `event_import_drafts` with SQL, never
  touch `events` / `races`, never call `accept`. DELETE is allowed only for confirmed
  duplicates in the selected worklist, following `references/duplicate-rejection.md`.
- Cancellation, discontinuation, missing data, or no new edition never justify automatic rejection.
- PATCH is a full replacement: never send a partial document.
- Never invent a URL, date, price, distance, or elevation. Absent or unreliable → `null` /
  `[]`, or omit the race if its distance is unknown.
- GPX tracks are out of scope: do not search for, download, or record them.
- Wikiloc and some race sites 403 `WebFetch`, and `WebFetch` fails on TLS certificate
  mismatches: use the in-app browser in your own tab (try `http://` for a broken cert), then
  `get_page_text`. A 503 with `Retry-After` means move to the next source.
- Facebook pages truncate posts without login: decline the cookie banner, read the intro and
  visible post dates, and do not rely on Facebook alone to establish an edition.
- Finding pages fast: grep a site's `/sitemap.xml` for the event slug instead of guessing
  URLs (trailrunningasturias.com slugs include the town). Registration platforms such as
  empa-t put the edition's roman numeral in the slug (`iv-…`, `v-…`): probe the next numeral
  to detect a newer edition. The numeral does not equal the year; check it against a dated page.
- Ledger, queue, and notes in English. Event, race, and place names keep the organiser's
  official spelling. `event.description` is in Spanish.
