# AI Concierge (Miri) — Feature & Rebrand Design Spec

**Date:** 2026-04-21  
**Status:** Approved

## Goal

Add Miri — Mirigi's AI concierge — as a first-class feature on the website, and rebrand the site's positioning from "Smart Concierge" to "AI Concierge" across all three languages (en, es, fr).

## Positioning

**Core line:** "Miri — the AI concierge that just acts."

The "world's first" claim was considered and rejected after fact-checking. Competitors (Stan AI, EliseAI, Concierge Plus, Unify LIV) already offer AI chat for property management. Mirigi's differentiator is depth of action: Miri doesn't just answer questions — she places orders, requests cars, makes reservations, and executes requests end-to-end through Mirigi's existing modules.

## Scope

### 1. New Feature Page — `ai-concierge.md` (en/es/fr)

Three files, one per language, following the standard feature frontmatter pattern:

```yaml
---
title: "Miri — AI Concierge"
image: "/img_mirigi/ai-concierge.jpg"
layout: feature
keywords: ai concierge, miri, chat, artificial intelligence, resident experience, automation
description: "Meet Miri — Mirigi's AI concierge that acts on any resident request instantly."
---
```

**English body content:**

> Meet Miri, Mirigi's built-in AI concierge. Residents chat naturally — "I'd like Spaghetti Carbonara delivered to my unit" or "bring my car up in 10 minutes" — and Miri handles it end-to-end. No app menus to navigate, no forms to fill. Just ask.
>
> Miri connects to every Mirigi module: restaurant ordering, valet parking, amenity reservations, service requests, visitor access, and more. She knows the building's live menu, current amenity availability, and your preferences. She doesn't just answer questions — she places the order, logs the request, and sends you confirmation.
>
> For building staff, Miri reduces inbound calls and manual coordination. Every action Miri takes flows through the same Mirigi workflows staff already use — nothing changes on the back end, everything improves on the front end.

Spanish and French files contain equivalent translations of the above.

**Image:** `/img_mirigi/ai-concierge.jpg` — provided by the user (chat UI screenshot). This file must be added to the repo before the feature page will render correctly.

**Ordering:** Use filename prefix `0-ai-concierge.md` (rather than a `weight` frontmatter field) to ensure Miri appears first. Jekyll collection ordering by frontmatter requires explicit sort config in `_config.yml`; filename prefix is simpler and requires no config change.

### 2. Homepage Rebrand — `index.md` (en/es/fr)

**Frontmatter changes (English, translated equivalents for es/fr):**

| Field | Before | After |
|-------|--------|-------|
| `subheader` | `Smart concierge` | `AI Concierge` |
| `title` | `Mirigi Smart Concierge` | `Mirigi AI Concierge` |
| `description` | "Mirigi's smart concierge enhances..." | "Meet Miri — Mirigi's AI concierge that acts on any resident request: food orders, valet, reservations, and more, all in one conversation." |
| `keywords` | smart concierge, building management... | ai concierge, miri, building management, resident experience, luxury living, smart building |

**Body copy:** Prepend a new opening paragraph before the existing three paragraphs:

> Meet Miri — the AI concierge that just acts. Residents chat naturally to place food orders, request their car, book amenities, and more. No app menus to navigate, no forms to fill. Just ask.

Existing body paragraphs remain unchanged below.

### 3. Site Metadata — `_data/{en,es,fr}.yml`

| Field | Before | After |
|-------|--------|-------|
| `aboutTitle` | `SMART CONCIERGE` | `AI CONCIERGE` |

No other data file fields require changes.

### 4. Proposal Builder Integration

No layout changes required. The proposal builder (`_layouts/proposal-builder.html`) loads features from the Jekyll collection automatically. Adding the feature files from step 1 with `weight: 1` ensures Miri appears first in the selectable feature list.

## Out of Scope

- No new layout or include files
- No homepage callout block or hero section modification
- No changes to `_config.yml`
- No changes to brochure system

## Image Dependency

The implementation is blocked on the user providing `/img_mirigi/ai-concierge.jpg`. A placeholder can be used during development. The feature page will render without it but the image area will be empty.
