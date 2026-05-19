# Miniapps — Principles

This file is the contract for anyone (human or AI) adding or modifying a miniapp.
Read this **before** writing any miniapp code, then check existing miniapps for the live pattern.

## What a miniapp is

A self-contained HTML/CSS/JS widget loaded into a feature page through an iframe
(`feature.html` builds the src as `/miniapps/{page.miniapp}/?lang={page.lang}&size=large`).

Each miniapp lives in its own folder under `miniapps/features/<slug>/` and ships:
- `index.html` (the only required file)
- optional `img/`, `bg.jpg`, etc.

Shared library code (CSS + JS reused by 2+ miniapps) lives under `miniapps/lib/`.

## The non-negotiables

### 1. Scraper-readable English content in static HTML

Search engines, social-media link previews, screen readers, and crawl-only audits
all consume the initial HTML response. They do not execute long JS pipelines and
will not see content rendered after a `fetch()`.

**Rule:** every word a human will see must be present in the document the server
sends. Either as the primary visible DOM (when content is static), or as a
`<ul class="sr-only">` block at the bottom (when the visible DOM is built by JS).

Never `fetch()` content over the network. Inline it.

**About the iframe boundary and SEO.** A miniapp is loaded into the feature
page through an iframe, so its text is crawlable at the iframe's own URL
(`/miniapps/features/<slug>/`) but is **not** attributed to the parent feature
page for ranking purposes. Twitter Cards / OpenGraph previews also do not
descend into iframes. This is fine for *visual demo* text (captions, axis
labels, chart titles) — that's what the miniapps are for. But if a miniapp
ever contains text that we want the feature page itself to rank on, the text
must also be mirrored into the feature page — either in the markdown body or
as an `<aside class="sr-only">` block next to the iframe in `_layouts/feature.html`.
The inline Miri AI example block (rendered server-side from the page's
`miri_ai_example` frontmatter, **not** iframed) is the established pattern for
high-value SEO content; iframes are for supplementary demos.

### 2. Localization is one pattern only

```html
<h1 data-i18n="title">My Widget</h1>
<p  data-i18n-html="subtitle">Welcome to <b>my widget</b>.</p>
```

```js
var lang = (new URLSearchParams(location.search).get('lang') || 'en').toLowerCase();
if (!['en','es','fr'].includes(lang)) lang = 'en';

var T = {
  en: { title: 'My Widget', subtitle: 'Welcome to <b>my widget</b>.' },
  es: { ... },
  fr: { ... }
};

function tr(path) {
  var parts = path.split('.'), v = T[lang];
  for (var i = 0; i < parts.length; i++) v = v && v[parts[i]];
  if (v == null) { v = T.en; for (var j = 0; j < parts.length; j++) v = v && v[parts[j]]; }
  return v;
}
document.querySelectorAll('[data-i18n]').forEach(function (el) {
  var v = tr(el.getAttribute('data-i18n'));
  if (typeof v === 'string') el.textContent = v;
});
document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
  var v = tr(el.getAttribute('data-i18n-html'));
  if (typeof v === 'string') el.innerHTML = v;
});
```

- **English is the source of truth.** The static HTML carries English text; JS
  swaps it on load when the active language is ES or FR.
- **`data-i18n`** sets `textContent`. **`data-i18n-html`** sets `innerHTML`
  (for strings containing `<b>`, `<i>`, etc).
- **Inline the dictionary.** No `fetch('data/{lang}.json')`. That breaks scrapers,
  adds a roundtrip, and creates four files where one suffices.
- **Fall back to English** when a key is missing.

For dynamically-generated DOM (JS-built carousels, animated stacks), the items
must still appear in the static HTML as a `<ul class="sr-only">` fallback list,
so scrapers see the underlying text.

### 3. Lang and size from query string

`feature.html` always passes `?lang={en|es|fr}&size={large|small}`. Read both
from `location.search`. `size=small` is the compact variant used in the carousel
on the homepage; honor it where it matters (font sizes, animation speeds), but
the marketing feature page always loads `size=large`.

### 4. CSS isolation

The iframe boundary already isolates the miniapp from the parent site's CSS —
Bootstrap, grayscale.scss, `.about-section p { margin: 5rem }`, none of it
reaches in. **Do not** assume the parent's styles are available; **do not**
emit styles that try to escape (no `:host`, no parent-targeting tricks).

