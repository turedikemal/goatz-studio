const fs = require('fs');
const path = require('path');
const DEFAULTS = require('./default-content');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const CONTENT_FILE = path.join(DATA_DIR, 'content.json');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const { conform, resolvePages } = require('./schema');

// Sayfalara geçerli kimlik ve benzersiz adres verir.
const withPages = (c) => { c.pages = resolvePages(c.pages); return c; };

for (const dir of [DATA_DIR, UPLOAD_DIR, BACKUP_DIR]) fs.mkdirSync(dir, { recursive: true });

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
    fs.copyFileSync(CONTENT_FILE, path.join(BACKUP_DIR, `content-${stamp}.json`));
    // En yeni 30 yedeği tut.
    const backups = fs.readdirSync(BACKUP_DIR).filter((f) => f.endsWith('.json')).sort();
    for (const old of backups.slice(0, -30)) fs.unlinkSync(path.join(BACKUP_DIR, old));
  }
  const tmp = `${CONTENT_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(clean, null, 2));
  fs.renameSync(tmp, CONTENT_FILE);
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

module.exports = { DEFAULTS, DATA_DIR, UPLOAD_DIR, conform, load, save, listBackups, readBackup };
