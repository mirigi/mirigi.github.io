/* Demo-request modal logic.
 * - Opens from any [data-demo-open] trigger; closes via overlay/X/Esc.
 * - intl-tel-input phone field, searchable country combobox (reuses iti country data).
 * - Animated building-size segmented control.
 * - Validation: name required; email OR phone required.
 * - Spam: honeypot + >=2s time-gate (silent fake-success on bot).
 * - Submits JSON (text/plain, no preflight) to the Apps Script endpoint.
 */
(function () {
  'use strict';

  var modal = document.getElementById('demoModal');
  if (!modal) return;

  var form = document.getElementById('demoForm');
  var dialog = modal.querySelector('.demo-modal__dialog');
  var formPanel = modal.querySelector('[data-demo-panel="form"]');
  var successPanel = modal.querySelector('[data-demo-panel="success"]');
  var endpoint = (document.querySelector('meta[name="demo-form-endpoint"]') || {}).content || '';
  var lang = document.documentElement.lang || 'en';

  var iti = null;          // intl-tel-input instance
  var openedAt = 0;        // timestamp for the time-gate
  var lastTrigger = null;  // element to return focus to

  /* ---------- open / close ---------- */
  function openModal(trigger) {
    lastTrigger = trigger || null;
    resetPanels();
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    pauseBackgroundMotion(true);
    openedAt = Date.now();
    // The segmented thumb can only be measured once the modal is visible.
    requestAnimationFrame(updateSegThumb);
    var first = form.querySelector('#df-name');
    if (first) setTimeout(function () { first.focus(); }, 60);
  }

  function closeModal() {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    pauseBackgroundMotion(false);
    if (lastTrigger && typeof lastTrigger.focus === 'function') lastTrigger.focus();
  }

  // Pause the auto-advancing customer carousel while the modal covers it, so the
  // browser isn't repainting transitions behind an opaque scrim.
  function pauseBackgroundMotion(pause) {
    try {
      if (window.jQuery && window.jQuery.fn && window.jQuery.fn.carousel) {
        window.jQuery('#customerCarousel').carousel(pause ? 'pause' : 'cycle');
      }
    } catch (e) { /* no-op */ }
  }

  function resetPanels() {
    successPanel.hidden = true;
    formPanel.hidden = false;
    form.reset();              // clears fields back to HTML defaults...
    userPickedCountry = false; // ...so a fresh open re-applies the geo default...
    applyCountryDefault();     // ...the geo-detected country
    clearErrors();
    updateCounter();
    setSegPristine(true);   // no default selection → invite a tap each open
    updateSegThumb();
    setSending(false);      // restore the submit button (stale "Sending…" after a prior success)
  }

  // Set the Country field to the geo-detected default, unless the user has
  // actively picked/typed one. Re-run after every form.reset() (which clears the
  // visible input but, in some browsers, leaves the hidden input — so we sync both
  // explicitly rather than inferring "already set" from the hidden value).
  var geoCountryName = null;
  var geoCountryIso2 = null;
  var userPickedCountry = false;
  // Emoji flag from an ISO2 code (e.g. "uy" -> 🇺🇾).
  function flagEmoji(iso2) {
    return iso2.toUpperCase().replace(/./g, function (c) {
      return String.fromCodePoint(127397 + c.charCodeAt(0));
    });
  }
  // Show/clear the flag overlaid inside the country field.
  function setCountryFlag(iso2) {
    var combo = form.querySelector('[data-combo]');
    if (!combo) return;
    var span = combo.querySelector('[data-combo-flag]');
    if (iso2) { if (span) span.textContent = flagEmoji(iso2); combo.classList.add('has-flag'); }
    else { if (span) span.textContent = ''; combo.classList.remove('has-flag'); }
  }
  function applyCountryDefault() {
    if (!geoCountryName || userPickedCountry) return;
    var cInput = form.querySelector('[data-combo] .demo-combo__input');
    var cHidden = form.querySelector('[data-combo] input[type="hidden"]');
    if (!cInput || !cHidden) return;
    if (document.activeElement === cInput) return; // don't clobber active typing
    cInput.value = geoCountryName;
    cHidden.value = geoCountryName;
    setCountryFlag(geoCountryIso2);
  }

  document.addEventListener('click', function (e) {
    var opener = e.target.closest('[data-demo-open]');
    if (opener) { e.preventDefault(); openModal(opener); return; }
    if (e.target.closest('[data-demo-close]')) { e.preventDefault(); closeModal(); }
  });

  document.addEventListener('keydown', function (e) {
    if (!modal.classList.contains('is-open')) return;
    if (e.key === 'Escape') { closeModal(); return; }
    if (e.key === 'Tab') trapFocus(e);
  });

  function trapFocus(e) {
    var focusables = dialog.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), textarea, [tabindex]:not([tabindex="-1"])'
    );
    var visible = Array.prototype.filter.call(focusables, function (el) {
      return el.offsetParent !== null;
    });
    if (!visible.length) return;
    var first = visible[0], last = visible[visible.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  /* ---------- comments counter ---------- */
  var comments = form.querySelector('#df-comments');
  var counter = form.querySelector('[data-counter]');
  function updateCounter() {
    if (!comments || !counter) return;
    var n = comments.value.length;
    var tpl = counter.getAttribute('data-counter-tpl') || '{count}/300';
    counter.textContent = tpl.replace('{count}', n);
    counter.classList.toggle('is-near', n >= 270);
  }
  if (comments) comments.addEventListener('input', updateCounter);

  /* ---------- building-size segmented control ---------- */
  var seg = form.querySelector('.demo-seg');
  var segHint = form.querySelector('[data-seg-hint]');
  var thumb = seg ? seg.querySelector('.demo-seg__thumb') : null;
  function updateSegThumb() {
    if (!seg || !thumb) return;
    var checked = seg.querySelector('input:checked');
    if (!checked) { thumb.style.opacity = '0'; thumb.style.width = '0'; return; }
    var opt = checked.closest('.demo-seg__opt');
    thumb.style.opacity = '1';
    thumb.style.width = opt.offsetWidth + 'px';
    thumb.style.transform = 'translateX(' + (opt.offsetLeft - seg.querySelector('.demo-seg__opt').offsetLeft) + 'px)';
  }
  // Pristine = nothing chosen yet: pulse the control + show the hint to invite a tap.
  function setSegPristine(pristine) {
    if (seg) seg.classList.toggle('is-pristine', pristine);
    if (segHint) segHint.classList.toggle('is-hidden', !pristine);
  }
  if (seg) {
    seg.addEventListener('change', function () {
      setSegPristine(false);   // first selection stops the invitation
      updateSegThumb();
    });
    seg.addEventListener('click', function (e) {
      var opt = e.target.closest('.demo-seg__opt');
      if (!opt) return;
      opt.classList.add('is-tapped');
      setTimeout(function () { opt.classList.remove('is-tapped'); }, 180);
    });
    window.addEventListener('resize', updateSegThumb);
  }

  /* ---------- shared geo-IP country detection ---------- */
  // Fallback country (ISO2) used when every geo provider fails.
  var FALLBACK_COUNTRY = 'us';

  // Try several free, no-key geo providers in order — any one returning a country
  // wins. Single shared lookup for both the phone widget and the country field.
  // ipapi.co is rate-limited, so we fall through to alternates before giving up.
  function fetchGeo(url, extract) {
    return fetch(url)
      .then(function (r) { if (!r.ok) throw 0; return r.text(); })
      .then(function (t) {
        var cc = extract(t);
        if (!cc) throw 0;
        return cc.trim().toLowerCase();
      });
  }
  // CORS-friendly providers first (ipapi.co/country/ lacks CORS headers in the
  // browser, especially when rate-limited, so it's last).
  var geoCountryPromise =
    fetchGeo('https://api.country.is/', function (t) {
      try { return JSON.parse(t).country || ''; } catch (e) { return ''; }
    })
      .catch(function () {
        return fetchGeo('https://ipwho.is/?fields=country_code', function (t) {
          try { return JSON.parse(t).country_code || ''; } catch (e) { return ''; }
        });
      })
      .catch(function () {
        return fetchGeo('https://ipapi.co/country/', function (t) { return t; });
      })
      .catch(function () { return FALLBACK_COUNTRY; });

  /* ---------- phone (intl-tel-input) + country combobox ---------- */
  var phoneInput = form.querySelector('#df-phone');
  function initPhone() {
    if (!phoneInput || typeof window.intlTelInput !== 'function') return;
    iti = window.intlTelInput(phoneInput, {
      initialCountry: 'auto',
      // Reuse the shared lookup; it never rejects (falls back to FALLBACK_COUNTRY)
      // instead of letting intl-tel-input default to its first-in-list (Afghanistan).
      geoIpLookup: function (success) { geoCountryPromise.then(success); },
      // No separateDialCode: keeping the dial code in the input means typing a
      // leading "+" lets intl-tel-input parse the country as you type. Without a
      // "+", the number is interpreted in the currently-selected dropdown country.
      nationalMode: true,
      utilsScript: 'https://cdn.jsdelivr.net/npm/intl-tel-input@23.0.4/build/js/utils.js'
    });

    // Make the phone number the only tab stop in the widget — the flag button is
    // removed from the tab order. Keyboard users switch country by typing "+code";
    // mouse users can still click the flag to open the dropdown.
    var itiWrap = phoneInput.closest('.iti');
    if (itiWrap) {
      var flagBtn = itiWrap.querySelector('.iti__selected-country');
      if (flagBtn) flagBtn.setAttribute('tabindex', '-1');
    }
  }

  var combo = form.querySelector('[data-combo]');
  function initCountryCombo() {
    if (!combo) return;
    var input = combo.querySelector('.demo-combo__input');
    var hidden = combo.querySelector('input[type=hidden]');
    var list = combo.querySelector('.demo-combo__list');
    var data = (window.intlTelInput && typeof window.intlTelInput.getCountryData === 'function')
      ? window.intlTelInput.getCountryData() : [];
    var activeIdx = -1, filtered = [];

    function flag(iso2) {
      return iso2.toUpperCase().replace(/./g, function (c) {
        return String.fromCodePoint(127397 + c.charCodeAt(0));
      });
    }
    function render(items) {
      filtered = items; activeIdx = -1;
      list.innerHTML = '';
      items.slice(0, 60).forEach(function (c, i) {
        var li = document.createElement('li');
        li.setAttribute('role', 'option');
        li.dataset.idx = i;
        li.innerHTML = '<span class="demo-combo__flag">' + flag(c.iso2) + '</span>' +
                       '<span>' + c.name + '</span>';
        list.appendChild(li);
      });
      list.classList.toggle('is-open', items.length > 0);
      input.setAttribute('aria-expanded', items.length > 0 ? 'true' : 'false');
    }
    function choose(c) {
      userPickedCountry = true;
      input.value = c.name;
      hidden.value = c.name;
      setCountryFlag(c.iso2);
      list.classList.remove('is-open');
      input.setAttribute('aria-expanded', 'false');
    }
    function filter() {
      var q = input.value.trim().toLowerCase();
      hidden.value = '';
      setCountryFlag(null); // searching = no confirmed selection yet
      if (!q) { render(data); return; }
      render(data.filter(function (c) { return c.name.toLowerCase().indexOf(q) > -1; }));
    }
    function setActive(i) {
      var items = list.querySelectorAll('li');
      items.forEach(function (el) { el.classList.remove('is-active'); });
      if (i >= 0 && items[i]) { items[i].classList.add('is-active'); items[i].scrollIntoView({ block: 'nearest' }); }
      activeIdx = i;
    }

    input.addEventListener('focus', filter);
    input.addEventListener('input', filter);
    input.addEventListener('keydown', function (e) {
      if (!list.classList.contains('is-open')) return;
      var max = Math.min(filtered.length, 60) - 1;
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(Math.min(activeIdx + 1, max)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(Math.max(activeIdx - 1, 0)); }
      else if (e.key === 'Enter') {
        if (activeIdx > -1 && filtered[activeIdx]) { e.preventDefault(); choose(filtered[activeIdx]); }
      } else if (e.key === 'Escape') { list.classList.remove('is-open'); }
    });
    list.addEventListener('mousedown', function (e) {
      var li = e.target.closest('li');
      if (li) { e.preventDefault(); choose(filtered[+li.dataset.idx]); }
    });
    document.addEventListener('click', function (e) {
      if (!combo.contains(e.target)) {
        list.classList.remove('is-open');
        input.setAttribute('aria-expanded', 'false');
        if (!hidden.value) input.value = ''; // discard partial typing
      }
    });

    // Resolve the geo-detected country name once, then apply it as the default.
    geoCountryPromise.then(function (iso2) {
      var match = data.filter(function (c) { return c.iso2 === iso2; })[0];
      if (match) { geoCountryName = match.name; geoCountryIso2 = match.iso2; applyCountryDefault(); }
    });
  }

  /* ---------- email domain autocomplete ---------- */
  var EMAIL_DOMAINS = [
    'gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com',
    'proton.me', 'live.com', 'aol.com'
  ];
  function initEmailSuggest() {
    var input = form.querySelector('#df-email');
    var box = form.querySelector('[data-email-suggest]');
    if (!input || !box) return;
    var matches = [], activeIdx = -1;

    function hide() {
      box.classList.remove('is-open'); box.innerHTML = '';
      matches = []; activeIdx = -1;
      input.setAttribute('aria-expanded', 'false');
    }
    function mark() {
      var items = box.querySelectorAll('li');
      items.forEach(function (el) { el.classList.remove('is-active'); });
      if (activeIdx > -1 && items[activeIdx]) items[activeIdx].classList.add('is-active');
    }
    function complete(i, refocus) {
      var at = input.value.indexOf('@');
      var local = input.value.slice(0, at);
      input.value = local + '@' + matches[i];
      hide();
      if (refocus) input.focus();
    }
    function render() {
      var val = input.value;
      var at = val.indexOf('@');
      if (at < 1) { hide(); return; }                 // need a local part + "@"
      if (val.indexOf(' ') > -1) { hide(); return; }
      var frag = val.slice(at + 1).toLowerCase();
      matches = EMAIL_DOMAINS.filter(function (d) {
        return frag === '' ? true : (d.indexOf(frag) === 0 && d !== frag);
      });
      if (!matches.length) { hide(); return; }
      box.innerHTML = '';
      matches.forEach(function (d, i) {
        var li = document.createElement('li');
        li.className = 'demo-email-chip';
        li.setAttribute('role', 'option');
        li.dataset.idx = i;
        li.textContent = val.slice(0, at) + '@' + d;
        box.appendChild(li);
      });
      activeIdx = -1;
      box.classList.add('is-open');
      input.setAttribute('aria-expanded', 'true');
    }

    input.addEventListener('input', render);
    input.addEventListener('keydown', function (e) {
      if (!box.classList.contains('is-open')) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); activeIdx = Math.min(activeIdx + 1, matches.length - 1); mark(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); activeIdx = Math.max(activeIdx - 1, 0); mark(); }
      else if (e.key === 'Enter') { if (activeIdx > -1) { e.preventDefault(); complete(activeIdx, true); } }
      else if (e.key === 'Tab') {
        // Tab accepts the highlighted (or first) suggestion and moves on.
        var pick = activeIdx > -1 ? activeIdx : 0;
        if (matches[pick]) complete(pick, false);
      } else if (e.key === 'Escape') { hide(); }
    });
    box.addEventListener('mousedown', function (e) {
      var li = e.target.closest('li');
      if (li) { e.preventDefault(); complete(+li.dataset.idx, true); }
    });
    input.addEventListener('blur', function () { setTimeout(hide, 120); });
  }

  /* ---------- validation ---------- */
  function showError(field, msg) {
    var el = form.querySelector('[data-error-for="' + field + '"]');
    if (el) { el.textContent = msg; el.classList.add('is-visible'); }
  }
  function clearErrors() {
    form.querySelectorAll('.demo-form__error').forEach(function (el) {
      el.textContent = ''; el.classList.remove('is-visible');
    });
  }
  function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

  var STR = window.DEMO_FORM_STRINGS || {};
  function validate() {
    clearErrors();
    var ok = true, firstBad = null;
    var name = form.name.value.trim();
    var email = form.email.value.trim();
    var phoneRaw = phoneInput ? phoneInput.value.trim() : '';

    if (!name) { showError('name', STR.errName); ok = false; firstBad = firstBad || form.name; }

    var hasEmail = !!email, hasPhone = !!phoneRaw;
    if (!hasEmail && !hasPhone) {
      showError('global', STR.errContact); ok = false; firstBad = firstBad || form.email;
    }
    if (hasEmail && !validEmail(email)) {
      showError('email', STR.errEmail); ok = false; firstBad = firstBad || form.email;
    }
    // isValidNumber() returns null until the utils script loads — only reject an explicit false.
    if (hasPhone && iti && typeof iti.isValidNumber === 'function' && iti.isValidNumber() === false) {
      showError('phone', STR.errPhone); ok = false; firstBad = firstBad || phoneInput;
    }
    if (firstBad) firstBad.focus();
    return ok;
  }

  /* ---------- submit ---------- */
  var submitBtn = form.querySelector('.demo-form__submit');
  function setSending(on) {
    if (!submitBtn) return;
    submitBtn.disabled = on;
    submitBtn.textContent = on
      ? (submitBtn.getAttribute('data-label-sending') || 'Sending…')
      : (submitBtn.getAttribute('data-label-submit') || 'Submit');
  }

  function payload() {
    return {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      phone: (iti && typeof iti.getNumber === 'function' && iti.getNumber()) ? iti.getNumber() : (phoneInput ? phoneInput.value.trim() : ''),
      country: (form.country && form.country.value) || '',
      building_size: (form.building_size.value) || '',
      comments: form.comments.value.trim(),
      company_url: form.company_url.value,      // honeypot
      elapsed_ms: Date.now() - openedAt,
      language: lang,
      source: window.location.pathname
    };
  }

  function showSuccess() {
    formPanel.hidden = true;
    successPanel.hidden = false;
    dialog.scrollTop = 0;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    // Spam gate — fake success, write nothing.
    if (form.company_url.value || (Date.now() - openedAt) < 2000) {
      showSuccess();
      return;
    }
    if (!validate()) return;
    if (!endpoint) { showError('global', STR.errNetwork); return; }

    setSending(true);
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload())
    })
      .then(function (r) { return r.json().catch(function () { return { ok: r.ok }; }); })
      .then(function (res) {
        if (res && res.ok) { showSuccess(); }
        else { showError('global', STR.errNetwork); setSending(false); }
      })
      .catch(function () { showError('global', STR.errNetwork); setSending(false); });
  });

  /* ---------- boot ---------- */
  // Deep link: /?demo=1 or #demo opens the form straight away (used by the
  // brochure QR code so "scan to schedule" lands on the request form).
  function maybeAutoOpen() {
    try {
      var wants = /[?&]demo=1\b/.test(window.location.search) ||
                  window.location.hash === '#demo';
      if (wants) openModal(null);
    } catch (e) { /* no-op */ }
  }
  function boot() { initPhone(); initCountryCombo(); initEmailSuggest(); maybeAutoOpen(); }
  if (window.intlTelInput) boot();
  else window.addEventListener('load', boot);
})();
