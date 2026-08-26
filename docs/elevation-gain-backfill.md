# Elevation gain backfill for import drafts

Procedure for filling `elevationGainM` on races inside `event_import_drafts` that were
left null by the research pipeline. Derived from the MoralTrail Race run (2026-08-25).

## Target

- Supabase project: `ppmdbmyxgtqvmvtbptmg` (**prod**, `trailrunningcal`). Not the local copy.
- Table: `event_import_drafts`, `status = 'draft'`.
- Field: `data -> 'races' -> [i] -> 'elevationGainM'`.
- **Never** touch `races` / `events`. Drafts are unpublished; the accept step creates those rows.
- **Never** change `status`, `accepted_event_id`, `tiers`, `date`, `city`, or `province`.

## Worklist query

**First** read the ids already processed, and exclude them — otherwise every turn re-picks
the same drafts:

```bash
python3 -c "import json;print(','.join(repr(e['draftId']) for e in json.load(open('scripts/elevation-gain-backfill-log.json'))) or \"''\")"
```

Paste that output into the `not in (...)` clause:

```sql
with r as (
  select d.id, d.source_url,
         jsonb_array_elements(d.data->'races') as race
  from event_import_drafts d
  where d.status = 'draft'
    and d.id::text not in ('468c92bf-d840-4d88-8238-522f95dafa93')  -- ledger ids
)
select id, source_url,
       count(*) filter (where race->>'elevationGainM' is null) as missing
from r
group by id, source_url
having count(*) filter (where race->>'elevationGainM' is null) > 0
order by missing desc, id
limit 3;
```

`order by ... , id` keeps the ordering stable across turns so ties do not shuffle.

Then read each draft in full before researching it:

```sql
select jsonb_pretty(data) from event_import_drafts where id = '<uuid>';
```

The draft's own `event.description` often already states the distances and sometimes the
D+ in prose — read it first, it is free evidence.

## Source ladder

Work down until two independent sources agree. Stop at the first confirmed pair.

1. **Official race site** (`source_url`, or its `/reglamento`, `/recorridos`, `/carreras` pages).
   Organiser-declared D+ is the value to store — it is what the race publishes and what
   runners compare against.
2. **Reglamento / bases PDF.** Often the only place the per-distance table lives.
3. **Wikiloc** — search `<race name> <year> <distance>K` or `<town> <landmark> trail`.
   Any edition works; the course rarely changes. See matching rules below.
4. **Past-edition results pages** (sportmaniacs, rockthesport, chronotrack, mychip,
   local town-hall news posts) — these usually repeat the course spec in the header.

## Matching rules for Wikiloc

A Wikiloc track counts as confirmation when **all** hold:

- Distance is within ~5% of the draft's `distanceKm`, or of the organiser's stated distance.
- Municipality / province matches the draft's `city` / `province`.
- The route name or description references the race.

The track does **not** need to be the 2026 edition. A 2018 track of the same named course
is valid confirmation.

## Traps

- **`desnivel acumulado` is NOT D+.** It is ascent **plus** descent on a circular course, so
  it is roughly double the real D+. MoralTrail's reglamento says "1.750 metros" for the 17K
  and "1.120 metros" for the 9K; the true D+ values are 940 m and 560 m. The 9K case is the
  tell: 1120 = 2 x 560 exactly. If a figure looks absurd for the distance, halve it and
  check whether that matches the organiser's own D+ line.
- **Organiser D+ vs GPS D+ will differ.** Wikiloc barometric tracks read lower (17K: 940 m
  declared vs 821 m recorded). Store the **organiser** figure; use the GPS track only to
  confirm you found the right course.
- **Marketing distance vs measured distance.** "17K" measures 16.46 km. Keep the organiser's
  headline distance in `distanceKm`; do not rewrite it to the GPS value.
- **Wikiloc 403s `WebFetch`.** Use the in-app browser instead:
  `mcp__Claude_Browser__preview_start` with the URL, then `get_page_text`. The stats block
  (Distancia / Desnivel positivo / Altitud máxima) renders in the text.
- Race sites rate-limit; a 503 with `Retry-After` means move to the next source, not retry.

## Write-back

One statement per draft, guarded so it cannot fire against a shifted array or a draft that
someone else has already accepted:

```sql
update event_import_drafts
set data = jsonb_set(data, '{races,0,elevationGainM}', '560'::jsonb, true),
    updated_at = now()
where id = '<uuid>'
  and status = 'draft'
  and data->'races'->0->>'distanceKm' = '9.5'   -- pin the row you researched
returning jsonb_pretty(data->'races');
```

Always include the `distanceKm` guard and always `returning` — a zero-row result means the
draft moved under you, and you must re-read it rather than retry blind.

Nest `jsonb_set` calls to update several races in one statement.

## Logging

Two files. Both are required; neither substitutes for the other.

### 1. Processed ledger — `scripts/elevation-gain-backfill-log.json`

One entry per draft, appended as soon as the draft is finished with. This is what makes the
run terminate: a draft is **processed** once it has a ledger entry, whether or not a number
was written.

```json
{
  "draftId": "468c92bf-d840-4d88-8238-522f95dafa93",
  "eventName": "MoralTrail Race",
  "outcome": "filled",
  "races": [
    { "distanceKm": 9.5, "elevationGainM": 560,
      "sources": ["https://moraltrailrunning.com/",
                  "https://es.wikiloc.com/rutas-carrera-por-montana/moralzarzal-moraltrail-race-9km-30821955"] }
  ]
}
```

`outcome` is `filled` (every race resolved), `partial` (some resolved), or `not_found`
(nothing credible located).

### 2. Review queue — `scripts/elevation-gain-review-queue.json`

**Every race that was not filled goes here**, including the unresolved races inside a
`partial` draft. `not_found` is not a terminal state — it is a handoff to a human, so the
entry must carry enough detail for someone to pick it up cold:

```json
{
  "draftId": "<uuid>",
  "eventName": "<event name>",
  "sourceUrl": "<draft source_url>",
  "distanceKm": 21,
  "city": "<city>",
  "province": "<province>",
  "attempted": [
    "https://official-site.example/reglamento — reglamento lists distances only, no D+",
    "wikiloc search '<race> 21K' — nearest track 18.4 km, outside 5% tolerance",
    "sportmaniacs 2025 results — no course spec in header"
  ],
  "reason": "No organiser-declared D+ published; no Wikiloc track matches the distance.",
  "bestGuess": { "elevationGainM": 900, "confidence": "low", "basis": "..." }
}
```

`attempted` must list every source actually checked and what it yielded — an empty or vague
`attempted` is not an acceptable queue entry. `bestGuess` is optional; include it only when
there is a real signal, and **never** write a guess to the database.

### Reporting

A run is not finished when the ledger is complete. The final turn must print the full review
queue — every queued race with its `reason` — as an explicit list, so unresolved races are
surfaced rather than buried in a file. Never guess a value to keep a race out of the queue.
