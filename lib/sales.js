// Müşteriler, indirimler ve siparişler için iş mantığı.
const db = require('./db');
const { query, queryOne, queryAll, insert, update, withTx, num, idOrNull, txt } = db;

const bad = (msg, status = 400) => Object.assign(new Error(msg), { status });
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const int = (v) => { const n = parseInt(v, 10); return Number.isNaN(n) ? null : n; };
const dateOrNull = (v) => (v ? new Date(v) : null);

const ORDER_STATUSES = {
  received: 'Sipariş alındı', preparing: 'Hazırlanıyor', ready: 'Kargoya hazır', shipped: 'Gönderildi',
  delivered: 'Teslim edildi', cancelled: 'İptal edildi', returned: 'İade edildi',
};
const PAYMENT_STATUSES = { pending: 'Bekliyor', paid: 'Ödendi', partial: 'Kısmi ödeme', refunded: 'İade edildi', failed: 'Başarısız' };
const TRANSITIONS = {
  received: ['preparing', 'cancelled'],
  preparing: ['ready', 'received', 'cancelled'],
  ready: ['shipped', 'preparing', 'cancelled'],
  shipped: ['delivered', 'ready'],
  delivered: ['returned'],
  cancelled: [],
  returned: [],
};
const RETURN_TRANSITIONS = { requested: ['approved', 'rejected'], approved: ['received', 'rejected'], received: ['refunded'], refunded: [], rejected: [] };

// ===================================================================
//  Müşteri etiketleri
// ===================================================================
const listTags = () => queryAll('SELECT t.*, (SELECT COUNT(*) FROM customers c WHERE t.name = ANY(c.tags))::int AS customer_count FROM customer_tags t ORDER BY t.name');
async function createTag(d) {
  const name = txt(d.name);
  if (!name) throw bad('Etiket adı gerekli.');
  return insert('customer_tags', { name, color: txt(d.color) || '#e9ccff' });
}
async function updateTag(id, d) {
  const old = await queryOne('SELECT * FROM customer_tags WHERE id = $1', [id]);
  if (!old) throw bad('Etiket bulunamadı.', 404);
  const name = txt(d.name) || old.name;
  return withTx(async () => {
    const row = await queryOne('UPDATE customer_tags SET name = $1, color = $2 WHERE id = $3 RETURNING *', [name, txt(d.color) || old.color, id]);
    if (name !== old.name) await query('UPDATE customers SET tags = array_replace(tags, $1, $2)', [old.name, name]);
    return row;
  });
}
async function deleteTag(id) {
  const old = await queryOne('SELECT * FROM customer_tags WHERE id = $1', [id]);
  if (!old) return;
  await withTx(async () => {
    await query('UPDATE customers SET tags = array_remove(tags, $1)', [old.name]);
    await query('DELETE FROM customer_tags WHERE id = $1', [id]);
  });
}

// ===================================================================
//  Müşteriler
// ===================================================================
function cleanAddress(a) {
  const g = (k) => String(a[k] ?? '').trim();
  return { title: g('title'), fullName: g('fullName'), phone: g('phone'), city: g('city'), district: g('district'), address: g('address'), postalCode: g('postalCode') };
}
function customerRow(d) {
  const firstName = txt(d.firstName);
  if (!firstName) throw bad('Müşteri adı gerekli.');
  const email = txt(d.email) ? txt(d.email).toLowerCase() : null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw bad('E-posta adresi geçersiz.');
  return {
    first_name: firstName, last_name: txt(d.lastName), email, phone: txt(d.phone), company: txt(d.company), tax_no: txt(d.taxNo), tax_office: txt(d.taxOffice),
    tags: Array.isArray(d.tags) ? [...new Set(d.tags.map((t) => String(t).trim()).filter(Boolean))] : [],
    notes: txt(d.notes), accepts_marketing: Boolean(d.acceptsMarketing),
    addresses: JSON.stringify(Array.isArray(d.addresses) ? d.addresses.map(cleanAddress).filter((a) => a.address || a.city || a.fullName) : []),
  };
}
const CUSTOMER_SELECT = `SELECT c.*, COALESCE(o.cnt, 0)::int AS order_count, COALESCE(o.spent, 0) AS total_spent, o.last_order
  FROM customers c LEFT JOIN (
    SELECT customer_id, COUNT(*) AS cnt, SUM(total) FILTER (WHERE status NOT IN ('cancelled', 'returned') AND payment_status <> 'refunded') AS spent, MAX(created_at) AS last_order
    FROM orders WHERE customer_id IS NOT NULL GROUP BY customer_id) o ON o.customer_id = c.id`;
