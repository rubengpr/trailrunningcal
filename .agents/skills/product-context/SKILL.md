---
name: product-context
description: Business, product, and market context for Trailrunningcal. Load when discussing strategy, roadmap, prioritization, or product decisions.
---

# Trailrunningcal — product context

## Brand name

Always use **Trailrunningcal** in communication, email subjects, and email bodies; never use "Trail Running Cal". The existing SEO/schema name is **Trail Running Calendar**.

## What it is

Trailrunningcal (**Trail Running Calendar** in SEO/schema) is a public quadrilingual (Spanish, Catalan, English, and French) web product at [trailrunningcal.com](https://www.trailrunningcal.com) that helps people discover and plan trail and mountain races across all of Spain. The expansion beyond Catalonia and Valencia is already complete, as confirmed by Ruben on 8 October 2026. Blog content remains Spanish and Catalan only. It is maintained by one single product engineer with limited resources.

## Core user promise

A single, maintained calendar of races across all of Spain, from popular races to ultras, with search and filters (month, province, distance, race type, difficulty) and a map + list experience so runners can find their next event.

## Audience

Main user: runners looking for races, saving favorites, and sharing race pages.

## Product surface

Public calendar and race detail pages, category/programmatic-style exploration (distance/type verticals), blog (trail content around Catalonia: training, nutrition, performance), contact, and authenticated areas (profile, admin-style tooling for curation).

## Positioning

A Spain-wide discovery and planning platform for trail and mountain races, built on local knowledge, maintained listings, and a curated calendar.

## Vision

Be the default discovery layer for trail racing in Spain. Strong SEO and structured data, local language, trust via curation, organizer relationships, and up-to-date listings.

## 2026 focus

The geographic expansion from Catalonia to all of Spain has already been completed. The current focus is to maintain and deepen national race coverage, discovery, and SEO, with the same curation and calendar quality bar.

## Scope / non-goals

The product and listings cover trail and mountain races across all of Spain. Road running and worldwide coverage remain out of scope. National listing coverage does not imply that traffic is evenly distributed across regions; use analytics to substantiate audience geography when needed.

## Core tech stack

Next.js (App Router), React, and TypeScript, deployed on Vercel. Supabase (Postgres + Auth) is the backend. Architecture is React Server Components plus Route Handler APIs, with server-side services over the database and client-side fetches to those APIs. next-intl for public UI in Spanish, Catalan, English, and French (`es`, `ca`, `en`, `fr`), while the blog remains `es` and `ca` only; MapLibre GL for the race map; PostHog, Vercel Analytics, and Cloudflare Web Analytics for observability.

## Main metrics (September 2026)

Audience figures verified in PostHog project `trailrunningcal` (103358) on 8 October 2026, using `$pageview` events, the Europe/Madrid timezone, and the project's internal/test traffic exclusions. Unique users are deduplicated across each complete period, not summed from daily or monthly counts.

Use September monthly figures in commercial outreach: around 20,000 unique visitors and 33,000 pageviews in September 2026. Always state the period.

| Metric | Value |
| ------ | ----- |
| Unique users (1–30 September 2026) | 20,726 |
| Pageviews (1–30 September 2026) | 33,379 |
| Unique users (1 July–30 September 2026) | 31,986 |
| Pageviews (1 July–30 September 2026) | 55,998 |

Other figures below were last recorded in August 2026 and were not reverified with this audience update.

| Metric | Value |
| ------ | ----- |
| Listed events | ~410 |
| Mobile share | 67% |
| Organic traffic (Google Search) | 85% |
