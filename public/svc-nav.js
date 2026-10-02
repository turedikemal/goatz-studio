// Hizmetler sayfası: aşağı inerken hangi kategoride olunduğunu gösteren yüzen çubuk (rengi kategoriyle değişir) ve tıklayınca bölüme gitme
(() => {
  const blocks = [...document.querySelectorAll('.blk-cards[data-g]')];
  if (!blocks.length) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const items = blocks.map((b, i) => ({ b, i, id: b.id, name: (b.querySelector('h2') || {}).textContent || '' }));

  const goTo = (b) => {
    const y = Math.max(0, Math.round(b.getBoundingClientRect().top + window.scrollY - 84));
    if (window.__lenis && window.__lenis.scrollTo) window.__lenis.scrollTo(y, { duration: reduced ? 0 : 1.1 });
    else window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
  };
  // Bağlantılar
  const link = (a) => a.addEventListener('click', (e) => {
    const t = items.find((x) => '#' + x.id === a.getAttribute('href'));
    if (!t) return;
    e.preventDefault();
    goTo(t.b);
    history.replaceState(null, '', '#' + t.id);
  });

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

  // Sol kenarda mini filtre (geniş ekran): her kategori kendi renginde ve ikonlu bir durak; aralarında ilerleme çizgisi,
  // geçilenler dolu, bulunulan büyük, üstüne gelince başlık ve hizmet sayısı açılır
  const ICONS = ['browser', 'camera', 'pencil', 'medal', 'store', 'magnifier', 'bulb', 'gear'];
  const rail = document.createElement('nav');
  rail.className = 'svc-rail';
  rail.setAttribute('aria-label', 'Hizmet filtresi');
  rail.hidden = true;
  items.forEach((x) => {
    const a = document.createElement('a');
    a.href = '#' + x.id;
    a.dataset.g = String(x.i);
    const n = x.b.querySelectorAll('.k-card').length;
    a.innerHTML = '<svg class="ic" viewBox="0 0 100 100" aria-hidden="true"><use href="#s-' + (ICONS[x.i] || 'star') + '"/></svg><span class="tip"><b></b><small>' + n + ' hizmet</small></span>';
    a.querySelector('b').textContent = x.name.trim();
    a.setAttribute('aria-label', x.name.trim());
    link(a);
    rail.append(a);
  });
  document.body.append(rail);
  const railPills = [...rail.children];

  let current = -1;
  const update = () => {
    const vh = window.innerHeight;
    const first = blocks[0].getBoundingClientRect().top;
    const last = blocks[blocks.length - 1].getBoundingClientRect().bottom;
    const inside = first < vh * 0.55 && last > vh * 0.3;
    bar.hidden = !inside;
    rail.hidden = !inside;
    const span = Math.max(1, last - first);
    rail.style.setProperty('--p', Math.max(0, Math.min(1, (vh * 0.4 - first) / (span + vh * 0.0))).toFixed(3));
    let idx = 0;
    blocks.forEach((b, i) => { if (b.getBoundingClientRect().top <= vh * 0.4) idx = i; });
    if (idx !== current) {
      current = idx;
      pills.forEach((p, i) => p.classList.toggle('on', i === idx));
      railPills.forEach((p, i) => { p.classList.toggle('on', i === idx); p.classList.toggle('done', i < idx); });
      bar.dataset.g = String(idx); // çubuğun rengi aktif kategoriye göre değişir
      const p = pills[idx];
      if (p && track.scrollTo) track.scrollTo({ left: Math.max(0, p.offsetLeft - track.clientWidth / 2 + p.offsetWidth / 2), behavior: reduced ? 'auto' : 'smooth' });
    }
  };
  let tick = 0;
  const on = () => { if (!tick) tick = requestAnimationFrame(() => { tick = 0; update(); }); };
  window.addEventListener('scroll', on, { passive: true });
  window.addEventListener('resize', on);
  update();
  // Adreste #bölüm varsa oraya git
  if (location.hash) { const t = items.find((x) => '#' + x.id === location.hash); if (t) setTimeout(() => goTo(t.b), 400); }
})();
