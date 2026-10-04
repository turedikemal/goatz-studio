const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const DEFAULTS = require('./default-content');
const persist = require('./persist');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const CONTENT_FILE = path.join(DATA_DIR, 'content.json');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const { conform, resolvePages } = require('./schema');

// Sayfalara geçerli kimlik ve benzersiz adres verir.
const withPages = (c) => { c.pages = resolvePages(c.pages); return c; };

for (const dir of [DATA_DIR, UPLOAD_DIR, BACKUP_DIR]) fs.mkdirSync(dir, { recursive: true });
// Yayındaki (git'ten gelen) içeriğin özeti: panelden kaydedilen içerik hangi sürümün üstüne yapıldı, açılışta buna bakılır (lib/persist.js)
const hashOf = (buf) => crypto.createHash('sha1').update(buf).digest('hex');
let GIT_HASH = '';
try { GIT_HASH = hashOf(fs.readFileSync(CONTENT_FILE)); } catch { /* dosya yoksa varsayılan içerik */ }

function load() {
  try {
    return withPages(conform(DEFAULTS, JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf8'))));
  } catch {
    return withPages(structuredClone(DEFAULTS));
  }
}

function save(raw) {
  const clean = withPages(conform(DEFAULTS, raw));
  if (fs.existsSync(CONTENT_FILE)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const bname = `content-${stamp}.json`;
    fs.copyFileSync(CONTENT_FILE, path.join(BACKUP_DIR, bname));
    persist.save(`backups/${bname}`, fs.readFileSync(path.join(BACKUP_DIR, bname)));
    // En yeni 30 yedeği tut.
    const backups = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith('.json')).sort();
    for (const old of backups.slice(0, -30)) { fs.unlinkSync(path.join(BACKUP_DIR, old)); persist.remove(`backups/${old}`); }
  }
  const tmp = `${CONTENT_FILE}.tmp`;
  const buf = Buffer.from(JSON.stringify(clean, null, 2));
  fs.writeFileSync(tmp, buf);
  fs.renameSync(tmp, CONTENT_FILE);
  // Panelden kaydedilen içerik veritabanına da gider; hangi git sürümünün üstüne yapıldığı da yazılır
  persist.save('content.base', Buffer.from(GIT_HASH));
  persist.save('content.json', buf);
  return clean;
}

function listBackups() {
  return fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith('.json')).sort().reverse();
}

function readBackup(name) {
  if (!/^content-[0-9TZ-]+\.json$/.test(name)) return null;
  const file = path.join(BACKUP_DIR, name);
  if (!fs.existsSync(file)) return null;
  return withPages(conform(DEFAULTS, JSON.parse(fs.readFileSync(file, 'utf8'))));
}

module.exports = { gitHash: () => GIT_HASH, DEFAULTS, DATA_DIR, UPLOAD_DIR, conform, load, save, listBackups, readBackup };