async function listCustomers({ q, tag, segment } = {}) {
  const where = []; const p = [];
  if (q) { p.push(`%${q}%`); where.push(`(c.first_name || ' ' || COALESCE(c.last_name, '') || ' ' || COALESCE(c.email, '') || ' ' || COALESCE(c.phone, '') || ' ' || COALESCE(c.company, '')) ILIKE $${p.length}`); }
  if (tag) { p.push(tag); where.push(`$${p.length} = ANY(c.tags)`); }
  if (segment === 'buyers') where.push('COALESCE(o.cnt, 0) > 0');
  if (segment === 'new') where.push('COALESCE(o.cnt, 0) = 0');
  if (segment === 'repeat') where.push('COALESCE(o.cnt, 0) > 1');
  if (segment === 'marketing') where.push('c.accepts_marketing = true');
  return queryAll(`${CUSTOMER_SELECT} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY c.created_at DESC LIMIT 1000`, p);
}
async function getCustomer(id) {
  const c = await queryOne(`${CUSTOMER_SELECT} WHERE c.id = $1`, [id]);
  if (!c) return null;
  c.orders = await queryAll('SELECT id, order_no, created_at, status, payment_status, total FROM orders WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 100', [id]);
  return c;
}
async function createCustomer(d) {
  const row = customerRow(d);
  const created = await insert('customers', row);
  return getCustomer(created.id);
}
async function updateCustomer(id, d) {
  await update('customers', id, customerRow(d));
  return getCustomer(id);
}
async function deleteCustomer(id) { await query('DELETE FROM customers WHERE id = $1', [id]); }

// ===================================================================
//  Kuponlar ve kampanyalar
// ===================================================================
function couponRow(d) {
  const code = String(d.code || '').trim().toUpperCase().replace(/\s+/g, '');
  if (!code) throw bad('Kupon kodu gerekli.');
  const type = ['percent', 'fixed', 'free_shipping'].includes(d.type) ? d.type : 'percent';
  const value = num(d.value) || 0;
  if (type !== 'free_shipping' && value <= 0) throw bad('İndirim değeri 0’dan büyük olmalı.');
  if (type === 'percent' && value > 100) throw bad('Yüzde indirim en fazla 100 olabilir.');
  const starts = dateOrNull(d.startsAt), ends = dateOrNull(d.endsAt);
  if (starts && ends && ends < starts) throw bad('Bitiş tarihi başlangıçtan önce olamaz.');
  return { code, description: txt(d.description), type, value, min_order_total: num(d.minOrderTotal) || 0, max_uses: int(d.maxUses), starts_at: starts, ends_at: ends, is_active: d.isActive !== false };
}
const listCoupons = () => queryAll('SELECT * FROM coupons ORDER BY created_at DESC');
const createCoupon = (d) => insert('coupons', couponRow(d));
const updateCoupon = (id, d) => update('coupons', id, couponRow(d));
const deleteCoupon = (id) => query('DELETE FROM coupons WHERE id = $1', [id]);

