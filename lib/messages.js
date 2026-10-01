// İletişim formundan gelen mesajlar (data/messages.json).
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const FILE = path.join(process.env.DATA_DIR || path.join(__dirname, '..', 'data'), 'messages.json');
const MAX_KEPT = 500;

function list() {
  try { const d = JSON.parse(fs.readFileSync(FILE, 'utf8')); return Array.isArray(d) ? d : []; } catch { return []; }
}
function write(items) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(items, null, 2));
}
const clean = (v, max) => String(v || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, max);

function add(body) {
  const m = {
    id: crypto.randomBytes(6).toString('hex'),
    date: new Date().toISOString(),
    name: clean(body.name, 120),
    email: clean(body.email, 160),
    phone: clean(body.phone, 40),
    message: clean(body.message, 12000),
    read: false,
  };
  if (m.name.length < 2) throw Object.assign(new Error('Lütfen adını yaz.'), { status: 400 });
  if (!/^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(m.email)) throw Object.assign(new Error('E-posta adresi geçersiz.'), { status: 400 });
  if (m.message.length < 5) throw Object.assign(new Error('Lütfen mesajını yaz.'), { status: 400 });
  write([m, ...list()].slice(0, MAX_KEPT));
  return m;
}
function get(id) { return list().find((m) => m.id === id) || null; }
function addReply(id, text) {
  write(list().map((m) => (m.id === id ? { ...m, read: true, replies: [...(m.replies || []), { date: new Date().toISOString(), text: clean(text, 4000) }] } : m)));
}
function markRead(id) { write(list().map((m) => (m.id === id ? { ...m, read: true } : m))); }
function remove(id) { write(list().filter((m) => m.id !== id)); }

module.exports = { list, get, add, addReply, markRead, remove };
