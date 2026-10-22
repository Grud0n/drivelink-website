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

})();

// ============================================================
//  Autotreffen-Seite, nachgebaut nach der App:
//  Treffen-Karte (1 Pins erscheinen, 2 Filter Car-Meet, 3 Pin antippen
//  -> Vorschau-Leiste, 4 Nav -> Route) und "Event erstellen" in den
//  echten Schritten. Am Handy läuft die Karte automatisch durch.
// ============================================================
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var narrow = window.matchMedia('(max-width: 860px)');

  var mm = document.getElementById('mm');
  if (mm) {
    var pins = [].slice.call(mm.querySelectorAll('.ev-pin'));
    var catChip = document.getElementById('mmCat'), catLbl = catChip.querySelector('span');
    var nav = document.getElementById('ppNav');
    var dots = [].slice.call(document.querySelectorAll('.mm-dots i'));
    var steps = [].slice.call(document.querySelectorAll('.ms-steps li'));
    var current = 0, T = [];
    var setStep = function (n) {
      if (n === current) return;
      current = n;
      T.forEach(clearTimeout); T = [];
      mm.className = 'mm s' + n;
      pins.forEach(function (p, i) {
        var show = n >= 1 && (n < 2 || p.dataset.cat === 'meet');
        if (show && p.classList.contains('hide')) T.push(setTimeout(function () { p.classList.remove('hide'); }, reduce || n > 1 ? 0 : i * 120));
        else if (!show) p.classList.add('hide');
      });
      catChip.classList.toggle('on', n >= 2);
      catLbl.textContent = n >= 2 ? catChip.dataset.meet : catChip.dataset.all;
      dots.forEach(function (d, i) { d.classList.toggle('on', i === n - 1); });
      steps.forEach(function (s) { s.classList.toggle('on', +s.dataset.step <= n); });
      if (n === 4) {
        // Leiste kurz zeigen, "Nav" wird gedrückt, dann zeichnet sich die Route
        mm.className = 'mm s3';
        T.push(setTimeout(function () { nav.classList.add('press'); }, reduce ? 0 : 500));
        T.push(setTimeout(function () { nav.classList.remove('press'); mm.className = 'mm s4'; }, reduce ? 0 : 750));
      }
    };
    if (reduce) { setStep(4); }
    else if ('IntersectionObserver' in window) {
      var auto = null;
      var startAuto = function () {
        if (auto) return;
        var n = 1; setStep(1);
        auto = setInterval(function () { n = n % 4 + 1; if (n === 1) { current = 0; pins.forEach(function (p) { p.classList.add('hide'); }); } setStep(n); }, 2900);
      };
      var stepIO = new IntersectionObserver(function (es) {
        if (narrow.matches) return;
        es.forEach(function (e) { if (e.isIntersecting) setStep(+e.target.dataset.step); });
      }, { rootMargin: '-45% 0px -45% 0px' });
      steps.forEach(function (s) { stepIO.observe(s); });
      new IntersectionObserver(function (es) {
        if (!es[0].isIntersecting) return;
        if (narrow.matches) startAuto(); else if (!current) setStep(1);
      }, { threshold: 0.4 }).observe(mm);
    } else { setStep(4); }
  }

  var ce = document.getElementById('mk');
  if (ce) {
    var q = function (s) { return ce.querySelector(s); };
    var s1 = q('.s1'), s2 = q('.s2'), s3 = q('.s3');
    var title = q('[data-k="title"]'), date = q('[data-k="date"]');
    var cat = q('.ce-cat[data-c="meet"]'), weekly = q('.ce-rep [data-r="weekly"]'), once = q('.ce-rep [data-r="once"]');
    var hint = q('.ce-hint'), bar = q('.ce-track i'), prog = q('.ce-prog span'), next = q('.ce-next'), nextLbl = next.querySelector('span');
    var foot = q('.ce-foot');
    var D = ce.dataset, T2 = [];
    var at = function (ms, fn) { T2.push(setTimeout(fn, ms)); };
    var stepTxt = function (n) { prog.textContent = D.prog.replace('{n}', n); bar.style.width = (n * 20) + '%'; };
    var type = function (el, text, from, speed) {
      for (var i = 0; i <= text.length; i++) (function (i) {
        at(from + i * speed, function () { el.innerHTML = i ? text.slice(0, i) + (i < text.length ? '<span class="caret"></span>' : '') : '<span class="ph">' + D.ph + '</span>'; });
      })(i);
      return from + text.length * speed;
    };
    var press = function (ms, fn) { at(ms, function () { next.classList.add('press'); }); at(ms + 150, function () { next.classList.remove('press'); fn(); }); };
    var reset = function () {
      T2.forEach(clearTimeout); T2 = [];
      s1.className = 'ce-step s1'; s2.className = 'ce-step s2 off-r'; s3.className = 'ce-step s3 ce-done off-r';
      title.innerHTML = '<span class="ph">' + D.ph + '</span>'; date.innerHTML = '<span class="ph">' + D.dph + '</span>';
      cat.classList.remove('on'); cat.style.cssText = ''; cat.querySelector('span').style.color = '';
      weekly.classList.remove('on'); once.classList.add('on'); hint.classList.remove('on');
      stepTxt(1); nextLbl.textContent = D.next; foot.style.opacity = 1;
    };
    var pickCat = function () { cat.classList.add('on'); cat.style.borderColor = '#45A29E'; cat.style.background = 'rgba(69,162,158,0.094)'; cat.querySelector('span').style.color = '#45A29E'; };
    var finalState = function () {
      reset(); s1.className = 'ce-step s1 off-l'; s3.className = 'ce-step s3 ce-done'; stepTxt(5); foot.style.opacity = 0;
    };
    var play = function () {
      reset();
      var t = type(title, D.title, 500, 75);
      at(t + 400, pickCat);
      press(t + 1300, function () { s1.classList.add('off-l'); s2.classList.remove('off-r'); stepTxt(2); });
      at(t + 2000, function () { date.textContent = D.date; });
      at(t + 2700, function () { once.classList.remove('on'); weekly.classList.add('on'); hint.classList.add('on'); });
      at(t + 3500, function () { stepTxt(5); nextLbl.textContent = D.pub; });
      press(t + 4300, function () { s2.classList.add('off-l'); s3.classList.remove('off-r'); foot.style.opacity = 0; });
      at(t + 9500, play);
    };
    if (reduce || !('IntersectionObserver' in window)) finalState();
    else {
      var running = false;
      finalState();
      new IntersectionObserver(function (es) {
        if (es[0].isIntersecting && !running) { running = true; play(); }
        else if (!es[0].isIntersecting && running) { running = false; T2.forEach(clearTimeout); finalState(); }
      }, { threshold: 0.35 }).observe(ce);
    }
  }
})();

