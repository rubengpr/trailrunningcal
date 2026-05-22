---
name: product-context
description: Business, product, and market context for Trail Running Cal. Load when discussing strategy, roadmap, prioritization, or product decisions.
---

# Trail Running Cal — product context

## What it is

Trail Running Cal (**Trail Running Calendar** in SEO/schema) is a bilingual (Spanish + Catalan) web product at [trailrunningcal.com](https://www.trailrunningcal.com) that helps people discover and plan trail and mountain races in Catalonia, Spain. It is maintained by one single product engineer with limited resources.

## Core user promise

A single, maintained calendar of races across all Catalan provinces (Barcelona, Girona, Lleida, Tarragona), from popular races to ultras, with search and filters (month, province, distance, race type, difficulty) and a map + list experience so runners can find their next event.

## Audience

Main user: runners looking for races, saving favorites, and sharing race pages.

## Product surface

Public calendar and race detail pages, category/programmatic-style exploration (distance/type verticals), blog (trail content around Catalonia: training, nutrition, performance), contact, and authenticated areas (profile, admin-style tooling for curation).

## Positioning

Regional authority: "reference platform" / "most complete calendar" for trail running in Catalonia — not a generic global race DB.

## Vision

Be the default discovery layer for trail racing in Spain. Strong SEO and structured data, local language, trust via curation, organizer relationships, and up-to-date listings.

## 2026 focus

Main goal for 2026 is to scale from Catalonia to trail and mountain racing across Spain: broader race coverage, discovery, and SEO at national level, with the same curation and calendar quality bar.

## Scope / non-goals

Today the product and listings center on Catalonia; 2026 work targets Spain-wide trail/mountain coverage (see 2026 focus). Still out of scope: road running and worldwide coverage.

## Core tech stack

Next.js (App Router), React, and TypeScript, deployed on Vercel. Supabase (Postgres + Auth) is the backend. Architecture is React Server Components plus Route Handler APIs, with server-side services over the database and client-side fetches to those APIs. next-intl for bilingual UI (es, ca); MapLibre GL for the race map; PostHog, Vercel Analytics, and Cloudflare Web Analytics for observability.

## Main metrics (April 2026)

| Metric                          | Value   |
| ------------------------------- | ------- |
| Monthly visits                  | ~10,000 |
| Listed events                   | ~300    |
| Month-over-Month visits growth  | 100%    |
| Mobile share                    | 67%     |
| Organic traffic (Google Search) | 85%     |
