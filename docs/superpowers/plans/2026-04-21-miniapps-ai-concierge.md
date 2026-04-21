# Miniapps System — AI Concierge Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the miniapps system and ship the first instance — an interactive AI concierge chat demo that replaces the static image on the AI concierge feature page and homepage card.

**Architecture:** Static HTML files under `miniapps/` are served by Jekyll as-is (no Liquid, no build step). Each miniapp is a single self-contained `index.html` with all CSS/JS inline, plus `data/{lang}.json` files. Miniapps are embedded via `<iframe>` wherever Jekyll detects a `miniapp` frontmatter field.

**Tech Stack:** Vanilla HTML/CSS/JS (no libraries), Jekyll Liquid for embedding, SCSS for iframe container sizing.

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `miniapps/features/ai-concierge/index.html` | Self-contained chat demo miniapp |
| Create | `miniapps/features/ai-concierge/data/en.json` | English chat examples |
| Create | `miniapps/features/ai-concierge/data/es.json` | Spanish chat examples |
| Create | `miniapps/features/ai-concierge/data/fr.json` | French chat examples |
| Modify | `scss/grayscale.scss` | Add `.miniapp-frame` sizing rules |
| Modify | `_layouts/feature.html` | Conditional iframe on feature pages |
| Modify | `_includes/feature_div.html` | Conditional iframe on homepage cards |
| Modify | `collections/_features/en/0-ai-concierge.md` | Add `miniapp` frontmatter |
| Modify | `collections/_features/es/0-ai-concierge.md` | Add `miniapp` frontmatter |
| Modify | `collections/_features/fr/0-ai-concierge.md` | Add `miniapp` frontmatter |

---

## Task 1: Create JSON data files

**Files:**
- Create: `miniapps/features/ai-concierge/data/en.json`
- Create: `miniapps/features/ai-concierge/data/es.json`
- Create: `miniapps/features/ai-concierge/data/fr.json`

- [ ] **Step 1: Create directory and English data**

```bash
mkdir -p miniapps/features/ai-concierge/data
```

Create `miniapps/features/ai-concierge/data/en.json`:

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
  },
  {
    "scenario": "Book the gym",
    "icon": "🏋️",
    "user": "Can you book the gym for tomorrow at 7 am?",
    "miri": "Done! The gym is booked for tomorrow at 7:00 AM."
  }
]
```

- [ ] **Step 2: Create Spanish data**

Create `miniapps/features/ai-concierge/data/es.json`:

```json
[
  {
    "scenario": "Pedir comida",
    "icon": "🍝",
    "user": "Quiero espaguetis a la carbonara y jugo de naranja recién exprimido.",
    "miri": "Listo, he realizado tu pedido de comida."
  },
  {
    "scenario": "Pedir el coche",
    "icon": "🚗",
    "user": "Por favor, envía el coche a la entrada en diez minutos.",
    "miri": "Entendido, he solicitado el coche para ti."
  },
  {
    "scenario": "Reservar la parrilla",
    "icon": "🍖",
    "user": "Por favor, reserva la parrilla para el sábado por la noche.",
    "miri": "Claro, he solicitado la reserva de la parrilla para el sábado."
  },
  {
    "scenario": "Reportar una luz rota",
    "icon": "🔧",
    "user": "Hay una luz rota en el techo del pasillo de mi apartamento.",
    "miri": "Gracias, he reportado la luz del pasillo a mantenimiento."
  },
  {
    "scenario": "Reservar el gimnasio",
    "icon": "🏋️",
    "user": "¿Podés reservar el gimnasio mañana a las 7 am?",
    "miri": "¡Listo! El gimnasio está reservado para mañana a las 7:00 AM."
  }
]
```

- [ ] **Step 3: Create French data**

Create `miniapps/features/ai-concierge/data/fr.json`:

```json
[
  {
    "scenario": "Commander de la nourriture",
    "icon": "🍝",
    "user": "Je voudrais des spaghettis carbonara et un jus d'orange frais.",
    "miri": "C'est noté, j'ai passé votre commande."
  },
  {
    "scenario": "Demander la voiture",
    "icon": "🚗",
    "user": "Veuillez envoyer la voiture à l'entrée dans dix minutes.",
    "miri": "Compris, j'ai demandé la voiture pour vous."
  },
  {
    "scenario": "Réserver le barbecue",
    "icon": "🍖",
    "user": "Veuillez réserver le barbecue pour samedi soir.",
    "miri": "Bien sûr, j'ai réservé le barbecue pour samedi soir."
  },
  {
    "scenario": "Signaler une ampoule cassée",
    "icon": "🔧",
    "user": "Il y a une ampoule cassée au plafond du couloir de mon appartement.",
    "miri": "Merci, j'ai signalé l'ampoule cassée à la maintenance."
  },
  {
    "scenario": "Réserver la salle de sport",
    "icon": "🏋️",
    "user": "Pouvez-vous réserver la salle de sport demain à 7h ?",
    "miri": "C'est fait ! La salle de sport est réservée demain à 7h00."
  }
]
```

- [ ] **Step 4: Verify JSON is valid**

```bash
node -e "
  ['en','es','fr'].forEach(l => {
    const d = require('./miniapps/features/ai-concierge/data/' + l + '.json');
    console.log(l + ': ' + d.length + ' cards, keys: ' + Object.keys(d[0]).join(', '));
  });