// ============================================================
//  App-nahe Animationen (Ausfahrten + FAQ), nachgebaut nach
//  MapScreen.js und GroupConvoyCard.js:
//  - .cv-stage: Kolonne auf der Karte, ein Mitglied fällt zurück,
//    in der Kolonnen-Leiste erscheint der Hinweis wie in der App
//  - .gz-stage: eigener Standort fährt in die Ghost Zone,
//    oben erscheint "GHOST MODE"
//  - .gcc[data-cycle]: Kolonnen-Karte wechselt von "läuft" zu "beendet"
//  Koordinaten im Kartenbild-Raster 710 × 900.
// ============================================================
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var de = document.documentElement.lang === 'de';
  var pct = function (el, p) { el.style.left = (p.x / 7.1) + '%'; el.style.top = (p.y / 9) + '%'; };
  var whenVisible = function (el, fn) {
    if (reduce || !('IntersectionObserver' in window)) return;
    var started = false;
    new IntersectionObserver(function (es) { if (es[0].isIntersecting && !started) { started = true; fn(); } }, { threshold: 0.3 }).observe(el);
  };

  [].forEach.call(document.querySelectorAll('.cv-stage'), function (st) {
    var path = st.querySelector('.cv-path'), L = path.getTotalLength();
    var users = [].slice.call(st.querySelectorAll('.cv-user')), me = st.querySelector('.me-dot');
    var strag = st.querySelector('.cv-strag'), dist = st.querySelector('.cv-dist');
    var gaps = [0, 70, 140, 210]; // Navigator vorn, dann du, dann zwei weitere
    var place = function (lead, lag) {
      [users[0], me, users[1], users[2]].forEach(function (el, i) {
        var d = lead - gaps[i] - (i === 3 ? lag : 0);
        pct(el, path.getPointAtLength(Math.max(0, Math.min(L, d))));
      });
    };
    place(L * 0.62, 260); strag.classList.add('on');
    whenVisible(st, function () {
      strag.classList.remove('on');
      var t0 = null;
      (function f(ts) {
        if (t0 === null) t0 = ts;
        var k = ((ts - t0) % 12000) / 12000;
        var lag = k > 0.3 && k < 0.85 ? Math.sin((k - 0.3) / 0.55 * Math.PI) * 300 : 0;
        place(230 + k * (L - 240), lag);
        var on = lag > 150;
        strag.classList.toggle('on', on);
        if (on) { var v = (lag / 220).toFixed(1); dist.textContent = (de ? v.replace('.', ',') : v) + ' km'; }
        requestAnimationFrame(f);
      })(performance.now());
    });
  });

  [].forEach.call(document.querySelectorAll('.gz-stage'), function (st) {
    var path = st.querySelector('.gz-path'), L = path.getTotalLength(), me = st.querySelector('.me-dot');
    var badge = st.querySelector('.gz-badge'), z = st.querySelector('.gz-zone');
    var cx = +z.dataset.x, cy = +z.dataset.y, r = +z.dataset.r;
    var put = function (k) {
      var p = path.getPointAtLength(k * L); pct(me, p);
      badge.classList.toggle('on', Math.hypot(p.x - cx, p.y - cy) < r);
    };
    put(0.5);
    whenVisible(st, function () {
      var t0 = null;
      (function f(ts) { if (t0 === null) t0 = ts; put(((ts - t0) % 8000) / 8000); requestAnimationFrame(f); })(performance.now());
    });
  });

  [].forEach.call(document.querySelectorAll('.gcc[data-cycle]'), function (c) {
    var k = c.querySelector('.gcc-k span'), m = c.querySelector('.gcc-m'), D = c.dataset;
    var set = function (ended) { c.classList.toggle('ended', ended); k.textContent = ended ? D.kEnd : D.kRun; m.textContent = ended ? D.mEnd : D.mRun; };
    whenVisible(c, function () { var ended = false; setInterval(function () { ended = !ended; set(ended); }, 3200); });
  });
})();
