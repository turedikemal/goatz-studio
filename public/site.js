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
    const setFlip = (c, on) => { if (!c.classList.contains('has-back')) return; c.classList.toggle('flipped', on); c.setAttribute('aria-pressed', String(on)); };
    const mark = () => {
      const mid = carousel.scrollLeft + carousel.clientWidth / 2;
      let best = 0, dist = Infinity;
      cards.forEach((c, i) => { const d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid); if (d < dist) { dist = d; best = i; } });
      current = best;
      bullets.forEach((b, i) => b.classList.toggle('on', i === best));
      cards.forEach((c, i) => { c.classList.toggle('active', i === best); if (i !== best) setFlip(c, false); });
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

    // Karta tıklayınca arka yüze döner; başka karta geçince ön yüze döner (sürüklemede çevirme)
    let dragged = false;
    const flipCard = (c) => {
      const i = cards.indexOf(c), open = !c.classList.contains('flipped');
      cards.forEach((x) => { if (x !== c) setFlip(x, false); });
      if (open && i !== current) goTo(i);
      setFlip(c, open);
    };
    carousel.addEventListener('click', (e) => {
      const c = e.target.closest('.c-card.has-back');
      if (c && !dragged) flipCard(c);
    });
    carousel.addEventListener('keydown', (e) => {
      const c = e.target.closest && e.target.closest('.c-card.has-back');
      if (!c || (e.key !== 'Enter' && e.key !== ' ')) return;
      e.preventDefault();
      flipCard(c);
    });

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
      dragged = moved;
      setTimeout(() => { dragged = false; }, 0);
      carousel.classList.remove('dragging');
      if (moved) goTo(current);
    });

    // Fare kenara yaklaştıkça kartlar o yöne akıcı biçimde kayar (yalnızca fare; kenara yaklaştıkça hızlanır, bırakınca yavaşlayarak durur)
    if (on('slider')) {
      const ZONE = 0.3, MAX = 1100; // kenardaki %30'luk bölge, en fazla 1100 px/sn
      let target = 0, vel = 0, pos = 0, raf = 0, last = 0, edge = false;
      const tick = (now) => {
        const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
        last = now;
        vel += (target - vel) * Math.min(1, dt * 7); // hız yumuşakça hedefe yaklaşır
        if (!target && Math.abs(vel) < 8) { raf = 0; vel = 0; edge = false; carousel.classList.remove('edge'); mark(); goTo(current); return; }
        const max = carousel.scrollWidth - carousel.clientWidth;
        pos = clamp(pos + vel * dt, 0, max);
        carousel.scrollLeft = pos;
        if ((pos <= 0 && vel < 0) || (pos >= max && vel > 0)) vel = 0;
        raf = requestAnimationFrame(tick);
      };
      carousel.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'mouse' || down) return;
        const r = carousel.getBoundingClientRect(), x = (e.clientX - r.left) / r.width;
        const k = x < ZONE ? -(ZONE - x) / ZONE : x > 1 - ZONE ? (x - (1 - ZONE)) / ZONE : 0;
        target = k * k * Math.sign(k) * MAX; // kareli eğri: kenara yaklaştıkça yumuşakça hızlanır
        if (!target) { if (!raf && !edge) return; } else if (!edge) {
          edge = true; cancelAnimationFrame(anim); carousel.classList.remove('animating'); carousel.classList.add('edge');
          pos = carousel.scrollLeft; vel = 0;
        }
        if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
      });
      carousel.addEventListener('pointerleave', () => { target = 0; });
    }

    // Otomatik oynatma (4 sn), üzerine gelince durur, ekranda değilken çalışmaz
    const every = parseFloat(carousel.dataset.autoplay) || 0;
    if (every && on('slider')) {
      let timer = null, visible = false, hover = false;
      const stop = () => { clearTimeout(timer); timer = null; };
      const arm = () => { stop(); if (visible && !hover) timer = setTimeout(() => { goTo(current + 1); arm(); }, ms(every)); };
      new IntersectionObserver((es) => { visible = es[0].isIntersecting; arm(); }).observe(carousel);
      carousel.addEventListener('mouseenter', () => { hover = true; stop(); });
      carousel.addEventListener('mouseleave', () => { hover = false; arm(); });
      // Dokunmatikte: parmak kartlara değdiği anda otomatik kayma durur ve çalışan kaydırma animasyonu iptal edilir (parmakla çakışıp titremesin)
      let resume = 0;
      carousel.addEventListener('touchstart', () => { hover = true; stop(); clearTimeout(resume); cancelAnimationFrame(anim); carousel.classList.remove('animating'); }, { passive: true });
      const touchDone = () => { clearTimeout(resume); resume = setTimeout(() => { hover = false; arm(); }, 4000); };
      carousel.addEventListener('touchend', touchDone, { passive: true });
      carousel.addEventListener('touchcancel', touchDone, { passive: true });
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
    // Web siteleri 3 sn'de bir sırayla değişir (üzerine gelince durmaz); uygulamalar biraz farklı ritimde, ikisi aynı anda değişmesin
    setInterval(() => { if (!document.hidden) show(cur + 1); }, 3000 + bi * 600);
  });

  // ---------- Ana sayfa: Ürün fotoğrafları kartı farklı çekimler arasında sırayla geçer ----------
  document.querySelectorAll('.show-photo.has-img').forEach((card) => {
    const imgs = [...card.querySelectorAll('.show-photo-img')];
    if (imgs.length < 2) return;
    let cur = 0;
    setInterval(() => { if (document.hidden) return; imgs[cur].classList.remove('on'); cur = (cur + 1) % imgs.length; imgs[cur].classList.add('on'); }, 3300);
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
  // Elemanın üstü ekranın %80'ine gelince; telefonda ekrana girer girmez (altı boş görünen bölüm 'yüklenmedi' izlenimi vermesin)
  const ROOT80 = matchMedia('(max-width: 700px)').matches ? '0px 0px 6% 0px' : '0px 0px -20% 0px';

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
    // <br> satır sonları korunur (textContent onları silip kelimeleri birleştirirdi)
    const srNodes = [...titleEl.children].filter((n) => n.classList.contains('sr-only')); // görünmez devam (arama motoru için) harflere bölünmez
    const text = [...titleEl.childNodes].filter((n) => !srNodes.includes(n)).map((n) => (n.nodeName === 'BR' ? String.fromCharCode(10) : n.textContent)).join('');
    titleEl.setAttribute('aria-label', (text + srNodes.map((n) => n.textContent).join('')).replace(/\s+/g, ' ').trim());
    titleEl.textContent = '';
    const letters = [];
    text.split(/(\s+)/).forEach((part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) { titleEl.append(part.includes(String.fromCharCode(10)) ? document.createElement('br') : ' '); return; }
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
    srNodes.forEach((n) => titleEl.append(n));
    titleEl.classList.add('ready');
    return letters;
  };

  // 1) Açılış: harfler boşluktan, bulanıklıktan sıyrılarak yavaşça belirir; sonra alt yazı, butonlar, sticker'lar ve kurdele
  if (introEl) {
    const run = () => {
      const letters = splitTitle();
      const quick = matchMedia('(max-width: 700px)').matches ? 0.55 : 1; // mobilde başlık ve altındakiler belirgin biçimde daha hızlı gelir
      const mobile = matchMedia('(max-width: 700px)').matches; // telefonda başlık harf efekti yok, doğrudan görünür
      (mobile ? [] : letters).forEach((l, i) => {
        const dx = ((rnd(i, 6) - 0.5) * 0.3).toFixed(3), dy = ((rnd(i, 7) - 0.5) * 0.3).toFixed(3);
        l.querySelector('.rc').animate([
          { opacity: 0, filter: 'blur(18px)', scale: 0.86, rotate: `${((rnd(i, 8) - 0.5) * 16).toFixed(1)}deg`, translate: `${dx}em ${dy}em` },
          { opacity: 1, filter: 'blur(0px)', scale: 1, rotate: '0deg', translate: '0em 0em' },
        ], { duration: ms(2.4 * quick), delay: ms((0.15 + rnd(i, 9) * 0.9) * quick), easing: 'cubic-bezier(.16, 1, .3, 1)', fill: 'both' });
      });

      const start = ms(0.6 * quick);
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
          s.animate([{ translate: '0 2em', opacity: 0 }, { translate: '0 0', opacity: 1 }], { duration: ms(1 * quick), delay: ms((1.5 + k * 0.3) * quick), easing: BOUNCE, fill: 'both' });
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
    // Yazı tipleri yavaş inen (mobil) bağlantıda başlık beklemesin: en geç 0,9 sn'de başlar; yazı tipi sonradan gelirse harf aralıkları yeniden hesaplanır
    const fr = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    const rekern = () => { if (!titleEl) return; titleEl.querySelectorAll('.rw').forEach((wd) => { const ls = [...wd.querySelectorAll('.rl')]; ls.forEach((n) => { n.style.marginLeft = ''; }); kernWord(wd, ls.map((n) => ({ node: n, ch: n.querySelector('.rc').textContent }))); }); };
    Promise.race([fr, new Promise((r) => setTimeout(r, 900))]).then(() => { run(); fr.then(rekern); });
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
    // Efekt katmanı 100x100 kutuda çizilir (jeton çizimi bu kutuya sığdırılmış)
    const bl = svgEl('ellipse', { cx: 27, cy: 55, rx: 6, ry: 3.8, fill: '#ff5d8f', opacity: 0 });
    const br = svgEl('ellipse', { cx: 74, cy: 53, rx: 6, ry: 3.8, fill: '#ff5d8f', opacity: 0 });
    g.append(bl, br);
    const hold = 2.3;
    [bl, br].forEach((x) => x.animate([{ opacity: 0 }, { opacity: 0.9, offset: 0.22 }, { opacity: 0.65, offset: 0.5 }, { opacity: 0.9, offset: 0.7 }, { opacity: 0 }], { duration: ms(hold), fill: 'forwards' }));
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
  // Anahtar: üzerine gelince sağında siyah bir anahtar deliği belirir; anahtar düzelip deliğe girer, çeyrek tur çevrilir (açma + klik), geri çıkar; delik kaybolur
  const unlockKey = (el) => {
    if (busy(el, ms(2.9))) return;
    const c = centerOf(el), rot = restRot(el), T = ms(2.7), W = parseFloat(getComputedStyle(el).width) || c.w;
    const hw = Math.max(9, W * 0.24), hh = hw * 1.55; // anahtardan küçük, dik duran delik
    const hx = c.x + Math.max(W * 0.8, 24); // deliğin merkezi: anahtarın sağında
    const hole = document.createElement('i');
    hole.className = 'key-hole';
    hole.style.cssText = 'left:' + (hx - hw / 2) + 'px;top:' + (c.y - hh / 2 + W * 0.12) + 'px;width:' + hw + 'px;height:' + hh + 'px'; // dik (ayakta) anahtar deliği
    hole.innerHTML = '<svg viewBox="0 0 20 30" width="100%" height="100%" aria-hidden="true"><path d="M10 2a6.4 6.4 0 0 1 3.1 12L16 28H4l2.9-14A6.4 6.4 0 0 1 10 2z" fill="#000"/></svg>';
    document.body.append(hole);
    hole.animate([{ scale: 0, opacity: 0 }, { scale: 1.2, opacity: 1, offset: 0.1 }, { scale: 1, opacity: 1, offset: 0.16 }, { scale: 1, opacity: 1, offset: 0.9 }, { scale: 0.5, opacity: 0 }], { duration: T, easing: 'ease-out' });
    // anahtar: düzelir (uç sağa bakar), deliğe kadar ilerler, deliğe girer, çevrilir, geri çıkar
    const tip = W * 0.4, into = hx - hw * 0.15 - (c.x + tip); // uç, deliğin içine kadar girer (deliğin arkasında kalır)
    const base = { rotate: rot, translate: '0px 0px', scale: '1 1' };
    const turn = (dx, sy) => ({ rotate: 'calc(' + rot + ' + 28deg)', translate: dx + 'px 0px', scale: '1 ' + sy });
    el.animate([
      base,
      { ...turn(0, 1), offset: 0.14 },
      { ...turn(into * 0.7, 1), offset: 0.34 },
      { ...turn(into, 1), offset: 0.44 },      // deliğe girdi
      { ...turn(into, 0.12), offset: 0.58 },   // çevrilir (yan görünüşe döner)
      { ...turn(into, 0.12), offset: 0.64 },   // klik
      { ...turn(into, 1), offset: 0.76 },      // geri döner
      { ...turn(into * 0.7, 1), offset: 0.84 },// dışarı çekilir
      { ...turn(0, 1), offset: 0.92 },
      base
    ], { duration: T, easing: 'ease-in-out' });
    setTimeout(() => sparks(hx, c.y, { n: 7, size: Math.max(9, W * 0.34), dist: Math.max(30, W * 1.1) }), T * 0.6);
    setTimeout(() => hole.remove(), T + 60);
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
  // Ayak ve iskarpin: efekt yok (yine de sayfa açılışındaki giriş animasyonunu alırlar, fare üstündeki tur atma uygulanmaz)
  const noFx = () => {};
  // Zincir: halkalar gerilir ve toplanır
  const pullLink = (el) => {
    if (busy(el, ms(1.4))) return;
    const rot = restRot(el);
    el.animate([{ scale: '1 1', rotate: rot }, { scale: '1.35 .85', rotate: rot, offset: 0.35 }, { scale: '.9 1.08', rotate: rot, offset: 0.65 }, { scale: '1 1', rotate: rot }], { duration: ms(1), easing: 'ease-in-out' });
  };
  // İş ortaklığı paneli: yıldız parlar, ev üstüne gelince panel geceye döner (dönme yok)
  const partnerFx = () => {
    const star = document.querySelector('.st-pstar'), house = document.querySelector('.st-pstore');
    const panel = house && house.closest('.partner');
    if (star) { star.addEventListener('mouseenter', () => star.classList.add('glow')); star.addEventListener('mouseleave', () => star.classList.remove('glow')); }
  };
  partnerFx();
  // İş ortaklığı paneli site temasını izler: site geceyse panel de gece (ev üstüne gelince gündüzde de gece olur)
  const ptPanel = document.querySelector('.partner');
  if (ptPanel) {
    let hov = false;
    const sync = () => ptPanel.classList.toggle('night', hov || document.documentElement.dataset.theme === 'night');
    const hs = ptPanel.querySelector('.st-pstore');
    if (hs) { hs.addEventListener('mouseenter', () => { hov = true; sync(); }); hs.addEventListener('mouseleave', () => { hov = false; sync(); }); }
    new MutationObserver(sync).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    sync();
  }
  const CLICKS = {
    'st-pstar': noFx, 'st-pstore': noFx,
    'st-camera': shootPhoto, 'st-anahtar': unlockKey, 'st-coin': shyFace, 'st-check': tickCheck, 'st-star': sparkleStar,
    'st-pin': dropPin, 'st-truck': driveTruck, 'st-medal': spinMedal, 'st-heart': burstOf('heart'), 'st-chat': burstOf('star'), 'st-palette': paintPalette, 'st-box': openBox,
    'st-product': uncap('product'), 'st-bottle': uncap('bottle'), 'st-magnifier': zoomLens, 'st-pencil': writePencil, 'st-globe': spinMedal, 'st-gear': turnGear, 'st-key': spinMedal, 'st-refresh': turnGear, 'st-rocket': flyRocket, 'st-signpost': swingSign, 'st-chart': fillBars, 'st-browser': fillBrowser, 'st-map': foldMap, 'st-store': burstOf('coin'), 'st-vitrin': waveShop, 'st-cursor': clickCursor, 'st-foot': noFx, 'st-shoe': noFx, 'st-sock': noFx, 'st-code': writeCode, 'st-phone': loadPhone, 'st-layers': fanLayers, 'st-type': bounceType, 'st-bag': swingBag, 'st-tag': swingTag, 'st-bulb': lightBulb, 'st-cart': rollCart, 'st-link': pullLink, 'st-sliders': slideKnobs, 'st-photo': sunset, 'st-grid': fillGrid,
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

  // Süreç yol haritası: görününce çizgi çizilir, adımlar sırayla gelir
  const rmIo = onceAt(ROOT80, (el) => el.classList.add('on'));
  document.querySelectorAll('[data-roadmap]').forEach((el) => rmIo.observe(el));

  // Hizmetler: "Neler yapıyoruz?" düğmesi kutunun ayrıntılarını açar/kapatır
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.svc-toggle');
    if (!b) return;
    const card = b.closest('.svc-card');
    const open = !card.classList.contains('open');
    card.classList.toggle('open', open);
    b.setAttribute('aria-expanded', String(open));
  });

  // Ürün çekimi: sektör kartına tıklayınca fotoğraf penceresi açılır
  document.addEventListener('click', (e) => {
    const o = e.target.closest('[data-wp-open]');
    if (o) { const d = document.getElementById(o.dataset.wpOpen); if (d && d.showModal) d.showModal(); return; }
    if (e.target.closest('[data-wp-close]')) { const d = e.target.closest('dialog'); if (d) d.close(); return; }
    if (e.target.classList && e.target.classList.contains('wp-dialog')) e.target.close();
  });

  // Ürün çekimi: pencere içindeki fotoğrafa tıklayınca büyür; oklar ve klavye ile gezilir
  (() => {
    let light = null, list = [], idx = 0;
    const build = () => {
      light = document.createElement('dialog');
      light.className = 'wp-light';
      light.setAttribute('aria-label', 'Fotoğraf');
      light.innerHTML = '<button type="button" class="wp-light-x label" data-l="x" aria-label="Kapat">Kapat ×</button><button type="button" class="wp-light-a prev" data-l="p" aria-label="Önceki">‹</button><figure><img alt=""><figcaption class="label"></figcaption></figure><button type="button" class="wp-light-a next" data-l="n" aria-label="Sonraki">›</button>';
      document.body.appendChild(light);
      light.addEventListener('click', (e) => {
        const t = e.target.closest('[data-l]');
        if (t) { const k = t.dataset.l; if (k === 'x') light.close(); else show(idx + (k === 'n' ? 1 : -1)); return; }
        if (e.target === light || e.target.tagName === 'FIGURE') light.close();
      });
      light.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') show(idx + 1); else if (e.key === 'ArrowLeft') show(idx - 1);
      });
    };
    const show = (i) => {
      idx = (i + list.length) % list.length;
      const f = list[idx];
      const im = f.querySelector('img'), cap = f.querySelector('figcaption');
      light.querySelector('img').src = im.currentSrc || im.src;
      light.querySelector('img').alt = im.alt;
      light.querySelector('figcaption').textContent = (cap ? cap.textContent : '') + '  ·  ' + (idx + 1) + ' / ' + list.length;
    };
    document.addEventListener('click', (e) => {
      const f = e.target.closest('.wp-dialog .wp-gallery figure');
      if (!f) return;
      if (!light) build();
      list = [...f.closest('.wp-gallery').querySelectorAll('figure')];
      show(list.indexOf(f));
      light.showModal();
    });
  })();

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
      window.__lenis = lenis;
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

// İş ortaklığı: sağdaki açıklama kelime kelime sarılır (üstüne gelince her kelime yeşil olur)
document.querySelectorAll('.partner .pt-text').forEach((p) => {
  const walk = (node) => [...node.childNodes].forEach((n) => {
    if (n.nodeType === 3) {
      const frag = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.append(document.createTextNode(' ')); return; }
        const s = document.createElement('span'); s.className = 'pw'; s.textContent = part; frag.append(s);
      });
      n.replaceWith(frag);
    } else if (n.nodeType === 1) walk(n);
  });
  walk(p);
});

