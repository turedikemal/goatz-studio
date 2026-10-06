// Bu dosya hem sunucuda hem panelin tarayıcı tarafında çalışır (önizleme tarayıcıda üretilir).
// Sticker çizimleri sunucuda dosyadan okunur, tarayıcıda setSprites ile verilir.
let SPRITES = '';
try {
  const fs = require('fs');
  const path = require('path');
  SPRITES = fs.readFileSync(path.join(__dirname, '..', 'public', 'sprites.svg'), 'utf8');
} catch { /* tarayıcı */ }
const setSprites = (svg) => { SPRITES = svg; };
const { resolvePages, resolveWorks, pagePath } = require('./schema');
const COLOR_KEYS = ['carbon', 'paper', 'sky', 'concrete', 'mist', 'blue', 'mint', 'lavender', 'ember', 'sun', 'violet'];
// Üst menü sepeti (sepette ürün varken görünür); baştan çizilir ki sayfa yenilenince / sayfa değişince yanıp sönmesin
const CART_TOP_HTML = "<span class=\"cart-top\"><a class=\"btn icon-btn cart-top-btn\" href=\"/hizmetler#sepet\" aria-label=\"Hizmet sepeti\"><svg viewBox=\"0 0 64 64\" width=\"20\" height=\"20\" aria-hidden=\"true\" focusable=\"false\"><path d=\"M6 10h8l7 30h28l6-22H17\" fill=\"#fff\" stroke=\"currentColor\" stroke-width=\"5\" stroke-linejoin=\"round\" stroke-linecap=\"round\"/><circle cx=\"25\" cy=\"52\" r=\"5.5\" fill=\"#ffd731\" stroke=\"currentColor\" stroke-width=\"4.5\"/><circle cx=\"46\" cy=\"52\" r=\"5.5\" fill=\"#ffd731\" stroke=\"currentColor\" stroke-width=\"4.5\"/></svg><b class=\"cart-top-n\"></b></a><span class=\"cart-top-bubble\" aria-hidden=\"true\"><span></span><svg class=\"cb-tail up\" viewBox=\"0 0 34 26\" aria-hidden=\"true\"><path d=\"M30 25C30 12 24 8 8 8C18 12 20 17 17 25Z\" fill=\"#fff\"/><path d=\"M30 25C30 12 24 8 8 8C18 12 20 17 17 25\" fill=\"none\" stroke=\"#000\" stroke-width=\"3.6\" stroke-linejoin=\"round\"/><rect x=\"16.6\" y=\"21.4\" width=\"13.8\" height=\"5\" fill=\"#fff\"/></svg></span></span>";
const STICKERS = ['camera', 'browser', 'coin', 'check', 'cursor', 'star', 'bottle', 'pin', 'map', 'box', 'truck', 'medal', 'store', 'cart', 'chat', 'link', 'sliders', 'photo', 'grid', 'palette', 'heart', 'magnifier', 'globe', 'pencil', 'gear', 'refresh', 'key', 'anahtar', 'rocket', 'chart', 'product', 'signpost', 'vitrin', 'code', 'phone', 'layers', 'type', 'bag', 'tag', 'bulb', 'foot', 'shoe', 'sock'];
const STICKER_VIEWBOX = { anahtar: '0 0 120 100', camera: '0 0 120 100', browser: '0 0 120 100', vitrin: '0 0 200 216', code: '0 0 120 100', shoe: '0 0 120 100', bottle: '0 0 100 160', product: '0 0 100 160' };
const ANCHORS = ['#top', '#isler', '#hizmetler', '#neden', '#surec', '#iletisim'];

// Tek yazı tipi: tema ayarındaki Google Fonts ailesi (t.font). Dosyalar sunucudan (/fonts) gelir, ziyaretçi Google'a gitmez.
const DEFAULT_FONT = 'Inter';
const fontName = (v) => (typeof v === 'string' && /^[A-Za-z0-9][A-Za-z0-9 ]{0,59}$/.test(v) ? v : DEFAULT_FONT);
const fontSlug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const WEIGHTS = ['400', '500', '600', '700', '800', '900'];
const CASES = { upper: 'uppercase', lower: 'lowercase', title: 'capitalize', none: 'none' };
const MOTIONS = ['smooth', 'intro', 'reveal', 'headings', 'cards', 'pop', 'idle', 'parallax', 'device', 'marquee', 'navhide', 'tabs', 'slider'];

