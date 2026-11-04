# Shared Codex quality checks

The project Stop hook runs `pnpm lint` and `pnpm tsc --noEmit` from the repository
root whenever Codex finishes a turn, including turns without code changes. Both
checks run even if the first fails. Each check has a three-minute timeout.

Use a current Codex release with lifecycle-hook support, install the project's
dependencies with `pnpm install --frozen-lockfile`, and make sure Node.js, pnpm,
and Git are on the PATH used by Codex. The hook command uses a POSIX shell; on
Windows, run Codex in WSL or another environment with a POSIX shell.

## Activate once per teammate

1. Open a new Codex session in this repository and trust the project.
2. In Codex CLI, open `/hooks`, review the shared Stop hook, and trust it.
3. Review and trust the hook again when Codex marks its definition as changed.

Checking these files into Git shares the hook, but does not grant trust on
another person's machine. See the [official hooks documentation](https://developers.openai.com/codex/hooks).

## Failures and retries

On the first failing check, the hook blocks completion and asks Codex to inspect
the output, correct failures introduced by its changes, and report any remaining
problems. On the next Stop, both checks run again. If `stop_hook_active` is true,
remaining failures are shown as a warning and completion is allowed, avoiding an
unbounded correction loop. Missing tools and timeouts count as failures.

This is a local quality check, not an enforced merge gate. It does not require
zero warnings, and users can disable it. AGENTS.md retains the manual fallback
for sessions without an active hook. CI and branch protection are still needed
to enforce checks before merging.

To exercise the hook's success, failure, retry, and missing-tool behavior without
running the application checks:

```sh
node --test .codex/hooks/check-quality.test.mjs
```
