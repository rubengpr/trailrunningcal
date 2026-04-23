## Product

Trail Running Cal (**Trail Running Calendar** in SEO/schema) is a bilingual (es + ca) race calendar at [trailrunningcal.com](https://www.trailrunningcal.com), covering trail/mountain events in Catalonia (Barcelona, Girona, Lleida, Tarragona) — not road running, not worldwide.
For business context, metrics, positioning, and audience — invoke the `/product-context` skill.

## Code style

- **HTTP:** always use appropriate HTTP status codes for both success and error cases.
- **Authorization:** always verify identity and ownership before accessing or mutating protected resources.
- **API responses:** `{ success: true, data }` on success, `{ error: string }` on error.
- **DB transactions:** multi-table writes must be atomic. Use Postgres functions (`plpgsql`) via `supabase.rpc(...)` — do not orchestrate split writes in route handlers. Prefer `SECURITY INVOKER` and explicit `GRANT EXECUTE`.
- **i18n:** locales are `es` and `ca` only — no `en` or other languages. No hardcoded user-facing strings; define them in locale translation files.
- **Env vars:** only expose client-safe values through `NEXT_PUBLIC_*`.

## Workflow

- Run `pnpm tsc --noEmit` before pushing — Vercel type-checks on every build and failures break the deployment.
