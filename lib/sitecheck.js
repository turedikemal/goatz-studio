// Adres kontrolü: alan adı geçerli mi, site açılıyor mu, marka adı ne? (iç ağ adreslerine istek atılmaz)
const dns = require('dns').promises;
const net = require('net');

const privateIp = (ip) => {
  if (net.isIPv6(ip)) return /^(::1?$|fc|fd|fe80|::ffff:(10\.|127\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.))/i.test(ip);
  const [a, b] = ip.split('.').map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
};

const normalize = (raw) => {
  let s = String(raw || '').trim().slice(0, 200);
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
  let u; try { u = new URL(s); } catch (e) { return null; }
  if (!/^https?:$/.test(u.protocol) || u.username || u.password) return null;
  const h = u.hostname.toLowerCase();
  if (!/^[a-z0-9\u00c0-\uffff]([a-z0-9\u00c0-\uffff.-]*[a-z0-9\u00c0-\uffff])?\.[a-z\u00c0-\uffff]{2,}$/i.test(h) && !net.isIP(h)) return null;
  return u;
};

const decode = (t) => t.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
const meta = (html, key) => {
  const m = html.match(new RegExp('<meta[^>]+(?:property|name)=["\']' + key + '["\'][^>]*>', 'i'));
  const c = m && m[0].match(/content=["']([^"']*)["']/i);
  return c ? decode(c[1]) : '';
};

async function hostOk(host) {
  if (net.isIP(host)) return !privateIp(host);
  const list = await dns.lookup(host, { all: true });
  return list.length > 0 && list.every((r) => !privateIp(r.address));
}

async function checkOnce(raw) {
  const u0 = normalize(raw);
  if (!u0) return { ok: false, reason: 'format', message: 'Bu geçerli bir alan adına benzemiyor. Örnek: ornek.com' };
  let url = u0, res = null, html = '';
  try {
    for (let i = 0; i < 4; i++) {
      if (!(await hostOk(url.hostname))) return { ok: false, reason: 'dns', message: 'Bu alan adı bulunamadı. Adresi kontrol edin.' };
      const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 7000);
      try {
        res = await fetch(url, { redirect: 'manual', signal: ctl.signal, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GoatzSiteCheck/1.0)', Accept: 'text/html' } });
        if (res.status >= 300 && res.status < 400 && res.headers.get('location')) { url = new URL(res.headers.get('location'), url); res.body && res.body.cancel(); continue; }
        const buf = res.ok ? await res.text() : '';
        html = buf.slice(0, 200000);
      } finally { clearTimeout(to); }
      break;
    }
  } catch (e) {
    const code = (e.cause && e.cause.code) || e.code || '';
    if (/ENOTFOUND|EAI_AGAIN/.test(code)) return { ok: false, reason: 'dns', message: 'Bu alan adı bulunamadı. Adresi kontrol edin.' };
    return { ok: false, reason: 'open', message: 'Site açılmıyor (yanıt vermedi). Adresi kontrol edin.' };
  }
  if (!res) return { ok: false, reason: 'open', message: 'Site açılmıyor (çok fazla yönlendirme).' };
  // 401/403 genelde bot koruması: site var kabul et
  if (!res.ok && ![401, 403, 429].includes(res.status)) return { ok: false, reason: 'open', message: 'Site açılmıyor (hata kodu ' + res.status + ').' };
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [, ''])[1];
  const brand = meta(html, 'og:site_name') || meta(html, 'application-name') || decode(title).split(/\s+[|\u2013\u2014-]\s+/).pop() || '';
  return { ok: true, finalUrl: url.origin + (url.pathname === '/' ? '' : url.pathname), host: url.hostname.replace(/^www\./, ''), brand: brand.slice(0, 80), title: decode(title).slice(0, 120) };
}
async function check(raw) {
  const r = await checkOnce(raw);
  if (!r.ok && ['dns', 'open'].includes(r.reason)) {
    const u = normalize(raw);
    if (u && u.hostname.toLowerCase().startsWith('www.')) { const r2 = await checkOnce(u.hostname.slice(4)); if (r2.ok) return r2; }
  }
  return r;
}
module.exports = { check };
