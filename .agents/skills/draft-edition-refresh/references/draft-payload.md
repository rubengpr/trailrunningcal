# Draft payload and API requests

Validation lives in `lib/events/write-validation.ts` (`parseEventInput`). Re-read it if a
PATCH returns a 400 you cannot explain — it is the source of truth over this file.

## Requests

Production only: `API_BASE_URL=https://www.trailrunningcal.com`. Never print the token,
never enable shell/curl tracing, never follow redirects. See `docs/agent-api.md`.

```bash
# Read the full draft (before researching, and again right before PATCH)
curl --fail-with-body --silent --show-error \
  "$API_BASE_URL/api/events/import/drafts/$DRAFT_ID" \
  -H "Authorization: Bearer $AGENT_API_TOKEN"

# Replace the draft with the refreshed document
curl --fail-with-body --silent --show-error --request PATCH \
  "$API_BASE_URL/api/events/import/drafts/$DRAFT_ID" \
  -H "Authorization: Bearer $AGENT_API_TOKEN" \
  -H 'Content-Type: application/json' \
  --data-binary @"$PAYLOAD_FILE"
```

- `200` `{ success: true, data }` → done.
- `400` `{ error }` → fix the payload against the rules below and retry **once**.
- `401` / `403` → stop the run and tell the user; do not work around auth.
- `404` → the draft was accepted or rejected meanwhile. Outcome `blocked`; do not retry.

Duplicate rejection uses DELETE with permission `reject`, not PATCH. Follow
[duplicate-rejection.md](duplicate-rejection.md) for evidence, snapshots, response handling,
and verification. Dry runs send neither PATCH nor DELETE. The default token permissions
are only `read,update`; a 403 on DELETE is not permission to write via SQL.

PATCH replaces the whole `data` document. It is not a partial patch. It only succeeds while
the draft is `status = 'draft'`. It never touches `status`, `source_url`, or published events.

## Body shape

```jsonc
{
  "event": {
    "name": "string, 5–200 chars, official title without edition number",
    "description": "string | null — Spanish, 2 paragraphs, blank line between, 600–800 chars",
    "websiteUrl": "string (valid URL) | null"
  },
  "races": [                      // at least one
    {
      "name": "string | null — modality name without distance",
      "date": "YYYY-MM-DD",
      "city": "string, 1–100 chars",
      "province": "exact canonical enum value",
      "distanceKm": 42,           // > 0 and < 1000; integer by editorial rule (truncate)
      "elevationGainM": 2600,     // integer > 0 and < 100000, or null
      "tiers": [ { "priceEur": 30, "endsAt": "2026-03-31" } ]
    }
  ]
}
```

Keys outside this shape (`gpxDownloadUrl`, `sourceUrl`, …) are dropped silently. Do not send
them.

## Tiers (strict)

- At most **5** tiers per race.
- `priceEur` must already be an **integer** 0–9999. Round before sending; the server rejects
  decimals.
- **One tier:** `endsAt` may be `null`, but set it to the registration closing date when one
  is published (memory `price-tier-endsat-convention`).
- **Two or more tiers:** every tier, the last included, needs a non-null `endsAt`, strictly
  increasing in array order. The last one is the registration closing date.
- Order cheapest/earliest first. `[]` when prices are absent or unclear.
- A source that only publishes a range covering adult and children's races → use the top of
  the range as the adult general-public price.

## Province enum

Use verbatim, with accents (`lib/geography/provinces` is the source of truth):

```
A Coruña, Albacete, Alicante, Almería, Andorra, Araba, Asturias, Ávila, Badajoz,
Barcelona, Bizkaia, Burgos, Cáceres, Cádiz, Cantabria, Castellón, Ceuta, Ciudad Real,
Córdoba, Cuenca, Gipuzkoa, Girona, Granada, Guadalajara, Huelva, Huesca, Illes Balears,
Jaén, La Rioja, Las Palmas, León, Lleida, Lugo, Madrid, Málaga, Melilla, Murcia, Navarra,
Ourense, Palencia, Pontevedra, Salamanca, Santa Cruz de Tenerife, Segovia, Sevilla, Soria,
Tarragona, Teruel, Toledo, Valencia, Valladolid, Zamora, Zaragoza
```