"
```

Expected output:
```
en: 5 cards, keys: scenario, icon, user, miri
es: 5 cards, keys: scenario, icon, user, miri
fr: 5 cards, keys: scenario, icon, user, miri
```

- [ ] **Step 5: Commit**

```bash
git add miniapps/features/ai-concierge/data/
git commit -m "feat: add ai-concierge miniapp data files (en/es/fr)"
```

---

## Task 2: Build the miniapp — complete self-contained HTML

**Files:**
- Create: `miniapps/features/ai-concierge/index.html`

- [ ] **Step 1: Create the miniapp HTML file**

Create `miniapps/features/ai-concierge/index.html` with the full content below. This is the complete, final file — do not truncate or abbreviate any section:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    html, body {
      width: 100%; height: 100%;
      overflow: hidden;
      background: transparent;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }

    body {
      display: flex;
      justify-content: center;
      padding: 16px;
    }

    #container {
      width: 100%;
      max-width: 360px;
      height: calc(100% - 32px);
      will-change: transform;
      transform-style: preserve-3d;
    }

    #stack {
      display: flex;
      flex-direction: column-reverse;
      gap: 8px;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }

    /* flex-direction:column-reverse means lastChild = visually topmost card */

    .card {
      flex-shrink: 0;
      background: #fff;
      border-radius: 20px;
      box-shadow: 0 2px 16px rgba(0,0,0,.10), 0 1px 4px rgba(0,0,0,.06);
      padding: 14px 16px;
      cursor: grab;
      user-select: none;
      transition: transform .45s cubic-bezier(.34,1.56,.64,1), opacity .3s ease;
      will-change: transform, opacity;
    }

    /* Entry state: card starts here, animates to default (no transform) */
    .card--new {
      transform: translateY(70px);
      opacity: 0;
    }

    .card--complete { cursor: default; }
    .card--complete .card-body { display: none; }

    .card-header {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .card-icon { font-size: 20px; line-height: 1; }

    .card-scenario {
      font-size: 14px;
      font-weight: 700;
      color: #1c1c1e;
    }

    .card-body {
      margin-top: 10px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .msg-row { display: flex; }
    .msg-row--user { justify-content: flex-end; }

    .bubble {
      padding: 8px 13px;
      border-radius: 18px;
      font-size: 13.5px;
      line-height: 1.4;
      max-width: 88%;
      word-break: break-word;
    }

    .bubble--user {
      background: #007AFF;
      color: #fff;
      border-bottom-right-radius: 5px;
    }

    .bubble--miri {
      background: #f2f2f7;
      color: #1c1c1e;
      border-bottom-left-radius: 5px;
      min-height: 36px;
    }

    .miri-row {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 3px;
    }

    .miri-name {
      font-size: 11px;
      color: #8e8e93;
      padding-left: 4px;
    }

    .thinking {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 10px 14px;
      background: #f2f2f7;
      border-radius: 18px;
      border-bottom-left-radius: 5px;
    }

    .dot {
      width: 7px; height: 7px;
      background: #8e8e93;
      border-radius: 50%;
      animation: blink 1.3s infinite ease-in-out;
    }

    .dot:nth-child(2) { animation-delay: .22s; }
    .dot:nth-child(3) { animation-delay: .44s; }

    @keyframes blink {
      0%, 80%, 100% { opacity: .3; transform: scale(.8); }
      40%           { opacity: 1;  transform: scale(1);  }
    }
  </style>
</head>
<body>
  <div id="container">
    <div id="stack"></div>
  </div>

  <script>
    // ── Config ──────────────────────────────────────────────────
    const params  = new URLSearchParams(location.search);
    const lang    = params.get('lang') || 'en';
    const size    = params.get('size') || 'large';
    const isSmall = size === 'small';

    const CHAR_MS  = isSmall ? 0   : 35;     // ms per character; 0 = instant
    const SPEED    = isSmall ? 0.5 : 1.0;    // overall playback speed multiplier
    const THINK_MS = Math.round(1500 * SPEED);
    const DWELL_MS = Math.round(2200 * SPEED);
    const PAUSE_MS = isSmall ? 0   : 700;    // pause after user message, before thinking
    const COL_H    = 52;                     // collapsed card height (header only, px)
    const ACTIVE_H = 200;                    // estimated active card height for max-visible calc

    const container = document.getElementById('container');
    const stack     = document.getElementById('stack');

    let cards      = [];
    let idx        = 0;
    let maxVisible = 2;
    let isDragging = false;

    // ── Utilities ────────────────────────────────────────────────
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const raf   = ()  => new Promise(r => requestAnimationFrame(r));

    // ── Height-based max-visible calculation ─────────────────────
    // maxVisible = number of collapsed completed cards that fit below the active card
    function computeMax() {
      const available = container.offsetHeight - ACTIVE_H - 8;
      maxVisible = Math.max(1, Math.floor(available / (COL_H + 8)));
    }

    // ── Card DOM factory ─────────────────────────────────────────
    function makeCard(data) {
      const el = document.createElement('div');
      el.className = 'card card--new';
      el.innerHTML = `
        <div class="card-header">
          <span class="card-icon">${data.icon}</span>
          <span class="card-scenario">${data.scenario}</span>
        </div>
        <div class="card-body">
          <div class="msg-row msg-row--user">
            <div class="bubble bubble--user"></div>
          </div>
          <div class="thinking" style="display:none">
            <div class="dot"></div><div class="dot"></div><div class="dot"></div>
          </div>
          <div class="miri-row">
            <div class="miri-name" style="display:none">Miri</div>
            <div class="bubble bubble--miri"></div>
          </div>
        </div>`;
      if (!isSmall) setupDrag(el);
      return el;
    }

    async function typeText(el, text) {
      el.textContent = '';
      if (!CHAR_MS) { el.textContent = text; return; }
      for (const ch of text) { el.textContent += ch; await sleep(CHAR_MS); }
    }

    // ── Remove oldest completed cards when stack overflows ────────
    function trimStack() {
      // In column-reverse, firstChild = visually bottommost = oldest
      const completed = [...stack.children].filter(c => c.classList.contains('card--complete'));
      while (completed.length > maxVisible) {
        const oldest = completed.shift();
        oldest.style.transition = 'opacity .3s ease';
        oldest.style.opacity    = '0';
        setTimeout(() => oldest.remove(), 300);
      }
    }

    // ── Animate one card through its full lifecycle ───────────────
    async function showCard(data, instant) {
      const el = makeCard(data);
      // appendChild: in column-reverse layout this appears at the TOP visually
      stack.appendChild(el);

      // Trigger slide-in: remove --new class on next frame so CSS transitions fire
      await raf();
      el.classList.remove('card--new');

      if (instant) {
        // Seed card: show all content immediately, no typing
        el.querySelector('.bubble--user').textContent = data.user;
        el.querySelector('.miri-name').style.display  = '';
        el.querySelector('.bubble--miri').textContent = data.miri;
        await sleep(300);
        el.classList.add('card--complete');
        computeMax();
        return;
      }

      await sleep(450); // wait for slide-in spring to settle

      // Type user message
      await typeText(el.querySelector('.bubble--user'), data.user);
      await sleep(PAUSE_MS);

      // Show thinking dots
      const thinking = el.querySelector('.thinking');
      thinking.style.display = '';
      await sleep(THINK_MS);
      thinking.style.display = 'none';

      // Type Miri reply
      el.querySelector('.miri-name').style.display = '';
      await typeText(el.querySelector('.bubble--miri'), data.miri);

      // Dwell so user can read the completed card
      await sleep(DWELL_MS);

      // Collapse into stack, trim overflow
      el.classList.add('card--complete');
      computeMax();
      trimStack();
    }

    // ── Main loop ─────────────────────────────────────────────────
    async function loop() {
      // Seed: show first card already complete so screen isn't empty
      await showCard(cards[idx++ % cards.length], true);
      while (true) {
        await showCard(cards[idx++ % cards.length], false);
      }
    }

    // ── Magnetic follow ───────────────────────────────────────────
    // Tilts the whole container toward the cursor/touch — invites interaction
    function setupMagnetic() {
      const MAX_TILT = 10; // degrees

      const tilt = (cx, cy) => {
        if (isDragging) return;
        const r  = container.getBoundingClientRect();
        const dx = (cx - (r.left + r.width  / 2)) / (r.width  / 2);
        const dy = (cy - (r.top  + r.height / 2)) / (r.height / 2);
        container.style.transition = '';
        container.style.transform  =
          `perspective(900px) rotateY(${dx * MAX_TILT}deg) rotateX(${-dy * MAX_TILT}deg)`;
      };

      const reset = () => {
        container.style.transition = 'transform .6s ease';
        container.style.transform  = 'perspective(900px) rotateX(0) rotateY(0)';
      };

      document.addEventListener('mousemove',  e => tilt(e.clientX, e.clientY));
      document.addEventListener('mouseleave', reset);
      document.addEventListener('touchmove',
        e => tilt(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    }

    // ── Drag + physics ────────────────────────────────────────────
    // Only the active (topmost) card is draggable.
    // On release: velocity-based physics with wall bounce, then snaps back.
    function setupDrag(el) {
      let active = false;
      let sx, sy, ox, oy, vx, vy, lx, ly, rid;

      // Active card = last child in DOM = visually topmost in column-reverse
      const isActive = () =>
        el === stack.lastChild && !el.classList.contains('card--complete');

      const begin = (cx, cy) => {
        if (!isActive()) return;
        active = true; isDragging = true;
        sx = lx = cx; sy = ly = cy;
        ox = oy = vx = vy = 0;
        cancelAnimationFrame(rid);
        el.style.transition = 'none';
        el.style.zIndex     = '99';
        el.style.cursor     = 'grabbing';
      };

      const move = (cx, cy) => {
        if (!active) return;
        vx = cx - lx; vy = cy - ly;
        lx = cx; ly = cy;
        ox = cx - sx; oy = cy - sy;
        el.style.transform = `translate(${ox}px,${oy}px) rotate(${ox * .04}deg)`;
      };

      const end = () => {
        if (!active) return;
        active = false; isDragging = false;
        el.style.cursor = 'grab';

        // Bounds for wall collision (card offset from its resting position)
        const cW = container.offsetWidth;
        const cH = container.offsetHeight;
        const eW = el.offsetWidth;
        const eH = el.offsetHeight;
        const minX = -(cW - eW) / 2;
        const maxX =  (cW - eW) / 2;
        const minY = -(eH * 0.5);
        const maxY =  cH - eH * 0.5;

        const FRICTION = 0.92;
        const BOUNCE   = 0.6;

        const step = () => {
          vx *= FRICTION; vy *= FRICTION;
          ox += vx;       oy += vy;

          if (ox < minX) { ox = minX; vx *= -BOUNCE; }
          if (ox > maxX) { ox = maxX; vx *= -BOUNCE; }
          if (oy < minY) { oy = minY; vy *= -BOUNCE; }
          if (oy > maxY) { oy = maxY; vy *= -BOUNCE; }

          el.style.transform = `translate(${ox}px,${oy}px) rotate(${ox * .02}deg)`;

          if (Math.abs(vx) > 0.5 || Math.abs(vy) > 0.5) {
            rid = requestAnimationFrame(step);
          } else {
            // Physics settled: snap card back to its stack position
            el.style.transition = 'transform .5s cubic-bezier(.34,1.56,.64,1)';
            el.style.transform  = '';
            el.style.zIndex     = '';
            setTimeout(() => { el.style.transition = ''; }, 500);
          }
        };

        rid = requestAnimationFrame(step);
      };

      el.addEventListener('mousedown', e => { e.preventDefault(); begin(e.clientX, e.clientY); });
      document.addEventListener('mousemove', e => move(e.clientX, e.clientY));
      document.addEventListener('mouseup', end);

      el.addEventListener('touchstart',
        e => begin(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
      document.addEventListener('touchmove', e => {
        if (active) move(e.touches[0].clientX, e.touches[0].clientY);
      }, { passive: true });
      document.addEventListener('touchend', end);
    }

    // ── Boot ──────────────────────────────────────────────────────
    async function init() {
      cards = await fetch(`data/${lang}.json`).then(r => r.json());
      computeMax();
      window.addEventListener('resize', computeMax);
      setupMagnetic();
      loop();
    }

    init();
  </script>
</body>
</html>
```

