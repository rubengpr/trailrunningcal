---
name: backend-api-audit
description: Audit a Next.js backend for concrete API, service-layer, data-access, and integration refactor opportunities. Use only when the user explicitly invokes $backend-api-audit or asks to run this named audit; do not use it for database schema or SQL tuning.
---

# Backend API Audit

Scan the backend and report high-confidence improvements. Diagnose only unless the user also asks for implementation. A clean audit with no findings is valid; do not manufacture abstractions or micro-optimizations.

## Scope

Inspect the backend paths that exist in the repository, normally:

- `app/api/**`: route-handler boundaries and API contracts.
- `lib/services/**`: domain rules and workflow orchestration.
- `lib/db/**`: data-access boundaries and application-visible query inefficiencies.
- `lib/integrations/**`: provider clients, raw external shapes, and orchestration.
- Shared backend validation, authorization, error, and response helpers.

Do not perform a general database-design audit. Mention schema, indexes, RLS, SQL functions, or query plans only when code provides direct evidence of a backend problem; recommend a separate database audit when deeper investigation is required.

## What to look for

Prioritize findings with demonstrated impact:

1. **Layer violations**: business workflows or database orchestration in route handlers; database access from client code; provider-specific details leaking into domain APIs.
2. **Contract problems**: inconsistent status codes or response envelopes, weak structural validation, internal error exposure, and endpoints whose inputs or outcomes are ambiguous.
3. **Authorization gaps**: missing identity or ownership checks, or trusting client-supplied ownership claims.
4. **Duplicated backend patterns**: repeated validation, authentication, authorization, error mapping, queries, transformations, or workflow steps that have a stable shared concept.
5. **Function design**: large or mixed-responsibility functions, misleading boundaries, excessive parameter coupling, hidden side effects, or domain rules split across layers.
6. **Performance hazards**: N+1 or repeated queries, avoidable sequential independent work, redundant external calls, unbounded reads, repeated parsing or transformations, and work performed before cheap rejection checks.
7. **Consistency and atomicity**: multi-table writes or state transitions that can partially succeed, unsafe retries, or missing idempotency where duplicate execution is realistic.
8. **Test gaps**: critical behavior whose contract, authorization, failure recovery, or transaction boundary lacks proportionate coverage.

Follow the repository's `AGENTS.md` conventions as the intended architecture. Treat deviations as findings only when the code and impact justify a refactor.

## Audit method

1. Inventory relevant files and identify large, repeated, or frequently imported modules.
2. Search for structural signals such as direct database calls in routes, repeated auth/error blocks, sequential awaits, broad selects, loops containing I/O, raw provider types crossing boundaries, and multi-step writes.
3. Read the complete surrounding flow before reporting a candidate, including callers, helpers, tests, and related types where needed.
4. Separate confirmed findings from hypotheses requiring runtime evidence. Do not claim a performance problem from file size or syntax alone.
5. Consolidate related symptoms under the underlying design issue instead of producing many small findings.

## Output

Lead with a one-sentence assessment, then present findings ordered by severity and leverage. For each finding include:

- **Severity**: high, medium, or low.
- **What**: the concrete problem and evidence.
- **Where**: file paths and approximate line numbers.
- **Impact**: security, correctness, performance, maintainability, or API consistency.
- **Refactor**: the smallest coherent change and its intended boundary.
- **Verification**: tests or measurements needed to prove the change.

End with a short prioritized sequence for implementation. Clearly label hypotheses and omit low-value stylistic preferences. If no meaningful opportunities exist, say so and summarize what was checked.
