const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { render } = require('./lib/render');
const store = require('./lib/content');
const { resolvePages, resolveWorks } = require('./lib/schema');
const db = require('./lib/db');
const salesRoutes = require('./lib/sales-routes');

const PORT = Number(process.env.PORT) || 5173;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const PUBLIC_DIR = path.join(__dirname, 'public');
const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;
const MAX_JSON = 1024 * 1024;
const MAX_UPLOAD = 8 * 1024 * 1024;

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};
const IMAGE_MAGIC = {
  'image/png': [[0x89, 0x50, 0x4e, 0x47]],
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]],
};
const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp' };

// ---------- Oturum ----------
const sessions = new Map();
const attempts = new Map();

function cookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').filter(Boolean).map((c) => {
    const i = c.indexOf('=');
    return [c.slice(0, i).trim(), decodeURIComponent(c.slice(i + 1).trim())];
  }));
}
function authed(req) {
  const token = cookies(req).gs_session;
  const exp = token && sessions.get(token);
  if (!exp) return false;
  if (exp < Date.now()) { sessions.delete(token); return false; }
  return true;
}
function passwordOk(input) {
  if (!ADMIN_PASSWORD) return false;
  const a = crypto.createHash('sha256').update(String(input)).digest();
  const b = crypto.createHash('sha256').update(ADMIN_PASSWORD).digest();
  return crypto.timingSafeEqual(a, b);
}
function tooManyAttempts(ip) {
  const now = Date.now();
  const list = (attempts.get(ip) || []).filter((t) => now - t < 15 * 60 * 1000);
  attempts.set(ip, list);
  return list.length >= 10;
}

