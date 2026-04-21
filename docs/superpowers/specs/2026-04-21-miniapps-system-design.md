# Miniapps System Design

**Date:** 2026-04-21  
**Status:** Approved

## Overview

A system for self-contained interactive mini-applications that replace static images on feature pages and homepage cards. Each miniapp is a standalone HTML file embedded via `<iframe>`, fully isolated from the Jekyll build system. The AI concierge chat demo is the first instance.

---

## 1. Folder Structure & Convention

```
miniapps/
  {area}/
    {slug}/
      index.html        ← self-contained miniapp (all JS/CSS inline)
      data/
        en.json
        es.json
        fr.json
```

**Example:** `miniapps/features/ai-concierge/index.html`

**The system rule (one sentence):** A miniapp is a folder under `miniapps/{area}/{slug}/` containing a self-contained `index.html` and a `data/` folder with one JSON file per language; it accepts `lang` (default: `en`) and `size` (`large` | `small`, default: `large`) as URL query params and must render correctly at both sizes with no external dependencies.

Jekyll passes the `miniapps/` folder through as static files — no Jekyll integration required inside miniapps.

---

## 2. Registering a Miniapp

Add a `miniapp` field to the feature's frontmatter. The `image` field is kept for OG tags, brochure, and proposal fallback.

```yaml
---
title: "Miri — The First AI Concierge Agent That Acts"
image: "/img_mirigi/ai-concierge.jpg"
miniapp: "features/ai-concierge"
layout: feature
---
```

---

## 3. Embedding Contract

### Feature page (`_layouts/feature.html`)

Replace the `<div class="image">` with:

```html
{% if page.miniapp %}
  <iframe
    src="/miniapps/{{ page.miniapp }}/?lang={{ page.lang }}&size=large"
    class="miniapp-frame miniapp-frame--large"
    frameborder="0" scrolling="no" allowtransparency="true">
  </iframe>
{% else %}
  <div class="image" style="background-image: url('{{ resolved_image }}')"></div>
{% endif %}
```

### Homepage feature card (`_includes/feature_div.html`)

`feature_div.html` has two branches (even/odd for alternating layout). In both branches, replace the `<div class="image">` with:

```html
{% if feature.miniapp %}
  <iframe
    src="/miniapps/{{ feature.miniapp }}/?lang={{ page.lang }}&size=small"
    class="miniapp-frame miniapp-frame--small"
    frameborder="0" scrolling="no">
  </iframe>
{% else %}
  <div class="image" style="background-image: url('{{ image }}')">
    <p class="photo_credits">{{ feature.image_credits }}</p>
  </div>
{% endif %}
```

Both even and odd branches get the same replacement.

### Sizes

| Size    | Context             | Approx height |
|---------|---------------------|---------------|
| `large` | Feature page        | ~500px        |
| `small` | Homepage card       | ~280px        |

The miniapp owns all sizing internally — no CSS is injected from the parent page.

### CSS for iframe containers

Add to `scss/grayscale.scss` (or `_brochure.scss` is out of scope — these are live-page only):

```scss
.miniapp-frame {
  border: none;
  width: 100%;
  display: block;
}
.miniapp-frame--large {
  height: 500px;
}
.miniapp-frame--small {
  height: 280px;
}
```

---

## 4. AI Concierge Miniapp — Interaction Design

### Visual structure

A vertical stack of iMessage-style chat cards. The topmost card is always "live" (actively typing). Below it sit the most recently completed cards, slightly scaled down and dimmed to create depth.

```
[active card — typing in progress]   ← newest, full size
[completed card]                     ← 92% scale, 85% opacity  
[completed card, fading out]         ← 85% scale, 70% opacity
```

The number of completed cards visible beneath the active card is calculated dynamically from the container height:

```js
visibleCount = Math.max(1, Math.floor(
  (containerHeight - activeCardHeight) / collapsedCardHeight
))
```

No hardcoded maximum — adapts naturally to `large`, `small`, and any future size.