Inside the miniapp:
- Start every stylesheet with `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }`.
- Set `html, body { width: 100%; height: 100%; overflow: hidden; }` so the
  miniapp fills its iframe and never produces inner scrollbars.
- Use any class names you want for one-off miniapps — there's nothing to
  collide with. For **shared library code** (`miniapps/lib/*`), pick distinctive
  names (e.g. `.shot`, `.cdot`, `.miri-chat__*`) so the lib doesn't have to
  worry about what an instance might re-use.

### 5. Pause animations when off-screen

Burning CPU when no one's looking is rude. Every animated miniapp must pause
itself when the iframe scrolls out of view OR when the tab is hidden:

```js
document.addEventListener('visibilitychange', function () {
  if (document.hidden) stop(); else start();
});
if (window.frameElement && 'IntersectionObserver' in window) {
  new IntersectionObserver(function (entries) {
    if (entries[0].isIntersecting) start(); else stop();
  }, { threshold: 0.05 }).observe(window.frameElement);
} else {
  start();
}
```

### 6. Marketing copy rules apply

No internals in user-visible strings. The rules in `/CLAUDE.md` ("No internals
in marketing copy") apply equally to miniapp text. Replace SQL/MQTT/Twilio/OAuth
mentions with the user-visible behavior they enable.

## Code reuse via `miniapps/lib/`

When two or more miniapps share an animation pattern, factor it into the lib:
- `miniapps/lib/<pattern>.css` — generic styles
- `miniapps/lib/<pattern>.js` — generic logic that reads `window.MIRIAPP_<NAME>`

The instance miniapp then becomes a thin config file:

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="stylesheet" href="../../lib/<pattern>.css">
</head>
<body style="--backdrop-url: url('/img/features/foo.jpg'); --card-aspect: 1465/2845;">
  <div id="stage"></div>
  <ul class="sr-only" aria-label="...">
    <li>English caption 1</li>
    <li>English caption 2</li>
  </ul>
  <script>
    window.MIRIAPP_SHOTS = {
      intervalMs: 4800,
      shots: [
        { src: 'img/skin-1.png', labels: { en: '...', es: '...', fr: '...' } },
        ...
      ]
    };
  </script>
  <script src="../../lib/<pattern>.js"></script>
</body>
</html>
```

**Variation lives in CSS variables on `<body>`** (e.g. `--backdrop-url`,
`--card-aspect`) and in the `window.MIRIAPP_*` config object — never by editing
the lib for one consumer.

Lib path: `miniapps/lib/` (no leading underscore — Jekyll excludes `_*` dirs
from the build by default).

## Existing libraries

- **`lib/screenshots.{css,js}`** — phone-shaped (or any aspect-ratio) screenshot
  carousel with a blurred photographic backdrop, spotlight vignette, gold accent
  line, Ken Burns drift, glass-pill captions, click-to-jump dots. Config shape:
  ```js
  window.MIRIAPP_SHOTS = {
    intervalMs: 4800,
    shots: [ { src, labels: { en, es, fr } } ]
  };
  ```
  Body CSS variables: `--backdrop-url`, `--card-aspect`. Instance must also
  include a `<ul class="sr-only">` listing English captions. Used by:
  `features/fully-customizable/`.

## Existing one-off miniapps

- **`features/ai-concierge/`** — 3D-stack of conversation cards with Miri.
  Conversations inlined as `SCENARIOS` array with per-field `{en,es,fr}`.
  Static `<ul class="sr-only">` provides the scraper-readable transcript.
- **`features/reports/`** — Animated SVG chart carousel for the Reports feature.
  Card titles, group labels, toolbar pills, tooltip text — all `data-i18n`.
  Dates computed relative to today via JS; month names language-aware.

If a third miniapp would reuse any of these patterns, factor it into `lib/`
before adding it.

## Don'ts

- ❌ Don't `fetch()` content from JSON/data files. Inline it.
- ❌ Don't put translatable text only in JS — it must appear in static HTML too.
- ❌ Don't introduce a 4th localization pattern; the one above is the only one.
- ❌ Don't mention implementation internals in user-visible strings.
- ❌ Don't put shared code in `miniapps/_lib/` (leading underscore = Jekyll
  ignores it). Use `miniapps/lib/`.
- ❌ Don't assume parent-site CSS is available — the iframe isolates everything.
- ❌ Don't ship a miniapp that keeps animating off-screen — use the pause helper.
- ❌ Don't copy-paste an existing miniapp's CSS+JS as the start of a new one when
  the existing code is already shared as a lib; configure the lib instead.