// Gece / gündüz teması: seçim tarayıcıda saklanır, ilk açılışta cihaz ayarına bakılır
(() => {
  const btn = document.getElementById('themeBtn');
  if (!btn) return;
  const root = document.documentElement;
  btn.setAttribute('aria-pressed', root.dataset.theme === 'night' ? 'true' : 'false');
  btn.addEventListener('click', () => {
    const night = root.dataset.theme !== 'night';
    if (night) root.setAttribute('data-theme', 'night'); else root.removeAttribute('data-theme');
    btn.setAttribute('aria-pressed', night ? 'true' : 'false');
    try { localStorage.setItem('goatz-tema', night ? 'night' : 'day'); } catch (e) { /* kayıt yoksa sorun değil */ }
  });
})();

// Gece teması: okunmayan yazıları bulup düzeltir (açık renkli kartta siyah, koyu zeminde açık yazı)
(() => {
  const root = document.documentElement;
  const lum = (c) => { const m = c.match(/[0-9.]+/g); if (!m) return 0; const k = c.startsWith('color(') ? 255 : 1; const [r, g, b] = m.slice(0, 3).map((v) => { v = v * k / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const bgOf = (e) => { while (e) { const b = getComputedStyle(e).backgroundColor; const m = b.match(/[0-9.]+/g); if (m && (m.length < 4 || +m[3] > 0.5)) return b; e = e.parentElement; } return 'rgb(0,0,0)'; };
  const clear = () => document.querySelectorAll('[data-nt]').forEach((e) => { e.style.color = ''; e.removeAttribute('data-nt'); });
  let timer = 0;
  const scan = () => {
    clear();
    if (root.dataset.theme !== 'night') return;
    document.querySelectorAll('body *').forEach((e) => {
      if (e.closest('.sr-only, script, style, svg') || ![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) return;
      const s = getComputedStyle(e);
      if (s.display === 'none' || s.visibility === 'hidden') return;
      const a = lum(s.color), bg = lum(bgOf(e));
      if ((Math.max(a, bg) + 0.05) / (Math.min(a, bg) + 0.05) >= 3) return;
      e.style.color = bg > 0.3 ? '#000' : '#f4f1e8';
      e.setAttribute('data-nt', '');
    });
  };
  const later = () => { if (!timer) timer = setTimeout(() => { timer = 0; scan(); }, 400); }; // sürekli değişen sayaç taramayı hiç geciktirmesin
  new MutationObserver((m) => { if (m.some((x) => x.type === 'childList' && !(x.target.closest && x.target.closest('.ns, .wz-timer')))) later(); }).observe(document.body, { childList: true, subtree: true });
  document.getElementById('themeBtn')?.addEventListener('click', () => setTimeout(scan, 600));
  window.addEventListener('load', () => setTimeout(scan, 600));
})();

// Gece teması: koyu panellerin tamamında (ikas bölümündeki gibi) parıldayan yıldızlar.
// Yıldızlar kartların arkasında kalmasın diye yalnız boş zemin alanlarına dağıtılır.
(() => {
  const panels = [...document.querySelectorAll('.panel[style*="var(--paper)"], .panel[style*="var(--sky)"], .site-footer')].filter((p) => !p.classList.contains('partner'));
  const alphaOf = (c) => { const m = c.match(/[0-9.]+/g); return m ? (m.length < 4 ? 1 : +m[3]) : 0; };
  const fill = (p) => {
    let sky = p.querySelector(':scope > .ns');
    if (!sky) { sky = document.createElement('div'); sky.className = 'ns'; sky.setAttribute('aria-hidden', 'true'); p.prepend(sky); }
    sky.querySelectorAll(':scope > b').forEach((b) => b.remove()); // yalnız yıldızlar yenilenir (gemiler ve gezegenler kalır)
    const pr = p.getBoundingClientRect();
    if (pr.width < 50 || pr.height < 50) return;
    const covers = [...p.querySelectorAll('*')].filter((e) => !e.closest('.ns') && !e.closest('svg') && alphaOf(getComputedStyle(e).backgroundColor) > 0.5).map((e) => e.getBoundingClientRect()).filter((r) => r.width > 40 && r.height > 30);
    const free = (x, y) => !covers.some((r) => x > r.left - pr.left - 10 && x < r.right - pr.left + 10 && y > r.top - pr.top - 10 && y < r.bottom - pr.top + 10);
    const want = Math.max(8, Math.min(30, Math.round((pr.width * pr.height) / 30000)));
    let seed = 7 + Math.round(pr.height);
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    let placed = 0;
    for (let t = 0; t < want * 25 && placed < want; t++) {
      const x = rnd() * (pr.width - 16), y = rnd() * (pr.height - 16);
      if (!free(x, y)) continue;
      const b = document.createElement('b');
      const big = rnd() < 0.3;
      b.style.cssText = `left:${x.toFixed(0)}px;top:${y.toFixed(0)}px;width:${big ? 18 : 11}px;height:${big ? 18 : 11}px;animation-delay:${(-rnd() * 2.4).toFixed(2)}s;animation-duration:${(1.4 + rnd() * 1.2).toFixed(2)}s`;
      sky.append(b);
      placed++;
    }
  };
  const all = () => panels.forEach(fill);
  let t = 0;
  const later = () => { clearTimeout(t); t = setTimeout(all, 400); };
  window.addEventListener('load', () => setTimeout(all, 1200));
  window.addEventListener('resize', later);
  panels.forEach((p) => { const sky = document.createElement('div'); sky.className = 'ns'; sky.setAttribute('aria-hidden', 'true'); p.prepend(sky); });
})();

// Gece teması: ana sayfa kahraman bölümünün tepesinde ay. Tıklayınca gerçek bir küre gibi (yüzey soldan sağa kayarak, kenarlarda sıkışarak) yavaşça döner.
(() => {
  const hero = location.pathname === '/' && document.querySelector('[data-intro]') && document.querySelector('.panel.hero');
  if (!hero) return;
  const moon = document.createElement('i');
  moon.className = 'ns-moon';
  moon.setAttribute('aria-hidden', 'true');
  const cv = document.createElement('canvas');
  moon.append(cv);
  hero.append(moon);

  // Yüzey dokusu (düz harita, yatayda kesintisiz): deniz düzlükleri, kraterler, ışınlı Tycho
  const TW = 512, TH = 256;
  let seed = 11;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const texSvg = () => {
    const x3 = (x) => [x - TW, x, x + TW];
    let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${TW}" height="${TH}" viewBox="0 0 ${TW} ${TH}"><defs><filter id="b" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="7"/></filter><filter id="b2"><feGaussianBlur stdDeviation="1.1"/></filter></defs><rect width="${TW}" height="${TH}" fill="#ecebe2"/>`;
    s += '<g filter="url(#b)" fill="#7d8085" opacity=".62">';
    [[150, 90, 70, 40, -18], [250, 80, 44, 28, 8], [330, 125, 60, 34, 0], [120, 150, 46, 56, 14], [210, 140, 40, 22, 25], [420, 100, 50, 30, 0], [40, 120, 42, 30, 0], [290, 175, 36, 18, 0]].forEach(([x, y, rx, ry, a]) => { x3(x).forEach((xx) => { s += `<ellipse cx="${xx}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(${a} ${xx} ${y})"/>`; }); });
    s += '</g><g filter="url(#b2)">';
    for (let i = 0; i < 150; i++) {
      const x = rnd() * TW, y = 16 + rnd() * (TH - 32), rad = 1.8 + rnd() * rnd() * 9, big = rad > 6;
      x3(x).forEach((xx) => { s += `<circle cx="${xx.toFixed(1)}" cy="${y.toFixed(1)}" r="${rad.toFixed(1)}" fill="#6c6f74" fill-opacity=".4" stroke="#fff" stroke-opacity=".55" stroke-width="${big ? 1.8 : 1}"/><circle cx="${(xx + rad * 0.25).toFixed(1)}" cy="${(y + rad * 0.25).toFixed(1)}" r="${(rad * 0.55).toFixed(1)}" fill="#5c5f64" fill-opacity=".25"/>`; });
    }
    s += '</g>';
    const tx = 256, ty = 205;
    s += '<g stroke="#fff" stroke-opacity=".5" stroke-linecap="round">';
    for (let i = 0; i < 18; i++) { const a = rnd() * Math.PI * 2, l = 30 + rnd() * 60; s += `<line x1="${tx}" y1="${ty}" x2="${(tx + Math.cos(a) * l).toFixed(1)}" y2="${(ty + Math.sin(a) * l).toFixed(1)}" stroke-width="${(1 + rnd() * 1.6).toFixed(1)}"/>`; }
    s += `</g><circle cx="${tx}" cy="${ty}" r="6" fill="#fff" fill-opacity=".9"/><circle cx="${tx}" cy="${ty}" r="3" fill="#777" fill-opacity=".5"/></svg>`;
    return s;
  };

  let tex = null, px = null, N = 0, size = 0, lonA, rowA, shadeA, rot = 0, speed = 0, running = false, spinning = false, last = 0;
  const ctx = cv.getContext('2d');
  // Her piksel için küre üzerindeki boylam, enlem satırı ve ışık payı bir kez hesaplanır
  const setup = () => {
    size = Math.max(40, Math.round(moon.clientWidth * Math.min(devicePixelRatio || 1, 2)));
    cv.width = size; cv.height = size;
    N = size * size;
    lonA = new Float32Array(N); rowA = new Int16Array(N).fill(-1); shadeA = new Float32Array(N);
    const L = [0, 0, 1], ll = 1; // ışık tam karşıdan: bize bakan yüz aydınlık, kenarlar ve arka taraf karanlık
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const nx = ((x + 0.5) / size) * 2 - 1, ny = ((y + 0.5) / size) * 2 - 1, r2 = nx * nx + ny * ny;
      if (r2 > 1) continue;
      const nz = Math.sqrt(1 - r2), i = y * size + x;
      lonA[i] = Math.atan2(nx, nz);
      rowA[i] = Math.min(TH - 1, Math.floor((Math.asin(ny) / Math.PI + 0.5) * TH));
      const lam = Math.max(0, (nx * L[0] + ny * L[1] + nz * L[2]) / ll);
      shadeA[i] = 0.08 + 0.92 * Math.pow(lam, 1.15);
    }
    px = ctx.createImageData(size, size);
    draw();
  };
  const draw = () => {
    if (!tex || !px) return;
    const d = px.data, T = tex.data, k = TW / (Math.PI * 2);
    for (let i = 0; i < N; i++) {
      const row = rowA[i], o = i * 4;
      if (row < 0) { d[o + 3] = 0; continue; }
      let u = ((lonA[i] + rot) * k) % TW; if (u < 0) u += TW;
      const t = (row * TW + (u | 0)) * 4, sh = shadeA[i];
      d[o] = T[t] * sh; d[o + 1] = T[t + 1] * sh; d[o + 2] = T[t + 2] * sh; d[o + 3] = 255;
    }
    ctx.putImageData(px, 0, 0);
  };
  const frame = (now) => {
    const dt = Math.min(0.1, (now - last) / 1000 || 0); last = now;
    speed += ((spinning ? 0.09 : 0) - speed) * Math.min(1, dt * 0.8); // yavaş hızlanır, yavaş durur
    rot += speed * dt;
    draw();
    if (spinning || speed > 0.002) requestAnimationFrame(frame); else running = false;
  };
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas'); c.width = TW; c.height = TH;
    const cc = c.getContext('2d'); cc.drawImage(img, 0, 0);
    tex = cc.getImageData(0, 0, TW, TH);
    setup();
  };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(texSvg());
  if (window.ResizeObserver) new ResizeObserver(() => { if (moon.clientWidth && Math.abs(moon.clientWidth * Math.min(devicePixelRatio || 1, 2) - size) > 2 && tex) setup(); }).observe(moon);
  // Tıklayınca dönmeye başlar, tekrar tıklayınca yavaşça durur
  moon.addEventListener('click', () => { spinning = !spinning; if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); } });
})();

