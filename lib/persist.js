// Railway'de disk kalıcı değil: her yayında data/ klasörü git'teki haline döner.
// Gelen mesajlar ve panelden yüklenen görseller bu yüzden PostgreSQL'e de yazılır; açılışta diskte yoksa geri yüklenir.
// Panelden kaydedilen içerik de yazılır; git'teki içerikle çakışma kuralı restore() içinde.
const fs = require('fs');
const path = require('path');
const db = require('./db');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const queues = new Map();
let ready = null;

const on = () => Boolean(db.getPool());
function init() {
  if (!ready) ready = db.query('CREATE TABLE IF NOT EXISTS kalici_dosyalar (name TEXT PRIMARY KEY, data BYTEA NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())').catch((e) => { ready = null; throw e; });
  return ready;
}
// Aynı dosyanın yazımları sırayla gider (eski sürüm yenisinin üstüne yazılmasın)
function queue(name, job) {
  const next = (queues.get(name) || Promise.resolve()).then(job, job).catch((e) => console.warn(`Kalıcı kayıt hatası (${name}):`, e.message));
  queues.set(name, next);
  return next;
}
function save(name, buf) {
  if (!on()) return Promise.resolve();
  return queue(name, async () => {
    await init();
    await db.query('INSERT INTO kalici_dosyalar (name, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (name) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()', [name, buf]);
  });
}
function remove(name) {
  if (!on()) return Promise.resolve();
  return queue(name, async () => { await init(); await db.query('DELETE FROM kalici_dosyalar WHERE name = $1', [name]); });
}
// Açılışta: veritabanındaki dosyalardan diskte olmayanları (ya da mesajlar gibi her zaman veritabanı daha yeni olanları) yaz
async function restore() {
  if (!on()) return;
  try {
    await init();
    const rows = await db.query('SELECT name, data, updated_at FROM kalici_dosyalar');
    let n = 0;
    // Panelden kaydedilmiş içerik: git'teki içerik o kayıttan beri değişmediyse panel sürümü geri gelir.
    // Değiştiyse (yeni içerik yayına alındıysa) git kazanır, panel sürümü Yedekler'e konur, kaybolmaz.
    const content = rows.find((r) => r.name === 'content.json');
    const base = rows.find((r) => r.name === 'content.base');
    if (content) {
      const gitHash = require('./content').gitHash();
      if (base && String(base.data) === gitHash) {
        fs.writeFileSync(path.join(DATA_DIR, 'content.json'), content.data);
        console.log('Kalıcı kayıt: panelden kaydedilen içerik geri yüklendi');
      } else {
        const bname = `content-${new Date(content.updated_at).toISOString().replace(/[:.]/g, '-')}.json`;
        fs.mkdirSync(path.join(DATA_DIR, 'backups'), { recursive: true });
        fs.writeFileSync(path.join(DATA_DIR, 'backups', bname), content.data);
        await db.query("INSERT INTO kalici_dosyalar (name, data) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING", [`backups/${bname}`, content.data]);
        await db.query("DELETE FROM kalici_dosyalar WHERE name IN ('content.json', 'content.base')");
        console.log(`Kalıcı kayıt: git'teki içerik yeni, panel sürümü yedeğe kondu (${bname})`);
      }
    }
    for (const r of rows) {
      if (r.name === 'content.json' || r.name === 'content.base') continue;
      const file = path.join(DATA_DIR, r.name);
      if (!file.startsWith(DATA_DIR + path.sep)) continue;
      if (r.name !== 'messages.json' && fs.existsSync(file)) continue;
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, r.data);
      n++;
    }
    console.log(`Kalıcı kayıt: ${n} dosya veritabanından geri yüklendi`);
  } catch (e) {
    console.error('Kalıcı kayıt geri yüklenemedi:', e.message);
  }
}

module.exports = { save, remove, restore };
