---
name: component-audit
description: Audit the codebase for React component extraction opportunities — repeated JSX patterns, large inline blocks, or logic that would be cleaner as a dedicated component. Use this skill whenever the user asks to "audit components", "find component opportunities", "look for repeated JSX", "find duplication", "refactor components", "check if anything should be a component", or anything about componentization or React code reuse. Also invoke proactively after large feature additions.
---

# Component Audit

Your job is to scan the codebase and surface concrete opportunities to extract React components. You are looking for real, actionable improvements — not speculative cleanup. A codebase with no opportunities is a valid result; don't invent issues.

## What to look for

**1. Repeated JSX blocks** — The same (or nearly the same) JSX structure appears in two or more places. Even with slightly different props, it's a strong candidate.

**2. Large inline render sections** — A single file renders a complex, self-contained section (e.g. a card, a modal trigger, a stat block) that could be named and extracted without changing behavior.

**3. Duplicated patterns across pages** — Multiple page files share a structural pattern (e.g. every list page has the same empty-state markup, or every form page has the same section header).

**4. Mixed concerns in one component** — A component is doing clearly separate jobs (e.g. fetching + layout + a complex sub-section). Extraction would make each piece testable and readable independently.

**5. Inline JSX that already has a clear name** — If you find yourself wanting to add a comment like `{/* Race card */}` above a block, that block wants to be a component.

## How to scan

Spawn an Explore agent with this mission:

> "Scan app/ and components/ for repeated or extractable JSX patterns. Look for: identical or near-identical JSX blocks used in multiple files, large self-contained render sections inside page files, structural patterns repeated across pages (empty states, section headers, stat blocks, form layouts), and inline JSX blocks that are clearly doing one named thing. The project uses Next.js with app/[locale]/ routing — pages live in app/[locale]/(public)/ and app/[locale]/org/. Return your findings as a raw list of observations with file paths and line numbers where possible."

Use the Explore agent's observations as raw material — apply your own judgment to decide which observations are real opportunities worth surfacing.

## Output format

Present findings as a numbered list. Each item must include:

- **What**: a one-sentence description of the pattern or duplication
- **Where**: file path(s) and approximate line numbers
- **Component name**: a suggested name in PascalCase
- **Props**: a rough interface — just the key props, not exhaustive types

If zero opportunities are found, say so clearly and briefly explain why the code is already well-componentized.

**Example entry:**

> **1. Race status badge**
> **What**: An inline `<span>` with status-conditional class names and label text appears in `race-card.tsx` and `race-detail-page.tsx`.
> **Where**: `app/[locale]/(public)/races/race-card.tsx:42`, `app/[locale]/(public)/races/[slug]/page.tsx:87`
> **Component name**: `RaceStatusBadge`
> **Props**: `status: 'upcoming' | 'past' | 'cancelled'`

Keep descriptions tight. Avoid recommending extractions that add abstraction without reducing duplication or improving readability.