### Animation sequence (per card)

1. New card slides up from below into the active position (spring ease)
2. User message types out character by character (~40ms/char)
3. Brief pause → thinking indicator appears (3 animated dots)
4. Miri reply types out
5. Card is complete → eases downward, joins the stack
6. Oldest visible card fades out and is removed
7. Next card begins emerging → repeat

**Starting state:** The loop opens with one card already complete in the stack and a second card mid-entry, so the screen is never empty.

**Loop:** Cards cycle through the full JSON array (`index % N`), infinite and seamless.

### `small` size behavior

- Typing animations replaced by instant appearance (messages appear fully, no character-by-character)
- Thinking dots still shown
- Same dynamic height calculation (will typically show 1 completed card beneath the active one)
- Drag disabled (too fiddly at small size)
- Auto-play speed reduced to 60%

### Magnetic follow (the invitation)

Even without interaction, the card stack tilts subtly toward the cursor or touch position:

- Max tilt: ~10° on X and Y axes
- Applied via `transform: perspective(800px) rotateX() rotateY()`
- Mouse: driven by cursor position relative to iframe center
- Mobile: driven by touch position (no `deviceorientation` — too intrusive)
- Effect is strongest on the active card, cascades at 60% intensity on cards below

### Drag + physics

- Only the active (top) card is draggable
- User grabs and throws the card; release sends it flying with the drag velocity
- Thrown card bounces off iframe walls with damping (coefficient ~0.6)
- After settling or leaving bounds for >2s, card fades back into the stack
- Throwing a card immediately advances to the next card in the sequence
- Physics: vanilla JS — velocity vector + friction per frame + wall collision detection (~60 lines, no library)

---

## 5. Data Format

`data/en.json` (same structure for `es.json`, `fr.json`):

```json
[
  {
    "scenario": "Order food",
    "icon": "🍝",
    "user": "I'd like spaghetti carbonara and fresh orange juice.",
    "miri": "Got it, I've placed your food order."
  },
  {
    "scenario": "Request the car",
    "icon": "🚗",
    "user": "Please send the car to the entrance in ten minutes.",
    "miri": "Understood, I've requested the car for you."
  },
  {
    "scenario": "Reserve the barbecue",
    "icon": "🍖",
    "user": "Please reserve the barbecue for Saturday evening.",
    "miri": "Sure, I've requested the barbecue reservation for Saturday evening."
  },
  {
    "scenario": "Report a broken light",
    "icon": "🔧",
    "user": "There is a broken light on the ceiling of the hallway in my apartment.",
    "miri": "Thanks, I've reported the broken hallway ceiling light to maintenance."
  }
]
```

**Fields:**
- `scenario` — card title (bold header)
- `icon` — emoji displayed in card header alongside scenario name
- `user` — message typed out first (blue bubble, right-aligned)
- `miri` — response typed out after thinking dots (white bubble, left-aligned, "Miri" label)

Cards play in array order. Each language file may have a different number of cards.

---

## 6. Files to Create / Modify

### New files
- `miniapps/features/ai-concierge/index.html`
- `miniapps/features/ai-concierge/data/en.json`
- `miniapps/features/ai-concierge/data/es.json`
- `miniapps/features/ai-concierge/data/fr.json`

### Modified files
- `_layouts/feature.html` — iframe embed when `page.miniapp` is set
- `_includes/feature_div.html` (or equivalent homepage card include) — iframe embed when `feature.miniapp` is set
- `collections/_features/en/0-ai-concierge.md` — add `miniapp: "features/ai-concierge"`
- `collections/_features/es/0-ai-concierge.md` — add `miniapp: "features/ai-concierge"`
- `collections/_features/fr/0-ai-concierge.md` — add `miniapp: "features/ai-concierge"`

### Out of scope
- Brochure (`brochure.html`) — keeps static image (iframes don't print)
- Proposal (`proposal.html`) — keeps static image
- OG/Twitter meta tags — keep using `page.image`
