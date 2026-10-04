// Ana sayfa kampanya penceresi (Shopier %10) olayları: görüntülenme, tıklama, kapatma, gelen talep.
// Railway'de disk kalıcı değil (her yayında silinir), bu yüzden PostgreSQL'e yazılır; veritabanı yoksa data/promo.json.
const fs = require('fs');
const path = require('path');
const db = require('./db');

const FILE = path.join(process.env.DATA_DIR || path.join(__dirname, '..', 'data'), 'promo.json');
const EVENTS = ['view', 'click', 'close', 'lead'];
let ready = null;

const useDb = () => Boolean(db.getPool());
function init() {
  if (!ready) ready = db.query(`CREATE TABLE IF NOT EXISTS promo_events (
    id SERIAL PRIMARY KEY, ts TIMESTAMPTZ NOT NULL DEFAULT NOW(), campaign TEXT NOT NULL, event TEXT NOT NULL,
    name TEXT, email TEXT, phone TEXT, kind TEXT)`).catch((e) => { ready = null; throw e; });
  return ready;
}
const readFile = () => { try { const d = JSON.parse(fs.readFileSync(FILE, 'utf8')); return Array.isArray(d) ? d : []; } catch { return []; } };

async function record(event, extra = {}, campaign = 'shopier') {
  if (!EVENTS.includes(event)) return;
  const row = { campaign, event, name: extra.name || null, email: extra.email || null, phone: extra.phone || null, kind: extra.kind || null };
  if (useDb()) {
    await init();
    await db.query('INSERT INTO promo_events (campaign, event, name, email, phone, kind) VALUES ($1,$2,$3,$4,$5,$6)', [row.campaign, row.event, row.name, row.email, row.phone, row.kind]);
  } else {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify([{ ts: new Date().toISOString(), ...row }, ...readFile()].slice(0, 20000)));
  }
}

async function summary(campaign = 'shopier') {
  let rows;
  if (useDb()) {
    await init();
    rows = await db.query('SELECT ts, event, name, email, phone, kind FROM promo_events WHERE campaign = $1 ORDER BY ts DESC LIMIT 20000', [campaign]);
  } else rows = readFile().filter((r) => r.campaign === campaign);
  const week = Date.now() - 7 * 864e5;
  const counts = Object.fromEntries(EVENTS.map((e) => [e, { all: 0, week: 0 }]));
  for (const r of rows) { const c = counts[r.event]; if (!c) continue; c.all++; if (new Date(r.ts).getTime() >= week) c.week++; }
  const leads = rows.filter((r) => r.event === 'lead').slice(0, 300).map((r) => ({ ts: r.ts, name: r.name, email: r.email, phone: r.phone, kind: r.kind }));
  return { counts, leads, storage: useDb() ? 'db' : 'file' };
}

module.exports = { record, summary };
