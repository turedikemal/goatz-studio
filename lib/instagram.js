// Instagram otomatik paylaşım (Instagram API, Instagram ile giriş: graph.instagram.com).
// Haftalık paket data/instagram/<hafta>/ altında: plan.json + görseller. Sunucu dakikada bir planı okur,
// saati gelen karusel gönderiyi ya da hikâyeyi paylaşır. Durum data/instagram/state.json (persist ile PostgreSQL'e de).
// Ortam: IG_ACCESS_TOKEN (zorunlu), IG_AUTOPOST=off (kapatır). Anahtar 60 günlüktür; sunucu süresi dolmadan yeniler
// ve yenisini data/instagram/token.json'a yazar (git dışı, yalnız veritabanında saklanır).
const fs = require('fs');
const path = require('path');
const persist = require('./persist');
const db = require('./db');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const IG_DIR = path.join(DATA_DIR, 'instagram');
const STATE = path.join(IG_DIR, 'state.json');
const TOKEN = path.join(IG_DIR, 'token.json');
const API = 'https://graph.instagram.com/' + (process.env.IG_GRAPH_VERSION || 'v23.0');
const LATE_MS = 2 * 60 * 60 * 1000; // 2 saatten fazla geciken paylaşım atlanır (sunucu kapalı kaldıysa toplu paylaşım olmasın)
const REFRESH_MS = 20 * 24 * 60 * 60 * 1000;

const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
function writeJson(f, data, name) {
  fs.mkdirSync(path.dirname(f), { recursive: true });
  const buf = Buffer.from(JSON.stringify(data, null, 2));
  fs.writeFileSync(f, buf);
  persist.save(name, buf);
}

function token() {
  const t = readJson(TOKEN, null);
  const env = process.env.IG_ACCESS_TOKEN || '';
  // Ortamdaki anahtar değiştiyse (yeni anahtar yapıştırıldıysa) o geçerli
  if (t && t.token && t.source === env) return t;
  return env ? { token: env, source: env, refreshedAt: null } : null;
}
// Veritabanı şart: durum kaydı yayınlar arasında kaybolursa aynı paylaşım iki kez gidebilir
const enabled = () => Boolean(token()) && Boolean(db.getPool()) && process.env.IG_AUTOPOST !== 'off';

// Tüm haftaların planları: [{ id, at, type: 'carousel'|'story', images: [yol], caption, week }]
function plan() {
  if (!fs.existsSync(IG_DIR)) return [];
  const out = [];
  for (const w of fs.readdirSync(IG_DIR).sort()) {
    const p = readJson(path.join(IG_DIR, w, 'plan.json'), null);
    if (!p || !Array.isArray(p.items)) continue;
    for (const it of p.items) out.push({ ...it, week: w, images: it.images.map((x) => `${w}/${x}`) });
  }
  return out.sort((a, b) => a.at.localeCompare(b.at));
}
const state = () => readJson(STATE, {});
function setState(id, patch) {
  const s = state();
  s[id] = { ...(s[id] || {}), ...patch };
  writeJson(STATE, s, 'instagram/state.json');
}

