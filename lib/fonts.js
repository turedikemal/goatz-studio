// Yazı tipleri: Google Fonts kataloğundan seçilir, ziyaretçiler Google'a gitmez.
// Seçilen ailenin woff2 dosyaları (yalnız latin + latin-ext) sunucuya indirilir, /fonts altından sunulur.
// Dosyalar data/fonts/<kısa-ad>/ altında durur ve lib/persist.js ile PostgreSQL'e de yazılır.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const persist = require('./persist');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const FONT_DIR = path.join(DATA_DIR, 'fonts');
const CATALOG = require('./fonts-catalog.json'); // [aile, tür, [kalınlıklar], italik var mı]
const DEFAULT_FAMILY = 'Inter';
const BY_NAME = new Map(CATALOG.map((r) => [r[0], r]));
// Çok kalınlıklı ailelerde yalnız sitenin kullandığı kalınlıklar iner; tarayıcı en yakınını seçer.
const WANT = [400, 500, 700, 900];
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const slug = (family) => family.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const known = (family) => typeof family === 'string' && BY_NAME.has(family);
const cssFile = (family) => path.join(FONT_DIR, slug(family), 'font.css');
const has = (family) => fs.existsSync(cssFile(family));
const inflight = new Map();

function weightsFor(family) {
  const [, , ws, ital] = BY_NAME.get(family);
  let pick = WANT.filter((w) => ws.includes(w));
  // Değişken yazı tiplerinde ara kalınlıklar da dosyanın içindedir; en az iki ucu iste
  if (!pick.length) pick = [ws.reduce((a, b) => (Math.abs(b - 400) < Math.abs(a - 400) ? b : a))];
  return { weights: pick, italic: Boolean(ital) };
}

async function get(url, binary) {
  const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`${url.slice(0, 60)} -> ${r.status}`);
  return binary ? Buffer.from(await r.arrayBuffer()) : r.text();
}

async function download(family) {
  const { weights, italic } = weightsFor(family);
  const fam = encodeURIComponent(family).replace(/%20/g, '+');
  const axes = italic
    ? `ital,wght@${[0, 1].flatMap((i) => weights.map((w) => `${i},${w}`)).join(';')}`
    : `wght@${weights.join(';')}`;
  const css = await get(`https://fonts.googleapis.com/css2?family=${fam}:${axes}&display=swap`);
  const faces = [];
  const re = /\/\*\s*([a-z-]+)\s*\*\/\s*@font-face\s*\{([^}]*)\}/g;
  let m;
  while ((m = re.exec(css))) {
    if (m[1] !== 'latin' && m[1] !== 'latin-ext') continue;
    const body = m[2];
    const val = (k) => (new RegExp(`${k}:\\s*([^;]+);`).exec(body) || [])[1]?.trim();
    const url = /url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/.exec(body);
    if (!url) continue;
    faces.push({ subset: m[1], style: val('font-style') || 'normal', weight: val('font-weight') || '400', range: val('unicode-range'), url: url[1] });
  }
  if (!faces.length) throw new Error('Yazı tipi dosyası bulunamadı');
  // Aynı dosya birkaç kalınlık için geliyorsa (değişken yazı tipi) tek tanım, kalınlık aralığıyla
  const groups = new Map();
  for (const f of faces) {
    const k = `${f.url}|${f.style}`;
    if (!groups.has(k)) groups.set(k, { ...f, ws: [] });
    groups.get(k).ws.push(Number(f.weight));
  }
  const dir = path.join(FONT_DIR, slug(family));
  fs.mkdirSync(dir, { recursive: true });
  const out = [];
  const cache = new Map();
  for (const g of groups.values()) {
    if (!cache.has(g.url)) {
      const buf = await get(g.url, true);
      const name = `${crypto.createHash('sha1').update(buf).digest('hex').slice(0, 12)}.woff2`;
      fs.writeFileSync(path.join(dir, name), buf);
      persist.save(`fonts/${slug(family)}/${name}`, buf);
      cache.set(g.url, name);
    }
    const lo = Math.min(...g.ws), hi = Math.max(...g.ws);
    out.push(`@font-face{font-family:'${family}';font-style:${g.style};font-weight:${lo === hi ? lo : `${lo} ${hi}`};font-display:swap;src:url(/fonts/${slug(family)}/${cache.get(g.url)}) format('woff2');unicode-range:${g.range}}`);
  }
  const cssText = out.join('\n') + '\n';
  // CSS en son yazılır: dosya varsa indirme tamamdır
  fs.writeFileSync(path.join(dir, 'font.css'), cssText);
  persist.save(`fonts/${slug(family)}/font.css`, Buffer.from(cssText));
}

// Ailenin dosyaları sunucuda yoksa indirir. Başarısızsa hata fırlatır (çağıran eski yazı tipini korur).
function ensure(family) {
  if (!known(family)) return Promise.reject(new Error('Bilinmeyen yazı tipi'));
  if (has(family)) return Promise.resolve();
  if (!inflight.has(family)) inflight.set(family, download(family).finally(() => inflight.delete(family)));
  return inflight.get(family);
}

module.exports = { CATALOG, DEFAULT_FAMILY, FONT_DIR, slug, known, has, ensure };
