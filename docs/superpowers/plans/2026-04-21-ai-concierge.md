# AI Concierge (Miri) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Miri as a first-class feature page in all three languages and rebrand the site from "Smart Concierge" to "AI Concierge" on the homepage and metadata.

**Architecture:** Three new feature markdown files (en/es/fr) use Jekyll's standard collection pattern — no layout changes needed. Homepage copy and `_data` translation files are updated in-place. Filename prefix `0-` ensures Miri appears first in the features grid and the proposal builder selector.

**Tech Stack:** Jekyll collections, Liquid templates, YAML data files, Markdown

---

## Prerequisites (manual step — not a code task)

Before starting Task 1, the user must copy the AI concierge chat screenshot to:
```
img_mirigi/ai-concierge.jpg
```
A placeholder can be used during development — the feature page will render without the image, just with an empty image area. Tasks do not depend on this file existing.

---

### Task 1: Create English feature page

**Files:**
- Create: `collections/_features/en/0-ai-concierge.md`

- [ ] **Step 1: Create the file**

```markdown
---
title: "Miri — AI Concierge"
image: "/img_mirigi/ai-concierge.jpg"
layout: feature
keywords: ai concierge, miri, chat, artificial intelligence, resident experience, automation
description: "Meet Miri — Mirigi's AI concierge that acts on any resident request instantly."
---

Meet Miri, Mirigi's built-in AI concierge. Residents chat naturally — "I'd like Spaghetti Carbonara delivered to my unit" or "bring my car up in 10 minutes" — and Miri handles it end-to-end. No app menus to navigate, no forms to fill. Just ask.

Miri connects to every Mirigi module: restaurant ordering, valet parking, amenity reservations, service requests, visitor access, and more. She knows the building's live menu, current amenity availability, and your preferences. She doesn't just answer questions — she places the order, logs the request, and sends you confirmation.

For building staff, Miri reduces inbound calls and manual coordination. Every action Miri takes flows through the same Mirigi workflows staff already use — nothing changes on the back end, everything improves on the front end.
```

- [ ] **Step 2: Verify Jekyll picks it up**

Run the Docker container:
```bash
docker build -t mirigi-jekyll-site . && docker run -v $(pwd):/usr/src/app -p 4000:4000 mirigi-jekyll-site
```
Open `http://localhost:4000/en/features/` and confirm "Miri — AI Concierge" appears **first** in the list (before Amenities Reservations). Click through to verify the feature page renders with title, image area, and body text.

- [ ] **Step 3: Commit**

```bash
git add collections/_features/en/0-ai-concierge.md
git commit -m "feat: add Miri AI concierge feature page (en)"
```

---

### Task 2: Create Spanish feature page

**Files:**
- Create: `collections/_features/es/0-ai-concierge.md`

- [ ] **Step 1: Create the file**

```markdown
---
title: "Miri — Conserje IA"
image: "/img_mirigi/ai-concierge.jpg"
layout: feature
keywords: conserje ia, miri, chat, inteligencia artificial, experiencia del residente, automatización
description: "Conoce a Miri — la conserje IA de Mirigi que actúa ante cualquier solicitud del residente de inmediato."
---

Conoce a Miri, la conserje IA integrada de Mirigi. Los residentes conversan de forma natural — "Quisiera Spaghetti Carbonara entregado en mi unidad" o "sube mi auto en 10 minutos" — y Miri lo gestiona de principio a fin. Sin menús de aplicación que navegar, sin formularios que completar. Solo pregunta.

Miri se conecta a cada módulo de Mirigi: pedidos de restaurante, valet parking, reservas de amenidades, solicitudes de servicio, acceso de visitantes y más. Conoce el menú en vivo del edificio, la disponibilidad actual de amenidades y tus preferencias. No solo responde preguntas — realiza el pedido, registra la solicitud y te envía la confirmación.

Para el personal del edificio, Miri reduce las llamadas entrantes y la coordinación manual. Cada acción que realiza Miri fluye a través de los mismos flujos de trabajo de Mirigi que el personal ya utiliza — nada cambia en el back end, todo mejora en el front end.
```

- [ ] **Step 2: Verify**

Open `http://localhost:4000/es/funcionalidades/` and confirm "Miri — Conserje IA" appears first.

- [ ] **Step 3: Commit**

