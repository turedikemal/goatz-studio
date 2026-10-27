// İçerik geçişleri: yüklenen içeriğe (git'teki ya da panelden kaydedilen) her okumada uygulanır, dosyaya yazmaz.
// Böylece panelden yapılmış düzenlemeler yedeğe düşmeden yeni adlar/adresler yayına çıkar; panelden kaydedilince kalıcı olur.
// Her geçiş tekrar uygulandığında değişiklik yapmamalı.

// 2026-10-07: "Site yönetimi" → "Web site yönetimi" (Google'da apartman/site yönetimiyle karışıyordu)
const SLUGS = [
  ['work:aylik-site-yonetimi', 'work:aylik-web-site-yonetimi'],
  ['#danismanlik-ve-site-yonetimi', '#danismanlik-ve-web-site-yonetimi'],
];
const PAGE_SLUG = ['danismanlik-ve-site-yonetimi', 'danismanlik-ve-web-site-yonetimi'];
const FIELDS = {
  seoTitle: [['E-Ticaret Danışmanlığı ve Site Yönetimi — The Goatz Studio', 'Danışmanlık ve Web Site Yönetimi — The Goatz Studio']],
  seoDescription: [['Çanakkale’de sitenizi inceleyip öncelikleri sıralıyoruz;', 'Çanakkale’de web sitenizi inceleyip öncelikleri sıralıyoruz;']],
};
const PHRASE = /(?<![Ww]eb )(?<!\p{L})([Ss])ite(\s+)([Yy])önetim/gu;
const rename = (s) => s.replace(PHRASE, (_, S, sp, Y) => `${S === 'S' ? 'Web' : 'web'} ${S}ite${sp}${Y}önetim`);

function text(s, key) {
  let out = s;
  for (const [a, b] of SLUGS) out = out.split(a).join(b);
  for (const [a, b] of FIELDS[key] || []) out = out.split(a).join(b);
  if (key === 'slug' && out === PAGE_SLUG[0]) return PAGE_SLUG[1];
  out = rename(out);
  return COPY.has(out) ? COPY.get(out) : out;
}
const COPY = new Map(require('./copy-edits'));

function walk(o, key) {
  if (typeof o === 'string') return text(o, key);
  if (Array.isArray(o)) { for (let i = 0; i < o.length; i++) o[i] = walk(o[i], key); return o; }
  if (o && typeof o === 'object') { for (const k of Object.keys(o)) o[k] = walk(o[k], k); return o; }
  return o;
}

// 2026-10-23: WhatsApp Business hattı sabit numaraya geçti
const OLD_WHATSAPP = '905445698985';
const NEW_WHATSAPP = '+902869110760';
function contactNumber(raw) {
  const c = raw && raw.contact;
  if (c && String(c.whatsapp || '').replace(/\D/g, '') === OLD_WHATSAPP) c.whatsapp = NEW_WHATSAPP;
  return raw;
}

