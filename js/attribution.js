/* Campaign attribution for demo requests.
 * Runs on every page (loaded from _includes/header.html). When a visitor lands
 * with an ad click id (gclid, gbraid, wbraid) or UTM parameters, they are kept
 * in localStorage for 90 days (the lifetime of a Google Ads click id), so a
 * request sent later, from another page or another visit, still carries them.
 * The last tagged click wins, which is how Google Ads attributes too.
 * It also keeps the pages viewed in the current visit (sessionStorage only).
 * Exposes window.mirigiAttribution.get(), used by js/demo-form.js.
 */
(function () {
  'use strict';

  var KEY = 'mirigi_attribution';
  var TTL_MS = 90 * 24 * 60 * 60 * 1000;
  var PARAMS = ['gclid', 'gbraid', 'wbraid',
                'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  var memory = null;  // fallback when storage is blocked

  function clean(v) {
    return String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, '').slice(0, 200);
  }

  function load() {
    var raw = null;
    try { raw = window.localStorage.getItem(KEY); } catch (e) { return memory; }
    if (!raw) return memory;
    try {
      var rec = JSON.parse(raw);
      if (rec && typeof rec.ts === 'number' && Date.now() - rec.ts < TTL_MS) return rec;
    } catch (e) { /* corrupt entry, ignore */ }
    return null;
  }

  function save(rec) {
    memory = rec;
    try { window.localStorage.setItem(KEY, JSON.stringify(rec)); } catch (e) { /* blocked */ }
  }

  // Referrer without query string or fragment: enough to see where the visit
  // came from, without keeping tokens that other sites put in their URLs.
  function referrer() {
    try {
      if (!document.referrer) return '';
      var u = new URL(document.referrer);
      if (u.host === window.location.host) return '';
      return clean(u.origin + u.pathname);
    } catch (e) { return ''; }
  }

  function capture() {
    var search = new URLSearchParams(window.location.search);
    var tagged = {};
    var any = false;
    PARAMS.forEach(function (p) {
      var v = search.get(p);
      if (v) { tagged[p] = clean(v); any = true; }
    });

    var existing = load();
    if (any) {
      tagged.landing_page = clean(window.location.pathname);
      tagged.referrer = referrer();
      tagged.ts = Date.now();
      save(tagged);
    } else if (!existing) {
      // Untagged first visit: keep where it started, for organic leads.
      save({ landing_page: clean(window.location.pathname), referrer: referrer(), ts: Date.now() });
    }
  }

  /* ---------- pages viewed in this visit ---------- */
  // Paths only (no query string), kept in sessionStorage: it is cleared when the
  // tab closes, unlike the campaign data above. Sent with the demo request so the
  // team sees what the person looked at.
  var TRAIL_KEY = 'mirigi_trail';
  var TRAIL_MAX = 15;
  var trailMemory = [];
  // /en/features/<slug>/, /es/funcionalidades/<slug>/, /fr/caracteristiques/<slug>/, /pt/recursos/<slug>/
  var FEATURE_RE = /^\/[a-z]{2}\/(?:features|funcionalidades|caracteristiques|recursos)\/([^/]+)\/?$/;

  function loadTrail() {
    try {
      var t = JSON.parse(window.sessionStorage.getItem(TRAIL_KEY) || '[]');
      return Array.isArray(t) ? t.map(clean) : [];
    } catch (e) { return trailMemory; }
  }

  function recordPage() {
    var trail = loadTrail();
    var path = clean(window.location.pathname);
    if (trail[trail.length - 1] !== path) trail.push(path);
    trail = trail.slice(-TRAIL_MAX);
    trailMemory = trail;
    try { window.sessionStorage.setItem(TRAIL_KEY, JSON.stringify(trail)); } catch (e) { /* blocked */ }
  }

  function trailFields() {
    var trail = loadTrail();
    var seen = {}, interests = [];
    trail.forEach(function (p) {
      var m = FEATURE_RE.exec(p);
      if (m && !seen[m[1]]) { seen[m[1]] = true; interests.push(m[1]); }
    });
    var pages = trail.join(' > ');
    if (pages.length > 500) pages = '...' + pages.slice(-497);  // keep the latest pages
    return { pages_viewed: pages, interests: interests.join(', ') };
  }

  function get() {
    var rec = load() || {};
    var out = {};
    PARAMS.concat(['landing_page', 'referrer']).forEach(function (k) {
      out[k] = rec[k] ? clean(rec[k]) : '';
    });
    var t = trailFields();
    out.pages_viewed = t.pages_viewed;
    out.interests = t.interests;
    return out;
  }

  try { capture(); recordPage(); } catch (e) { /* attribution must never break the page */ }
  window.mirigiAttribution = { get: get };
})();
