// Bu dosya hem sunucuda hem panelin tarayıcı tarafında çalışır (önizleme tarayıcıda üretilir).
// Sticker çizimleri sunucuda dosyadan okunur, tarayıcıda setSprites ile verilir.
let SPRITES = '';
try {
  const fs = require('fs');
  const path = require('path');
  SPRITES = fs.readFileSync(path.join(__dirname, '..', 'public', 'sprites.svg'), 'utf8');
} catch { /* tarayıcı */ }
const setSprites = (svg) => { SPRITES = svg; };
const { resolvePages, resolveWorks } = require('./schema');
const COLOR_KEYS = ['carbon', 'paper', 'sky', 'concrete', 'mist', 'blue', 'mint', 'lavender', 'ember', 'sun', 'violet'];
const STICKERS = ['camera', 'browser', 'coin', 'check', 'cursor', 'star', 'bottle', 'pin', 'map', 'box', 'truck', 'medal', 'store', 'cart', 'chat', 'link', 'sliders', 'photo', 'grid', 'palette', 'heart', 'magnifier', 'globe', 'pencil', 'gear', 'refresh', 'key', 'anahtar', 'rocket', 'chart', 'product', 'signpost', 'vitrin', 'code', 'phone', 'layers', 'type', 'bag', 'tag', 'bulb', 'foot', 'shoe', 'sock'];
const STICKER_VIEWBOX = { anahtar: '0 0 120 100', camera: '0 0 120 100', browser: '0 0 120 100', vitrin: '0 0 200 216', code: '0 0 120 100', shoe: '0 0 120 100', bottle: '0 0 100 160', product: '0 0 100 160' };
const ANCHORS = ['#top', '#isler', '#hizmetler', '#neden', '#surec', '#iletisim'];