function campaignRow(d) {
  const name = txt(d.name);
  if (!name) throw bad('Kampanya adı gerekli.');
  const type = d.type === 'fixed' ? 'fixed' : 'percent';
  const value = num(d.value) || 0;
  if (value <= 0) throw bad('İndirim değeri 0’dan büyük olmalı.');
  if (type === 'percent' && value > 100) throw bad('Yüzde indirim en fazla 100 olabilir.');
  const scope = ['all', 'category', 'product'].includes(d.scope) ? d.scope : 'all';
  const ids = Array.isArray(d.scopeIds) ? d.scopeIds.map(int).filter(Boolean) : [];
  if (scope !== 'all' && !ids.length) throw bad('Kampanyanın uygulanacağı kategori/ürünü seç.');
  const starts = dateOrNull(d.startsAt), ends = dateOrNull(d.endsAt);
  if (starts && ends && ends < starts) throw bad('Bitiş tarihi başlangıçtan önce olamaz.');
  return { name, description: txt(d.description), type, value, scope, scope_ids: scope === 'all' ? [] : ids, min_order_total: num(d.minOrderTotal) || 0, starts_at: starts, ends_at: ends, is_active: d.isActive !== false };
}
const listCampaigns = () => queryAll('SELECT * FROM campaigns ORDER BY created_at DESC');
const createCampaign = (d) => insert('campaigns', campaignRow(d));
const updateCampaign = (id, d) => update('campaigns', id, campaignRow(d));
const deleteCampaign = (id) => query('DELETE FROM campaigns WHERE id = $1', [id]);
const activeCampaigns = () => queryAll('SELECT * FROM campaigns WHERE is_active AND (starts_at IS NULL OR starts_at <= NOW()) AND (ends_at IS NULL OR ends_at >= NOW())');

// ===================================================================
//  Fiyatlama (kampanya + kupon). Fiyatlar KDV dahildir.
// ===================================================================
async function priceOrder(data) {
  const items = Array.isArray(data.items) ? data.items : [];
  if (!items.length) throw bad('Siparişe en az bir ürün ekle.');
  const lines = [];
  for (const it of items) {
    const qty = int(it.quantity);
    if (!qty || qty < 1) throw bad('Adet en az 1 olmalı.');
    const p = await queryOne('SELECT p.*, t.rate AS tax_rate FROM products p LEFT JOIN tax_rates t ON t.id = p.tax_rate_id WHERE p.id = $1', [int(it.productId)]);
    if (!p) throw bad('Ürün bulunamadı.', 404);
    const named = await queryOne('SELECT COUNT(*)::int AS n FROM product_variants WHERE product_id = $1 AND name IS NOT NULL', [p.id]);
    let v;
    if (int(it.variantId)) v = await queryOne('SELECT * FROM product_variants WHERE id = $1 AND product_id = $2', [int(it.variantId), p.id]);
    else if (named.n) throw bad(`"${p.name}" için varyant seçmelisin.`);
    else v = await queryOne('SELECT * FROM product_variants WHERE product_id = $1 ORDER BY id LIMIT 1', [p.id]);
    if (int(it.variantId) && !v) throw bad('Varyant bulunamadı.', 404);
    const base = v && v.sale_price != null ? v.sale_price : p.sale_price;
    const disc = v && v.sale_price != null ? (v.discount_price ?? null) : (v && v.discount_price != null ? v.discount_price : p.discount_price);
    const listPrice = disc != null && disc < base ? disc : base;
    const manual = it.unitPrice !== undefined && it.unitPrice !== '' && it.unitPrice !== null && num(it.unitPrice) !== null;
    lines.push({
      productId: p.id, variantId: v ? v.id : null, categoryId: p.category_id, name: p.name + (v && v.name ? ` — ${v.name}` : ''), sku: v ? v.sku : p.sku,
      quantity: qty, unit: r2(manual ? num(it.unitPrice) : listPrice), manual, taxRate: Number(p.tax_rate) || 0, campaignUnit: 0, campaignName: null,
    });
  }
  const subtotal = r2(lines.reduce((s, l) => s + l.unit * l.quantity, 0));

  for (const c of (await activeCampaigns()).filter((c) => Number(c.min_order_total) <= subtotal)) {
    for (const l of lines) {
      if (l.manual) continue;
      if (c.scope === 'category' && !c.scope_ids.includes(l.categoryId)) continue;
      if (c.scope === 'product' && !c.scope_ids.includes(l.productId)) continue;
      const amount = c.type === 'percent' ? r2(l.unit * Number(c.value) / 100) : Math.min(Number(c.value), l.unit);
      if (amount > l.campaignUnit) { l.campaignUnit = amount; l.campaignName = c.name; }
    }
  }
  for (const l of lines) l.lineTotal = r2((l.unit - l.campaignUnit) * l.quantity);
  const campaignTotal = r2(lines.reduce((s, l) => s + l.campaignUnit * l.quantity, 0));
  const afterCampaign = r2(subtotal - campaignTotal);

  let couponDiscount = 0, freeShipping = false, coupon = null;
  const code = String(data.couponCode || '').trim().toUpperCase().replace(/\s+/g, '');
  if (code) {
    coupon = await queryOne('SELECT * FROM coupons WHERE code = $1', [code]);
    if (!coupon) throw bad('Kupon kodu bulunamadı.', 404);
    if (!coupon.is_active) throw bad('Bu kupon aktif değil.');
    if (coupon.starts_at && new Date(coupon.starts_at) > new Date()) throw bad('Bu kupon henüz başlamadı.');
    if (coupon.ends_at && new Date(coupon.ends_at) < new Date()) throw bad('Bu kuponun süresi dolmuş.');
    if (coupon.max_uses != null && coupon.used_count >= coupon.max_uses) throw bad('Bu kuponun kullanım limiti dolmuş.');
    if (afterCampaign < Number(coupon.min_order_total)) throw bad(`Bu kupon için minimum sipariş tutarı ₺${coupon.min_order_total}.`);
    if (coupon.type === 'percent') couponDiscount = r2(afterCampaign * Number(coupon.value) / 100);
    else if (coupon.type === 'fixed') couponDiscount = r2(Math.min(Number(coupon.value), afterCampaign));
    else freeShipping = true;
  }
  const shippingTotal = freeShipping ? 0 : r2(num(data.shippingTotal) || 0);
  let taxTotal = 0;
  for (const l of lines) {
    const share = afterCampaign > 0 ? couponDiscount * l.lineTotal / afterCampaign : 0;
    taxTotal += (l.lineTotal - share) * l.taxRate / (100 + l.taxRate);
  }
  const discountTotal = r2(campaignTotal + couponDiscount);
  return {
    lines, subtotal, campaignTotal, couponDiscount, couponCode: coupon ? coupon.code : null, couponId: coupon ? coupon.id : null, freeShipping,
    shippingTotal, taxTotal: r2(taxTotal), discountTotal, total: r2(afterCampaign - couponDiscount + shippingTotal),
  };
}

