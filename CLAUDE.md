# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a multilingual Jekyll website for Mirigi, a digital concierge service for condominiums. The site showcases features and customer testimonials in English, Spanish, and French. It's built using Jekyll with a Bootstrap-based theme and Docker deployment.

## Development Commands

### Primary Development Workflow
```bash
# Build and serve using Docker (recommended)
docker build -t mirigi-jekyll-site .
docker run -v $(pwd):/usr/src/app -p 4000:4000 mirigi-jekyll-site

# Or use the Makefile (requires docker image to be built first)
make serve

# For frontend asset development (SCSS/JS changes)
npm install
npm run start        # Runs gulp watch with BrowserSync on port 3000
```

### Build Commands
```bash
make all            # Build frontend assets using gulp (runs npm install if needed)
gulp build          # Build CSS/JS assets and copy vendor dependencies
gulp css            # Compile SCSS only
gulp vendor         # Copy node_modules dependencies to /vendor/
```

## Architecture & Structure

### Multilingual Setup
- **Languages**: English (en), Spanish (es), French (fr)
- **Collections**: Features (`_features`) and Customers (`_customers`)
- **URL structure**: 
  - English: `/en/features/`, `/en/customers/`
  - Spanish: `/es/funcionalidades/`, `/es/clientes/`  
  - French: `/fr/caracteristiques/`, `/fr/clients/`

### Key Directories
- `collections/_features/[lang]/` - Feature descriptions (en, es, fr subdirectories)
- `collections/_customers/[lang]/` - Customer testimonials (en, es, fr subdirectories)
- `_layouts/` - Jekyll layout templates (feature.html, customer.html, index.html)
- `_includes/` - Reusable components (header.html, footer.html, feature_div.html)
- `_data/[lang].yml` - UI labels and translations, accessed via `site.data[page.lang]`
- `scss/` - SASS source files (entry point: `grayscale.scss`; brochure styles: `_brochure.scss`)
- `img/` and `img_mirigi/` - Static images

### Layout Hierarchy
- `default.html` — base with navigation/footer
- `defaultcontent.html` — extends default with content-specific styling
- `feature.html`, `customer.html` — collection item pages
- `index.html`, `index_slide.html` — homepage variants
- `brochure.html` — static marketing brochure (print-optimized, standalone)
- `proposal-builder.html` — interactive proposal form (standalone, no nav)
- `proposal.html` — printable proposal output (standalone, no nav)
- `post.html` — blog layout

### Content Management
Features and customers are Jekyll collections. Each content piece requires this frontmatter:

```yaml
---
title: "Feature Name"
image: "/img_mirigi/feature-image.jpg"
layout: feature  # or "customer"
description: "Short description for SEO"
keywords: keyword1, keyword2, keyword3
image_credits: '@<a href="url">author</a>'  # optional
---
```

The `lang` and `permalink` are auto-set by `_config.yml` defaults based on file path.

### Frontend Build Process
- Gulp compiles SCSS from `scss/` to `css/` (both expanded and minified versions)
- Gulp copies vendor dependencies from `node_modules/` to `vendor/` directory (not linked — enables offline serving)
- BrowserSync serves on port 3000 with live reload during `gulp watch`
- Jekyll serves on port 4000 in Docker container
- No test suite exists; the codebase relies on browser API stability

### Multilingual Content Pattern
When adding content, create the same file (same filename) in all three language directories:
- `collections/_features/en/my-feature.md`
- `collections/_features/es/my-feature.md`
- `collections/_features/fr/my-feature.md`

## Brochure System

`brochure.html` is a static, print-optimized marketing brochure (US Letter, 8.5"×11"). Styled by `scss/_brochure.scss` with luxury typography (Playfair Display, Montserrat) and a dark charcoal/pearl/gold palette.

Key SCSS variables:
```scss
$print-page-height: 11in
$print-page-width: 8.5in
$print-margin: 0.5in
$brochure-dark-bg: #58595b
$brochure-light-bg: #f5f5f5
```

