// Terk edilen siparişler: (1) sepette bırakılanlar (abandoned_carts), (2) ödemesi tamamlanmayan siparişler.
// Mağaza ödeme adımı henüz yok; sepet kayıtları şimdilik yalnız örnek veriden gelir. Ödeme adımı gelince
// sepet/ödeme sayfası buraya kayıt açacak, "sepette ürün bıraktınız" otomasyonu reminder_* alanlarını kullanacak.
const db = require('./db');

const STAGES = ['cart', 'checkout', 'payment'];
const STATUSES = ['open', 'recovered', 'dismissed'];
const OPEN_ORDER = `NOT (o.status = ANY(ARRAY['cancelled','returned'])) AND o.payment_status IN ('pending', 'failed')`;
const demoSql = (f, col) => (f.demo === '1' ? col : 'NOT ' + col);
const bad = (msg) => Object.assign(new Error(msg), { status: 400 });

async function list(f = {}) {
  if (!db.getPool()) return { db: false, carts: [], unpaid: [], counts: {} };
  const status = STATUSES.includes(f.status) ? f.status : 'open';
  const [carts, unpaid, counts] = await Promise.all([
    db.queryAll(`SELECT a.*, o.order_no AS recovered_order_no FROM abandoned_carts a LEFT JOIN orders o ON o.id = a.recovered_order_id
      WHERE ${demoSql(f, 'a.demo')} AND a.status = $1 ORDER BY a.updated_at DESC, a.id DESC LIMIT 200`, [status]),
    db.queryAll(`SELECT o.id, o.order_no, o.created_at, o.customer_name, o.customer_email, o.customer_phone, o.channel, o.status,
        o.payment_status, o.payment_method, o.total, o.demo,
        (SELECT COALESCE(SUM(quantity), 0) FROM order_items i WHERE i.order_id = o.id)::int AS item_count
      FROM orders o WHERE ${demoSql(f, 'o.demo')} AND ${OPEN_ORDER} ORDER BY o.created_at DESC LIMIT 200`),
    db.queryOne(`SELECT
        (SELECT COUNT(*) FROM abandoned_carts a WHERE ${demoSql(f, 'a.demo')} AND status = 'open')::int AS open,
        (SELECT COUNT(*) FROM abandoned_carts a WHERE ${demoSql(f, 'a.demo')} AND status = 'recovered')::int AS recovered,
        (SELECT COUNT(*) FROM abandoned_carts a WHERE ${demoSql(f, 'a.demo')} AND status = 'dismissed')::int AS dismissed,
        (SELECT COALESCE(SUM(total), 0) FROM abandoned_carts a WHERE ${demoSql(f, 'a.demo')} AND status = 'open') AS open_total,
        (SELECT COUNT(*) FROM orders o WHERE ${demoSql(f, 'o.demo')} AND ${OPEN_ORDER})::int AS unpaid`),
  ]);
  return {
    db: true, status,
    carts: carts.map((c) => ({ ...c, total: Number(c.total) })),
    unpaid: unpaid.map((o) => ({ ...o, total: Number(o.total) })),
    counts: { ...counts, open_total: Number(counts.open_total) },
  };
}

async function update(id, body = {}) {
  const status = String(body.status || '');
  if (!STATUSES.includes(status)) throw bad('Geçersiz durum.');
  const row = await db.queryOne('UPDATE abandoned_carts SET status = $2 WHERE id = $1 RETURNING *', [id, status]);
  if (!row) throw Object.assign(new Error('Kayıt bulunamadı.'), { status: 404 });
  return row;
}

async function remove(id) {
  await db.query('DELETE FROM abandoned_carts WHERE id = $1', [id]);
}

module.exports = { STAGES, STATUSES, list, update, remove };