// ===================================================================
//  Stok hareketleri
// ===================================================================
async function takeStock(variantId, qty, orderId, name, ignoreStock) {
  if (!variantId) return;
  const avail = (await queryOne('SELECT COALESCE(SUM(quantity), 0)::int AS n FROM stock WHERE variant_id = $1', [variantId])).n;
  if (avail < qty && !ignoreStock) throw bad(`"${name}" için yeterli stok yok (mevcut: ${avail}).`, 409);
  let left = qty;
  for (const s of await queryAll('SELECT * FROM stock WHERE variant_id = $1 AND quantity > 0 ORDER BY quantity DESC', [variantId])) {
    if (left <= 0) break;
    const take = Math.min(s.quantity, left);
    await query('UPDATE stock SET quantity = quantity - $1, updated_at = NOW() WHERE id = $2', [take, s.id]);
    await insert('stock_movements', { variant_id: variantId, warehouse_id: s.warehouse_id, quantity_change: -take, movement_type: 'order_out', reference_id: orderId, notes: 'Sipariş' });
    left -= take;
  }
  if (left > 0) {
    const w = await queryOne('SELECT id FROM warehouses ORDER BY is_default DESC, id LIMIT 1');
    if (!w) throw bad('Tanımlı depo yok.', 409);
    const ex = await queryOne('SELECT id FROM stock WHERE variant_id = $1 AND warehouse_id = $2', [variantId, w.id]);
    if (ex) await query('UPDATE stock SET quantity = quantity - $1 WHERE id = $2', [left, ex.id]);
    else await insert('stock', { variant_id: variantId, warehouse_id: w.id, quantity: -left });
    await insert('stock_movements', { variant_id: variantId, warehouse_id: w.id, quantity_change: -left, movement_type: 'order_out', reference_id: orderId, notes: 'Sipariş (stok yetersizdi)' });
  }
}
async function addStock(variantId, warehouseId, qty, type, orderId, note) {
  if (!variantId || !warehouseId || qty <= 0) return;
  const ex = await queryOne('SELECT id FROM stock WHERE variant_id = $1 AND warehouse_id = $2', [variantId, warehouseId]);
  if (ex) await query('UPDATE stock SET quantity = quantity + $1, updated_at = NOW() WHERE id = $2', [qty, ex.id]);
  else await insert('stock', { variant_id: variantId, warehouse_id: warehouseId, quantity: qty });
  await insert('stock_movements', { variant_id: variantId, warehouse_id: warehouseId, quantity_change: qty, movement_type: type, reference_id: orderId, notes: note });
}
async function restoreOrderStock(orderId) {
  const moves = await queryAll("SELECT variant_id, warehouse_id, SUM(-quantity_change)::int AS qty FROM stock_movements WHERE reference_id = $1 AND movement_type = 'order_out' GROUP BY variant_id, warehouse_id", [orderId]);
  for (const m of moves) await addStock(m.variant_id, m.warehouse_id, m.qty, 'order_in', orderId, 'Sipariş iptali');
}

