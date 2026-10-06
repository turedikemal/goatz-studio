// Panel ana sayfası (Dashboard) özeti: yalnız gerçekten tutulan veriden hesaplanır.
// Siparişler/ürünler PostgreSQL'de; veritabanı yoksa o kısımlar null döner ve panel bunu açıkça söyler.
const db = require('./db');
const messages = require('./messages');
const promo = require('./promo');

const DAY = 864e5;
const TR_OFFSET = 3 * 36e5; // Türkiye saati (UTC+3, yaz saati yok)
const startOfTrDay = (t) => Math.floor((t + TR_OFFSET) / DAY) * DAY - TR_OFFSET;
const DONE = ['cancelled', 'returned']; // ciroya sayılmaz

// Gelen mesajın türü, mesajın ilk satırından anlaşılır (sihirbaz, sepet ve form ayrı başlıkla yazar).
function kindOf(m) {
  const t = m.message || '';
  if (/^TEKLİF TALEBİ/.test(t)) return 'teklif';
  if (/^YARIM KALAN/.test(t)) return 'yarim';
  if (/^FİYAT TALEBİ/.test(t)) return 'fiyat';
  return 'mesaj';
}

function range(period, now = Date.now()) {
  const today = startOfTrDay(now);
  if (period === 'today') return { from: today, prevFrom: today - DAY, to: now };
  const days = period === '30' ? 30 : 7;
  const from = today - (days - 1) * DAY;
  return { from, prevFrom: from - days * DAY, to: now };
}

async function orders(r) {
  const sum = (from, to) => db.queryOne(
    `SELECT COUNT(*)::int AS count, COALESCE(SUM(total), 0) AS revenue,
            COUNT(*) FILTER (WHERE status = ANY($3::text[]))::int AS cancelled
       FROM orders WHERE created_at >= $1 AND created_at < $2`,
    [new Date(from), new Date(to), DONE]);
  const net = (from, to) => db.queryOne(
    `SELECT COUNT(*)::int AS count, COALESCE(SUM(total), 0) AS revenue
       FROM orders WHERE created_at >= $1 AND created_at < $2 AND NOT (status = ANY($3::text[]))`,
    [new Date(from), new Date(to), DONE]);
  const [cur, prev, all, todo, recent, ret, products, stockOut] = await Promise.all([
    net(r.from, r.to),
    net(r.prevFrom, r.from),
    sum(r.from, r.to),
    db.queryOne(`SELECT
        COUNT(*) FILTER (WHERE status = 'received')::int AS received,
        COUNT(*) FILTER (WHERE status = 'preparing')::int AS preparing,
        COUNT(*) FILTER (WHERE status = 'ready')::int AS ready,
        COUNT(*) FILTER (WHERE payment_status IN ('pending', 'partial', 'failed') AND NOT (status = ANY($1::text[])))::int AS unpaid
      FROM orders`, [DONE]),
    db.queryAll(`SELECT o.id, o.order_no, o.created_at, o.customer_name, o.channel, o.status, o.payment_status, o.total,
        (SELECT COALESCE(SUM(quantity), 0) FROM order_items i WHERE i.order_id = o.id)::int AS item_count
      FROM orders o ORDER BY o.created_at DESC, o.id DESC LIMIT 6`),
    db.queryOne(`SELECT COUNT(*)::int AS open FROM order_returns WHERE status IN ('requested', 'approved', 'received')`),
    db.queryOne(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'active')::int AS active,
        COUNT(*) FILTER (WHERE status = 'draft')::int AS draft FROM products`),
    // Aktif üründe, tüm depolardaki toplamı 0 olan varyantlar
    db.queryAll(`SELECT p.id AS product_id, p.name AS product_name, v.name AS variant_name, v.sku
      FROM product_variants v JOIN products p ON p.id = v.product_id
      LEFT JOIN stock s ON s.variant_id = v.id
      WHERE p.status = 'active' AND v.is_active
      GROUP BY p.id, p.name, v.id, v.name, v.sku HAVING COALESCE(SUM(s.quantity), 0) <= 0
      ORDER BY p.name, v.id LIMIT 50`),
  ]);
  return {
    count: cur.count, revenue: Number(cur.revenue), prevCount: prev.count, prevRevenue: Number(prev.revenue),
    cancelled: all.cancelled, todo: { ...todo, returns: ret.open }, recent, products, stockOut,
  };
}

async function summary(period = '7') {
  const r = range(period);
  const out = { period, from: new Date(r.from).toISOString(), db: Boolean(db.getPool()), orders: null, ordersError: null };
  if (out.db) {
    try { out.orders = await orders(r); } catch (e) { out.ordersError = 'Sipariş verisi okunamadı: ' + e.message; }
  }
  const list = messages.list();
  const inRange = (m, from, to) => { const t = new Date(m.date).getTime(); return t >= from && t < to; };
  const kinds = { teklif: 0, fiyat: 0, yarim: 0, mesaj: 0 };
  let prevLeads = 0;
  for (const m of list) {
    if (inRange(m, r.from, r.to)) kinds[kindOf(m)]++;
    else if (inRange(m, r.prevFrom, r.from) && kindOf(m) !== 'yarim') prevLeads++;
  }
  out.messages = {
    unread: list.filter((m) => !m.read).length, kinds, prevLeads,
    recent: list.slice(0, 6).map((m) => ({ id: m.id, date: m.date, name: m.name, kind: kindOf(m), read: !!m.read, campaign: m.campaign || '' })),
  };
  try { out.promo = (await promo.summary()).counts; } catch { out.promo = null; }
  return out;
}

module.exports = { summary };
