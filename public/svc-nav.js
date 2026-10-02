// Hizmetler sayfası: aşağı inerken hangi kategoride olunduğunu gösteren yüzen çubuk (rengi kategoriyle değişir) ve tıklayınca bölüme gitme
(() => {
  const blocks = [...document.querySelectorAll('.blk-cards[data-g]')];
  if (!blocks.length) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const items = blocks.map((b, i) => ({ b, i, id: b.id, name: (b.querySelector('h2') || {}).textContent || '' }));

  // Yumuşak geçiş: yavaş başlar, ortada hızlanır, yavaş biter (ease-in-out). Mesafe uzadıkça süre biraz uzar; yeni bir hedef gelirse mevcut kaymadan devam eder.
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  let anim = 0;
  const smoothTo = (y) => {
    cancelAnimationFrame(anim);
    const from = window.scrollY, dist = y - from;
    if (Math.abs(dist) < 2) return;
    if (reduced) { window.scrollTo({ top: y, behavior: 'instant' }); return; }
    const dur = Math.min(1700, 800 + Math.abs(dist) * 0.09);
    if (window.__lenis && window.__lenis.scrollTo) { window.__lenis.scrollTo(y, { duration: dur / 1000, easing: ease, force: true }); return; }
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      window.scrollTo({ top: from + dist * ease(p), behavior: 'instant' });
      if (p < 1) anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
  };
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
  const SHORT = (h) => { const t = String(h || '').toLocaleLowerCase('tr-TR'); return /web tasarım/.test(t) ? 'Web tasarım' : /fotoğraf/.test(t) ? 'Fotoğraf' : /metin/.test(t) ? 'Metin' : /marka/.test(t) ? 'Marka' : /pazaryeri/.test(t) ? 'Pazaryeri' : /seo/.test(t) ? 'SEO' : /danışmanlık/.test(t) ? 'Danışmanlık' : /uygulama/.test(t) ? 'Uygulama' : h; };
  const rail = document.createElement('nav');
  rail.className = 'svc-rail';
  rail.setAttribute('aria-label', 'Hizmet filtresi');
  rail.hidden = true;
  items.forEach((x) => {
    const a = document.createElement('a');
    a.href = '#' + x.id;
    a.dataset.g = String(x.i);
    // Her kapsülün kendi süzülme hızı, mesafesi ve zamanı (birbirinden bağımsız, hafif); sol kenar hizası bozulmaz, yalnız yukarı-aşağı
    const R = (n) => { const v = Math.sin((x.i + 1) * 12.9898 * n) * 43758.5453; return v - Math.floor(v); };
    a.style.setProperty('--d', (-R(1) * 9).toFixed(2) + 's');
    a.style.setProperty('--t', (7 + R(2) * 6).toFixed(1) + 's');
    a.style.setProperty('--amp', (2 + R(3) * 2.5).toFixed(1) + 'px');
    a.innerHTML = '<span class="v"></span>';
    a.querySelector('.v').textContent = x.name.trim();
    const sk = document.createElement('i'); sk.className = 'sk'; sk.style.setProperty('--kd', (-R(4) * 3).toFixed(2) + 's'); sk.style.setProperty('--kt', (2 + R(5) * 2).toFixed(1) + 's'); a.append(sk);
    a.title = x.name.trim();
    a.setAttribute('aria-label', x.name.trim());
    link(a);
    // Fare ile üstüne gelince (masaüstü) tıklamaya gerek kalmadan o bölüme gider; kısa bir bekleme, listeyi tararken sayfanın sıçramaması için
    let hoverT = 0;
    a.addEventListener('mouseenter', () => { if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return; clearTimeout(hoverT); hoverT = setTimeout(() => { if (current !== x.i) goTo(x.b); }, 120); });
    a.addEventListener('mouseleave', () => clearTimeout(hoverT));
    rail.append(a);
  });
  // Uzay boşluğu: çubuğun çevresinde hafifçe yanıp sönen birkaç minik yıldız
  [[-4, 8], [102, 30], [-2, 58], [98, 84]].forEach(([x, y], i) => { const s = document.createElement('i'); s.className = 'sp'; s.style.cssText = 'left:' + x + '%;top:' + y + '%;animation-delay:' + (-i * 0.9).toFixed(1) + 's'; rail.append(s); });
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
    let idx = 0;
    blocks.forEach((b, i) => { if (b.getBoundingClientRect().top <= vh * 0.4) idx = i; });
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
