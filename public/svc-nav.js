// Hizmetler sayfası: aşağı inerken hangi kategoride olunduğunu gösteren yüzen çubuk (rengi kategoriyle değişir) ve tıklayınca bölüme gitme
(() => {
  const blocks = [...document.querySelectorAll('.blk-cards[data-g]')];
  if (!blocks.length) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const items = blocks.map((b, i) => ({ b, i, id: b.id, name: (b.querySelector('h2') || {}).textContent || '' }));

  // Yumuşak geçiş: sönümlü yay hareketi. Yavaş kalkar, ortada hızlanır, yavaş oturur; kayma sürerken yeni hedef gelirse hız korunur,
  // durup yeniden başlamaz (takılma olmaz). Uzak hedeflerde daha yumuşak (daha uzun) gider.
  let pos = 0, vel = 0, target = 0, w = 5, raf = 0, last = 0;
  const setY = (v) => { if (window.__lenis && window.__lenis.scrollTo) window.__lenis.scrollTo(v, { immediate: true, force: true }); else window.scrollTo({ top: v, behavior: 'instant' }); };
  const stopAnim = () => { cancelAnimationFrame(raf); raf = 0; vel = 0; };
  const animTick = (now) => {
    const dt = Math.min(0.034, (now - last) / 1000 || 0.016); last = now;
    const acc = -w * w * (pos - target) - 2 * w * vel; // kritik sönümlü yay
    vel += acc * dt; pos += vel * dt;
    if (Math.abs(pos - target) < 0.5 && Math.abs(vel) < 8) { setY(target); raf = 0; vel = 0; return; }
    setY(pos);
    raf = requestAnimationFrame(animTick);
  };
  const smoothTo = (y) => {
    if (reduced) { setY(y); return; }
    if (!raf) { pos = window.scrollY; vel = 0; last = performance.now(); }
    target = y;
    // Uzak hedef: aradaki bölümlerin hepsini tek tek kaydırıp (hepsinin animasyonlarını birden tetikleyip) takılmaya yol açmak yerine,
    // hedefin hemen yakınına geçilir ve son kısım yumuşakça süzülerek oturur. Süre her mesafede aynı kalır.
    const GLIDE = 900;
    if (Math.abs(target - pos) > GLIDE * 1.6) { pos = target - Math.sign(target - pos) * GLIDE; setY(pos); vel = 0; }
    w = 7.5;
    if (!raf) raf = requestAnimationFrame(animTick);
  };
  ['wheel', 'touchstart', 'keydown'].forEach((ev) => window.addEventListener(ev, () => { if (raf) stopAnim(); }, { passive: true })); // kullanıcı kaydırmaya başlarsa bırakır
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
    a.addEventListener('mouseenter', () => { if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return; clearTimeout(hoverT); hoverT = setTimeout(() => { if (current !== x.i) goTo(x.b); }, 200); });
    a.addEventListener('mouseleave', () => clearTimeout(hoverT));
    rail.append(a);
  });
  // Uzay boşluğu: çubuğun çevresinde hafifçe yanıp sönen birkaç minik yıldız
  [[-4, 8], [102, 30], [-2, 58], [98, 84]].forEach(([x, y], i) => { const s = document.createElement('i'); s.className = 'sp'; s.style.cssText = 'left:' + x + '%;top:' + y + '%;animation-delay:' + (-i * 0.9).toFixed(1) + 's'; rail.append(s); });
  document.body.append(rail);
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
    rail.hidden = !inside;
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