// Gece teması: arka planda yaşayan bir evren: gemiler gezer, filolar çatışır (salvolar, it dalaşı, ana gemi bombardımanı), gezegenler geçer; gemiye tıklayınca patlar.
// Yön, zamanlama ve yer her seferinde rastgele (her yöne uçarlar); yalnız gece modunda, görünen panellerde çalışır.
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const root = document.documentElement;
  const COLORS = ['#55db9c', '#e9ccff', '#ffd731', '#fb4903', '#4da2ff', '#fff6c8'];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const DEG = 180 / Math.PI;

  // Yedi farklı mini mekik (üstten görünüm, sağa bakar). Her biri başka silüet: avcı, ikiz panelli, destroyer, kargo diski, mekik, kanatlı ve ok biçimli
  const GREY = ['#b9bcc4', '#9aa0aa', '#d9dce3'];
  const DESIGNS = [
    // 0 Gunship: kalın zırhlı gövde, yan kapsüller, ön toplar, arkada parlayan motor bloğu
    (c) => ({ w: 38, svg: '<svg viewBox="0 0 32 20" width="38" height="24"><rect x="4" y="4.5" width="20" height="11" rx="4" fill="#cfd3dc"/><rect x="4" y="4.5" width="20" height="3.6" rx="3" fill="#ffffff55"/><path d="M24 6.5h6l1.5 1.2v4.6L30 13.5h-6z" fill="#9aa0aa"/><rect x="26" y="7" width="5.5" height="1.5" fill="' + c + '"/><rect x="26" y="11.5" width="5.5" height="1.5" fill="' + c + '"/><rect x="1" y="5" width="4" height="10" rx="1.5" fill="#6f7580"/><rect x="0" y="6.2" width="2.2" height="2.6" rx="1" fill="#8fd3ff"/><rect x="0" y="11.2" width="2.2" height="2.6" rx="1" fill="#8fd3ff"/><path d="M8 4.5v11M20 4.5v11" stroke="#9aa0aa" stroke-width=".6"/><circle cx="15" cy="10" r="3.2" fill="#12163a"/><circle cx="15" cy="10" r="1.5" fill="#8fd3ff"/><rect x="9" y="1.4" width="4.4" height="3.2" rx="1.2" fill="' + c + '"/><rect x="9" y="15.4" width="4.4" height="3.2" rx="1.2" fill="' + c + '"/></svg>' }),
    // 1 TIE tipi: yuvarlak gövde, iki büyük altıgen panel
    (c) => ({ w: 26, svg: '<svg viewBox="0 0 32 20" width="26" height="16"><path d="M10 0.6h10l2.4 3.4-2.4 3H10l-2.4-3z" fill="#4a4e5c"/><path d="M10 19.4h10l2.4-3.4-2.4-3H10l-2.4 3z" fill="#4a4e5c"/><path d="M10 0.6l5 3.4 5-3.4M10 19.4l5-3.4 5 3.4" fill="none" stroke="#2a2d38" stroke-width=".7"/><rect x="14" y="6" width="2" height="8" fill="#6f7580"/><circle cx="15" cy="10" r="4.6" fill="#9097a4"/><circle cx="15" cy="10" r="2.5" fill="#12163a"/><path d="M12.5 10h5M15 7.5v5" stroke="#4a4e5c" stroke-width=".7"/><circle cx="15" cy="10" r="1" fill="' + c + '"/></svg>' }),
    // 2 Yıldız destroyeri: uzun hançer gövde, köprü kulesi (ana gemi)
    (c, g) => ({ w: 160, svg: '<svg viewBox="0 0 32 20" width="160" height="100"><path d="M1 3L31 10 1 17 3.5 10z" fill="' + g + '"/><path d="M3.5 10L31 10 1 17z" fill="#00000026"/><path d="M5 10H27" stroke="#ffffff40" stroke-width=".6"/><path d="M7 6.6L23 9.3M7 13.4L23 10.7M10 5.4L21 8.6M10 14.6L21 11.4" stroke="#00000030" stroke-width=".5"/><rect x="2.6" y="7.2" width="5" height="5.6" rx=".8" fill="#7a808b"/><rect x="3.4" y="5.8" width="1.4" height="1.6" fill="#c7cbd3"/><rect x="5.6" y="5.8" width="1.4" height="1.6" fill="#c7cbd3"/><rect x="3.4" y="12.6" width="1.4" height="1.6" fill="#c7cbd3"/><rect x="5.6" y="12.6" width="1.4" height="1.6" fill="#c7cbd3"/><circle cx="1.6" cy="7.6" r=".9" fill="#8fd3ff"/><circle cx="1.6" cy="10" r=".9" fill="#8fd3ff"/><circle cx="1.6" cy="12.4" r=".9" fill="#8fd3ff"/></svg>' }),
    // 3 Disk kargo gemisi (iki çatallı ön, yandan kokpit tüpü)
    (c) => ({ w: 34, svg: '<svg viewBox="0 0 32 20" width="34" height="21"><path d="M21 4.2L31 6.4v2.6L22.4 8.8zM21 15.8L31 13.6v-2.6L22.4 11.2z" fill="#b9bcc4"/><circle cx="14" cy="10.4" r="8.6" fill="#d3d6dd"/><rect x="14" y="0.4" width="10" height="2.6" rx="1.3" fill="#b9bcc4"/><circle cx="23" cy="1.7" r="1.1" fill="#12163a"/><circle cx="12" cy="10.4" r="3.2" fill="#9aa0aa"/><path d="M5 10.4h4M13 3.4v3.2M13 14.2v3.2" stroke="#8d929b" stroke-width=".8"/><rect x="9" y="14.6" width="5" height="1.6" fill="' + c + '"/><rect x="3.4" y="7.4" width="1.2" height="6" fill="#8fd3ff"/></svg>' }),
    // 4 Çekiç başlı: uzun gövde, küre komuta modülü, motor halkası
    (c) => ({ w: 40, svg: '<svg viewBox="0 0 32 20" width="40" height="25"><rect x="2" y="8.4" width="20" height="3.2" rx="1.6" fill="#9aa0aa"/><circle cx="24" cy="10" r="6.5" fill="#d9dce3"/><circle cx="24" cy="10" r="6.5" fill="none" stroke="#9aa0aa" stroke-width="1"/><path d="M19.4 5.4a7 7 0 0 0 0 9.2" fill="none" stroke="#8d929b" stroke-width=".8"/><ellipse cx="25.8" cy="10" rx="2.8" ry="2" fill="#12163a"/><rect x="0.5" y="6" width="4" height="8" rx="2" fill="#6f7580"/><rect x="0" y="7.6" width="2" height="4.8" rx="1" fill="#8fd3ff"/><circle cx="12" cy="10" r="1.8" fill="' + c + '"/></svg>' }),
    // 5 İkiz kapsüllü nakliye: iki büyük kapsül, bağlantı kirişi, küre kabin
    (c) => ({ w: 38, svg: '<svg viewBox="0 0 32 20" width="38" height="24"><rect x="3" y="1.5" width="22" height="5.5" rx="2.7" fill="#cfd3dc"/><rect x="3" y="13" width="22" height="5.5" rx="2.7" fill="#cfd3dc"/><rect x="12" y="6" width="3" height="8" fill="#9aa0aa"/><circle cx="26" cy="10" r="4.4" fill="#e9e9ee"/><circle cx="27" cy="10" r="2" fill="#12163a"/><rect x="1" y="2.4" width="3.4" height="3.6" rx="1.2" fill="#8fd3ff"/><rect x="1" y="14" width="3.4" height="3.6" rx="1.2" fill="#8fd3ff"/><rect x="8" y="3" width="5" height="2.4" rx="1.2" fill="' + c + '"/><rect x="8" y="14.6" width="5" height="2.4" rx="1.2" fill="' + c + '"/></svg>' }),
    // 6 Ok başlı keşif gemisi: kalın altıgen gövde, parlayan motor, kokpit camı
    (c) => ({ w: 32, svg: '<svg viewBox="0 0 32 20" width="32" height="20"><path d="M31 10L12 2.5 3 5.5v9l9 3z" fill="' + c + '"/><path d="M31 10L12 2.5V10z" fill="#ffffff44"/><path d="M3 5.5L1 7v6l2 1.5z" fill="#6f7580"/><rect x="0" y="7.4" width="1.8" height="5.2" fill="#8fd3ff"/><path d="M9 7h12M9 13h12" stroke="#00000033" stroke-width=".8"/><ellipse cx="19" cy="10" rx="3.2" ry="1.9" fill="#12163a"/></svg>' }),
    // 7 Korvet: yuvarlak gövdeli kırmızı çizgili ana gemi (çekiç başlı)
    (c) => ({ w: 124, svg: '<svg viewBox="0 0 32 20" width="124" height="78"><path d="M2 5.8h21l7.4 4.2-7.4 4.2H2z" fill="#eceef3"/><path d="M2 8.4h22" stroke="' + c + '" stroke-width="1.6"/><path d="M2 11.6h22" stroke="#cfd3dc" stroke-width=".7"/><rect x="0.8" y="4.6" width="3.2" height="10.8" rx="1.2" fill="#9aa0aa"/><rect x="1.4" y="5.6" width="1.6" height="2" fill="#8fd3ff"/><rect x="1.4" y="12.4" width="1.6" height="2" fill="#8fd3ff"/><path d="M20 6.4l5 3.6-5 3.6z" fill="#cfd3dc"/><circle cx="16" cy="10" r="1.3" fill="#12163a"/><rect x="9" y="3.6" width="6" height="2" rx=".8" fill="#b9bcc4"/><rect x="9" y="14.4" width="6" height="2" rx=".8" fill="#b9bcc4"/></svg>' }),
    // 8 Taşıyıcı: uzun ana gemi, hangar bölmeleri, arka motor bloğu ve köprü kulesi
    (c, g) => ({ w: 176, svg: '<svg viewBox="0 0 32 20" width="176" height="110"><path d="M1 4h22l8 6-8 6H1z" fill="' + g + '"/><path d="M1 4h22l8 6H1z" fill="#ffffff26"/><rect x="5.4" y="6.2" width="14" height="7.6" rx="1" fill="#2a2d38"/><path d="M6.4 8h12M6.4 10h12M6.4 12h12" stroke="#8fd3ff" stroke-width=".7"/><path d="M9 4.2V6M13 4.2V6M17 4.2V6M9 14V15.8M13 14V15.8M17 14V15.8" stroke="#00000040" stroke-width=".6"/><rect x="0.6" y="2.6" width="4.6" height="14.8" rx="1.2" fill="#6f7580"/><rect x="1.2" y="3.6" width="2.2" height="2.4" fill="#8fd3ff"/><rect x="1.2" y="8.8" width="2.2" height="2.4" fill="#8fd3ff"/><rect x="1.2" y="14" width="2.2" height="2.4" fill="#8fd3ff"/><rect x="2.6" y="0.6" width="2.6" height="2.2" rx=".6" fill="#c7cbd3"/><rect x="2.6" y="17.2" width="2.6" height="2.2" rx=".6" fill="#c7cbd3"/><rect x="21" y="8.2" width="6" height="3.6" fill="' + c + '"/></svg>' }),
  ];
  const shipSvg = (kind, col) => DESIGNS[kind](col, pick(GREY));

  // Mekik uçtuğu yöne bakar
  const makeShip = (host, kind, col, heading) => {
    const s = document.createElement('i');
    s.className = 'ns-ship';
    const d = shipSvg(kind, col);
    s.innerHTML = '<u class="ns-trail"></u><span class="ns-wob"><u class="ns-fl"></u>' + d.svg + '</span>';
    s.style.cssText = `left:0;top:0;rotate:${heading * DEG}deg;width:${d.w}px`;
    host.append(s);
    return { s, w: d.w };
  };

  // ── Evren: iki taraf (0 yeşil/sarı, 1 kırmızı/turuncu) + tarafsız (2). Tüm gemiler tek döngüde hareket eder ──
  const TEAM = [
    { col: ['#55db9c', '#ffd731', '#4da2ff', '#fff6c8'], bolt: '#7dffb8' },
    { col: ['#fb4903', '#e9ccff', '#ff7a45'], bolt: '#ff4b2b' },
    { col: COLORS, bolt: '#fff6c8' },
  ];
  const BOLT_V = 430; // mermi hızı (px/sn)
  const fl = []; // canlı gemiler
  const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  // Uzaya özgü dönüş: gemi önce yavaşça dönmeye başlar (açısal ivme), hedef yöne yaklaşırken yavaşlar ve durur; düz gidiyorsa hiç yalpalamaz
  const turnTo = (f, want, wmax, dt) => {
    const wd = clamp(angDiff(want, f.h) * 1.4, -wmax, wmax);
    f.om = (f.om || 0) + clamp(wd - (f.om || 0), -1.1 * dt, 1.1 * dt); // f.w gemi genişliği: açısal hız f.om
    f.h += f.om * dt;
  };
  const C = (f) => [f.x + f.w / 2, f.y + f.hh / 2];
  // 3 boyut: z -1 (uzak, küçük, soluk) ... +1 (yakın, büyük, parlak). Yakın gemiler ekranda hızlı, uzaklar yavaş akar; üçüncü eksende de giderler
  const zs = (z) => 1 + 0.5 * z;

  const shotEl = (host, x, y, ux, uy, dist, col, s0, s1, done) => {
    const l = document.createElement('i');
    l.className = 'ns-shot';
    l.style.cssText = `left:${x}px;top:${y}px;background:${col};color:${col};rotate:${Math.atan2(uy, ux) * DEG}deg`;
    host.append(l);
    l.animate([{ translate: '0 0', scale: s0 }, { translate: `${ux * dist}px ${uy * dist}px`, scale: s1 }], { duration: (dist / BOLT_V) * 1000, easing: 'linear' }).finished.then(() => { l.remove(); if (done) done(); }, () => l.remove());
  };
  const boom = (host, x, y, s = 1) => {
    const f = document.createElement('i');
    f.className = 'ns-boom';
    f.style.cssText = `left:${x}px;top:${y}px`;
    host.append(f);
    f.animate([{ scale: 0.2 * s, opacity: 1 }, { scale: 1.6 * s, opacity: 0 }], { duration: 600 + s * 150, easing: 'ease-out' }).finished.then(() => f.remove(), () => f.remove());
    const n = Math.round(5 + s * 3);
    for (let i = 0; i < n; i++) {
      const p = document.createElement('i');
      p.className = 'ns-spark';
      p.style.cssText = `left:${x}px;top:${y}px`;
      host.append(p);
      const a = (i / n) * Math.PI * 2 + rnd(0, 0.5), d = rnd(10, 22) * s;
      p.animate([{ translate: '0 0', opacity: 1 }, { translate: `${Math.cos(a) * d}px ${Math.sin(a) * d}px`, opacity: 0 }], { duration: 650, easing: 'ease-out' }).finished.then(() => p.remove(), () => p.remove());
    }
  };

  const die = (f, byClick) => {
    if (f.dead) return;
    f.dead = true;
    const i = fl.indexOf(f); if (i >= 0) fl.splice(i, 1);
    const [cx, cy] = C(f);
    if (f.big) {
      for (let k = 0; k < 6; k++) setTimeout(() => { if (f.host.isConnected) boom(f.host, cx + rnd(-f.w * 0.4, f.w * 0.4), cy + rnd(-8, 8), rnd(0.8, 1.6)); }, k * 160);
    } else boom(f.host, cx, cy, (byClick ? 1.5 : 1) * zs(f.z));
    f.el.remove();
  };
  const hit = (t, px, py, zAim) => {
    if (t.dead) return;
    const [cx, cy] = C(t);
    if (Math.abs(t.z - zAim) > 0.3 || Math.hypot(cx - px, cy - py) > (t.big ? t.w * 0.5 : 15) * zs(t.z)) return; // ıskaladı (başka derinlikten geçti)
    t.hp -= 1;
    boom(t.host, px, py, 0.35);
    if (t.hp <= 0) die(t);
  };
  const nearest = (f, range) => {
    let best = null, bd = range || 1e9;
    for (const o of fl) {
      if (o === f || o.dead || o.team > 1 || o.team === f.team || o.host !== f.host) continue;
      const [ax, ay] = C(f), [bx, by] = C(o), d = Math.hypot(ax - bx, ay - by) + Math.abs(f.z - o.z) * 140;
      if (d < bd) { bd = d; best = o; }
    }
    return best;
  };
  // Gelen mermiden kaçış: çevik küçük gemiler mermiye dik yönde ani yan kayış + varil dönüşü yapar; büyük/yavaş olanlar ve geç kalanlar kaçamaz, payını alır
  const warn = (t, ux, uy, tt) => {
    if (t.dead || t.big || t.dodgeCd > 0 || tt < 0.3 || t.cur < 0.4) return;
    if (Math.random() > (t.mode === 'dog' ? 0.75 : 0.55)) return; // her gemi zamanında fark edemez
    const side = Math.random() < 0.5 ? -1 : 1;
    t.dodge = { t: 0.55, T: 0.55, nx: -uy * side, ny: ux * side, mag: rnd(70, 110) };
    t.dodgeCd = rnd(1.2, 2.2);
    const w = t.el.querySelector('.ns-wob');
    if (w) w.animate([{ transform: 'scaleY(1)' }, { transform: 'scaleY(-1)', offset: 0.5 }, { transform: 'scaleY(1)' }], { duration: 550, easing: 'ease-in-out' });
  };
  // Yan yana çift mermi (salvo): büyük gemiler gövdesinden art arda, küçükler burnundan
  const volley = (f, t) => {
    if (f.dead || t.dead) return;
    const [cx, cy] = C(f), [tx, ty] = C(t);
    const tt = Math.hypot(tx - cx, ty - cy) / BOLT_V;
    const px = tx + t.vx * zs(t.z) * tt + rnd(-9, 9), py = ty + t.vy * zs(t.z) * tt + rnd(-9, 9), zAim = clamp(t.z + t.vz * tt, -1, 1);
    const a = Math.atan2(py - cy, px - cx), ux = Math.cos(a), uy = Math.sin(a), nx = -uy, ny = ux;
    warn(t, ux, uy, Math.hypot(px - cx, py - cy) / BOLT_V);
    const hx = Math.cos(f.h), hy = Math.sin(f.h), along = f.big ? rnd(-f.w * 0.35, f.w * 0.35) : f.w * 0.45;
    const sc0 = zs(f.z), sx = cx + hx * along * sc0, sy = cy + hy * along * sc0, dist = Math.hypot(px - sx, py - sy);
    [-1, 1].forEach((side, k) => { const off = side * (f.big ? 4 : 3); shotEl(f.host, sx + nx * off, sy + ny * off, ux, uy, dist, TEAM[f.team].bolt, sc0, zs(zAim), k ? () => hit(t, px, py, zAim) : null); });
  };
  const salvo = (f, t) => {
    const n = f.big ? 3 : (Math.random() < 0.5 ? 2 : 1);
    for (let k = 0; k < n; k++) setTimeout(() => volley(f, t), k * 120);
  };

  let running = false, last = 0;
  const loop = (now) => {
    const dt = Math.min(0.1, (now - last) / 1000 || 0); last = now;
    if (root.dataset.theme !== 'night') { fl.splice(0).forEach((f) => f.el.remove()); running = false; return; }
    for (let i = fl.length - 1; i >= 0; i--) {
      const f = fl[i];
      if (!f.el.isConnected || !f.host.isConnected) { f.el.remove(); fl.splice(i, 1); continue; }
      f.age += dt;
      if (f.mode === 'dog') {
        if (f.age > f.dogLife) { f.mode = 'cruise'; f.plan = { t: rnd(3, 6), want: 1, ht: f.h, t0: 0 }; f.box = null; f.keep = false; f.speed *= 0.8; f.life = f.age + 14; }
        else {
          if (!f.tgt || f.tgt.dead) f.tgt = nearest(f);
          const [cx, cy] = C(f);
          let want = f.h;
          if (f.tgt) {
            const [tx, ty] = C(f.tgt), d = Math.hypot(tx - cx, ty - cy);
            want = Math.atan2(ty - cy, tx - cx);
            if (f.evade > 0) { f.evade -= dt; want = f.h + f.evDir * 0.7; } else if (d < 55) { f.evade = rnd(0.6, 1.1); f.evDir = Math.random() < 0.5 ? -1 : 1; }
          } else { f.mode = 'cruise'; f.plan = { t: rnd(3, 6), want: 1, ht: f.h, t0: 0 }; f.keep = false; f.life = f.age + 14; }
          if (f.box && (cx < f.box.x0 || cx > f.box.x1 || cy < f.box.y0 || cy > f.box.y1)) want = Math.atan2((f.box.y0 + f.box.y1) / 2 - cy, (f.box.x0 + f.box.x1) / 2 - cx); // görünen alanda kal
          if (f.tgt) f.vz += clamp((f.tgt.z - f.z) * 0.8 - f.vz, -0.3, 0.3) * dt * 2; // derinlikte de hedefe yaklaşır
          f.vz = clamp(f.vz, -0.25, 0.25);
          turnTo(f, want, f.turn, dt);
          const ik = Math.min(1, dt * 1.5); // eylemsizlik: yön döner ama hız hemen dönmez, geniş kavisle savrulur
          f.vx += (Math.cos(f.h) * f.speed - f.vx) * ik; f.vy += (Math.sin(f.h) * f.speed - f.vy) * ik;
        }
      } else if (f.mode === 'cruise') {
        const pl = f.plan;
        if (pl.t0 !== now) { // plan grup başına karede bir kez ilerler (filo birlikte manevra yapar)
          pl.t0 = now; pl.t -= dt;
          if (pl.t <= 0) {
            if (pl.want === 0) { pl.want = 1; pl.ht += rnd(-0.6, 0.6); pl.t = rnd(4, 8); } // duruştan sonra yeni bir yöne kalkar
            else {
              const r = Math.random();
              if (r < 0.34) { pl.ht += rnd(-0.6, 0.6) * (Math.random() < 0.15 ? 1.6 : 1); pl.t = rnd(6, 12); } // yumuşak bir dönüş
              else if (r < 0.54) { pl.want = 0; pl.t = rnd(4, 8); } // yavaşça durur, olduğu yerde sallanır
              else pl.t = rnd(4, 9); // bir süre düz gider
            }
          }
        }
        const moon = f.host.parentElement && f.host.parentElement.querySelector('.ns-moon');
        if (moon) {
          const hr = f.host.getBoundingClientRect(), mr = moon.getBoundingClientRect();
          const mx = mr.left + mr.width / 2 - hr.left, my = mr.top + mr.height / 2 - hr.top, R = mr.width * 2.4;
          const ex = mx - f.x, ey = my - f.y, dist = Math.hypot(ex, ey);
          if (dist < R && dist > 1) pl.ht += angDiff(Math.atan2(ey, ex), pl.ht) * 1.1 * (1 - dist / R) * dt * 0.8; // ay yakınında kütle çekimiyle kıvrılır
        }
        turnTo(f, pl.ht, 0.35, dt); // en fazla ~20°/sn: geniş, yumuşak kavisler
        f.cur += (pl.want - f.cur) * Math.min(1, dt * 0.7); // hız yumuşakça artar/azalır
        const ik = Math.min(1, dt * 0.9); // eylemsizlik: uzayda savrularak döner
        f.vx += (Math.cos(f.h) * f.speed * f.cur - f.vx) * ik; f.vy += (Math.sin(f.h) * f.speed * f.cur - f.vy) * ik;
      } else if (f.mode === 'fleet') {
        f.vx = Math.cos(f.h) * f.speed; f.vy = Math.sin(f.h) * f.speed; // filo gemileri düz gider (sağa sola yalpalamaz)
      }
      const sc = zs(f.z), SLOW = 0.88; // gemiler biraz daha yavaş (genel hız çarpanı)
      f.x += f.vx * dt * sc * SLOW; f.y += f.vy * dt * sc * SLOW;
      if (f.hangar) { // taşıyıcı: arada hangarından bir avcı fırlatır
        f.launchCd -= dt;
        if (f.launchCd <= 0) {
          f.launchCd = rnd(6, 10);
          if (fl.filter((o) => o.host === f.host).length < 16) add(f.host, { noSpread: true, kind: pick(KINDS[f.team]), team: f.team, x: f.x + f.w * 0.55, y: f.y + f.hh * 0.5, h: f.h + rnd(-0.7, 0.7), speed: rnd(64, 84), mode: 'dog', turn: rnd(0.5, 0.75), range: 250, keep: true, dogLife: rnd(22, 34), life: 70, z: f.z, vz: rnd(-0.05, 0.05) });
        }
      }
      if (f.dodgeCd > 0) f.dodgeCd -= dt;
      if (f.dodge) { const d = f.dodge, k = Math.sin(Math.PI * (1 - d.t / d.T)) * d.mag * dt * 1.6; f.x += d.nx * k; f.y += d.ny * k; d.t -= dt; if (d.t <= 0) f.dodge = null; } // yan kayış
      f.z += f.vz * dt;
      if (f.z > 1) { f.z = 1; f.vz = -Math.abs(f.vz); } else if (f.z < -1) { f.z = -1; f.vz = Math.abs(f.vz); }
      const idle = 1 - f.cur, sw = Math.sin(f.age * 1.4 + f.ph) * 6 * idle; // durunca perdeye dik yönde sağa sola sallanır
      f.el.style.translate = (f.x - Math.sin(f.h) * sw) + 'px ' + (f.y + Math.cos(f.h) * sw) + 'px';
      f.el.style.scale = zs(f.z) * (f.big ? 1 : 0.78); // yalnız ana gemiler büyük; avcılar ve nakliyeler küçük
      f.el.style.opacity = 0.55 + 0.4 * (f.z + 1) / 2;
      f.el.style.zIndex = Math.round(f.z * 10);
      f.el.style.rotate = (f.h * DEG + Math.sin(f.age * 1.1 + f.ph * 1.7) * 4 * idle) + 'deg';
      // Ateş: menzildeki en yakın düşmana; av uçakları burnu hedefe dönükken ateş eder
      if (f.team < 2) {
        f.cool -= dt;
        if (f.cool <= 0) {
          const t = nearest(f, f.range);
          if (t) {
            const [cx, cy] = C(f), [tx, ty] = C(t);
            if (f.mode !== 'dog' || (Math.abs(angDiff(Math.atan2(ty - cy, tx - cx), f.h)) < 0.3 && Math.abs(f.z - t.z) < 0.4)) { salvo(f, t); f.cool = f.big ? rnd(0.7, 1.5) : rnd(1.1, 2.4); } else f.cool = 0.15;
          } else f.cool = 0.5;
        }
      }
      const W = f.host.offsetWidth, H = f.host.offsetHeight, m = f.keep ? 500 : 80;
      if (f.x < -m || f.x > W + m || f.y < -m || f.y > H + m || f.age > f.life) { f.dead = true; f.el.remove(); fl.splice(i, 1); }
    }
    if (fl.length) requestAnimationFrame(loop); else running = false;
  };
  const add = (host, o) => {
    const team = o.team == null ? 2 : o.team;
    // Kenardan girişte gemiler üst üste binmesin: yakında gemi varsa giriş noktası kenar boyunca kaydırılır / biraz daha dışarıdan başlar
    if (!o.noSpread) {
      const v = view(host), edge = o.x < 0 || o.x > v.W;
      const near = () => fl.some((g) => g.host === host && Math.hypot(g.x - o.x, g.y - o.y) < (g.big ? 200 : 130) + (o.kind === 2 || o.kind === 7 || o.kind === 8 ? 90 : 0));
      for (let t = 0; t < 14 && near(); t++) {
        if (edge) { o.y = clamp(o.y + rnd(-1, 1) * 260, v.y0 + 20, v.y1 - 20); o.x += (o.x < 0 ? -1 : 1) * rnd(30, 110); }
        else o.x = clamp(o.x + rnd(-1, 1) * 260, 20, v.W - 20);
      }
    }
    const { s, w } = makeShip(host, o.kind, pick(TEAM[team].col), o.h);
    const f = Object.assign({ el: s, host, w, hh: w * 0.64, age: 0, cool: rnd(1, 3), hp: 1, mode: 'cruise', team, range: team < 2 ? 230 : 0, big: false, life: 150, keep: false, turn: 2, dogLife: 38, z: rnd(-0.6, 0.6), vz: rnd(-0.05, 0.05), cur: 1, ph: rnd(0, 6.28), h0: o.h, dodgeCd: 0, hangar: o.kind === 8, launchCd: rnd(3, 6) }, o);
    if (!f.plan) f.plan = { t: rnd(2, 6), want: 1, ht: f.h, t0: 0 };
    f.vx = Math.cos(f.h) * f.speed; f.vy = Math.sin(f.h) * f.speed;
    s.style.translate = f.x + 'px ' + f.y + 'px';
    s.style.scale = zs(f.z) * (f.big ? 1 : 0.78);
    s.animate([{ opacity: 0 }, { opacity: 0.92 }], { duration: 700 }); // aniden belirmesin, hızla görünsün
    fl.push(f);
    if (!running) { running = true; last = 0; requestAnimationFrame(loop); }
    return f;
  };

  // Panelin ekranda görünen bandı (uzun panellerde gemiler bakılan yerde olsun)
  const view = (host) => {
    const r = host.getBoundingClientRect(), W = host.offsetWidth, H = host.offsetHeight;
    const y0 = Math.max(0, -r.top), y1 = Math.min(H, innerHeight - r.top);
    return { W, H, y0, y1, h: y1 - y0 };
  };
  const hostFor = () => {
    const vh = innerHeight;
    const list = [...document.querySelectorAll('.ns')].filter((n) => { const r = n.parentElement.getBoundingClientRect(); return Math.min(r.bottom, vh) - Math.max(r.top, 0) > 200 && r.width > 200; });
    return list.length ? pick(list) : null;
  };
  const SMALL = [0, 6, 1, 4];
  const KINDS = [[0, 6, 5, 4], [1, 1, 1, 6]]; // taraf başına gemi havuzu (zırhlı gemiler ↔ TIE tipi)

  // Tek mekik: görünen alanın bir kenarından girer (çoğunlukla yan kenarlar, bazen üst/alt)
  const cruise = (host) => {
    const v = view(host);
    let x, y, h;
    if (Math.random() < 0.8) { const dir = Math.random() < 0.5 ? 1 : -1; x = dir > 0 ? -40 : v.W + 40; y = rnd(v.y0 + v.h * 0.1, v.y1 - v.h * 0.1); h = (dir > 0 ? 0 : Math.PI) + rnd(-0.5, 0.5); }
    else { const top = Math.random() < 0.5; x = rnd(v.W * 0.15, v.W * 0.85); y = top ? v.y0 - 40 : v.y1 + 40; h = (top ? Math.PI / 2 : -Math.PI / 2) + rnd(-0.5, 0.5); }
    add(host, { kind: Math.floor(rnd(0, DESIGNS.length)), x, y, h, speed: rnd(16, 26), z: rnd(-0.9, 0.9), vz: rnd(-0.07, 0.07) });
  };
  // Barışçıl geçiş: 2-4 gemi gevşek bir kümede (aynı hizada değil), her biri kendi yönü ve hızıyla; bazen önde bir ana gemi
  const flyby = (host) => {
    const v = view(host), dir = Math.random() < 0.5 ? 1 : -1, n = v.W < 640 ? 2 : Math.floor(rnd(2, 5));
    const y = rnd(v.y0 + v.h * 0.2, v.y1 - v.h * 0.2), h = (dir > 0 ? 0 : Math.PI) + rnd(-0.3, 0.3);
    if (Math.random() < 0.3 && v.W > 520) add(host, { kind: pick([2, 7, 8]), team: 2, x: dir > 0 ? -140 : v.W + 140, y: y + rnd(-60, 60), h: h + rnd(-0.1, 0.1), speed: rnd(11, 16), big: true, hp: 99, z: rnd(0.2, 0.8), vz: -0.01, life: 200 });
    for (let i = 0; i < n; i++) setTimeout(() => { if (host.isConnected) add(host, { kind: pick([0, 6, 1, 4, 5, 3]), team: 2, x: (dir > 0 ? -50 : v.W + 50) - dir * rnd(0, 140), y: y + rnd(-110, 110), h: h + rnd(-0.35, 0.35), speed: rnd(20, 36), life: 140, z: rnd(-0.8, 0.8), vz: rnd(-0.06, 0.06) }); }, i * rnd(300, 1600));
  };
  // İki filonun karşılaşması: iki filo karşı kenarlardan girer (ortada aniden belirmez), gevşek kümeler, farklı hız/yönler, aralıklı gelirler; arkadan ana gemiler (korvet ↔ yıldız destroyeri)
  const fleetClash = (host) => {
    const v = view(host);
    if (v.W < 360 || v.h < 170) return cruise(host);
    const dir = Math.random() < 0.5 ? 1 : -1, mx = rnd(v.W * 0.35, v.W * 0.65), my = rnd(v.y0 + v.h * 0.3, v.y1 - v.h * 0.3), n = v.W < 640 ? 2 : Math.floor(rnd(3, 6)), sp = rnd(52, 68);
    [0, 1].forEach((side) => {
      const sgn = side ? 1 : -1, ex = (dir * sgn) > 0 ? -80 : v.W + 80, cnt = side ? n + (Math.random() < 0.5 ? 1 : 0) : n; // iki taraf karşı kenarlardan
      for (let i = 0; i < cnt; i++) setTimeout(() => {
        if (!host.isConnected) return;
        const x = ex + (ex < 0 ? -1 : 1) * rnd(0, 120), y = my + rnd(-170, 170), T = Math.abs(mx - x) / sp, zStart = (side ? 1 : -1) * rnd(0.3, 0.75);
        add(host, { kind: pick(KINDS[side]), team: side, x, y, h: Math.atan2(my + rnd(-60, 60) - y, mx - x) + rnd(-0.2, 0.2), speed: sp * rnd(0.8, 1.2), mode: 'fleet', hp: Math.random() < 0.25 ? 2 : 1, keep: true, range: 230, life: 80, z: zStart, vz: -zStart / T });
      }, i * rnd(200, 1000));
      if (v.W > 640 && Math.random() < 0.75) setTimeout(() => { if (host.isConnected) { const x = ex + (ex < 0 ? -1 : 1) * 140; add(host, { kind: side ? pick([2, 2, 8]) : pick([7, 8]), team: side, x, y: my + rnd(-90, 90), h: ex < 0 ? rnd(-0.1, 0.1) : Math.PI + rnd(-0.1, 0.1), speed: rnd(14, 20), mode: 'fleet', hp: side ? 9 : 8, big: true, keep: true, range: 360, life: 110, z: side ? 0.7 : 0.55, vz: -0.01 }); } }, rnd(500, 1500));
    });
  };
  // İt dalaşı: avcılar iki kenardan girer, ortada kıvrılarak birbirini kovalar
  const dogfight = (host) => {
    const v = view(host);
    if (v.W < 320 || v.h < 160) return cruise(host);
    const cx = rnd(v.W * 0.35, v.W * 0.65), cy = rnd(v.y0 + v.h * 0.35, v.y1 - v.h * 0.35), nA = Math.random() < 0.5 ? 2 : 3, flip = Math.random() < 0.5;
    const box = { x0: Math.max(30, cx - 330), x1: Math.min(v.W - 30, cx + 330), y0: Math.max(v.y0 + 20, cy - 150), y1: Math.min(v.y1 - 20, cy + 150) };
    [[0, nA], [1, nA === 3 ? 2 : 2 + (Math.random() < 0.4 ? 1 : 0)]].forEach(([team, cnt]) => {
      const left = (team === 0) !== flip;
      for (let i = 0; i < cnt; i++) setTimeout(() => { if (host.isConnected) add(host, { kind: pick(KINDS[team]), team, x: left ? -60 - rnd(0, 80) : v.W + 60 + rnd(0, 80), y: cy + rnd(-110, 110), h: (left ? 0 : Math.PI) + rnd(-0.3, 0.3), speed: rnd(64, 88), mode: 'dog', turn: rnd(0.5, 0.75), hp: Math.random() < 0.3 ? 2 : 1, range: 260, box, keep: true, dogLife: rnd(28, 42), life: 80, z: rnd(-0.6, 0.6), vz: rnd(-0.08, 0.08) }); }, i * rnd(250, 900));
    });
  };
  // Ana gemi bombardımanı: korvet bir kenardan yavaşça girer, eskort onunla; karşı kenardan saldırgan dalgalar gelir
  const capital = (host) => {
    const v = view(host);
    if (v.W < 520 || v.h < 220) return flyby(host);
    const dir = Math.random() < 0.5 ? 1 : -1, y = rnd(v.y0 + v.h * 0.4, v.y1 - v.h * 0.4), h0 = dir > 0 ? 0 : Math.PI, sx = dir > 0 ? -100 : v.W + 100;
    const box = { x0: 30, x1: v.W - 30, y0: Math.max(v.y0 + 20, y - 170), y1: Math.min(v.y1 - 20, y + 170) };
    add(host, { kind: pick([7, 8, 8]), team: 0, x: sx, y, h: h0, speed: rnd(13, 18), mode: 'fleet', hp: 10, big: true, keep: true, range: 340, life: 120, z: rnd(0.3, 0.8), vz: -0.012 });
    for (let i = 0; i < 2; i++) setTimeout(() => { if (host.isConnected) add(host, { kind: pick([0, 6, 5]), team: 0, x: sx - dir * rnd(10, 90), y: y + (i ? 70 : -70), h: h0, speed: rnd(60, 80), mode: 'dog', turn: 0.65, range: 250, box, keep: true, dogLife: 40, life: 80 }); }, 500 + i * 700);
    const nB = Math.floor(rnd(3, 6));
    for (let i = 0; i < nB; i++) setTimeout(() => { if (host.isConnected) add(host, { kind: pick(KINDS[1]), team: 1, x: dir > 0 ? v.W + 60 : -60, y: y + rnd(-120, 120), h: (dir > 0 ? Math.PI : 0) + rnd(-0.3, 0.3), speed: rnd(60, 84), mode: 'dog', turn: rnd(0.5, 0.75), range: 250, box, keep: true, dogLife: rnd(26, 40), life: 80 }); }, 1200 + i * rnd(900, 1800));
  };

  // Ana gemi düellosu: iki büyük gemi karşı kenarlardan girip karşılıklı geçerken yan yana top ateşi eder, etraflarında avcılar uçuşur
  const duel = (host) => {
    const v = view(host);
    if (v.W < 640 || v.h < 240) return capital(host);
    const dir = Math.random() < 0.5 ? 1 : -1, y = rnd(v.y0 + v.h * 0.4, v.y1 - v.h * 0.4), gap = rnd(110, 170), h0 = dir > 0 ? 0 : Math.PI;
    add(host, { kind: pick([7, 8]), team: 0, x: dir > 0 ? -140 : v.W + 140, y: y - gap / 2, h: h0 + rnd(-0.06, 0.06), speed: rnd(15, 20), mode: 'fleet', hp: 9, big: true, keep: true, range: 380, life: 120, z: 0.6, vz: -0.01 });
    add(host, { kind: pick([2, 2, 8]), team: 1, x: dir > 0 ? v.W + 140 : -140, y: y + gap / 2, h: h0 + Math.PI + rnd(-0.06, 0.06), speed: rnd(15, 20), mode: 'fleet', hp: 10, big: true, keep: true, range: 380, life: 120, z: 0.65, vz: -0.01 });
    const box = { x0: 30, x1: v.W - 30, y0: Math.max(v.y0 + 20, y - 190), y1: Math.min(v.y1 - 20, y + 190) };
    for (let i = 0; i < 4; i++) setTimeout(() => { if (host.isConnected) { const team = i % 2, left = Math.random() < 0.5; add(host, { kind: pick(KINDS[team]), team, x: left ? -60 : v.W + 60, y: y + rnd(-140, 140), h: left ? rnd(-0.3, 0.3) : Math.PI + rnd(-0.3, 0.3), speed: rnd(60, 84), mode: 'dog', turn: rnd(0.5, 0.75), range: 250, box, keep: true, dogLife: rnd(24, 36), life: 80, z: rnd(-0.6, 0.6), vz: rnd(-0.08, 0.08) }); } }, 1500 + i * rnd(900, 1700));
  };

  // Uzak/yakın gezegenler: nadiren, çok yavaş geçerler (panel başına en fazla bir)
  const PLANETS = [['#6c7bff', '#242a78'], ['#fb6a3b', '#6e1f0c'], ['#55db9c', '#17563d'], ['#e9ccff', '#5a3b8c'], ['#ffd731', '#7a5a0c']];
  const planet = (host) => {
    const v = view(host);
    if (v.W < 360 || v.h < 240 || host.querySelector(':scope > .ns-planet')) return;
    const near = Math.random() < 0.35, size = Math.min(near ? rnd(130, 230) : rnd(34, 78), v.h - 70);
    const [c1, c2] = pick(PLANETS), dir = Math.random() < 0.5 ? 1 : -1, y = rnd(v.y0 + 20, Math.max(v.y0 + 21, v.y1 - size - 20));
    const p = document.createElement('i');
    p.className = 'ns-planet' + (Math.random() < 0.4 ? ' ring' : '') + (Math.random() < 0.5 ? ' bands' : '');
    p.style.cssText = `--c1:${c1};--c2:${c2};--s:${size}px;width:${size}px;height:${size}px;left:0;top:0;opacity:${near ? 0.88 : 0.6}`;
    host.prepend(p);
    const x0 = dir > 0 ? -size * 1.4 : v.W + size * 0.4, x1 = dir > 0 ? v.W + size * 0.4 : -size * 1.4;
    p.animate([{ translate: `${x0}px ${y}px` }, { translate: `${x1}px ${y + rnd(-40, 40)}px` }], { duration: near ? rnd(110000, 160000) : rnd(80000, 120000), easing: 'linear', fill: 'forwards' }).finished.then(() => p.remove(), () => p.remove());
  };

  // Gemiye tıklayınca patlar. Gemiler sayfa içeriğinin arkasındadır: yazıların (başlık, metin) altında kalanlara da tıklanır;
  // yalnız bağlantı/düğme/form gibi etkileşimli öğelerin, görsellerin ve dolgulu kartların üstündeki tıklamalar gemiye gitmez
  const shipAt = (x, y, target) => {
    if (root.dataset.theme !== 'night' || !fl.length) return null;
    if (target && target.closest && target.closest('a,button,input,textarea,select,label,summary,[role="button"],img,svg,canvas,video,[class*="st-"]')) return null;
    let best = null, bd = 1e9;
    for (const f of fl) {
      if (f.dead) continue;
      const r = f.host.getBoundingClientRect(), d = Math.hypot(x - (r.left + f.x + f.w / 2), y - (r.top + f.y + f.hh / 2));
      if (d < Math.max(24, f.w * 0.7 * zs(f.z)) && d < bd) { bd = d; best = f; }
    }
    if (!best) return null;
    const top = document.elementFromPoint(x, y);
    if (top && top !== best.host.parentElement && top !== document.body && top !== root) {
      const bg = getComputedStyle(top).backgroundColor;
      if (bg && !/transparent|, 0\)$|\/ 0\)$/.test(bg)) return null; // dolgulu bir kartın üstü
    }
    return best;
  };
  document.addEventListener('click', (e) => { const f = shipAt(e.clientX, e.clientY, e.target); if (f) die(f, true); });
  // Gemi imlecin altındayken nişan imleci (tıklanabileceği anlaşılsın)
  let mvT = 0;
  document.addEventListener('mousemove', (e) => {
    if (mvT || !fl.length) return;
    mvT = setTimeout(() => { mvT = 0; root.classList.toggle('ns-aim', !!shipAt(e.clientX, e.clientY, e.target)); }, 70);
  }, { passive: true });

  // Sahne planlayıcı: görünen her panelde hemen gemi olsun (boş panel anında dolar), aynı anda tek savaş sahnesi; aralarda sakin geçişler, gezegen ve astronot
  const visibleHosts = () => {
    const vh = innerHeight;
    return [...document.querySelectorAll('.ns')].filter((n) => { const r = n.parentElement.getBoundingClientRect(); return Math.min(r.bottom, vh) - Math.max(r.top, 0) > 200 && r.width > 200; });
  };
  const spawnFor = (host) => {
    const fighting = fl.some((f) => f.host === host && f.team < 2), n = fl.filter((f) => f.host === host).length;
    if (!fighting && n < 14) {
      const r = Math.random();
      (r < 0.26 ? fleetClash : r < 0.46 ? dogfight : r < 0.68 ? capital : r < 0.82 ? duel : r < 0.92 ? flyby : cruise)(host);
    } else if (n < 8 && Math.random() < 0.75) (Math.random() < 0.25 ? flyby : cruise)(host);
    if (Math.random() < 0.18) planet(host);
  };
  // Boş görünen panelleri hemen doldur (sayfa açılışı, geceye geçiş, başka bölüme kaydırma)
  let live = false; // sayfa açıldıktan 2 sn sonra evren canlanır (açılışta hemen savaş başlamaz)
  const goLive = () => setTimeout(() => { live = true; populate(); }, 2000);
  if (document.readyState === 'complete') goLive(); else window.addEventListener('load', goLive, { once: true });
  const populate = () => {
    if (!live || root.dataset.theme !== 'night' || document.hidden || fl.length >= 42) return;
    visibleHosts().slice(0, 3).forEach((h) => {
      if (fl.some((f) => f.host === h)) return;
      cruise(h); cruise(h); spawnFor(h);
    });
  };
  const tick = () => {
    if (live && root.dataset.theme === 'night' && !document.hidden && fl.length < 42) {
      populate();
      const hosts = visibleHosts();
      if (hosts.length) spawnFor(pick(hosts));
    }
    setTimeout(tick, rnd(1600, 4000));
  };
  new MutationObserver(() => setTimeout(populate, 250)).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  let sT = 0;
  window.addEventListener('scroll', () => { if (!sT) sT = setTimeout(() => { sT = 0; populate(); }, 500); }, { passive: true });
  setTimeout(tick, 1500);
})();

