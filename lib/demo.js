// Örnek (demo) satış verisi: Dashboard'un ve sipariş ekranlarının nasıl çalıştığını göstermek için.
// Panelden tek düğmeyle eklenir, tek düğmeyle tamamen silinir. Tüm kayıtlar demo=true işaretlidir;
// ürün adları "Örnek ·", müşteri soyadları "(örnek)" içerir. Fiyatlar gerçek değildir.
const db = require('./db');
const { query, queryOne, insert, withTx } = db;

const DAY = 864e5, HOUR = 36e5;
const TR_OFFSET = 3 * HOUR;

// Her seferinde aynı örnek veri çıksın diye sabit tohumlu rastgele
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

const PRODUCTS = [
  { name: 'Örnek · Soya Mum', slug: 'ornek-soya-mum', price: 320, variants: [['Lavanta', 'ORNEK-MUM-LAV', 18], ['Vanilya', 'ORNEK-MUM-VAN', 3]] },
  { name: 'Örnek · Seramik Kupa', slug: 'ornek-seramik-kupa', price: 450, variants: [[null, 'ORNEK-KUPA', 0]] },
  { name: 'Örnek · Zeytinyağlı Sabun', slug: 'ornek-zeytinyagli-sabun', price: 140, variants: [['Sade', 'ORNEK-SABUN-SADE', 40], ['Defne', 'ORNEK-SABUN-DEFNE', 25]] },
  { name: 'Örnek · Keten Çanta', slug: 'ornek-keten-canta', price: 590, variants: [[null, 'ORNEK-CANTA', 2]] },
  { name: 'Örnek · Oda Kokusu', slug: 'ornek-oda-kokusu', price: 380, variants: [[null, 'ORNEK-KOKU', 12]] },
];
const CUSTOMERS = [
  ['Ayşe', 'Yılmaz', 'Çanakkale', 'Merkez'], ['Mehmet', 'Kaya', 'İstanbul', 'Kadıköy'], ['Zeynep', 'Demir', 'İzmir', 'Karşıyaka'],
  ['Can', 'Şahin', 'Ankara', 'Çankaya'], ['Elif', 'Aydın', 'Bursa', 'Nilüfer'], ['Burak', 'Öztürk', 'Çanakkale', 'Gelibolu'],
  ['Selin', 'Arslan', 'Antalya', 'Muratpaşa'], ['Emre', 'Koç', 'Eskişehir', 'Tepebaşı'],
];
const CHANNELS = ['web', 'web', 'web', 'instagram', 'instagram', 'whatsapp', 'trendyol', 'manual'];
const CARRIERS = ['Yurtiçi Kargo', 'Aras Kargo', 'MNG Kargo'];

async function status() {
  if (!db.getPool()) return { db: false, orders: 0, products: 0, customers: 0, carts: 0 };
  const r = await queryOne(`SELECT (SELECT COUNT(*) FROM orders WHERE demo)::int AS orders,
    (SELECT COUNT(*) FROM products WHERE demo)::int AS products, (SELECT COUNT(*) FROM customers WHERE demo)::int AS customers, (SELECT COUNT(*) FROM abandoned_carts WHERE demo)::int AS carts`);
  return { db: true, ...r };
}

