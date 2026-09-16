# Vercel ISR Writes and Fast Origin Transfer investigation

Date: 2026-09-16

## Outcome

Two separate mechanisms explain the resource spikes:

1. The ISR write wave was caused by repeated generation of the localized event catalogue: initially through time-based regeneration, then plausibly through crawler-driven warming of the new deployment's separate ISR cache. The route is already on-demand-only in production, which removes recurring TTL writes within a deployment but does not prevent first-request writes after a deployment.
2. Fast Origin Transfer is dominated by traffic crossing the broad Next.js Proxy boundary. The smallest supported fix is to stop running Proxy for already-localized content routes while retaining root locale negotiation, locale-home cookie behavior, unprefixed redirects, and English/French back-office redirects.

The Proxy matcher fix is implemented in `proxy.ts` and covered by `proxy.test.ts`. It has not been deployed.

Deployment note: this fix is isolated on local branch `codex/vercel-resource-fix`, based directly on `origin/main`. It excludes local `main` commit `48032f7 chore(robots): block PetalBot crawler` and all unrelated uncommitted work. It has not been pushed or deployed.

## Evidence

### Account totals and traffic baseline

Vercel Usage for August 17 15:00 through September 16 showed:

| Metric | Usage |
| --- | ---: |
| Fast Origin Transfer | 13.55 GB / 10 GB |
| FOT outgoing | 12.86 GB (94.9%) |
| FOT incoming | 690.61 MB (5.1%) |
| ISR Writes | 342,998 / 200,000 units |
| ISR Reads | 351,000 |
| Edge Requests | 791,000 |
| Function Invocations | 489,000 |
| Web Analytics Events | 25,000 |

On September 15 alone, FOT was 814.58 MB: 797.67 MB outgoing and 16.97 MB incoming.

PostHog recorded 1,079 regular browser pageviews on September 15 (Europe/Madrid), while Vercel Web Analytics recorded 1,123 pageviews in its UTC bucket. The similar values make this a useful human/browser baseline. PostHog recorded only a handful of identified bots because its browser SDK cannot observe most crawlers; that count must not be treated as total bot traffic.

### ISR Writes

The production sitemap contains 773 event slugs and 3,092 localized event URLs. A representative event response is 42,299 compressed bytes for HTML plus 30,627 bytes for RSC. At Vercel's 8 KB write-unit granularity, one regenerated localized page is approximately ten units across those two representations. A complete event-catalogue pass therefore predicts roughly:

`3,092 localized pages × 10 units = 30,920 write units`

The observed high days were approximately 29,000-50,000 units. The size-derived estimate explains the order of magnitude without invoking ordinary cache hits.

Code history aligns with the chart:

| Date | Change |
| --- | --- |
| Sep 7 | Daily event ISR enabled, then switched to runtime generation |
| Sep 12 | Event revalidation changed to seven days |
| Sep 14 | Event pages changed to on-demand-only revalidation |
| Sep 15 | Current production deployment, which includes the Sep 14 change |

The chart fell to about 1,000 units during the partial September 16 bucket. Vercel documents that each new deployment has its own ISR cache and does not reuse the prior deployment's cache; retained old caches exist for rollback. The September 15 spike immediately following a deployment is therefore consistent with crawler-driven warming of the new deployment, while the earlier daily spikes align with the former time-based policy. Exact separation remains blocked because Hobby does not expose `isrAction` or route-level ISR metrics.

### Fast Origin Transfer

Production responses show `cf-cache-status: DYNAMIC`, so Cloudflare forwards HTML and RSC requests to Vercel. Vercel then commonly returns `x-vercel-cache: HIT`.

A recent Vercel runtime-log sample contained 100 requests over 6.2 minutes:

| Classification | Count |
| --- | ---: |
| Proxy / middleware | 90 |
| Serverless function | 10 |
| Vercel cache HIT | 86 |
| Vercel cache MISS | 12 |
| Track API | 8 |

The sample rate was approximately 966 requests/hour, versus about 45 PostHog regular pageviews/hour from the September 15 daily baseline. Assets, API calls, RSC navigation, and crawlers make those metrics non-equivalent, but the roughly 21× gap and burst patterns demonstrate substantial non-human or automated amplification.

Measured compressed production responses:

| Response | Bytes | Vercel cache |
| --- | ---: | --- |
| Home HTML | 59,891 | HIT |
| Home RSC | 43,961 | HIT |
| Event HTML | 42,299 | HIT |
| Event RSC | 30,627 | HIT |
| Type HTML | 53,052 | HIT |
| Province HTML | 47,694 | HIT |
| Region HTML | 59,125 | HIT |
| `/api/events` page | 17,227 | MISS |
| Track API median | 5,579 | MISS |
| Track API p90 | 17,442 | MISS |
| Largest observed track API | 214,715 | MISS |

Vercel documents that Middleware can incur FOT twice for one Function request and recommends restricting its matcher. The current matcher runs for nearly every public page, including already-localized cached pages. The recent logs confirm those HIT requests are classified as Proxy/middleware work.