// ===================================================================
//  Siparişler
// ===================================================================
const event = (orderId, type, message) => insert('order_events', { order_id: orderId, type, message });
function cleanShipping(a = {}) { return cleanAddress(a); }

async function resolveCustomer(d) {
  if (int(d.customerId)) {
    const c = await queryOne('SELECT * FROM customers WHERE id = $1', [int(d.customerId)]);
    if (!c) throw bad('Müşteri bulunamadı.', 404);
    return c;
  }
  const n = d.customer;
  if (n && (txt(n.firstName) || txt(n.email))) {
    const email = txt(n.email) ? txt(n.email).toLowerCase() : null;
    if (email) { const ex = await queryOne('SELECT * FROM customers WHERE LOWER(email) = $1', [email]); if (ex) return ex; }
    if (d.saveCustomer === false) return null;
    return insert('customers', customerRow({ ...n, firstName: n.firstName || email }));
  }
  return null;
}

async function createOrder(d) {
  const id = await withTx(async () => {
    const priced = await priceOrder(d);
    const customer = await resolveCustomer(d);
    const guest = d.customer || {};
    const name = customer ? [customer.first_name, customer.last_name].filter(Boolean).join(' ') : txt(guest.firstName) ? [guest.firstName, guest.lastName].filter(Boolean).join(' ') : 'Misafir';
    const payment = Object.keys(PAYMENT_STATUSES).includes(d.paymentStatus) ? d.paymentStatus : 'pending';
    const order = await insert('orders', {
      customer_id: customer ? customer.id : null, customer_name: name, customer_email: customer ? customer.email : txt(guest.email), customer_phone: customer ? customer.phone : txt(guest.phone),
      channel: txt(d.channel) || 'manual', status: 'received', payment_status: payment, payment_method: txt(d.paymentMethod),
      shipping_address: JSON.stringify(cleanShipping(d.shippingAddress)), subtotal: priced.subtotal, discount_total: priced.discountTotal, shipping_total: priced.shippingTotal,
      tax_total: priced.taxTotal, total: priced.total, coupon_code: priced.couponCode, notes: txt(d.notes),
    });
    for (const l of priced.lines) {
      await insert('order_items', {
        order_id: order.id, product_id: l.productId, variant_id: l.variantId, name: l.name, sku: l.sku, quantity: l.quantity, unit_price: l.unit,
        discount_unit: l.campaignUnit, campaign_name: l.campaignName, tax_rate: l.taxRate, line_total: l.lineTotal,
      });
      await takeStock(l.variantId, l.quantity, order.id, l.name, Boolean(d.ignoreStock));
    }
    if (priced.couponId) await query('UPDATE coupons SET used_count = used_count + 1 WHERE id = $1', [priced.couponId]);
    await event(order.id, 'created', `Sipariş oluşturuldu (${txt(d.channel) || 'manual'}).`);
    if (payment === 'paid') await event(order.id, 'payment', 'Ödeme alındı olarak işaretlendi.');
    return order.id;
  });
  return getOrder(id);
}