async function call(method, p, params, tok) {
  const body = new URLSearchParams({ ...params, access_token: tok });
  const url = method === 'GET' ? `${API}/${p}?${body}` : `${API}/${p}`;
  const res = await fetch(url, method === 'GET' ? {} : { method, body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error((data.error && data.error.message) || `Instagram ${res.status}`);
  return data;
}
async function waitReady(id, tok) {
  for (let i = 0; i < 30; i++) {
    const d = await call('GET', id, { fields: 'status_code' }, tok);
    if (d.status_code === 'FINISHED') return;
    if (d.status_code === 'ERROR' || d.status_code === 'EXPIRED') throw new Error(`Görsel işlenemedi (${d.status_code})`);
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error('Görsel işleme zaman aşımı');
}
async function account(tok) {
  const d = await call('GET', 'me', { fields: 'user_id,username' }, tok);
  return { id: d.user_id || d.id, username: d.username };
}

async function publish(item, origin) {
  const tok = token().token;
  const me = await account(tok);
  const url = (f) => `${origin}/ig-media/${f.split('/').map(encodeURIComponent).join('/')}`;
  let creation;
  if (item.type === 'story') {
    creation = (await call('POST', `${me.id}/media`, { image_url: url(item.images[0]), media_type: 'STORIES' }, tok)).id;
  } else if (item.images.length === 1) {
    creation = (await call('POST', `${me.id}/media`, { image_url: url(item.images[0]), caption: item.caption || '' }, tok)).id;
  } else {
    const children = [];
    for (const f of item.images.slice(0, 10)) children.push((await call('POST', `${me.id}/media`, { image_url: url(f), is_carousel_item: 'true' }, tok)).id);
    for (const c of children) await waitReady(c, tok);
    creation = (await call('POST', `${me.id}/media`, { media_type: 'CAROUSEL', children: children.join(','), caption: item.caption || '' }, tok)).id;
  }
  await waitReady(creation, tok);
  const done = await call('POST', `${me.id}/media_publish`, { creation_id: creation }, tok);
  return done.id;
}

async function refreshToken() {
  const t = token();
  if (!t) return;
  if (t.refreshedAt && Date.now() - new Date(t.refreshedAt).getTime() < REFRESH_MS) return;
  const res = await fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(t.token)}`);
  const d = await res.json().catch(() => ({}));
  if (!res.ok || !d.access_token) throw new Error((d.error && d.error.message) || 'Anahtar yenilenemedi');
  writeJson(TOKEN, { token: d.access_token, source: t.source, refreshedAt: new Date().toISOString() }, 'instagram/token.json');
  console.log('Instagram: erişim anahtarı yenilendi');
}

let busy = false;
async function tick(origin) {
  if (busy || !enabled()) return;
  busy = true;
  try {
    const s = state();
    const now = Date.now();
    for (const it of plan()) {
      if (s[it.id] && s[it.id].status !== 'error') continue;
      if (s[it.id] && s[it.id].tries >= 3) continue;
      const at = new Date(it.at).getTime();
      if (at > now) break;
      if (now - at > LATE_MS) { setState(it.id, { status: 'skipped', note: 'Saati geçmişti (sunucu kapalıydı ya da anahtar yoktu)' }); continue; }
      await run(it, origin);
      break; // her turda bir paylaşım
    }
    await refreshToken().catch((e) => console.warn('Instagram anahtarı yenilenemedi:', e.message));
  } finally { busy = false; }
}
async function run(it, origin) {
  const prev = state()[it.id] || {};
  try {
    const mediaId = await publish(it, origin);
    setState(it.id, { status: 'published', mediaId, publishedAt: new Date().toISOString(), error: null });
    console.log(`Instagram: paylaşıldı ${it.id}`);
  } catch (e) {
    setState(it.id, { status: 'error', error: e.message, tries: (prev.tries || 0) + 1 });
    console.warn(`Instagram: paylaşılamadı ${it.id}:`, e.message);
  }
}

function start(origin) {
  setInterval(() => tick(origin()).catch((e) => console.warn('Instagram zamanlayıcı:', e.message)), 60 * 1000);
}

// Panel için özet
async function summary() {
  const t = token();
  let acct = null; let acctError = null;
  if (t) { try { acct = await account(t.token); } catch (e) { acctError = e.message; } }
  const s = state();
  return {
    configured: Boolean(t), enabled: enabled(), db: Boolean(db.getPool()), autopost: process.env.IG_AUTOPOST !== 'off', account: acct, accountError: acctError,
    items: plan().map((it) => ({ id: it.id, week: it.week, at: it.at, type: it.type, title: it.title || '', count: it.images.length, thumb: `/ig-media/${it.images[0]}`, ...(s[it.id] || { status: 'waiting' }) })),
  };
}
async function publishNow(id, origin) {
  const it = plan().find((x) => x.id === id);
  if (!it) throw Object.assign(new Error('Paylaşım bulunamadı.'), { status: 404 });
  if (!token()) throw Object.assign(new Error('IG_ACCESS_TOKEN tanımlı değil.'), { status: 400 });
  if ((state()[id] || {}).status === 'published') throw Object.assign(new Error('Bu zaten paylaşıldı.'), { status: 400 });
  await run(it, origin);
  return state()[id];
}
function skip(id, on) {
  if (!plan().some((x) => x.id === id)) throw Object.assign(new Error('Paylaşım bulunamadı.'), { status: 404 });
  const s = state();
  if (on) setState(id, { status: 'skipped', note: 'Panelden atlandı' });
  else if (s[id] && s[id].status !== 'published') { delete s[id]; writeJson(STATE, s, 'instagram/state.json'); }
  return state()[id] || { status: 'waiting' };
}
// /ig-media/<hafta>/<...>.jpg: yalnız jpg/png, IG_DIR dışına çıkılamaz
function mediaFile(rel) {
  if (!/\.(jpe?g|png)$/i.test(rel)) return null;
  const f = path.resolve(IG_DIR, rel);
  return f.startsWith(IG_DIR + path.sep) && fs.existsSync(f) ? f : null;
}

module.exports = { start, summary, publishNow, skip, mediaFile, plan };