- [ ] **Step 2: Verify miniapp works standalone**

Start a local server from the repo root (the `fetch('data/en.json')` call requires HTTP — `file://` won't work due to CORS):

```bash
npx serve . -p 5500
```

Open `http://localhost:5500/miniapps/features/ai-concierge/?lang=en&size=large` in a browser.

Expected:
- First card appears already complete (scenario title + full conversation visible)
- A second card slides up from below ~300ms later and starts typing the user message character by character
- After typing, thinking dots animate for ~1.5s
- Miri reply types out, card dwells ~2.2s, then collapses to header-only
- Loop continues with the next card
- Moving the mouse over the page causes the card stack to tilt toward the cursor
- Clicking and dragging the top card throws it; it bounces off the iframe edges and snaps back

Also verify `?lang=es&size=small` and `?lang=fr&size=small`:
- `size=small`: messages appear instantly (no typing), speed is faster

- [ ] **Step 3: Commit**

```bash
git add miniapps/features/ai-concierge/index.html
git commit -m "feat: add ai-concierge interactive chat miniapp"
```

---

## Task 3: Add iframe CSS to site SCSS

**Files:**
- Modify: `scss/grayscale.scss`

- [ ] **Step 1: Append miniapp-frame rules to grayscale.scss**

Add at the very end of `scss/grayscale.scss`:

```scss
// Miniapp iframes — sizing container for self-contained interactive miniapps
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

- [ ] **Step 2: Compile CSS**

```bash
gulp css
```

Expected: no errors, `css/grayscale.css` and `css/grayscale.min.css` are updated.

- [ ] **Step 3: Commit**

```bash
git add scss/grayscale.scss css/grayscale.css css/grayscale.min.css
git commit -m "feat: add miniapp-frame iframe sizing CSS"
```

---

## Task 4: Update feature layout to embed miniapps

**Files:**
- Modify: `_layouts/feature.html`

Current `_layouts/feature.html` line 13:
```html
      <div class="image" style="background-image: url('{{resolved_image}}')">
      </div>
```

- [ ] **Step 1: Replace image div with conditional iframe**

Replace that `<div class="image">` block with:

```html
      {% if page.miniapp %}
        <iframe
          src="/miniapps/{{ page.miniapp }}/?lang={{ page.lang }}&size=large"
          class="miniapp-frame miniapp-frame--large"
          frameborder="0" scrolling="no" allowtransparency="true">
        </iframe>
      {% else %}
        <div class="image" style="background-image: url('{{resolved_image}}')">
        </div>
      {% endif %}
```

The full file after the edit:

```html
{% include header.html %}
{% include lang-image.html image=page.image lang=page.lang %}
<main>
  <style>
.bg-light > .showcase > .content {
  background: white;
}

  </style>

  <section class="about-section bg-light">
    <div class="container showcase smallimage ">
      {% if page.miniapp %}
        <iframe
          src="/miniapps/{{ page.miniapp }}/?lang={{ page.lang }}&size=large"
          class="miniapp-frame miniapp-frame--large"
          frameborder="0" scrolling="no" allowtransparency="true">
        </iframe>
      {% else %}
        <div class="image" style="background-image: url('{{resolved_image}}')">
        </div>
      {% endif %}
      <div class="content" id="content">
        <div>
          <div class="featured-text-right text-left text-lg-left">
            <h1 style="padding:1em 0 0 0" >{{page.title}}</h1>
            <div class="mb-0 text-black-50">
              <p>{{ content | markdownify }}</p>

            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</main>

{% include footer.html %}
```

- [ ] **Step 2: Commit**

```bash
git add _layouts/feature.html
git commit -m "feat: embed miniapp iframe in feature layout when miniapp frontmatter is set"
```

---

## Task 5: Update homepage feature card to embed miniapps

**Files:**
- Modify: `_includes/feature_div.html`

`feature_div.html` has two branches (even/odd). In **both** branches, replace:

```html
  <div class="image"  style="background-image: url('{{ image }}')">
    <p class="photo_credits">
      {{feature.image_credits}}
    </p>
  </div>
```

with:

```html
  {% if feature.miniapp %}
    <iframe
      src="/miniapps/{{ feature.miniapp }}/?lang={{ page.lang }}&size=small"
      class="miniapp-frame miniapp-frame--small"
      frameborder="0" scrolling="no">
    </iframe>
  {% else %}
    <div class="image"  style="background-image: url('{{ image }}')">
      <p class="photo_credits">
        {{feature.image_credits}}
      </p>
    </div>
  {% endif %}
```

- [ ] **Step 1: Apply the replacement in the even branch (lines 8–13)**

The even branch starts at `{% if is_even == 0 %}`. Replace its `<div class="image">` block with the conditional above.

- [ ] **Step 2: Apply the same replacement in the odd branch (lines 29–34)**

The odd branch starts at `{% else %}`. Apply the identical replacement to the second `<div class="image">` block.

- [ ] **Step 3: Verify the full file looks correct**

After both edits, `_includes/feature_div.html` should be:

```html
{% include lang-image.html image=feature.image lang=page.lang %}
{% if resolved_image contains "http://" or resolved_image contains "https://" or resolved_image | slice: 0, 1 == "/" %}
{% assign image = resolved_image %}
{% else %}
{% assign image = "/" | append:page.url | append: "/" | append: resolved_image %}
{% endif %}
{% if is_even == 0 %}
<div class="showcase bigimage dark">
  {% if feature.miniapp %}
    <iframe
      src="/miniapps/{{ feature.miniapp }}/?lang={{ page.lang }}&size=small"
      class="miniapp-frame miniapp-frame--small"
      frameborder="0" scrolling="no">
    </iframe>
  {% else %}
    <div class="image"  style="background-image: url('{{ image }}')">
      <p class="photo_credits">
        {{feature.image_credits}}
      </p>
    </div>
  {% endif %}
  <div class="content">
    <div>
      <h3>{{ feature.title }}</h3>
      <p>{{ feature.description | markdownify }}</p>
      <hr/>
      {% if feature.content.size > 1 %}
      <div>
        <a href="{{feature.url}}">
          {{site.data[page.lang].more_info}}
        </a>
      </div>
      {% endif %}
    </div>
  </div>
</div>
{% else %}
<div class="showcase bigimage reverse dark">
  {% if feature.miniapp %}
    <iframe
      src="/miniapps/{{ feature.miniapp }}/?lang={{ page.lang }}&size=small"
      class="miniapp-frame miniapp-frame--small"
      frameborder="0" scrolling="no">
    </iframe>
  {% else %}
    <div class="image"  style="background-image: url('{{ image }}')">
      <p class="photo_credits">
        {{feature.image_credits}}
      </p>
    </div>
  {% endif %}
  <div class="content">
    <div>
      <h3>{{ feature.title }}</h3>
      <p>{{ feature.description | markdownify }}</p>
      <hr/>
      {% if feature.content.size > 1 %}
      <div>
        <a href="{{feature.url}}">
          {{site.data[page.lang].more_info}}
        </a>
      </div>
      {% endif %}
    </div>
  </div>
</div>

{% endif %}
```

- [ ] **Step 4: Commit**

```bash
git add _includes/feature_div.html
git commit -m "feat: embed miniapp iframe in homepage feature cards when miniapp is set"
```

---

## Task 6: Register the miniapp in all 3 feature files + end-to-end verify

**Files:**
- Modify: `collections/_features/en/0-ai-concierge.md`
- Modify: `collections/_features/es/0-ai-concierge.md`
- Modify: `collections/_features/fr/0-ai-concierge.md`

- [ ] **Step 1: Add `miniapp` field to EN feature**

In `collections/_features/en/0-ai-concierge.md`, add `miniapp: "features/ai-concierge"` to the frontmatter:

```yaml
---
title: "Miri — The First AI Concierge Agent That Acts"
image: "/img_mirigi/ai-concierge.jpg"
miniapp: "features/ai-concierge"
layout: feature
keywords: ai concierge, miri, chat, artificial intelligence, resident experience, automation
description: "Miri is the first AI concierge agent that acts — not just answers. She places orders, calls the valet, and books amenities end-to-end."
---
```

- [ ] **Step 2: Add `miniapp` field to ES feature**

In `collections/_features/es/0-ai-concierge.md`, add the same `miniapp` line to the frontmatter (exact position and other fields will vary — just add the one new line).

- [ ] **Step 3: Add `miniapp` field to FR feature**

In `collections/_features/fr/0-ai-concierge.md`, add the same `miniapp` line.

- [ ] **Step 4: Build and serve the site**

```bash
docker build -t mirigi-jekyll-site . && docker run -v $(pwd):/usr/src/app -p 4000:4000 mirigi-jekyll-site
```

Or if the image is already built:

```bash
make serve
```

- [ ] **Step 5: Verify feature page (large iframe)**

Open `http://localhost:4000/en/features/0-ai-concierge` in a browser.

Expected:
- The left image area shows the interactive chat miniapp (not the static jpg)
- Chat cards animate: first card already complete, second card typing
- Mouse tilt effect works on the card stack
- Dragging the top card throws it with physics bounce

- [ ] **Step 6: Verify homepage card (small iframe)**

Open `http://localhost:4000/en/` and scroll to the features section.

Expected:
- The AI concierge feature card shows the miniapp in its image slot (280px height)
- Cards animate automatically (instant text, no typing in small mode)
- Other feature cards still show their static images (no regression)

- [ ] **Step 7: Verify Spanish and French**

Open `http://localhost:4000/es/` and `http://localhost:4000/fr/`.

Expected:
- The miniapp shows Spanish/French chat examples (detected from `page.lang` passed as URL param)
- Other features on those pages are unaffected

- [ ] **Step 8: Commit**

```bash
git add collections/_features/en/0-ai-concierge.md \
        collections/_features/es/0-ai-concierge.md \
        collections/_features/fr/0-ai-concierge.md
git commit -m "feat: register ai-concierge miniapp — replaces static image with interactive chat demo"
```