Key CSS classes:
- `.brochure-page` — page wrapper with min-height 10in
- `.brochure-feature` — flex row, 40% image / 60% text; `.reverse` flips layout
- `.brochure-customers` — 2-column grid
- `@media print` — enforces exact dimensions, forces color (`-webkit-print-color-adjust: exact`), hides UI buttons

The same CSS framework and components (`_includes/brochure_feature.html`, `_includes/brochure_customer.html`) are reused in `proposal.html` for dynamic proposals.

## Proposal System

The site includes a sales proposal generator system that allows salespeople to create customized PDF proposals for buildings.

### JS Module Roles
- `js/proposal-crypto.js` — HMAC-SHA256 authentication + AES-GCM encryption/decryption; renders login modal with blur-locked UI
- `js/proposal-storage.js` — IndexedDB persistence; save/load/delete proposals; generates encrypted share URLs
- `js/proposal-utils.js` — `ProposalURLBuilder`/`ProposalURLParser` classes; HTML escaping; feature slug lookup; clipboard operations

### Proposal Output Sections (proposal.html)
Decrypts `?d=` URL parameter and dynamically renders:
1. Cover (building name, tagline, salesperson, date)
2. About Mirigi
3. Highlighted features (2/page, alternating left-right layout)
4. Compact features grid (non-highlighted features)
5. Pricing (platform + one-time services)
6. Terms (timeline, notes, valid-until)
7. Customers grid
8. Next Steps / Contact

### Authentication & Encryption Method

The proposal system uses a key-based authentication with encrypted URL parameters:

```
Authentication Flow:
1. User enters symmetric key (only the user knows it - NOT stored in code)
2. localStoredKey = HMAC-SHA256(symmetricKey, SALT)
3. accessHash = HMAC-SHA256(localStoredKey, SALT)
4. Verify: accessHash === ACCESS_HMAC (pre-calculated constant in code)
5. encryptionKey = HMAC-SHA256(localStoredKey, "encrypt") - for AES encryption

SALT = "mirigi is the best smartbuilding solution"
ACCESS_HMAC = "c5a1de2293c3aed54d86479d5e8df92a685a97aadcde11563491a7fc8d17af5c"
```

**Security properties:**
- The symmetric key is NEVER stored anywhere - only the user knows it
- Only ACCESS_HMAC (double-hashed) is in code - cannot reverse to get the key
- localStoredKey (single-hashed) stored in localStorage after login
- Double HMAC prevents rainbow table attacks
- AES-GCM encryption with random IV for URL data
- URL format: `proposal.html?d=<encrypted_base64_data>` - opaque to users

**Key derivation:**
```javascript
// Login verification (symmetric key only exists in user's memory)
localStoredKey = HMAC(userEnteredKey, SALT)
accessHash = HMAC(localStoredKey, SALT)
isValid = (accessHash === ACCESS_HMAC)  // ACCESS_HMAC is pre-calculated constant

// Encryption key derivation
encryptionKey = HMAC(localStoredKey, "encrypt")  // Used for AES-GCM
```

**To change the access key:** Calculate new ACCESS_HMAC offline:
```bash
node -e "
const crypto = require('crypto');
const SALT = 'mirigi is the best smartbuilding solution';
const newKey = 'YOUR_NEW_KEY';
const localKey = crypto.createHmac('sha256', SALT).update(newKey).digest('hex');
const ACCESS_HMAC = crypto.createHmac('sha256', SALT).update(localKey).digest('hex');
console.log('ACCESS_HMAC:', ACCESS_HMAC);
"
```

### Proposal Builder Pages
All three language versions use the shared layout with just frontmatter:
- `proposal-builder.html` (en)
- `es/proposal-builder.html` (es)
- `fr/proposal-builder.html` (fr)

### Login Translations
Login UI strings are in `_data/[lang].yml`:
- `login_title`, `login_subtitle`, `login_placeholder`
- `login_button`, `login_error`, `logout`
