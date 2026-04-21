# Trail Running Cal — agent context

Product and positioning reference for AI agents. For code style and engineering conventions, see `CLAUDE.md` and `.cursor/rules/`.

## Product context (compact)

- Trail Running Cal (**Trail Running Calendar** in SEO/schema) is a bilingual (es/ca) trail-race discovery platform focused on Catalonia, Spain.
- Core value: curated, up-to-date race calendar with filters (month, province, distance, type, difficulty) plus map/list discovery.
- Primary audience: runners discovering, comparing, saving, and sharing races.
- Surface area: public race pages + blog + authenticated organizer/admin workflows for curation.
- Positioning: regional authority for Catalonia trail racing; not a global or road-running event directory.
- Strategic direction: become the default discovery layer for Spain through SEO, data quality, and local trust.

## Main metrics (March 2026)

| Metric | Value |
| --- | --- |
| Monthly visits | ~3,000 |
| Listed events | ~600 |
| MoM visits growth | 100% |
| Mobile share | 67% |
| Organic traffic (Google Search) | 85% |

## Essential tech stack

Next.js App Router, React, TypeScript, Tailwind. next-intl for es/ca locale URLs. Supabase for DB, auth, and storage. MapLibre for maps. MDX for blog. PostHog + Resend; Vitest for tests. Admin scrape flows currently run via OpenRouter (using the OpenAI SDK-compatible client). Prod site: trailrunningcal.com

## Cross-agent engineering conventions

These rules are canonical for all coding agents working in this repo.

### API contract

- API responses should follow:
  - Success: `{ success: true, data }`
  - Error: `{ error: string }`
- Use appropriate HTTP status codes (`400`, `401`, `403`, `404`, `429`, `500`).

### Auth and authorization

- For protected API routes, call `supabase.auth.getUser()` early and return `401` if missing/invalid.
- For protected pages, require `supabase.auth.getUser()` and redirect to login if missing.
- Enforce role/ownership checks before any mutation.

### Validation and sanitization

- Validate and sanitize all server-side inputs before DB or external calls.
- Do not rely on client-side validation for integrity or security.
- Never use `dangerouslySetInnerHTML` with unsanitized user input.

### Database transaction convention

- Multi-table writes must be atomic.
- Do not orchestrate split multi-table writes directly in route handlers.
- Use Postgres functions (`plpgsql`) called via `supabase.rpc(...)` for transactional workflows.
- Prefer `SECURITY INVOKER` and explicit `GRANT EXECUTE` to required roles.

### Error handling

- Wrap API handler logic in `try/catch`.
- Log internal errors server-side (`console.error`) and return safe, generic error responses.
- Never expose stack traces or internal details in client-facing error responses.

### Rate limiting

- For public `POST` endpoints, call `checkRateLimit(request)` early and return `429` when the limit is exceeded.

### i18n and user-facing copy

- Do not hardcode user-facing strings in UI flows; define them in locale translation files.

### Secrets and env vars

- Never commit secrets.
- Use environment variables for credentials and keys.
- Only expose client-safe values through `NEXT_PUBLIC_*`.

### Code style

- Use camelCase with descriptive names for functions and variables.
- Use descriptive error variable names with context.
- Use kebab-case with file type/purpose in name.
- Use UPPER_SNAKE_CASE for constants.
- Organize assets by type/purpose, use kebab-case naming.
- Generate internal URLs, paths, and links without trailing slashes.
- Accessibility ARIA attributes or references are not needed.
- Never hardcode user-facing strings. Define text in translation files.
- Never use native error messages for inputs.
- Use Supabase query builder methods (`from`, `select`, `insert`, `update`, `delete`) for database operations.

### React conventions

- Prefer Server Components by default; add `'use client'` only for hooks, event handlers, or browser APIs.
- Use typed props with `ComponentNameProps` and functional components.
- Use named exports for reusable components and default exports for page-level/single-use components.
- Use `handle*` for internal handlers and `on*` for event-handler props.
- For i18n with `next-intl`: use `useTranslations(namespace)` in client components and `getTranslations({ locale, namespace })` in async server components.
- Keep UI mobile-first with Tailwind breakpoints (`sm:`, `lg:`).
- For async client actions, use clear loading/error state and user-facing error components.

### TypeScript conventions

- Prefer strict typing; avoid `any`.
- Use explicit parameter and return types in functions.
- Keep domain types in `types/` and use union types for controlled values.
- Use `import type` for type-only imports.
- Prefer `async/await` over Promise chains.
- Use utility types (`Omit`, `Pick`, `Partial`) for derived types.
- Use `ComponentNameProps` interfaces and avoid `React.FC`.
- Use type guards for runtime narrowing when input can be unknown.

## Pre-push checklist

Always run `pnpm tsc --noEmit` before pushing to catch TypeScript errors locally. Vercel runs a full type check on every build — failures there mean a broken deployment.
