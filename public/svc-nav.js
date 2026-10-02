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

  // Sol kenarda, kartların dışındaki boşlukta (uzay boşluğu gibi) süzülen mini filtre: her kategori ikonlu bir durak, yazısı hep açık.
  // Aralarında ilerleme çizgisi var; geçilenler dolu, bulunulan parlıyor
  const ICONS = ['browser', 'camera', 'pencil', 'medal', 'store', 'magnifier', 'bulb', 'gear'];
  const SHORT = (h) => { const t = String(h || '').toLocaleLowerCase('tr-TR'); return /web tasarım/.test(t) ? 'Web tasarım' : /fotoğraf/.test(t) ? 'Fotoğraf' : /metin/.test(t) ? 'Metin' : /marka/.test(t) ? 'Marka' : /pazaryeri/.test(t) ? 'Pazaryeri' : /seo/.test(t) ? 'SEO' : /danışmanlık/.test(t) ? 'Danışmanlık' : /uygulama/.test(t) ? 'Uygulama' : h; };
  const rail = document.createElement('nav');
  rail.className = 'svc-rail';
  rail.setAttribute('aria-label', 'Hizmet kategorileri');
  rail.hidden = true;
  items.forEach((x) => {
    const a = document.createElement('a');
    a.href = '#' + x.id;
    a.dataset.g = String(x.i);
    a.style.setProperty('--d', (x.i * -0.9).toFixed(1) + 's');
    a.innerHTML = '<span class="dot"><svg class="ic" viewBox="0 0 100 100" aria-hidden="true"><use href="#s-' + (ICONS[x.i] || 'star') + '"/></svg></span><span class="lb"></span>';
    a.querySelector('.lb').textContent = SHORT(x.name.trim());
    a.title = x.name.trim();
    a.setAttribute('aria-label', x.name.trim());
    link(a);
    rail.append(a);
  });
  // Arkada hafifçe yanıp sönen küçük yıldızlar
  [[10, 4], [88, 18], [18, 36], [84, 52], [8, 70], [90, 86]].forEach(([x, y], i) => { const s = document.createElement('i'); s.className = 'sp'; s.style.cssText = 'left:' + x + '%;top:' + y + '%;animation-delay:' + (-i * 0.7).toFixed(1) + 's'; rail.append(s); });
  document.body.append(rail);
  const railPills = [...rail.querySelectorAll('a')];

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
