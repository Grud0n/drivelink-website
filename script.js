(function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) return;

  // Parallax auf Hero-Blobs & Phone-Mockups. Die Phone-Mockups haben ein
  // rotate() im CSS (per Klasse) – das muss beim Setzen von transform per JS
  // mit übernommen werden, sonst geht es beim Scrollen verloren.
  var parallaxEls = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]'));

  function rotationFor(el) {
    if (el.classList.contains('phone-left'))  return 'rotate(-13deg)';
    if (el.classList.contains('phone-right')) return 'rotate(12deg)';
    return '';
  }

  function tick() {
    var y = window.scrollY || window.pageYOffset;
    parallaxEls.forEach(function (el) {
      var speed = parseFloat(el.getAttribute('data-parallax')) || 0.2;
      el.style.transform = rotationFor(el) + ' translateY(' + (y * speed * -1) + 'px)';
    });
  }

  window.addEventListener('scroll', tick, { passive: true });
  tick();
})();
