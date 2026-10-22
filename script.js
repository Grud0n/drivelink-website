// ============================================================
//  Animationen beim Scrollen
//  - .reveal / svg[data-draw] bekommen ".in", sobald sie
//    ins Bild kommen (CSS macht den Rest). Bei Linien-SVGs wird das SVG
//    selbst beobachtet und ".in" an .draw/.draw-end darin weitergegeben –
//    einzelne <path>-Elemente meldet der IntersectionObserver unzuverlässig.
//  - [data-count] zählt von 0 hoch
//  Ohne JS oder mit "Bewegung reduzieren" ist alles sofort sichtbar
//  (die Klasse "js" setzt ein Einzeiler im <head>).
// ============================================================
(function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var targets = document.querySelectorAll('.reveal, svg[data-draw], [data-count]');

  function countUp(el) {
    var end = parseInt(el.getAttribute('data-count'), 10) || 0;
    if (reduceMotion || end === 0) { el.textContent = end; return; }
    var start = null;
    var dur = 900;
    function step(ts) {
      if (start === null) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    }
    el.textContent = '0';
    requestAnimationFrame(step);
  }

  function show(el) {
    el.classList.add('in');
    if (el.hasAttribute('data-draw')) {
      Array.prototype.forEach.call(el.querySelectorAll('.draw, .draw-end'), function (d) { d.classList.add('in'); });
    }
    if (el.hasAttribute('data-count')) countUp(el);
  }

  if (!('IntersectionObserver' in window)) {
    Array.prototype.forEach.call(targets, show);
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      show(e.target);
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.15 });

  Array.prototype.forEach.call(targets, function (el) { io.observe(el); });
})();
