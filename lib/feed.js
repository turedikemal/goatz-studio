// Ürün XML feed'i (/urunler.xml): ikas "Product Exporter" mantığında, panelden girilen ürünlerden canlı üretilir.
// Yalnız "Aktif" + "Mağazada göster" ürünler; ?demo=1 yalnız örnek ürünleri verir.
// Parametreler (ikas'taki gibi, true/false): showCategoryPath, separateCategories, showTotalStockCount,
// showDiscountPrice, showPriceInfo. Varsayılan: kategori yolu + toplam stok açık, indirim/fiyat bilgisi kapalı.
const db = require('./db');

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]))
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
const cdata = (v) => `<![CDATA[${String(v ?? '').split(']]>').join(']]]]><![CDATA[>')}]]>`;
const num = (v) => (v === null || v === undefined || v === '' ? '' : Number(v).toFixed(2));
const flag = (q, k, def) => (q.has(k) ? q.get(k) === 'true' || q.get(k) === '1' : def);

function options(q) {
  return {
    categoryPath: flag(q, 'showCategoryPath', true),
    separate: flag(q, 'separateCategories', false),
    stock: flag(q, 'showTotalStockCount', true),
    discount: flag(q, 'showDiscountPrice', false),
    priceInfo: flag(q, 'showPriceInfo', false),
    demo: q.get('demo') === '1',
  };
}

async function load(demo) {
  const products = await db.query(
    `SELECT p.*, b.name AS brand_name, t.rate AS tax_rate FROM products p
     LEFT JOIN brands b ON b.id = p.brand_id LEFT JOIN tax_rates t ON t.id = p.tax_rate_id
     WHERE p.status = 'active' AND ${demo ? 'p.demo = true' : 'p.demo = false AND p.is_published = true'}
     ORDER BY p.id`);
  if (!products.length) return { products, cats: new Map(), variants: [], props: [] };
  const ids = products.map((p) => p.id);
  const [cats, variants, props] = await Promise.all([
    db.query('SELECT id, name, parent_id FROM categories'),
    db.query(`SELECT v.*, GREATEST(COALESCE((SELECT SUM(s.quantity - COALESCE(s.reserved, 0)) FROM stock s WHERE s.variant_id = v.id), 0), 0)::int AS stock
              FROM product_variants v WHERE v.product_id = ANY($1) AND v.is_active ORDER BY v.id`, [ids]),
    db.query(`SELECT vp.variant_id, pr.name, pv.value FROM variant_properties vp
              JOIN properties pr ON pr.id = vp.property_id JOIN property_values pv ON pv.id = vp.property_value_id
              JOIN product_variants v ON v.id = vp.variant_id WHERE v.product_id = ANY($1) ORDER BY pr.sort_order, pr.id`, [ids]),
  ]);
  return { products, cats: new Map(cats.map((c) => [c.id, c])), variants, props };
}

// Kök kategoriden ürünün kategorisine kadar adlar (döngüye karşı en çok 10 adım)
function catPath(cats, id) {
  const out = [];
  for (let c = cats.get(id), n = 0; c && n < 10; c = cats.get(c.parent_id), n++) out.unshift(c.name);
  return out;
}

const abs = (origin, u) => (/^https?:\/\//i.test(u) ? u : origin + (String(u).startsWith('/') ? '' : '/') + u);

async function productsXml(origin, q) {
  const o = options(q);
  const { products, cats, variants, props } = await load(o.demo);
  const byProduct = new Map();
  variants.forEach((v) => { if (!byProduct.has(v.product_id)) byProduct.set(v.product_id, []); byProduct.get(v.product_id).push(v); });
  const propsOf = new Map();
  props.forEach((r) => { if (!propsOf.has(r.variant_id)) propsOf.set(r.variant_id, []); propsOf.get(r.variant_id).push(r); });

  const price = (pad, sale, disc, p) => [
    `${pad}<Price>${num(sale)}</Price>`,
    o.discount && disc ? `${pad}<DiscountPrice>${num(disc)}</DiscountPrice>` : '',
    o.priceInfo ? `${pad}<Currency>TRY</Currency>` : '',
    o.priceInfo && p.tax_rate != null ? `${pad}<TaxRate>${Number(p.tax_rate)}</TaxRate>` : '',
    o.priceInfo && p.purchase_price != null ? `${pad}<BuyingPrice>${num(p.purchase_price)}</BuyingPrice>` : '',
  ].filter(Boolean);

  const items = products.map((p) => {
    const vs = byProduct.get(p.id) || [];
    const path = catPath(cats, p.category_id);
    const imgs = (Array.isArray(p.images) ? p.images : []).filter(Boolean);
    const lines = [
      `    <Id>${p.id}</Id>`,
      `    <Name>${esc(p.name)}</Name>`,
      `    <Slug>${esc(p.slug)}</Slug>`,
      p.sku ? `    <Sku>${esc(p.sku)}</Sku>` : '',
      p.barcode ? `    <Barcode>${esc(p.barcode)}</Barcode>` : '',
      p.brand_name ? `    <Brand>${esc(p.brand_name)}</Brand>` : '',
      `    <Description>${cdata(p.description)}</Description>`,
    ];
    if (path.length) {
      if (o.separate) lines.push('    <Categories>', ...path.map((c, i) => `      <Category level="${i + 1}">${esc(c)}</Category>`), '    </Categories>');
      else lines.push(`    <Category>${esc(o.categoryPath ? path.join(' > ') : path[path.length - 1])}</Category>`);
    }
    lines.push(...price('    ', p.sale_price, p.discount_price, p));
    if (o.stock) lines.push(`    <TotalStockCount>${vs.reduce((s, v) => s + v.stock, 0)}</TotalStockCount>`);
    if (p.weight != null) lines.push(`    <Weight>${Number(p.weight)}</Weight>`);
    if (p.desi != null) lines.push(`    <Desi>${Number(p.desi)}</Desi>`);
    lines.push('    <Images>', ...imgs.map((u) => `      <Image>${esc(abs(origin, u))}</Image>`), '    </Images>');
    lines.push('    <Variants>', ...vs.map((v) => [
      '      <Variant>',
      `        <Id>${v.id}</Id>`,
      v.name ? `        <Name>${esc(v.name)}</Name>` : '',
      `        <Sku>${esc(v.sku)}</Sku>`,
      v.barcode ? `        <Barcode>${esc(v.barcode)}</Barcode>` : '',
      ...price('        ', v.sale_price ?? p.sale_price, v.discount_price ?? p.discount_price, p),
      `        <StockCount>${v.stock}</StockCount>`,
      ...(propsOf.get(v.id) || []).map((r) => `        <Property name="${esc(r.name)}">${esc(r.value)}</Property>`),
      '      </Variant>',
    ].filter(Boolean).join('\n')), '    </Variants>');
    return ['  <Product>', ...lines.filter(Boolean), '  </Product>'].join('\n');
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<Products count="${products.length}">\n${items.join('\n')}${items.length ? '\n' : ''}</Products>\n`;
}

module.exports = { productsXml, options };
