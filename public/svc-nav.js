// Hizmetler sayfası: aşağı inerken hangi kategoride olunduğunu gösteren yüzen çubuk (rengi kategoriyle değişir) ve tıklayınca bölüme gitme
(() => {
  const blocks = [...document.querySelectorAll('.blk-cards[data-g]')];
  if (!blocks.length) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const items = blocks.map((b, i) => ({ b, i, id: b.id, name: (b.querySelector('h2') || {}).textContent || '' }));

  // Geçiş efekti yok: kategoriye gidilince sayfa doğrudan o bölüme açılır
  const setY = (v) => { if (window.__lenis && window.__lenis.scrollTo) window.__lenis.scrollTo(v, { immediate: true, force: true }); else window.scrollTo({ top: v, behavior: 'instant' }); };
  const smoothTo = (y) => setY(y);
  const goTo = (b) => smoothTo(Math.max(0, Math.round(b.getBoundingClientRect().top + window.scrollY - 84)));
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

  // Sol kenarda mini filtre (geniş ekranda): numaralı yuvarlaklar, üstüne gelince başlık açılır, aktif olan kendi renginde dolu
  let hoverT = 0; // tek ortak zamanlayıcı: listeyi tararken yalnız durulan kategori için gidilir
  const SHORT = (h) => { const t = String(h || '').toLocaleLowerCase('tr-TR'); return /web tasarım/.test(t) ? 'Web tasarım' : /fotoğraf/.test(t) ? 'Fotoğraf' : /metin/.test(t) ? 'Metin' : /marka/.test(t) ? 'Marka' : /pazaryeri/.test(t) ? 'Pazaryeri' : /seo/.test(t) ? 'SEO' : /danışmanlık/.test(t) ? 'Danışmanlık' : /uygulama/.test(t) ? 'Uygulama' : h; };
  const rail = document.createElement('nav');
  rail.className = 'svc-rail';
  rail.setAttribute('aria-label', 'Hizmet filtresi');
  items.forEach((x) => {
    const a = document.createElement('a');
    a.href = '#' + x.id;
    a.dataset.g = String(x.i);
    a.style.setProperty('--k', String(x.i)); // giriş efektinde sırayla gelmesi için
    // Her kapsülün kendi süzülme hızı, mesafesi ve zamanı (birbirinden bağımsız, hafif); sol kenar hizası bozulmaz, yalnız yukarı-aşağı
    const R = (n) => { const v = Math.sin((x.i + 1) * 12.9898 * n) * 43758.5453; return v - Math.floor(v); };
    a.style.setProperty('--d', (-R(1) * 9).toFixed(2) + 's');
    a.style.setProperty('--t', (7 + R(2) * 6).toFixed(1) + 's');
    a.style.setProperty('--amp', (1.8 + R(3) * 1.2).toFixed(1) + 'px');
    a.style.setProperty('--sx', (2.5 + R(6) * 2.5).toFixed(1) + 'px');
    a.style.setProperty('--rot', (0.7 + R(7) * 0.6).toFixed(2) + 'deg');
    a.innerHTML = '<span class="v"></span>';
    a.querySelector('.v').textContent = x.name.trim();
    a.title = x.name.trim();
    a.setAttribute('aria-label', x.name.trim());
    link(a);
    // Fare ile üstüne gelince (masaüstü) tıklamaya gerek kalmadan o bölüme gider; kısa bir bekleme, listeyi tararken sayfanın sıçramaması için
    a.addEventListener('mouseenter', () => { if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return; clearTimeout(hoverT); hoverT = setTimeout(() => { if (current !== x.i) goTo(x.b); }, 200); });
    a.addEventListener('mouseleave', () => clearTimeout(hoverT));
    rail.append(a);
  });
  // Filtre listesi ilk bölüm başlığının hizasında başlar (sepet işareti gibi), aşağı inerken ekranda sabit kalır
  const wrap = document.createElement('div');
  wrap.className = 'svc-rail-wrap';
  wrap.append(rail);
  const main = document.getElementById('top') || document.body;
  main.append(wrap);
  const placeRail = () => {
    const h = blocks[0].querySelector('h2') || blocks[0];
    const m = main.getBoundingClientRect(), hr = h.getBoundingClientRect(), lb = blocks[blocks.length - 1].getBoundingClientRect();
    wrap.style.top = Math.max(0, hr.top - m.top) + 'px';
    wrap.style.height = Math.max(120, lb.bottom - hr.top) + 'px';
  };
  placeRail();
  window.addEventListener('resize', placeRail);
  window.addEventListener('load', placeRail);
  if (window.ResizeObserver) new ResizeObserver(placeRail).observe(main);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(placeRail);
  [300, 900, 1800, 3500].forEach((ms) => setTimeout(placeRail, ms));
  const railPills = [...rail.children];

  let current = -1;
  let tops = [], lastBottom = 0;
  const measure = () => { const s = window.scrollY; tops = blocks.map((b) => b.getBoundingClientRect().top + s); lastBottom = blocks[blocks.length - 1].getBoundingClientRect().bottom + s; };
  measure();
  setInterval(measure, 800); // içerik yüklenirken yükseklikler değişir
  window.addEventListener('resize', measure);
  const update = () => {
    const vh = window.innerHeight;
    const sy = window.scrollY, first = tops[0] - sy, last = lastBottom - sy; // konumlar önbellekte: kaydırırken her karede yerleşim okunmaz
    const inside = first < vh * 0.55 && last > vh * 0.3;
    bar.hidden = !inside;
    rail.classList.toggle('show', inside); // bölüme girince filtre uzaklıktan (sonsuzluktan) gelir, çıkınca uzaklaşır
    let idx = 0;
    tops.forEach((t, i) => { if (t - sy <= vh * 0.4) idx = i; });
    if (idx !== current) {
      current = idx;
      pills.forEach((p, i) => p.classList.toggle('on', i === idx));
      railPills.forEach((p, i) => p.classList.toggle('on', i === idx));
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
