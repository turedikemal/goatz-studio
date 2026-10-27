// Yalnız sunucuda: üretilen HTML'e hız/SEO dokunuşları (panel önizlemesi bunu kullanmaz).
// - CSS/JS adreslerine içerik özetinden sürüm eklenir (?v=...), böylece uzun süre önbelleğe alınabilirler.
// - /uploads görsellerine gerçek genişlik/yükseklik yazılır (yüklenirken sayfa kaymasın, CLS).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const ASSETS = ['site.css', 'site.js', 'cart.js', 'svc-nav.js', 'wizard.js'];

const cache = new Map();
function cached(key, file, fn) {
  let st;
  try { st = fs.statSync(file); } catch (e) { return null; }
  const hit = cache.get(key);
  if (hit && hit.mtime === st.mtimeMs && hit.size === st.size) return hit.value;
  let value = null;
  try { value = fn(fs.readFileSync(file)); } catch (e) { value = null; }
  cache.set(key, { mtime: st.mtimeMs, size: st.size, value });
  return value;
}

const version = (name) => cached('v:' + name, path.join(PUBLIC_DIR, name), (b) => crypto.createHash('md5').update(b).digest('hex').slice(0, 10));

// Görsel boyutu: WebP (VP8 / VP8L / VP8X), PNG, JPEG başlıklarından okunur
function imageSize(b) {
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    const kind = b.toString('ascii', 12, 16);
    if (kind === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
    if (kind === 'VP8L') { const n = b.readUInt32LE(21); return [1 + (n & 0x3fff), 1 + ((n >> 14) & 0x3fff)]; }
    if (kind === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
    return null;
  }
  if (b[0] === 0x89 && b.toString('ascii', 1, 4) === 'PNG') return [b.readUInt32BE(16), b.readUInt32BE(20)];
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i < b.length) {
      if (b[i] !== 0xff) return null;
      const m = b[i + 1];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
      i += 2 + b.readUInt16BE(i + 2);
    }
  }
  return null;
}

function optimize(html, uploadDir, redirects = {}) {
  // Eski görsel adları yeni adlara çevrilir (301 yönlendirmesine gerek kalmasın; og:image dahil)
  html = html.replace(/\/uploads\/([^"'?#)\s]+)/g, (m, name) => (redirects[name] ? '/uploads/' + redirects[name] : m));
  html = html.replace(/(href|src)="\/([a-z-]+\.(?:css|js))"/g, (m, attr, name) => {
    const v = ASSETS.includes(name) && version(name);
    return v ? `${attr}="/${name}?v=${v}"` : m;
  });
  if (uploadDir) {
    html = html.replace(/<img\b([^>]*?)\ssrc="\/uploads\/([^"?#]+)"([^>]*)>/g, (m, a, name, b) => {
      if (/\swidth=/.test(a + b)) return m;
      let file;
      try { file = path.join(uploadDir, decodeURIComponent(name)); } catch (e) { return m; }
      if (!file.startsWith(uploadDir + path.sep)) return m;
      const size = cached('i:' + file, file, imageSize);
      return size ? `<img${a} src="/uploads/${name}" width="${size[0]}" height="${size[1]}"${b}>` : m;
    });
  }
  return html;
}

module.exports = { optimize, imageSize };