// ---------- Yardımcılar ----------
function send(res, status, body, type = 'text/plain; charset=utf-8', extra = {}) {
  res.writeHead(status, {
    'Content-Type': type,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    ...extra,
  });
  res.end(body);
}
const messages = require('./lib/messages');
const mailer = require('./lib/mailer');
const seo = require('./lib/seo');
// Eski görsel adresleri -> yeni (SEO'lu, WebP) adresler; data/image-redirects.json
let imgRedirCache = null;
const imageRedirects = () => { if (!imgRedirCache) { try { imgRedirCache = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'image-redirects.json'), 'utf8')); } catch (e) { imgRedirCache = {}; } } return imgRedirCache; };
const contactHits = new Map();
const siteHits = new Map();
const sitecheck = require('./lib/sitecheck');
const json = (res, status, data, extra) => send(res, status, JSON.stringify(data), 'application/json; charset=utf-8', extra);

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(Object.assign(new Error('Dosya çok büyük'), { status: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}
async function readJson(req, limit = MAX_JSON) {
  if (!String(req.headers['content-type'] || '').startsWith('application/json')) {
    throw Object.assign(new Error('JSON bekleniyor'), { status: 415 });
  }
  try { return JSON.parse(await readBody(req, limit)); } catch (e) {
    throw e.status ? e : Object.assign(new Error('Geçersiz JSON'), { status: 400 });
  }
}
function serveFile(res, file, cache = 'no-store') {
  fs.readFile(file, (err, data) => {
    if (err) return send(res, 404, 'Bulunamadı');
    send(res, 200, data, TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', { 'Cache-Control': cache });
  });
}
function safeJoin(dir, name) {
  const file = path.join(dir, name);
  return file.startsWith(dir + path.sep) ? file : null;
}

// ---------- API ----------
async function api(req, res, url) {
  const route = `${req.method} ${url.pathname}`;
  const ip = req.socket.remoteAddress || '';

  // Herkese açık: iletişim formu
  if (route === 'POST /api/contact') {
    const now = Date.now();
    const hits = (contactHits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
    if (hits.length >= 5) return json(res, 429, { error: 'Çok fazla mesaj gönderdin. Biraz sonra tekrar dene.' });
    const body = await readJson(req, 16 * 1024 * 1024);
    if (body && body.website) return json(res, 200, { ok: true }); // bot tuzağı
    const saved = messages.add(body || {});
    const b64 = (x, max) => (typeof x === 'string' && x.length <= max && /^[A-Za-z0-9+/=]+$/.test(x) ? x : null);
    const files = { jpeg: b64(body.screenshot, 9e6), pdf: b64(body.pdf, 9e6) };
    const str = (x, n) => (typeof x === 'string' ? x.slice(0, n) : '');
    const arr = (x, n) => (Array.isArray(x) ? x.slice(0, n) : []);
    const r = body && typeof body.report === 'object' && body.report;
    const report = r ? { route: str(r.route, 60), package: str(r.package, 80), scope: arr(r.scope, 40).map((x) => str(x, 300)), services: arr(r.services, 40).map((x) => str(x, 200)), answers: arr(r.answers, 40).filter(Array.isArray).map((x) => [str(x[0], 200), str(x[1], 300)]), note: str(r.note, 2000), marketing: !!r.marketing } : null;
    mailer.notify(saved, store.load().contact.email, files, report).then((r) => { if (!r.sent) console.warn('Mesaj e-postası gönderilemedi:', r.reason); }).catch((e) => console.warn('Mesaj e-postası hatası:', e.message));
    hits.push(now); contactHits.set(ip, hits);
    return json(res, 200, { ok: true });
  }

  if (route === 'POST /api/check-site') {
    const now = Date.now();
    const hits = (siteHits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
    if (hits.length >= 20) return json(res, 429, { ok: false, message: 'Çok fazla deneme. Biraz sonra tekrar deneyin.' });
    hits.push(now); siteHits.set(ip, hits);
    const body = await readJson(req, 2000);
    return json(res, 200, await sitecheck.check(body && body.url));
  }

  if (route === 'GET /api/me') return json(res, 200, { authed: authed(req), configured: Boolean(ADMIN_PASSWORD) });

  if (route === 'POST /api/login') {
    if (!ADMIN_PASSWORD) return json(res, 503, { error: 'Panel şifresi ayarlanmamış (ADMIN_PASSWORD).' });
    if (tooManyAttempts(ip)) return json(res, 429, { error: 'Çok fazla deneme. 15 dakika sonra tekrar dene.' });
    const { password } = await readJson(req);
    if (!passwordOk(password)) {
      attempts.get(ip).push(Date.now());
      return json(res, 401, { error: 'Şifre yanlış.' });
    }
    const token = crypto.randomBytes(32).toString('hex');
    sessions.set(token, Date.now() + SESSION_TTL);
    const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
    return json(res, 200, { ok: true }, {
      'Set-Cookie': `gs_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL / 1000}${secure}`,
    });
  }

  if (route === 'POST /api/logout') {
    sessions.delete(cookies(req).gs_session);
    return json(res, 200, { ok: true }, { 'Set-Cookie': 'gs_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' });
  }

  if (!authed(req)) return json(res, 401, { error: 'Giriş yapmalısın.' });

  if (route === 'GET /api/messages') return json(res, 200, messages.list());
  if (route === 'POST /api/messages/reply') {
    const { id, text } = await readJson(req);
    const m = messages.get(String(id || ''));
    const body = String(text || '').trim();
    if (!m) return json(res, 404, { error: 'Mesaj bulunamadı.' });
    if (body.length < 2) return json(res, 400, { error: 'Yanıt boş olamaz.' });
    await mailer.reply(m, body, store.load().contact.email);
    messages.addReply(m.id, body);
    return json(res, 200, { ok: true });
  }
  if (route === 'POST /api/messages/read') { messages.markRead(String((await readJson(req)).id || '')); return json(res, 200, { ok: true }); }
  if (req.method === 'DELETE' && url.pathname.startsWith('/api/messages/')) { messages.remove(decodeURIComponent(url.pathname.slice(14))); return json(res, 200, { ok: true }); }

  if (route === 'GET /api/content') return json(res, 200, store.load());
  if (route === 'GET /api/defaults') return json(res, 200, store.DEFAULTS);
  if (route === 'PUT /api/content') return json(res, 200, store.save(await readJson(req)));

  if (route === 'POST /api/preview') {
    const html = render(store.conform(store.DEFAULTS, await readJson(req)), { preview: true });
    return send(res, 200, html, 'text/html; charset=utf-8', { 'Cache-Control': 'no-store' });
  }

  if (route === 'GET /api/backups') return json(res, 200, store.listBackups());
  if (req.method === 'GET' && url.pathname.startsWith('/api/backups/')) {
    const data = store.readBackup(decodeURIComponent(url.pathname.slice('/api/backups/'.length)));
    return data ? json(res, 200, data) : json(res, 404, { error: 'Yedek bulunamadı.' });
  }

  if (route === 'GET /api/uploads') {
    const files = fs.readdirSync(store.UPLOAD_DIR)
      .filter((f) => /^[a-z0-9-]+\.(png|jpe?g|webp|gif)$/.test(f))
      .map((f) => ({ url: `/uploads/${f}`, name: f, size: fs.statSync(path.join(store.UPLOAD_DIR, f)).size, time: fs.statSync(path.join(store.UPLOAD_DIR, f)).mtimeMs }))
      .sort((a, b) => b.time - a.time);
    return json(res, 200, files);
  }

  if (route === 'POST /api/upload') {
    const { data } = await readJson(req, Math.ceil(MAX_UPLOAD * 1.4));
    const m = /^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(String(data || ''));
    if (!m) return json(res, 400, { error: 'Yalnızca PNG, JPG, WEBP veya GIF yüklenebilir.' });
    const buf = Buffer.from(m[2], 'base64');
    if (buf.length > MAX_UPLOAD) return json(res, 413, { error: 'Görsel en fazla 8 MB olabilir.' });
    if (!IMAGE_MAGIC[m[1]].some((sig) => sig.every((b, i) => buf[i] === b))) return json(res, 400, { error: 'Dosya içeriği bir görsel değil.' });
    const name = `${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}.${EXT[m[1]]}`;
    fs.writeFileSync(path.join(store.UPLOAD_DIR, name), buf);
    return json(res, 200, { url: `/uploads/${name}` });
  }

  if (req.method === 'DELETE' && url.pathname.startsWith('/api/uploads/')) {
    const name = decodeURIComponent(url.pathname.slice('/api/uploads/'.length));
    const file = /^[a-z0-9-]+\.(png|jpe?g|webp|gif)$/.test(name) && safeJoin(store.UPLOAD_DIR, name);
    if (!file || !fs.existsSync(file)) return json(res, 404, { error: 'Görsel bulunamadı.' });
    fs.unlinkSync(file);
    return json(res, 200, { ok: true });
  }

  // ========== Tanımlamalar (Definitions) API ==========
  if (route === 'GET /api/definitions/brands') {
    try {
      const brands = await db.getBrands();
      return json(res, 200, brands);
    } catch (e) {
      return json(res, e.status || 500, { error: e.status ? e.message : 'Markalar yüklenemedi: ' + e.message });
    }
  }

  if (route === 'POST /api/definitions/brands') {
    try {
      const { name, slug, description, logoUrl } = await readJson(req);
      if (!name) return json(res, 400, { error: 'Ad gerekli.' });
      const brand = await db.createBrand(name, slug || db.slugify(name), description, logoUrl);
      return json(res, 201, brand);
    } catch (e) {
      return json(res, e.status || 500, { error: e.status ? e.message : 'Marka oluşturulamadı: ' + e.message });
    }
  }

  const updateBrandMatch = /^PUT \/api\/definitions\/brands\/(\d+)$/.exec(route);
  if (updateBrandMatch) {
    try {
      const id = parseInt(updateBrandMatch[1]);
      const { name, slug, description, logoUrl } = await readJson(req);
      const brand = await db.updateBrand(id, name, slug, description, logoUrl);
      return json(res, 200, brand);
    } catch (e) {
      return json(res, e.status || 500, { error: e.status ? e.message : 'Marka güncellenemedi: ' + e.message });
    }
  }

  const deleteBrandMatch = /^DELETE \/api\/definitions\/brands\/(\d+)$/.exec(route);
  if (deleteBrandMatch) {
    try {
      const id = parseInt(deleteBrandMatch[1]);
      await db.deleteRow('brands', id);
      return json(res, 200, { ok: true });
    } catch (e) {
      return json(res, e.status || 500, { error: e.status ? e.message : 'Marka silinemedi: ' + e.message });
    }
  }

  if (route === 'GET /api/definitions/categories') {
    try {
      const categories = await db.getCategories();
      return json(res, 200, categories);
    } catch (e) {
      return json(res, e.status || 500, { error: e.status ? e.message : 'Kategoriler yüklenemedi: ' + e.message });
    }
  }

  if (route === 'POST /api/definitions/categories') {
    try {
      const { name, slug, parentId, description, icon } = await readJson(req);
      if (!name) return json(res, 400, { error: 'Ad gerekli.' });
      const category = await db.createCategory(name, slug || db.slugify(name), parentId || null, description, icon);
      return json(res, 201, category);
    } catch (e) {
      return json(res, e.status || 500, { error: e.status ? e.message : 'Kategori oluşturulamadı: ' + e.message });
    }
  }

  if (route === 'GET /api/definitions/properties') {
    try {
      const properties = await db.getProperties();
      // Her property için values'ları da ekle
      for (const prop of properties) {
        prop.values = await db.getPropertyValues(prop.id);
      }
      return json(res, 200, properties);
    } catch (e) {
      return json(res, e.status || 500, { error: e.status ? e.message : 'Özellikler yüklenemedi: ' + e.message });
    }
  }

  if (route === 'POST /api/definitions/properties') {
    try {
      const { name, slug, inputType, description } = await readJson(req);
      if (!name) return json(res, 400, { error: 'Ad gerekli.' });
      const property = await db.createProperty(name, slug || db.slugify(name), inputType, description);
      return json(res, 201, property);
    } catch (e) {
      return json(res, e.status || 500, { error: e.status ? e.message : 'Özellik oluşturulamadı: ' + e.message });
    }
  }

  if (route === 'POST /api/definitions/property-values') {
    try {
      const { propertyId, value, colorHex } = await readJson(req);
      if (!propertyId || !value) return json(res, 400, { error: 'propertyId ve value gerekli.' });
      const propValue = await db.createPropertyValue(propertyId, value, colorHex);
      return json(res, 201, propValue);
    } catch (e) {
      return json(res, e.status || 500, { error: e.status ? e.message : 'Özellik değeri oluşturulamadı: ' + e.message });
    }
  }

  if (route === 'GET /api/definitions/tax-rates') {
    try {
      const rates = await db.getTaxRates();
      return json(res, 200, rates);
    } catch (e) {
      return json(res, e.status || 500, { error: e.status ? e.message : 'Vergi oranları yüklenemedi: ' + e.message });
    }
  }

  if (route === 'POST /api/definitions/tax-rates') {
    try {
      const { name, rate, description } = await readJson(req);
      if (!name || rate === undefined) return json(res, 400, { error: 'Name ve rate gerekli.' });
      const taxRate = await db.createTaxRate(name, rate, description);
      return json(res, 201, taxRate);
    } catch (e) {
      return json(res, e.status || 500, { error: e.status ? e.message : 'Vergi oranı oluşturulamadı: ' + e.message });
    }
  }

  if (route === 'GET /api/definitions/warehouses') {
    try {
      const warehouses = await db.getWarehouses();
      return json(res, 200, warehouses);
    } catch (e) {
      return json(res, e.status || 500, { error: e.status ? e.message : 'Depolar yüklenemedi: ' + e.message });
    }
  }

  if (route === 'POST /api/definitions/warehouses') {
    try {
      const { name, slug, address, isDefault } = await readJson(req);
      if (!name) return json(res, 400, { error: 'Ad gerekli.' });
      const warehouse = await db.createWarehouse(name, slug || db.slugify(name), address, isDefault);
      return json(res, 201, warehouse);
    } catch (e) {
      return json(res, e.status || 500, { error: e.status ? e.message : 'Depo oluşturulamadı: ' + e.message });
    }
  }

  const defMatch = /^(PUT|DELETE) \/api\/definitions\/([a-z-]+)\/(\d+)$/.exec(route);
  if (defMatch) {
    const id = parseInt(defMatch[3], 10);
    if (defMatch[1] === 'DELETE') { await db.deleteDefinition(defMatch[2], id); return json(res, 200, { ok: true }); }
    return json(res, 200, await db.updateDefinition(defMatch[2], id, await readJson(req)));
  }

  if (route === 'GET /api/stock') return json(res, 200, await db.getStockList());
  if (route === 'POST /api/products/bulk') {
    const { ids, action } = await readJson(req);
    return json(res, 200, { ok: true, count: await db.bulkProducts(ids, action) });
  }

  // ========== Ürünler (Products) API ==========
  if (route === 'GET /api/products') {
    try {
      const products = await db.getProducts();
      return json(res, 200, products);
    } catch (e) {
      return json(res, e.status || 500, { error: e.status ? e.message : 'Ürünler yüklenemedi: ' + e.message });
    }
  }

  if (route === 'POST /api/products') {
    try {
      const data = await readJson(req);
      if (!data.name || !data.salePrice) return json(res, 400, { error: 'Ürün adı ve satış fiyatı gerekli.' });
      const product = await db.createProduct(data);
      return json(res, 201, product);
    } catch (e) {
      return json(res, e.status || 500, { error: e.status ? e.message : 'Ürün oluşturulamadı: ' + e.message });
    }
  }

  const getProductMatch = /^GET \/api\/products\/(\d+)$/.exec(route);
  if (getProductMatch) {
    try {
      const id = parseInt(getProductMatch[1]);
      const product = await db.getProduct(id);
      if (!product) return json(res, 404, { error: 'Ürün bulunamadı.' });
      return json(res, 200, product);
    } catch (e) {
      return json(res, e.status || 500, { error: e.status ? e.message : 'Ürün yüklenemedi: ' + e.message });
    }
  }

  const updateProductMatch = /^PUT \/api\/products\/(\d+)$/.exec(route);
  if (updateProductMatch) {
    try {
      const id = parseInt(updateProductMatch[1]);
      const data = await readJson(req);
      const product = await db.updateProduct(id, data);
      return json(res, 200, product);
    } catch (e) {
      return json(res, e.status || 500, { error: e.status ? e.message : 'Ürün güncellenemedi: ' + e.message });
    }
  }

  const deleteProductMatch = /^DELETE \/api\/products\/(\d+)$/.exec(route);
  if (deleteProductMatch) {
    try {
      const id = parseInt(deleteProductMatch[1]);
      await db.deleteRow('products', id);
      return json(res, 200, { ok: true });
    } catch (e) {
      return json(res, e.status || 500, { error: e.status ? e.message : 'Ürün silinemedi: ' + e.message });
    }
  }

  if (route === 'POST /api/products/variants') {
    try {
      const { productId, ...variantData } = await readJson(req);
      if (!productId) return json(res, 400, { error: 'Ürün ID gerekli.' });
      const variant = await db.createProductVariant(productId, variantData);
      return json(res, 201, variant);
    } catch (e) {
      return json(res, e.status || 500, { error: e.status ? e.message : 'Varyant oluşturulamadı: ' + e.message });
    }
  }

  if (route === 'POST /api/stock') {
    try {
      const { variantId, warehouseId, quantity } = await readJson(req);
      if (!variantId || !warehouseId || quantity === undefined) {
        return json(res, 400, { error: 'Varyant ID, depo ID ve miktar gerekli.' });
      }
      const stock = await db.updateStock(variantId, warehouseId, quantity);
      return json(res, 200, stock);
    } catch (e) {
      return json(res, e.status || 500, { error: e.status ? e.message : 'Stok güncellenemedi: ' + e.message });
    }
  }

  if (await salesRoutes({ route, req, res, url, json, readJson })) return;

  return json(res, 404, { error: 'Bilinmeyen istek.' });
}

// ---------- Sunucu ----------
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'İzin verilmiyor');

    if (url.pathname === '/') {
      return send(res, 200, render(store.load()), 'text/html; charset=utf-8', { 'Cache-Control': 'no-cache' });
    }
    // Panel önizlemeyi tarayıcıda üretir; bu yüzden şablon dosyaları küçük bir CommonJS sarmalıyla tarayıcıya verilir.
    if (url.pathname === '/render-bundle.js') {
      const files = { './default-content': 'default-content.js', './schema': 'schema.js', './render': 'render.js' };
      let out = '(function(){var defs={};';
      for (const [name, file] of Object.entries(files)) {
        out += `defs[${JSON.stringify(name)}]=function(module,exports,require){${fs.readFileSync(path.join(__dirname, 'lib', file), 'utf8')}\n};`;
      }
      out += 'var cache={};function req(n){if(cache[n])return cache[n].exports;if(!defs[n])throw new Error("yok: "+n);var m={exports:{}};cache[n]=m;defs[n](m,m.exports,req);return m.exports;}'
        + 'var r=req("./render");window.GoatzRender={render:r.render,setSprites:r.setSprites,conform:req("./schema").conform,resolvePages:req("./schema").resolvePages,DEFAULTS:req("./default-content")};})();';
      return send(res, 200, out, TYPES['.js'], { 'Cache-Control': 'no-store' });
    }
    if (url.pathname === '/admin' || url.pathname === '/admin/') {
      return serveFile(res, path.join(PUBLIC_DIR, 'admin.html'));
    }
    if (url.pathname.startsWith('/uploads/')) {
      const upName = decodeURIComponent(url.pathname.slice('/uploads/'.length));
      const moved = imageRedirects()[upName];
      if (moved && moved !== upName) { res.writeHead(301, { Location: '/uploads/' + encodeURIComponent(moved), 'Cache-Control': 'public, max-age=31536000' }); return res.end(); }
      const file = safeJoin(store.UPLOAD_DIR, upName);
      return file ? serveFile(res, file, 'public, max-age=31536000, immutable') : send(res, 404, 'Bulunamadı');
    }
    const origin = `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`;
    // Arama motoru ve yapay zekâ botları için: robots.txt, sitemap.xml, llms.txt (lib/seo.js, içerikten üretilir)
    if (url.pathname === '/robots.txt') return send(res, 200, seo.robots(origin, store.load()), 'text/plain; charset=utf-8');
    if (url.pathname === '/sitemap.xml') return send(res, 200, seo.sitemap(origin, store.load()), 'application/xml; charset=utf-8');
    if (url.pathname === '/llms.txt') return send(res, 200, seo.llms(origin, store.load()), 'text/plain; charset=utf-8');
    // İşler: /isler ve /isler/proje-adi
    const wm = /^\/isler(?:\/([a-z0-9-]+))?\/?$/.exec(url.pathname);
    if (wm) {
      const c = store.load();
      if (c.works.visible) {
        if (!wm[1]) return send(res, 200, render(c, { page: 'works' }), 'text/html; charset=utf-8', { 'Cache-Control': 'no-cache' });
        const it = resolveWorks(c.works.items).find((v) => v.visible && v.slug === wm[1]);
        if (it) return send(res, 200, render(c, { work: it.slug }), 'text/html; charset=utf-8', { 'Cache-Control': 'no-cache' });
      }
      return send(res, 404, 'Sayfa bulunamadı');
    }
    // Özel sayfalar: /hakkimizda
    const pm = /^\/([a-z0-9-]+)\/?$/.exec(url.pathname);
    if (pm) {
      const c = store.load();
      const page = resolvePages(c.pages).find((p) => p.visible && p.slug === pm[1]);
      if (page) return send(res, 200, render(c, { page: page.id }), 'text/html; charset=utf-8', { 'Cache-Control': 'no-cache' });
    }
    const file = safeJoin(PUBLIC_DIR, decodeURIComponent(url.pathname.slice(1)));
    if (file && fs.existsSync(file) && fs.statSync(file).isFile()) return serveFile(res, file);
    return send(res, 404, 'Sayfa bulunamadı');
  } catch (e) {
    if (!res.headersSent) json(res, e.status || 500, { error: e.status ? e.message : 'Sunucu hatası.' });
    if (!e.status) console.error(e);
  }
});

// Database initialization
(async () => {
  try {
    await db.initSchema();
  } catch (e) {
    console.error('Database init error:', e.message);
  }

  server.listen(PORT, () => {
    console.log(`The Goatz Studio: http://localhost:${PORT}  ·  Panel: http://localhost:${PORT}/admin`);
    if (!ADMIN_PASSWORD) console.warn('Uyarı: ADMIN_PASSWORD ayarlı değil, panele giriş kapalı.');
  });
})();
