// Hizmetler sayfası: aşağı inerken hangi kategoride olunduğunu gösteren yüzen çubuk (rengi kategoriyle değişir) ve tıklayınca bölüme gitme
(() => {
  const blocks = [...document.querySelectorAll('.blk-cards[data-g]')];
  const index = document.querySelector('.svc-index');
  if (!blocks.length) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const items = blocks.map((b, i) => ({ b, i, id: b.id, name: (b.querySelector('h2') || {}).textContent || '' }));

  const goTo = (b) => {
    const y = Math.max(0, Math.round(b.getBoundingClientRect().top + window.scrollY - 84));
    if (window.__lenis && window.__lenis.scrollTo) window.__lenis.scrollTo(y, { duration: reduced ? 0 : 1.1 });
    else window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
  };
  // Üstteki liste ve yüzen çubuktaki bağlantılar
  const link = (a) => a.addEventListener('click', (e) => {
    const t = items.find((x) => '#' + x.id === a.getAttribute('href'));
    if (!t) return;
    e.preventDefault();
    goTo(t.b);
    history.replaceState(null, '', '#' + t.id);
  });
  document.querySelectorAll('.svc-index a').forEach(link);

  // Yüzen çubuk
  const bar = document.createElement('nav');
  bar.className = 'svc-bar';
  bar.setAttribute('aria-label', 'Hizmet kategorileri');
  bar.hidden = true;
  const track = document.createElement('div');
  track.className = 'svc-bar-track';
  items.forEach((x) => {
    const a = document.createElement('a');
    a.href = '#' + x.id;
    a.dataset.g = String(x.i);
    a.textContent = x.name.trim();
    link(a);
    track.append(a);
  });
  bar.append(track);
  document.body.append(bar);
  const pills = [...track.children];

  let current = -1;
  const update = () => {
    const vh = window.innerHeight;
    const first = blocks[0].getBoundingClientRect().top;
    const last = blocks[blocks.length - 1].getBoundingClientRect().bottom;
    const inside = first < vh * 0.55 && last > vh * 0.3;
    bar.hidden = !inside;
    let idx = 0;
    blocks.forEach((b, i) => { if (b.getBoundingClientRect().top <= vh * 0.4) idx = i; });
    if (idx !== current) {
      current = idx;
      pills.forEach((p, i) => p.classList.toggle('on', i === idx));
      bar.dataset.g = String(idx); // çubuğun rengi aktif kategoriye göre değişir
      const p = pills[idx];
      if (p && track.scrollTo) track.scrollTo({ left: Math.max(0, p.offsetLeft - track.clientWidth / 2 + p.offsetWidth / 2), behavior: reduced ? 'auto' : 'smooth' });
    }
    // Üstteki listede de aktif satır
    if (index) index.querySelectorAll('a').forEach((a, i) => a.classList.toggle('on', i === idx && !bar.hidden));
  };
  let tick = 0;
  const on = () => { if (!tick) tick = requestAnimationFrame(() => { tick = 0; update(); }); };
  window.addEventListener('scroll', on, { passive: true });
  window.addEventListener('resize', on);
  update();
  // Adreste #bölüm varsa oraya git
  if (location.hash) { const t = items.find((x) => '#' + x.id === location.hash); if (t) setTimeout(() => goTo(t.b), 400); }
})();
