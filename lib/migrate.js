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
  return rename(out);
}

function walk(o, key) {
  if (typeof o === 'string') return text(o, key);
  if (Array.isArray(o)) { for (let i = 0; i < o.length; i++) o[i] = walk(o[i], key); return o; }
  if (o && typeof o === 'object') { for (const k of Object.keys(o)) o[k] = walk(o[k], k); return o; }
  return o;
}

module.exports = (raw) => walk(raw, '');
module.exports.rename = rename;
