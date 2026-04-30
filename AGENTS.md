## Product

Trail Running Cal (**Trail Running Calendar** in SEO/schema) is a bilingual (es + ca) race calendar at [trailrunningcal.com](https://www.trailrunningcal.com), covering trail/mountain events in Catalonia (Barcelona, Girona, Lleida, Tarragona) — not road running, not worldwide.
For business context, metrics, positioning, and audience — invoke the `/product-context` skill.

## Code style

- **HTTP:** always use appropriate HTTP status codes for both success and error cases.
- **API responses:** `{ success: true, data }` on success, `{ error: string }` on error.
- **File naming:** kebab-case with file type/purpose (e.g. `race-card.tsx`, `use-auth.ts`)
- **URLs:** no trailing slashes on internal URLs, paths, or links
- **Forms:** never use native browser error messages for inputs — use custom validation messages via translation files
- **Accessibility:** ARIA attributes are not required
- **i18n:** locales are `es` and `ca` only — no `en` or other languages. No hardcoded user-facing strings; define them in locale translation files.

## Architecture

- **API file structure:** one `route.ts` per resource under `app/api/[resource]/`; dynamic segments at `app/api/[resource]/[id]/route.ts`
- **Route handlers:** auth, input validation, service delegation, HTTP response. Extract long input validation to `validate-input.ts`
- **Service layer:** business logic lives in `lib/services/{feature}.ts`. DB access lives in `lib/db/`.
- **External provider structure:** each provider lives under `lib/integrations/{provider}/` with `client.ts` (HTTP calls, auth, raw shapes), `service.ts` (orchestration, added when needed), and named helpers as they emerge (e.g. `lib/integrations/spider-cloud/`, `lib/integrations/openrouter/`)
- **Data layer:** Server Components read directly via `lib/db/*`; Client Components mutate via API routes + `lib/api/*` wrappers — never fetch server-available data from the client
- **DB transactions:** multi-table writes must be atomic. Use Postgres functions (`plpgsql`) via `supabase.rpc(...)` — do not orchestrate split writes in route handlers. Prefer `SECURITY INVOKER` and explicit `GRANT EXECUTE`.

## Components

- **Server Components:** prefer Server Components by default; add `'use client'` only for components using hooks, event handlers, or browser APIs
- **Exports:** named exports for reusable/shared components; default exports for page-level or single-use components
- **Components:** avoid `React.FC`; use direct function declarations
- **Error UI:** use `ErrorMessage` or project variants (`SearchError`, `RaceCardError`) for user-facing errors — no inline custom error UI
- **Types:** define domain types in `types/`; avoid `any`
- **Imports:** use `@/` alias for internal modules; use `import type` for type-only imports

## Security

- **Env vars:** only expose client-safe values through `NEXT_PUBLIC_*`.
- **Authorization:** always verify identity and ownership before accessing or mutating protected resources.
- **Ownership:** after auth, verify the resource belongs to the user before any mutation — query the DB to confirm, never trust client-supplied ownership claims
- **Input validation:** validate and sanitize all user inputs server-side before DB or external calls
- **XSS:** never use `dangerouslySetInnerHTML` with unsanitized input
- **API errors:** return generic messages only (`"Internal server error"`, `"Unauthorized"`) — never expose stack traces or internal details
- **Auth — pages:** check `supabase.auth.getUser()` and redirect to `/{locale}/login` if user is missing

## Workflow

- Run `pnpm tsc --noEmit` before pushing — Vercel type-checks on every build and failures break the deployment.
