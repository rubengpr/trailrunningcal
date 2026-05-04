---
name: agents-md-include
description: Evaluates whether a proposed rule belongs in AGENTS.md. Use this skill whenever the user proposes adding a rule, guideline, convention, or instruction to AGENTS.md — including when they ask "should I add X to AGENTS.md?", "is this worth documenting?", want to audit or prune existing entries, or are unsure whether something is too obvious to include. Also use when the user wants to write a new rule and needs a verdict before touching the file.
---

## Why this matters

AGENTS.md files work best when they're short. Every unnecessary rule dilutes the ones that matter — if the file grows too long, the coding agent starts missing important instructions. The goal of this filter is to keep it lean and effective.

## The filter

### The one question

> "Would removing this cause the coding agent to make mistakes on this project?"

If no → don't add it.

### Include

- Bash commands specific to this project that the coding agent can't guess from context
- Code style rules that differ from the language/framework defaults
- Testing instructions and preferred test runners
- Repo etiquette (branch naming, PR conventions, commit format)
- Architectural decisions specific to this project
- Developer environment quirks (required env vars, toolchain oddities)
- Common gotchas or non-obvious behaviors unique to the codebase

### Exclude

- Anything the coding agent can figure out by reading the code
- Standard language/framework conventions the coding agent already knows
- Detailed API documentation (link to the docs instead)
- Information that changes frequently
- Long explanations or tutorials
- File-by-file descriptions of the codebase
- Self-evident practices ("write clean code", "handle errors", "use meaningful names")

## Workflow

1. If no rule was provided, ask: "What rule are you thinking of adding?"
2. Apply the filter above to the proposed rule
3. Return a short, decisive verdict — no hedging
4. If **Include**, offer to write it to AGENTS.md — AGENTS.md and CLAUDE.md are symlinked, so editing AGENTS.md is sufficient and preferred

## Additional signals

Watch for these patterns and respond accordingly:

- **"Coding agent keeps ignoring this rule"** → The file is probably too long. Suggest pruning before adding more.
- **"Coding agent keeps asking about X when it's already in AGENTS.md"** → The wording is ambiguous. Suggest fixing the phrasing rather than adding a new rule.
- **Syncing** → AGENTS.md and CLAUDE.md are symlinked — always edit AGENTS.md directly. One write covers both.

## Output format

**Verdict: Include** (or **Exclude**)

**Reasoning:** [1-2 sentences — which criterion it hits and why removing it would (or wouldn't) cause mistakes]

[If Include] Want me to write this to AGENTS.md?
