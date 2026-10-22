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

// ============================================================
//  Ausfahrten-Seite: Route fährt mit, Kolonne live, Ghost Zone,
//  Vorher/Nachher-Regler, 12-h-Ring. Jede Funktion prüft selbst,
//  ob ihr Element auf der Seite ist. Texte kommen aus data-
//  Attributen, damit dieselbe Datei für DE und EN funktioniert.
// ============================================================
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var comma = document.documentElement.lang === 'de';
  function num(v) { var s = v.toFixed(1); return comma ? s.replace('.', ',') : s; }
  function loop(fn) { if (reduce) return; (function f(ts) { fn(ts); requestAnimationFrame(f); })(performance.now()); }

  // A – Etappen-Liste steuert den Ring auf dem Screenshot und den km-Zähler
  var stops = document.getElementById('stops');
  if (stops) {
    var items = [].slice.call(stops.querySelectorAll('li'));
    var ping = document.getElementById('ping'), kmEl = document.getElementById('km'), stEl = document.getElementById('stp');
    var shown = 0, target = 0;
    var activate = function (li) {
      var idx = items.indexOf(li);
      items.forEach(function (x, i) { x.classList.toggle('on', i <= idx); });
      // Ziel ohne Koordinaten: Ring ausblenden, die ganze Route ist dann geschafft
      ping.style.opacity = li.dataset.x ? 1 : 0;
      if (li.dataset.x) { ping.style.left = li.dataset.x + '%'; ping.style.top = li.dataset.y + '%'; }
      target = parseFloat(li.dataset.km);
      stEl.textContent = Math.min(idx, items.length - 1);
      if (reduce) kmEl.textContent = num(target);
    };
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) activate(e.target); });
      }, { rootMargin: '-45% 0px -45% 0px' });
      items.forEach(function (li) { io.observe(li); });
    }
    activate(items[0]);
    loop(function () {
      shown += (target - shown) * 0.08;
      if (Math.abs(target - shown) < 0.05) shown = target;
      kmEl.textContent = num(shown);
    });
  }

  // B – vier Autos auf der Route, eins fällt zurück, Hinweis fährt ein
  var road = document.getElementById('road');
  if (road) {
    var L = road.getTotalLength(), carsG = document.getElementById('cars');
    var banner = document.getElementById('banner'), gapEl = document.getElementById('gap');
    var cars = [].slice.call(carsG.querySelectorAll('g'));
    var place = function (g, d) {
      var p = road.getPointAtLength(Math.max(0, Math.min(L, d)));
      g.setAttribute('transform', 'translate(' + p.x + ' ' + p.y + ')');
    };
    if (reduce) {
      place(cars[0], L * 0.7); place(cars[1], L * 0.64); place(cars[2], L * 0.58); place(cars[3], L * 0.4);
      banner.classList.add('show');
    } else {
      var t0 = null;
      loop(function (ts) {
        if (t0 === null) t0 = ts;
        var k = ((ts - t0) % 11000) / 11000;
        var lead = 120 + k * (L - 140);
        var lag = k > 0.35 && k < 0.8 ? Math.sin((k - 0.35) / 0.45 * Math.PI) * 170 : 0;
        place(cars[0], lead); place(cars[1], lead - 55); place(cars[2], lead - 110); place(cars[3], lead - 165 - lag);
        var show = lag > 90;
        banner.classList.toggle('show', show);
        if (show) gapEl.textContent = num(lag / 140);
      });
    }
  }

  // C – Auto verschwindet in der Ghost Zone
  var gp = document.getElementById('gpath');
  if (gp) {
    var GL = gp.getTotalLength(), gcar = document.getElementById('gcar'), gstate = document.getElementById('gstate');
    var put = function (k) {
      var p = gp.getPointAtLength(k * GL);
      var inside = Math.hypot(p.x - 450, p.y - 170) < 110;
      gcar.setAttribute('transform', 'translate(' + p.x + ' ' + p.y + ')');
      gcar.style.opacity = inside ? 0 : 1;
      gstate.textContent = inside ? gstate.dataset.off : gstate.dataset.on;
      gstate.setAttribute('fill', inside ? '#45A29E' : '#ECEAE4');
    };
    put(0.15);
    var g0 = null;
    loop(function (ts) { if (g0 === null) g0 = ts; put(((ts - g0) % 7000) / 7000); });
  }

  // D – Vorher/Nachher per Ziehen, Tippen oder Pfeiltasten
  var ba = document.getElementById('ba');
  if (ba) {
    var right = document.getElementById('baRight'), h = document.getElementById('baHandle'), drag = false, touched = false;
    var setPos = function (pct) {
      pct = Math.max(4, Math.min(96, pct));
      right.style.clipPath = 'inset(0 0 0 ' + pct + '%)';
      h.style.left = pct + '%';
      h.setAttribute('aria-valuenow', Math.round(pct));
    };
    var fromEvent = function (e) { var r = ba.getBoundingClientRect(); setPos((e.clientX - r.left) / r.width * 100); };
    ba.addEventListener('pointerdown', function (e) { drag = touched = true; fromEvent(e); });
    window.addEventListener('pointermove', function (e) { if (drag) fromEvent(e); });
    window.addEventListener('pointerup', function () { drag = false; });
    h.addEventListener('keydown', function (e) {
      var v = parseFloat(h.getAttribute('aria-valuenow'));
      if (e.key === 'ArrowLeft') { setPos(v - 5); e.preventDefault(); }
      if (e.key === 'ArrowRight') { setPos(v + 5); e.preventDefault(); }
      touched = true;
    });
    // kurzes Hin-und-her als Hinweis, sobald der Regler ins Bild kommt
    if (!reduce && 'IntersectionObserver' in window) {
      var hio = new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) return;
        hio.disconnect();
        var a = 0;
        (function hint() { a += 0.04; if (a < Math.PI * 2 && !touched) { setPos(50 + Math.sin(a) * 18); requestAnimationFrame(hint); } else if (!touched) setPos(50); })();
      }, { threshold: 0.6 });
      hio.observe(ba);
    }
  }

  // E – 12-h-Ring läuft auf null
  var arc = document.getElementById('arc');
  if (arc) {
    var clock = document.getElementById('clock'), sub = document.getElementById('clockSub'), e0 = null;
    loop(function (ts) {
      if (e0 === null) e0 = ts;
      var k = ((ts - e0) % 9000) / 6000;
      if (k <= 1) {
        var mins = Math.round((1 - k) * 720);
        clock.textContent = Math.floor(mins / 60) + ':' + String(mins % 60).padStart(2, '0');
        arc.setAttribute('stroke-dashoffset', k);
        sub.textContent = sub.dataset.on;
      } else {
        clock.textContent = '0:00';
        arc.setAttribute('stroke-dashoffset', 1);
        sub.textContent = sub.dataset.off;
      }
    });
  }
})();

