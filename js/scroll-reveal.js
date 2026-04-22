// Scroll-reveal for showcase feature cards
(function () {
  var showcases = document.querySelectorAll('.showcase.js-reveal');
  if (!showcases.length) return;

  if (!('IntersectionObserver' in window)) {
    showcases.forEach(function (el) { el.classList.remove('js-reveal'); });
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.remove('js-reveal');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  showcases.forEach(function (el) { io.observe(el); });
})();
