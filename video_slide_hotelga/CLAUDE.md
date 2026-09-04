# video_slide_hotelga, Principles

This folder builds a **36-screen vertical slide deck** (1080×1920, 9:16) that gets
recorded to MP4 for a live event. Content = Mirigi 24/7 functionality, **reframed
for hotels** (not condos, the rest of the site's default audience).

**Image-first.** Every slide carries a full-bleed background photo (`bg` in
`js/slides.js`) with a slow Ken Burns drift and a bottom scrim for text
legibility, see "Deck mechanics". Do not add slides without a `bg`; a
text-only card is the exception (pure `title` beats), not the norm.

**⚠️ Two slides (5–6, "Miri on WhatsApp" / "Temporal Stays") advertise
capabilities that do not exist in the product yet**, per a grounding check
against `mirigi-backend`: WhatsApp is listed only as a "future milestone" (no
webhook/message-sending path anywhere in backend, resident-frontend, or staff
repos), and "temporal stays" has no backend model at all, not even a partial
building block. The user was told this explicitly and chose to keep the
copy present-tense sitewide anyway (matching `collections/_features/en/
whatsapp-miri.md` and `temporal-stays.md`, which carry the same claim). This
is a **deliberate, informed exception** to the grounding rule below, don't
"fix" it back to hedged/roadmap language without checking with the user first,
and don't treat its presence here as license to skip grounding on future
slides.

**Every other `miri` example is grounded against a real `mirigi_*` AI tool**
in `mirigi-backend/app/resident/ws/v2/ai_chat.py` (a second audit pass ,
see git history / session notes for the full table). Concretely this means:
- Food ordering, valet requests, amenity reservations, guest-list additions,
  and maintenance/service requests are all real tool-backed actions
  (`mirigi_create_food_order`, `mirigi_request_vehicle`,
  `mirigi_create_reservation`, `mirigi_add_guest`/`mirigi_create_guest_authorization`,
  `mirigi_create_request`).
- Package delivery (slide 10) and folio balance (slide 19) are **answer-only**
 , Miri can tell the guest status/balance, but there's no tool for her to
  *dispatch* a delivery or *post a charge*, so those slides never show her
  proposing/confirming an action, only answering a question.
  Do not upgrade them to an `ask`/confirm action without a real backend tool.
  Weekly-report emailing was cut for the same reason (no matching
  tool/pipeline). **Exception:** the Housekeeping slide's staff-reply turn
  ("The staff answered: …") is also ungrounded, no staff-status-to-chat
  pipeline exists yet, but the user was told this explicitly and asked for
  it back anyway (same deliberate-exception pattern as the WhatsApp/Temporal-
  Stays modules above). Don't re-cut it without checking with the user first.
- In-room device control (slide 15) is phrased as **scene-triggering**
  ("Run the Relax scene"), matching `intelligent-home.md`'s own example ,
  not literal numeric percentages/degrees, which isn't how the real tool
  (`mirigi_send_command`/`mirigi_execute_macro`) is described.
- The Feedback slide (17, formerly "Polls") is a **second deliberate
  exception**: a multi-category post-stay satisfaction form (rating Miri,
  the restaurant, housekeeping 1–5 by voice note) isn't the same mechanism
  as the single building-wide poll tool (`mirigi_answer_poll`, matching
  `polls.md`'s lobby-flooring example), that grounded version was cut and
  replaced with this one on explicit user request. Don't "fix" it back
  without checking with the user first, same as the other exceptions above.
- The Valet Queue slide (Act 3) is a **third deliberate exception, and the
  strongest one**: an AI camera reading license plates and auto-creating
  valet-queue records was checked against `mirigi-backend` and
  `mirigi-staff` and found to have **zero supporting code anywhere**, no
  computer-vision/ML libraries, no camera-trigger integration, not even a
  roadmap doc (unlike the WhatsApp exception, which at least has a "future
  milestone" note). The real mechanism today is a resident app request or a
  third-party VTS (Park1) sync, with staff manually uploading photos. The
  user was told this explicitly and confirmed the capability is real
  ("we now have support to link an AI camera to mirigi") and asked for it
  on both the slide and the live site. It is **not** a standalone feature
  page, per explicit instruction, it's folded into the existing
  `collections/_features/{en,es,fr,pt}/valet-parking.md` (description +
  body), the same way it should be discovered from the main features list.
  Don't hedge, cut, or re-split it into its own page without checking with
  the user first.

Read this file before touching anything here. It is the contract, mirroring
`/miniapps/CLAUDE.md`'s role for the miniapp folder, same spirit, adapted for a
video deck instead of an iframed widget.

## What this is

- A **standalone static page** (`index.html` + `css/` + `js/`), not a Jekyll
  template. It is served directly, like `/miniapps/`, so the render script can
  point puppeteer at it without a Jekyll build.
- Not meant to be browsed by real visitors or indexed. `index.html` carries
  `<meta name="robots" content="noindex,nofollow">` and this folder must stay
  out of `sitemap.xml` / `robots.txt` allow rules.
- Renders to video via a puppeteer + ffmpeg script (see "Rendering" below),
  following the exact pattern already proven in `scripts/render-miniapp-video.js`.

## Deck mechanics

- One `<section class="slide">` per screen, `100vw × 100vh` (1080×1920 viewport),
  absolutely stacked; JS driver shows one at a time and auto-advances on a timer.
- Slide content lives in a single inlined JS array in `js/slides.js`, **not**
  fetched from JSON (same rule as miniapps: inline, don't fetch, so the
  render script never races a network request).
- Each slide entry declares its own `durationMs` (default from `js/slides.js`
  `DEFAULT_DURATION_MS`); the render script sums these to compute total video
  length exactly like `cycleDurationMs()` does in `render-miniapp-video.js`.
- Keyboard (`←`/`→`/space) and a `?auto=0` query param let a human preview/step
  through the deck manually while authoring; the render script always uses the
  default autoplay path.
- Progress dots at the bottom edge (36 of them), useful for scrubbing while
  authoring, harmless in the recorded video (keep them subtle, not distracting).
- Every slide's `bg` is a full-bleed photo (`.bg` layer + `.scrim` gradient,
  see `css/slides.css`). `content` slides pin text to the bottom third over
  the photo; `title` slides with a `bg` center text over it
  (`slide--full-bg`). Reuse real site imagery (`img_mirigi/`, `img/features/`)
 , never placeholder/stock art, so the render always reflects the actual
  product.

### Miri popup

Guest-facing feature slides carry an optional `miri` field, an animated chat
card over the background, always labeled **"Miri · AI Concierge"** (never
just "Miri", never just "online", the identity must be unambiguous on every
skin, every time). Full schema/behavior is documented in the header comment
of `js/slides.js`; the short version:

- **`action`** `{ user, ask, status, confirmed, confirmWord? }`: Miri
  proposes (`ask`, a question) and only proceeds once the guest visibly
  confirms. **The confirmation mechanism matches the channel, because that's
  how the two channels actually work:** a tappable Confirm chip on the
  `app` skin (buttons are normal inside Mirigi's own app, the chip visibly
  *pulses*, selling the wait, before flipping to `status`), vs. the guest
  literally *typing* `confirmWord` (default "Yes") on the `whatsapp` skin,
  since WhatsApp has no custom UI buttons, that expands into a 4-turn
  conversation ending in `confirmed` (a full sentence; `status` is only the
  short chip label). **Never skip straight from "ask" to "done"**, the
  system must never look like it's just acting on its own.
- **`answer`** `{ user, answer }`: a plain informational reply, no
  confirmation step, for moments where Miri isn't taking an action.
  Reserved for capabilities without a matching action-tool (see the
  grounding note above) or genuine Q&A.
- **`conversation`** `{ conversation: [turn, ...] }`: a fully authored
  multi-turn exchange for slides where a single ask/confirm beat undersells
  the story (Temporal Stays, Housekeeping, Dining, Arrivals, Polls). Turn
  shape: `{ from: 'user'|'miri', text, meta?, pauseMs?, kind? }`.
  - `kind: 'audio'` renders a voice-note bubble (play glyph + waveform +
    duration) instead of typed text, used when a reply carries more data
    than fits a short line (e.g. dictating a name/ID/phone for guest
    registration, slide 11).
  - `kind: 'confirm'` renders a structured read-back card (intro line +
    label/value rows + optional footer), Miri repeating captured data
    before acting on it, so the guest can see exactly what was recorded.
  - `meta` renders a small caption above a line (e.g. a time-skip label).

Skin (`app` Mirigi-branded card, charcoal/pearl/gold vs. `whatsapp` green
bubbles) auto-cycles across the deck via `nextMiriStyle()`; set `miriStyle`
to force one (both WhatsApp-module slides force `whatsapp`, since the whole
point of those slides is that channel). `effectiveDuration()` folds the
popup's full animation time into the slide's dwell automatically, never
hand-set a `durationMs` short enough to clip a reply. Act 3 (staff console)
deliberately has **no** Miri popups, it's a different persona/mode (ops
screens, not guest chat).

## Content rules (carried over from `/miniapps/CLAUDE.md` + root `/CLAUDE.md`)

1. **No technical internals in copy.** Same substitution table as the rest of
   the site (MQTT → "real-time updates", OAuth → "secure API", etc). See root
   `/CLAUDE.md` → "Marketing Copy Rules". This deck is customer-facing (played
   at a live event in front of prospects), so the bar is the same as a feature
   page, not looser.
2. **Ground every capability claim in the backend/frontend/staff repos**
   before writing a slide, exactly as the root CLAUDE.md's grounding rule
   requires, see the audit note above for what's already been checked and
   what to watch for (action vs. answer-only, scene- vs. numeric-control,
   real vs. invented poll mechanics).
3. **Hotel framing, not condo framing.** Every noun switches: "residents" →
   "guests", "board" → "management" / "hotel management", "unit" → "room" /
   "suite", "building staff" → "hotel staff" (front desk, concierge,
   housekeeping, valet, F&B, security, management). The underlying feature is
   the same Mirigi capability, only the vocabulary and example scenarios
   change.
4. **Less is more.** One slide per distinct capability, not one per
   feature-page paragraph, de-duplicate ruthlessly (this deck already
   dropped several near-duplicate slides: separate valet-call/valet-track,
   amenities-booking/amenities-availability, branded-app said twice, etc.,
   were each merged into one). When a slide has a `miri` popup, skip a `body`
   paragraph that just restates what the chat already shows.
5. **Localization: one source of truth, not a copy per language.** Every
   user-visible string in `js/slides.js` is either a plain string (identical
   in every language) or a `{ en: '...', es: '...' }` object; the `t(field)`
   helper (defined inside the engine IIFE, where the page's `lang` is known)
   picks the right one at render time. `lang` comes from `?lang=` in the URL
  , the same convention as `/miniapps/CLAUDE.md` §2 (`data-i18n`), adapted
   to a JS-object deck instead of DOM attributes. **There is only one
   `index.html` and one `js/slides.js`**, adding a language means adding a
   key to each `{en, es}` object, never a second copy of the file. (A prior
   pass did exactly that, `slides.es.js` + `es/index.html`, and it was
   correctly rejected and merged back; see git history if you're tempted to
   fork the file again.) The "Every Language" slide's own `miri` object is
   the one deliberate exception: every field on it is a plain string in
   Portuguese, not `{en,es}`, it's a fixed feature demo (showing Miri
   handling a language the deck itself isn't even displayed in) and must
   NOT change when the deck's display language changes.

## Rendering to video

`scripts/render-hotelga-video.js` (Playwright + `ffmpeg-static`, both
devDeps, puppeteer/system-ffmpeg weren't available in this environment, so
this diverged from the original `render-miniapp-video.js` plan):

- Spin up a static file server at repo root.
- Playwright Chromium, viewport `1080×1920`, `context.recordVideo`.
- Navigate to `/video_slide_hotelga/?auto=1&lang=<LANG>` (the single deck,
  language selected via the same `?lang=` param described above, there is
  no separate per-language path anymore), wait for `.slide`.
- Read `window.MIRIGI_TOTAL_DURATION_MS` (computed by the deck itself,
  against the requested language's actual text length) and wait exactly
  that long + a small tail buffer, never hand-guess or duplicate the
  per-slide timing math in the render script.
- Transcode webm → mp4 with `ffmpeg-static` (`libx264`, `crf 22`,
  `yuv420p`, `+faststart`, even-dimension pad filter).
- Output to `video-out/hotelga-24-7-<lang>.mp4` (+ `.webm`).

```
node scripts/render-hotelga-video.js                 # English
node scripts/render-hotelga-video.js --lang=es        # Spanish
```

## The 36-slide outline

Regenerate this list from `js/slides.js` whenever slides are added/removed/
reordered (don't hand-edit it out of sync, it's a reading aid, the array is
the source of truth):

```
node -e "
const fs = require('fs');
const src = fs.readFileSync('video_slide_hotelga/js/slides.js','utf8');
const m = src.match(/var SLIDES = (\[[\s\S]*?\n\]);/);
const arr = eval(m[1]);
arr.forEach((s,i) => {
  const label = s.kind==='title' ? s.wordmark+' / '+s.tagline : (s.kicker||'') + ', ' + (s.title||'');
  console.log((i+1)+'. '+label+(s.miri?'  [miri]':''));
});
"
```

**Act 1, Hook (1–4):** cold open, the problem, positioning, meet Miri.
**New modules (5–6):** Miri on WhatsApp, Temporal Stays, see the exception
note above.
**Act 2, Guest journey (7–24):** Dining, Valet, Amenities, Deliveries,
Arrivals, Housekeeping, Guest Safety, Security, In-Room Controls, In-Room
Guide, Polls, Your Brand, Billing, Reports, Bespoke, Every Language, Trust,
Recap.
**Act 3, Staff operations (25–32), no Miri popups:** Staff Console, Front
Desk, Concierge, Valet Queue, Housekeeping, Security, Management, Role-Based
Access.
**Act 4, Proof + CTA (33–36):** Trusted By, Why Mirigi, Contact, closing
wordmark.

Total is intentionally **down from an earlier 45**, several near-duplicate
slides were merged and two CTA slides ("What our customers say" / "Schedule
a demo") were cut outright. Prefer cutting/merging over padding; don't grow
the count back up without a reason tied to actual new content.

## Don'ts

- ❌ Don't fetch slide content from a JSON file, inline it in `js/slides.js`.
- ❌ Don't mention implementation internals (see substitution table in root
  `/CLAUDE.md`).
- ❌ Don't invent hotel capabilities that don't exist in the product, verify
  against the sibling repos first (and see the grounding audit note above
  before assuming a `miri` example is safe to add as an `action`).
- ❌ Don't let this folder get indexed or linked from the public nav, it's a
  video-production asset, not a page.
- ❌ Don't ship a slide without a `bg` photo unless it's a rare pure-type beat.
- ❌ Don't let an `action`-type `miri` skip the confirmation step, on either
  skin, the guest must always be shown approving before Miri "acts".
- ❌ Don't add a near-duplicate slide when an existing one already covers the
  capability, merge or replace instead (see "Less is more" above).