As a reconciliation check only, applying the measured 30-60 KB compressed page sizes to the sampled localized request rate produces roughly 0.8-1.0 GB/day, which brackets September 15's 797.67 MB outgoing FOT. This is not booked as exact FOT attribution: Hobby blocks the route-level FOT query, and a cache-HIT response body must not be counted as origin transfer without metering evidence.

The uncached event-list and track APIs are credible secondary sources. Their exact daily contribution is unknown, and response caching them now would introduce a new invalidation/freshness contract. The evidence does not justify that broader change before measuring the Proxy fix.

## Claim ledger

| Claim | Confidence | Basis |
| --- | --- | --- |
| Event time-based ISR caused the 30K-50K write days | Strong estimate | 3,092 localized event pages, measured artifact sizes, 8 KB units, matching code/chart dates |
| The production event route is now on-demand-only | Confirmed | Deployed source and deployment commit inspection |
| Ordinary cache HITs caused ISR Writes | Rejected | Vercel lifecycle and write-unit definition; writes occur when regenerated content is stored |
| New deployments start with a separate ISR cache | Confirmed | Vercel documents that a new deployment does not reuse the previous deployment's ISR cache |
| Crawlers warmed most localized event paths after deployment | Strong estimate | Sep 15 deployment/write timing, catalogue-sized write volume, and automated traffic amplification; route-level ISR actions unavailable |
| The broad Proxy matcher is the leading actionable FOT cause | Strong estimate | 90% Proxy route share in recent logs, mostly cache HITs; Vercel's documented Middleware FOT behavior; size/rate reconciliation |
| Crawlers or automation amplify the Proxy cost | Strong estimate | Request/pageview gap and burst patterns; exact user agents unavailable on Hobby |
| Track APIs are the dominant FOT cause | Weak | Responses can be large and are uncached, but the sampled frequency is insufficient for monthly attribution |
| Exact route-level FOT and ISR-action attribution | Blocked | Vercel returns `payment_required` for the required Observability queries on Hobby |

## Implemented change

Proxy now runs only for:

- `/` and unprefixed page paths, preserving locale negotiation;
- `/es`, `/ca`, `/en`, and `/fr`, preserving locale-cookie behavior on locale landing pages;
- English/French `/admin` and `/org` paths, preserving their Spanish redirects.

Localized content pages such as event, type, destination, and contact routes bypass Proxy and go directly through their existing Next.js route/cache behavior. No rendering, database query, ISR policy, API response, metadata, or content code changed.

### Verification

- `pnpm vitest run proxy.test.ts i18n.test.ts`: 87 tests passed.
- `pnpm tsc --noEmit`: passed.
- Local `/` with French `Accept-Language`: 307 to `/fr`.
- Local `/fr`: 200 and still sets `NEXT_LOCALE=fr`.
- Local `/fr/e/zegama-aizkorri`: 200, no Proxy locale cookie, correct French `lang`, canonical, all four `hreflang` alternates, and unchanged title.
- Local `/en/admin/eventos`: 307 to `/es/admin/eventos`.
- `pnpm build` passed on the clean isolated branch with its own locked dependencies. Next compiled successfully, type-checked, generated all 133 static pages, and emitted the expected Proxy plus ISR/SSG routes. The build retained pre-existing `metadataBase` warnings.

## Expected impact and production verification

The code removes Proxy from the dominant request class, but the exact FOT reduction cannot be honestly claimed before deployment. The scenario reconciliation suggests an upper-range saving near 0.6-0.8 GB/day at September 15 traffic (18-24 GB/month), while route-level metering could show less if cached response bodies are not fully charged across Proxy. Treat this as a forecast, not a measured saving.

After an approved deployment, use a quiet 24-hour window and then a three-day window:

1. Confirm localized public requests no longer appear as Proxy/middleware logs.
2. Compare outgoing FOT per 1,000 Vercel Web Analytics events against the pre-change baseline, not just raw daily bytes.
3. Confirm cache headers remain HIT-capable and check event HTML/RSC freshness after a real event mutation.
4. Confirm ISR Writes remain low through at least September 23, past the prior seven-day echo. Investigate any unexplained day above 5,000 units.
5. Check database request volume. It should remain unchanged or fall; a rise would indicate an accidental cache regression.
6. If normalized FOT falls less than 30%, obtain route-level metering (Observability Plus or Vercel support export) before adding API response caching. The next candidates are `/api/events` and event tracks, with tag/path invalidation designed first.

References: [Vercel ISR lifecycle](https://vercel.com/docs/incremental-static-regeneration), [ISR usage and 8 KB units](https://vercel.com/docs/incremental-static-regeneration/limits-and-pricing), [CDN and Fast Origin Transfer accounting](https://vercel.com/docs/manage-cdn-usage), [Vercel CDN architecture](https://vercel.com/docs/how-vercel-cdn-works), [Next.js Proxy](https://nextjs.org/docs/app/getting-started/proxy).