// Yazı tipleri (Google Fonts). Hepsi Türkçe karakterleri (ğ ş ı İ) destekler.
// [görünen ad, Google Fonts parametresi, yedek aile]
const FONTS = {
  inter: ['Inter', 'Inter:ital,opsz,wght@0,14..32,400..900;1,14..32,400..900', 'sans'],
  archivo: ['Archivo', 'Archivo:ital,wght@0,400..900;1,400..900', 'sans'],
  bricolage: ['Bricolage Grotesque', 'Bricolage+Grotesque:opsz,wght@12..96,400..800', 'sans'],
  spacegrotesk: ['Space Grotesk', 'Space+Grotesk:wght@400..700', 'sans'],
  dmsans: ['DM Sans', 'DM+Sans:ital,wght@0,400..900;1,400..900', 'sans'],
  outfit: ['Outfit', 'Outfit:wght@400..900', 'sans'],
  sora: ['Sora', 'Sora:wght@400..800', 'sans'],
  jakarta: ['Plus Jakarta Sans', 'Plus+Jakarta+Sans:ital,wght@0,400..800;1,400..800', 'sans'],
  poppins: ['Poppins', 'Poppins:ital,wght@0,400;0,500;0,700;0,800;0,900;1,400;1,500;1,700;1,800;1,900', 'sans'],
  unbounded: ['Unbounded', 'Unbounded:wght@400..900', 'sans'],
  syne: ['Syne', 'Syne:wght@400..800', 'sans'],
  oswald: ['Oswald', 'Oswald:wght@400..700', 'sans'],
  anton: ['Anton', 'Anton', 'sans'],
  playfair: ['Playfair Display', 'Playfair+Display:ital,wght@0,400..900;1,400..900', 'serif'],
  dmserif: ['DM Serif Display', 'DM+Serif+Display:ital@0;1', 'serif'],
};
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
let usedFonts = new Set();
const fontStack = (key) => {
  usedFonts.add(key);
  const [name, , kind] = FONTS[key];
  return `'${name}', ${kind === 'serif' ? 'Georgia, serif' : 'system-ui, sans-serif'}`;
};
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
  if (FONTS[st.font]) p.push(`font-family:${fontStack(st.font)}`);
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
  else if (/^page:[a-z0-9]{3,24}$/.test(t)) href = (links.pageUrls && links.pageUrls[t.slice(5)]) || '#iletisim';
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
  const slides = (list, eager) => list.map((v, i) => `<a class="show-slide${i === 0 ? ' on' : ''}" href="/isler/${esc(v.slug)}" data-host="${esc(hostOf(v.url))}" data-wc="${color(v.color || workCategory(w, v.category).color, 'mint')}" data-name="${esc(v.title)}" data-lang="${v.lang === 'en' ? 'en' : 'tr'}" data-badge="${esc(v.badge || '')}" aria-label="${esc(v.title)}"><img src="${imageUrl(v.image)}" alt="${esc(v.title)}" loading="${eager && i === 0 ? 'eager' : 'lazy'}"></a>`).join('');
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
  const phFirst = phPool.find((x) => x.image === "/uploads/cekim-gida-3.jpg");
  const phSeen = new Set();
  const showPhotos = (phFirst ? [phFirst] : []).concat(phPool).filter((x) => { const k = x.category || x.image; if (phSeen.has(k)) return false; phSeen.add(k); return true; }).slice(0, 6).map((x) => imageUrl(x.image));
  const showPhoto = showPhotos[0] || "";
  return `
  <section class="panel showcase" id="isler" aria-label="Örnek işler" style="background:${color(s.background, 'sky')}">
    ${sites.length || apps.length ? '' : ribbon(s.ribbon, '0 0 1440 860',
    'M-60 300 C 260 80, 520 260, 560 480 S 900 860, 1120 560 S 1300 100, 1540 260',
    'M-60 292 C 260 72, 520 252, 560 472 S 900 852, 1120 552 S 1300 92, 1540 252')}
    ${sites.length || apps.length ? `<header class="show-head"><p class="label show-eyebrow">Seçili işler</p><h2 class="display italic show-title" data-reveal>İşler</h2><p class="show-hook"><b class="show-hook-big display italic"><mark>Kapı Müşterisi Beklemeye Son!!!</mark></b><span class="show-hook-sub">Markanızın yeni nesil dijital vitriniyle tanışmaya hazır mısınız?</span></p></header>` : ''}
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
      <div class="shot" style="background:${color(p.background, 'sun')}">${photo ? `<img src="${photo}" alt="${esc(p.label)}">` : use('bottle', 'width="120" height="192"')}</div>
      <figcaption>
        ${p.label ? `<p class="label"${sa(T(p.labelStyle, '13px'))}>${esc(p.label)}</p>` : ''}
        ${p.note ? `<p class="placeholder-note"${sa(T(p.noteStyle, '11px'))}>${esc(p.note)}</p>` : ''}
      </figcaption>
    </figure>` : '')}
    ${(sites.length || apps.length) && w.photo && w.photo.visible && L && L.worksUrl ? `<a class="show-photo${showPhoto ? ' has-img' : ''}" href="${L.worksUrl}#photo" data-device>${showPhotos.map((u, i) => `<img class="show-photo-img${i === 0 ? ' on' : ''}" src="${u}" alt="Ürün fotoğrafı örneği" loading="${i === 0 ? 'lazy' : 'lazy'}">`).join('')}${use('camera', 'class="sticker show-photo-st st-camera" data-pop')}<span class="show-photo-cap"><b class="display italic">Ürün fotoğrafları</b><span class="label">E-ticaret çekimleri</span></span></a>` : ''}
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
      <span class="line"${sa(T(s.line3Style, B))}><span lang="en">${esc(s.line3)}</span> ${use(s.line3Sticker, `class="inline-sticker ${stClass(s.line3Sticker)}" data-pop data-par="-14,14"`)}</span>
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

S.why = (w, L, c) => `
  <section class="panel why" id="neden" aria-label="Neden biz" style="background:${color(w.background, 'paper')}">
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
    ...pages.map((p) => `<li><a class="sf-link" href="/${p.slug}">${esc(p.navLabel || p.title)}</a></li>`),
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
          ${f.showLogo ? (logoImg ? `<img class="sf-logo" src="${logoImg}" alt="${esc(c.brand.siteName)}">` : `<p class="sf-logo-text display">${esc(c.brand.logoText)}</p>`) : ''}
          ${f.description ? `<p${sa(T(f.descriptionStyle, '16px'))}>${esc(f.description)}</p>` : ''}
          ${footerMap()}
          ${f.companyInfo ? `<p class="sf-company">${esc(f.companyInfo).replace(/\n/g, '<br>')}</p>` : ''}
        </div>
        ${f.showLegal && legal ? `<nav class="sf-col" aria-label="Yasal">
          <h3 class="label"${sa(T(f.legalTitleStyle, '12px'))}>${esc(f.legalTitle)}</h3>
          <ul>
          ${legal}
          </ul>
        </nav>` : ''}
        ${f.showLinks && links ? `<nav class="sf-col" aria-label="Alt menü">
          <h3 class="label"${sa(T(f.linksTitleStyle, '12px'))}>${esc(f.linksTitle)}</h3>
          <ul>
          ${links}
          </ul>
        </nav>` : ''}
        ${f.showContact && contacts ? `<div class="sf-col">
          <h3 class="label"${sa(T(f.contactTitleStyle, '12px'))}>${esc(f.contactTitle)}</h3>
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
const paras = (text, st, base) => String(text || '').split(/\r?\n\s*\r?\n/).map((x) => x.trim()).filter(Boolean)
  .map((x) => `<p${sa(T(st, base))}>${esc(x).replace(/\r?\n/g, '<br>')}</p>`).join('\n      ');
