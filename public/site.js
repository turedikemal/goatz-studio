(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches || document.body.classList.contains('no-anim');
  const on = (name) => !reduce && root.classList.contains('mo-' + name);
  const cssNum = (name, d) => parseFloat(getComputedStyle(root).getPropertyValue(name)) || d;
  const K = cssNum('--mi', 1); // hareket şiddeti
  const SP = cssNum('--ms', 1); // hız çarpanı
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const vh = () => window.innerHeight;
  const desktop = () => window.innerWidth >= 992;

  // Referans sitedeki iki özel hız eğrisi.
  const EASE = 'cubic-bezier(.65, .05, 0, 1)';
  const BOUNCE = 'linear(0, 0.5737 7.6%, 0.8382 11.87%, 0.9463 14.19%, 1.0292 16.54%, 1.0886 18.97%, 1.1258 21.53%, 1.137 22.97%, 1.1424 24.48%, 1.1423 26.1%, 1.1366 27.86%, 1.1165 31.01%, 1.0507 38.62%, 1.0219 42.57%, 0.9995 46.99%, 0.9872 51.63%, 0.9842 58.77%, 1.0011 81.26%, 1)';
  const ms = (sec) => (sec * 1000) / SP; // saniye -> ms (hız ayarına göre)

  // ---------- Menü ----------
  const nav = document.getElementById('nav');
  const onScrollNav = () => nav.classList.toggle('scrolled', window.scrollY > 40);
  window.addEventListener('scroll', onScrollNav, { passive: true });
  onScrollNav();

  const menuBtn = document.getElementById('menuBtn');
  const menu = document.getElementById('menu');
  const closeMenu = () => { menu.classList.remove('open'); menuBtn.setAttribute('aria-expanded', false); menuBtn.textContent = '+'; };
  menuBtn.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', open);
    menuBtn.textContent = open ? '×' : '+';
  });
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) closeMenu(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

  // ---------- Kart kaydırıcısı ----------
  const carousel = document.getElementById('carousel');
  const dots = document.getElementById('dots');
  let goTo = () => {};
  if (carousel && dots) {
    const cards = [...carousel.children];
    const bullets = cards.map((c, i) => {
      const b = document.createElement('i');
      b.setAttribute('role', 'button');
      b.setAttribute('aria-label', `${i + 1}. kart`);
      dots.appendChild(b);
      return b;
    });
    dots.removeAttribute('aria-hidden');
    let current = 0;
    const centerOf = (c) => c.offsetLeft - (carousel.clientWidth - c.offsetWidth) / 2;
    const mark = () => {
      const mid = carousel.scrollLeft + carousel.clientWidth / 2;
      let best = 0, dist = Infinity;
      cards.forEach((c, i) => { const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid); if (d < dist) { dist = d; best = i; } });
      current = best;
      bullets.forEach((b, i) => b.classList.toggle('on', i === best));
      cards.forEach((c, i) => c.classList.toggle('active', i === best));
    };
    carousel.addEventListener('scroll', mark, { passive: true });
    mark();

    // Kaydırma animasyonu: referans sitedeki gibi zıplamalı eğriyle.
    let anim = 0;
    const bounceAt = (t) => { // BOUNCE eğrisinin JS karşılığı (aynı noktalar)
      const pts = [[0, 0], [.076, .5737], [.1187, .8382], [.1419, .9463], [.1654, 1.0292], [.1897, 1.0886], [.2153, 1.1258], [.2297, 1.137], [.2448, 1.1424], [.261, 1.1423], [.2786, 1.1366], [.3101, 1.1165], [.3862, 1.0507], [.4257, 1.0219], [.4699, .9995], [.5163, .9872], [.5877, .9842], [.8126, 1.0011], [1, 1]];
      for (let i = 1; i < pts.length; i++) if (t <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return y0 + (y1 - y0) * ((t - x0) / (x1 - x0)); }
      return 1;
    };
    goTo = (i, instant) => {
      i = (i + cards.length) % cards.length;
      const from = carousel.scrollLeft, to = clamp(centerOf(cards[i]), 0, carousel.scrollWidth - carousel.clientWidth);
      cancelAnimationFrame(anim);
      if (instant || !on('slider')) { carousel.scrollLeft = to; return; }
      const dur = ms(.725), t0 = performance.now();
      carousel.classList.add('animating');
      const step = (now) => {
        const p = clamp((now - t0) / dur);
        carousel.scrollLeft = from + (to - from) * bounceAt(p);
        if (p < 1) anim = requestAnimationFrame(step); else carousel.classList.remove('animating');
      };
      anim = requestAnimationFrame(step);
    };
    bullets.forEach((b, i) => b.addEventListener('click', () => goTo(i)));

    // Fareyle sürükleme
    let down = null;
    carousel.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      down = { x: e.clientX, left: carousel.scrollLeft, moved: false };
    });
    window.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - down.x;
      if (Math.abs(dx) > 4) { down.moved = true; carousel.classList.add('dragging'); }
      if (down.moved) carousel.scrollLeft = down.left - dx;
    });
    window.addEventListener('pointerup', () => {
      if (!down) return;
      const moved = down.moved;
      down = null;
      carousel.classList.remove('dragging');
      if (moved) goTo(current);
    });

    // Otomatik oynatma (4 sn), üzerine gelince durur, ekranda değilken çalışmaz
    const every = parseFloat(carousel.dataset.autoplay) || 0;
    if (every && on('slider')) {
      let timer = null, visible = false, hover = false;
      const stop = () => { clearTimeout(timer); timer = null; };
      const arm = () => { stop(); if (visible && !hover) timer = setTimeout(() => { goTo(current + 1); arm(); }, ms(every)); };
      new IntersectionObserver((es) => { visible = es[0].isIntersecting; arm(); }).observe(carousel);
      carousel.addEventListener('mouseenter', () => { hover = true; stop(); });
      carousel.addEventListener('mouseleave', () => { hover = false; arm(); });
    }
  }

  // ---------- Sekmeler ----------
  const tablist = document.querySelector('.tablist');
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const panels = [...document.querySelectorAll('.tabpanel')];
  let curTab = 0;
  const bg = tablist && tablist.querySelector('.tab-bg');
  const movePill = (tab, instant) => {
    if (!bg || !tab) return;
    if (instant) bg.style.transition = 'none';
    bg.style.setProperty('--x', `${tab.offsetLeft}px`);
    bg.style.setProperty('--w', `${tab.offsetWidth}px`);
    tabs.forEach((t) => t.classList.toggle('under', t === tab));
    if (instant) { bg.offsetWidth; bg.style.transition = ''; }
  };

  // Başlıkları harflere böl (sekme geçişinde kullanılır)
  const splitChars = (el) => {
    const chars = [];
    const walk = (node) => [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.append(document.createTextNode(' ')); return; }
          const w = document.createElement('span');
          w.className = 'w';
          w.setAttribute('aria-hidden', 'true');
          for (const ch of part) { const c = document.createElement('span'); c.className = 'ch'; c.textContent = ch; w.append(c); chars.push(c); }
          frag.append(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && !n.matches('svg, br, a')) walk(n);
    });
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    walk(el);
    return chars;
  };

  // Harflere bölünen yazılarda tarayıcı harf çifti sıkıştırmasını (kerning) uygulayamaz ("TA", "AV" gibi çiftler açılır).
  // Her çift için gerçek genişlik farkını ölçüp ikinci harfe em cinsinden negatif/pozitif boşluk olarak geri ekleriz.
  const kernWord = (wordEl, items) => {
    if (items.length < 2) return;
    const m = document.createElement('span');
    m.style.cssText = 'position:absolute;visibility:hidden;white-space:pre;left:0;top:0';
    wordEl.append(m);
    const w = (t) => { m.textContent = t; return m.getBoundingClientRect().width; };
    const fs = parseFloat(getComputedStyle(wordEl).fontSize) || 16;
    const cache = new Map();
    for (let i = 1; i < items.length; i++) {
      const key = items[i - 1].ch + items[i].ch;
      if (!cache.has(key)) cache.set(key, w(items[i - 1].ch + items[i].ch) - w(items[i - 1].ch) - w(items[i].ch));
      const k = cache.get(key);
      if (Math.abs(k) > 0.02) items[i].node.style.marginLeft = `${(k / fs).toFixed(4)}em`;
    }
    m.remove();
  };
  const kernSplit = (el) => el.querySelectorAll('.w').forEach((wd) => kernWord(wd, [...wd.querySelectorAll('.ch')].map((n) => ({ node: n, ch: n.textContent }))));

  // Sekme değişimi: yeni içerik, eski içeriğin ÜSTÜNDEN yumuşakça belirir; eski içerik altta durur ve
  // yeni içerik tamamen görününce kaldırılır. Böylece iki içerik arasında hiç boşluk (yanıp sönme) olmaz.
  // Hiçbir kayma yoktur; siyah arka plan sekmeler arasında kayar.
  let cleanTimer = 0;
  let userPicked = false;
  const settle = () => {
    clearTimeout(cleanTimer);
    panels.forEach((p, k) => {
      p.getAnimations().forEach((a) => a.cancel());
      if (k !== curTab) { p.classList.remove('active', 'leaving'); p.inert = true; }
    });
  };
  // Sekme içeriği: başlık bulanıktan netleşerek gelir, adımlar sırayla kayarak girer, numaralar dönerek belirir
  const revealPanel = (panel, base) => {
    const col = panel.querySelector(':scope > div:not(.feature-media)');
    if (!col) return;
    const ease = 'cubic-bezier(.2,.8,.2,1)';
    const h = col.querySelector('h3');
    if (h) h.animate([{ opacity: 0, translate: '0 30px', filter: 'blur(10px)' }, { opacity: 1, translate: '0 0', filter: 'blur(0)' }], { duration: ms(0.75), delay: base, easing: ease, fill: 'backwards' });
    const items = [...col.querySelectorAll('.steps li')];
    items.forEach((li, n) => {
      const d = base + ms(0.22 + n * 0.1);
      li.animate([{ opacity: 0, translate: '-24px 0', filter: 'blur(6px)' }, { opacity: 1, translate: '0 0', filter: 'blur(0)' }], { duration: ms(0.6), delay: d, easing: ease, fill: 'backwards' });
      li.animate([{ scale: 0.3, rotate: '-120deg' }, { scale: 1.12, rotate: '8deg', offset: 0.65 }, { scale: 1, rotate: '0deg' }], { duration: ms(0.6), delay: d + ms(0.08), easing: 'ease-out', fill: 'backwards', pseudoElement: '::before' });
    });
    const btn = col.querySelector('.btn');
    if (btn) btn.animate([{ opacity: 0, translate: '0 18px', scale: 0.9 }, { opacity: 1, translate: '0 0', scale: 1 }], { duration: ms(0.6), delay: base + ms(0.3 + items.length * 0.1), easing: BOUNCE, fill: 'backwards' });
  };
  const showTab = (i, first) => {
    if (i === curTab && !first) return;
    tabs.forEach((t, k) => { t.setAttribute('aria-selected', k === i); t.tabIndex = k === i ? 0 : -1; });
    movePill(tabs[i], first);
    settle(); // önceki geçiş sürüyorsa hemen bitir
    const prev = panels[curTab], next = panels[i];
    curTab = i;
    next.classList.remove('leaving');
    next.classList.add('active');
    next.inert = false;
    if (first || !on('tabs')) { if (prev !== next) { prev.classList.remove('active', 'leaving'); prev.inert = true; } return; }
    prev.classList.remove('active');
    prev.classList.add('leaving');
    prev.inert = true;
    // Yazılar üst üste binmesin: eski içerik önce kaybolur, sonra yenisi belirir
    prev.animate([{ opacity: 1, translate: '0 0' }, { opacity: 0, translate: '0 -12px' }], { duration: ms(0.16), easing: 'ease-in', fill: 'forwards' });
    next.animate([{ opacity: 0, translate: '0 18px', scale: 0.985 }, { opacity: 1, translate: '0 0', scale: 1 }], { duration: ms(0.5), delay: ms(0.14), easing: BOUNCE, fill: 'backwards' });
    revealPanel(next, ms(0.18));
    cleanTimer = setTimeout(() => { prev.classList.remove('leaving'); }, ms(0.16) + 40);
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => { userPicked = true; showTab(i); });
    // Üzerine gelince tıklamaya gerek kalmadan açılır (dokunmatik ekranda tıklama yine çalışır)
    t.addEventListener('mouseenter', () => { userPicked = true; showTab(i); });
    t.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
      showTab(tabs.indexOf(next)); next.focus();
    });
  });
  if (tablist) {
    const place = () => movePill(tabs[curTab], true);
    place();
    window.addEventListener('resize', place);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
    // Bölüm ekranın ortasına gelince ikinci sekme kendiliğinden açılır (referanstaki gibi)
    if (on('tabs') && tabs.length > 1) {
      const io = new IntersectionObserver((es, o) => {
        if (!es[0].isIntersecting) return;
        o.disconnect();
        setTimeout(() => { if (!userPicked) showTab(1); }, 250);
      }, { rootMargin: '0px 0px -25% 0px' });
      io.observe(tablist);
    }
  }

  // ---------- Galeri: tıklayınca büyür, ok tuşlarıyla gezilir ----------
  const galleryItems = [...document.querySelectorAll('.g-item')];
  if (galleryItems.length) {
    let box = null, idx = 0, group = [], lastFocus = null;
    const show = (i) => {
      idx = (i + group.length) % group.length;
      const g = group[idx];
      const img = box.querySelector('img');
      img.src = g.dataset.full;
      img.alt = g.dataset.caption || '';
      box.querySelector('figcaption').textContent = g.dataset.caption || '';
    };
    const onKey = (e) => {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') show(idx + 1);
      else if (e.key === 'ArrowLeft') show(idx - 1);
    };
    function close() {
      if (!box) return;
      const b = box;
      box = null;
      b.classList.remove('open');
      setTimeout(() => b.remove(), 250);
      document.removeEventListener('keydown', onKey);
      if (lastFocus) lastFocus.focus();
    }
    galleryItems.forEach((it) => it.addEventListener('click', () => {
      lastFocus = it;
      group = [...it.closest('.g-grid').querySelectorAll('.g-item')];
      box = document.createElement('div');
      box.className = 'lightbox';
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-modal', 'true');
      box.setAttribute('aria-label', 'Görsel');
      box.innerHTML = '<figure><img alt=""><figcaption></figcaption></figure><button type="button" class="lb-close" aria-label="Kapat">×</button><button type="button" class="lb-prev" aria-label="Önceki">‹</button><button type="button" class="lb-next" aria-label="Sonraki">›</button>';
      document.body.append(box);
      show(group.indexOf(it));
      requestAnimationFrame(() => box.classList.add('open'));
      box.addEventListener('click', (e) => {
        if (e.target.closest('.lb-prev')) show(idx - 1);
        else if (e.target.closest('.lb-next')) show(idx + 1);
        else if (!e.target.closest('img')) close();
      });
      document.addEventListener('keydown', onKey);
      box.querySelector('.lb-close').focus();
    }));
  }

  // ---------- İşler: canlı site önizlemeleri (görününce yüklenir) ----------
  const liveBoxes = [...document.querySelectorAll('.work-live')];
  if (liveBoxes.length) {
    const fit = (box) => { const f = box.querySelector('iframe'); if (f && box.clientWidth) f.style.setProperty('--k', (box.clientWidth / 1440).toFixed(4)); };
    const ro = new ResizeObserver((es) => es.forEach((e) => fit(e.target)));
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      const f = e.target.querySelector('iframe');
      f.addEventListener('load', () => e.target.classList.add('is-loaded'), { once: true });
      f.src = e.target.dataset.src;
    }), { rootMargin: '300px' });
    const wide = matchMedia('(min-width: 700px)').matches;
    liveBoxes.forEach((b) => { ro.observe(b); fit(b); if (wide) io.observe(b); });
  }

  // ---------- İşler: detay sayfasındaki küçük gösterimler ----------
  document.querySelectorAll('[data-fun="map"]').forEach((box) => {
    const cities = (box.dataset.cities || '').split(',').filter(Boolean);
    const out = box.querySelector('[data-city]'), stage = box.querySelector('.fm-stage'), lv = [...box.querySelectorAll('.fm-levels li')];
    let i = 0;
    const show = (n) => {
      i = (n + cities.length) % cities.length;
      out.textContent = cities[i];
      lv.forEach((l, k) => l.classList.toggle('on', k === i % lv.length));
      stage.classList.remove('pop'); void stage.offsetWidth; stage.classList.add('pop');
    };
    show(0);
    box.addEventListener('click', () => show(i + 1));
    if (!reduce) setInterval(() => { if (!document.hidden) show(i + 1); }, 2800);
  });
  document.querySelectorAll('[data-fun="badges"]').forEach((box) => {
    const tile = box.querySelector('.fb-tile .fb-badge'), chips = [...box.querySelectorAll('.fb-chip')];
    let cur = 0;
    const pick = (n) => {
      cur = (n + chips.length) % chips.length;
      chips.forEach((c, k) => c.classList.toggle('on', k === cur));
      tile.className = `fb-badge ${chips[cur].dataset.b}`;
      tile.textContent = chips[cur].textContent;
      tile.animate([{ scale: 0.6, rotate: '-8deg' }, { scale: 1.12, rotate: '3deg', offset: 0.6 }, { scale: 1, rotate: '0deg' }], { duration: 420, easing: 'ease-out' });
    };
    chips.forEach((c, k) => c.addEventListener('click', () => pick(k)));
    if (!reduce) setInterval(() => { if (!document.hidden) pick(cur + 1); }, 2600);
  });
  document.querySelectorAll('[data-fun="delivery"]').forEach((box) => {
    const steps = [...box.querySelectorAll('.fd-steps li')];
    let cur = 0;
    const go = (n) => {
      cur = (n + steps.length) % steps.length;
      steps.forEach((li, k) => { li.classList.toggle('on', k === cur); li.classList.toggle('done', k < cur); });
      box.style.setProperty('--p', `${16 + (cur * 84) / (steps.length - 1) - (cur === steps.length - 1 ? 4 : 0)}%`);
    };
    go(0);
    steps.forEach((li, k) => li.addEventListener('click', () => go(k)));
    if (!reduce) setInterval(() => { if (!document.hidden) go(cur + 1); }, 2200);
  });

  // ---------- İşler: açıklama aşağı doğru açılır ----------
  document.addEventListener('click', (e) => {
    const t = e.target.closest && e.target.closest('.work-toggle');
    if (!t) return;
    const card = t.closest('.work-card');
    const open = !card.classList.contains('open');
    card.classList.toggle('open', open);
    t.setAttribute('aria-expanded', String(open));
  });

  // ---------- Ana sayfa işler vitrini: projeler sırayla değişir ----------
  document.querySelectorAll('[data-showcase]').forEach((box, bi) => {
    const slides = [...box.querySelectorAll('.show-slide')];
    if (slides.length < 2) return;
    const cap = box.querySelector('[data-cap]'), url = box.querySelector('[data-url]'), note = box.querySelector('.placeholder-note');
    let cur = 0, hover = false;
    const show = (n) => {
      cur = (n + slides.length) % slides.length;
      slides.forEach((sl, k) => sl.classList.toggle('on', k === cur));
      const d = slides[cur].dataset;
      if (d.wc) box.style.setProperty('--wc', d.wc);
      if (cap) { cap.textContent = d.name; cap.lang = d.lang || 'tr'; }
      if (url) url.textContent = d.host || '';
      if (note) note.textContent = `Web uygulaması${d.badge ? ` · ${d.badge}` : ''}`;
    };
    box.addEventListener('mouseenter', () => { hover = true; });
    box.addEventListener('mouseleave', () => { hover = false; });
    if (!reduce) setInterval(() => { if (!hover && !document.hidden) show(cur + 1); }, 3400 + bi * 700);
  });

  // ---------- Proje sayfasından geri dön: önceki sayfa işler listesiyse oraya dön ----------
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('[data-back]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
    try {
      const ref = document.referrer ? new URL(document.referrer) : null;
      if (ref && ref.origin === location.origin && /^\/isler\/?$/.test(ref.pathname) && history.length > 1) { e.preventDefault(); history.back(); }
    } catch { /* bağlantı normal açılır */ }
  });

  // ---------- Yukarı çık oku: biraz kaydırınca belirir ----------
  const toTop = document.querySelector('.to-top');
  if (toTop) {
    const check = () => toTop.classList.toggle('show', window.scrollY > 300);
    window.addEventListener('scroll', check, { passive: true });
    check();
  }

  // ---------- İletişim formu ----------
  document.querySelectorAll('[data-contact-form]').forEach((form) => {
    const status = form.querySelector('.cf-status'), btn = form.querySelector('button[type="submit"]');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      status.className = 'cf-status';
      status.textContent = '';
      const data = Object.fromEntries(new FormData(form));
      btn.disabled = true;
      try {
        const r = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || 'Gönderilemedi. Lütfen tekrar dene.');
        form.reset();
        status.classList.add('ok');
        status.textContent = 'Mesajın bize ulaştı. En kısa sürede dönüş yapacağız.';
      } catch (err) {
        status.classList.add('err');
        status.textContent = err.message;
      } finally { btn.disabled = false; }
    });
  });

  // ---------- İşler: kategori filtresi ----------
  const workFilters = document.querySelector('.work-filters');
  if (workFilters) {
    const groups = [...document.querySelectorAll('.work-group')];
    const apply = (key) => {
      workFilters.querySelectorAll('.work-filter').forEach((b) => b.classList.toggle('on', b.dataset.filter === key));
      groups.forEach((g) => { g.hidden = !(key === 'all' || g.dataset.cat === key); });
    };
    workFilters.addEventListener('click', (e) => {
      const b = e.target.closest('.work-filter');
      if (!b) return;
      apply(b.dataset.filter);
      history.replaceState(null, '', b.dataset.filter === 'all' ? location.pathname : `#${b.dataset.filter}`);
    });
    const want = decodeURIComponent(location.hash.slice(1));
    if (want && [...workFilters.querySelectorAll('.work-filter')].some((b) => b.dataset.filter === want)) apply(want);
  }

  // ---------- Footer'daki dev yazı: her zaman satırın tam genişliğine sığar ----------
  const bigFooter = document.querySelector('.sf-big');
  if (bigFooter) {
    const fit = () => {
      bigFooter.style.fontSize = '100px';
      bigFooter.style.width = 'max-content'; // yazının gerçek genişliğini ölçmek için
      const w = bigFooter.getBoundingClientRect().width;
      bigFooter.style.width = '';
      if (w > 0) bigFooter.style.fontSize = `${Math.min(340, (100 * bigFooter.clientWidth) / w * 0.95).toFixed(1)}px`;
    };
    let fitQueued = false;
    const refit = () => { if (fitQueued) return; fitQueued = true; requestAnimationFrame(() => { fitQueued = false; fit(); }); };
    fit();
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => { fit(); setTimeout(fit, 120); });
    window.addEventListener('resize', refit);
    window.addEventListener('load', fit);
  }

  window.__motionReady = true;
  if (reduce) return;

  // =====================================================================
  //  Hareketler
  // =====================================================================
  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const onceAt = (rootMargin, cb) => new IntersectionObserver((es, o) => es.forEach((e) => { if (e.isIntersecting) { o.unobserve(e.target); cb(e.target); } }), { rootMargin });
  const ROOT80 = '0px 0px -20% 0px'; // elemanın üstü ekranın %80'ine gelince

  // Metni harflere böler (yazı düğümleri; sticker, link ve satır sonları korunur)
  const split = (el) => splitChars(el);

  // Metni satırlara böler (her satır ayrı bir blok, animasyon bitince eski haline döner)
  const splitLines = (el) => {
    const orig = el.innerHTML;
    const words = el.textContent.replace(/\s+/g, ' ').trim().split(' ');
    el.textContent = '';
    const spans = words.map((w, i) => { const s = document.createElement('span'); s.textContent = w; el.append(s); if (i < words.length - 1) el.append(' '); return s; });
    const groups = [];
    let top = null;
    spans.forEach((s) => { if (top === null || Math.abs(s.offsetTop - top) > 4) { groups.push([]); top = s.offsetTop; } groups[groups.length - 1].push(s.textContent); });
    el.textContent = '';
    const lines = groups.map((g) => { const l = document.createElement('span'); l.className = 'ln'; l.textContent = g.join(' '); el.append(l); return l; });
    return { lines, revert: () => { el.innerHTML = orig; el.style.perspective = ''; } };
  };

  // 1) Açılış: dev başlık harf makarası, sonra alt yazı, butonlar, sticker'lar ve kurdele
  const introEl = on('intro') ? document.querySelector('[data-intro]') : null;
  const titleEl = document.querySelector('[data-intro]');
  const rnd = (i, salt) => { const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453; return x - Math.floor(x); };

  // Dev başlığı harflere böler (kerning korunur). Her harf kendi süzülüşünü alır.
  const splitTitle = () => {
    if (!titleEl || titleEl.classList.contains('ready')) return [];
    const text = titleEl.textContent;
    titleEl.setAttribute('aria-label', text.trim());
    titleEl.textContent = '';
    const letters = [];
    text.split(/(\s+)/).forEach((part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) { titleEl.append(' '); return; }
      const w = document.createElement('span');
      w.className = 'rw';
      w.setAttribute('aria-hidden', 'true');
      for (const ch of part) {
        const l = document.createElement('span');
        l.className = 'rl';
        const real = document.createElement('span');
        real.className = 'rc';
        real.textContent = ch;
        l.append(real);
        const i = letters.length;
        l.style.setProperty('--lx', ((rnd(i, 1) - 0.5) * 0.04 * K).toFixed(4));
        l.style.setProperty('--ly', ((0.012 + rnd(i, 2) * 0.022) * K).toFixed(4));
        l.style.setProperty('--lr', `${((rnd(i, 3) - 0.5) * 3.2 * K).toFixed(2)}deg`);
        l.style.setProperty('--ld', `${(8 + rnd(i, 4) * 7).toFixed(1)}s`);
        l.style.setProperty('--ldl', `-${(rnd(i, 5) * 12).toFixed(1)}s`);
        w.append(l);
        letters.push(l);
      }
      titleEl.append(w);
    });
    titleEl.querySelectorAll('.rw').forEach((wd) => kernWord(wd, [...wd.querySelectorAll('.rl')].map((n) => ({ node: n, ch: n.querySelector('.rc').textContent }))));
    titleEl.classList.add('ready');
    return letters;
  };

  // 1) Açılış: harfler boşluktan, bulanıklıktan sıyrılarak yavaşça belirir; sonra alt yazı, butonlar, sticker'lar ve kurdele
  if (introEl) {
    const run = () => {
      const letters = splitTitle();
      letters.forEach((l, i) => {
        const dx = ((rnd(i, 6) - 0.5) * 0.3).toFixed(3), dy = ((rnd(i, 7) - 0.5) * 0.3).toFixed(3);
        l.querySelector('.rc').animate([
          { opacity: 0, filter: 'blur(18px)', scale: 0.86, rotate: `${((rnd(i, 8) - 0.5) * 16).toFixed(1)}deg`, translate: `${dx}em ${dy}em` },
          { opacity: 1, filter: 'blur(0px)', scale: 1, rotate: '0deg', translate: '0em 0em' },
        ], { duration: ms(2.4), delay: ms(0.15 + rnd(i, 9) * 0.9), easing: 'cubic-bezier(.16, 1, .3, 1)', fill: 'both' });
      });

      const start = ms(0.6);
      const fin = (el) => { el.classList.add('shown'); };
      // Alt yazı: cümleler 1,5 sn sonra sırayla yukarıdan gelir
      const sub = document.querySelector('.hero [data-sub]');
      if (sub) {
        const segs = sub.textContent.trim().split(/(?<=[.!?])\s+/);
        sub.textContent = '';
        segs.forEach((t, k) => {
          const s = document.createElement('span');
          s.className = 'u-ib';
          s.textContent = t;
          sub.append(s);
          if (k < segs.length - 1) sub.append(' ');
          s.animate([{ translate: '0 2em', opacity: 0 }, { translate: '0 0', opacity: 1 }], { duration: ms(1), delay: ms(1.5 + k * 0.3), easing: BOUNCE, fill: 'both' });
        });
        fin(sub);
      }
      // Butonlar: aşağıdan, 0,1 sn arayla
      document.querySelectorAll('.hero .actions .btn').forEach((b, k) => {
        fin(b);
        b.animate([{ translate: '0 3em', opacity: 0 }, { translate: '0 0', opacity: 1 }], { duration: ms(1), delay: start + ms(k * 0.1), easing: BOUNCE, fill: 'both' });
      });
      // Kurdele yumuşakça belirir
      const rib = document.querySelector('.hero .ribbon');
      if (rib) { fin(rib); rib.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ms(0.9), delay: start, easing: EASE, fill: 'both' }); }
      // Sticker'lar: küçük ve dönmüş halden, rastgele sırayla
      shuffle([...document.querySelectorAll('.hero [data-pop]')]).forEach((el, k) => popIn(el, start + ms(k * 0.1), 1));
    };
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(run);
  } else if (titleEl && on('idle')) {
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(splitTitle);
  }

  // 2) Sticker girişi: küçük + -90° dönmüş halden zıplayarak yerine oturur
  function popIn(el, delay = 0, dur = 1) {
    const cs = getComputedStyle(el);
    const rot = cs.rotate === 'none' ? '0deg' : cs.rotate.split(' ').pop();
    el.style.setProperty('--r', rot);
    el.classList.add('popped');
    // Boşta oynama, giriş bitince başlar (yoksa iki animasyon çakışıp sticker sıçrar)
    el.animate([
      { scale: 0.2, opacity: 0, rotate: `calc(${rot} - 90deg)` },
      { scale: 1, opacity: 1, rotate: rot },
    ], { duration: ms(dur), delay, easing: BOUNCE, fill: 'backwards' }).onfinish = () => el.classList.add('idle-on');
  }
  const pops = [...document.querySelectorAll('[data-pop]')];
  // Her sticker kendi genlik, hız ve fazıyla süzülür (hepsi aynı anda aynı yöne gitmesin)
  pops.forEach((el, i) => {
    const r = getComputedStyle(el).rotate;
    el.style.setProperty('--r', r === 'none' ? '0deg' : r.split(' ').pop());
    const dir = i % 2 ? 1 : -1;
    el.style.setProperty('--fx', `${(dir * (8 + ((i * 7) % 9)) * K).toFixed(1)}px`);
    el.style.setProperty('--fy', `${((10 + ((i * 5) % 9)) * K).toFixed(1)}px`);
    el.style.setProperty('--fr', `${(3 + ((i * 3) % 5)) * dir}deg`);
    const heroK = el.closest('.hero') ? 1.6 : 1;
    el.style.setProperty('--fx', `${(dir * (8 + ((i * 7) % 9)) * K * heroK).toFixed(1)}px`);
    el.style.setProperty('--fy', `${((10 + ((i * 5) % 9)) * K * heroK).toFixed(1)}px`);
    el.style.setProperty('--dur', `${((8 + ((i * 17) % 50) / 10) * (el.closest('.hero') ? 1.5 : 1)).toFixed(1)}s`);
    if (!el.style.animationDelay) el.style.animationDelay = `-${((i * 1.7) % 9).toFixed(1)}s`;
  });
  if (on('pop')) {
    const io = onceAt('0px 0px 30% 0px', (el) => {
      const sibs = [...el.parentElement.querySelectorAll('[data-pop]')];
      popIn(el, ms(sibs.indexOf(el) * 0.1));
    });
    pops.forEach((el) => { if (!el.closest('.hero') || !introEl) io.observe(el); });
    // Girişi kapalıysa ama sticker girişi açıksa, giriş bölümündekiler de gözlenir (yukarıdaki koşul)
  } else {
    pops.forEach((el) => { el.classList.add('popped'); el.classList.add('idle-on'); });
  }
  // Fareyle derinlik: başlık ve sticker'lar farklı derinliklerde, yumuşakça ve ters yönde kayar (boşlukta asılı gibi)
  const heroEl = document.querySelector('.hero');
  if (heroEl && on('parallax') && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const layers = [];
    if (titleEl) layers.push({ el: titleEl, d: -7 * K });
    heroEl.querySelectorAll('.sticker').forEach((el, i) => layers.push({ el, d: (i % 2 ? 1 : -1) * (12 + ((i * 11) % 24)) * K }));
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    const tick = () => {
      cx += (tx - cx) * 0.06; cy += (ty - cy) * 0.06;
      layers.forEach((l) => { l.el.style.setProperty('--pmx', `${(cx * l.d).toFixed(2)}px`); l.el.style.setProperty('--pmy', `${(cy * l.d).toFixed(2)}px`); });
      raf = Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001 ? requestAnimationFrame(tick) : 0;
    };
    window.addEventListener('pointermove', (e) => {
      if (heroEl.getBoundingClientRect().bottom < 0) return;
      tx = (e.clientX / innerWidth - 0.5) * 2; ty = (e.clientY / innerHeight - 0.5) * 2;
      if (!raf) raf = requestAnimationFrame(tick);
    }, { passive: true });
  }
  // =====================================================================
  //  Sticker'lara tıklayınca: kamera flaş çakar, gülen yüz utanır, onay tik atar, yıldız parlar
  // =====================================================================
  const SVGNS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs = {}) => { const n = document.createElementNS(SVGNS, tag); Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v)); return n; };
  const fxLayer = (el) => { const old = el.querySelector(':scope > .fx'); if (old) old.remove(); const g = svgEl('g', { class: 'fx' }); el.append(g); return g; };
  const centerOf = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; };
  const restRot = (el) => getComputedStyle(el).getPropertyValue('--r') || getComputedStyle(el).rotate.split(' ').pop() || '0deg';
  const sparks = (x, y, { n = 10, size = 16, dist = 70, id = 'star' } = {}) => {
    for (let i = 0; i < n; i++) {
      const sp = document.createElement('span');
      sp.className = 'fx-spark';
      sp.innerHTML = `<svg viewBox="0 0 100 100" aria-hidden="true"><use href="#s-${id}"/></svg>`;
      const w = size * (0.55 + Math.random() * 0.9);
      sp.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${w}px;${id === 'star' ? `filter:hue-rotate(${Math.round(Math.random() * 40 - 10)}deg)` : ''}`;
      document.body.append(sp);
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.6, d = dist * (0.6 + Math.random() * 0.8);
      sp.animate([
        { translate: '-50% -50%', scale: 0.2, rotate: '0deg', opacity: 1 },
        { translate: `calc(-50% + ${Math.cos(a) * d}px) calc(-50% + ${Math.sin(a) * d}px)`, scale: 1, rotate: `${Math.random() * 180}deg`, opacity: 1, offset: 0.6 },
        { translate: `calc(-50% + ${Math.cos(a) * d * 1.15}px) calc(-50% + ${Math.sin(a) * d * 1.15 + 14}px)`, scale: 0.1, opacity: 0 },
      ], { duration: ms(0.9 + Math.random() * 0.4), easing: 'cubic-bezier(.2,.7,.3,1)' }).onfinish = () => sp.remove();
      setTimeout(() => sp.remove(), ms(1.3) + 500);
    }
  };
  const busy = (el, dur) => { if (el._fx) return true; el._fx = true; setTimeout(() => { el._fx = false; }, dur); return false; };

  // Kamera: flaş patlar, deklanşör tık yapar, çekilen fotoğraf (polaroid) dışarı çıkar
  const shootPhoto = (el) => {
    if (busy(el, ms(2.2) )) return;
    const c = centerOf(el);
    const g = fxLayer(el);
    const bulb = svgEl('circle', { cx: 96, cy: 38, r: 4, fill: '#fff' });
    const glint = svgEl('circle', { cx: 55, cy: 53, r: 4, fill: '#fff' });
    g.append(bulb, glint);
    bulb.animate([{ r: 4, opacity: 1 }, { r: 26, opacity: 0.9, offset: 0.25 }, { r: 34, opacity: 0 }], { duration: ms(0.6), easing: 'ease-out' });
    glint.animate([{ opacity: 1 }, { opacity: 0.2, offset: 0.3 }, { opacity: 1 }], { duration: ms(0.5) });
    setTimeout(() => g.remove(), ms(0.7));
    const flash = document.createElement('div');
    flash.className = 'cam-flash';
    document.body.append(flash);
    flash.animate([{ opacity: 0 }, { opacity: 0.92, offset: 0.1 }, { opacity: 0.35, offset: 0.35 }, { opacity: 0 }], { duration: ms(0.7), easing: 'ease-out' }).onfinish = () => flash.remove();
    setTimeout(() => flash.remove(), ms(0.7) + 400);
    const rot = restRot(el);
    el.animate([{ scale: 1 }, { scale: 0.86, offset: 0.12 }, { scale: 1.08, offset: 0.4 }, { scale: 1 }], { duration: ms(0.55), easing: 'ease-out' });
    el.animate([{ rotate: rot }, { rotate: `calc(${rot} - 6deg)`, offset: 0.12 }, { rotate: rot }], { duration: ms(0.55), easing: 'ease-out' });
    const pw = Math.max(96, c.w * 0.95);
    const ph = document.createElement('div');
    ph.className = 'polaroid';
    ph.style.cssText = `left:${c.x}px;top:${c.y + c.h * 0.22}px;width:${pw}px;padding:${(pw * 0.06).toFixed(1)}px ${(pw * 0.06).toFixed(1)}px 0`;
    ph.innerHTML = '<i></i><b></b>';
    document.body.append(ph);
    // Fotoğrafın içi: kameranın bulunduğu ekranın küçültülmüş görüntüsü
    try {
      const sec = el.closest('.panel, header, footer, section');
      const win = ph.firstChild;
      if (sec && win) {
        const vw = innerWidth, vh = innerHeight, L = Math.min(vw, vh) * 0.9;
        const x0 = Math.max(0, Math.min(vw - L, c.x - L / 2)), y0 = Math.max(0, Math.min(vh - L, c.y - L / 2));
        const k = (pw * 0.88 - 3) / L;
        const r = sec.getBoundingClientRect();
        const shot = sec.cloneNode(true);
        shot.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
        shot.querySelectorAll('iframe, video, canvas, script').forEach((n) => n.remove());
        shot.querySelectorAll('[style]').forEach((n) => { if (n.style.opacity === '0') n.style.opacity = ''; if (/scale\(0|scale: 0/.test(n.getAttribute('style'))) n.style.scale = ''; });
        shot.setAttribute('aria-hidden', 'true');
        shot.removeAttribute('data-reveal');
        shot.style.cssText += `;position:absolute;left:0;top:0;margin:0;width:${r.width}px;height:${r.height}px;transform-origin:0 0;translate:${((r.left - x0) * k).toFixed(1)}px ${((r.top - y0) * k).toFixed(1)}px;scale:${k.toFixed(4)};pointer-events:none`;
        win.textContent = '';
        win.classList.add('pz');
        win.style.background = getComputedStyle(sec).backgroundColor;
        win.append(shot);
      }
    } catch (e) { /* boş kare kalır */ }
    const tilt = Math.random() * 10 - 5;
    const anim = ph.animate([
      { translate: '-50% -30%', scale: 0.45, rotate: '0deg', opacity: 0 },
      { translate: '-50% 20%', scale: 0.9, rotate: `${tilt}deg`, opacity: 1, offset: 0.3 },
      { translate: '-50% 75%', scale: 1, rotate: `${tilt * 1.4}deg`, opacity: 1, offset: 0.55 },
      { translate: '-50% 75%', scale: 1, rotate: `${tilt * 1.4}deg`, opacity: 1, offset: 0.85 },
      { translate: '-50% 150%', scale: 0.92, rotate: `${tilt * 2}deg`, opacity: 0 },
    ], { duration: ms(2.4), easing: 'cubic-bezier(.3,.8,.3,1)' });
    anim.onfinish = () => ph.remove();
    setTimeout(() => ph.remove(), ms(2.4) + 400);
  };

  // Gülen yüz: utanır, yanakları kızarır, gözleri aşağı kayar, biraz küçülüp eğilir
  const shyFace = (el) => {
    if (busy(el, ms(3.2))) return;
    const g = fxLayer(el);
    const eyeL = svgEl('circle', { cx: 37, cy: 42, r: 8, fill: '#fff', stroke: '#000', 'stroke-width': 2.5 });
    const eyeR = svgEl('circle', { cx: 63, cy: 42, r: 8, fill: '#fff', stroke: '#000', 'stroke-width': 2.5 });
    const pupL = svgEl('circle', { cx: 35, cy: 47, r: 3.5, fill: '#000' });
    const pupR = svgEl('circle', { cx: 61, cy: 47, r: 3.5, fill: '#000' });
    const patch = svgEl('rect', { x: 33, y: 57, width: 34, height: 15, fill: '#ffd731' });
    const mouth = svgEl('path', { d: 'M41 65 q9 4 18 0', fill: 'none', stroke: '#000', 'stroke-width': 3, 'stroke-linecap': 'round' });
    const bl = svgEl('ellipse', { cx: 25, cy: 56, rx: 10, ry: 6, fill: '#ff5d8f', opacity: 0 });
    const br = svgEl('ellipse', { cx: 75, cy: 56, rx: 10, ry: 6, fill: '#ff5d8f', opacity: 0 });
    const lines = svgEl('path', { d: 'M20 53 l4 4 M26 52 l4 4 M70 52 l4 4 M76 53 l4 4', stroke: '#fff', 'stroke-width': 1.6, 'stroke-linecap': 'round', opacity: 0 });
    const scene = svgEl('g', { opacity: 0 });
    scene.append(eyeL, eyeR, pupL, pupR, patch, mouth);
    g.append(scene, bl, br, lines);
    const hold = 2.3;
    scene.animate([{ opacity: 0 }, { opacity: 1, offset: 0.08 }, { opacity: 1, offset: 0.86 }, { opacity: 0 }], { duration: ms(hold), fill: 'forwards' });
    [bl, br].forEach((b) => b.animate([{ opacity: 0 }, { opacity: 0.95, offset: 0.22 }, { opacity: 0.7, offset: 0.5 }, { opacity: 0.95, offset: 0.7 }, { opacity: 0 }], { duration: ms(hold), fill: 'forwards' }));
    lines.animate([{ opacity: 0 }, { opacity: 0.9, offset: 0.3 }, { opacity: 0.9, offset: 0.8 }, { opacity: 0 }], { duration: ms(hold), fill: 'forwards' });
    const rot = restRot(el);
    el.animate([{ rotate: rot, scale: 1 }, { rotate: `calc(${rot} + 10deg)`, scale: 0.9, offset: 0.2 }, { rotate: `calc(${rot} + 7deg)`, scale: 0.92, offset: 0.8 }, { rotate: rot, scale: 1 }], { duration: ms(hold), easing: 'ease-in-out' });
    setTimeout(() => g.remove(), ms(hold) + 100);
  };

  // Onay rozeti: tik yeniden çizilerek atılır, halka yayılır
  const tickCheck = (el) => {
    if (busy(el, ms(1.4))) return;
    const g = fxLayer(el);
    const cover = svgEl('circle', { cx: 50.5, cy: 50, r: 27, fill: '#55db9c' });
    const ring = svgEl('circle', { cx: 50, cy: 50, r: 34, fill: 'none', stroke: '#55db9c', 'stroke-width': 3 });
    const white = svgEl('path', { d: 'M33 51l12 12 23-25', fill: 'none', stroke: '#fff', 'stroke-width': 8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', pathLength: 1, 'stroke-dasharray': 1, 'stroke-dashoffset': 1 });
    const black = svgEl('path', { d: 'M33 51l12 12 23-25', fill: 'none', stroke: '#000', 'stroke-width': 3, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', pathLength: 1, 'stroke-dasharray': 1, 'stroke-dashoffset': 1 });
    g.append(ring, cover, white, black);
    const draw = { duration: ms(0.45), delay: ms(0.18), easing: 'cubic-bezier(.6,0,.2,1)', fill: 'forwards' };
    [white, black].forEach((p) => p.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], draw));
    ring.animate([{ r: 34, opacity: 0.9 }, { r: 52, opacity: 0 }], { duration: ms(0.8), delay: ms(0.5), easing: 'ease-out', fill: 'both' });
    const rot = restRot(el);
    el.animate([{ scale: 1, rotate: rot }, { scale: 0.86, rotate: `calc(${rot} - 8deg)`, offset: 0.25 }, { scale: 1.16, rotate: `calc(${rot} + 6deg)`, offset: 0.6 }, { scale: 1, rotate: rot }], { duration: ms(0.9), easing: 'ease-out' });
    setTimeout(() => g.remove(), ms(1.4));
  };

  // Yıldız: dönüp büyür, parlar ve etrafa minik yıldızlar saçar
  const sparkleStar = (el) => {
    if (busy(el, ms(1.1))) return;
    const c = centerOf(el);
    const rot = restRot(el);
    el.animate([{ rotate: rot, scale: 1, filter: 'drop-shadow(0 0 0 #ffd731)' }, { rotate: `calc(${rot} + 180deg)`, scale: 1.4, filter: 'drop-shadow(0 0 14px #ffd731)', offset: 0.5 }, { rotate: `calc(${rot} + 360deg)`, scale: 1, filter: 'drop-shadow(0 0 0 #ffd731)' }], { duration: ms(0.9), easing: 'ease-in-out' });
    sparks(c.x, c.y, { n: 9, size: Math.max(12, c.w * 0.22), dist: Math.max(50, c.w * 0.9) });
  };

  // Konu sticker'ları: her biri kendi işine uygun küçük bir oyun oynar
  const boing = (el, extra = {}) => {
    const rot = restRot(el);
    el.animate([{ scale: 1, rotate: rot }, { scale: 0.85, rotate: `calc(${rot} - 8deg)`, offset: 0.2 }, { scale: 1.18, rotate: `calc(${rot} + 8deg)`, offset: 0.5 }, { scale: 1, rotate: rot }], { duration: ms(0.7), easing: 'ease-out', ...extra });
  };
  const dropPin = (el) => {
    if (busy(el, ms(1.2))) return;
    const c = centerOf(el);
    el.animate([{ translate: '0 -40px', scale: 0.8 }, { translate: '0 0', scale: 1.15, offset: 0.55 }, { translate: '0 -8px', scale: 0.95, offset: 0.75 }, { translate: '0 0', scale: 1 }], { duration: ms(0.9), easing: 'cubic-bezier(.3,.9,.4,1)' });
    sparks(c.x, c.y + c.h * 0.3, { n: 6, size: Math.max(10, c.w * 0.16), dist: Math.max(40, c.w * 0.6) });
  };
  const driveTruck = (el) => {
    if (busy(el, ms(2))) return;
    el.animate([{ translate: '0 0', opacity: 1 }, { translate: '160% 0', opacity: 0, offset: 0.45 }, { translate: '-160% 0', opacity: 0, offset: 0.46 }, { translate: '0 0', opacity: 1 }], { duration: ms(1.8), easing: 'cubic-bezier(.5,0,.3,1)' });
  };
  const spinMedal = (el) => {
    if (busy(el, ms(1.1))) return;
    const c = centerOf(el), rot = restRot(el);
    el.animate([{ rotate: rot, scale: 1 }, { rotate: `calc(${rot} + 360deg)`, scale: 1.3, offset: 0.55 }, { rotate: `calc(${rot} + 360deg)`, scale: 1 }], { duration: ms(1), easing: 'ease-in-out' });
    sparks(c.x, c.y, { n: 8, size: Math.max(12, c.w * 0.2), dist: Math.max(50, c.w * 0.8) });
  };
  const burstOf = (id) => (el) => {
    if (busy(el, ms(1.1))) return;
    const c = centerOf(el);
    boing(el);
    sparks(c.x, c.y, { n: 8, size: Math.max(12, c.w * 0.2), dist: Math.max(50, c.w * 0.8), id });
  };
  const plain = (el) => { if (busy(el, ms(0.9))) return; boing(el); };


  // ---- Parça parça canlanan sticker'lar: çizimin satır içi kopyası oynatılır ----
  const inlineFx = (el, id) => {
    const sym = document.getElementById(`s-${id}`), use = el.querySelector(':scope > use');
    if (!sym || !use) return null;
    const g = svgEl('g', { class: 'fx' });
    [...sym.children].forEach((n) => g.append(n.cloneNode(true)));
    el.append(g); use.style.visibility = 'hidden';
    return { g, parts: [...g.children], done: () => { g.remove(); use.style.visibility = ''; } };
  };
  const fillIn = (node, colors, delay, hold = 0.5) => node.animate([{ fill: '#fff', scale: 0.8 }, { fill: colors, scale: 1.12, offset: 0.25 }, { fill: colors, scale: 1, offset: 0.4 }, { fill: colors, scale: 1, offset: 1 }], { duration: ms(hold), delay: ms(delay), easing: 'ease-out', fill: 'both' });
  const pop = (node) => { node.style.transformBox = 'fill-box'; node.style.transformOrigin = 'center'; };

  // Palet: renk noktaları tek tek dolar
  const paintPalette = (el) => {
    if (busy(el, ms(2.6))) return;
    const fx = inlineFx(el, 'palette'); if (!fx) return;
    const dots = fx.parts.slice(1);
    dots.forEach((d, i) => { pop(d); const col = d.getAttribute('fill'); d.animate([{ fill: '#fff', scale: 0.7 }, { fill: col, scale: 1.25, offset: 0.35 }, { fill: col, scale: 1 }], { duration: ms(0.45), delay: ms(0.15 + i * 0.4), easing: 'ease-out', fill: 'both' }); });
    setTimeout(fx.done, ms(0.15 + dots.length * 0.4 + 0.9));
  };
  // Izgara: kırmızı kare sabit, diğer üçü sırayla dolar
  const fillGrid = (el) => {
    if (busy(el, ms(3.2))) return;
    const fx = inlineFx(el, 'grid'); if (!fx) return;
    const cols = ['#ffd731', '#55db9c', '#e9ccff'];
    fx.parts.slice(1).forEach((r, i) => { pop(r); r.animate([{ fill: '#fff', scale: 0.85 }, { fill: cols[i], scale: 1.1, offset: 0.2 }, { fill: cols[i], scale: 1, offset: 0.32 }, { fill: cols[i], scale: 1, offset: 0.85 }, { fill: '#fff', scale: 1 }], { duration: ms(2.2), delay: ms(0.1 + i * 0.35), easing: 'ease-out', fill: 'both' }); });
    setTimeout(fx.done, ms(0.1 + 3 * 0.35 + 2.3));
  };
  // Manzara: güneş alçalıp dağların ardına iner, gökyüzü akşam olur, sonra yeniden doğar
  const sunset = (el) => {
    if (busy(el, ms(3))) return;
    const fx = inlineFx(el, 'photo'); if (!fx) return;
    const [sky, sun] = fx.parts;
    sun.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(48px)', offset: 0.45 }, { transform: 'translateY(48px)', offset: 0.6 }, { transform: 'translateY(0)' }], { duration: ms(2.6), easing: 'ease-in-out' });
    sky.animate([{ fill: '#dceeff' }, { fill: '#ffb27a', offset: 0.45 }, { fill: '#ffb27a', offset: 0.6 }, { fill: '#dceeff' }], { duration: ms(2.6), easing: 'ease-in-out' });
    setTimeout(fx.done, ms(2.7));
  };
  // Ayar çubukları: yuvarlaklar çizgileri boyunca gidip gelir, başlangıca döner
  const slideKnobs = (el) => {
    if (busy(el, ms(2.4))) return;
    const fx = inlineFx(el, 'sliders'); if (!fx) return;
    const path = [[47, -15], [-47, 15], [37, -25]];
    fx.parts.slice(3).forEach((k, i) => k.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${path[i][0]}px)`, offset: 0.4 }, { transform: `translateX(${path[i][0] + path[i][1]}px)`, offset: 0.75 }, { transform: 'translateX(0)' }], { duration: ms(2), delay: ms(i * 0.12), easing: 'ease-in-out' }));
    setTimeout(fx.done, ms(2.4));
  };
  // Sepet: sağa doğru gider, soldan girer, yerine oturur
  const rollCart = (el) => {
    if (busy(el, ms(2.1))) return;
    el.animate([{ translate: '0 0', opacity: 1 }, { translate: '190% 0', opacity: 1, offset: 0.42 }, { translate: '190% 0', opacity: 0, offset: 0.43 }, { translate: '-190% 0', opacity: 0, offset: 0.44 }, { translate: '-190% 0', opacity: 1, offset: 0.45 }, { translate: '0 0', opacity: 1 }], { duration: ms(1.9), easing: 'cubic-bezier(.45,0,.3,1)' });
  };
  // Harita: kanatları katlanır, sonra açılır
  const foldMap = (el) => {
    if (busy(el, ms(2.2))) return;
    const fx = inlineFx(el, 'map'); if (!fx) return;
    const [left, mid, right, route, pin] = fx.parts;
    const fold = (node, ox, sx) => { node.style.transformBox = 'view-box'; node.style.transformOrigin = `${ox}px 50px`; node.animate([{ transform: 'scaleX(1)' }, { transform: `scaleX(${sx})`, offset: 0.4 }, { transform: `scaleX(${sx})`, offset: 0.55 }, { transform: 'scaleX(1)' }], { duration: ms(1.8), easing: 'cubic-bezier(.5,0,.3,1)' }); };
    fold(left, 35, 0.18); fold(right, 65, 0.18); fold(mid, 50, 0.72);
    [route, pin].forEach((n) => n.animate([{ opacity: 1 }, { opacity: 0, offset: 0.25 }, { opacity: 0, offset: 0.65 }, { opacity: 1 }], { duration: ms(1.8) }));
    setTimeout(fx.done, ms(1.9));
  };


  // Kalem: yazı yazar (zikzak çizgi belirirken kalem ilerler)
  const writePencil = (el) => {
    if (busy(el, ms(2.8))) return;
    const fx = inlineFx(el, 'pencil'); if (!fx) return;
    const line = svgEl('path', { d: 'M20 90l9-7 9 7 9-7 9 7 9-7 9 7 9-7', fill: 'none', stroke: '#000', 'stroke-width': 3.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', pathLength: 1, 'stroke-dasharray': 1, 'stroke-dashoffset': 1 });
    fx.g.prepend(line);
    line.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0, offset: 0.72 }, { strokeDashoffset: 0 }], { duration: ms(2.2), easing: 'linear', fill: 'both' });
    const path = [[0, 0], [14, -4], [28, 3], [42, -4], [56, 3], [66, -2], [66, -2], [0, 0]];
    const kf = path.map(([x, y], i) => ({ transform: `translate(${x}px, ${y}px) rotate(${i % 2 ? -4 : 3}deg)`, offset: i === path.length - 1 ? 1 : Math.min(0.72 * (i / 5), 0.72) + (i >= 5 ? 0.0 : 0) }));
    kf[5].offset = 0.72; kf[6].offset = 0.82; kf[7].offset = 1;
    fx.parts.filter((n) => n !== line).forEach((n) => { n.style.transformBox = 'view-box'; n.style.transformOrigin = '50px 50px'; n.animate(kf, { duration: ms(2.2), easing: 'ease-in-out' }); });
    setTimeout(fx.done, ms(2.4));
  };
  // Roket: alevle yukarı fırlar, aşağıdan yeniden girip yerine iner
  const flyRocket = (el) => {
    if (busy(el, ms(1.6))) return;
    const c = centerOf(el), rot = restRot(el);
    el.animate([{ translate: '0 0', rotate: rot }, { translate: '0 -8%', rotate: `calc(${rot} - 3deg)`, offset: 0.1 }, { translate: '0 -62%', rotate: `calc(${rot} + 2deg)`, offset: 0.42 }, { translate: '0 -62%', rotate: `calc(${rot} - 2deg)`, offset: 0.56 }, { translate: '0 0', rotate: rot }], { duration: ms(1.4), easing: 'cubic-bezier(.4,0,.3,1)' });
    sparks(c.x, c.y + c.h * 0.42, { n: 5, size: Math.max(9, c.w * 0.12), dist: Math.max(26, c.w * 0.45) });
  };
  // Grafik: çubuklar beyaz başlar, renkleri tek tek dolar ve boylanır
  const fillBars = (el) => {
    if (busy(el, ms(2.6))) return;
    const fx = inlineFx(el, 'chart'); if (!fx) return;
    fx.parts.slice(0, 3).forEach((bar, i) => {
      const col = bar.getAttribute('fill');
      bar.style.transformBox = 'fill-box'; bar.style.transformOrigin = 'center bottom';
      bar.animate([{ fill: '#fff', transform: 'scaleY(.35)' }, { fill: col, transform: 'scaleY(1.12)', offset: 0.35 }, { fill: col, transform: 'scaleY(1)' }], { duration: ms(0.6), delay: ms(0.15 + i * 0.45), easing: 'ease-out', fill: 'both' });
    });
    setTimeout(fx.done, ms(0.15 + 3 * 0.45 + 0.9));
  };
  // Tarayıcı: beyaz ve sarı çubuklar soldan sağa dolar, yan kutu renklenir
  const fillBrowser = (el) => {
    if (busy(el, ms(2.6))) return;
    const fx = inlineFx(el, 'browser'); if (!fx) return;
    const [white, yellow, side] = fx.parts.slice(5, 8);
    [[white, 0.1], [yellow, 0.6]].forEach(([bar, d]) => {
      const col = bar.getAttribute('fill');
      bar.style.transformBox = 'fill-box'; bar.style.transformOrigin = 'left center';
      bar.animate([{ transform: 'scaleX(.06)', fill: '#5c4ade' }, { transform: 'scaleX(1.06)', fill: col, offset: 0.7 }, { transform: 'scaleX(1)', fill: col }], { duration: ms(0.7), delay: ms(d), easing: 'ease-out', fill: 'both' });
    });
    if (side) { pop(side); side.animate([{ scale: 0.5, fill: '#5c4ade' }, { scale: 1.12, fill: '#e9ccff', offset: 0.6 }, { scale: 1, fill: '#e9ccff' }], { duration: ms(0.6), delay: ms(1.2), easing: 'ease-out', fill: 'both' }); }
    setTimeout(fx.done, ms(2.2));
  };
  // Çark: yavaşça tam tur döner
  const turnGear = (el) => {
    if (busy(el, ms(3))) return;
    const rot = restRot(el);
    el.animate([{ rotate: rot }, { rotate: `calc(${rot} + 360deg)` }], { duration: ms(2.8), easing: 'ease-in-out' });
  };
  // Yön tabelası: tabelalar sallanarak yön değiştirir
  const swingSign = (el) => {
    if (busy(el, ms(1.6))) return;
    const fx = inlineFx(el, 'signpost'); if (!fx) return;
    const [, b1, b2] = fx.parts;
    const swing = (n, oy, a) => { n.style.transformBox = 'view-box'; n.style.transformOrigin = `50px ${oy}px`; n.animate([{ transform: 'rotate(0)' }, { transform: `rotate(${a}deg)`, offset: 0.25 }, { transform: `rotate(${-a * 0.7}deg)`, offset: 0.55 }, { transform: `rotate(${a * 0.3}deg)`, offset: 0.8 }, { transform: 'rotate(0)' }], { duration: ms(1.4), easing: 'ease-in-out' }); };
    swing(b1, 28, -16); swing(b2, 58, 16);
    setTimeout(fx.done, ms(1.5));
  };


  // Kutu: üst kapakları iki yana açılır, içinden yıldız fırlar, kapaklar kapanır
  const openBox = (el) => {
    if (busy(el, ms(2.4))) return;
    const fx = inlineFx(el, 'box'); if (!fx) return;
    const [, , star, lf, rf] = fx.parts;
    const hinge = (n, ox, deg) => { n.style.transformBox = 'view-box'; n.style.transformOrigin = `${ox}px 42px`; n.animate([{ transform: 'rotate(0)' }, { transform: `rotate(${deg}deg)`, offset: 0.25 }, { transform: `rotate(${deg}deg)`, offset: 0.7 }, { transform: 'rotate(0)' }], { duration: ms(2), easing: 'cubic-bezier(.3,1.3,.5,1)' }); };
    hinge(lf, 14, -115); hinge(rf, 86, 115);
    star.style.transformBox = 'fill-box'; star.style.transformOrigin = 'center';
    star.animate([{ transform: 'translateY(0) scale(1)' }, { transform: 'translateY(-4px) scale(1)', offset: 0.22 }, { transform: 'translateY(-26px) scale(1.7) rotate(25deg)', offset: 0.42 }, { transform: 'translateY(-20px) scale(1.5) rotate(-10deg)', offset: 0.62 }, { transform: 'translateY(0) scale(1)' }], { duration: ms(2), easing: 'ease-in-out' });
    setTimeout(fx.done, ms(2.1));
  };


  // Şişe: kapak döne döne yukarı kalkar, sonra yerine oturur
  const uncap = (id) => (el) => {
    if (busy(el, ms(2))) return;
    const fx = inlineFx(el, id); if (!fx) return;
    const cap = fx.parts[0];
    cap.style.transformBox = 'fill-box'; cap.style.transformOrigin = 'center';
    cap.animate([{ transform: 'translateY(0) rotate(0)' }, { transform: 'translateY(-24px) rotate(-28deg)', offset: 0.3 }, { transform: 'translateY(-30px) rotate(-18deg) translateX(10px)', offset: 0.65 }, { transform: 'translateY(0) rotate(0)' }], { duration: ms(1.7), easing: 'cubic-bezier(.3,1.2,.5,1)' });
    const c = centerOf(el);
    setTimeout(() => sparks(c.x, c.y - c.h * 0.4, { n: 5, size: Math.max(9, c.w * 0.14), dist: Math.max(36, c.w * 0.6) }), ms(0.35));
    setTimeout(fx.done, ms(1.8));
  };
  // Mercek: yaklaşır, uzaklaşır
  const zoomLens = (el) => {
    if (busy(el, ms(2.4))) return;
    const rot = restRot(el);
    el.animate([{ scale: 1, rotate: rot }, { scale: 1.3, rotate: `calc(${rot} - 6deg)`, offset: 0.3 }, { scale: 1.3, rotate: `calc(${rot} - 6deg)`, offset: 0.45 }, { scale: 0.8, rotate: `calc(${rot} + 4deg)`, offset: 0.75 }, { scale: 1, rotate: rot }], { duration: ms(2.2), easing: 'ease-in-out' });
  };


  // ---- Web tasarım sticker'ları: her birinin kendi efekti ----
  const fxBox = (n, origin = 'center') => { n.style.transformBox = 'fill-box'; n.style.transformOrigin = origin; };
  // Kod: parantezler açılır, eğik çizgi çizilir
  const writeCode = (el) => {
    if (busy(el, ms(2))) return;
    const fx = inlineFx(el, 'code'); if (!fx) return;
    const [, l, r, sl] = fx.parts;
    l.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-12px)', offset: 0.35 }, { transform: 'translateX(0)' }], { duration: ms(1.3), easing: 'ease-in-out' });
    r.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(12px)', offset: 0.35 }, { transform: 'translateX(0)' }], { duration: ms(1.3), easing: 'ease-in-out' });
    sl.style.strokeDasharray = '1'; sl.style.strokeDashoffset = '0';
    sl.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 1, offset: 0.2 }, { strokeDashoffset: 0 }], { duration: ms(1.1), easing: 'ease-out' });
    setTimeout(fx.done, ms(1.4));
  };
  // Telefon: ekran blokları sırayla içeri kayar
  const loadPhone = (el) => {
    if (busy(el, ms(2.2))) return;
    const fx = inlineFx(el, 'phone'); if (!fx) return;
    fx.parts.slice(2, 6).forEach((bar, i) => {
      fxBox(bar, 'left center');
      bar.animate([{ transform: 'translateX(-20px) scaleX(.2)', opacity: 0 }, { transform: 'translateX(0) scaleX(1.08)', opacity: 1, offset: 0.7 }, { transform: 'translateX(0) scaleX(1)', opacity: 1 }], { duration: ms(0.5), delay: ms(0.1 + i * 0.22), easing: 'ease-out', fill: 'both' });
    });
    const rot = restRot(el);
    el.animate([{ rotate: rot }, { rotate: `calc(${rot} - 7deg)`, offset: 0.25 }, { rotate: `calc(${rot} + 5deg)`, offset: 0.55 }, { rotate: rot }], { duration: ms(1.1), easing: 'ease-in-out' });
    setTimeout(fx.done, ms(1.6));
  };
  // Katmanlar: üst ve alt katman açılır, sonra üst üste biner
  const fanLayers = (el) => {
    if (busy(el, ms(1.8))) return;
    const fx = inlineFx(el, 'layers'); if (!fx) return;
    const [a, , c] = fx.parts;
    a.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(14px)', offset: 0.4 }, { transform: 'translateY(14px)', offset: 0.6 }, { transform: 'translateY(0)' }], { duration: ms(1.4), easing: 'ease-in-out' });
    c.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-14px)', offset: 0.4 }, { transform: 'translateY(-14px)', offset: 0.6 }, { transform: 'translateY(0)' }], { duration: ms(1.4), easing: 'ease-in-out' });
    setTimeout(fx.done, ms(1.5));
  };
  // Yazı: büyük A eğilip büyür, küçük a zıplar
  const bounceType = (el) => {
    if (busy(el, ms(1.8))) return;
    const fx = inlineFx(el, 'type'); if (!fx) return;
    const [, big, ring, stem] = fx.parts;
    fxBox(big);
    big.animate([{ transform: 'scale(1) rotate(0)' }, { transform: 'scale(1.3) rotate(-10deg)', offset: 0.35 }, { transform: 'scale(1) rotate(0)' }], { duration: ms(0.8), easing: BOUNCE });
    [ring, stem].forEach((n) => { fxBox(n); n.animate([{ transform: 'translateY(0) scale(1)' }, { transform: 'translateY(-12px) scale(1.2)', offset: 0.4 }, { transform: 'translateY(0) scale(1)' }], { duration: ms(0.7), delay: ms(0.3), easing: BOUNCE }); });
    setTimeout(fx.done, ms(1.4));
  };
  // Çanta: sapından sallanır, kalp atar
  const swingBag = (el) => {
    if (busy(el, ms(2))) return;
    const fx = inlineFx(el, 'bag'); if (!fx) return;
    const [, body, heart] = fx.parts;
    [body, heart].forEach((n) => { n.style.transformBox = 'view-box'; n.style.transformOrigin = '50px 34px'; n.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-14deg)', offset: 0.25 }, { transform: 'rotate(10deg)', offset: 0.5 }, { transform: 'rotate(-5deg)', offset: 0.75 }, { transform: 'rotate(0)' }], { duration: ms(1.5), easing: 'ease-in-out' }); });
    fxBox(heart); heart.animate([{ scale: 1 }, { scale: 1.35, offset: 0.3 }, { scale: 1, offset: 0.5 }, { scale: 1.25, offset: 0.7 }, { scale: 1 }], { duration: ms(1.3), delay: ms(0.2), easing: 'ease-out' });
    setTimeout(fx.done, ms(1.7));
  };
  // Etiket: deliğinden sarkaç gibi sallanır
  const swingTag = (el) => {
    if (busy(el, ms(2.2))) return;
    const fx = inlineFx(el, 'tag'); if (!fx) return;
    fx.parts.slice(1).forEach((n) => { n.style.transformBox = 'view-box'; n.style.transformOrigin = '50px 38px'; n.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-26deg)', offset: 0.22 }, { transform: 'rotate(20deg)', offset: 0.5 }, { transform: 'rotate(-10deg)', offset: 0.75 }, { transform: 'rotate(0)' }], { duration: ms(1.8), easing: 'ease-in-out' }); });
    setTimeout(fx.done, ms(1.9));
  };
  // Ampul: ışık yanar, ışınlar açılır
  const lightBulb = (el) => {
    if (busy(el, ms(2.4))) return;
    const fx = inlineFx(el, 'bulb'); if (!fx) return;
    const [rays, glass] = fx.parts;
    glass.animate([{ fill: '#fff' }, { fill: '#ffd731', offset: 0.2 }, { fill: '#ffd731', offset: 0.75 }, { fill: '#fff' }], { duration: ms(2), easing: 'ease-out' });
    fxBox(rays);
    rays.animate([{ opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1.1, offset: 0.25 }, { opacity: 1, scale: 1, offset: 0.75 }, { opacity: 0, scale: 0.9 }], { duration: ms(2), easing: 'ease-out' });
    const c = centerOf(el);
    setTimeout(() => sparks(c.x, c.y - c.h * 0.1, { n: 6, size: Math.max(9, c.w * 0.14), dist: Math.max(40, c.w * 0.7) }), ms(0.25));
    setTimeout(fx.done, ms(2.1));
  };
  // Vitrin: tente çizgileri dalgalanır, tabela ışıldar
  const waveShop = (el) => {
    if (busy(el, ms(2))) return;
    const fx = inlineFx(el, 'vitrin'); if (!fx) return;
    fx.g.querySelectorAll('.stripe').forEach((n, i) => { fxBox(n, 'center top'); n.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(1.22)', offset: 0.4 }, { transform: 'scaleY(1)' }], { duration: ms(0.6), delay: ms(i * 0.1), easing: 'ease-in-out' }); });
    const sign = fx.g.querySelector('.sign');
    if (sign) sign.animate([{ fill: '#fff' }, { fill: '#ffd731', offset: 0.3 }, { fill: '#fff', offset: 0.6 }, { fill: '#ffd731', offset: 0.8 }, { fill: '#fff' }], { duration: ms(1.3) });
    setTimeout(fx.done, ms(1.5));
  };
  // İmleç: hedefe gider ve tıklar
  const clickCursor = (el) => {
    if (busy(el, ms(1.6))) return;
    const fx = inlineFx(el, 'cursor'); if (!fx) return;
    fx.g.style.transformBox = 'view-box'; fx.g.style.transformOrigin = '22px 10px';
    fx.g.animate([{ transform: 'translate(0,0) scale(1)' }, { transform: 'translate(-10px,-8px) scale(1)', offset: 0.3 }, { transform: 'translate(6px,8px) scale(.82)', offset: 0.55 }, { transform: 'translate(6px,8px) scale(.82)', offset: 0.65 }, { transform: 'translate(0,0) scale(1)' }], { duration: ms(1.2), easing: 'ease-in-out' });
    const c = centerOf(el);
    setTimeout(() => sparks(c.x + c.w * 0.1, c.y + c.h * 0.1, { n: 6, size: Math.max(8, c.w * 0.12), dist: Math.max(30, c.w * 0.5) }), ms(0.7));
    setTimeout(fx.done, ms(1.3));
  };
  // Zincir: halkalar gerilir ve toplanır
  const pullLink = (el) => {
    if (busy(el, ms(1.4))) return;
    const rot = restRot(el);
    el.animate([{ scale: '1 1', rotate: rot }, { scale: '1.35 .85', rotate: rot, offset: 0.35 }, { scale: '.9 1.08', rotate: rot, offset: 0.65 }, { scale: '1 1', rotate: rot }], { duration: ms(1), easing: 'ease-in-out' });
  };
  const CLICKS = {
    'st-camera': shootPhoto, 'st-coin': shyFace, 'st-check': tickCheck, 'st-star': sparkleStar,
    'st-pin': dropPin, 'st-truck': driveTruck, 'st-medal': spinMedal, 'st-heart': burstOf('heart'), 'st-chat': burstOf('star'), 'st-palette': paintPalette, 'st-box': openBox,
    'st-product': uncap('product'), 'st-bottle': uncap('bottle'), 'st-magnifier': zoomLens, 'st-pencil': writePencil, 'st-globe': spinMedal, 'st-gear': turnGear, 'st-rocket': flyRocket, 'st-signpost': swingSign, 'st-chart': fillBars, 'st-browser': fillBrowser, 'st-map': foldMap, 'st-store': burstOf('coin'), 'st-vitrin': waveShop, 'st-cursor': clickCursor, 'st-code': writeCode, 'st-phone': loadPhone, 'st-layers': fanLayers, 'st-type': bounceType, 'st-bag': swingBag, 'st-tag': swingTag, 'st-bulb': lightBulb, 'st-cart': rollCart, 'st-link': pullLink, 'st-sliders': slideKnobs, 'st-photo': sunset, 'st-grid': fillGrid,
  };
  const CLICK_SEL = Object.keys(CLICKS).map((k) => `.${k}`).join(', ');
  // Efektler fare üstüne gelince çalışır (dokunmatikte dokununca)
  document.addEventListener('mouseover', (e) => {
    const t = e.target.closest && e.target.closest(CLICK_SEL);
    if (!t || t.contains(e.relatedTarget)) return;
    const fn = CLICKS[[...t.classList].find((c) => CLICKS[c])];
    if (fn) fn(t);
  });
  document.addEventListener('click', (e) => {
    const t = e.target.closest && e.target.closest(CLICK_SEL);
    if (!t || t.closest('a, button')) return;
    const fn = CLICKS[[...t.classList].find((c) => CLICKS[c])];
    if (fn) fn(t);
  });

  // Büyük bildiri satırları: en geniş satır ekrana sığacak şekilde yazı küçülür
  const stLines = document.querySelector('.statement .lines');
  if (stLines) {
    const fitLines = () => {
      stLines.style.fontSize = '';
      const base = parseFloat(getComputedStyle(stLines).fontSize);
      const room = stLines.parentElement.clientWidth - 32;
      let widest = 0;
      stLines.querySelectorAll('.line').forEach((l) => { widest = Math.max(widest, l.scrollWidth); });
      if (widest > room) stLines.style.fontSize = `${Math.max(24, base * room / widest * 0.98).toFixed(1)}px`;
    };
    fitLines();
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(fitLines);
    addEventListener('resize', fitLines);
  }

  // Yorumlardaki mini 5 yıldız: görününce ve tıklanınca sırayla parlar
  const rateSparkle = (box) => {
    if (box._sp) return; box._sp = true; setTimeout(() => { box._sp = false; }, ms(1.6));
    [...box.querySelectorAll('.rs')].forEach((st, i) => {
      st.animate([{ scale: 1, filter: 'brightness(1) drop-shadow(0 0 0 #ffd731)' }, { scale: 1.45, filter: 'brightness(1.25) drop-shadow(0 0 8px #ffd731)', offset: 0.4 }, { scale: 1, filter: 'brightness(1) drop-shadow(0 0 0 #ffd731)' }], { duration: ms(0.7), delay: ms(i * 0.12), easing: 'ease-in-out' });
      setTimeout(() => { const c = centerOf(st); sparks(c.x, c.y, { n: 4, size: 9, dist: 26 }); }, ms(i * 0.12 + 0.15));
    });
  };
  const ratings = [...document.querySelectorAll('.rating')];
  if (ratings.length) {
    const ro = new IntersectionObserver((en) => en.forEach((x) => { if (x.isIntersecting) { rateSparkle(x.target); ro.unobserve(x.target); } }), { threshold: 0.6 });
    ratings.forEach((r) => { ro.observe(r); r.addEventListener('click', () => rateSparkle(r)); r.addEventListener('mouseenter', () => rateSparkle(r)); });
  }

  // Fare üstüne gelince sticker bir tur atar
  pops.forEach((el) => el.addEventListener('mouseenter', () => {
    if (!on('pop') || el._spin || el.matches(CLICK_SEL)) return;
    const rot = getComputedStyle(el).getPropertyValue('--r') || '0deg';
    el._spin = true;
    el.classList.remove('idle-on'); // dönerken boşta oynama durur, bitince temiz başlar
    el.animate([{ rotate: rot, scale: 1 }, { rotate: `calc(${rot} + 360deg)`, scale: 1.15, offset: 0.5 }, { rotate: `calc(${rot} + 360deg)`, scale: 1 }], { duration: ms(0.9), easing: BOUNCE })
      .onfinish = () => { el._spin = false; el.classList.add('idle-on'); };
  }));

  // 3) Büyük başlıklar: harfler sağdan sola, soldan kayarak gelir (bir kez)
  if (on('reveal')) {
    const io = onceAt(ROOT80, (el) => {
      const chars = el._chars;
      chars.forEach((c, i) => c.animate([{ opacity: 0, translate: '-0.25em 0' }, { opacity: 1, translate: '0 0' }], { duration: ms(0.65), delay: ms((chars.length - 1 - i) * 0.015), easing: BOUNCE, fill: 'both' }));
    });
    document.querySelectorAll('[data-reveal]').forEach((el) => {
      el._chars = split(el);
      el._chars.forEach((c) => { c.style.opacity = 0; });
      el.classList.add('split-ready');
      io.observe(el);
      fontsReady.then(() => kernSplit(el));
    });
  }

  // 4) Alt başlıklar: satırlar 3D dönerek gelir
  if (on('headings')) {
    const io = onceAt(ROOT80, (el) => {
      const { lines, revert } = el._split;
      lines.forEach((l, i) => l.animate([{ opacity: 0, transform: 'translateZ(5em) rotateY(-45deg)' }, { opacity: 1, transform: 'none' }], { duration: ms(0.85), delay: ms(i * 0.15), easing: BOUNCE, fill: 'both' }));
      setTimeout(revert, ms(0.85 + lines.length * 0.15) + 80);
    });
    document.querySelectorAll('[data-heading]').forEach((el) => {
      el._split = splitLines(el);
      el.style.perspective = '1000px';
      el._split.lines.forEach((l) => { l.style.opacity = 0; });
      el.classList.add('split-ready');
      io.observe(el);
    });
  }

  // 5) Kart grupları: 3D uçarak gelir, toplam 0,2 sn arayla
  if (on('cards')) {
    const io = onceAt(ROOT80, (wrap) => {
      const cards = [...wrap.querySelectorAll('[data-card]')];
      cards.forEach((c, i) => {
        c.classList.add('shown');
        c.animate([
          { opacity: 0, transform: 'translate3d(5em, 0, 20em) rotateY(-30deg) scale(.75)' },
          { opacity: 1, transform: 'none' },
        ], { duration: ms(0.85), delay: ms(cards.length > 1 ? (i * 0.2) / (cards.length - 1) : 0), easing: BOUNCE, fill: 'both' });
      });
    });
    document.querySelectorAll('[data-cards]').forEach((w) => io.observe(w));
  }

  // 6) Vitrin kartları: küçük, aşağıda ve şeffaf halden büyüyerek gelir
  if (on('device')) {
    const io = onceAt('0px 0px -50% 0px', (el) => {
      el.classList.add('shown');
      const k = [...el.parentElement.querySelectorAll('[data-device]')].indexOf(el);
      const r = getComputedStyle(el).rotate;
      el.style.setProperty('--r', r === 'none' ? '0deg' : r.split(' ').pop());
      // Giriş bitince etkisini bırakır (fill: backwards) ve kart ağırlıksız süzülmeye başlar
      el.animate([{ scale: 0.75, opacity: 0, translate: '0 40%' }, { scale: 1, opacity: 1, translate: '0 0' }], { duration: ms(1.2), delay: ms(k * 0.15), easing: BOUNCE, fill: 'backwards' })
        .onfinish = () => el.classList.add('idle-on');
    });
    document.querySelectorAll('[data-device]').forEach((el) => io.observe(el));
  }

  // 7) Menü: aşağı kaydırınca linkler sırayla yukarı uçar, yukarı kaydırınca geri gelir
  const links = [...document.querySelectorAll('.nav-links .btn')];
  const linkBox = document.querySelector('.nav-links');
  if (on('navhide') && linkBox && !nav.classList.contains('keep-links')) {
    links.forEach((a, i) => { a.style.setProperty('--di', i); a.style.setProperty('--ui', links.length - 1 - i); });
    let lastY = window.scrollY;
    const setAway = (v) => linkBox.classList.toggle('away', v);
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      if (Math.abs(y - lastY) < 10) return;
      const down = y > lastY;
      lastY = y;
      if (!desktop()) return;
      if (down && y > 50) setAway(true);
      else if (!down) setAway(false);
    }, { passive: true });
    menuBtn.addEventListener('mouseenter', () => { if (desktop()) setAway(false); });
    document.querySelector('.nav-right').addEventListener('mouseleave', () => { if (desktop() && window.scrollY > 50) setAway(true); });
  }

  // 8) Kayan bantlar: kaydırma yönü değişince ters döner
  const marquees = on('marquee')
    ? [...document.querySelectorAll('.ticker-track, .band-row')].map((el) => {
      const a = el.getAnimations()[0];
      if (a) a.currentTime = (a.effect.getTiming().duration || 30000) * 40; // geriye de dönebilsin
      return a;
    }).filter(Boolean)
    : [];
  let lastMY = window.scrollY, rate = 1;
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (y === lastMY) return;
    const next = y > lastMY ? 1 : -1;
    lastMY = y;
    if (next !== rate) { rate = next; marquees.forEach((a) => a.updatePlaybackRate(rate)); }
  }, { passive: true });

  // 9) Kaydırmaya bağlı kayma (paralaks) ve bant kayması
  const pars = on('parallax')
    ? [...document.querySelectorAll('[data-par]')].map((el) => {
      const [a, b] = el.dataset.par.split(',').map(parseFloat);
      return { el, a, b, box: el.parentElement, top: el.dataset.parMode === 'top' };
    })
    : [];
  const bands = on('marquee') ? [...document.querySelectorAll('[data-band]')] : [];
  const update = () => {
    const h = vh();
    for (const p of pars) {
      const r = p.box.getBoundingClientRect();
      // "top bottom" -> "bottom top" arası ilerleme; giriş bölümünde "top top" -> "bottom top-=20%"
      const t = p.top ? clamp(-r.top / (r.height + 0.2 * h)) : clamp((h - r.top) / (h + r.height));
      p.el.style.setProperty('--py', `${((p.a + (p.b - p.a) * t) * K).toFixed(2)}%`);
    }
    for (const el of bands) {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--bp', (clamp((h - r.top) / (h + r.height)) - 0.5).toFixed(3));
    }
  };
  let queued = false;
  window.addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; update(); }); } }, { passive: true });
  window.addEventListener('resize', update);
  update();

  // 10) Yumuşak kaydırma (Lenis, referans sitedeki gibi lerp 0.12)
  if (on('smooth') && matchMedia('(pointer: fine)').matches) {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/lenis@1.1.14/dist/lenis.min.js';
    s.async = true;
    s.onload = () => {
      if (!window.Lenis) return;
      const lenis = new window.Lenis({ lerp: 0.12 });
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
      document.addEventListener('click', (e) => {
        const a = e.target.closest('a[href^="#"]');
        if (!a) return;
        const id = a.getAttribute('href');
        const target = id === '#top' || id === '#' ? 0 : document.querySelector(id);
        if (target === null) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: target === 0 ? 0 : -60, duration: 1.4 });
      });
    };
    document.head.append(s);
  }
})();