```bash
git add collections/_features/es/0-ai-concierge.md
git commit -m "feat: add Miri AI concierge feature page (es)"
```

---

### Task 3: Create French feature page

**Files:**
- Create: `collections/_features/fr/0-ai-concierge.md`

- [ ] **Step 1: Create the file**

```markdown
---
title: "Miri — Conciergerie IA"
image: "/img_mirigi/ai-concierge.jpg"
layout: feature
keywords: conciergerie ia, miri, chat, intelligence artificielle, expérience résident, automatisation
description: "Découvrez Miri — la conciergerie IA de Mirigi qui agit immédiatement sur toute demande résident."
---

Découvrez Miri, la conciergerie IA intégrée de Mirigi. Les résidents s'expriment naturellement — "Je voudrais des Spaghetti Carbonara livrés dans mon appartement" ou "montez ma voiture dans 10 minutes" — et Miri gère tout de bout en bout. Pas de menus d'application à parcourir, pas de formulaires à remplir. Il suffit de demander.

Miri se connecte à chaque module Mirigi : commandes au restaurant, service de voiturier, réservations d'installations, demandes de service, accès visiteurs, et bien plus. Elle connaît le menu en direct de l'immeuble, la disponibilité actuelle des installations et vos préférences. Elle ne se contente pas de répondre aux questions — elle passe la commande, enregistre la demande et vous envoie la confirmation.

Pour le personnel de l'immeuble, Miri réduit les appels entrants et la coordination manuelle. Chaque action effectuée par Miri suit les mêmes flux de travail Mirigi que le personnel utilise déjà — rien ne change en arrière-plan, tout s'améliore côté résident.
```

- [ ] **Step 2: Verify**

Open `http://localhost:4000/fr/caracteristiques/` and confirm "Miri — Conciergerie IA" appears first.

- [ ] **Step 3: Commit**

```bash
git add collections/_features/fr/0-ai-concierge.md
git commit -m "feat: add Miri AI concierge feature page (fr)"
```

---

### Task 4: Update English homepage and metadata

**Files:**
- Modify: `index.md`
- Modify: `_data/en.yml`

- [ ] **Step 1: Update `index.md` frontmatter and body**

Replace the entire file content with:

```markdown
---
layout: index
lang: en
header: At Your Service
subheader: AI Concierge
aboutTitle: AI CONCIERGE
emailLabel: Email
phoneLabel: Phone
customersTitle: Our luxury customers include
customersText: Behold the architectural marvels that trust Mirigi for their operational excellence. These iconic buildings are part of our esteemed clientele, showcasing the seamless integration and superior efficiency that Mirigi brings. 
contactText: Join the ranks of these distinguished structures and elevate your building's potential with Mirigi. Contact us through any of our channels to schedule a demonstration and discover how Mirigi's digital counseling can boost your development! Experience the transformation and innovation that only Mirigi can offer.
title: Mirigi AI Concierge
keywords: ai concierge, miri, building management, resident experience, luxury living, automation, smart building
description: "Meet Miri — Mirigi's AI concierge that acts on any resident request: food orders, valet, reservations, and more, all in one conversation."
---
Meet Miri — the AI concierge that just acts. Residents chat naturally to place food orders, request their car, book amenities, and more. No app menus to navigate, no forms to fill. Just ask.

Experience the future of condominium living with Mirigi, the groundbreaking concierge service that transforms resident-building interactions into seamless digital experiences. Elevate your lifestyle with luxury interfaces for reservations, valet parking, workflows, deliveries, and <a href='#features' class='js-scroll-trigger'>more</a>.

Empower your building staff with Mirigi, enabling them to deliver unparalleled service with efficiency and precision. Streamline operations and boost productivity while residents indulge in luxurious access to condominium services via their mobile devices or in-wall touch panels.

With Mirigi's integration into building automation, residents gain unprecedented control over their living spaces. From accessing security cameras to unlocking doors directly from the app, enjoy enhanced convenience and security like never before.

Discover the prestigious luxury buildings that have embraced Mirigi <a href='#customers' class='js-scroll-trigger'>by clicking here</a>.
```

- [ ] **Step 2: Update `_data/en.yml` — change `aboutTitle`**

Find the line:
```yaml
# Brochure
```
It does not contain `aboutTitle` — that field is in `index.md` frontmatter directly, so no change to `en.yml` is needed for `aboutTitle`. However, update the `brochure_subtitle` to reflect AI positioning:

