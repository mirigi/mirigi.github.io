/*
  Shared screenshot carousel for miniapps.
  Companion to screenshots.css. Reads window.MIRIAPP_SHOTS, the instance config.

  Expected shape:
    window.MIRIAPP_SHOTS = {
      intervalMs: 4800,                   // optional, default 4800
      shots: [
        { src: 'img/skin-1.png', labels: { en: '...', es: '...', fr: '...' } },
        ...
      ]
    };

  Backdrop image, card aspect ratio, and any other visual choices are set as
  CSS variables on <body> in the instance HTML.

  English label strings are also expected to appear in a static <ul class="sr-only">
  block in the instance HTML, for scraper + screen-reader visibility.
*/
(function () {
  var CFG = window.MIRIAPP_SHOTS || { shots: [] };
  var SHOTS = CFG.shots || [];
  var INTERVAL_MS = CFG.intervalMs || 4800;

  var params = new URLSearchParams(location.search);
  var lang = (params.get('lang') || 'en').toLowerCase();
  if (['en', 'es', 'fr'].indexOf(lang) === -1) lang = 'en';
  var previewMode = params.get('preview');           // 'fan' for the brochure still
  if (previewMode === 'fan') document.body.classList.add('preview-fan');

  var stage = document.getElementById('stage');
  if (!stage || SHOTS.length === 0) return;

  var current = 0;
  var timer = null;

  SHOTS.forEach(function (s, i) {
    var labelText = (s.labels && (s.labels[lang] || s.labels.en)) || '';
    var fig = document.createElement('figure');
    fig.className = 'shot' + (i === 0 ? ' is-current' : '');
    fig.setAttribute('data-idx', i);
    var img = document.createElement('img');
    img.src = s.src;
    img.alt = labelText || ('Screenshot ' + (i + 1));
    img.loading = i === 0 ? 'eager' : 'lazy';
    fig.appendChild(img);
    if (labelText) {
      var label = document.createElement('figcaption');
      label.className = 'shot-label';
      label.textContent = labelText;
      fig.appendChild(label);
    }
    stage.appendChild(fig);
  });

  var nav = document.createElement('nav');
  nav.className = 'dots';
  nav.setAttribute('role', 'tablist');
  SHOTS.forEach(function (_, i) {
    var b = document.createElement('button');
    b.className = 'cdot' + (i === 0 ? ' is-current' : '');
    b.setAttribute('aria-label', 'Slide ' + (i + 1));
    b.dataset.idx = i;
    b.addEventListener('click', function () { show(i); start(); });
    nav.appendChild(b);
  });
  stage.appendChild(nav);

  var shots = stage.querySelectorAll('.shot');
  var dots  = stage.querySelectorAll('.cdot');

  function show(idx) {
    shots.forEach(function (c, i) {
      c.classList.remove('is-current', 'is-leaving');
      if (i === current && i !== idx) c.classList.add('is-leaving');
    });
    current = idx;
    shots[idx].classList.add('is-current');
    dots.forEach(function (d, i) { d.classList.toggle('is-current', i === idx); });
  }
  function next()  { show((current + 1) % shots.length); }
  function start() { stop(); timer = setInterval(next, INTERVAL_MS); }
  function stop()  { if (timer) { clearInterval(timer); timer = null; } }

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
})();
