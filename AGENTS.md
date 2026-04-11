# Trail Running Cal — agent context

Product and positioning reference for AI agents. For code style and engineering conventions, see `CLAUDE.md` and `.cursor/rules/`.

## What it is

Trail Running Cal (**Trail Running Calendar** in SEO/schema) is a bilingual (Spanish + Catalan) web product at [https://www.trailrunningcal.com](https://www.trailrunningcal.com) that helps people discover and plan trail and mountain races in Catalonia, Spain.

## Core user promise

A single, maintained calendar of races across all Catalan provinces (Barcelona, Girona, Lleida, Tarragona), from popular races to ultras, with search and filters (e.g. month, province, distance, race type, difficulty) and a map + list experience so runners can find their next event.

## Audience

Main user: runners looking for races, saving favorites, and sharing race pages.

## Product surface (high level)

Public calendar and race detail pages, category/programmatic-style exploration (distance/type verticals), blog (trail content around Catalonia: training, nutrition, performance), contact, and authenticated areas implied by the stack (e.g. profile, admin-style tooling in the codebase for curation).

## Current positioning

Regional authority: “reference platform” / “most complete calendar” for trail running in Catalonia, not a generic global race DB.

## Vision / ambition (inferred from positioning)

Be the default discovery layer for trail racing in Spain—strong SEO and structured data, local language, and trust via curation, organizer relationships, and up-to-date listings.

## Non-goals (implicit)

The product is geographically scoped to Catalonia and focused on trail/mountain events, not road-running calendars or worldwide coverage.

## Essential tech stack

Next.js App Router, React, TypeScript, Tailwind. next-intl for es/ca locale URLs. Supabase for DB, auth, and storage. MapLibre for maps. MDX for blog. PostHog + Resend; Vitest for tests. Admin flows may use OpenAI / OpenRouter. Prod site: trailrunningcal.com

## Main metrics (March 2026)

| Metric | Value |
| --- | --- |
| Monthly visits | ~3,000 |
| Listed events | ~600 |
| MoM visits growth | 100% |
| Mobile share | 67% |
| Organic traffic (Google Search) | 85% |

## Analytics note (implementation)

Product usage is instrumented via PostHog (proxied `/ingest`), Vercel Analytics, and possibly Cloudflare Web Analytics; headline numbers above are business snapshots and may not live in the repo.
