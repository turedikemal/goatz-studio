// robots.txt, sitemap.xml ve llms.txt: içerikten (panel) üretilir, yeni sayfa/iş eklenince kendiliğinden güncellenir.
const { resolvePages, resolveWorks } = require('./schema');

const NL = String.fromCharCode(10);
// Yasal sayfalar taranmaz ve haritada yer almaz (alt bilgiden kullanıcılar erişmeye devam eder)
const LEGAL = ['gizlilik', 'kvkk', 'cerez', 'kosullar', 'sepet'];
// Yapay zekâ arama / yanıt botları: sitenin bu sistemlerde görünmesi (GEO) için açıkça izin verilir
const AI_BOTS = [
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',        // OpenAI (ChatGPT)
  'ClaudeBot', 'Claude-SearchBot', 'Claude-User',   // Anthropic (Claude)
  'PerplexityBot', 'Perplexity-User',               // Perplexity
  'Google-Extended',                                 // Google Gemini / AI özetleri
  'Applebot-Extended',                               // Apple
];

const visiblePages = (c) => resolvePages(c.pages).filter((p) => p.visible);
const indexable = (c) => visiblePages(c).filter((p) => !LEGAL.includes(p.id));
const works = (c) => (c.works && c.works.visible ? resolveWorks(c.works.items).filter((v) => v.visible) : []);

function robots(origin, c) {
  const rules = ['Disallow: /admin', 'Disallow: /api/', ...visiblePages(c).filter((p) => LEGAL.includes(p.id)).map((p) => `Disallow: /${p.slug}`)];
  return [
    '# Tüm arama motorları',
    'User-agent: *',
    ...rules,
    '',
    '# Yapay zekâ arama ve yanıt botları: izin verilir (yasal sayfalar ve yönetim hariç)',
    ...AI_BOTS.map((b) => `User-agent: ${b}`),
    'Allow: /',
    ...rules,
    '',
    `Sitemap: ${origin}/sitemap.xml`,
    ''].join(NL);
}

function sitemap(origin, c) {
  const urls = ['/', ...(works(c).length || (c.works && c.works.visible) ? ['/isler', ...works(c).map((v) => `/isler/${v.slug}`)] : []), ...indexable(c).map((p) => `/${p.slug}`)];
  const uniq = [...new Set(urls)];
  return `<?xml version="1.0" encoding="UTF-8"?>${NL}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${NL}${uniq.map((u) => `  <url><loc>${origin}${u}</loc></url>`).join(NL)}${NL}</urlset>${NL}`;
}

// llms.txt: yapay zekâ sistemlerine siteyi kısaca anlatan, insan okuyabilen özet (llmstxt.org biçimi)
function llms(origin, c) {
  const name = (c.brand && c.brand.siteName) || 'The Goatz Studio';
  const line = (title, path, text) => `- [${title}](${origin}${path})${text ? ': ' + String(text).replace(/\s+/g, ' ').trim() : ''}`;
  const out = [`# ${name}`, '', `> ${((c.seo && c.seo.description) || '').replace(/\s+/g, ' ').trim()}`, '', 'Konum: Çanakkale, Türkiye', '', '## Sayfalar', ''];
  out.push(line('Ana sayfa', '/', c.seo && c.seo.description));
  indexable(c).filter((p) => p.slug !== (resolvePages(c.pages)[0] || {}).slug || true).forEach((p) => { if (p.id !== 'tekstudyo') out.push(line(p.title, `/${p.slug}`, p.seoDescription)); });
  const w = works(c);
  if (w.length) {
    out.push('', '## İşler', '', line('Tüm işler', '/isler', c.works.seoDescription));
    w.forEach((v) => out.push(line(v.title, `/isler/${v.slug}`, v.summary)));
  }
  out.push('');
  return out.join(NL);
}

module.exports = { robots, sitemap, llms, LEGAL, AI_BOTS };