const blockHead = (b) => `${b.eyebrow ? `<p class="eyebrow label"${sa(T(b.eyebrowStyle, '12px'))}>${esc(b.eyebrow)}</p>` : ''}${b.heading ? `<h2 class="display${FIX_RE.test(b.heading) ? ' has-fix' : ''}" data-reveal${sa(T(b.headingStyle, 'var(--heading)'))}>${brFix(b.heading)}</h2>` : ''}`;
const blockButton = (b, L) => (b.button && b.button.label
  ? `<a class="btn solid" ${linkAttrs(b.button.target, L)}${sa(T(b.button.labelStyle, NAV_BTN, { noAlign: true }))}>${esc(b.button.label)}</a>` : '');

const B = {};

B.text = (b, L) => `
  <section class="panel blk blk-text" style="background:${color(b.background, 'paper')}">
    <div class="inner blk-in${b.align === 'center' ? ' is-center' : ''}">
      ${blockHead(b)}
      ${paras(b.text, b.textStyle, '18px')}
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
          ${stack.length ? stack.map((u) => `<img src="${u}" alt="" loading="lazy">`).join('') : img ?`<img src="${img}" alt="${esc(b.heading)}" loading="lazy" data-par="-6,6">` : use(b.imageSticker, `class="${stClass(b.imageSticker)}" style="width:${b.imageSticker === 'vitrin' ? 86 : 46}%" data-pop`)}
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
const MAP = { lat: 40.14634, lon: 26.40084, dLat: 0.0020, dLon: 0.0034 };
// Alt bilgideki küçük konum kartı (firma bilgisinin yerine): aynı harita, sitenin renklerine boyalı
const footerMap = () => {
  return `<a class="sf-map" href="https://www.google.com/maps/search/?api=1&query=The+Goatz+Creative+%C3%87anakkale" target="_blank" rel="noopener" aria-label="The Goatz Studio konumu (Google Haritalar'da aç)">
    <img class="map-img" src="/map-goatz-light.svg" alt="The Goatz Studio ofisinin Çanakkale’deki konumu (harita)" loading="lazy" decoding="async">
    
    <span class="map-pin" aria-hidden="true"><b>The Goatz Studio</b><i></i></span>
  </a><p class="sf-city">Çanakkale, Türkiye</p>`;
};
B.map = (b, L) => {
  const href = (b.button && /^https?:/.test(b.button.target)) ? b.button.target : 'https://www.google.com/maps/search/?api=1&query=The+Goatz+Creative+%C3%87anakkale';
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

function pageHero(page) {
  const h = page.hero;
  const ts = num(h.titleSize, 4, 30, 12);
  const base = `clamp(48px, ${ts}vw, ${ts * 16.6}px)`;
  return `
  <section class="panel hero page-hero" style="background:${color(page.background, 'sky')}">
    ${ribbon(h.ribbon, '0 0 1440 980',
    'M-80 760 C 180 980, 420 560, 260 360 S 420 -40, 720 120 S 1060 620, 1240 420 S 1320 60, 1560 180',
    'M-80 752 C 180 972, 420 552, 260 352 S 420 -48, 720 112 S 1060 612, 1240 412 S 1320 52, 1560 172', '0.01,20')}
    ${h.stickers.map((st, i) => stickerTag(st, i, 'hero-st', ['12,-12', '-10,10', '8,-14', '-12,8'][i % 4])).join('\n    ')}
    ${h.eyebrow ? (h.eyebrowHref ? `<a class="eyebrow label page-eyebrow page-eyebrow-link" href="${esc(h.eyebrowHref)}" data-back>← ${esc(h.eyebrow)}</a>` : `<p class="eyebrow label page-eyebrow"${sa(T(h.eyebrowStyle, '12px'))}>${esc(h.eyebrow)}</p>`) : ''}
    <h1 class="display" data-intro${h.titleLang === 'en' ? ' lang="en"' : ''}${sa(`font-size:${base}`, T(h.titleStyle, base))}>${br(h.title || page.title)}${h.h1Suffix ? `<span class="sr-only">${esc(h.h1Suffix)}</span>` : ''}</h1>
    ${h.subtitle ? `<p class="tagline" data-sub${sa(T(h.subtitleStyle, 'clamp(24px, 4.4vw, 64px)'))}>${esc(h.subtitle)}</p>` : ''}
  </section>`;
}


// ---------- İşler (portföy) ----------
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
    ? `<div class="work-live" data-src="${esc(liveUrl)}">${img ? `<img src="${img}" alt="${esc(it.title)}" loading="lazy">` : ''}<iframe title="${esc(it.title)} canlı site" tabindex="-1" referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-forms"></iframe></div>`
    : img
    ? `<img src="${img}" alt="${esc(it.title)}" loading="${cover ? 'eager' : 'lazy'}">`
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
  const filters = cats.length + (phOn ? 1 : 0) > 1
    ? `<div class="work-filters" role="group" aria-label="Kategori"><button type="button" class="work-filter on" data-filter="all">${esc(w.allLabel)}</button>${cats.map((k) => `<button type="button" class="work-filter" data-filter="${esc(k.key)}">${esc(k.label)}</button>`).join('')}${phOn ? `<button type="button" class="work-filter" data-filter="photo">${esc(phLabel)}</button>` : ''}</div>`
    : '';
  const photoBlock = phOn ? `
      <section class="work-group work-photo" data-cat="photo" id="urun-cekimi" style="--wc:${color(ph.color, 'sun')}">
        <h2 class="display italic work-group-h" data-reveal>${esc(phLabel)}</h2>
        <div class="wp-card">
          ${use('camera', 'class="sticker wp-st st-camera" data-pop')}
          ${ph.text ? `<p class="wp-text">${esc(ph.text)}</p>` : ''}
          ${phPts.length ? `<div class="wp-points" data-cards>${phPts.map((x, n) => `<article class="wa-point" data-card>${use(topicSticker(x.title + ' görsel', n), 'class="sticker wa-st st-' + topicSticker(x.title + ' görsel', n) + '" data-pop')}<h3 class="display italic">${esc(x.title)}</h3><p>${esc(x.text)}</p></article>`).join('')}</div>` : ''}
          ${phImgs.length ? (() => { const order = []; const by = {}; phImgs.forEach((x) => { const g = String(x.category || '').trim(); if (!(g in by)) { by[g] = []; order.push(g); } by[g].push(x); });
            const name = (g) => g || phLabel;
            return `<div class="wp-sectors">${order.map((g, n) => `<button type="button" class="wp-sector" data-wp-open="wp-d-${n}" aria-haspopup="dialog"><img src="${imageUrl(by[g][0].image)}" alt="${esc(g)} ürün fotoğrafı örneği" loading="lazy"><span class="wp-sector-t display italic">${esc(name(g))}</span><span class="wp-sector-n label">${by[g].length} fotoğraf ↗</span></button>`).join('')}</div>` +
              order.map((g, n) => `<dialog class="wp-dialog" id="wp-d-${n}" aria-label="${esc(name(g))}" data-lenis-prevent><div class="wp-dialog-in"><div class="wp-dialog-head"><h3 class="display italic">${esc(name(g))}</h3><button type="button" class="wp-close label" data-wp-close>Kapat ×</button></div><div class="wp-gallery">${by[g].map((x) => `<figure><img src="${imageUrl(x.image)}" alt="${esc(x.caption || name(g))}" loading="lazy">${x.caption ? `<figcaption class="label">${esc(x.caption)}</figcaption>` : ''}</figure>`).join('')}</div></div></dialog>`).join(''); })() : ''}
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
  const groups = w.categories.filter((k, i, a) => a.findIndex((x) => x.key === k.key) === i && groupKeys.includes(k.key)).map((k) => `
      <section class="work-group" data-cat="${esc(k.key)}">
        <h2 class="display italic work-group-h" data-reveal>${esc(k.label)}</h2>
        <div class="work-grid" data-works>
      ${cardList.filter((x) => x.key === k.key).map((x) => x.html).join('\n      ')}
        </div>
      </section>`).join('\n');
  const empty = `<p class="work-empty">${esc(w.emptyText)}</p>`;
  const list = `
  <section class="panel works" aria-label="İşler" style="background:var(--paper)">
    <div class="inner works-in">
      ${filters}
      ${items.length ? groups : empty}
      ${items.length ? worksApproach(c) : ''}
      ${photoBlock}
    </div>
  </section>`;
  return [w.hero.visible ? pageHero(worksPageObj(w)) : '', list, ...worksFooter(c, L)].filter(Boolean).join('\n');
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
  const end = `
  <section class="panel work-end" style="background:var(--paper)">
    <div class="inner work-in">
      ${gallery.length ? `<div class="g-grid" data-ratio="wide" style="--cols:${Math.min(3, gallery.length)}">
${gallery.map((g) => `        <button type="button" class="g-item" data-full="${imageUrl(g.image)}" data-caption="${esc(g.caption)}" aria-label="${esc(g.caption || 'Görseli büyüt')}"><img src="${imageUrl(g.image)}" alt="${esc(g.caption)}" loading="lazy"></button>`).join('\n')}
      </div>` : ''}
      ${String(it.closing || '').trim() ? `<p class="work-closing display italic">${esc(it.closing)}</p>` : ''}
      <nav class="work-pager" aria-label="Diğer projeler">
        <a class="btn" href="/isler#${esc(cat.key)}" data-back>← Tüm işler</a>
        ${all.length > 1 ? `<a class="btn" href="/isler/${esc(prev.slug)}">‹ ${esc(prev.title)}</a><a class="btn" href="/isler/${esc(next.slug)}">${esc(next.title)} ›</a>` : ''}
      </nav>
    </div>
  </section>`;
  const body = [stage, story, feat, secPanel, end].join('\n');
  return [pageHero(pseudo), body, ...worksFooter(c, L)].join('\n');
}

// Başlık satırları arasında 2 mm boşluk kalan sayfalar
const TIGHT_PAGES = new Set(['anahtarteslim', 'hizmetler', 'sepet']);
// Harfler birbirine girmesin: başlık harf aralığı bu sayfalarda biraz açık (Teklif Al ve ana sayfa gibi)
const LOOSE_PAGES = new Set(['hizmetler', 'sepet']);
// Paragraf kelimeleri üzerine gelince sarı vurgulanan sayfalar
const HW_PAGES = new Set(['tekstudyo']);
function pageBody(page, c, L, opts) {
  const parts = [];
  const hwP = (h) => (HW_PAGES.has(page.id) ? h.replace(/class="panel /g, 'class="panel hw-pg ').replace(/<(p|h3)((?: class="display italic")?(?: style="[^"]*")?)>([\s\S]*?)<\/\1>/g, (m, t, a, x) => `<${t}${a}>${x.split(/(<[^>]+>|\s+)/).map((w) => (!w || /^</.test(w) || /^\s+$/.test(w) ? w : `<span class="hw">${w}</span>`)).join('')}</${t}>`) : h);
  const tight = (h) => hwP(TIGHT_PAGES.has(page.id) ? h.replace(/class="panel /g, 'class="panel pg-tight' + (LOOSE_PAGES.has(page.id) ? ' pg-loose' : '') + ' ') : h);
  if (page.hero.visible) parts.push(tight(pageHero(page)));
  const slugH = (t) => String(t || '').toLocaleLowerCase('tr-TR').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  page.blocks.forEach((b) => {
    if (!b.visible || !B[b.type]) return;
    let h = tight(B[b.type](b, L, opts));
    const id = b.heading && b.type !== 'form' && b.type !== 'wizard' ? slugH(b.heading) : '';
    if (id) h = h.replace(/<section /, `<section id="${id}" `);
    parts.push(h);
  });
  if (page.id === 'hizmetler') parts.push(`<div hidden data-svc-cart data-kvkk="${esc((L.pageUrls && L.pageUrls.kvkk) || '')}"></div>`);
  if (page.showContact) parts.push(tight(S.contact(c.contact, L, c)));
  if (c.sections.some((x) => x.id === 'footer' && x.visible)) parts.push(S.footer(c.footer, L, c));
  return parts.join('\n');
}

// ---------- Sayfa ----------
function render(c, opts = {}) {
  usedFonts = new Set(['inter']);
  const L = contactLinks(c.contact);
  const pages = resolvePages(c.pages);
  const current = opts.page ? pages.find((p) => p.id === opts.page) : null;
  const worksAll = resolveWorks(c.works.items).filter((v) => v.visible);
  const workItem = opts.work ? worksAll.find((v) => v.slug === opts.work) : null;
  const isWorks = Boolean(c.works.visible && (opts.page === 'works' || workItem));
  const isHome = !current && !isWorks && !workItem;
  L.worksUrl = c.works.visible ? '/isler' : '';
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
  L.pageUrls = Object.fromEntries(pages.map((p) => [p.id, `/${p.slug}`]));
  const contactPage = pages.find((p) => p.visible && p.slug === 'iletisim');
  L.contactUrl = contactPage && !(current && current.id === contactPage.id) ? '/iletisim' : '';
  if (current) { L.prefix = '/'; L.local = new Set(['#top', ...(current.showContact ? ['#iletisim'] : [])]); }
  if (isWorks) { L.prefix = '/'; L.local = new Set(['#top', ...(c.works.showContact ? ['#iletisim'] : [])]); }
  const t = c.theme;
  const D = require('./default-content').theme.colors;
  const vars = COLOR_KEYS.map((k) => `--${k}:${hex(t.colors[k], D[k])}`).join(';');
  const bodyStack = FONTS[t.bodyFont] ? fontStack(t.bodyFont) : fontStack('inter');
  const displayStack = FONTS[t.displayFont] ? fontStack(t.displayFont) : fontStack('inter');
  const tickerStyle = T(c.ticker.itemsStyle, '12px', { noAlign: true });
  const ticker = c.ticker.visible && c.ticker.items.length
    ? `<div class="ticker label" aria-hidden="true" style="background:${color(c.ticker.background, 'lavender')}${tickerStyle ? `;${tickerStyle}` : ''}"><div class="ticker-track" style="animation-duration:${num(c.ticker.speed, 5, 200, 30)}s">${Array(4).fill(c.ticker.items.map((x) => `<span>✦ ${esc(x)}</span>`).join('')).join('')}</div></div>`
    : '';
  // Menü: elle eklenen linkler + "Menüye ekle" işaretli sayfalar
  const linkStyle = sa(T(c.nav.linksStyle, NAV_BTN, { noAlign: true }));
  const navLinks = [
    ...c.nav.links.map((l) => { const a = linkAttrs(l.target, L); return `<a class="btn" ${a}${isWorks && /href="\/isler"/.test(a) && !workItem ? ' aria-current="page"' : ''}${linkStyle}>${esc(l.label)}</a>`; }),
    ...pages.filter((p) => p.visible && p.inNav).map((p) => `<a class="btn" href="/${p.slug}"${current && current.id === p.id ? ' aria-current="page"' : ''}${linkStyle}>${esc(p.navLabel || p.title)}</a>`),
  ].join('\n      ');
  const logoImg = imageUrl(c.brand.logoImage);
  const share = imageUrl(c.seo.shareImage);
  const body = isWorks
    ? (workItem ? workDetail(c, L, workItem, worksAll, opts) : worksList(c, L, opts))
    : current
    ? pageBody(current, c, L, opts)
    : c.sections.filter((s) => s.visible && S[s.id]).map((s) => S[s.id](c[s.id], L, c)).join('\n');
  const docTitle = isWorks ? (workItem ? `${workItem.title} — ${c.brand.siteName}` : (c.works.seoTitle || `İşler — ${c.brand.siteName}`)) : current ? (current.seoTitle || `${current.title} — ${c.brand.siteName}`) : c.seo.title;
  const docDesc = isWorks ? ((workItem && workItem.summary) || c.works.seoDescription || c.seo.description) : current ? (current.seoDescription || c.seo.description) : c.seo.description;
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
  if (wordmark && logoImg) linner = `<img class="logo-mark" src="${logoImg}" alt="${esc(lb.siteName)}${isHome ? '' : ' logosu'}">`;
  else if (wordmark) linner = '<svg class="logo-mark" viewBox="100 105 510 470" aria-hidden="true" focusable="false"><use href="#lg-mark"/></svg>';
  const logo = `<a class="logo logo-${lframe} ls-${lstyle}${logoImg || wordmark ? ' has-img' : ''}${word ? ' has-word' : ''}" href="${current || isWorks ? '/' : '#top'}" aria-label="${esc(lb.siteName)} ana sayfa"${sa(`--logo:${lsize}px`, T(lb.logoTextStyle, 'calc(var(--logo, 44px) * .45)', { noAlign: true }))}>${linner}${word}</a>`;

  const m = t.motion;
  // Panel önizlemesi her değişiklikte yenilendiği için oynatılan animasyonlar (açılış, belirme) orada kapalıdır.
  const skip = opts.preview ? ['smooth', 'intro', 'reveal', 'headings', 'cards', 'pop', 'device', 'tabs', 'slider'] : [];
  const moClasses = t.animations ? MOTIONS.filter((k) => m[k] && !skip.includes(k)).map((k) => `mo-${k}`).join(' ') : '';
  const fontsHref = `https://fonts.googleapis.com/css2?${[...usedFonts].map((k) => `family=${FONTS[k][1]}`).join('&amp;')}&amp;display=swap`;

  return `<!doctype html>
<html lang="tr" class="${moClasses}" style="--mi:${num(m.intensity, 0, 200, 100) / 100}; --ms:${num(m.speed, 25, 300, 100) / 100}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(docTitle)}</title>
<meta name="description" content="${esc(docDesc)}">
<meta property="og:title" content="${esc(docTitle)}">
<meta property="og:description" content="${esc(docDesc)}">
${share ? `<meta property="og:image" content="${share}">` : ''}
${logoImg ? `<link rel="icon" href="${logoImg}">` : ''}
<script>document.documentElement.classList.add('js');setTimeout(function(){if(!window.__motionReady)document.documentElement.classList.add('mo-safe')},5000)</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${fontsHref}" rel="stylesheet">
<link rel="stylesheet" href="/site.css">
<script>(function(){var r=document.documentElement,d=function(){r.classList.add('fonts-ready')},t=setTimeout(d,1600);try{Promise.all([${[...usedFonts].flatMap((k) => [500, 900].map((w) => `document.fonts.load('${w} 1em "${FONTS[k][0]}"')`)).join(',')}]).then(function(){clearTimeout(t);d()},d)}catch(e){d()}})()</script>
<style>
  :root { ${vars}; --r-panel:${num(t.panelRadius, 0, 80, 30)}px; --r-card:${num(t.cardRadius, 0, 60, 20)}px; }
  body { background: ${color(t.pageBackground, 'carbon')}; font-family: ${bodyStack}; line-height: ${num(t.bodyLeading, 80, 250, 145) / 100}; letter-spacing: ${num(t.bodyTracking, -10, 20, -1) / 100}em; }
  main { gap: ${num(t.panelGap, 0, 60, 8)}px; padding: ${num(t.panelGap, 0, 60, 8)}px; }
  .display { font-family: ${displayStack}; letter-spacing: ${num(t.displayTracking, -15, 10, -6) / 100}em; line-height: ${num(t.displayLineHeight, 60, 130, 80) / 100}; }
  .btn, .label, .tab { letter-spacing: ${num(t.buttonTracking, -5, 20, 3.2) / 100}em; }
</style>
</head>
<body${t.animations ? '' : ' class="no-anim"'}>
${SPRITES}

${ticker}

<header class="nav${c.nav.hideLinksOnScroll ? '' : ' keep-links'}" id="nav">
  ${isHome ? `<h1 class="logo-h1">${logo}</h1>` : logo}
  <nav class="nav-right" aria-label="Ana menü">
    <div class="nav-links">
      ${navLinks}
    </div>
    <button class="btn icon-btn" id="menuBtn" aria-label="Menüyü aç" aria-expanded="false" aria-controls="menu">+</button>
    ${cta}
  </nav>
</header>
<div class="menu" id="menu">
  ${navLinks}
</div>

<main id="top"${(current && !current.hero.visible) || (isWorks && !workItem && !c.works.hero.visible) ? ' class="no-hero"' : ''}>
${body}
</main>

${opts.preview ? '' : '<a class="to-top" href="#top" aria-label="Sayfanın başına dön" title="Yukarı çık"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></a>'}
<script src="/site.js"></script>${body.includes('data-svc-cart') || body.includes('data-cart-page') ? '\n<script src="/cart.js"></script>' : ''}${body.includes('data-wizard') ? '<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>\n<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>\n<script src="/wizard.js"></script>' : ''}
</body>
</html>`;
}

module.exports = { render, setSprites, COLOR_KEYS, STICKERS, ANCHORS, FONTS };
