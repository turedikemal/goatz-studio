// Panel ana sayfası (Dashboard): e-ticaret özeti. Yalnız veritabanındaki gerçek siparişlerden hesaplanır.
// Veritabanı yoksa db:false döner ve panel bunu açıkça söyler.
const db = require('./db');

const DAY = 864e5, HOUR = 36e5;
const TR_OFFSET = 3 * HOUR; // Türkiye saati (UTC+3, yaz saati yok)
const startOfTrDay = (t) => Math.floor((t + TR_OFFSET) / DAY) * DAY - TR_OFFSET;
const DONE = ['cancelled', 'returned']; // ciroya sayılmaz
const LOW_STOCK = 5; // "az kalan" eşiği (panelde yazılı)

function range(period, now = Date.now()) {
  const today = startOfTrDay(now);
  if (period === 'today') return { from: today, prevFrom: today - DAY, to: now, step: HOUR, buckets: 24 };
  const days = period === '30' ? 30 : 7;
  const from = today - (days - 1) * DAY;
  return { from, prevFrom: from - days * DAY, to: now, step: DAY, buckets: days };
}

async function summary(period = '7', demo = false) {
  if (!['today', '7', '30'].includes(period)) period = '7';
  const r = range(period);
  const out = { period, demo, db: Boolean(db.getPool()), lowStock: LOW_STOCK };
  if (!out.db) return out;
  // Örnek veri gerçek veriye karışmaz: ya yalnız örnek ya yalnız gerçek kayıtlar sayılır (sabit SQL parçası, kullanıcı girdisi değil)
  const DO = demo ? 'o.demo' : 'NOT o.demo', DP = demo ? 'p.demo' : 'NOT p.demo', DC = demo ? 'demo' : 'NOT demo';
  const F = new Date(r.from), P = new Date(r.prevFrom), T = new Date(r.to);
  try {
    const [rows, prev, units, prevUnits, customers, prevCustomers, open, pay, top, stock, returns, recent, products] = await Promise.all([
      db.queryAll(`SELECT created_at, total, status, channel FROM orders o WHERE ${DO} AND created_at >= $1 AND created_at < $2`, [F, T]),
      db.queryOne(`SELECT COUNT(*)::int AS count, COALESCE(SUM(total), 0) AS revenue FROM orders o
        WHERE ${DO} AND created_at >= $1 AND created_at < $2 AND NOT (status = ANY($3::text[]))`, [P, F, DONE]),
      db.queryOne(`SELECT COALESCE(SUM(i.quantity), 0)::int AS n FROM order_items i JOIN orders o ON o.id = i.order_id
        WHERE ${DO} AND o.created_at >= $1 AND o.created_at < $2 AND NOT (o.status = ANY($3::text[]))`, [F, T, DONE]),
      db.queryOne(`SELECT COALESCE(SUM(i.quantity), 0)::int AS n FROM order_items i JOIN orders o ON o.id = i.order_id
        WHERE ${DO} AND o.created_at >= $1 AND o.created_at < $2 AND NOT (o.status = ANY($3::text[]))`, [P, F, DONE]),
      db.queryOne(`SELECT COUNT(*)::int AS n FROM customers WHERE ${DC} AND created_at >= $1 AND created_at < $2`, [F, T]),
      db.queryOne(`SELECT COUNT(*)::int AS n FROM customers WHERE ${DC} AND created_at >= $1 AND created_at < $2`, [P, F]),
      // Açık siparişlerin şu anki durumu (döneme bağlı değil)
      db.queryAll(`SELECT status, COUNT(*)::int AS n FROM orders o WHERE ${DO} AND status IN ('received', 'preparing', 'ready', 'shipped') GROUP BY status`),
      db.queryAll(`SELECT payment_status, COUNT(*)::int AS n, COALESCE(SUM(total), 0) AS sum FROM orders o
        WHERE ${DO} AND NOT (status = ANY($1::text[])) AND payment_status IN ('pending', 'partial', 'failed') GROUP BY payment_status`, [DONE]),
      db.queryAll(`SELECT i.product_id, MIN(i.name) AS name, SUM(i.quantity)::int AS qty, COALESCE(SUM(i.line_total), 0) AS revenue
        FROM order_items i JOIN orders o ON o.id = i.order_id
        WHERE ${DO} AND o.created_at >= $1 AND o.created_at < $2 AND NOT (o.status = ANY($3::text[]))
        GROUP BY i.product_id, CASE WHEN i.product_id IS NULL THEN i.name END ORDER BY qty DESC, revenue DESC LIMIT 5`, [F, T, DONE]),
      // Aktif ürünlerde tüm depoların toplamı eşik ve altı olan varyantlar
      db.queryAll(`SELECT p.id AS product_id, p.name AS product_name, v.name AS variant_name, v.sku, COALESCE(SUM(s.quantity), 0)::int AS qty
        FROM product_variants v JOIN products p ON p.id = v.product_id LEFT JOIN stock s ON s.variant_id = v.id
        WHERE ${DP} AND p.status = 'active' AND v.is_active
        GROUP BY p.id, p.name, v.id, v.name, v.sku HAVING COALESCE(SUM(s.quantity), 0) <= $1
        ORDER BY qty, p.name LIMIT 50`, [LOW_STOCK]),
      db.queryOne(`SELECT COUNT(*)::int AS n FROM order_returns r JOIN orders o ON o.id = r.order_id WHERE ${DO} AND r.status IN ('requested', 'approved', 'received')`),
      db.queryAll(`SELECT o.id, o.order_no, o.created_at, o.customer_name, o.channel, o.status, o.payment_status, o.total,
          (SELECT COALESCE(SUM(quantity), 0) FROM order_items i WHERE i.order_id = o.id)::int AS item_count
        FROM orders o WHERE ${DO} ORDER BY o.created_at DESC, o.id DESC LIMIT 6`),
      db.queryOne(`SELECT COUNT(*) FILTER (WHERE status = 'active')::int AS active, COUNT(*)::int AS total FROM products p WHERE ${DP}`),
    ]);

    // Dönem içi: ciro, sipariş, iptal/iade, kanal, günlük/saatlik seri
    const series = Array.from({ length: r.buckets }, (_, i) => ({ t: new Date(r.from + i * r.step).toISOString(), revenue: 0, orders: 0 }));
    const channels = {};
    let revenue = 0, count = 0, cancelled = 0;
    for (const o of rows) {
      if (DONE.includes(o.status)) { cancelled++; continue; }
      const total = Number(o.total) || 0;
      revenue += total; count++;
      const i = Math.floor((new Date(o.created_at).getTime() - r.from) / r.step);
      if (series[i]) { series[i].revenue += total; series[i].orders++; }
      const c = channels[o.channel || 'manual'] || (channels[o.channel || 'manual'] = { orders: 0, revenue: 0 });
      c.orders++; c.revenue += total;
    }
    Object.assign(out, {
      revenue, count, cancelled, prevRevenue: Number(prev.revenue), prevCount: prev.count,
      units: units.n, prevUnits: prevUnits.n, customers: customers.n, prevCustomers: prevCustomers.n,
      series, channels: Object.entries(channels).map(([k, v]) => ({ channel: k, ...v })).sort((a, b) => b.revenue - a.revenue),
      open: Object.fromEntries(open.map((x) => [x.status, x.n])),
      unpaid: pay.map((x) => ({ status: x.payment_status, n: x.n, sum: Number(x.sum) })),
      top: top.map((x) => ({ ...x, revenue: Number(x.revenue) })),
      stock, returns: returns.n, recent, products,
    });
  } catch (e) { out.error = 'Sipariş verisi okunamadı: ' + e.message; }
  return out;
}