In `_data/en.yml`, change:
```yaml
brochure_subtitle: "Digital Concierge for Luxury Buildings"
```
to:
```yaml
brochure_subtitle: "AI Concierge for Luxury Buildings"
```

- [ ] **Step 3: Verify**

Open `http://localhost:4000/en/` and confirm:
- Subheader reads "AI Concierge"
- First body paragraph is the Miri introduction
- Page `<title>` in browser tab reads "Mirigi AI Concierge"

- [ ] **Step 4: Commit**

```bash
git add index.md _data/en.yml
git commit -m "feat: rebrand EN homepage to AI Concierge, introduce Miri"
```

---

### Task 5: Update Spanish homepage and metadata

**Files:**
- Modify: `es/index.md`
- Modify: `_data/es.yml`

- [ ] **Step 1: Update `es/index.md`**

Replace the entire file content with:

```markdown
---
layout: index
lang: es
header: A Su Servicio
subheader: Conserje IA
aboutTitle: CONSERJE IA
emailLabel: Correo Electrónico
phoneLabel: Teléfono
customersTitle: Nuestros clientes de lujo incluyen
customersText: Contemple las maravillas arquitectónicas que confían en Mirigi por su excelencia operativa. Estos edificios icónicos son parte de nuestra estimada clientela, mostrando la integración perfecta y la eficiencia superior que Mirigi aporta.
contactText: Únase a las filas de estas distinguidas estructuras y eleve el potencial de su edificio con Mirigi. Contáctenos a través de cualquiera de nuestros canales para programar una demostración y descubrir cómo los servicios de conserjería digital de Mirigi pueden impulsar su desarrollo. Experimente la transformación e innovación que solo Mirigi puede ofrecer!
title: Mirigi Conserje IA
keywords: conserje ia, miri, gestión de edificios, experiencia del residente, vida de lujo, automatización, edificio inteligente
description: "Conoce a Miri — la conserje IA de Mirigi que actúa ante cualquier solicitud del residente: pedidos de comida, valet, reservas y más, todo en una conversación."
---
Conoce a Miri — la conserje IA que simplemente actúa. Los residentes conversan de forma natural para realizar pedidos de comida, solicitar su auto, reservar amenidades y más. Sin menús de aplicación que navegar, sin formularios que completar. Solo pregunta.

Experimente el futuro de la vida en condominio con Mirigi, el innovador servicio de conserjería que transforma las interacciones entre residentes y edificios en experiencias digitales sin fisuras. Eleve su estilo de vida con interfaces de lujo para reservas, valet parking, flujos de trabajo, entregas y <a href='#features' class='js-scroll-trigger'>más</a>.

Empodere a su personal de edificio con Mirigi, permitiéndoles ofrecer un servicio inigualable con eficiencia y precisión. Optimice las operaciones y aumente la productividad mientras los residentes disfrutan de un acceso lujoso a los servicios de condominio a través de sus dispositivos móviles o paneles táctiles en la pared.

Con la integración de Mirigi en la automatización de edificios, los residentes obtienen un control sin precedentes sobre sus espacios de vida. Desde acceder a cámaras de seguridad hasta desbloquear puertas directamente desde la aplicación, disfrute de una comodidad y seguridad mejoradas como nunca antes.

Descubra los prestigiosos edificios de lujo que han adoptado Mirigi <a href='#customers' class='js-scroll-trigger'>haciendo clic aquí</a>.
```

- [ ] **Step 2: Update `_data/es.yml` brochure subtitle**

Change:
```yaml
brochure_subtitle: "Conserjería Digital para Edificios de Lujo"
```
to:
```yaml
brochure_subtitle: "Conserje IA para Edificios de Lujo"
```

- [ ] **Step 3: Verify**

Open `http://localhost:4000/es/` and confirm subheader reads "Conserje IA" and the Miri paragraph appears first.

- [ ] **Step 4: Commit**

```bash
git add es/index.md _data/es.yml
git commit -m "feat: rebrand ES homepage to Conserje IA, introduce Miri"
```

---

### Task 6: Update French homepage and metadata

**Files:**
- Modify: `fr/index.md`
- Modify: `_data/fr.yml`

- [ ] **Step 1: Update `fr/index.md`**

Replace the entire file content with:

