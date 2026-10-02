// Hizmet sepeti: Hizmetler sayfasında "Sepete ekle" + sağ kenarda sepet düğmesi; "Sepete git" /sepet sayfasına götürür.
// /sepet sayfasında: seçilen hizmetler, istekler (form) ve benzer işler. Fiyat talebi e-posta olarak bize gelir.
(() => {
  const NL = String.fromCharCode(10);
  const KEY = 'goatz-hizmet-sepeti';
  const load = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v.filter((x) => x && typeof x.g === 'string' && typeof x.t === 'string') : []; } catch (e) { return []; } };
  let items = load();
  const listeners = [];
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) { /* sepet yalnızca bu sayfada kalır */ } };
  const change = () => { save(); listeners.forEach((f) => f()); };
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; };
  const clean = (n) => n.textContent.replace(/\s+/g, ' ').trim();
  const has = (g, t) => items.some((x) => x.g === g && x.t === t);
  const toggle = (g, t) => { if (has(g, t)) items = items.filter((x) => !(x.g === g && x.t === t)); else items.push({ g, t }); change(); };
  const remove = (g, t) => { items = items.filter((x) => !(x.g === g && x.t === t)); change(); };
  const grouped = () => { const gs = []; items.forEach((x) => { let g = gs.find((y) => y.g === x.g); if (!g) gs.push(g = { g: x.g, ts: [] }); g.ts.push(x.t); }); return gs; };
  const CART_URL = '/sepet';

  // =========================================================== Hizmetler sayfası
  const mark = document.querySelector('[data-svc-cart]');
  if (mark) {
    const cards = [...document.querySelectorAll('.blk-cards .k-card')].map((card) => {
      const sec = card.closest('.blk-cards');
      const h2 = sec && sec.querySelector('h2');
      const h3 = card.querySelector('h3');
      if (!h3) return null;
      const g = h2 ? clean(h2) : 'Hizmet', t = clean(h3);
      const b = el('button', 'cart-add');
      b.type = 'button';
      card.append(b);
      b.addEventListener('click', () => toggle(g, t));
      return { b, g, t };
    }).filter(Boolean);

    // Sağ kenarda sepet düğmesi: yatayda kartların sağ kenarıyla aynı çizgide, dikeyde "Ürün çekimi" başlığıyla aynı hizada, sayfa boyunca yapışkan
    const main = document.getElementById('top') || document.body;
    const rail = el('div', 'cart-rail');
    const fab = el('button', 'cart-fab');
    fab.type = 'button'; fab.setAttribute('aria-haspopup', 'dialog'); fab.setAttribute('aria-label', 'Hizmet sepeti');
    fab.innerHTML = '<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><path d="M6 10h8l7 30h28l6-22H17" fill="#fff" stroke="#000" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/><circle cx="25" cy="52" r="5" fill="#ffd731" stroke="#000" stroke-width="4"/><circle cx="46" cy="52" r="5" fill="#ffd731" stroke="#000" stroke-width="4"/></svg>';
    const badge = el('b', 'cart-count', '0');
    fab.append(badge, el('span', 'cart-tip', 'Sepet'));
    rail.append(fab);
    main.append(rail);
    const place = () => {
      if (matchMedia('(max-width: 900px)').matches) { rail.style.top = rail.style.left = rail.style.height = rail.style.right = ''; return; }
      const blocks = [...document.querySelectorAll('.blk-cards')];
      const grid = blocks[0] && blocks[0].querySelector('.k-grid');
      if (!grid || !blocks.length) return;
      const h2 = blocks[0].querySelector('h2');
      const m = main.getBoundingClientRect(), g = grid.getBoundingClientRect(), z = blocks[blocks.length - 1].getBoundingClientRect(), hh = (h2 || grid).getBoundingClientRect();
      rail.style.right = 'auto';
      rail.style.left = Math.max(0, g.right - m.left - fab.offsetWidth) + 'px';
      rail.style.top = Math.max(0, hh.top + hh.height / 2 - m.top - 34) + 'px';
      rail.style.height = Math.max(120, z.bottom - (hh.top + hh.height / 2) + 34) + 'px';
    };

    // Sepet paneli: yalnızca liste ve "Sepete git"
    const back = el('div', 'cart-back'); back.hidden = true;
    const panel = el('aside', 'cart-panel'); panel.hidden = true;
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-label', 'Hizmet sepeti');
    const head = el('div', 'cart-head');
    const close = el('button', 'cart-close', '×'); close.type = 'button'; close.setAttribute('aria-label', 'Sepeti kapat');
    head.append(el('h2', 'cart-title', 'Sepetiniz'), close);
    const list = el('div', 'cart-list');
    const empty = el('p', 'cart-empty', 'Sepetiniz boş. Hizmet kartlarındaki "Sepete ekle" düğmesiyle istediğiniz hizmetleri buraya ekleyin.');
    const go = el('a', 'cart-go', 'Sepete git →'); go.href = CART_URL;
    panel.append(head, list, empty, go);
    document.body.append(back, panel);
    const open = () => { place(); back.hidden = false; panel.hidden = false; document.documentElement.classList.add('cart-open'); close.focus(); };
    const shut = () => { back.hidden = true; panel.hidden = true; document.documentElement.classList.remove('cart-open'); fab.focus(); };
    fab.addEventListener('click', open);
    close.addEventListener('click', shut);
    back.addEventListener('click', shut);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) shut(); });

    const sync = () => {
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
      grouped().forEach((gr) => {
        const box = el('section', 'cart-group');
        box.append(el('h3', 'cart-gname', gr.g));
        gr.ts.forEach((t) => {
          const row = el('div', 'cart-row');
          row.append(el('span', 'cart-item', t));
          const rm = el('button', 'cart-rm', 'Çıkar'); rm.type = 'button'; rm.setAttribute('aria-label', t + ' hizmetini sepetten çıkar');
          rm.addEventListener('click', () => remove(gr.g, t));
          row.append(rm);
          box.append(row);
        });
        list.append(box);
      });
      empty.hidden = items.length > 0;
      list.hidden = items.length === 0;
      go.hidden = items.length === 0;
    };
    listeners.push(sync);
    sync();
    place();
    window.addEventListener('resize', place);
    window.addEventListener('load', place);
    setTimeout(place, 800);
    if (window.ResizeObserver) new ResizeObserver(place).observe(main);
  }

  // =========================================================== /sepet sayfası
  const host = document.querySelector('[data-cart-page]');
  if (host) {
    let works = {};
    try { works = JSON.parse((document.getElementById('cart-works') || {}).textContent || '{}'); } catch (e) { works = {}; }
    const KVKK = host.dataset.kvkk || '';
    const norm = (t) => String(t || '').toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ').trim();
    const descOf = (g, t) => ((works._svc || {})[norm(g) + '|' + norm(t)]) || '';
    const catOf = (g) => (/uygulama/i.test(g) ? 'app' : /danışmanlık/i.test(g) ? 'consulting' : /ürün çekimi/i.test(g) ? 'photo' : 'web');
    let done = false;

    const render = () => {
      host.textContent = '';
      // --- Özet bandı
      const gs = grouped();
      const sum = el('div', 'cp-sum');
      sum.append(el('small', '', 'HİZMET SEPETİNİZ'), el('strong', '', items.length ? items.length + ' hizmet seçtiniz' : 'Sepetiniz boş'));
      host.append(sum);

      if (done) {
        const ok = el('div', 'cp-done');
        ok.append(el('h2', '', 'Teşekkürler!'), el('p', '', 'Fiyat talebiniz bize ulaştı. En kısa sürede size dönüş yapacağız.'));
        const a = el('a', 'btn solid', 'Hizmetlere dön'); a.href = '/hizmetler';
        ok.append(a);
        host.append(ok);
        return;
      }
      if (!items.length) {
        const e = el('div', 'cp-empty');
        e.append(el('p', '', 'Henüz sepetinize hizmet eklemediniz. Hizmetler sayfasında istediğiniz hizmetleri "Sepete ekle" ile buraya toplayın.'));
        const a = el('a', 'btn solid', 'Hizmetlere git ↗'); a.href = '/hizmetler';
        e.append(a);
        host.append(e);
      } else {
        const grid = el('div', 'cp-grid');
        // --- Seçilen hizmetler
        const main = el('div', 'cp-main');
        main.append(el('h2', 'cp-h', 'Seçtiğiniz hizmetler'));
        gs.forEach((gr, n) => {
          const box = el('section', 'cp-group');
          box.dataset.i = String(n % 4);
          box.append(el('h3', 'cp-gname', gr.g));
          gr.ts.forEach((t) => {
            const row = el('div', 'cp-row');
            const info = el('div', 'cp-info');
            info.append(el('span', 'cp-item', '✓ ' + t));
            const dd = descOf(gr.g, t);
            if (dd) info.append(el('p', 'cp-desc', dd));
            row.append(info);
            const rm = el('button', 'cp-rm', 'Çıkar'); rm.type = 'button'; rm.setAttribute('aria-label', t + ' hizmetini sepetten çıkar');
            rm.addEventListener('click', () => remove(gr.g, t));
            row.append(rm);
            box.append(row);
          });
          main.append(box);
        });
        const more = el('a', 'cp-more', '+ Başka hizmet ekle'); more.href = '/hizmetler';
        main.append(more);
        grid.append(main);

        // --- İstekler (form)
        const side = el('aside', 'cp-side');
        side.append(el('h2', 'cp-h', 'İstekleriniz'));
        const form = el('form', 'cp-form'); form.noValidate = true;
        form.innerHTML = '<p class="cp-lead">Sepetinizdeki hizmetler için size fiyat hazırlayıp dönelim.</p>'
          + '<label><span>Adınız soyadınız</span><input name="name" autocomplete="name" required maxlength="120"></label>'
          + '<label><span>E-posta</span><input name="email" type="email" autocomplete="email" required maxlength="160"></label>'
          + '<label><span>Telefon (isteğe bağlı)</span><input name="phone" type="tel" autocomplete="tel" maxlength="40"></label>'
          + '<label><span>İsteklerinizi ve notunuzu yazın (isteğe bağlı)</span><textarea name="note" maxlength="1200" rows="5"></textarea></label>'
          + '<input class="cart-hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">'
          + '<label class="cp-consent"><input type="checkbox" name="consent"><span>' + (KVKK ? '<a href="' + KVKK + '" target="_blank" rel="noopener">KVKK Aydınlatma Metni</a>' : 'KVKK Aydınlatma Metni') + '’ni okudum; bilgilerimin fiyat hazırlamak ve benimle iletişime geçmek amacıyla işlenmesini kabul ediyorum.</span></label>'
          + '<button class="cp-send" type="submit">Fiyat al ↗</button>'
          + '<p class="cp-status" role="status" aria-live="polite"></p>';
        side.append(form);
        grid.append(side);
        host.append(grid);

        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const f = (n) => form.querySelector('[name="' + n + '"]');
          const status = form.querySelector('.cp-status'), btn = form.querySelector('.cp-send');
          status.className = 'cp-status';
          const name = f('name').value.trim(), email = f('email').value.trim();
          if (name.length < 2) { status.textContent = 'Lütfen adınızı yazın.'; status.classList.add('err'); f('name').focus(); return; }
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { status.textContent = 'Lütfen geçerli bir e-posta adresi yazın.'; status.classList.add('err'); f('email').focus(); return; }
          if (!f('consent').checked) { status.textContent = 'Devam etmek için KVKK metnini onaylayın.'; status.classList.add('err'); return; }
          const note = f('note').value.trim();
          const message = ['FİYAT TALEBİ (hizmet sepeti)', '', 'Sepetteki hizmetler (' + items.length + '):', '']
            .concat(...grouped().map((gr) => [gr.g].concat(gr.ts.map((t) => '• ' + t), [''])))
            .concat(note ? ['İstekler / not: ' + note, ''] : [], ['Ticari elektronik ileti onayı: istenmedi (sepet formunda sorulmaz)']).join(NL).slice(0, 3900);
          btn.disabled = true; status.textContent = 'Gönderiliyor…';
          try {
            const res = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, phone: f('phone').value.trim(), message, website: f('website').value }) });
            const j = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(j.error || 'Gönderilemedi, lütfen tekrar deneyin.');
            items = []; save(); done = true; render();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          } catch (err) { status.textContent = err.message; status.classList.add('err'); btn.disabled = false; }
        });
      }

      // --- Benzer işler: sepetteki hizmetlere uygun işler
      const cats = [...new Set(gs.map((x) => catOf(x.g)))];
      const pick = (cats.length ? cats : ['web', 'app']).flatMap((k) => (works[k] || []).slice(0, cats.length > 2 ? 2 : 3));
      const rel = pick.slice(0, 6);
      if (rel.length) {
        const sec = el('section', 'cp-related');
        sec.append(el('h2', 'cp-h', 'Benzer işler'));
        const row = el('div', 'cp-works');
        rel.forEach((w, n) => {
          const a = el('a', 'cp-work'); a.href = w.u; a.dataset.i = String(n % 4);
          if (w.i) { const img = el('img'); img.src = w.i; img.alt = w.t + ' · ' + w.l; img.loading = 'lazy'; a.append(img); }
          a.append(el('span', 'cp-work-l', w.l), el('b', 'cp-work-t', w.t));
          row.append(a);
        });
        sec.append(row);
        host.append(sec);
      }
    };
    listeners.push(render);
    render();
  }
})();