// Grafik için serbest aralık: from/to (YYYY-AA-GG, Türkiye günü, ikisi dahil) ve adım (saat/gün/hafta/ay)
const STEPS = ['hour', 'day', 'week', 'month'];
const MAX_BUCKETS = 400;
function trDay(str) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(str || ''));
  return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) - TR_OFFSET : null;
}
function bucketStarts(from, end, step) {
  const out = [];
  let t = from;
  if (step === 'week') { const wd = (new Date(t + TR_OFFSET).getUTCDay() + 6) % 7; t -= wd * DAY; } // hafta pazartesi başlar
  if (step === 'month') { const d = new Date(t + TR_OFFSET); t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) - TR_OFFSET; }
  while (t < end && out.length <= MAX_BUCKETS) {
    out.push(t);
    if (step === 'hour') t += HOUR;
    else if (step === 'day') t += DAY;
    else if (step === 'week') t += 7 * DAY;
    else { const d = new Date(t + TR_OFFSET); t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1) - TR_OFFSET; }
  }
  return out;
}
async function series({ from, to, step = 'day' } = {}, demo = false) {
  if (!db.getPool()) return { db: false };
  if (!STEPS.includes(step)) step = 'day';
  const f = trDay(from), t0 = trDay(to);
  if (f == null || t0 == null || t0 < f) throw Object.assign(new Error('Geçerli bir tarih aralığı seç.'), { status: 400 });
  const end = Math.min(t0 + DAY, Date.now());
  const starts = bucketStarts(f, end, step);
  if (starts.length > MAX_BUCKETS) throw Object.assign(new Error('Bu aralık için çok fazla sütun çıkıyor; daha geniş bir adım seç (örn. günlük yerine haftalık).'), { status: 400 });
  const DO = demo ? 'o.demo' : 'NOT o.demo';
  const rows = await db.queryAll(`SELECT created_at, total, status FROM orders o WHERE ${DO} AND created_at >= $1 AND created_at < $2`, [new Date(starts[0] ?? f), new Date(end)]);
  const out = starts.map((x) => ({ t: new Date(x).toISOString(), revenue: 0, orders: 0 }));
  let cancelled = 0;
  for (const o of rows) {
    if (DONE.includes(o.status)) { cancelled++; continue; }
    const ts = new Date(o.created_at).getTime();
    let i = starts.length - 1; while (i > 0 && starts[i] > ts) i--;
    out[i].revenue += Number(o.total) || 0; out[i].orders++;
  }
  return { db: true, step, from, to, series: out, cancelled };
}

module.exports = { summary, series };