async function getOrder(id) {
  const o = await queryOne('SELECT * FROM orders WHERE id = $1', [id]);
  if (!o) return null;
  o.items = await queryAll('SELECT * FROM order_items WHERE order_id = $1 ORDER BY id', [id]);
  o.events = await queryAll('SELECT * FROM order_events WHERE order_id = $1 ORDER BY created_at DESC, id DESC', [id]);
  o.returns = await queryAll('SELECT * FROM order_returns WHERE order_id = $1 ORDER BY created_at DESC', [id]);
  return o;
}

async function listOrders(f = {}) {
  const where = []; const p = [];
  const add = (sql, v) => { p.push(v); where.push(sql.replace('?', `$${p.length}`)); };
  if (f.q) { p.push(`%${f.q}%`); where.push(`(o.order_no::text ILIKE $${p.length} OR o.customer_name ILIKE $${p.length} OR COALESCE(o.customer_email, '') ILIKE $${p.length} OR COALESCE(o.customer_phone, '') ILIKE $${p.length} OR COALESCE(o.tracking_no, '') ILIKE $${p.length})`); }
  if (f.status) { const list = String(f.status).split(',').filter(Boolean); p.push(list); where.push(`o.status = ANY($${p.length}::text[])`); }
  if (f.payment) { const list = String(f.payment).split(',').filter(Boolean); p.push(list); where.push(`o.payment_status = ANY($${p.length}::text[])`); }
  if (f.channel) add('o.channel = ?', f.channel);
  if (f.carrier) add('o.carrier = ?', f.carrier);
  if (f.from) add('o.created_at >= ?', new Date(f.from));
  if (f.to) add('o.created_at < ?', new Date(new Date(f.to).getTime() + 86400000));
  if (f.min) add('o.total >= ?', Number(f.min));
  if (f.max) add('o.total <= ?', Number(f.max));
  if (f.customerId) add('o.customer_id = ?', int(f.customerId));
  if (f.demo === '1') where.push('o.demo'); else if (f.demo === '0') where.push('NOT o.demo');
  const w = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const limit = Math.min(int(f.limit) || 50, 200), offset = Math.max(int(f.offset) || 0, 0);
  const rows = await queryAll(`SELECT o.*, (SELECT COALESCE(SUM(quantity), 0) FROM order_items i WHERE i.order_id = o.id)::int AS item_count FROM orders o ${w} ORDER BY o.created_at DESC, o.id DESC LIMIT ${limit} OFFSET ${offset}`, p);
  const agg = await queryOne(`SELECT COUNT(*)::int AS total, COALESCE(SUM(total), 0) AS sum FROM orders o ${w}`, p);
  return { rows, total: agg.total, sum: agg.sum };
}