// Üst menüde hizmet sepeti: Hizmetler sayfasından çıkınca sepette ürün varsa gece/gündüz düğmesinin soluna gelir; boşken yoktur.
// Arada altında konuşma balonu (yalnız "dolu" cümleleri) çıkar; balonun kuyruğu üst sağ köşeden sepete uzanır.
(() => {
  if (document.querySelector('[data-svc-cart]')) return; // Hizmetler sayfasında kendi yüzen sepeti var
  const theme = document.getElementById('themeBtn');
  if (!theme) return;
  const KEY = 'goatz-hizmet-sepeti';
  const count = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v.filter((x) => x && typeof x.g === 'string' && typeof x.t === 'string').length : 0; } catch (e) { return 0; } };
  const SAYS = ['Doldurdun, gittin.', 'Eklerken iyiydik.', 'Gözüm hâlâ sende.', 'Beni de götür.', 'Seçtiklerinle baş başa kaldık.', 'Ara sıra bana da bak.', 'Unutuldum galiba.', 'İçim doldu, bekleyişim bitmedi.', 'Hâlâ aynı köşedeyim.', 'Bir tıklayıp hâlimi sorsan.'];
  const wrap = document.createElement('span');
  wrap.className = 'cart-top';
  wrap.hidden = true;
  wrap.innerHTML = '<a class="btn icon-btn cart-top-btn" href="/hizmetler#sepet" aria-label="Hizmet sepeti"><svg viewBox="0 0 64 64" width="20" height="20" aria-hidden="true" focusable="false"><path d="M6 10h8l7 30h28l6-22H17" fill="#fff" stroke="currentColor" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/><circle cx="25" cy="52" r="5.5" fill="#ffd731" stroke="currentColor" stroke-width="4.5"/><circle cx="46" cy="52" r="5.5" fill="#ffd731" stroke="currentColor" stroke-width="4.5"/></svg><b class="cart-top-n"></b></a>' +
    '<span class="cart-top-bubble" aria-hidden="true"><span></span><svg class="cb-tail up" viewBox="0 0 34 26" aria-hidden="true"><path d="M4 25C4 10 12 4 31 4C18 10 15 16 17 25Z" fill="#fff" stroke="#000" stroke-width="2" stroke-linejoin="round"/><rect x="5" y="23.4" width="11" height="2.6" fill="#fff"/></svg></span>';
  theme.parentNode.insertBefore(wrap, theme);
  const link = wrap.querySelector('a'), num = wrap.querySelector('.cart-top-n'), bubble = wrap.querySelector('.cart-top-bubble'), txt = bubble.querySelector('span');
  let bubT = 0, bubOff = 0, last = -1, shown = false;
  const stop = () => { clearTimeout(bubT); clearTimeout(bubOff); bubble.classList.remove('show'); };
  const next = (ms) => { clearTimeout(bubT); bubT = setTimeout(() => {
    if (count() === 0) return;
    if (!document.hidden && !document.documentElement.classList.contains('menu-open')) {
      let n; do { n = Math.floor(Math.random() * SAYS.length); } while (n === last && SAYS.length > 1); last = n;
      txt.textContent = SAYS[n]; bubble.classList.add('show');
      clearTimeout(bubOff); bubOff = setTimeout(() => bubble.classList.remove('show'), 5000);
    }
    next(40000 + Math.random() * 30000);
  }, ms); };
  const sync = () => {
    const n = count();
    wrap.hidden = n === 0;
    num.textContent = String(n);
    link.setAttribute('aria-label', 'Hizmet sepeti: ' + n + ' ürün');
    if (n === 0) { stop(); shown = false; } else if (!shown) { shown = true; next(15000); }
  };
  window.addEventListener('storage', (e) => { if (!e.key || e.key === KEY) sync(); });
  window.addEventListener('pageshow', sync);
  sync();
})();
