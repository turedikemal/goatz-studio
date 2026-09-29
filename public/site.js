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
    next.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ms(0.22), easing: 'ease-out' });
    cleanTimer = setTimeout(() => { prev.classList.remove('leaving'); }, ms(0.22) + 40);
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
  if (introEl) {
    const run = () => {
      const text = introEl.textContent;
      introEl.setAttribute('aria-label', text.trim());
      introEl.textContent = '';
      const letters = [];
      text.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) { introEl.append(' '); return; }
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
          for (let k = 0; k < 5; k++) { const d = document.createElement('span'); d.className = 'rd'; d.textContent = ch; l.append(d); }
          w.append(l);
          letters.push(l);
        }
        introEl.append(w);
      });
      introEl.querySelectorAll('.rw').forEach((wd) => kernWord(wd, [...wd.querySelectorAll('.rl')].map((n) => ({ node: n, ch: n.querySelector('.rc').textContent }))));
      introEl.classList.add('ready');
      // Her harfte 5 kopya sırayla yukarı kayar, gerçek harf en son yerine oturur
      letters.forEach((l, i) => {
        const base = ms(0.1 + i * 0.05);
        l.querySelectorAll('.rd').forEach((d, k) => d.animate([{ translate: '0 140%' }, { translate: '0 -140%' }], { duration: ms(1.25), delay: base + ms(k * 0.15), easing: EASE, fill: 'both' }));
        l.querySelector('.rc').animate([{ translate: '0 140%' }, { translate: '0 0' }], { duration: ms(1.25), delay: base + ms(0.5), easing: EASE, fill: 'both' });
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
    el.style.setProperty('--dur', `${(8 + ((i * 17) % 50) / 10).toFixed(1)}s`);
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
  // Fare üstüne gelince sticker bir tur atar
  pops.forEach((el) => el.addEventListener('mouseenter', () => {
    if (!on('pop') || el._spin) return;
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
