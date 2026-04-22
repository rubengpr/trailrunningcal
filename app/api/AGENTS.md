# API Agent Instructions

These rules apply to all files under `app/api/`.

## API contract

- Success responses should follow `{ success: true, data }`.
- Error responses should follow `{ error: string }`.
- Use appropriate HTTP status codes (`400`, `401`, `403`, `404`, `429`, `500`).

## Auth and authorization

- For protected routes, call `supabase.auth.getUser()` early.
- Return `401` when auth fails or user is missing.
- Enforce role/ownership checks before any mutation.

## Validation and sanitization

- Validate and sanitize all server-side input before DB or external calls.
- Do not rely on client-side validation.

## Transactional mutations

- Implement multi-table transactions in Postgres functions (`plpgsql`) called via `supabase.rpc(...)`.
- Default to `SECURITY INVOKER` and explicit `GRANT EXECUTE`.

## Error handling

- Wrap route logic in `try/catch`.
- Log internal errors with `console.error`.
- Return safe/generic error messages in API responses.