```markdown
---
layout: index
lang: fr
header: À Votre Service
subheader: Conciergerie IA
aboutTitle: CONCIERGERIE IA
emailLabel: Email
phoneLabel: Téléphone
customersTitle: Nos clients de luxe incluent
customersText: Contemplez les merveilles architecturales qui font confiance à Mirigi pour leur excellence opérationnelle. Ces bâtiments emblématiques font partie de notre clientèle estimée, montrant l'intégration transparente et l'efficacité supérieure que Mirigi apporte.
contactText: Rejoignez les rangs de ces structures distinguées et levez le potentiel de votre immeuble avec Mirigi. Contactez-nous via l'un de nos canaux pour planifier une démonstration et découvrir comment les services de conciergerie numérique de Mirigi peuvent dynamiser votre développement. Vivez la transformation et l'innovation que seul Mirigi peut offrir !
title: Mirigi Conciergerie IA
keywords: conciergerie ia, miri, gestion immobilière, expérience résident, vie de luxe, automatisation, immeuble intelligent
description: "Découvrez Miri — la conciergerie IA de Mirigi qui agit immédiatement sur toute demande résident : commandes repas, voiturier, réservations et plus, en une seule conversation."
---
Découvrez Miri — la conciergerie IA qui agit, tout simplement. Les résidents s'expriment naturellement pour passer des commandes repas, demander leur voiture, réserver des installations et plus encore. Pas de menus d'application à parcourir, pas de formulaires à remplir. Il suffit de demander.

Découvrez l'avenir de la vie en copropriété avec Mirigi, le service de conciergerie révolutionnaire qui transforme les interactions entre résidents et immeubles en expériences numériques fluides. Élevez votre style de vie avec des interfaces de luxe pour les réservations, le service de voiturier, les flux de travail, les livraisons et <a href='#features' class='js-scroll-trigger'>plus encore</a>.

Donnez à votre personnel d'immeuble les moyens de fournir un service inégalé avec efficacité et précision grâce à Mirigi. Rationalisez les opérations et augmentez la productivité tandis que les résidents profitent d'un accès luxueux aux services de la copropriété via leurs appareils mobiles ou leurs écrans tactiles muraux.

Avec l'intégration de Mirigi dans l'automatisation des bâtiments, les résidents obtiennent un contrôle sans précédent sur leurs espaces de vie. De l'accès aux caméras de sécurité au déverrouillage des portes directement depuis l'application, profitez d'une commodité et d'une sécurité améliorées comme jamais auparavant.

Découvrez les prestigieux immeubles de luxe qui ont adopté Mirigi <a href='#customers' class='js-scroll-trigger'>en cliquant ici</a>.
```

- [ ] **Step 2: Update `_data/fr.yml` brochure subtitle**

Change:
```yaml
brochure_subtitle: "Conciergerie Numérique pour Immeubles de Luxe"
```
to:
```yaml
brochure_subtitle: "Conciergerie IA pour Immeubles de Luxe"
```

- [ ] **Step 3: Verify**

Open `http://localhost:4000/fr/` and confirm subheader reads "Conciergerie IA" and the Miri paragraph appears first.

- [ ] **Step 4: Commit**

```bash
git add fr/index.md _data/fr.yml
git commit -m "feat: rebrand FR homepage to Conciergerie IA, introduce Miri"
```

---

### Task 7: Final cross-language verification

No file changes. Smoke-test the full site before considering the feature complete.

- [ ] **Step 1: Verify proposal builder**

Open `http://localhost:4000/proposal-builder.html`, log in, and confirm "Miri — AI Concierge" appears as the **first** feature in the highlighted features selector.

- [ ] **Step 2: Verify feature pages render**

Visit all three feature pages and confirm image area, title, and body text display correctly:
- `http://localhost:4000/en/features/0-ai-concierge/` (or similar slug)
- `http://localhost:4000/es/funcionalidades/0-ai-concierge/`
- `http://localhost:4000/fr/caracteristiques/0-ai-concierge/`

- [ ] **Step 3: Verify no broken links**

Check browser console on each homepage (`/en/`, `/es/`, `/fr/`) for 404s or JS errors.

- [ ] **Step 4: Add image (when available)**

Once the user provides the chat screenshot, copy it to `img_mirigi/ai-concierge.jpg` and commit:
```bash
git add img_mirigi/ai-concierge.jpg
git commit -m "feat: add Miri AI concierge feature image"
```