async function setStatus(id, status) {
  return withTx(async () => {
    const o = await queryOne('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [id]);
    if (!o) throw bad('Sipariş bulunamadı.', 404);
    if (!ORDER_STATUSES[status]) throw bad('Geçersiz durum.');
    if (o.status === status) return;
    if (!TRANSITIONS[o.status].includes(status)) throw bad(`"${ORDER_STATUSES[o.status]}" durumundan "${ORDER_STATUSES[status]}" durumuna geçilemez.`, 409);
    const sets = { status };
    if (status === 'delivered') sets.delivered_at = new Date();
    if (status === 'cancelled' && !o.stock_restored) { await restoreOrderStock(id); sets.stock_restored = true; }
    await update('orders', id, sets);
    await event(id, 'status', `Durum: ${ORDER_STATUSES[o.status]} → ${ORDER_STATUSES[status]}`);
  });
}

async function setPayment(id, d) {
  const o = await queryOne('SELECT * FROM orders WHERE id = $1', [id]);
  if (!o) throw bad('Sipariş bulunamadı.', 404);
  const status = d.paymentStatus || o.payment_status;
  if (!PAYMENT_STATUSES[status]) throw bad('Geçersiz ödeme durumu.');
  await update('orders', id, { payment_status: status, payment_method: d.paymentMethod !== undefined ? txt(d.paymentMethod) : o.payment_method });
  await event(id, 'payment', `Ödeme: ${PAYMENT_STATUSES[status]}${d.paymentMethod ? ` (${d.paymentMethod})` : ''}`);
}

async function setShipping(id, d) {
  const carrier = txt(d.carrier), trackingNo = txt(d.trackingNo);
  if (!carrier) throw bad('Kargo firması seç.');
  await withTx(async () => {
    const o = await queryOne('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [id]);
    if (!o) throw bad('Sipariş bulunamadı.', 404);
    if (['cancelled', 'returned', 'delivered'].includes(o.status)) throw bad('Bu siparişin kargo bilgisi değiştirilemez.', 409);
    const sets = { carrier, tracking_no: trackingNo };
    if (o.status !== 'shipped') { sets.status = 'shipped'; sets.shipped_at = new Date(); }
    await update('orders', id, sets);
    await event(id, 'shipping', `Kargoya verildi: ${carrier}${trackingNo ? ` · Takip no ${trackingNo}` : ''}`);
  });
}

async function createInvoice(id) {
  const o = await queryOne('SELECT * FROM orders WHERE id = $1', [id]);
  if (!o) throw bad('Sipariş bulunamadı.', 404);
  if (o.status === 'cancelled') throw bad('İptal edilmiş sipariş için fatura kesilemez.', 409);
  if (o.invoice_no) return;
  const no = `GZ${new Date().getFullYear()}${String(o.order_no).padStart(6, '0')}`;
  await update('orders', id, { invoice_no: no, invoice_date: new Date() });
  await event(id, 'invoice', `Fatura oluşturuldu: ${no}`);
}

async function updateOrderInfo(id, d) {
  const o = await queryOne('SELECT id FROM orders WHERE id = $1', [id]);
  if (!o) throw bad('Sipariş bulunamadı.', 404);
  const sets = {};
  if (d.notes !== undefined) sets.notes = txt(d.notes);
  if (d.shippingAddress) sets.shipping_address = JSON.stringify(cleanShipping(d.shippingAddress));
  if (d.customerPhone !== undefined) sets.customer_phone = txt(d.customerPhone);
  if (d.customerEmail !== undefined) sets.customer_email = txt(d.customerEmail);
  if (Object.keys(sets).length) { await update('orders', id, sets); await event(id, 'note', 'Sipariş bilgileri güncellendi.'); }
}

async function bulkOrders(ids, action) {
  ids = (ids || []).map(int).filter(Boolean);
  let ok = 0; const errors = [];
  for (const id of ids) {
    try {
      if (action.startsWith('status:')) await setStatus(id, action.slice(7));
      else if (action === 'paid') await setPayment(id, { paymentStatus: 'paid' });
      else if (action === 'invoice') await createInvoice(id);
      else throw bad('Geçersiz işlem.');
      ok++;
    } catch (e) { errors.push(`#${id}: ${e.message}`); }
  }
  return { ok, failed: errors.length, errors: errors.slice(0, 5) };
}

// ===================================================================
//  İadeler
// ===================================================================
async function createReturn(orderId, d) {
  const o = await getOrder(orderId);
  if (!o) throw bad('Sipariş bulunamadı.', 404);
  if (!['shipped', 'delivered'].includes(o.status)) throw bad('İade yalnızca gönderilmiş veya teslim edilmiş siparişler için açılabilir.', 409);
  const items = (Array.isArray(d.items) ? d.items : []).map((i) => ({ orderItemId: int(i.orderItemId), quantity: int(i.quantity) })).filter((i) => i.orderItemId && i.quantity > 0);
  if (!items.length) throw bad('İade edilecek ürün ve adet seç.');
  let suggested = 0;
  for (const it of items) {
    const line = o.items.find((x) => x.id === it.orderItemId);
    if (!line) throw bad('Geçersiz sipariş kalemi.');
    const already = o.returns.filter((r) => r.status !== 'rejected').flatMap((r) => r.items).filter((x) => x.orderItemId === it.orderItemId).reduce((s, x) => s + x.quantity, 0);
    if (it.quantity + already > line.quantity) throw bad(`"${line.name}" için en fazla ${line.quantity - already} adet iade edilebilir.`);
    suggested += (line.line_total / line.quantity) * it.quantity;
  }
  const amount = d.refundAmount !== undefined && d.refundAmount !== '' ? num(d.refundAmount) : r2(suggested);
  if (amount === null || amount < 0 || amount > o.total) throw bad('İade tutarı geçersiz.');
  const row = await insert('order_returns', { order_id: orderId, reason: txt(d.reason), note: txt(d.note), items: JSON.stringify(items), refund_amount: amount });
  await event(orderId, 'return', `İade talebi açıldı (₺${amount}).`);
  return row;
}

async function updateReturn(id, d) {
  return withTx(async () => {
    const r = await queryOne('SELECT * FROM order_returns WHERE id = $1 FOR UPDATE', [id]);
    if (!r) throw bad('İade bulunamadı.', 404);
    const status = d.status;
    if (!RETURN_TRANSITIONS[r.status]) throw bad('Geçersiz iade.');
    if (!RETURN_TRANSITIONS[r.status].includes(status)) throw bad('Bu iade durumuna geçilemez.', 409);
    const sets = { status };
    if (d.refundAmount !== undefined && d.refundAmount !== '') sets.refund_amount = num(d.refundAmount);
    if (d.note !== undefined) sets.note = txt(d.note);
    const o = await queryOne('SELECT * FROM orders WHERE id = $1', [r.order_id]);
    if (status === 'received' && !r.restocked) {
      const w = await queryOne('SELECT id FROM warehouses ORDER BY is_default DESC, id LIMIT 1');
      for (const it of r.items) {
        const line = await queryOne('SELECT * FROM order_items WHERE id = $1', [it.orderItemId]);
        if (line && line.variant_id && w) await addStock(line.variant_id, w.id, it.quantity, 'return_in', r.order_id, 'İade teslim alındı');
      }
      sets.restocked = true;
    }
    if (status === 'refunded') {
      const amount = sets.refund_amount ?? Number(r.refund_amount);
      const full = amount >= Number(o.total) - 0.01;
      await update('orders', o.id, { payment_status: full ? 'refunded' : 'partial', ...(full && o.status === 'delivered' ? { status: 'returned' } : {}) });
    }
    const row = await update('order_returns', id, sets);
    const label = { approved: 'onaylandı', rejected: 'reddedildi', received: 'teslim alındı (stoğa eklendi)', refunded: 'iade edildi' }[status];
    await event(r.order_id, 'return', `İade #${id} ${label}.`);
    return row;
  });
}
const listReturns = () => queryAll(`SELECT r.*, o.order_no, o.customer_name, o.total AS order_total FROM order_returns r JOIN orders o ON o.id = r.order_id ORDER BY r.created_at DESC LIMIT 300`);

// ===================================================================
//  Kayıtlı filtreler
// ===================================================================
const listFilters = (scope) => queryAll('SELECT * FROM saved_filters WHERE scope = $1 ORDER BY name', [scope]);
async function saveFilter(d) {
  const name = txt(d.name);
  if (!name) throw bad('Filtre adı gerekli.');
  return insert('saved_filters', { scope: txt(d.scope) || 'orders', name, filter: JSON.stringify(d.filter || {}) });
}
const deleteFilter = (id) => query('DELETE FROM saved_filters WHERE id = $1', [id]);

module.exports = {
  ORDER_STATUSES, PAYMENT_STATUSES,
  listTags, createTag, updateTag, deleteTag,
  listCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer,
  listCoupons, createCoupon, updateCoupon, deleteCoupon,
  listCampaigns, createCampaign, updateCampaign, deleteCampaign,
  priceOrder, createOrder, getOrder, listOrders, setStatus, setPayment, setShipping, createInvoice, updateOrderInfo, bulkOrders,
  createReturn, updateReturn, listReturns, listFilters, saveFilter, deleteFilter,
};
