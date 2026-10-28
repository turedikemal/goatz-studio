// Shopier kampanyası açılışta görünür; kapatılınca sağ alttaki düğmeden yeniden açılır.
(() => {
  const box = document.getElementById('promo');
  if (!box || box.dataset.promoReady) return;
  box.dataset.promoReady = 'true';
  const trigger = document.getElementById('promoTrigger');
  const KEY = 'goatz-kampanya-shopier';
  // Deneme: /?pencere adresi pencereyi 1 sn sonra açar, sayaçlara yazmaz
  const TEST = /[?&]pencere\b/.test(location.search);
  let last = null, shown = false, closeTimer = 0;
  const ping = (e) => { if (TEST) return; if (window.goatzEvent) window.goatzEvent('promo_' + e, { campaign: 'shopier' }); try { const d = JSON.stringify({ e }); if (!(navigator.sendBeacon && navigator.sendBeacon('/api/promo', new Blob([d], { type: 'application/json' })))) fetch('/api/promo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: d, keepalive: true }); } catch (err) { /* sayaç gitmese de sorun değil */ } };
  const close = () => {
    ping('close');
    box.classList.remove('show');
    shown = false;
    if (trigger) { trigger.hidden = false; trigger.setAttribute('aria-expanded', 'false'); }
    try { localStorage.setItem(KEY, String(Date.now())); } catch (e) { /* kayıt yoksa sorun değil */ }
    closeTimer = setTimeout(() => { box.hidden = true; }, 350);
    document.removeEventListener('keydown', onKey);
    if (trigger) trigger.focus({ preventScroll: true });
    else if (last && last.focus) last.focus();
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  const open = () => {
    if (shown) return; shown = true; ping('view');
    clearTimeout(closeTimer);
    if (trigger) { trigger.hidden = true; trigger.setAttribute('aria-expanded', 'true'); }
    last = document.activeElement;
    box.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => box.classList.add('show')));
    document.addEventListener('keydown', onKey);
    setTimeout(() => { const x = box.querySelector('.promo-card'); if (x) x.focus({ preventScroll: true }); }, 60);
  };
  if (trigger) trigger.addEventListener('click', open);
  box.addEventListener('click', (e) => {
    if (e.target.closest('[data-promo-x]')) close();
    else if (e.target.closest('.promo-go')) {
      ping('click');
      // 30 gün: bu kişi teklif, sepet ya da iletişim formundan yazarsa kampanyadan geldiği bilinsin
      document.cookie = 'goatz_kampanya=shopier; max-age=2592000; path=/; samesite=lax';
      try { sessionStorage.setItem('goatz-kampanya', 'shopier'); localStorage.setItem(KEY, String(Date.now())); } catch (err) { /* adres parametresi yeter */ }
    }
  });
  if (TEST) setTimeout(open, 1000);
  else open();
})();

