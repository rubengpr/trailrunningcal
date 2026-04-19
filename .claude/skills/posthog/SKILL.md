---
name: posthog
description: Interact with PostHog via MCP. Use when working with feature flags, experiments, analytics events, dashboards, or insights.
metadata:
  author: ruben
  version: "1.0"
---

# PostHog MCP

## Feature flags

- Multivariate feature flags used in experiments must always have a variant with key exactly `"control"` — PostHog rejects experiment creation without it
- If an existing flag doesn't have a `"control"` variant, rename the closest variant using `update-feature-flag` before creating the experiment