// Kodla eklenen işler (lib/new-works.js): aynı adresli iş yoksa İşler'in başına
const NEW_WORKS = require('./new-works');
const hostOf = (u) => String(u || '').replace(/^https?:\/\/(www\.)?/i, '').replace(/\/.*$/, '').toLowerCase();
const OLD_SHOTS = ['/uploads/fevzipasa-tasarim-pazari-web-sitesi-tasarimi.webp', '/uploads/fevzipasa-tasarim-pazari-etkinlik-sitesi.webp'];
function addWorks(raw) {
  const items = raw && raw.works && Array.isArray(raw.works.items) ? raw.works.items : null;
  if (!items) return raw;
  for (const w of [...NEW_WORKS].reverse()) {
    const had = items.find((it) => hostOf(it.url) === hostOf(w.url) || it.slug === w.slug);
    if (!had) items.unshift(JSON.parse(JSON.stringify(w)));
    else if (w.badge && !had.badge) had.badge = w.badge; // panelden kaydedilmiş olsa da "Yeni iş" etiketi gelsin
    if (had) {
      // eski ana sayfa ekran görüntüleri kullanılmaz (Kemal 2026-10-23)
      if (OLD_SHOTS.includes(had.image)) had.image = w.image;
      if (Array.isArray(had.gallery)) had.gallery = had.gallery.filter((g) => !OLD_SHOTS.includes(g.image));
    }
    if (had && Array.isArray(had.sections) && Array.isArray(w.sections)) {
      // koddaki yeni bölümler panelden kaydedilmiş işe de aynı sıradaki yerine eklenir
      w.sections.forEach((x, i) => { if (!had.sections.some((y) => y.title === x.title)) had.sections.splice(Math.min(i, had.sections.length), 0, { ...x }); });
    }
    if (had && typeof had.description === 'string' && typeof w.description === 'string') {
      // koddaki yeni madde satırları, eksikse bir önceki maddenin ardına
      const lines = had.description.split('\n');
      const want = w.description.split('\n');
      want.forEach((l, i) => { if (/^\* /.test(l) && !lines.includes(l)) { const at = lines.indexOf(want[i - 1]); lines.splice(at >= 0 ? at + 1 : lines.length, 0, l); } });
      had.description = lines.join('\n');
    }
    if (had && Array.isArray(had.gallery) && Array.isArray(w.gallery)) {
      // koddaki yeni galeri görselleri panelden kaydedilmiş işe de aynı sıradaki yerine eklenir
      w.gallery.forEach((g, i) => { if (!had.gallery.some((x) => x.image === g.image)) had.gallery.splice(Math.min(i, had.gallery.length), 0, { ...g }); });
    }
  }
  return raw;
}

// 2026-10-27: Google SEO sayfasına örnek çalışma (Fevzipaşa, PageSpeed mobil sonucu), "neler var" kartlarının ardına
const SEO_SAMPLE_IMG = '/uploads/fevzipasa-google-pagespeed-mobil-sonucu.webp';
const SEO_SAMPLE = {
  type: 'imagetext', visible: true, background: 'sun', eyebrow: 'Örnek çalışma: Fevzipaşa', heading: 'Mobilde 100 puan.',
  text: 'Fevzipaşa Tasarım Pazarı’nın yeni sitesini Google PageSpeed Insights ile mobil görünümde ölçtük. Performans 100, En İyi Uygulamalar 100, SEO 100 ve Erişilebilirlik 93 çıktı. Masaüstü ölçümünde de puanlar aynıydı.\n\nBu puanlar Google’ın test ortamında yaptığı ölçümdür. Google, değerlerin tahmini olduğunu ve değişebileceğini belirtiyor. Hızlı açılan, düzgün kurulmuş bir site Google’ın sayfayı doğru okumasını kolaylaştırır.',
  align: 'left', image: '', imageSide: 'left', imageColor: 'paper', imageSticker: 'star',
  button: { label: 'Fevzipaşa projesini gör ↗', target: 'work:fevzipasa-tasarim-pazari' }, columns: 3, cards: [], ratio: 'square', images: [{ image: SEO_SAMPLE_IMG }],
};
function seoSample(raw) {
  const pg = raw && Array.isArray(raw.pages) && raw.pages.find((p) => p && p.id === 'googleseo');
  if (!pg || !Array.isArray(pg.blocks)) return raw;
  if (pg.blocks.some((b) => b && (b.image === SEO_SAMPLE_IMG || (b.images || []).some((x) => x && x.image === SEO_SAMPLE_IMG)))) return raw;
  const at = pg.blocks.findIndex((b) => b && b.type === 'cards');
  pg.blocks.splice(at >= 0 ? at + 1 : 0, 0, JSON.parse(JSON.stringify(SEO_SAMPLE)));
  return raw;
}

module.exports = (raw) => seoSample(addWorks(contactNumber(walk(raw, ''))));
module.exports.rename = rename;