// ============================================================
//  FAQ als Roadbook: Aufklappen, Route zeichnet sich beim Scrollen,
//  Stopps leuchten auf, "0 €" zählt runter, Mini-Ghost-Zone.
// ============================================================
(function () {
  var qss = [].slice.call(document.querySelectorAll('.qs'));
  if (!qss.length) return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  qss.forEach(function (qs) {
    var b = qs.querySelector('button');
    b.addEventListener('click', function () {
      var open = qs.classList.toggle('open');
      b.setAttribute('aria-expanded', open);
      var c = qs.querySelector('.cnt');
      if (open && c && !reduce) {
        var n = 99;
        (function down() { n = Math.max(0, n - 7); c.textContent = n; if (n > 0) requestAnimationFrame(down); })();
      }
    });
  });

  var routes = [].slice.call(document.querySelectorAll('.qroute'));
  var onScroll = function () {
    var mid = window.innerHeight * 0.55;
    routes.forEach(function (r) {
      var rect = r.getBoundingClientRect();
      r.querySelector('.fill').style.height = (reduce ? rect.height : Math.max(0, Math.min(rect.height, mid - rect.top))) + 'px';
      [].forEach.call(r.querySelectorAll('.qs'), function (qs) {
        qs.classList.toggle('on', reduce || qs.getBoundingClientRect().top + 30 < mid);
      });
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  var mp = document.getElementById('mp');
  if (mp && !reduce) {
    var mc = document.getElementById('mc'), ML = mp.getTotalLength(), t0 = null;
    (function f(ts) {
      if (t0 === null) t0 = ts;
      var p = mp.getPointAtLength(((ts - t0) % 6000) / 6000 * ML);
      mc.setAttribute('cx', p.x); mc.setAttribute('cy', p.y);
      mc.style.opacity = Math.hypot(p.x - 150, p.y - 100) < 54 ? 0 : 1;
      requestAnimationFrame(f);
    })(performance.now());
  }
})();
