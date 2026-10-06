// Ürün açıklaması HTML temizleyici (izin listesi). script, on* öznitelikleri, javascript: bağlantıları atılır.
// Aynı mantık public/rich-editor.js içinde istemcide de çalışır.
const TAGS = new Set(['p', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'sub', 'sup', 'span', 'div', 'font', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'hr', 'a', 'img', 'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'caption', 'colgroup', 'col', 'iframe', 'video', 'source']);
const DROP_WITH_CONTENT = new Set(['script', 'style', 'noscript', 'template', 'object', 'embed', 'applet', 'link', 'meta', 'base', 'form', 'textarea', 'select', 'svg', 'math', 'title', 'head']);
const VOID = new Set(['br', 'hr', 'img', 'col', 'source']);
const ATTRS = {
  '*': ['style', 'class', 'align', 'title'],
  a: ['href', 'target', 'rel'], img: ['src', 'alt', 'width', 'height'], font: ['color', 'size'],
  td: ['colspan', 'rowspan'], th: ['colspan', 'rowspan'], col: ['span'],
  iframe: ['src', 'width', 'height', 'allowfullscreen', 'frameborder'], video: ['src', 'controls', 'width', 'height', 'poster'], source: ['src', 'type'],
};
const VIDEO_HOSTS = /^https:\/\/(www\.youtube(-nocookie)?\.com\/embed\/|player\.vimeo\.com\/video\/)/i;
const STYLE_OK = new Set(['color', 'background-color', 'text-align', 'font-weight', 'font-style', 'text-decoration', 'font-size', 'width', 'height', 'max-width', 'border', 'border-collapse', 'padding', 'margin', 'vertical-align']);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const unesc = (s) => String(s).replace(/&#x([0-9a-f]+);?/gi, (_, h) => String.fromCodePoint(parseInt(h, 16) || 32)).replace(/&#(\d+);?/g, (_, d) => String.fromCodePoint(parseInt(d, 10) || 32))
  .replace(/&(colon|newline|tab);/gi, (_, n) => ({ colon: ':', newline: ' ', tab: ' ' })[n.toLowerCase()]).replace(/&quot;/g, '"').replace(/&amp;/g, '&');

function safeUrl(v, kind) {
  const u = unesc(v).replace(/[\u0000- \u007f-\u009f​]+/g, '').trim();
  if (!u) return '';
  if (kind === 'iframe') return VIDEO_HOSTS.test(u) ? u : '';
  if (kind === 'a') return /^(https?:|mailto:|tel:|#|\/(?!\/))/i.test(u) || !/^[a-z][a-z0-9+.-]*:/i.test(u) ? u : '';
  return /^(https?:\/\/|\/(?!\/)|data:image\/(png|jpe?g|gif|webp);base64,)/i.test(u) ? u : '';
}
function safeStyle(v) {
  return unesc(v).split(';').map((d) => d.trim()).filter(Boolean).map((d) => {
    const i = d.indexOf(':'); if (i < 0) return '';
    const k = d.slice(0, i).trim().toLowerCase(), val = d.slice(i + 1).trim();
    if (!STYLE_OK.has(k) || /url\s*\(|expression|javascript|@import|[<>\\]/i.test(val)) return '';
    return `${k}:${val}`;
  }).filter(Boolean).join(';');
}

function cleanTag(name, rawAttrs) {
  const out = [];
  const re = /([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let m;
  const allowed = new Set([...(ATTRS['*']), ...(ATTRS[name] || [])]);
  let rel = false;
  while ((m = re.exec(rawAttrs))) {
    const k = m[1].toLowerCase();
    let v = m[2] ?? m[3] ?? m[4] ?? '';
    if (k.startsWith('on') || !allowed.has(k)) continue;
    if (k === 'href') { v = safeUrl(v, 'a'); if (!v) continue; }
    else if (k === 'src' || k === 'poster') { v = safeUrl(v, name === 'iframe' ? 'iframe' : 'img'); if (!v) continue; }
    else if (k === 'style') { v = safeStyle(v); if (!v) continue; }
    else if (k === 'target') { if (!/^_(blank|self)$/.test(v)) continue; }
    else if (k === 'rel') { rel = true; }
    else v = unesc(v);
    if (k === 'allowfullscreen' || k === 'controls') { out.push(k); continue; }
    out.push(`${k}="${esc(v)}"`);
  }
  if (name === 'a') { const i = out.findIndex((x) => x.startsWith('rel=')); const r = 'rel="noopener noreferrer"'; if (i >= 0) out[i] = r; else out.push(r); }
  void rel;
  return out.length ? ' ' + out.join(' ') : '';
}

function sanitizeHtml(html, maxLen = 200000) {
  let s = String(html == null ? '' : html).slice(0, maxLen * 2).replace(/\u0000/g, '').replace(/<!--[\s\S]*?(-->|$)/g, '');
  const out = [];
  const stack = [];
  const re = /<\/?([a-zA-Z][a-zA-Z0-9]*)((?:"[^"]*"|'[^']*'|[^'">])*)>?|<|[^<]+/g;
  let m, skip = null;
  while ((m = re.exec(s))) {
    const tok = m[0];
    if (!m[1]) { if (!skip) out.push(tok === '<' ? '&lt;' : tok.replace(/>/g, '&gt;')); continue; }
    const name = m[1].toLowerCase(), closing = tok[1] === '/';
    if (skip) { if (closing && name === skip.name && --skip.n === 0) skip = null; else if (!closing && name === skip.name) skip.n++; continue; }
    if (DROP_WITH_CONTENT.has(name)) { if (!closing && !/\/>$/.test(tok)) skip = { name, n: 1 }; continue; }
    if (!TAGS.has(name)) continue;
    if (closing) {
      const i = stack.lastIndexOf(name);
      if (i < 0 || VOID.has(name)) continue;
      while (stack.length > i) out.push(`</${stack.pop()}>`);
      continue;
    }
    const attrs = cleanTag(name, m[2] || '');
    if (name === 'iframe' && !/ src=/.test(attrs)) continue;
    if ((name === 'img' || name === 'source') && !/ src=/.test(attrs)) continue;
    out.push(`<${name}${attrs}>`);
    if (!VOID.has(name)) stack.push(name);
  }
  while (stack.length) out.push(`</${stack.pop()}>`);
  return out.join('').trim().slice(0, maxLen);
}

// Düz metin gerektiğinde (SEO özeti vb.)
const htmlToText = (html) => unesc(String(html || '').replace(/<(script|style)[\s\S]*?<\/\1>/gi, '').replace(/<\/(p|div|li|h\d|tr)>|<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();

module.exports = { sanitizeHtml, htmlToText };
