// İçeriği varsayılan yapıya zorlayan saf işlev. Hem sunucuda hem panelin tarayıcı tarafında çalışır
// (panel önizlemeyi tarayıcıda üretir), bu yüzden dosya sistemine dokunmaz.
const MAX_TEXT = 12000;
const MAX_LIST = 100;
// Boş metin = varsayılan. Değerlerin geçerliliği sayfa üretilirken (lib/render.js) denetlenir.
const TEXT_STYLE = {
  font: '', size: '', weight: '', italic: '', upper: '', underline: '',
  tracking: '', leading: '', align: '', valign: '', color: '',
};

// Gelen veriyi varsayılan içeriğin şekline zorlar: bilinmeyen anahtarlar atılır,
// türü yanlış olan değerler varsayılanla değiştirilir, eksikler tamamlanır.
function conform(template, value) {
  if (Array.isArray(template)) {
    if (!Array.isArray(value)) return structuredClone(template);
    // Sabit kimlikli bölüm listesi: yalnızca sıra ve görünürlük değişebilir.
    if (template[0] && typeof template[0] === 'object' && 'id' in template[0]) {
      const known = new Map(template.map((t) => [t.id, t]));
      const seen = new Set();
      const out = [];
      for (const v of value) {
        if (!v || !known.has(v.id) || seen.has(v.id)) continue;
        seen.add(v.id);
        out.push({ id: v.id, visible: typeof v.visible === 'boolean' ? v.visible : true });
      }
      for (const t of template) if (!seen.has(t.id)) out.push({ ...t });
      return out;
    }
    // Boş varsayılanı olan listeler (örn. sayfalar) öğe şablonunu __item üzerinden alır.
    const itemTemplate = template.length ? template[0] : template.__item;
    return value.slice(0, MAX_LIST).map((v) => conform(itemTemplate, v));
  }
  if (template && typeof template === 'object') {
    const src = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const out = {};
    for (const key of Object.keys(template)) out[key] = conform(template[key], src[key]);
    // Her metin alanı için isteğe bağlı "<alan>Style" yazı stili kabul edilir.
    for (const key of Object.keys(src)) {
      if (/Style$/.test(key) && !(key in template)) out[key] = conform(TEXT_STYLE, src[key]);
    }
    return out;
  }
  if (typeof template === 'string') return typeof value === 'string' ? value.slice(0, MAX_TEXT) : template;
  if (typeof template === 'number') return typeof value === 'number' && Number.isFinite(value) ? value : template;
  if (typeof template === 'boolean') return typeof value === 'boolean' ? value : template;
  return template;
}

// ---------- Sayfa adresleri ----------
const RESERVED = new Set(['isler', 'admin', 'api', 'uploads', 'render-bundle', 'sitemap', 'robots', 'favicon', 'index', 'site', 'static']);
const TR = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'İ': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'Ç': 'c', 'Ğ': 'g', 'Ö': 'o', 'Ş': 's', 'Ü': 'u' };
function slugify(text) {
  return String(text || '')
    .replace(/[çğıİöşüÇĞÖŞÜ]/g, (ch) => TR[ch])
    .toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
}
// Her sayfaya benzersiz, geçerli bir kimlik ve adres verir (başlıktan otomatik ya da elle yazılandan).
function resolvePages(pages) {
  const usedSlugs = new Set();
  const usedIds = new Set();
  return (pages || []).map((p, i) => {
    let id = /^[a-z0-9]{3,24}$/.test(p.id) && !usedIds.has(p.id) ? p.id : `p${i}${Math.random().toString(36).slice(2, 7)}`;
    usedIds.add(id);
    let base = slugify(p.slugAuto ? p.title : p.slug) || 'sayfa';
    if (RESERVED.has(base)) base += '-sayfa';
    let slug = base;
    for (let n = 2; usedSlugs.has(slug); n++) slug = `${base}-${n}`;
    usedSlugs.add(slug);
    return { ...p, id, slug };
  });
}

// Projelere benzersiz adres verir (elle yazılan ya da başlıktan üretilen).
function resolveWorks(items) {
  const used = new Set();
  return (items || []).map((it) => {
    const base = slugify(it.slug) || slugify(it.title) || 'proje';
    let slug = base;
    for (let n = 2; used.has(slug); n++) slug = `${base}-${n}`;
    used.add(slug);
    return { ...it, slug };
  });
}

// Sayfanın sitedeki adresi: blog yazıları /blog/<adres>, diğer sayfalar /<adres>
const pagePath = (p) => (p && p.kind === 'blog' ? `/blog/${p.slug}` : `/${p.slug}`);

module.exports = { conform, TEXT_STYLE, slugify, resolvePages, resolveWorks, pagePath, RESERVED };
