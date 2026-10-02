// Hizmetler sayfası: hizmet sepeti. Kartlardan "Sepete ekle", sağda sepet düğmesi, sepet içeriğiyle "Fiyat al" (e-posta olarak bize gelir).
(() => {
  const mark = document.querySelector('[data-svc-cart]');
  if (!mark) return;
  const NL = String.fromCharCode(10);
  const KEY = 'goatz-hizmet-sepeti';
  const KVKK = mark.dataset.kvkk || '';
  const load = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v.filter((x) => x && typeof x.g === 'string' && typeof x.t === 'string') : []; } catch (e) { return []; } };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) { /* sepet yalnızca bu sayfada kalır */ } };
  let items = load();
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; };
  const clean = (n) => n.textContent.replace(/\s+/g, ' ').trim();
  const has = (g, t) => items.some((x) => x.g === g && x.t === t);

  // ---- Kartlar: Sepete ekle düğmesi ----
  const cards = [...document.querySelectorAll('.blk-cards .k-card')].map((card) => {
    const sec = card.closest('.blk-cards');
    const h2 = sec && sec.querySelector('h2');
    const h3 = card.querySelector('h3');
    if (!h3) return null;
    const g = h2 ? clean(h2) : 'Hizmet', t = clean(h3);
    const b = el('button', 'cart-add');
    b.type = 'button';
    card.append(b);
    b.addEventListener('click', () => {
      if (has(g, t)) items = items.filter((x) => !(x.g === g && x.t === t)); else items.push({ g, t });
      save(); sync();
    });
    return { b, g, t };
  }).filter(Boolean);

  // ---- Sağ kenarda sepet düğmesi (Ürün çekimi hizasından başlar, sayfa boyunca yapışkan) ----
  const main = document.getElementById('top') || document.body;
  const rail = el('div', 'cart-rail');
  const fab = el('button', 'cart-fab');
  fab.type = 'button'; fab.setAttribute('aria-haspopup', 'dialog'); fab.setAttribute('aria-label', 'Hizmet sepeti');
  fab.innerHTML = '<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><path d="M6 10h8l7 30h28l6-22H17" fill="#fff" stroke="#000" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/><circle cx="25" cy="52" r="5" fill="#ffd731" stroke="#000" stroke-width="4"/><circle cx="46" cy="52" r="5" fill="#ffd731" stroke="#000" stroke-width="4"/></svg>';
  const badge = el('b', 'cart-count', '0');
  const tip = el('span', 'cart-tip', 'Sepet');
  fab.append(badge, tip);
  rail.append(fab);
  main.append(rail);
  // Sepet: yatayda ilk kart satırının sağ köşesinde, dikeyde "Ürün çekimi" başlığıyla aynı hizada; sayfa boyunca yapışkan kalır
  const place = () => {
    if (matchMedia('(max-width: 900px)').matches) { rail.style.top = rail.style.left = rail.style.height = rail.style.right = ''; return; }
    const blocks = [...document.querySelectorAll('.blk-cards')];
    const grid = blocks[0] && blocks[0].querySelector('.k-grid');
    if (!grid || !blocks.length) return;
    const h2 = blocks[0].querySelector('h2');
    const m = main.getBoundingClientRect(), g = grid.getBoundingClientRect(), z = blocks[blocks.length - 1].getBoundingClientRect(), hh = (h2 || grid).getBoundingClientRect();
    rail.style.right = 'auto';
    rail.style.left = Math.max(0, g.right - m.left - 34) + 'px';
    rail.style.top = Math.max(0, hh.top + hh.height / 2 - m.top - 34) + 'px'; // dikeyde "Ürün çekimi" başlığıyla aynı hizada
    rail.style.height = Math.max(120, z.bottom - (hh.top + hh.height / 2) + 34) + 'px';
  };

  // ---- Sepet paneli ----
  const back = el('div', 'cart-back'); back.hidden = true;
  const panel = el('aside', 'cart-panel'); panel.hidden = true;
  panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', 'Hizmet sepeti');
  const head = el('div', 'cart-head');
  const title = el('h2', 'cart-title', 'Sepetiniz');
  const close = el('button', 'cart-close', '×'); close.type = 'button'; close.setAttribute('aria-label', 'Sepeti kapat');
  head.append(title, close);
  const list = el('div', 'cart-list');
  const EMPTY_TXT = 'Sepetiniz boş. Hizmet kartlarındaki "Sepete ekle" düğmesiyle istediğiniz hizmetleri buraya ekleyin.';
  const empty = el('p', 'cart-empty', EMPTY_TXT);
  const form = el('form', 'cart-form'); form.noValidate = true;
  form.innerHTML = '<p class="cart-lead">Sepetinizdeki hizmetler için size fiyat hazırlayıp dönelim.</p>'
    + '<label><span>Adınız soyadınız</span><input name="name" autocomplete="name" required maxlength="120"></label>'
    + '<label><span>E-posta</span><input name="email" type="email" autocomplete="email" required maxlength="160"></label>'
    + '<label><span>Telefon (isteğe bağlı)</span><input name="phone" type="tel" autocomplete="tel" maxlength="40"></label>'
    + '<label><span>Eklemek istediğiniz not (isteğe bağlı)</span><textarea name="note" maxlength="1200" rows="3"></textarea></label>'
    + '<input class="cart-hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">'
    + '<label class="cart-consent"><input type="checkbox" name="consent"><span>' + (KVKK ? '<a href="' + KVKK + '" target="_blank" rel="noopener">KVKK Aydınlatma Metni</a>' : 'KVKK Aydınlatma Metni') + '’ni okudum; bilgilerimin fiyat hazırlamak ve benimle iletişime geçmek amacıyla işlenmesini kabul ediyorum.</span></label>'
    + '<button class="cart-send" type="submit">Fiyat al ↗</button>'
    + '<p class="cart-status" role="status" aria-live="polite"></p>';
  panel.append(head, list, empty, form);
  document.body.append(back, panel);

  const open = () => { place(); back.hidden = false; panel.hidden = false; document.documentElement.classList.add('cart-open'); close.focus(); };
  const shut = () => { back.hidden = true; panel.hidden = true; document.documentElement.classList.remove('cart-open'); fab.focus(); };
  fab.addEventListener('click', open);
  close.addEventListener('click', shut);
  back.addEventListener('click', shut);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) shut(); });

  function sync() {
    cards.forEach(({ b, g, t }) => {
      const on = has(g, t);
      b.setAttribute('aria-pressed', String(on));
      b.textContent = on ? 'Sepette ✓' : 'Sepete ekle +';
      b.setAttribute('aria-label', (on ? 'Sepetten çıkar: ' : 'Sepete ekle: ') + t);
    });
    badge.textContent = String(items.length);
    badge.hidden = items.length === 0;
    fab.classList.toggle('has-items', items.length > 0);
    list.textContent = '';
    const groups = [];
    items.forEach((x) => { let g = groups.find((y) => y.g === x.g); if (!g) groups.push(g = { g: x.g, ts: [] }); g.ts.push(x.t); });
    groups.forEach((gr) => {
      const box = el('section', 'cart-group');
      box.append(el('h3', 'cart-gname', gr.g));
      gr.ts.forEach((t) => {
        const row = el('div', 'cart-row');
        row.append(el('span', 'cart-item', t));
        const rm = el('button', 'cart-rm', 'Çıkar'); rm.type = 'button'; rm.setAttribute('aria-label', t + ' hizmetini sepetten çıkar');
        rm.addEventListener('click', () => { items = items.filter((x) => !(x.g === gr.g && x.t === t)); save(); sync(); });
        row.append(rm);
        box.append(row);
      });
      list.append(box);
    });
    if (items.length) empty.textContent = EMPTY_TXT;
    empty.hidden = items.length > 0;
    list.hidden = items.length === 0;
    form.hidden = items.length === 0;
  }

  // ---- Fiyat al: sepet içeriği e-posta olarak bize gider ----
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = (n) => form.querySelector('[name="' + n + '"]');
    const status = form.querySelector('.cart-status'), btn = form.querySelector('.cart-send');
    status.className = 'cart-status';
    const name = f('name').value.trim(), email = f('email').value.trim();
    if (name.length < 2) { status.textContent = 'Lütfen adınızı yazın.'; status.classList.add('err'); f('name').focus(); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { status.textContent = 'Lütfen geçerli bir e-posta adresi yazın.'; status.classList.add('err'); f('email').focus(); return; }
    if (!f('consent').checked) { status.textContent = 'Devam etmek için KVKK metnini onaylayın.'; status.classList.add('err'); return; }
    const groups = [];
    items.forEach((x) => { let g = groups.find((y) => y.g === x.g); if (!g) groups.push(g = { g: x.g, ts: [] }); g.ts.push(x.t); });
    const note = f('note').value.trim();
    const message = ['FİYAT TALEBİ (hizmet sepeti)', '', 'Sepetteki hizmetler (' + items.length + '):', '']
      .concat(...groups.map((gr) => [gr.g].concat(gr.ts.map((t) => '• ' + t), [''])))
      .concat(note ? ['Not: ' + note, ''] : [], ['Ticari elektronik ileti onayı: istenmedi (sepet formunda sorulmaz)']).join(NL).slice(0, 3900);
    btn.disabled = true; status.textContent = 'Gönderiliyor…';
    try {
      const res = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, phone: f('phone').value.trim(), message, website: f('website').value }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'Gönderilemedi, lütfen tekrar deneyin.');
      items = []; save(); sync();
      list.hidden = true; form.hidden = true; empty.hidden = false;
      empty.textContent = 'Teşekkürler! Fiyat talebiniz bize ulaştı, en kısa sürede dönüş yapacağız.';
      form.reset();
    } catch (err) { status.textContent = err.message; status.classList.add('err'); }
    btn.disabled = false;
  });

  sync();
  place();
  window.addEventListener('resize', place);
  window.addEventListener('load', place);
  setTimeout(place, 800);
  new ResizeObserver(place).observe(main);
})();
