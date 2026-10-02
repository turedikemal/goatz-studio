// Hizmetler sayfası: kategori filtresi. Soldaki (dar ekranda üstteki) listeden bir kategori seçilince yalnız o kategori gösterilir,
// "Tümü" ile hepsi görünür. Hepsi görünürken kaydırdıkça bulunulan kategori listede işaretlenir.
(() => {
  const blocks = [...document.querySelectorAll('.blk-cards[data-g]')];
  const filter = document.querySelector('.svc-filter');
  if (!blocks.length || !filter) return;
  const layout = document.querySelector('.svc-layout');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rows = [...filter.querySelectorAll('[data-sel]')];
  const ids = blocks.map((b) => b.id);
  let sel = 'all';

  const scrollToTop = () => {
    const y = Math.max(0, Math.round((layout || blocks[0]).getBoundingClientRect().top + window.scrollY - 84));
    if (window.__lenis && window.__lenis.scrollTo) window.__lenis.scrollTo(y, { duration: reduced ? 0 : 0.9 });
    else window.scrollTo({ top: y, behavior: reduced ? 'auto' : 'smooth' });
  };
  const apply = (next, go) => {
    sel = next;
    blocks.forEach((b, i) => { b.hidden = sel !== 'all' && i !== sel; });
    rows.forEach((r) => {
      const on = (r.dataset.sel === 'all' && sel === 'all') || r.dataset.sel === String(sel);
      r.classList.toggle('on', on);
      r.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    filter.classList.toggle('is-filtered', sel !== 'all');
    try { history.replaceState(null, '', sel === 'all' ? location.pathname : '#' + ids[sel]); } catch (e) { /* adres çubuğu güncellenemezse sorun değil */ }
    window.dispatchEvent(new Event('resize')); // sepet işareti konumunu yeniden hesaplar
    if (go) scrollToTop();
    spy();
  };
  rows.forEach((r) => r.addEventListener('click', (e) => {
    e.preventDefault();
    const v = r.dataset.sel === 'all' ? 'all' : +r.dataset.sel;
    apply(v === sel ? 'all' : v, true); // seçili kategoriye tekrar tıklayınca filtre kalkar
  }));

  // Hepsi görünürken: ekranda hangi kategori varsa listede hafifçe işaretlenir
  function spy() {
    const vh = window.innerHeight;
    let idx = -1;
    if (sel === 'all') blocks.forEach((b, i) => { if (b.getBoundingClientRect().top <= vh * 0.4) idx = i; });
    rows.forEach((r) => r.classList.toggle('spy', sel === 'all' && r.dataset.sel === String(idx)));
  }
  let tick = 0;
  window.addEventListener('scroll', () => { if (!tick) tick = requestAnimationFrame(() => { tick = 0; spy(); }); }, { passive: true });
  window.addEventListener('resize', spy);

  // Adreste #kategori varsa yalnız o kategori açılır
  const h = ids.indexOf(location.hash.slice(1));
  if (h >= 0) apply(h, false); else apply('all', false);
})();