async function create() {
  const st = await status();
  if (!st.db) throw Object.assign(new Error('Veritabanı bağlı değil.'), { status: 503 });
  if (st.orders || st.products || st.customers || st.carts) throw Object.assign(new Error('Örnek veri zaten var. Önce silip yeniden ekleyebilirsin.'), { status: 409 });
  const rand = rng(20261006);
  const pick = (a) => a[Math.floor(rand() * a.length)];
  const now = Date.now();
  const today = Math.floor((now + TR_OFFSET) / DAY) * DAY - TR_OFFSET;

  await withTx(async () => {
    const wh = await queryOne('SELECT id FROM warehouses ORDER BY is_default DESC, id LIMIT 1');
    const tax = await queryOne('SELECT id FROM tax_rates WHERE rate = 20 LIMIT 1');

    // Ürünler, varyantlar, stok
    const variants = [];
    for (const p of PRODUCTS) {
      const prod = await insert('products', { name: p.name, slug: p.slug, sale_price: p.price, status: 'active', is_published: false, tax_rate_id: tax ? tax.id : null, demo: true,
        description: '<p>Bu bir örnek üründür. Dashboard ve sipariş ekranlarını göstermek için eklendi; fiyatı ve stoğu gerçek değildir.</p>' });
      for (const [vname, sku, qty] of p.variants) {
        const v = await insert('product_variants', { product_id: prod.id, name: vname, sku, is_active: true });
        if (wh) await insert('stock', { variant_id: v.id, warehouse_id: wh.id, quantity: qty });
        variants.push({ productId: prod.id, variantId: v.id, name: vname ? `${p.name} · ${vname}` : p.name, sku, price: p.price });
      }
    }

    // Müşteriler (son 30 güne yayılmış kayıt tarihleri)
    const customers = [];
    for (let i = 0; i < CUSTOMERS.length; i++) {
      const [first, last, city, district] = CUSTOMERS[i];
      const created = new Date(today - (28 - i * 4) * DAY + 11 * HOUR);
      const phone = `0500 000 00 ${String(10 + i).padStart(2, '0')}`;
      const address = { title: 'Ev', fullName: `${first} ${last}`, phone, city, district, address: 'Örnek Mah. Örnek Sok. No: 1', postalCode: '' };
      const c = await insert('customers', { first_name: first, last_name: `${last} (örnek)`, email: `ornek${i + 1}@example.com`, phone,
        addresses: JSON.stringify([address]), notes: 'Örnek müşteri (gerçek kişi değil).', demo: true, created_at: created, updated_at: created });
      customers.push({ ...c, address });
    }

    // Siparişler: 30 güne yayılmış, gün içinde 09-23 arası; yakın günler açık durumlarda
    const plan = [];
    for (let d = 29; d >= 0; d--) {
      const n = d === 0 ? 3 : d <= 2 ? 2 : rand() < 0.35 ? 2 : rand() < 0.75 ? 1 : 0;
      for (let k = 0; k < n; k++) {
        let t = today - d * DAY + (9 + Math.floor(rand() * 14)) * HOUR + Math.floor(rand() * 60) * 6e4;
        if (t > now - 20 * 6e4) t = now - (20 + Math.floor(rand() * 90)) * 6e4;
        plan.push({ d, t });
      }
    }
    plan.sort((a, b) => a.t - b.t);
    let cancelled = 0, returned = 0, openReturn = false, partial = false, failed = false;
    for (const [i, o] of plan.entries()) {
      const cust = pick(customers);
      const channel = pick(CHANNELS);
      // Durum: yaşa göre
      let status;
      if (o.d === 0) status = pick(['received', 'received', 'preparing']);
      else if (o.d === 1) status = pick(['preparing', 'ready']);
      else if (o.d <= 3) status = pick(['ready', 'shipped', 'shipped']);
      else if (o.d <= 6) status = pick(['shipped', 'delivered', 'delivered']);
      else status = 'delivered';
      if (o.d > 2 && cancelled < 3 && rand() < 0.1) { status = 'cancelled'; cancelled++; }
      else if (o.d > 8 && returned < 2 && rand() < 0.12) { status = 'returned'; returned++; }

      // Satırlar: en çok satanlar belirgin olsun diye ilk ürünler ağırlıklı
      const lines = [];
      const lineCount = rand() < 0.6 ? 1 : rand() < 0.8 ? 2 : 3;
      for (let l = 0; l < lineCount; l++) {
        const v = variants[Math.min(variants.length - 1, Math.floor(Math.pow(rand(), 1.6) * variants.length))];
        const ex = lines.find((x) => x.v === v);
        if (ex) ex.qty++; else lines.push({ v, qty: rand() < 0.7 ? 1 : 2 });
      }
      const subtotal = lines.reduce((a, x) => a + x.v.price * x.qty, 0);
      const shippingTotal = subtotal >= 750 ? 0 : 59.9;
      const total = Math.round((subtotal + shippingTotal) * 100) / 100;
      const taxTotal = Math.round((subtotal - subtotal / 1.2) * 100) / 100;

      let payment = 'paid', method = pick(['Kredi kartı', 'Kredi kartı', 'Havale / EFT', 'Kapıda ödeme']);
      if (method === 'Kapıda ödeme' && !['delivered', 'returned'].includes(status)) payment = 'pending';
      if (method === 'Havale / EFT' && o.d <= 1) payment = 'pending';
      if (status === 'cancelled') { payment = failed ? 'refunded' : 'failed'; failed = true; }
      if (status === 'returned') payment = 'refunded';
      if (!partial && status === 'preparing') { payment = 'partial'; method = 'Havale / EFT'; partial = true; }

      const created = new Date(o.t);
      const shipped = ['shipped', 'delivered', 'returned'].includes(status) ? new Date(o.t + (20 + Math.floor(rand() * 20)) * HOUR) : null;
      const delivered = ['delivered', 'returned'].includes(status) ? new Date(shipped.getTime() + (30 + Math.floor(rand() * 30)) * HOUR) : null;
      const carrier = shipped ? pick(CARRIERS) : null;
      const order = await insert('orders', {
        customer_id: cust.id, customer_name: cust.address.fullName, customer_email: cust.email, customer_phone: cust.phone,
        channel, status, payment_status: payment, payment_method: method, shipping_address: JSON.stringify(cust.address),
        carrier, tracking_no: carrier ? `ORNEK${String(100000 + i * 37).slice(-6)}` : null, shipped_at: shipped, delivered_at: delivered,
        invoice_no: delivered ? `ORN${created.getFullYear()}${String(i + 1).padStart(4, '0')}` : null, invoice_date: delivered,
        subtotal, discount_total: 0, shipping_total: shippingTotal, tax_total: taxTotal, total,
        notes: 'Örnek sipariş: gerçek değildir, “Örnek veriyi sil” ile kaldırılır.', stock_restored: status === 'cancelled',
        demo: true, created_at: created, updated_at: delivered || shipped || created,
      });
      for (const x of lines) {
        await insert('order_items', { order_id: order.id, product_id: x.v.productId, variant_id: x.v.variantId, name: x.v.name, sku: x.v.sku,
          quantity: x.qty, unit_price: x.v.price, discount_unit: 0, tax_rate: 20, line_total: x.v.price * x.qty });
      }
      // Sipariş geçmişi
      const ev = async (type, message, at) => insert('order_events', { order_id: order.id, type, message, created_at: at });
      await ev('created', `Sipariş oluşturuldu (${channel})`, created);
      if (payment === 'paid' || payment === 'refunded') await ev('payment', `Ödeme: Ödendi (${method})`, new Date(o.t + 6e4));
      if (payment === 'partial') await ev('payment', `Ödeme: Kısmi ödeme (${method})`, new Date(o.t + HOUR));
      if (status !== 'received' && status !== 'cancelled') await ev('status', 'Durum: Sipariş alındı → Hazırlanıyor', new Date(o.t + 2 * HOUR));
      if (['ready', 'shipped', 'delivered', 'returned'].includes(status)) await ev('status', 'Durum: Hazırlanıyor → Kargoya hazır', new Date(o.t + 5 * HOUR));
      if (status === 'cancelled') await ev('status', 'Durum: Sipariş alındı → İptal edildi', new Date(o.t + 3 * HOUR));
      if (shipped) await ev('shipping', `Kargoya verildi: ${carrier} · ${order.tracking_no}`, shipped);
      if (delivered) await ev('status', 'Durum: Gönderildi → Teslim edildi', delivered);
      if (delivered) await ev('invoice', `Fatura kesildi: ${order.invoice_no}`, delivered);
      if (status === 'returned') {
        const at = new Date(delivered.getTime() + 2 * DAY);
        await insert('order_returns', { order_id: order.id, status: 'refunded', reason: pick(['Beğenilmedi', 'Ürün hasarlı']), note: 'Örnek iade',
          items: JSON.stringify(lines.map((x) => ({ name: x.v.name, quantity: x.qty }))), refund_amount: total, restocked: true, created_at: at, updated_at: at });
        await ev('return', `İade tamamlandı: ${total.toFixed(2)} ₺`, at);
      } else if (!openReturn && status === 'delivered' && o.d > 4 && o.d < 12) {
        openReturn = true;
        const at = new Date(delivered.getTime() + DAY);
        await insert('order_returns', { order_id: order.id, status: 'requested', reason: 'Yanlış ürün', note: 'Örnek iade talebi',
          items: JSON.stringify([{ name: lines[0].v.name, quantity: 1 }]), refund_amount: lines[0].v.price, restocked: false, created_at: at, updated_at: at });
        await ev('return', 'İade talebi açıldı', at);
      }
    }

    // Terk edilen sepetler: son 10 güne yayılmış; çoğu açık, biri siparişe dönmüş, biri kapatılmış
    const CART_PLAN = [
      [0, 2, 'cart', 'open'], [0, 5, 'payment', 'open'], [1, 3, 'checkout', 'open'], [1, 20, 'cart', 'open'], [2, 4, 'payment', 'open'],
      [3, 1, 'cart', 'open'], [4, 6, 'checkout', 'recovered'], [6, 2, 'cart', 'open'], [8, 3, 'cart', 'dismissed'], [9, 5, 'checkout', 'open'],
    ];
    for (const [i, [d, hoursAgo, stage, st]] of CART_PLAN.entries()) {
      let cust = stage === 'cart' && i % 3 === 0 ? null : pick(customers); // misafir sepette iletişim bilgisi olmaz
      const items = [];
      for (let l = 0, n = rand() < 0.55 ? 1 : 2; l < n; l++) {
        const v = pick(variants); const ex = items.find((x) => x.variant_id === v.variantId);
        if (ex) ex.quantity++; else items.push({ product_id: v.productId, variant_id: v.variantId, name: v.name, sku: v.sku, quantity: 1, unit_price: v.price });
      }
      const total = items.reduce((a, x) => a + x.unit_price * x.quantity, 0);
      const at = new Date(Math.min(now - hoursAgo * HOUR, today - d * DAY + (10 + hoursAgo) * HOUR));
      let recovered = null;
      if (st === 'recovered') {
        // Sepetten sonra gelen ilk örnek siparişe bağla; müşteri o siparişin müşterisi olur
        recovered = await queryOne('SELECT id, customer_id FROM orders WHERE demo AND created_at > $1 ORDER BY created_at LIMIT 1', [at]);
        if (recovered) cust = customers.find((x) => x.id === recovered.customer_id) || cust;
      }
      await insert('abandoned_carts', {
        token: `ornek-${i + 1}`, customer_id: cust ? cust.id : null, customer_name: cust ? cust.address.fullName : null,
        customer_email: cust ? cust.email : null, customer_phone: cust && stage !== 'cart' ? cust.phone : null,
        channel: 'web', stage, status: recovered || st !== 'recovered' ? st : 'open', items: JSON.stringify(items), total,
        recovered_order_id: recovered ? recovered.id : null, notes: 'Örnek sepet: gerçek değildir.', demo: true,
        created_at: new Date(at.getTime() - 25 * 6e4), updated_at: at,
      });
    }
  });
  return status();
}

async function remove() {
  if (!db.getPool()) throw Object.assign(new Error('Veritabanı bağlı değil.'), { status: 503 });
  await withTx(async () => {
    await query('DELETE FROM abandoned_carts WHERE demo');
    await query('DELETE FROM orders WHERE demo');
    await query('DELETE FROM customers WHERE demo');
    await query('DELETE FROM products WHERE demo');
  });
  return status();
}

module.exports = { status, create, remove };