// ---------- Güvenli çıktı yardımcıları ----------
const esc = (v) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const br = (v) => esc(v).replace(/\n/g, '<br>');
// Başlıkta [[yanlış|doğrusu]] yazılırsa yanlış kısım üstü çizili, doğrusu üstüne el yazısı gibi eklenir (espri için)
const FIX_RE = /\[\[(.+?)\|(.+?)\]\]/;
const brFix = (v) => br(v).replace(new RegExp(FIX_RE.source, 'g'), '<span class="fix"><s>$1</s><em>$2</em></span>');
const color = (c, fallback = 'mint') => `var(--${COLOR_KEYS.includes(c) ? c : fallback})`;
const hex = (v, fallback) => (/^#[0-9a-fA-F]{6}$/.test(v) ? v : fallback);
const num = (v, min, max, fallback) => (Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback);
const imageUrl = (u) => (typeof u === 'string' && /^\/uploads\/[a-z0-9-]+\.(png|jpe?g|webp|gif)$/.test(u) ? u : '');
const stickerId = (s) => (STICKERS.includes(s) ? s : '');
const vb = (s) => STICKER_VIEWBOX[s] || '0 0 100 100';
const use = (id, attrs = '') => (stickerId(id) ? `<svg ${attrs} viewBox="${vb(id)}" aria-hidden="true"><use href="#s-${id}"/></svg>` : '');

// ---------- Yazı stilleri ----------
const clampStr = (v, min, max) => {
  if (v === '' || v == null) return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : null;
};

// Bir metin alanının stil nesnesini CSS bildirimlerine çevirir. Hiçbir değer doğrudan CSS'e yazılmaz,
// hepsi izin verilen listelerden ya da sınırlandırılmış sayılardan gelir.
// base: alanın varsayılan yazı boyutu (boyut çarpanı bunun üzerine uygulanır).
function T(st, base, o = {}) {
  if (!st || typeof st !== 'object') return '';
  const p = [];
  const size = clampStr(st.size, 30, 400);
  if (size !== null && size !== 100 && base) p.push(`font-size:calc(${base} * ${size / 100})`);
  if (WEIGHTS.includes(st.weight)) p.push(`font-weight:${st.weight}`);
  if (st.italic === 'on') p.push('font-style:italic');
  else if (st.italic === 'off') p.push('font-style:normal');
  if (CASES[st.upper]) p.push(`text-transform:${CASES[st.upper]}`);
  if (st.underline === 'on') p.push('text-decoration:underline;text-underline-offset:.14em;text-decoration-thickness:.06em');
  const tr = clampStr(st.tracking, -20, 50);
  if (tr !== null) p.push(`letter-spacing:${tr / 100}em`);
  const ld = clampStr(st.leading, 40, 300);
  if (ld !== null) p.push(`line-height:${ld / 100}`);
  if (COLOR_KEYS.includes(st.color)) p.push(`color:var(--${st.color})`);
  if (!o.noAlign) {
    if (st.align === 'left') p.push('text-align:left;margin-left:0;margin-right:auto');
    else if (st.align === 'center') p.push('text-align:center;margin-left:auto;margin-right:auto');
    else if (st.align === 'right') p.push('text-align:right;margin-left:auto;margin-right:0');
    if (st.valign === 'top') p.push(o.self ? 'align-self:flex-start' : 'margin-bottom:auto');
    else if (st.valign === 'middle') p.push(o.self ? 'align-self:center' : 'margin-top:auto;margin-bottom:auto');
    else if (st.valign === 'bottom') p.push(o.self ? 'align-self:flex-end' : 'margin-top:auto');
  }
  return p.join(';');
}
const sa = (...parts) => {
  const s = parts.filter(Boolean).join(';');
  return s ? ` style="${s}"` : '';
};
const NAV_BTN = '13px';

// ---------- İletişim linkleri ----------
function contactLinks(c) {
  const phone = String(c.whatsapp || '').replace(/\D/g, '');
  const insta = String(c.instagram || '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/[/?#].*$/, '').replace(/^@/, '').replace(/[^A-Za-z0-9._]/g, '');
  const email = String(c.email || '').trim();
  const emailOk = /^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(email);
  return {
    whatsapp: phone ? `https://wa.me/${phone}${c.whatsappMessage ? `?text=${encodeURIComponent(c.whatsappMessage)}` : ''}` : '',
    whatsappLabel: phone ? `+${phone}` : 'Numara eklenecek',
    instagram: insta ? `https://instagram.com/${insta}` : '',
    instagramLabel: insta ? `@${insta}` : 'Hesap eklenecek',
    email: emailOk ? `mailto:${email}` : '',
    emailLabel: emailOk ? email : 'Adres eklenecek',
  };
}

// Buton hedefi: bölüm çapası, whatsapp / instagram / email kısayolu ya da tam adres.
function linkAttrs(target, links) {
  const t = String(target || '').trim();
  let href = '#iletisim';
  // Alt sayfalarda ana sayfa çapaları "/#bölüm" olur; sayfanın kendi bölümleri yerelde kalır.
  if (t === 'works' || t === '#isler') href = links.worksUrl || (t === 'works' ? '#isler' : (links.local && links.local.has(t) ? t : `${links.prefix || ''}${t}`));
  else if (ANCHORS.includes(t)) href = links.local && links.local.has(t) ? t : `${links.prefix || ''}${t}`;
  else if (/^page:[a-z0-9]{3,24}(#[a-z0-9-]{1,80})?$/.test(t)) { const [pid, frag] = t.slice(5).split('#'); const base = links.pageUrls && links.pageUrls[pid]; href = base ? base + (frag ? '#' + frag : '') : '#iletisim'; }
  else if (/^work:[a-z0-9-]{3,80}$/.test(t)) href = `/isler/${t.slice(5)}`;
  else if (/^works:[a-z0-9-]{2,24}$/.test(t)) href = `/isler#${t.slice(6)}`;
  else if (t === 'whatsapp' || t === 'instagram' || t === 'email') href = links[t] || '#iletisim';
  else if (/^https?:\/\/[^\s"'<>]+$/.test(t) || /^tel:\+?[0-9 ]+$/.test(t) || /^mailto:[^\s"'<>]+$/.test(t)) href = t;
  const external = /^https?:/.test(href);
  return `href="${esc(href)}"${external ? ' target="_blank" rel="noopener"' : ''}`;
}

function ribbon(r, viewBox, d, dHi, par) {
  if (!r.visible) return '';
  return `<svg class="ribbon"${par ? ` data-par="${par}" data-par-mode="top"` : ''} viewBox="${viewBox}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <g filter="url(#grain)">
        <path d="${d}" fill="none" style="stroke:${color(r.color, 'blue')}" stroke-width="172" stroke-linecap="round"/>
        <path class="edge" d="${d}" fill="none" stroke-width="172" stroke-linecap="round"/>
        <path d="${d}" fill="none" style="stroke:${color(r.color, 'blue')}" stroke-width="140" stroke-linecap="round"/>
        <path class="shine" d="${dHi}" fill="none" stroke-width="44" stroke-linecap="round" filter="url(#soft)"/>
      </g>
    </svg>`;
}

// Sticker: giriş animasyonu (data-pop), boşta hafif oynama (st-<tür>) ve isteğe bağlı paralaks (data-par).
const stClass = (id) => (stickerId(id) ? `st-${id}` : '');
const stickerTag = (s, i, cls, par) => use(s.type,
  `class="sticker${s.float ? ' float' : ''} ${stClass(s.type)} ${cls}" data-pop${par ? ` data-par="${par}"` : ''} style="--x:${num(s.x, -10, 100, 10)}%; --y:${num(s.y, -10, 100, 10)}%; --mx:${num(s.mx, -10, 100, 10)}%; --my:${num(s.my, -10, 100, 10)}%; --s:${num(s.size, 30, 400, 110)}; rotate:${num(s.rotate, -180, 180, 0)}deg; animation-delay:-${(i * 1.3).toFixed(1)}s"`);

// ---------- Bölümler ----------
const S = {};

S.hero = (h, L) => {
  const ts = num(h.titleSize, 6, 40, 24);
  const base = `clamp(64px, ${ts}vw, ${ts * 16.6}px)`;
  return `
  <section class="panel hero" style="background:${color(h.background, 'sky')}">
    ${ribbon(h.ribbon, '0 0 1440 980',
    'M-80 760 C 180 980, 420 560, 260 360 S 420 -40, 720 120 S 1060 620, 1240 420 S 1320 60, 1560 180',
    'M-80 752 C 180 972, 420 552, 260 352 S 420 -48, 720 112 S 1060 612, 1240 412 S 1320 52, 1560 172', '0.01,20')}
    ${h.stickers.map((s, i) => stickerTag(s, i, 'hero-st', ['12,-12', '-10,10', '8,-14', '-12,8'][i % 4])).join('\n    ')}
    <p class="show-hook hero-hook"><b class="show-hook-big display italic"><mark>Kapı Müşterisi Beklemeye Son!!!</mark></b></p>
    <h2 class="display" data-intro${sa(`color:${color(h.titleColor, 'carbon')}`, `font-size:${base}`, T(h.titleStyle, base))}>${esc(h.title)}</h2>
    ${h.tagline ? `<p class="tagline" data-sub${sa(T(h.taglineStyle, 'clamp(24px, 4.4vw, 64px)'))}>${esc(h.tagline)}</p>` : ''}
    <div class="actions">
      ${h.buttons.map((b) => `<a class="btn${b.style === 'solid' ? ' solid' : ''}" ${linkAttrs(b.target, L)}${sa(T(b.labelStyle, NAV_BTN, { noAlign: true }))}>${b.whatsappIcon ? '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="#55db9c" stroke="#000"/><path d="M7.5 16.5l.9-2.6a5 5 0 1 1 1.9 1.8z" fill="#fff" stroke="#000" stroke-width="1.2" stroke-linejoin="round"/></svg>' : ''}${esc(b.label)}</a>`).join('\n      ')}
    </div>
  </section>`;
};

S.showcase = (s, L, c) => {
  const b = s.browser;
  const p = s.photo;
  const photo = imageUrl(p.image);
  // Gerçek işler: öne çıkan web siteleri (premium önde) ve web uygulamaları
  const w = c && c.works;
  const pool = w && w.visible ? resolveWorks(w.items).filter((v) => v.visible && imageUrl(v.image)) : [];
  const keyOf = (v) => workCategory(w, v.category).key;
  const sites = pool.filter((v) => keyOf(v) === 'web').sort((x, y) => (y.premium ? 1 : 0) - (x.premium ? 1 : 0)).slice(0, 5);
  const apps = pool.filter((v) => keyOf(v) === 'app').slice(0, 4);
  const slides = (list, eager) => list.map((v, i) => `<a class="show-slide${i === 0 ? ' on' : ''}" href="${esc(((L && L.worksUrl) || '/isler') + '#' + workCategory(w, v.category).key)}" data-host="${esc(hostOf(v.url))}" data-wc="${color(v.color || workCategory(w, v.category).color, 'mint')}" data-name="${esc(v.title)}" data-lang="${v.lang === 'en' ? 'en' : 'tr'}" data-badge="${esc(v.badge || '')}" aria-label="${esc(v.title)}"><img src="${imageUrl(v.image)}" alt="${esc(workAlt(w, v))}" loading="${eager && i === 0 ? 'eager' : 'lazy'}"></a>`).join('');
  const liveBrowser = sites.length ? `<div class="browser show-browser" data-device data-par="14,-14" data-showcase="sites" role="region" aria-label="Seçili web siteleri" style="--wc:${color(sites[0].color || workCategory(w, sites[0].category).color, 'mint')}">
      <span class="wf-tape wf-t1"></span><span class="wf-tape wf-t2"></span>
      <span class="show-tag label">Web siteleri</span>
      <div class="browser-bar"><i></i><i></i><i></i><span class="url" data-url>${esc(hostOf(sites[0].url))}</span></div>
      <div class="show-stage">${slides(sites, true)}<span class="show-cap label" data-cap lang="${sites[0].lang === 'en' ? 'en' : 'tr'}">${esc(sites[0].title)}</span></div>
    </div>` : '';
  const liveApps = apps.length ? `<figure class="photo-card show-apps" data-device data-par="-10,18" data-showcase="apps" style="margin:0;--wc:${color(apps[0].color || workCategory(w, apps[0].category).color, 'lavender')}">
      <span class="wf-tape wf-t1"></span>
      <span class="show-tag label">Web uygulamaları</span>
      <div class="shot show-stage">${slides(apps, true)}</div>
      <figcaption><p class="label show-appcap" data-cap lang="${apps[0].lang === 'en' ? 'en' : 'tr'}">${esc(apps[0].title)}</p><p class="placeholder-note">Web uygulaması${apps[0].badge ? ` · ${esc(apps[0].badge)}` : ''}</p></figcaption>
    </figure>` : '';
  const stickers = sites.length || apps.length
    ? `${use('browser', 'class="sticker show-st st-browser" data-pop style="left:5%;top:14%;rotate:-10deg"')}${use('chart', 'class="sticker show-st st-chart" data-pop style="right:7%;top:12%;rotate:9deg;left:auto"')}${use('chat', 'class="sticker show-st st-chat" data-pop style="left:8%;bottom:12%;top:auto;rotate:8deg"')}`
    : '';
  // Ana sayfadaki "Ürün fotoğrafları" kartının görseli: galerideki gerçek çekimlerden (mum hariç)
  const phPool = ((w && w.photo && w.photo.images) || []).filter((x) => imageUrl(x.image) && !/mum/i.test((x.category || "") + (x.caption || "") + x.image));
  const phFirst = phPool.find((x) => x.image === "/uploads/aci-biberli-zeytinyagi-beyaz-fon-urun-fotografi.webp");
  const phSeen = new Set();
  const showPhotos = (phFirst ? [phFirst] : []).concat(phPool).filter((x) => { const k = x.category || x.image; if (phSeen.has(k)) return false; phSeen.add(k); return true; }).slice(0, 6);
  const showPhoto = showPhotos[0] ? imageUrl(showPhotos[0].image) : "";
  return `
  <section class="panel showcase" id="isler" aria-label="Örnek işler" style="background:${color(s.background, 'sky')}">
    ${sites.length || apps.length ? '' : ribbon(s.ribbon, '0 0 1440 860',
    'M-60 300 C 260 80, 520 260, 560 480 S 900 860, 1120 560 S 1300 100, 1540 260',
    'M-60 292 C 260 72, 520 252, 560 472 S 900 852, 1120 552 S 1300 92, 1540 252')}
    ${sites.length || apps.length ? `<header class="show-head"><p class="label show-eyebrow">Seçili işler</p><h2 class="display italic show-title" data-reveal>İşler</h2><p class="show-hook"><span class="show-hook-sub">Markanızın <span class="hook-nw"><span class="hook-hl">yeni dijital vitrini</span>yle</span> tanışmaya hazır mısınız?</span></p></header>` : ''}
    ${stickers}
    ${liveBrowser || (b.visible ? `<div class="browser" data-device data-par="14,-14" role="img" aria-label="Örnek web sitesi tasarımı">
      <div class="browser-bar"><i></i><i></i><i></i><span class="url"${sa(T(b.addressStyle, '11px', { noAlign: true }))}>${esc(b.address)}</span></div>
      <div class="browser-body">
        <div class="mini-hero" style="background:${color(b.accent, 'violet')}"><b${sa(T(b.titleStyle, '22px'))}>${esc(b.title)}</b><small${sa(T(b.subtitleStyle, '13px'))}>${esc(b.subtitle)}</small></div>
        <div class="mini-grid">
          ${b.tiles.map((t) => `<div style="background:${color(t.color, 'sun')}">${imageUrl(t.image) ? `<img src="${imageUrl(t.image)}" alt="" loading="lazy">` : use('bottle', 'width="46" height="74"')}</div>`).join('\n          ')}
        </div>
      </div>
    </div>` : '')}
    ${liveApps || (p.visible ? `<figure class="photo-card" data-device data-par="-10,18" style="margin:0">
      <div class="shot" style="background:${color(p.background, 'sun')}">${photo ? `<img src="${photo}" alt="${esc(p.label)}" loading="lazy">` : use('bottle', 'width="120" height="192"')}</div>
      <figcaption>
        ${p.label ? `<p class="label"${sa(T(p.labelStyle, '13px'))}>${esc(p.label)}</p>` : ''}
        ${p.note ? `<p class="placeholder-note"${sa(T(p.noteStyle, '11px'))}>${esc(p.note)}</p>` : ''}
      </figcaption>
    </figure>` : '')}
    ${(sites.length || apps.length) && w.photo && w.photo.visible && L && L.worksUrl ? `<a class="show-photo${showPhoto ? ' has-img' : ''}" href="${L.worksUrl}#urun-cekimi" data-device>${showPhotos.map((x, i) => `<img class="show-photo-img${i === 0 ? ' on' : ''}" src="${imageUrl(x.image)}" alt="${esc(photoAlt(x))}" loading="lazy">`).join('')}${use('camera', 'class="sticker show-photo-st st-camera" data-pop')}<span class="show-photo-cap"><b class="display italic">Ürün fotoğrafları</b><span class="label">E-ticaret çekimleri</span></span></a>` : ''}
    ${L && L.worksUrl ? `<a class="btn solid showcase-cta" href="${L.worksUrl}">Tüm işleri gör ↗</a>` : ''}
  </section>`;
};

S.statement = (s, L) => {
  const B = 'var(--display-md)';
  return `
  <section class="panel statement" aria-label="Tek stüdyo" style="background:${color(s.background, 'sky')}">
    <h2 class="lines display italic" data-reveal>
      <span class="line"${sa(T(s.line1Style, B))}>${esc(s.line1Start)} ${use(s.line1Sticker, `class="inline-sticker ${stClass(s.line1Sticker)}" data-pop data-par="-14,14"`)} ${esc(s.line1End)}${s.line1Sticker2 ? ' ' + use(s.line1Sticker2, `class="inline-sticker ${stClass(s.line1Sticker2)}" data-pop data-par="14,-14"`) : ''}</span>
      <span class="line"${sa(T(s.line2Style, B))}>${use(s.line2Sticker, `class="inline-sticker ${stClass(s.line2Sticker)}" data-pop data-par="-14,14"`)} ${esc(s.line2Start)} ${s.card.visible ? `<a class="inline-card" ${linkAttrs(s.card.target, L)} style="background:${color(s.card.color, 'violet')}"><span class="sq">${use('star', 'width="70%" height="70%"')}</span><span class="ic-text"${sa(T(s.card.labelStyle, '.14em', { noAlign: true }))}>${esc(s.card.label)}</span></a>` : ''} ${esc(s.line2End)}</span>
      ${s.line3 || s.line3Sticker ? `<span class="line"${sa(T(s.line3Style, B))}><span lang="en">${esc(s.line3)}</span> ${use(s.line3Sticker, `class="inline-sticker ${stClass(s.line3Sticker)}" data-pop data-par="-14,14"`)}</span>` : ''}
    </h2>
    ${s.button && s.button.label ? `<p class="statement-cta"><a class="btn solid" ${linkAttrs(s.button.target, L)}>${esc(s.button.label)}</a></p>` : ''}
  </section>`;
};

function serviceMedia(s) {
  const img = imageUrl(s.image);
  if (img) return `<img src="${img}" alt="" loading="lazy" data-par="-6,6">`;
  if (s.media === 'pattern') {
    const cells = [];
    for (let i = 0; i < 16; i++) cells.push(use((i + Math.floor(i / 4)) % 2 === 0 ? s.stickerA : s.stickerB));
    return `<div class="pattern" aria-hidden="true">${cells.join('')}</div>`;
  }
  return `${use(s.stickerA, `class="${stClass(s.stickerA)}" style="width:46%; position:relative; z-index:2" data-pop`)}
          ${use(s.stickerB, `class="sticker ${stClass(s.stickerB)}" data-pop style="right:10%; top:10%; width:22%; rotate:14deg"`)}`;
}

S.services = (sv, L) => `
  <section class="panel svc" id="hizmetler" aria-label="Hizmetler" style="background:${color(sv.background, 'paper')}">
    <div class="inner svc-in">
      ${sv.heading ? `<h2 class="display italic svc-h" data-reveal${sa(T(sv.headingStyle, ''))}>${br(sv.heading)}</h2>` : ''}
      <div class="svc-grid" data-cards>
${(sv.more || []).map((g, n) => `        <article class="svc-card${g.sticker2 ? ' two' : ''}" data-card style="background:${color(g.color)}">
          ${use(g.sticker, `class="sticker svc-st ${stClass(g.sticker)}" data-pop`)}
          ${g.sticker2 ? use(g.sticker2, `class="sticker svc-st b ${stClass(g.sticker2)}" data-pop`) : ''}
          <h3 class="display italic"${sa(T(g.titleStyle, ''))}>${esc(String(g.title).split('\n').join(' '))}</h3>
          <p${sa(T(g.textStyle, ''))}>${esc(g.text)}</p>
          ${(g.items || []).length ? `<button type="button" class="svc-toggle label" aria-expanded="false" aria-controls="sv-more-${n}"><span>Neler yapıyoruz?</span><i aria-hidden="true">+</i></button>
          <div class="svc-panel" id="sv-more-${n}"><div class="svc-open"><ul class="svc-items">
${g.items.map((it) => `            <li><b>${esc(it.label)}</b><span>${esc(it.text)}</span>${it.target ? `<a class="svc-more-link label" ${linkAttrs(it.target, L)}>Projelerde gör →</a>` : ''}</li>`).join('\n')}
          </ul>${g.button && g.button.label ? `<a class="btn solid" ${linkAttrs(g.button.target, L)}${sa(T(g.button.labelStyle, NAV_BTN, { noAlign: true }))}>${esc(g.button.label)}</a>` : ''}</div></div>` : ''}
        </article>`).join('\n')}
      </div>
    </div>
  </section>`;

// ikas × The Goatz Studio işaret grubu (iş ortaklığı paneli ve metin bloğunda partnerLockup)
const ptLockup = (lg, cls = '') => `<div class="pt-lockup${cls}" role="img" aria-label="ikas ve The Goatz Studio iş ortaklığı">
          <span class="pt-ikas" lang="en"><i></i>ikas</span>
          <span class="pt-x" aria-hidden="true">×</span>
          <span class="pt-goatz">${lg ? `<img src="${lg}" alt="">` : ''}<svg class="pt-word" viewBox="660 120 1320 460" aria-hidden="true" focusable="false"><use href="#lg-text"/></svg></span>
        </div>`;
let LOGO = '';

// İş ortaklığı bölümü (ikas × The Goatz Studio): Neden biz'in hemen üstünde, kendi paneli
const partnerPanel = (w, L, c) => {
  if (!w.partnerShow) return '';
  const lg = imageUrl(c.brand.logoImage);
  const en = (t) => esc(t).replace(/ikas/gi, '<span lang="en">$&</span>');
  const chips = String(w.partnerChips || '').split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  const btn = w.partnerButtonLabel ? `<a class="btn solid pt-btn" ${linkAttrs(w.partnerButtonTarget || '#iletisim', L)}>${esc(w.partnerButtonLabel)}</a>` : '';
  return `
  <section class="panel partner" id="neden" aria-label="ikas iş ortaklığı">
    ${use('star', 'class="sticker pt-st st-pstar" data-pop style="left:3%;top:9%;width:clamp(44px,6vw,84px);rotate:-12deg"')}
    ${use('store', 'class="sticker pt-st st-pstore" data-pop style="right:3%;bottom:10%;width:clamp(48px,7vw,100px);rotate:10deg"')}
    <div class="pt-sky" aria-hidden="true"><i class="pt-moon"></i><b style="left:12%;top:18%"></b><b style="left:30%;top:70%"></b><b style="left:47%;top:12%"></b><b style="left:63%;top:80%"></b><b style="left:78%;top:22%"></b><b style="left:92%;top:55%"></b><b style="left:5%;top:50%"></b><b style="left:20%;top:38%"></b><b style="left:38%;top:90%"></b><b style="left:55%;top:45%"></b><b style="left:70%;top:8%"></b><b style="left:85%;top:85%"></b><b style="left:96%;top:15%"></b><b style="left:25%;top:8%"></b><b style="left:60%;top:62%"></b><b style="left:44%;top:30%"></b><b style="left:8%;top:86%"></b><b style="left:88%;top:40%"></b></div>
    <div class="partner-in">
      <div class="pt-left">
        ${ptLockup(lg)}
        ${w.partnerHeading ? `<h2 class="pt-h" data-reveal>${en(w.partnerHeading)}</h2>` : ''}
      </div>
      <div class="pt-right">
        ${w.partnerTitle ? `<p class="pt-tag">${en(w.partnerTitle)}</p>` : ''}
        ${w.partnerText ? `<p class="pt-text">${en(w.partnerText)}</p>` : ''}
        ${chips.length ? `<ul class="pt-chips">${chips.map((x) => `<li>${en(x)}</li>`).join('')}</ul>` : ''}
        ${btn}
      </div>
    </div>
  </section>`;
};

S.why = (w, L, c) => `
${partnerPanel(w, L, c)}
  <section class="panel why" id="${w.partnerShow ? 'neden-kartlar' : 'neden'}" aria-label="Neden biz" style="background:${color(w.background, 'paper')}">
    <h2 class="display italic why-h" data-reveal${sa(T(w.headingStyle, 'var(--heading)'))}>${br(w.heading)}</h2>
    ${w.showButtons ? `<div class="actions">
      ${c.hero.buttons.map((b) => `<a class="btn" ${linkAttrs(b.target, L)}${sa(T(b.labelStyle, NAV_BTN, { noAlign: true }))}>${esc(b.label)}</a>`).join('\n      ')}
    </div>` : ''}
    <div class="carousel" id="carousel" data-cards data-autoplay="4">
${w.cards.map((card, i) => {
      const back = String(card.text || '').trim();
      const label = esc(String(card.title).split('\n').join(' '));
      return `      <article class="c-card${back ? ' has-back' : ''}" data-card style="--cc:${color(card.color)}"${back ? ` role="button" tabindex="0" aria-pressed="false" aria-label="${label}, çevirmek için tıkla"` : ''}>
        <div class="c-flip">
          <div class="c-face c-front">
            ${imageUrl(card.image) ? `<img class="c-img" src="${imageUrl(card.image)}" alt="" loading="lazy">` : use(card.sticker, `class="sticker ${stClass(card.sticker)}" data-pop data-par="10,-10" style="rotate:${[12, -10, 8, -6, 10][i % 5]}deg"`)}
            <h3 class="display italic"${sa(T(card.titleStyle, 'clamp(40px, 4.6vw, 64px)', { self: true }))}>${br(card.title)}</h3>
            ${back ? '<span class="c-hint" aria-hidden="true">İncele <i>↻</i></span>' : ''}
          </div>
          ${back ? `<div class="c-face c-back"><b class="c-back-t label">${esc(label)}</b><p class="c-text"${sa(T(card.textStyle, 'clamp(17px, 1.7vw, 22px)', { noAlign: true }))}>${esc(back)}</p><span class="c-hint c-hint-back" aria-hidden="true">Geri dön <i>↺</i></span></div>` : ''}
        </div>
      </article>`;
    }).join('\n')}
    </div>
    <div class="dots" id="dots" aria-hidden="true"></div>
  </section>`;

S.band = (b) => {
  const base = 'clamp(56px, 8vw, 120px)';
  const ts = T(b.textStyle, base, { noAlign: true });
  const row = (colors) => Array(2).fill(colors).flat().map((col) =>
    `<span class="tagpill display italic" style="background:${color(col, 'paper')}${ts ? `;${ts}` : ''}"><span lang="en">${esc(b.text)}</span></span>`).join('');
  const dur = num(b.speed, 5, 200, 36);
  return `
  <section class="band" data-band aria-hidden="true">
    ${b.stickers.map((s, i) => stickerTag(s, i, 'band-st', ['', '30,-60', '0,-30', '20,0'][i % 4])).join('\n    ')}
    <div class="band-rows">
      <div class="band-row" style="animation-duration:${dur}s; --dir:-1">${row(b.row1)}</div>
      <div class="band-row" style="animation-duration:${dur}s; --dir:1">${row(b.row2)}</div>
      <div class="band-row" style="animation-duration:${dur}s; --dir:-1">${row(b.row3)}</div>
    </div>
  </section>`;
};

S.roadmap = (p, L) => `
  <section class="panel process roadmap" id="surec" aria-label="Nasıl çalışıyoruz" style="background:${color(p.background, 'paper')}">
    <div class="inner">
      <h2 data-heading${sa(T(p.headingStyle, 'clamp(28px, 4vw, 48px)'))}>${esc(p.heading)}</h2>
      ${p.intro ? `<p class="rm-intro">${esc(p.intro)}</p>` : ''}
      <ol class="rm" data-roadmap>
${p.roadmap.map((r, i) => `        <li class="rm-step" style="--c:${color(r.color, 'sun')}; --i:${i}">
          <span class="rm-no display italic" aria-hidden="true">${i + 1}</span>
          <div class="rm-ico">${use(r.sticker, `width="64%" class="${stClass(r.sticker)}"`)}</div>
          <h3 class="display">${br(r.title)}</h3>
          <p>${esc(r.text)}</p>
        </li>`).join('\n')}
      </ol>
      ${p.button && p.button.label ? `<a class="btn solid rm-cta" ${linkAttrs(p.button.target, L)}${sa(T(p.button.labelStyle, NAV_BTN, { noAlign: true }))}>${esc(p.button.label)}</a>` : ''}
    </div>
  </section>`;

S.process = (p, L) => p.roadmap && p.roadmap.length ? S.roadmap(p, L) : `
  <section class="panel process" id="surec" aria-label="Nasıl çalışıyoruz" style="background:${color(p.background, 'paper')}">
    <div class="inner">
      <h2 data-heading${sa(T(p.headingStyle, 'clamp(28px, 4vw, 48px)'))}>${esc(p.heading)}</h2>
      <div class="tabs">
        <div class="tablist" role="tablist" aria-label="Hizmet süreci">
          <span class="tab-bg" aria-hidden="true"></span>
${p.tabs.map((t, i) => `          <button class="tab" role="tab" id="t${i + 1}" aria-controls="p${i + 1}" aria-selected="${i === 0}"${i ? ' tabindex="-1"' : ''}${sa(T(t.tabStyle, '12px', { noAlign: true }))}>${esc(t.tab)}</button>`).join('\n')}
        </div>
      </div>
      <div class="tabpanels" data-tabpanels>
${p.tabs.map((t, i) => `      <div class="tabpanel feature${i ? '' : ' active'}" role="tabpanel" id="p${i + 1}" aria-labelledby="t${i + 1}"${i ? ' inert' : ''}>
        <div class="feature-media" style="background:${color(t.color, 'sun')}; display:grid; place-items:center">
          ${imageUrl(t.image) ? `<img src="${imageUrl(t.image)}" alt="" loading="lazy">` : use(t.sticker, `width="42%" class="tab-st ${stClass(t.sticker)}"`)}
        </div>
        <div>
          <h3 class="display"${sa('font-size:var(--heading)', T(t.titleStyle, 'var(--heading)'))}>${br(t.title)}</h3>
          <ol class="steps">
${t.steps.map((s) => `            <li${sa(T(t.stepsStyle, '15px', { noAlign: true }))}>${esc(s)}</li>`).join('\n')}
          </ol>
          ${t.button.label ? `<a class="btn solid" ${linkAttrs(t.button.target, L)}${sa(T(t.button.labelStyle, NAV_BTN, { noAlign: true }))}>${esc(t.button.label)}</a>` : ''}
        </div>
      </div>`).join('\n')}
      </div>
    </div>
  </section>`;

// Ana sayfa SSS: diğer sayfalardaki ortak SSS bölümüyle aynı
S.faq = (f, L, c, opts) => faqStd(f.heading, f.cards, L, opts);
// Ana sayfa uzun açıklaması: diğer sayfalardaki açıklama bloğuyla aynı ("Devamını oku", iki sütun)
S.about = (a, L) => (String(a.text || '').trim() ? B.text({ type: 'text', background: 'paper', eyebrow: a.eyebrow, heading: a.heading, text: a.text, align: 'left', collapse: true, button: {} }, L) : '');

S.contact = (c, L, all) => {
  const cards = ['whatsapp', 'instagram', 'email'].filter((k) => c.cards[k].visible);
  return `
  <footer class="panel contact" id="iletisim" style="background:${color(c.background, 'paper')}">
    <div class="inner">
      <h2 class="display italic" data-reveal${sa(T(c.headingStyle, 'var(--display-md)'))}>${br(c.heading)}</h2>
      ${cards.length ? `<div class="contact-grid cols-${cards.length}" data-cards>
        ${cards.map((k) => {
    const cd = c.cards[k];
    return `<a class="contact-card" data-card ${k === 'email' && L.contactUrl ? `href="${L.contactUrl}"` : L[k] ? linkAttrs(k, L) : 'href="#iletisim"'} style="background:${color(cd.color)}">
          <span class="label"${sa(T(cd.labelStyle, '12px'))}>${esc(cd.label)}</span>
          <div><h3 class="display"${sa(T(cd.titleStyle, 'clamp(36px, 4vw, 56px)'))}>${esc(cd.title)}</h3><span${sa(T(cd.infoStyle, '15px'))}>${esc(L[`${k}Label`])}</span></div>
        </a>`;
  }).join('\n        ')}
      </div>` : ''}
    </div>
  </footer>`;
};

S.footer = (f, L, c) => {
  const pages = resolvePages(c.pages).filter((p) => p.visible && p.inNav);
  const dark = ['carbon', 'violet', 'blue', 'ember'].includes(f.background);
  const logoImg = imageUrl(c.brand.logoImage);
  const links = [
    ...c.nav.links.filter((l) => String(l.target).trim() !== '#iletisim').map((l) => `<li><a class="sf-link" ${linkAttrs(l.target, L)}>${esc(l.label)}</a></li>`),
    ...pages.map((p) => `<li><a class="sf-link" href="${pagePath(p)}">${esc(p.navLabel || p.title)}</a></li>`),
    ...(f.extraLinks || []).filter((l) => String(l.label || '').trim()).map((l) => `<li><a class="sf-link" ${linkAttrs(l.target, L)}>${esc(l.label)}</a></li>`),
  ].join('\n          ');
  const legal = (f.legalLinks || []).filter((l) => String(l.label || '').trim()).map((l) => `<li><a class="sf-link" ${linkAttrs(l.target, L)}>${esc(l.label)}</a></li>`).join('\n          ');
  const contacts = [
    L.whatsapp ? `<li><a class="sf-link" lang="en" href="${esc(L.whatsapp)}" target="_blank" rel="noopener">WhatsApp</a></li>` : '',
    L.instagram ? `<li><a class="sf-link" lang="en" href="${esc(L.instagram)}" target="_blank" rel="noopener">Instagram</a></li>` : '',
    L.email ? `<li><a class="sf-link" lang="en" href="${esc(L.email)}" aria-label="E-posta gönder: ${esc(L.emailLabel)}">Mail</a></li>` : '',
  ].filter(Boolean).join('\n          ');
  return `
  <footer class="panel site-footer" id="altbilgi" style="background:${color(f.background, 'carbon')}; --ft:${dark ? 'var(--paper)' : 'var(--carbon)'}; --fb:${color(f.background, 'carbon')}">
    ${f.stickers.map((s, i) => stickerTag(s, i, 'ft-st', ['10,-10', '-8,12'][i % 2])).join('\n    ')}
    <div class="inner">
      <div class="sf-top">
        <div class="sf-brand">
          ${f.showLogo ? (logoImg ? `<img class="sf-logo" src="${logoImg}" alt="${esc(c.brand.siteName)}" loading="lazy">` : `<p class="sf-logo-text display">${esc(c.brand.logoText)}</p>`) : ''}
          ${f.description ? `<p${sa(T(f.descriptionStyle, '16px'))}>${esc(f.description)}</p>` : ''}
          ${footerMap()}
          ${f.companyInfo ? `<p class="sf-company">${esc(f.companyInfo).replace(/\n/g, '<br>')}</p>` : ''}
        </div>
        ${f.showLegal && legal ? `<nav class="sf-col" aria-label="Yasal">
          <p class="label"${sa(T(f.legalTitleStyle, '12px'))}>${esc(f.legalTitle)}</p>
          <ul>
          ${legal}
          </ul>
        </nav>` : ''}
        ${f.showLinks && links ? `<nav class="sf-col" aria-label="Alt menü">
          <p class="label"${sa(T(f.linksTitleStyle, '12px'))}>${esc(f.linksTitle)}</p>
          <ul>
          ${links}
          </ul>
        </nav>` : ''}
        ${f.showContact && contacts ? `<div class="sf-col">
          <p class="label"${sa(T(f.contactTitleStyle, '12px'))}>${esc(f.contactTitle)}</p>
          <ul>
          ${contacts}
          </ul>
        </div>` : ''}
      </div>
      ${f.bigText ? `<p class="sf-big display italic" data-reveal aria-label="${esc(f.bigText)}"${sa(T(f.bigTextStyle, ''))}>${esc(f.bigText)}</p>` : ''}
      <div class="foot">
        <span${sa(T(f.copyrightStyle, '13px'))}>${esc(f.copyright)}</span>
        <span${sa(T(f.taglineStyle, '13px'))}>${esc(f.tagline)}</span>
      </div>
    </div>
  </footer>`;
};

// ---------- Özel sayfalar: bloklar ----------
// L verilirse (metin bloğu): "## Ara başlık" paragrafı h3 olur, [yazı](page:id) iç bağlantıya döner.
const inlineLinks = (h, L) => (L ? h.replace(/\[([^\]\n]{1,120})\]\(([^)\s]{1,120})\)/g, (m, label, t) => `<a class="txt-link" ${linkAttrs(t, L)}>${label}</a>`) : h);
const paras = (text, st, base, L) => String(text || '').split(/\r?\n\s*\r?\n/).map((x) => x.trim()).filter(Boolean)
  .map((x) => (L && /^## /.test(x)
    ? `<h3 class="txt-h display">${esc(x.slice(3).trim())}</h3>`
    : `<p${sa(T(st, base))}>${inlineLinks(esc(x), L).replace(/\r?\n/g, '<br>')}</p>`)).join('\n      ');
const blockHead = (b) => `${b.eyebrow ? `<p class="eyebrow label"${sa(T(b.eyebrowStyle, '12px'))}>${esc(b.eyebrow)}</p>` : ''}${b.heading ? `<h2 class="display${FIX_RE.test(b.heading) ? ' has-fix' : ''}" data-reveal${sa(T(b.headingStyle, 'var(--heading)'))}>${brFix(b.heading)}</h2>` : ''}`;
const blockButton = (b, L) => (b.button && b.button.label
  ? `<a class="btn solid" ${linkAttrs(b.button.target, L)}${sa(T(b.button.labelStyle, NAV_BTN, { noAlign: true }))}>${esc(b.button.label)}</a>` : '');

const B = {};

// collapse açıksa metnin tamamı sayfada (Google okur) ama ilk kısmı görünür; "Devamını oku" ile açılır (site.js). JavaScript yoksa metin tam görünür.
B.text = (b, L) => `
  <section class="panel blk blk-text${b.collapse ? ' blk-more' : ''}" style="background:${color(b.background, 'paper')}${b.collapse ? `; --more-bg:${color(b.background, 'paper')}` : ''}">
    <div class="inner blk-in${b.align === 'center' ? ' is-center' : ''}">
      ${b.partnerLockup ? `<div class="head-lockup">${blockHead(b)}${ptLockup(LOGO, ' is-side')}</div>` : blockHead(b)}
      ${b.collapse ? `<div class="txt-more" data-more>
      ${paras(b.text, b.textStyle, '18px', L)}
      </div>
      <button type="button" class="btn txt-more-btn" data-more-btn aria-expanded="false" hidden>Devamını oku</button>` : paras(b.text, b.textStyle, '18px', L)}
      ${blockButton(b, L)}
    </div>
  </section>`;

B.imagetext = (b, L) => {
  const img = imageUrl(b.image);
  const stack = (b.images || []).map((x) => imageUrl(x.image)).filter(Boolean);
  return `
  <section class="panel blk blk-imagetext" style="background:${color(b.background, 'paper')}">
    <div class="inner features">
      <article class="feature${b.imageSide === 'right' ? ' rev' : ''}">
        <div class="feature-media${stack.length ? ' is-stack' : ''}${!img && b.imageSticker === 'vitrin' ? ' is-bare' : ''}" style="background:${color(b.imageColor)}${img || stack.length ? '' : '; display:grid; place-items:center'}">
          ${stack.length ? stack.map((u) => `<img src="${u}" alt="${esc(b.heading || 'Ürün ve web tasarım örneği')}" loading="lazy">`).join('') : img ?`<img src="${img}" alt="${esc(b.heading)}" loading="lazy" data-par="-6,6">` : use(b.imageSticker, `class="${stClass(b.imageSticker)}" style="width:${b.imageSticker === 'vitrin' ? 86 : 46}%" data-pop`)}
        </div>
        <div class="blk-in">
          ${blockHead(b)}
          ${paras(b.text, b.textStyle, '18px')}
          ${blockButton(b, L)}
        </div>
      </article>
    </div>
  </section>`;
};

B.cards = (b, L) => {
  const cols = num(b.columns, 1, 4, 3);
  return `
  <section class="panel blk blk-cards" style="background:${color(b.background, 'paper')}">
    <div class="inner blk-in${b.align === 'center' ? ' is-center' : ''}">
      ${blockHead(b)}
      ${paras(b.text, b.textStyle, '18px')}
      <div class="k-grid" data-cards style="--cols:${cols}">
${b.cards.map((k) => `        <article class="k-card" data-card style="background:${color(k.color)}">
          ${imageUrl(k.image) ? `<img class="k-img" src="${imageUrl(k.image)}" alt="" loading="lazy">` : use(k.sticker, `class="sticker k-st ${stClass(k.sticker)}" data-pop data-par="8,-8"`)}
          <h3 class="display italic"${sa(T(k.titleStyle, 'clamp(28px, 3vw, 40px)'))}>${br(k.title)}</h3>
          ${k.text ? `<p${sa(T(k.textStyle, '15px'))}>${esc(k.text)}</p>` : ''}
          ${k.target ? `<a class="k-link" ${linkAttrs(k.target, L)} aria-label="${esc(String(k.title).replace(/\s+/g, ' '))} hakkında detaylı bilgi">Detaylı bilgi <span aria-hidden="true">→</span></a>` : ''}
        </article>`).join('\n')}
      </div>
      ${blockButton(b, L)}
    </div>
  </section>`;
};

B.form = (b, L) => {
  const links = [L.whatsapp && ['WhatsApp', L.whatsapp, L.whatsappLabel], L.email && ['E-posta', L.email, L.emailLabel], L.instagram && ['Instagram', L.instagram, L.instagramLabel]].filter(Boolean);
  return `
  <section class="panel blk blk-form" style="background:${color(b.background, 'paper')}">
    <div class="inner cf">
      <div class="blk-in">
        ${blockHead(b)}
        ${paras(b.text, b.textStyle, '18px')}
        ${links.length ? `<ul class="cf-links">${links.map(([n, h, l]) => `<li><span class="label">${esc(n)}</span><a lang="en" href="${esc(h)}"${/^https?:/.test(h) ? ' target="_blank" rel="noopener"' : ''}>${esc(l)}</a></li>`).join('')}</ul>` : ''}
      </div>
      <form class="cf-form" data-contact-form novalidate>
        <label><span class="label">Adın soyadın</span><input name="name" autocomplete="name" required maxlength="120"></label>
        <label><span class="label">E-posta</span><input name="email" type="email" autocomplete="email" required maxlength="160"></label>
        <label><span class="label">Telefon (isteğe bağlı)</span><input name="phone" type="tel" autocomplete="tel" maxlength="40"></label>
        <label><span class="label">Mesajın</span><textarea name="message" rows="5" required maxlength="4000"></textarea></label>
        <input class="cf-hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
        <button class="btn solid" type="submit">${esc((b.button && b.button.label) || 'Gönder')} ↗</button>
        <p class="cf-status" role="status" aria-live="polite"></p>
      </form>
    </div>
  </section>`;
};

// Konum bloğu: OpenStreetMap'in gömülü haritası, sitenin renklerine boyanır; pin ve etiket sitenin kendi çizimi. Haritaya tıklayınca Google Haritalar açılır.
// Google İşletme Profili (Haritalar) paylaşım bağlantısı: harita kartları buraya gider, şemada hasMap/sameAs
const GBP_URL = 'https://share.google/tStxu2U6N9z0wHFCM';
const MAP = { lat: 40.14634, lon: 26.40084, dLat: 0.0020, dLon: 0.0034 };
// Alt bilgideki küçük konum kartı (firma bilgisinin yerine): aynı harita, sitenin renklerine boyalı
const footerMap = () => {
  return `<a class="sf-map" href="${GBP_URL}" target="_blank" rel="noopener" aria-label="The Goatz Studio konumu (Google Haritalar'da aç)">
    <img class="map-img" src="/map-goatz-light.svg" alt="The Goatz Studio ofisinin Çanakkale’deki konumu (harita)" loading="lazy" decoding="async">
    
    <span class="map-pin" aria-hidden="true"><b>The Goatz Studio</b><i></i></span>
  </a><p class="sf-city">Çanakkale, Türkiye</p>`;
};
B.map = (b, L) => {
  const href = (b.button && /^https?:/.test(b.button.target)) ? b.button.target : GBP_URL;
  return `
  <section class="panel blk blk-map" style="background:${color(b.background, 'paper')}">
    <div class="inner map-wrap">
      <div class="map-col">
      <a class="map-card" href="${esc(href)}" target="_blank" rel="noopener" aria-label="${esc(b.heading || 'Konum')} (Google Haritalar'da aç)">
        <img class="map-img" src="/map-goatz.svg" alt="The Goatz Studio ofisinin Çanakkale’deki konumu (harita)" loading="lazy" decoding="async">
        
        <span class="map-pin" aria-hidden="true"><b>The Goatz Studio</b><i></i></span>
      </a>
        <p class="map-city">Çanakkale, Türkiye</p>
      </div>
      <div class="map-info">
        ${blockHead(b)}
        ${paras(b.text, b.textStyle, '18px')}
        <a class="btn primary map-btn" href="${esc(href)}" target="_blank" rel="noopener">${esc((b.button && b.button.label) || 'Yol tarifi al')} ↗</a>
      </div>
    </div>
  </section>`;
};

// Sepet sayfası: içerik cart.js ile tarayıcıdaki sepetten çizilir; benzer işler için veri sayfaya gömülür
// Sık sorulan sorular: açılır kapanır liste (details/summary, JavaScript gerekmez). Cevapta {{Metin|/adres}} yazılırsa o adrese iç bağlantı olur; {{Metin|whatsapp}} iletişimdeki WhatsApp numarasına gider.
const faqHtml = (s, L) => esc(s).replace(/\r?\n/g, '<br>')
  .replace(/\{\{([^|{}]+)\|whatsapp\}\}/g, (m, t) => (L && L.whatsapp ? `<a href="${esc(L.whatsapp)}" target="_blank" rel="noopener">${t}</a>` : t))
  .replace(/\{\{([^|{}]+)\|(\/[^{}\s"<>]*)\}\}/g, '<a href="$2">$1</a>');
const faqPlain = (s) => String(s || '').replace(/\{\{([^|{}]+)\|[^{}]*\}\}/g, '$1').replace(/\s+/g, ' ').trim();
B.faq = (b, L, opts) => {
  const items = (b.cards || []).filter((k) => String(k.title || '').trim() && String(k.text || '').trim());
  if (opts) { opts.faqItems = opts.faqItems || []; items.forEach((k) => opts.faqItems.push({ q: faqPlain(k.title), a: faqPlain(k.text) })); }
  return `
  <section class="panel blk blk-faq" data-bg="${esc(b.background || 'paper')}" style="background:${color(b.background, 'paper')}">
    <div class="inner blk-in">
      ${blockHead(b)}
      ${paras(b.text, b.textStyle, '18px')}
      <div class="faq-list">
${items.map((k) => `        <details class="faq-item"><summary><span>${esc(k.title)}</span><i aria-hidden="true"></i></summary><div class="faq-a"><p>${faqHtml(k.text, L)}</p></div></details>`).join('\n')}
      </div>
      ${blockButton(b, L)}
    </div>
  </section>`;
};

// Sitedeki tüm SSS bölümleri (SSS sayfası dışında) aynı görünür: sarı zemin, "SSS" üst etiketi, "Tüm sorular" butonu
const FAQ_STD = { type: 'faq', background: 'sun', eyebrow: 'SSS', text: '', align: 'left', button: { label: 'Tüm sorular ↗', target: 'page:sss' } };
const faqStd = (heading, cards, L, opts) => ((cards || []).some((k) => String(k.title || '').trim() && String(k.text || '').trim()) ? B.faq({ ...FAQ_STD, heading: heading || 'Sık sorulan sorular', cards }, L, opts) : '');

B.cartpage = (b, L) => `
  <section class="panel blk blk-cartpage" style="background:${color(b.background, 'paper')}">
    <div class="inner">
      <div data-cart-page data-kvkk="${esc((L.pageUrls && L.pageUrls.kvkk) || '')}"><p class="cp-empty">Sepetiniz yükleniyor…</p></div>
      <script type="application/json" id="cart-works">${JSON.stringify(L.cartWorks || {}).replace(/</g, '\\u003c')}</script>
    </div>
  </section>`;

B.wizard = (b, L) => `
  <section class="panel blk blk-wizard" style="background:${color(b.background, 'paper')}">
    <div class="inner">
      <div class="wz-timer" data-wz-timer data-state="idle" role="timer" aria-label="Süre"><span class="wz-timer-ic" aria-hidden="true">⏱</span><span class="wz-timer-txt">En fazla 2 dakikanı alacağım</span><b class="wz-timer-clock">02:00</b><span class="wz-timer-bar" aria-hidden="true"><i></i></span></div>
      <div class="wz" data-wizard data-kvkk="${esc((L.pageUrls && L.pageUrls.kvkk) || '')}">
        <div class="wz-head"><span class="wz-stage"></span><span class="wz-count"></span></div>
        <div class="wz-track" role="progressbar" aria-label="İlerleme" aria-valuemin="0" aria-valuemax="100"><div class="wz-fill"></div></div>
        <div class="wz-screen" aria-live="polite"></div>
        <div class="wz-foot"><button type="button" class="wz-btn wz-back">← Geri</button><span class="wz-hint"></span><button type="button" class="wz-btn primary wz-next">Devam et →</button></div>
      </div>
    </div>
  </section>`;

B.gallery = (b, L, opts) => {
  const cols = num(b.columns, 1, 5, 3);
  const ratio = ['square', 'portrait', 'wide', 'natural'].includes(b.ratio) ? b.ratio : 'square';
  const items = b.images.filter((g) => imageUrl(g.image));
  return `
  <section class="panel blk blk-gallery" style="background:${color(b.background, 'paper')}">
    <div class="inner blk-in${b.align === 'center' ? ' is-center' : ''}">
      ${blockHead(b)}
      ${paras(b.text, b.textStyle, '18px')}
      ${items.length
    ? `<div class="g-grid" data-cards data-ratio="${ratio}" style="--cols:${cols}">
${items.map((g) => `        <button type="button" class="g-item" data-card data-full="${imageUrl(g.image)}" data-caption="${esc(g.caption)}" aria-label="${esc(g.caption || 'Görseli büyüt')}"><img src="${imageUrl(g.image)}" alt="${esc(g.caption)}" loading="lazy">${g.caption ? `<span class="g-cap">${esc(g.caption)}</span>` : ''}</button>`).join('\n')}
      </div>`
    : (opts.preview ? '<p class="g-empty">Galeri boş. Soldaki panelden görsel ekle.</p>' : '')}
    </div>
  </section>`;
};

// Blog: tarih "3 Ekim 2026" biçiminde; sayfanın ilk görseli liste kartında ve paylaşım görselinde kullanılır
const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const trDate = (d) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(d || '')); return m ? `${Number(m[3])} ${AYLAR[Number(m[2]) - 1]} ${m[1]}` : ''; };
const firstImage = (p) => {
  for (const b of (p && p.blocks) || []) {
    if (!b.visible) continue;
    const u = imageUrl(b.image) || ((b.images || []).map((x) => imageUrl(x.image)).find(Boolean)) || ((b.cards || []).map((k) => imageUrl(k.image)).find(Boolean));
    if (u) return u;
  }
  return '';
};
const blogCards = (posts) => `<div class="bl-grid" data-cards>
${posts.map((p) => `        <a class="bl-card" data-card href="${esc(p.url)}" style="--bc:${color(p.color, 'sky')}">
          ${p.image ? `<img src="${p.image}" alt="${esc(p.title)}" loading="lazy"><span class="bl-head"><h3 class="display italic">${esc(p.title)}</h3></span>` : `<span class="bl-head bl-ph"><h3 class="display italic">${esc(p.title)}</h3></span>`}
          <span class="bl-body">${p.summary ? `<p>${esc(p.summary)}</p>` : ''}<span class="bl-foot"><span class="bl-more">Yazıyı oku →</span>${p.date ? `<time class="label" datetime="${esc(p.date)}">${esc(trDate(p.date))}</time>` : ''}</span></span>
        </a>`).join('\n')}
      </div>`;
// Blog listesi: yayındaki blog yazıları (sayfa türü "Blog yazısı"), yeniden eskiye
B.bloglist = (b, L, opts) => `
  <section class="panel blk blk-bloglist" style="background:${color(b.background, 'paper')}">
    <div class="inner blk-in${b.align === 'center' ? ' is-center' : ''}">
      ${blockHead(b)}
      ${paras(b.text, b.textStyle, '18px')}
      ${(L.blogPosts || []).length ? blogCards(L.blogPosts) : (opts && opts.preview ? '<p class="g-empty">Henüz blog yazısı yok. Yeni sayfa ekleyip türünü "Blog yazısı" seç.</p>' : '')}
      ${blockButton(b, L)}
    </div>
  </section>`;

// Kapı müşterisi beklemeye son: ilk iki kelime sağa yatık, başlık tek satır
const leanTitle = (t) => {
  const w = String(t).trim().split(/\s+/);
  return w.length > 2 ? `<span class="t-lean">${esc(w.slice(0, 2).join(' '))}</span> ${esc(w.slice(2).join(' '))}` : br(t);
};

// Alt sayfa slayt zemini: ana sayfadaki şeridin aynı dili (düz renkli, siyah kenarlı kıvrımlı bant), ama her sayfa grubunda farklı bir kıvrım ve daha soluk
const BG_GROUP = { kweb: 'web', anahtarteslim: 'web', tekstudyo: 'web', ikas: 'web', isler: 'web', kseo: 'seo', googleseo: 'seo', kfoto: 'foto', uruncekimi: 'foto', kpazar: 'pazar', kdanis: 'yol', nasilcalisiyoruz: 'yol', kmetin: 'metin', blog: 'metin', kmarka: 'marka', kuygulama: 'app', sss: 'chat', iletisim: 'pin', nedenbiz: 'star' };
const bgGroup = (p) => BG_GROUP[p.id] || BG_GROUP[p.parent] || (p.kind === 'blog' ? 'metin' : !p.id ? 'web' : 'dots');
const BG_PATH = {
  web: 'M-80 300 C 300 120, 520 520, 860 420 S 1260 120, 1540 260',
  seo: 'M-80 900 C 260 820, 420 640, 700 600 S 1180 300, 1540 120',
  foto: 'M-80 640 C 240 980, 700 1000, 900 760 S 1100 300, 1540 420',
  pazar: 'M-80 180 C 360 260, 380 760, 760 820 S 1300 560, 1540 860',
  yol: 'M-80 760 C 200 600, 420 900, 720 780 S 1160 560, 1540 700',
  metin: 'M-80 560 C 300 400, 600 700, 900 540 S 1300 400, 1540 500',
  marka: 'M-80 120 C 200 400, 120 700, 480 860 S 1200 900, 1540 640',
  app: 'M1540 160 C 1200 260, 1300 640, 980 760 S 380 700, -80 900',
  chat: 'M-80 420 C 220 200, 520 260, 600 520 S 980 940, 1540 620',
  pin: 'M-80 860 C 300 700, 600 900, 860 640 S 1100 160, 1540 220',
  star: 'M-80 260 C 400 120, 600 440, 820 360 S 1240 600, 1540 520',
  dots: 'M-80 700 C 260 520, 560 820, 820 640 S 1220 420, 1540 560',
};
// Süreç sayfası zemini: ilk yeniden tasarım (fdd2ffd): dört köşede sade, soyut çizgi deseni (kesik çizgili yol, üç durak, bayrak)
// Süreç zemini: dört köşede aynı dilde (kesik çizgili yol, boş daireli duraklar, bayrak, birkaç kıvılcım) sade çizgi sanatı. Alt iki köşedeki yol aynı yükseklikte buluşur, üstteki köşeler yola doğru yönlenir.
const SP = (x, y, r = 9) => `<path d="M${x} ${y - r}V${y + r}M${x - r} ${y}H${x + r}"/>`;
const ROAD_ART = {
  tl: '<path d="M30 70C150 70 190 150 280 190S470 200 560 300" stroke-dasharray="20 18"/><circle cx="52" cy="70" r="20"/><circle cx="52" cy="70" r="6"/><path d="M330 60l14 14M344 60l-14 14"/><circle cx="420" cy="110" r="5"/><circle cx="470" cy="62" r="3"/>' + SP(250, 300, 10) + '<path d="M60 280q30-26 60 0t60 0"/>',
  tr: '<path d="M0 300C90 220 170 250 260 190S470 130 530 60" stroke-dasharray="20 18"/><path d="M300 40h150l-24 36 24 36H300z M300 40v210"/><path d="M300 76h126M300 112h126" stroke-dasharray="2 14"/><circle cx="300" cy="256" r="10"/>' + SP(130, 80, 10) + '<circle cx="70" cy="140" r="5"/><circle cx="210" cy="110" r="3"/>',
  bl: '<path d="M0 360C120 300 230 420 360 360S500 330 560 350" stroke-dasharray="20 18"/><circle cx="150" cy="332" r="20"/><circle cx="150" cy="332" r="6"/><path d="M420 345v-70M420 275h46l-10 18 10 18h-46"/><circle cx="300" cy="170" r="5"/><circle cx="90" cy="200" r="3"/>' + SP(210, 220, 10) + '<path d="M460 130h60M490 100v60"/>',
  br: '<path d="M0 350C70 340 140 310 250 330S440 420 560 340" stroke-dasharray="20 18"/><circle cx="330" cy="352" r="20"/><circle cx="330" cy="352" r="6"/><circle cx="90" cy="332" r="9"/><path d="M470 330v-60M470 270h-44M455 270l-14-10M455 270l-14 10"/><circle cx="200" cy="180" r="5"/><circle cx="480" cy="140" r="3"/>' + SP(400, 200, 10) + '<path d="M60 120q30-26 60 0t60 0"/>',
};
const BG_CORNERS = ['tl', 'tr', 'bl', 'br'];
const roadBg = () => BG_CORNERS.map((k) => `<svg class="page-bg pb-${k}" viewBox="0 0 560 460" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">${ROAD_ART[k]}</svg>`).join('');

const pageBg = (page) => {
  const r = (page.hero && page.hero.ribbon) || {};
  if (r.visible === false) return '';
  if (page.id === 'nasilcalisiyoruz') return roadBg();
  // Bant, sayfa zemininin biraz koyusu: aynı renk ailesinde, dikkat çekmez (ton üstüne ton)
  const d = BG_PATH[bgGroup(page)], bg = color(page.background, 'sky'), rc = color(r.color, 'blue');
  const c = rc !== bg ? `color-mix(in srgb, ${bg} 72%, ${rc})` : `color-mix(in srgb, ${bg} 88%, #000)`;
  return `<svg class="ribbon page-ribbon" viewBox="0 0 1440 980" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <g filter="url(#grain)">
        <rect x="-200" y="-200" width="1840" height="1380" fill="none"/>
        <path class="pr-band" d="${d}" fill="none" style="stroke:${c}" stroke-width="150" stroke-linecap="round"/>
        <path class="shine" d="${d}" transform="translate(0 -10)" fill="none" stroke-width="40" stroke-linecap="round" filter="url(#soft)" opacity=".5"/>
      </g>
    </svg>`;
};

function pageHero(page) {
  const h = page.hero;
  const ts = num(h.titleSize, 4, 30, 12);
  const base = `clamp(48px, ${ts}vw, ${ts * 16.6}px)`;
  return `
  <section class="panel hero page-hero${page.id === 'nasilcalisiyoruz' ? ' pg-road' : ''}" style="background:${color(page.background, 'sky')}">
    ${pageBg(page)}
    ${h.stickers.map((st, i) => stickerTag(st, i, 'hero-st', ['12,-12', '-10,10', '8,-14', '-12,8'][i % 4])).join('\n    ')}
    ${crumbHtml()}
    ${h.eyebrow ? (h.eyebrowHref ? `<a class="eyebrow label page-eyebrow page-eyebrow-link" href="${esc(h.eyebrowHref)}" data-back>← ${esc(h.eyebrow)}</a>` : `<p class="eyebrow label page-eyebrow"${sa(T(h.eyebrowStyle, '12px'))}>${esc(h.eyebrow)}</p>`) : ''}
    <h1 class="display${page.id === 'tekstudyo' ? ' t-hang' : ''}" data-intro${h.titleLang === 'en' ? ' lang="en"' : ''}${sa(`font-size:${base}`, T(h.titleStyle, base))}>${page.id === 'tekstudyo' ? leanTitle(h.title || page.title) : br(h.title || page.title)}${h.h1Suffix ? `<span class="sr-only">${esc(h.h1Suffix)}</span>` : ''}</h1>
    ${h.subtitle ? `<p class="tagline" data-sub${sa(T(h.subtitleStyle, 'clamp(24px, 4.4vw, 64px)'))}>${esc(h.subtitle)}</p>` : ''}
    ${page.kind === 'blog' && trDate(page.date) ? `<p class="label blog-date"><time datetime="${esc(page.date)}">${esc(trDate(page.date))}</time></p>` : ''}
  </section>`;
}


// ---------- İşler (portföy) ----------
// Görsel alt metinleri (SEO): iş görseli "<ad> web sitesi tasarımı / web uygulaması", çekim "<açıklama> ürün fotoğrafı"
const workAltKey = (title, k) => `${title} ${k === 'app' ? 'web uygulaması' : k === 'consulting' ? 'danışmanlık projesi' : 'web sitesi tasarımı'}`;
const workAlt = (w, v) => workAltKey(v.title, workCategory(w, v.category).key);
const photoAlt = (x) => { const t = String(x.caption || '').replace(/\s*·\s*/g, ', '); return !t ? `${x.category || 'Ürün'} ürün fotoğrafı örneği` : /afiş|görsel/i.test(t) ? t : `${t} ürün fotoğrafı`; };
const workCategory = (w, key) => w.categories.find((c) => c.key === key) || w.categories[0] || { key: 'web', label: '', color: 'mint', sticker: 'browser', browser: true };
const safeUrl = (u) => (/^https?:\/\/[^\s"'<>]+$/.test(String(u || '').trim()) ? String(u).trim() : '');
const hostOf = (u) => safeUrl(u).replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/^www\./, '');
// Açıklama: boş satırla paragraflar; "* " ya da "- " ile başlayan satırlar madde listesi olur.
function workRich(text, skipHeading) {
  return String(text || '').split(/\r?\n\s*\r?\n/).map((b) => b.trim()).filter(Boolean).map((block) => {
    const out = []; let list = [];
    const flush = () => { if (list.length) { out.push(`<ul>${list.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>`); list = []; } };
    block.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).forEach((l) => {
      if (/^[-*•]\s+/.test(l)) list.push(l.replace(/^[-*•]\s+/, ''));
      else { flush(); if (!skipHeading) out.push(`<p>${esc(l)}</p>`); }
    });
    flush();
    return out.join('');
  }).join('');
}
const workTags = (it) => (it.tags || []).map((t) => String(t).trim()).filter(Boolean);


// "Kısa özellikler": madde işaretli satırlar çip olarak gösterilir, diğer satırlar başlık olur.
function workFeatures(text, avoid = []) {
  const lines = String(text || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  let head = lines.filter((l) => !/^[-*•]\s+/.test(l))[0];
  if (head && avoid.some((a) => String(a).trim().toLocaleLowerCase('tr') === head.toLocaleLowerCase('tr'))) head = 'Yapılan İşler';
  const items = lines.filter((l) => /^[-*•]\s+/.test(l)).map((l) => l.replace(/^[-*•]\s+/, ''));
  return `${head ? `<h2 class="display italic work-feat-h">${esc(head)}</h2>` : ''}<ul class="work-chips">${items.map((t) => `<li><i aria-hidden="true">✓</i>${esc(t)}</li>`).join('')}</ul>`;
}

// Kelime kelime üzerine gelince sarıyla vurgulanan metin
const hw = (t) => esc(t).split(/(\s+)/).map((w) => (!w || /^\s+$/.test(w) ? w : `<span class="hw">${w}</span>`)).join('');

const STAR_SVG = '<span class="rs"><svg viewBox="0 0 100 100" aria-hidden="true"><use href="#s-star"/></svg></span>';
const ratingStars = () => `<span class="rating" role="img" aria-label="5 yıldız">${STAR_SVG.repeat(5)}</span>`;
// Bölüm başlığındaki konuya uygun sticker
function topicSticker(title, index) {
  const t = String(title || '').toLocaleLowerCase('tr');
  const rules = [
    [/anahtar teslim/, () => 'box'], [/mobil/, () => 'grid'], [/linkleme/, () => 'link'], [/merchant/, () => 'store'], [/ölçümleme|tag manager/, () => 'chart'],
    [/google arama/, () => 'medal'], [/seo/, () => 'magnifier'], [/çok dilli/, () => 'globe'], [/blog|içerik yönetimi/, () => 'pencil'], [/hız|kullanılabilirlik/, () => 'rocket'],
    [/url|yönlendirme/, () => 'signpost'], [/mimari/, () => 'map'], [/yayın sonrası|teknik yapı/, () => 'gear'],
    [/pazaryeri/, () => 'cart'], [/yönetim paneli/, () => 'sliders'], [/ürün.*kategori|ürün ve/, () => 'product'],
    [/nedir/, () => (/harita/.test(t) ? 'map' : /yorum/.test(t) ? 'chat' : /kategori/.test(t) ? 'medal' : 'star')],
    [/çok satan/, () => 'star'], [/sayfalar/, () => 'grid'], [/şablon/, () => 'palette'], [/metin|renk/, () => 'sliders'], [/önizleme/, () => 'browser'],
    [/neden kullan/, () => (/yorum/.test(t) ? 'check' : 'cart')],
    [/sosyal kan[ıi]t/, () => (/görsel odak/.test(t) ? 'photo' : 'heart')],
    [/son sipariş|teslimat/, () => 'truck'],
    [/şehir/, () => 'pin'], [/rozet/, () => 'medal'], [/mağaza|konum/, () => 'store'],
    [/birleştir/, () => 'link'], [/standart/, () => 'star'], [/güven|memnun/, () => 'coin'], [/kart/, () => 'sliders'],
    [/yerleşim/, () => 'grid'], [/marka|tasar[ıi]m/, () => 'palette'], [/yorum/, () => 'chat'],
  ];
  for (const [re, pick] of rules) if (re.test(t)) return pick();
  return SEC_STICKERS[index % SEC_STICKERS.length];
}
// Projenin vitrin alanındaki sticker'lar
function workIcons(it, cat) {
  const t = String(it.title || '').toLocaleLowerCase('tr');
  if (it.fun === 'map' || /harita/.test(t)) return ['map', 'pin'];
  if (it.fun === 'reviews' || /yorum/.test(t)) return ['chat', 'coin'];
  if (it.fun === 'delivery' || /teslimat/.test(t)) return ['truck', 'box'];
  if (it.fun === 'badges' || /kategori/.test(t)) return ['medal', 'star'];
  if (/danışman/.test(t)) return ['refresh', 'chart'];
  if (/yönetim/.test(t)) return ['browser', 'star'];
  const alt = ['layers', 'bulb', 'type', 'tag', 'code', 'phone', 'bag'];
  return [stickerId(cat.sticker) ? cat.sticker : 'browser', alt[[...t].reduce((a, ch) => a + ch.charCodeAt(0), 0) % alt.length]];
}
const SEC_STICKERS = ['layers', 'type', 'bulb', 'tag', 'code', 'phone', 'bag'];
const SEC_COLORS = ['sky', 'mint', 'lavender', 'sun', 'paper'];

// Detay sayfasındaki küçük, oynanabilir gösterimler
function workFun(kind) {
  if (kind === 'map') {
    return `<div class="fun fun-map" data-fun="map" data-cities="İzmir,Ankara,İstanbul,Çanakkale,Bursa,Antalya">
      <div class="fm-stage"><svg class="fm-pin" viewBox="0 0 40 52" aria-hidden="true"><path d="M20 2C10 2 3 9.5 3 19c0 12 17 31 17 31s17-19 17-31C37 9.5 30 2 20 2z" fill="#fb4903" stroke="#000" stroke-width="3"/><circle cx="20" cy="19" r="6.5" fill="#fff" stroke="#000" stroke-width="2.5"/></svg><span class="fm-ring"></span></div>
      <div class="fm-side"><p class="fm-bubble label">Son sipariş: <b data-city>İzmir</b></p>
      <ul class="fm-levels" aria-label="Şehir seviyeleri"><li class="on">★ 1. seviye</li><li>★★ 2. seviye</li><li>★★★ 3. seviye</li></ul>
      <p class="fun-note">Örnek gösterim · dokunarak şehir değiştir</p></div></div>`;
  }
  if (kind === 'delivery') {
    return `<div class="fun fun-deliv" data-fun="delivery">
      <ol class="fd-steps"><li class="on"><i>1</i><span>Hazırlanıyor</span></li><li><i>2</i><span>Kargoya veriliyor</span></li><li><i>3</i><span>Teslim ediliyor</span></li></ol>
      <div class="fd-track"><span class="fd-bar"></span><span class="fd-truck" aria-hidden="true"></span></div>
      <p class="fun-note">Örnek gösterim · bir adıma dokun</p></div>`;
  }
  if (kind === 'badges') {
    const names = ['b0', 'b1', 'b2', 'b3', 'b4', 'b5'];
    return `<div class="fun fun-badges" data-fun="badges">
      <div class="fb-tile"><span class="fb-badge b0">#1 Çok Satan</span><svg class="fb-bottle" viewBox="0 0 100 160" width="70" height="112" aria-hidden="true"><rect x="38" y="6" width="24" height="22" rx="4" fill="#000"/><rect x="42" y="26" width="16" height="14" fill="#fff" stroke="#000" stroke-width="3"/><rect x="18" y="38" width="64" height="112" rx="18" fill="#fff" stroke="#000" stroke-width="3"/><rect x="26" y="76" width="48" height="40" rx="6" fill="#fb4903" stroke="#000" stroke-width="3"/><text x="50" y="102" text-anchor="middle" font-family="Inter, sans-serif" font-weight="900" font-size="14" fill="#fff" letter-spacing="-0.5">MARKA</text></svg></div>
      <div class="fb-side"><p class="label">Rozet şablonunu seç</p>
      <div class="fb-chips" role="group" aria-label="Rozet şablonları">${names.map((n, i) => `<button type="button" class="fb-chip fb-badge ${n}${i === 0 ? ' on' : ''}" data-b="${n}">${i % 2 ? 'En Çok Satan' : '#1 Çok Satan'}</button>`).join('')}</div>
      <p class="fun-note">Örnek gösterim · bir şablona dokun</p></div></div>`;
  }
  if (kind === 'reviews') {
    return `<div class="fun fun-rev" data-fun="reviews">${ratingStars()}<p class="fun-note">Örnek gösterim · yıldızlara dokun</p></div>`;
  }
  return '';
}

function workInitials(title, lang) {
  const words = String(title || '').trim().split(/[\s\-_.]+/).filter(Boolean);
  const t = words.length > 1 ? words[0][0] + words[1][0] : (words[0] || '').slice(0, 2);
  return t.toLocaleUpperCase(lang === 'en' ? 'en' : 'tr');
}

function workShot(it, cat, cover, live) {
  const img = imageUrl(it.image);
  const liveUrl = live && it.live ? safeUrl(it.url) : '';
  const inner = liveUrl
    ? `<div class="work-live" data-src="${esc(liveUrl)}">${img ? `<img src="${img}" alt="${esc(workAltKey(it.title, cat && cat.key))}" loading="lazy">` : ''}<iframe title="${esc(it.title)} canlı site" tabindex="-1" referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-forms"></iframe></div>`
    : img
    ? `<img src="${img}" alt="${esc(workAltKey(it.title, cat && cat.key))}" loading="${cover ? 'eager' : 'lazy'}">`
    : `<div class="work-ph${cover && it.slogan ? ' has-slogan' : ''}">${(([a, b]) => `${use(a, 'class="work-st work-st-main"')}${cover && it.slogan ? '' : use(b, 'class="work-st work-st-sub"')}`)(workIcons(it, cat))}${cover && it.slogan ? `<b class="work-slogan display italic">${esc(it.slogan)}</b>` : ''}</div>`;
  return `<div class="work-shot${it.natural ? ' is-natural' : ''}">${inner}</div>`;
}

function worksPageObj(w) {
  return { title: 'İşler', background: w.background, hero: w.hero };
}

function worksFooter(c, L) {
  const out = [];
  if (c.works.showContact) out.push(S.contact(c.contact, L, c));
  if (c.sections.some((x) => x.id === 'footer' && x.visible)) out.push(S.footer(c.footer, L, c));
  return out;
}


function worksApproach(c) {
  const a = c.works.approach;
  if (!a || !a.visible || !String(a.heading || '').trim()) return '';
  const pts = (a.points || []).filter((x) => x.title || x.text);
  const cards = (a.cards || []).filter((x) => x.title || x.text);
  const st = ['star', 'check', 'cursor'];
  return `
  <section class="work-group work-approach" data-cat="app">
    <div>
      ${a.eyebrow ? `<p class="eyebrow label page-eyebrow">${esc(a.eyebrow)}</p>` : ''}
      <h2 class="display italic wa-h" data-reveal>${esc(a.heading)}</h2>
      ${a.text ? `<p class="wa-text">${esc(a.text)}</p>` : ''}
      ${pts.length ? `<div class="wa-points" data-cards>${pts.map((x, n) => `<article class="wa-point" data-card>${use(topicSticker(x.title + ' nedir', n), 'class="sticker wa-st st-' + topicSticker(x.title + ' nedir', n) + '" data-pop')}<h3 class="display italic">${esc(x.title)}</h3><p>${esc(x.text)}</p></article>`).join('')}</div>` : ''}
      ${cards.length ? `<div class="wa-cards" data-cards>${cards.map((x) => `<article class="wa-card" data-card><h3>${esc(x.title)}</h3><p>${esc(x.text)}</p></article>`).join('')}</div>` : ''}
      ${a.quote ? `<blockquote class="wa-quote display italic">“${esc(a.quote.replace(/^[“"]|[”"]$/g, ''))}” ${ratingStars()}</blockquote>` : ''}
    </div>
  </section>`;
}

function worksList(c, L, opts) {
  const w = c.works;
  const items = resolveWorks(w.items).filter((v) => v.visible);
  const seenKeys = new Set();
  const cats = w.categories.filter((k) => !seenKeys.has(k.key) && seenKeys.add(k.key) && items.some((v) => workCategory(w, v.category).key === k.key));
  const ph = w.photo || {};
  const phPts = (ph.points || []).filter((x) => String(x.title || '').trim() || String(x.text || '').trim());
  const phImgs = (ph.images || []).filter((x) => imageUrl(x.image));
  const phOn = ph.visible && (String(ph.heading || '').trim() || phPts.length || phImgs.length);
  const phLabel = String(ph.heading || '').trim() || 'Ürün çekimi';
  // Kategori sayısı birden fazlaysa Hizmetler'deki gibi solda filtre (svc-nav.js, data-g renkleri)
  const rail = cats.length + (phOn ? 1 : 0) > 1;
  // Üstteki düğme filtresi (eski) de durur: kategoriye basınca yalnız o bölüm kalır; soldaki kapsüller bölüme kaydırır
  const filters = rail
    ? `<div class="work-filters" role="group" aria-label="Kategori"><button type="button" class="work-filter on" data-filter="all">${esc(w.allLabel)}</button>${cats.map((k) => `<button type="button" class="work-filter" data-filter="${esc(k.key)}">${esc(k.label)}</button>`).join('')}${phOn ? `<button type="button" class="work-filter" data-filter="photo">${esc(phLabel)}</button>` : ''}</div>`
    : '';
  const RAIL_C = { blue: 0, sun: 1, mint: 2, lavender: 3, ember: 4, violet: 5 };
  const gOf = (col, n) => (col in RAIL_C ? RAIL_C[col] : n % 8);
  const photoBlock = phOn ? `
      <section class="work-group work-photo" data-cat="photo" id="urun-cekimi"${rail ? ` data-g="${gOf(ph.color || 'sun', 1)}"` : ''} style="--wc:${color(ph.color, 'sun')}">
        <h2 class="display italic work-group-h" data-reveal>${esc(phLabel)}</h2>
        <div class="wp-card">
          ${use('camera', 'class="sticker wp-st st-camera" data-pop')}
          ${ph.text ? `<p class="wp-text">${esc(ph.text)}</p>` : ''}
          ${phPts.length ? `<div class="wp-points" data-cards>${phPts.map((x, n) => `<article class="wa-point" data-card>${use(topicSticker(x.title + ' görsel', n), 'class="sticker wa-st st-' + topicSticker(x.title + ' görsel', n) + '" data-pop')}<h3 class="display italic">${esc(x.title)}</h3><p>${esc(x.text)}</p></article>`).join('')}</div>` : ''}
          ${phImgs.length ? (() => { const order = []; const by = {}; phImgs.forEach((x) => { const g = String(x.category || '').trim(); if (!(g in by)) { by[g] = []; order.push(g); } by[g].push(x); });
            const name = (g) => g || phLabel;
            return `<div class="wp-sectors">${order.map((g, n) => `<button type="button" class="wp-sector" data-wp-open="wp-d-${n}" aria-haspopup="dialog"><span class="wp-ph"><img src="${imageUrl((by[g].find((x) => x.cover) || by[g][0]).image)}" alt="${esc(g)} ürün fotoğrafı örneği" loading="lazy"></span><span class="wp-sector-t display italic">${esc(name(g))}</span><span class="wp-sector-n label">${by[g].length} fotoğraf ↗</span></button>`).join('')}</div>` +
              order.map((g, n) => `<dialog class="wp-dialog" id="wp-d-${n}" aria-label="${esc(name(g))}" data-lenis-prevent><div class="wp-dialog-in"><div class="wp-dialog-head"><h3 class="display italic">${esc(name(g))}</h3><button type="button" class="wp-close label" data-wp-close>Kapat ×</button></div><div class="wp-gallery">${by[g].map((x) => `<figure><img src="${imageUrl(x.image)}" alt="${esc(photoAlt(x))}" loading="lazy">${x.caption ? `<figcaption class="label">${esc(x.caption)}</figcaption>` : ''}</figure>`).join('')}</div></div></dialog>`).join(''); })() : ''}
        </div>
      </section>` : '';
  const cardList = items.map((it) => {
    const cat = workCategory(w, it.category);
    const tags = workTags(it);
    const url = safeUrl(it.url);
    const shot = workShot(it, cat, false, !opts.preview);
    const link = !url && !it.description
      ? `<div class="work-shotlink">${shot}</div>`
      : url
      ? `<a class="work-shotlink" href="${esc(url)}" target="_blank" rel="noopener" aria-label="${esc(it.title)} sitesini aç">${shot}</a>`
      : `<a class="work-shotlink" href="/isler/${esc(it.slug)}" aria-label="${esc(it.title)}">${shot}</a>`;
    const pid = `wd-${esc(it.slug)}`;
    const html = `<article class="work-card${it.featured ? ' is-featured' : ''}${it.premium ? ' is-premium' : ''}" data-cat="${esc(cat.key)}" style="--wc:${color(it.color || cat.color, 'mint')}">
        ${link}
        <div class="work-body">
          <div class="work-meta"><span class="label work-cat">${esc(cat.label)}</span>${it.badge ? `<span class="label work-badge">${esc(it.badge)}</span>` : ''}${it.fun === 'reviews' ? ratingStars() : ''}${it.year ? `<span class="label">${esc(it.year)}</span>` : ''}</div>
          <h3 class="display italic"${it.lang === 'en' ? ' lang="en"' : ''}>${esc(it.title)}</h3>
          <div class="work-mid">
          ${url ? `<a class="work-domain label" lang="en" href="${esc(url)}" target="_blank" rel="noopener">${esc(hostOf(url))} ↗</a>` : ''}
          ${it.premium ? '<span class="work-ptag label"><svg class="pt-star" viewBox="0 0 100 100" aria-hidden="true"><use href="#s-star"/></svg>Premium Proje</span>' : ''}
          ${it.summary ? `<p class="work-sum">${esc(it.summary)}</p>` : ''}
          ${tags.length ? `<ul class="work-tags">${tags.slice(0, 5).map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
          </div>
          ${it.description ? `<button type="button" class="work-toggle label" aria-expanded="false" aria-controls="${pid}"><span>${esc(it.listLabel || w.moreLabel)}</span><i aria-hidden="true">+</i></button>
          <div class="work-panel" id="${pid}"><div class="work-desc">${workRich(it.description, true)}</div></div>` : ''}
          <a class="work-page label" href="/isler/${esc(it.slug)}">Proje sayfası →</a>
        </div>
      </article>`;
    return { key: cat.key, html };
  });
  const groupKeys = [...new Set(items.map((v) => workCategory(w, v.category).key))];
  const groups = w.categories.filter((k, i, a) => a.findIndex((x) => x.key === k.key) === i && groupKeys.includes(k.key)).map((k, n) => `
      <section class="work-group" data-cat="${esc(k.key)}"${rail ? ` id="${esc(k.key)}" data-g="${gOf(k.color, n)}"` : ''}>
        <h2 class="display italic work-group-h" data-reveal>${esc(k.label)}</h2>
        <div class="work-grid" data-works>
      ${cardList.filter((x) => x.key === k.key).map((x) => x.html).join('\n      ')}
        </div>
      </section>`).join('\n');
  const empty = `<p class="work-empty">${esc(w.emptyText)}</p>`;
  const list = `
  <section class="panel works${rail ? ' has-rail' : ''}"${rail ? ' data-rail' : ''} aria-label="İşler" style="background:var(--paper)">
    <div class="inner works-in">
      ${filters}
      ${items.length ? groups : empty}
      ${items.length ? worksApproach(c) : ''}
      ${photoBlock}
    </div>
  </section>`;
  const about = String(w.about || '').trim() ? B.text({ type: 'text', background: 'paper', eyebrow: 'Kategori açıklaması', heading: w.aboutHeading || 'İşlerimiz hakkında', text: w.about, align: 'left', collapse: true, button: {} }, L) : '';
  return [w.hero.visible ? pageHero(worksPageObj(w)) : '', list, faqStd(w.faqHeading || 'İşlerle ilgili sorular', w.faq, L, opts), about, ...worksFooter(c, L)].filter(Boolean).join('\n');
}

function workDetail(c, L, it, all, opts = {}) {
  const w = c.works;
  const cat = workCategory(w, it.category);
  const tags = workTags(it);
  const url = safeUrl(it.url);
  const gallery = (it.gallery || []).filter((g) => imageUrl(g.image));
  const secs = (it.sections || []).filter((x) => String(x.title || '').trim() || String(x.text || '').trim());
  const i = all.findIndex((x) => x.slug === it.slug);
  const prev = all[(i - 1 + all.length) % all.length], next = all[(i + 1) % all.length];
  const facts = [['Müşteri', it.client], ['Yıl', it.year], ['Teknolojiler', tags.join(', ')]].filter(([, v]) => v);
  const tl = String(it.title || '').length;
  const wc = color(it.color || cat.color, 'mint');
  // Görselsiz kapakta workIcons zaten kapakta kullanıldığı için başlıktaki süs sticker'ları farklı olsun
  const cover = new Set(workIcons(it, cat));
  const [stk, stk2] = imageUrl(it.image) ? [...cover] : ['layers', 'bulb', 'chart', 'tag', 'type', 'code'].filter((x) => !cover.has(x)).slice(0, 2);
  const pseudo = {
    title: it.title, background: it.color || cat.color,
    hero: { visible: true, eyebrow: [cat.label, it.badge, it.year].filter(Boolean).join(' · '), eyebrowHref: `/isler#${cat.key}`, title: it.title, h1Suffix: ({ web: ' için yaptığımız e-ticaret sitesi', app: ': e-ticaret için geliştirdiğimiz web uygulaması' })[cat.key] || '', titleLang: it.lang, subtitle: it.summary, titleSize: tl > 22 ? 5.5 : tl > 14 ? 7 : 9, ribbon: { visible: true, color: 'blue' },
      stickers: [{ type: stk, x: 82, y: 30, mx: 76, my: 20, size: 110, rotate: 10, float: true }, { type: stk2, x: 10, y: 38, mx: 6, my: 56, size: 90, rotate: -10, float: true }] },
  };
  const stage = `
  <section class="panel work-stage" style="--wc:${wc};background:var(--paper)">
    ${use(stk, `class="sticker ws-st ws-a st-${stk}" data-pop`)}
    ${use(stk2, `class="sticker ws-st ws-b st-${stk2}" data-pop`)}
    <div class="inner work-in">
      ${it.premium ? '<p class="work-premium-note"><span class="work-ptag label"><svg class="pt-star" viewBox="0 0 100 100" aria-hidden="true"><use href="#s-star"/></svg>Premium Proje</span><span>Bu proje için markaya özel, ayrıntılı bir premium çalışma yürütüldü.</span></p>' : ''}
      ${facts.length ? `<dl class="work-facts">${facts.map(([k, v]) => `<div><dt class="label">${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : ''}
      <div class="work-frame"><span class="wf-tape wf-t1"></span><span class="wf-tape wf-t2"></span><div class="work-cover">${workShot(it, cat, true, !opts.preview)}</div><span class="wf-tag label">${esc([cat.label, it.premium ? 'Premium Proje' : '', it.badge].filter(Boolean).join(' · '))}</span></div>
      ${url ? `<a class="btn solid work-visit" href="${esc(url)}" target="_blank" rel="noopener">${esc(it.urlLabel || 'Siteyi ziyaret et')} ↗</a>` : ''}
      ${it.fun ? workFun(it.fun) : ''}
    </div>
  </section>`;
  const story = String(it.story || '').trim() ? `
  <section class="panel work-storypanel" style="background:var(--paper)">
    ${use(stk2, `class="sticker ws-st ws-d st-${stk2}" data-pop`)}
    <div class="inner work-in"><h2 class="display italic work-story-h" data-reveal>${it.lang === 'en' ? `<span lang="en">${esc(it.title)}</span>` : esc(it.title)} ile Neler Yaptık?</h2>
      <div class="work-story">${String(it.story).split(/\r?\n\s*\r?\n/).map((x) => x.trim()).filter(Boolean).map((x) => `<p>${hw(x)}</p>`).join('')}</div></div>
  </section>` : '';
  const feat = it.description ? `
  <section class="panel work-featpanel" style="background:var(--sky)">
    ${use('check', 'class="sticker ws-st ws-c st-check" data-pop')}
    <div class="inner work-in"><div class="work-feat">${workFeatures(it.description, secs.map((x) => x.title))}</div></div>
  </section>` : '';
  const secPanel = secs.length ? `
  <section class="panel work-secpanel" style="background:var(--paper)">
    <div class="inner work-in"><div class="work-secs" data-cards>${secs.map((sec, n) => { const sk = stickerId(sec.sticker) || topicSticker(sec.title, n * 2 + tl); return `<section class="work-sec" data-card style="--sc:var(--${SEC_COLORS[n % SEC_COLORS.length]})">
        ${use(sk, `class="sticker sec-st st-${sk}" data-pop`)}
        <h3 class="display italic">${esc(sec.title)}</h3>
        <div class="work-sec-text"><p>${esc(sec.text)}</p></div></section>`; }).join('')}</div></div>
  </section>` : '';
  const about = String(it.about || '').trim() ? B.text({ type: 'text', background: 'paper', eyebrow: 'Proje açıklaması', heading: it.aboutHeading || `${it.title} hakkında`, text: it.about, align: 'left', collapse: true, button: {} }, L) : '';
  const end = `
  <section class="panel work-end" style="background:var(--paper)">
    <div class="inner work-in">
      ${gallery.length ? `<div class="g-grid" data-ratio="wide" style="--cols:${Math.min(3, gallery.length)}">
${gallery.map((g) => `        <button type="button" class="g-item" data-full="${imageUrl(g.image)}" data-caption="${esc(g.caption)}" aria-label="${esc(g.caption || 'Görseli büyüt')}"><img src="${imageUrl(g.image)}" alt="${esc(g.caption)}" loading="lazy"></button>`).join('\n')}
      </div>` : ''}
      ${String(it.closing || '').trim() ? `<p class="work-closing display italic">${esc(it.closing)}</p>` : ''}
      ${(() => { const hz = '/' + (((c.pages || []).find((p) => p.id === 'hizmetler') || {}).slug || 'hizmetler'); const cp = (h, a) => { const p = categoryPage(h, resolvePages(c.pages)); return p ? pagePath(p) : hz + a; }; const m = { web: [['Anahtar teslim e-ticaret sitesi', '/anahtar-teslim-e-ticaret'], ['Web tasarım ve e-ticaret', cp('Web tasarım ve e-ticaret', '#web-tasarim-ve-e-ticaret')]], app: [['E-ticaret uygulamaları', cp('E-ticaret uygulamaları', '#e-ticaret-uygulamalari')]], consulting: [['Danışmanlık ve site yönetimi', cp('Danışmanlık ve site yönetimi', '#danismanlik-ve-site-yonetimi')]] }[cat.key] || []; return m.length ? `<p class="work-svc"><span class="label">İlgili hizmet</span>${m.map(([t, u]) => `<a href="${esc(u)}">${esc(t)}</a>`).join('')}</p>` : ''; })()}
      <nav class="work-pager" aria-label="Diğer projeler">
        <a class="btn" href="/isler#${esc(cat.key)}" data-back>← Tüm işler</a>
        ${all.length > 1 ? `<a class="btn" href="/isler/${esc(prev.slug)}">‹ ${esc(prev.title)}</a><a class="btn" href="/isler/${esc(next.slug)}">${esc(next.title)} ›</a>` : ''}
      </nav>
    </div>
  </section>`;
  const faq = faqStd(it.faqHeading || `${it.title} soruları`, it.faq, L, opts);
  const body = [stage, story, feat, secPanel, faq, about, end].filter(Boolean).join('\n');
  return [pageHero(pseudo), body, ...worksFooter(c, L)].join('\n');
}

// Başlık satırları arasında 2 mm boşluk kalan sayfalar
const TIGHT_PAGES = new Set(['anahtarteslim', 'hizmetler', 'sepet', 'googleseo', 'ikas', 'blog', 'tekstudyo']);
// Başlık harfleri birbirine girmesin (yalnız harf aralığı; satır arası 2 mm kalır). Blog yazıları da bu gruba girer.
const SPACED_PAGES = new Set(['googleseo', 'ikas', 'blog', 'tekstudyo']);
// Harfler birbirine girmesin: başlık harf aralığı bu sayfalarda biraz açık (Teklif Al ve ana sayfa gibi)
const LOOSE_PAGES = new Set(['hizmetler', 'sepet']);
// Paragraf kelimeleri artık her sayfada site.js ile vurgulanıyor (tek davranış); sayfaya özel liste boş
const HW_PAGES = new Set([]);
function pageBody(page, c, L, opts) {
  const parts = [];
  const hwP = (h) => (HW_PAGES.has(page.id) ? h.replace(/class="panel /g, 'class="panel hw-pg ').replace(/<(p|h3)((?: class="display italic")?(?: style="[^"]*")?)>([\s\S]*?)<\/\1>/g, (m, t, a, x) => `<${t}${a}>${x.split(/(<[^>]+>|\s+)/).map((w) => (!w || /^</.test(w) || /^\s+$/.test(w) ? w : `<span class="hw">${w}</span>`)).join('')}</${t}>`) : h);
  const isTight = TIGHT_PAGES.has(page.id) || page.kind === 'blog' || page.kind === 'service';
  const spaced = SPACED_PAGES.has(page.id) || page.kind === 'blog' || page.kind === 'service';
  const tight = (h) => hwP(isTight ? h.replace(/class="panel /g, 'class="panel pg-tight' + (LOOSE_PAGES.has(page.id) ? ' pg-loose' : '') + (spaced ? ' pg-spaced' : '') + ' ') : h);
  if (page.hero.visible) parts.push(tight(pageHero(page)));
  const slugH = (t) => String(t || '').toLocaleLowerCase('tr-TR').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const SVC_COLOR = { 'web-tasarim': 0, 'fotograf': 1, 'metin': 2, 'marka': 3, 'pazaryeri': 4, 'seo': 5, 'danismanlik': 6, 'e-ticaret-uygulamalari': 7 };
  const svcColor = (heading, n) => { const s = slugH(heading); const k = Object.keys(SVC_COLOR).find((x) => s.indexOf(x) === 0); return k ? SVC_COLOR[k] : n % 8; }; // renk kategoriye bağlı, sıra değişse de aynı kalır
  let svcGroup = 0; // Hizmetler sayfasında her ana kategori kendi renk grubunda (data-g), kartlar o rengin tonlarında (data-t)
  const lead = page.blocks.find((x) => x.visible); // hero'dan sonra başlıksız ilk metin = giriş (kalın, yatık), ana sayfa hariç tüm sayfalarda
  page.blocks.forEach((b) => {
    if (!b.visible) return;
    // Neden biz bloğu: ana sayfadaki iş ortaklığı paneli + çevrilen kartlar (içerik ana sayfanın "Neden biz" ayarlarından gelir)
    if (b.type === 'why') { parts.push(S.why(c.why, L, c)); return; }
    if (!B[b.type]) return;
    let h = tight(B[b.type](b, L, opts));
    const id = b.heading && b.type !== 'form' && b.type !== 'wizard' ? slugH(b.heading) : '';
    if (id) h = h.replace(/<section /, `<section id="${id}" `);
    if (b === lead && b.type === 'text' && !b.heading) h = h.replace(/class="panel /, 'class="panel page-lead ');
    if (page.id === 'hizmetler' && b.type === 'cards') { let ti = 0; h = h.replace(/<section /, '<section data-g="' + svcColor(b.heading, svcGroup++) + '" ').replace(/<article class="k-card"/g, () => '<article data-t="' + (ti++) + '" class="k-card"'); }
    if (page.id === 'hizmetler' && b.type === 'cards') h = h.replace(/(<\/div>\s*<\/section>)\s*$/, (m, tail) => relServices(b.heading, c, resolvePages(c.pages)) + tail);
    parts.push(h);
  });
  if (page.kind === 'blog') {
    const others = (L.blogPosts || []).filter((p) => p.id !== page.id).slice(0, 3);
    if (others.length) parts.push(tight(`
  <section class="panel blk blk-bloglist" style="background:${color('mist', 'paper')}">
    <div class="inner blk-in">
      <h2 class="display" data-reveal>Diğer yazılar</h2>
      ${blogCards(others)}
      ${L.pageUrls.blog ? `<a class="btn solid" href="${L.pageUrls.blog}">Tüm yazılar</a>` : ''}
    </div>
  </section>`));
  }
  if (page.id === 'hizmetler') parts.push(`<div hidden data-svc-cart data-kvkk="${esc((L.pageUrls && L.pageUrls.kvkk) || '')}"></div>`);
  if (page.showContact) parts.push(tight(S.contact(c.contact, L, c)));
  if (c.sections.some((x) => x.id === 'footer' && x.visible)) parts.push(S.footer(c.footer, L, c));
  return parts.join('\n');
}

// Arama sonuçlarında kesilmesin: açıklamalar en fazla 155 karakter, kelime sınırında
const metaDesc = (t, n = 155) => { const s = String(t || '').replace(/\s+/g, ' ').trim(); if (s.length <= n) return s; return s.slice(0, n - 1).replace(/[\s,.;:–—-]+\S*$/, '').replace(/[\s,.;:–—-]+$/, '') + '…'; };
// Çok uzun iş adları için kısa arama başlığı (Çanakkale gibi anahtar kelimeler korunur)
const WORK_TITLE_OVERRIDE = { 'canakkale-koyun-keci-birligi': 'Çanakkale Damızlık Koyun Keçi Birliği' };
// Ekmek kırıntısı: hem sayfada görünür hem JSON-LD olarak yazılır
let CRUMBS = [];
const crumbHtml = () => (CRUMBS.length > 1 ? `<nav class="crumbs" aria-label="Sayfa yolu"><ol>${CRUMBS.map(([n, u], i) => (i === CRUMBS.length - 1 ? `<li aria-current="page">${esc(n)}</li>` : `<li><a href="${esc(u)}">${esc(n)}</a></li>`)).join('')}</ol></nav>` : '');

// Hizmetler sayfasındaki bir bölümün kategori sayfası: başlığı bölüm başlığıyla aynı olan, üst kategorisi olmayan hizmet sayfası
const normT = (t) => String(t || '').toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ').trim();
const categoryPage = (heading, pages) => pages.find((p) => p.visible && p.kind === 'service' && !p.parent && normT(p.title) === normT(heading));
// Hizmetler sayfasında her bölümün altına ilgili iş ve sayfa bağlantıları (hizmet <-> iş bağı)
const relServices = (heading, c, pages) => {
  const all = resolveWorks(c.works.items).filter((v) => v.visible);
  const byCat = (k, n) => all.filter((v) => workCategory(c.works, v.category).key === k).slice(0, n).map((v) => [v.title, `/isler/${v.slug}`]);
  const pg = (id, label) => { const p = pages.find((x) => x.id === id && x.visible); return p ? [[label || p.title, pagePath(p)]] : []; };
  const h = String(heading || '').toLocaleLowerCase('tr-TR');
  let links = [];
  if (/fotoğraf|görsel/.test(h)) links = [...pg('uruncekimi', 'Ürün çekimi ayrıntıları'), ['Çekim örnekleri', '/isler#photo']];
  else if (/web tasarım/.test(h)) links = [...pg('tekstudyo', 'Web sitesi yapımı'), ...pg('anahtarteslim', 'Anahtar teslim e-ticaret sitesi'), ...pg('ikas', 'ikas iş ortağı'), ...byCat('web', 4)];
  else if (/seo|ölçüm/.test(h)) links = [...pg('googleseo', 'Google SEO hizmeti'), ...byCat('web', 3)];
  else if (/pazaryeri/.test(h)) links = byCat('web', 2);
  else if (/uygulama/.test(h)) links = byCat('app', 3);
  else if (/danışmanlık/.test(h)) links = byCat('consulting', 2);
  // Bölümün kendi kategori sayfası (başlığı aynı olan hizmet türü sayfa) en başta
  const cat = categoryPage(heading, pages);
  if (cat) links = [[`${String(cat.title).replace(/\s+/g, ' ')} hakkında`, pagePath(cat)], ...links];
  if (!links.length) return '';
  return `<p class="rel-works"><span class="label">İlgili işler ve sayfalar</span>${links.map(([t, u]) => `<a href="${esc(u)}">${esc(t)}</a>`).join('')}</p>`;
};

// ---------- Sayfa ----------
// İş detayı: arama başlığı ve açıklaması (kategoriye göre, kimseye ait olmayan iddia yok)
const workTitle = (it, c) => {
  const site = c.brand.siteName;
  if (WORK_TITLE_OVERRIDE[it.slug]) return `${WORK_TITLE_OVERRIDE[it.slug]} — ${site}`;
  const base = it.category === 'web' ? `${it.title} E-Ticaret Sitesi` : it.category === 'app' ? `${it.title} Web Uygulaması` : it.title;
  const full = `${base} — ${site}`;
  return full.length <= 62 ? full : `${it.title} — ${site}`;
};
const workDesc = (it, c) => (it.category === 'web' ? `${it.title} için ${c.brand.siteName} olarak hazırladığımız e-ticaret sitesi: tasarım, kurulum ve yayın süreci.` : `${it.title}: ${c.brand.siteName} işi.`);

// Yazılarda geçen "ikas" kelimesi, Neden biz'deki iş ortaklığı rozetinin küçük hâliyle gösterilir (paragraf, liste, SSS).
// Yalnız etiket dışındaki metne dokunulur; bağlantı içi ve adres ("ikas.com") olduğu gibi kalır. Başlıklarda da rozet olur.
const IKAS_RE = /(^|[^\p{L}\p{N}@/.-])(?:ikas|İkas|IKAS)(?![\p{L}\p{N}]|\.[a-z])/gu;
const IKAS_MARK = '<span class="ikas-mark" lang="en"><i aria-hidden="true"></i>ikas</span>';
// ikas sayfalarında (/ikas, ikas'a site taşıma, ikas mı Shopify mı) rozet yalnız başlıklarda; geri kalanı düz yazı
function ikasMarks(html, onlyHeads) {
  return html.replace(/<(p|li|summary|h1|h2|h3)(\s[^>]*)?>([\s\S]*?)<\/\1>/g, (m, tag, attrs, inner) => {
    if (!/ikas/i.test(inner) || (onlyHeads && !/^h[1-3]$/.test(tag))) return m;
    let inA = 0;
    const out = inner.split(/(<[^>]+>)/).map((part) => {
      if (part[0] === '<') { if (/^<a[\s>]/i.test(part)) inA++; else if (/^<\/a>/i.test(part)) inA = Math.max(0, inA - 1); return part; }
      return inA ? part : part.replace(IKAS_RE, (x, pre) => pre + IKAS_MARK);
    }).join('');
    return `<${tag}${attrs || ''}>${out}</${tag}>`;
  });
}

function render(c, opts = {}) {
  LOGO = imageUrl(c.brand.logoImage);
  const L = contactLinks(c.contact);
  const pages = resolvePages(c.pages);
  const current = opts.page ? pages.find((p) => p.id === opts.page) : null;
  const worksAll = resolveWorks(c.works.items).filter((v) => v.visible);
  const workItem = opts.work ? worksAll.find((v) => v.slug === opts.work) : null;
  const isWorks = Boolean(c.works.visible && (opts.page === 'works' || workItem));
  const isHome = !current && !isWorks && !workItem;
  L.worksUrl = c.works.visible ? '/isler' : '';
  // Ekmek kırıntısı: Ana sayfa > (Hizmetler) > sayfa; iş detayı: Ana sayfa > İşler > iş
  CRUMBS = (() => {
    if (opts.preview || (!current && !isWorks)) return [];
    const home = ['Ana sayfa', '/'];
    if (workItem) return [home, ['İşler', '/isler'], [workItem.title, `/isler/${workItem.slug}`]];
    if (isWorks) return [home, ['İşler', '/isler']];
    const pu = Object.fromEntries(pages.map((p) => [p.id, pagePath(p)]));
    const url = (id) => pu[id] || pagePath(current);
    const under = ['anahtarteslim', 'tekstudyo', 'uruncekimi', 'sepet', 'googleseo', 'ikas'];
    const hz = pages.find((p) => p.id === 'hizmetler' && p.visible);
    const blogIndex = pages.find((p) => p.id === 'blog' && p.visible);
    if (current.kind === 'blog') return blogIndex ? [home, [blogIndex.title, pagePath(blogIndex)], [current.title, pagePath(current)]] : [home, [current.title, pagePath(current)]];
    // Hizmet sayfası: Ana sayfa > Hizmetler > (kategori) > hizmet
    if (current.kind === 'service') {
      const parent = current.parent && pages.find((p) => p.id === current.parent && p.visible && p.id !== current.id);
      return [home, ...(hz ? [[hz.title, url('hizmetler')]] : []), ...(parent ? [[parent.title, pagePath(parent)]] : []), [current.title, pagePath(current)]];
    }
    if (current.id === 'hizmetler' || !under.includes(current.id) || !hz) return [home, [current.title, url(current.id)]];
    // Kökteki eski hizmet sayfaları da kategori ağacına bağlanır (adresleri değişmez)
    const cat = pages.find((p) => p.id === { anahtarteslim: 'kweb', tekstudyo: 'kweb', ikas: 'kweb', uruncekimi: 'kfoto', googleseo: 'kseo' }[current.id] && p.visible);
    return [home, [hz.title, url('hizmetler')], ...(cat ? [[cat.title, pagePath(cat)]] : []), [current.title, url(current.id)]];
  })();
  // /sepet sayfasındaki "Benzer işler" için: kategoriye göre işler ve ürün çekimi örnekleri
  L.cartWorks = (() => {
    const out = { web: [], app: [], consulting: [], photo: [] };
    worksAll.forEach((v) => { const k = workCategory(c.works, v.category); if (out[k.key]) out[k.key].push({ t: v.title, u: `/isler/${v.slug}`, i: imageUrl(v.image), l: k.label || k.key }); });
    const seen = new Set();
    (((c.works.photo && c.works.photo.images) || [])).filter((x) => imageUrl(x.image) && !/mum/i.test((x.category || '') + (x.caption || '') + x.image)).forEach((x) => { const key = x.category || x.image; if (seen.has(key) || out.photo.length >= 4) return; seen.add(key); out.photo.push({ t: `${x.category || 'Ürün'} ürün fotoğrafı`, u: '/isler#photo', i: imageUrl(x.image), l: 'Ürün çekimi' }); });
    // Sepetteki her hizmetin altında gösterilecek kısa açıklama: Hizmetler sayfasındaki kart yazısı (bölüm başlığı + kart başlığı anahtarıyla)
    const norm = (t) => String(t || '').toLocaleLowerCase('tr-TR').replace(/\s+/g, ' ').trim();
    out._svc = {};
    const hz = pages.find((p) => p.id === 'hizmetler');
    if (hz) hz.blocks.forEach((b) => (b.cards || []).forEach((k) => { if (k.text) out._svc[norm(b.heading) + '|' + norm(k.title)] = k.text; }));
    return out;
  })();
  L.pageUrls = Object.fromEntries(pages.map((p) => [p.id, pagePath(p)]));
  // Blog listesi (bloglist bloğu) ve yazı altındaki "Diğer yazılar": yayındaki blog yazıları, yeniden eskiye
  L.blogPosts = pages.filter((p) => p.visible && p.kind === 'blog').sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .map((p) => ({ id: p.id, title: p.title, url: pagePath(p), date: p.date, summary: p.seoDescription, image: firstImage(p), color: p.background }));
  const contactPage = pages.find((p) => p.visible && p.slug === 'iletisim');
  L.contactUrl = contactPage && !(current && current.id === contactPage.id) ? '/iletisim' : '';
  if (current) { L.prefix = '/'; L.local = new Set(['#top', ...(current.showContact ? ['#iletisim'] : [])]); }
  if (isWorks) { L.prefix = '/'; L.local = new Set(['#top', ...(c.works.showContact ? ['#iletisim'] : [])]); }
  const t = c.theme;
  const D = require('./default-content').theme.colors;
  const vars = COLOR_KEYS.map((k) => `--${k}:${hex(t.colors[k], D[k])}`).join(';');
  const fam = fontName(t.font);
  const fontStack = `'${fam}', system-ui, sans-serif`;
  const tickerStyle = T(c.ticker.itemsStyle, '12px', { noAlign: true });
  const ticker = c.ticker.visible && c.ticker.items.length
    ? `<div class="ticker label" aria-hidden="true" style="background:${color(c.ticker.background, 'lavender')}${tickerStyle ? `;${tickerStyle}` : ''}"><div class="ticker-track" style="animation-duration:${num(c.ticker.speed, 5, 200, 30)}s">${Array(4).fill(c.ticker.items.map((x) => `<span>✦ ${esc(x)}</span>`).join('')).join('')}</div></div>`
    : '';
  // Menü: elle eklenen linkler + "Menüye ekle" işaretli sayfalar
  const linkStyle = sa(T(c.nav.linksStyle, NAV_BTN, { noAlign: true }));
  const navLinks = [
    ...c.nav.links.map((l) => { const a = linkAttrs(l.target, L); return `<a class="btn" ${a}${isWorks && /href="\/isler"/.test(a) && !workItem ? ' aria-current="page"' : ''}${linkStyle}>${esc(l.label)}</a>`; }),
    ...pages.filter((p) => p.visible && p.inNav).map((p) => `<a class="btn" href="${pagePath(p)}"${current && current.id === p.id ? ' aria-current="page"' : ''}${linkStyle}>${esc(p.navLabel || p.title)}</a>`),
  ].join('\n      ');
  const logoImg = imageUrl(c.brand.logoImage);
  const share = imageUrl(c.seo.shareImage);
  const body = isWorks
    ? (workItem ? workDetail(c, L, workItem, worksAll, opts) : worksList(c, L, opts))
    : current
    ? pageBody(current, c, L, opts)
    : c.sections.filter((s) => s.visible && S[s.id]).map((s) => S[s.id](c[s.id], L, c, opts)).join('\n');
  const docTitle = isWorks ? (workItem ? workTitle(workItem, c) : (c.works.seoTitle || `İşler — ${c.brand.siteName}`)) : current ? (current.seoTitle || `${current.title} — ${c.brand.siteName}`) : c.seo.title;
  const docDesc = isWorks ? metaDesc((workItem && (workItem.summary || workDesc(workItem, c))) || c.works.seoDescription || c.seo.description) : current ? metaDesc(current.seoDescription || c.seo.description) : metaDesc(c.seo.description);
  const cta = c.nav.cta.label ? `<a class="btn solid" ${linkAttrs(c.nav.cta.target, L)}${sa(T(c.nav.cta.labelStyle, NAV_BTN, { noAlign: true }))}>${esc(c.nav.cta.label)}</a>` : '';
  // Logo: boyut, çerçeve ve isteğe bağlı "temaya uydurma" (sticker konturu ya da tek renge boyama)
  const lb = c.brand;
  const lsize = num(lb.logoSize, 24, 160, 44);
  const lframe = ['circle', 'rounded', 'none'].includes(lb.logoFrame) ? lb.logoFrame : 'circle';
  const lstyle = ['original', 'sticker', 'tint'].includes(lb.logoStyle) ? lb.logoStyle : 'original';
  let linner = esc(lb.logoText);
  if (logoImg) {
    linner = lstyle === 'tint'
      ? `<span class="logo-mask" style="-webkit-mask-image:url(${logoImg});mask-image:url(${logoImg});background:${color(lb.logoTint, 'carbon')}"></span>`
      : `<img${lstyle === 'sticker' ? ' class="logo-sticker"' : ''} src="${logoImg}" alt="${esc(lb.siteName)}${isHome ? '' : ' logosu'}">`;
  }
  // Yazılı logo: gönderilen SVG'nin işaret (lg-mark) ve yazı (lg-text) parçaları. Yazı, sayfa kaydırılınca kapanır.
  const wordmark = !!lb.logoWordmark && lframe === 'none';
  const word = wordmark ? `<svg class="logo-word" viewBox="660 120 1320 460" aria-hidden="true" focusable="false" style="--lw:${color(lb.logoWordColor, 'violet')}"><use href="#lg-text"/></svg>` : '';
  if (wordmark && logoImg) linner = `<img class="logo-mark" src="${logoImg}" alt="${esc(lb.siteName)}${isHome ? '' : ' logosu'}" fetchpriority="high">`;
  else if (wordmark) linner = '<svg class="logo-mark" viewBox="100 105 510 470" aria-hidden="true" focusable="false"><use href="#lg-mark"/></svg>';
  const logo = `<a class="logo logo-${lframe} ls-${lstyle}${logoImg || wordmark ? ' has-img' : ''}${word ? ' has-word' : ''}" href="${current || isWorks ? '/' : '#top'}" aria-label="${esc(lb.siteName)} ana sayfa"${sa(`--logo:${lsize}px`, T(lb.logoTextStyle, 'calc(var(--logo, 44px) * .45)', { noAlign: true }))}>${linner}${word}</a>`;

  const m = t.motion;
  // Panel önizlemesi her değişiklikte yenilendiği için oynatılan animasyonlar (açılış, belirme) orada kapalıdır.
  const skip = opts.preview ? ['smooth', 'intro', 'reveal', 'headings', 'cards', 'pop', 'device', 'tabs', 'slider'] : [];
  const moClasses = t.animations ? MOTIONS.filter((k) => m[k] && !skip.includes(k)).map((k) => `mo-${k}`).join(' ') : '';
  const fontsHref = `/fonts/${fontSlug(fam)}/font.css`;

  // Kanonik adres, paylaşım etiketleri ve yapılandırılmış veri (JSON-LD): yalnızca yayındaki sayfalarda
  const ld = (o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;
  let seoHead = '';
  if (opts.origin && !opts.preview) {
    const path = (opts.path || '/') === '/' ? '/' : String(opts.path).replace(/\/+$/, '');
    const url = `${opts.origin}${path}`;
    const abs = (u) => (u ? (/^https?:/.test(u) ? u : `${opts.origin}${u}`) : '');
    const parts = [
      `<link rel="canonical" href="${esc(url)}">`,
      `<meta property="og:url" content="${esc(url)}">`,
      '<meta property="og:type" content="website">',
      `<meta property="og:site_name" content="${esc(c.brand.siteName)}">`,
      '<meta property="og:locale" content="tr_TR">',
    ];
    // Paylaşım görseli: panelde yüklenen > işin kapak görseli > sayfanın ilk görseli > logo
    const pageImg = share || (workItem && imageUrl(workItem.image)) || (current && firstImage(current)) || '';
    parts.push(`<meta name="twitter:card" content="${pageImg ? 'summary_large_image' : 'summary'}">`);
    // Yasal sayfalar: taranır ama dizine girmez (robots.txt'te kapatılırsa Google noindex'i göremez, adresi içeriksiz dizinler)
    if (opts.noindex || (current && ['gizlilik', 'kvkk', 'cerez', 'kosullar', 'mesafeli', 'iadecayma', 'sepet'].includes(current.id))) parts.push('<meta name="robots" content="noindex, follow">');
    const ogImg = abs(pageImg || logoImg);
    if (ogImg) parts.push(`<meta property="og:image" content="${esc(ogImg)}">`, `<meta property="og:image:alt" content="${esc(c.brand.siteName)}">`, `<meta name="twitter:image" content="${esc(ogImg)}">`);
    // Yerel işletme (Google yerel arama için): adres yasal sayfalardaki firma bilgisiyle aynıdır; çalışma saati ve konum koordinatı bilinmediği için eklenmedi
    const businessLd = () => {
      const email = String(L.email || '').replace(/^mailto:/, '');
      const tel = String((c.contact && c.contact.whatsapp) || '').replace(/\D/g, '');
      return {
        '@context': 'https://schema.org', '@type': 'ProfessionalService', '@id': `${opts.origin}/#isletme`,
        name: c.brand.siteName, url: `${opts.origin}/`, logo: abs(logoImg), image: abs(share || logoImg), description: c.seo.description,
        address: { '@type': 'PostalAddress', streetAddress: 'Fevzipaşa Mahallesi Fatih Sokak, No: 39, İş Yeri: 4', postalCode: '17100', addressLocality: 'Çanakkale', addressRegion: 'Çanakkale', addressCountry: 'TR' },
        areaServed: [{ '@type': 'City', name: 'Çanakkale' }, { '@type': 'AdministrativeArea', name: 'Çanakkale' }],
        hasMap: GBP_URL,
        knowsAbout: ['Web tasarım', 'Web sitesi yapımı', 'E-ticaret sitesi kurulumu', 'Ürün çekimi', 'Ürün fotoğrafçılığı', 'SEO', 'ikas'],
        ...(tel ? { telephone: `+${tel}` } : {}), ...(email ? { email } : {}), sameAs: [GBP_URL, ...(L.instagram ? [L.instagram] : [])],
      };
    };
    // Hizmet sayfaları: Service şeması (sağlayıcı = işletme, bölge = Çanakkale)
    const SERVICE = {
      uruncekimi: ['Ürün çekimi', 'Ürün fotoğrafçılığı'],
      tekstudyo: ['Web sitesi yapımı ve ürün çekimi', 'Web tasarım'],
      anahtarteslim: ['Anahtar teslim e-ticaret sitesi kurulumu', 'E-ticaret sitesi kurulumu'],
      googleseo: ['Google SEO hizmeti', 'Arama motoru optimizasyonu'],
      ikas: ['ikas e-ticaret sitesi kurulumu', 'E-ticaret sitesi kurulumu'],
    };
    if (current && current.kind === 'service' && !SERVICE[current.id]) {
      const parent = current.parent && pages.find((p) => p.id === current.parent);
      SERVICE[current.id] = [current.title, parent ? parent.title : current.title];
    }
    if (current && SERVICE[current.id]) {
      parts.push(ld({ '@context': 'https://schema.org', '@type': 'Service', name: SERVICE[current.id][0], serviceType: SERVICE[current.id][1], description: docDesc, url,
        provider: { '@type': 'ProfessionalService', '@id': `${opts.origin}/#isletme`, name: c.brand.siteName, url: `${opts.origin}/` },
        areaServed: [{ '@type': 'City', name: 'Çanakkale' }, { '@type': 'Country', name: 'Türkiye' }] }));
    }
    if (current && current.id === 'hizmetler') {
      parts.push(ld({ '@context': 'https://schema.org', '@type': 'OfferCatalog', name: current.title, url,
        itemListElement: current.blocks.filter((b) => b.visible && b.heading && b.type === 'cards').map((b) => { const cp = categoryPage(b.heading, pages); return { '@type': 'Offer', itemOffered: { '@type': 'Service', name: String(b.heading).replace(/\s+/g, ' ').trim(), ...(cp ? { url: abs(pagePath(cp)) } : {}), provider: { '@id': `${opts.origin}/#isletme` } } }; }) }));
    }
    // Blog yazısı: BlogPosting şeması
    if (current && current.kind === 'blog') {
      parts.push(ld({ '@context': 'https://schema.org', '@type': 'BlogPosting', headline: current.title, description: docDesc, url, mainEntityOfPage: url, inLanguage: 'tr',
        ...(current.date ? { datePublished: current.date, dateModified: current.date } : {}), ...(pageImg ? { image: abs(pageImg) } : {}),
        author: { '@type': 'Organization', name: c.brand.siteName, url: `${opts.origin}/` },
        publisher: { '@type': 'Organization', name: c.brand.siteName, logo: { '@type': 'ImageObject', url: abs(logoImg) } } }));
    }
    if (current && current.id === 'iletisim') parts.push(ld(businessLd()));
    if (isHome) {
      const email = String(L.email || '').replace(/^mailto:/, '');
      parts.push(ld(businessLd()));
      parts.push(ld({ '@context': 'https://schema.org', '@type': 'WebSite', name: c.brand.siteName, url: `${opts.origin}/`, inLanguage: 'tr', publisher: { '@id': `${opts.origin}/#isletme` } }));
    }
    if (opts.faqItems && opts.faqItems.length) parts.push(ld({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: opts.faqItems.map((x) => ({ '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: x.a } })) }));
    if (CRUMBS.length > 1) parts.push(ld({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: CRUMBS.map(([name, u], i) => ({ '@type': 'ListItem', position: i + 1, name, item: abs(u) })) }));
    // Add ImageObject schemas for portfolio works
    if (workItem && imageUrl(workItem.image)) {
      parts.push(ld({
        '@context': 'https://schema.org',
        '@type': 'ImageObject',
        name: workItem.title,
        description: workItem.summary || workItem.title,
        url: abs(imageUrl(workItem.image)),
        image: abs(imageUrl(workItem.image)),
        datePublished: workItem.year ? `${workItem.year}-01-01` : undefined,
        creator: { '@type': 'Organization', name: c.brand.siteName, url: abs('/') }
      }));
    }
    // Add ImageObject schemas for product photos
    if (isHome && c.works && c.works.photo && c.works.photo.images) {
      (c.works.photo.images || []).slice(0, 5).filter((x) => imageUrl(x.image)).forEach((ph) => {
        parts.push(ld({
          '@context': 'https://schema.org',
          '@type': 'ImageObject',
          name: ph.caption || ph.category || 'Ürün fotoğrafı',
          description: `${c.brand.siteName} tarafından ${ph.category || 'ürün'} fotoğrafı çekimi`,
          url: abs(imageUrl(ph.image)),
          image: abs(imageUrl(ph.image)),
          creator: { '@type': 'Organization', name: c.brand.siteName, url: abs('/') }
        }));
      });
    }
    seoHead = parts.join('\n');
  }

  return `<!doctype html>
<html lang="tr" class="${moClasses}" style="--mi:${num(m.intensity, 0, 200, 100) / 100}; --ms:${num(m.speed, 25, 300, 100) / 100}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(docTitle)}</title>
<meta name="description" content="${esc(docDesc)}">
<meta property="og:title" content="${esc(docTitle)}">
<meta property="og:description" content="${esc(docDesc)}">
${seoHead}
${gaHead(opts, current)}
${logoImg ? `<link rel="icon" type="image/png" href="/favicon.png">` : ''}
<script>try{var __t=localStorage.getItem('goatz-tema');if(!__t&&matchMedia('(prefers-color-scheme: dark)').matches)__t='night';if(__t==='night')document.documentElement.setAttribute('data-theme','night')}catch(e){}try{var __p=location.pathname;while(__p.length>1&&__p.charAt(__p.length-1)==='/')__p=__p.slice(0,-1);var __c=JSON.parse(localStorage.getItem('goatz-hizmet-sepeti')||'[]');var __h=document.documentElement;if(__c.length){if(__p==='/hizmetler'){if(matchMedia('(min-width: 901px)').matches)__h.classList.add('cart-slot')}else if(__p!=='/sepet')__h.classList.add('cart-top-on')}}catch(e){}document.documentElement.classList.add('js');setTimeout(function(){document.documentElement.classList.add('fnt')},2500);setTimeout(function(){if(!window.__motionReady)document.documentElement.classList.add('mo-safe')},5000)</script>
<link href="${fontsHref}" rel="stylesheet">
<link rel="stylesheet" href="/site.css">
<script>(function(){var r=document.documentElement,d=function(){r.classList.add('fonts-ready')},t=setTimeout(d,1600);try{Promise.all([${[500, 900].map((w) => `document.fonts.load('${w} 1em "${fam}"')`).join(',')}]).then(function(){clearTimeout(t);d()},d)}catch(e){d()}})()</script>
<style>
  :root { ${vars}; --r-panel:${num(t.panelRadius, 0, 80, 30)}px; --r-card:${num(t.cardRadius, 0, 60, 20)}px; }
  body { background: ${color(t.pageBackground, 'carbon')}; font-family: ${fontStack}; font-synthesis-weight: none; line-height: ${num(t.bodyLeading, 80, 250, 145) / 100}; letter-spacing: ${num(t.bodyTracking, -10, 20, -1) / 100}em; }
  main { gap: ${num(t.panelGap, 0, 60, 8)}px; padding: ${num(t.panelGap, 0, 60, 8)}px; }
  .display { font-family: ${fontStack}; letter-spacing: ${num(t.displayTracking, -15, 10, -6) / 100}em; line-height: ${num(t.displayLineHeight, 60, 130, 80) / 100}; }
  .btn, .label, .tab { letter-spacing: ${num(t.buttonTracking, -5, 20, 3.2) / 100}em; }
</style>
</head>
<body${t.animations ? '' : ' class="no-anim"'}>
${SPRITES}

${ticker}

<header class="nav${c.nav.hideLinksOnScroll ? '' : ' keep-links'}" id="nav">
  ${isHome ? `<h1 class="logo-h1">${logo}<span class="sr-only" aria-hidden="true">${esc(c.brand.siteName)}</span></h1>` : logo}
  <nav class="nav-right" aria-label="Ana menü">
    <div class="nav-links">
      ${navLinks}
    </div>
    ${body.includes('data-svc-cart') || body.includes('data-cart-page') ? '' : CART_TOP_HTML}
    ${body.includes('data-svc-cart') ? '<span class="cart-slot-el" id="cartSlot"><span class="cart-ghost" aria-hidden="true"><svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><path d="M6 10h8l7 30h28l6-22H17" fill="#fff" stroke="#000" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/><circle cx="25" cy="52" r="5" fill="#ffd731" stroke="#000" stroke-width="4"/><circle cx="46" cy="52" r="5" fill="#ffd731" stroke="#000" stroke-width="4"/></svg><b class="cart-count"></b><script>try{document.currentScript.parentNode.querySelector("b").textContent=JSON.parse(localStorage.getItem("goatz-hizmet-sepeti")||"[]").length}catch(e){}</script></span></span>' : ''}
    <button class="btn icon-btn theme-btn" id="themeBtn" type="button" aria-label="Gece / gündüz temasını değiştir" title="Gece / gündüz"><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle class="t-sun" cx="12" cy="12" r="5" fill="#ffd731" stroke="currentColor" stroke-width="2"/><path class="t-moon" d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" fill="#fff6c8" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg></button>
    <button class="btn icon-btn" id="menuBtn" aria-label="Menüyü aç" aria-expanded="false" aria-controls="menu">+</button>
    ${cta}
  </nav>
</header>
<div class="menu" id="menu">
  ${navLinks}
</div>

<main id="top"${(current && !current.hero.visible) || (isWorks && !workItem && !c.works.hero.visible) ? ' class="no-hero"' : ''}>
${ikasMarks(body, Boolean(current && /ikas/.test(current.id)))}
</main>

${opts.preview ? '' : (isHome ? COOKIE_HTML.replace('id="ckBar"', 'id="ckBar" data-ck-always') + PROMO_HTML : COOKIE_HTML)}
${opts.preview ? '' : '<a class="to-top" href="#top" aria-label="Sayfanın başına dön" title="Yukarı çık"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></a>'}
<script src="/site.js"></script>${opts.preview ? '' : '\n<script src="/cart.js"></script>'}${body.includes('data-svc-cart') || body.includes('data-rail') ? '\n<script src="/svc-nav.js"></script>' : ''}${body.includes('data-wizard') ? '<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>\n<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>\n<script src="/wizard.js"></script>' : ''}
</body>
</html>`;
}

// Google Analytics 4. Varsayılan kimlik GA_DEFAULT_ID; GA_MEASUREMENT_ID tanımlıysa o geçerli (boş değer varsayılanı kullanır), 'off' kapatır. Çerez seçimi 'goatz-cerez' = 'kabul' olmadan gtag.js yüklenmez; consent varsayılanı denied.
// Not: bu bir şablon dizesi değil, ama içindeki betikte regex ve ters eğik çizgi yok (bkz. CLAUDE.md).
const GA_DEFAULT_ID = 'G-FBQTBMTMRF';
function gaHead(opts, current) {
  const id = String((typeof process !== 'undefined' && process.env && process.env.GA_MEASUREMENT_ID) || '').trim() || GA_DEFAULT_ID; // tarayıcı (panel önizleme) paketinde process yok
  if (!/^G-[A-Z0-9]+$/.test(id) || opts.preview || opts.noindex) return '';
  return `<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});(function(){var L=0;function load(){if(L)return;L=1;var s=document.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id=${id}';document.head.appendChild(s);gtag('js',new Date());gtag('config','${id}')}window.goatzGA=function(on){if(on){gtag('consent','update',{analytics_storage:'granted'});load()}else gtag('consent','update',{analytics_storage:'denied'})};window.goatzEvent=function(n,p){if(L)gtag('event',n,p||{})};var ok=false;try{ok=localStorage.getItem('goatz-cerez')==='kabul'}catch(e){}if(ok)window.goatzGA(true)})()</script>`;
}

// Çerez bildirimi: altta ince, uzun şerit. Ana sayfada (data-ck-always) her açılışta çıkar; diğer sayfalarda seçim kaydedilmemişse (site.js, localStorage 'goatz-cerez').
const COOKIE_HTML = `<div class="ck-bar" id="ckBar" role="region" aria-label="Çerez bildirimi" hidden>
  <svg class="ck-ico" viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path d="M24 4a20 20 0 1 0 20 20 6 6 0 0 1-7-6 6 6 0 0 1-6-7 6 6 0 0 1-7-7z" fill="#ffd731" stroke="#000" stroke-width="3" stroke-linejoin="round"/><circle cx="16" cy="20" r="3" fill="#000"/><circle cx="27" cy="30" r="3" fill="#000"/><circle cx="16" cy="33" r="2.4" fill="#000"/><circle cx="35" cy="34" r="2.2" fill="#000"/></svg>
  <p class="ck-text">Tema tercihiniz ve hizmet sepetiniz için tarayıcınızda küçük kayıtlar tutuyoruz. <a href="/cerez-politikasi">Çerez Politikası</a></p>
  <div class="ck-act">
    <button class="btn ck-btn" type="button" data-ck="gerekli">Yalnız gerekli</button>
    <button class="btn ck-btn ck-ok" type="button" data-ck="kabul">Kabul et</button>
  </div>
</div>`;

// Ana sayfa kampanya penceresi: Shopier'den taşıyanlara %10 (site.js: çerez seçiminden sonra açılır, kapatınca 7 gün görünmez)
const PROMO_HTML = `<div class="promo" id="promo" role="dialog" aria-modal="true" aria-labelledby="promoT" hidden>
  <div class="promo-bg" data-promo-x></div>
  <div class="promo-card" tabindex="-1">
    <button class="promo-x" type="button" data-promo-x aria-label="Kapat">×</button>
    <span class="promo-badge" aria-hidden="true"><b>%10</b>indirim</span>
    <p class="promo-eye">Shopier’den geçenlere</p>
    <h2 class="promo-t display" id="promoT">Shopier mağazanızı kendi sitenize %10 indirimle taşıyalım</h2>
    <p class="promo-txt">Küçük işletmeler için uygun fiyatlı, kurumsal görünen bir web sitesi. Shopier’deki mağazasını bize taşıtan işletmelere %10 indirim yapıyoruz.</p>
    <div class="promo-act">
      <a class="btn solid promo-go" href="/teklif-al?kampanya=shopier">Teklif al</a>
      <button class="btn promo-no" type="button" data-promo-x>Şimdi değil</button>
    </div>
  </div>
</div>`;

module.exports = { render, setSprites, COLOR_KEYS, STICKERS, ANCHORS };
