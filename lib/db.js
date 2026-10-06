const { Pool, types } = require('pg');
const { sanitizeHtml } = require('./sanitize');
types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v)));
const fs = require('fs');
const { AsyncLocalStorage } = require('async_hooks');
const txStore = new AsyncLocalStorage();
const path = require('path');

let pool = null;

function getPool() {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.warn('⚠️ DATABASE_URL env var not set. Database features disabled.');
    return null;
  }

  pool = new Pool({
    connectionString,
    // SSL para Railway
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  pool.on('error', (err) => {
    console.error('Pool error:', err);
  });

  return pool;
}

async function initSchema() {
  const p = getPool();
  if (!p) {
    console.log('Skipping database initialization (no DATABASE_URL)');
    return;
  }

  try {
    const schemaPath = path.join(__dirname, 'schema-commerce.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    // Split by semicolon and execute each statement
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const stmt of statements) {
      try { await p.query(stmt); } catch (e) { console.error('Şema hatası:', e.message); }
    }

    await seedDefaults();
    console.log('✅ Database schema initialized');
  } catch (err) {
    console.error('Database initialization error:', err.message);
  }
}

async function withTx(fn) {
  const p = getPool();
  if (!p) throw Object.assign(new Error('Veritabanı yapılandırılmamış (DATABASE_URL yok).'), { status: 503 });
  if (txStore.getStore()) return fn();
  const client = await p.connect();
  try {
    await client.query('BEGIN');
    const out = await txStore.run(client, fn);
    await client.query('COMMIT');
    return out;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

// Query helpers
async function query(sql, params = []) {
  const p = getPool();
  if (!p) {
    throw Object.assign(new Error('Veritabanı yapılandırılmamış (DATABASE_URL yok).'), { status: 503 });
  }

  try {
    const result = await (txStore.getStore() || p).query(sql, params);
    return result.rows;
  } catch (err) {
    const map = {
      '23505': [409, 'Bu ad, kod, SKU veya e-posta zaten kullanılıyor.'],
      '23503': [409, 'Bu kayıt başka kayıtlarda kullanıldığı için işlem yapılamadı.'],
      '22P02': [400, 'Geçersiz değer girildi.'],
      '23502': [400, 'Zorunlu bir alan boş bırakıldı.'],
    };
    if (map[err.code]) throw Object.assign(new Error(map[err.code][1]), { status: map[err.code][0] });
    console.error('Query error:', sql, err.message);
    throw err;
  }
}

async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

async function queryAll(sql, params = []) {
  return query(sql, params);
}

async function insert(table, data) {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

  const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`;
  return queryOne(sql, values);
}

async function update(table, id, data) {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');

  const sql = `UPDATE ${table} SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $${keys.length + 1} RETURNING *`;
  return queryOne(sql, [...values, id]);
}

async function deleteRow(table, id) {
  const sql = `DELETE FROM ${table} WHERE id = $1`;
  return query(sql, [id]);
}

// Specific helpers for common operations

async function getBrands() {
  return queryAll('SELECT * FROM brands ORDER BY name');
}

async function createBrand(name, slug, description = '', logoUrl = '') {
  return insert('brands', {
    name,
    slug,
    description,
    logo_url: logoUrl,
  });
}

async function updateBrand(id, name, slug, description, logoUrl) {
  return update('brands', id, {
    name,
    slug,
    description,
    logo_url: logoUrl,
  });
}

async function getCategories() {
  return queryAll('SELECT * FROM categories ORDER BY sort_order, name');
}

async function createCategory(name, slug, parentId = null, description = '', icon = '') {
  return insert('categories', {
    name,
    slug,
    parent_id: parentId,
    description,
    icon,
  });
}

async function getProperties() {
  return queryAll('SELECT * FROM properties ORDER BY sort_order, name');
}

async function getPropertyValues(propertyId) {
  return queryAll(
    'SELECT * FROM property_values WHERE property_id = $1 ORDER BY sort_order, value',
    [propertyId]
  );
}

async function createProperty(name, slug, inputType = 'select', description = '') {
  return insert('properties', {
    name,
    slug,
    input_type: inputType,
    description,
  });
}

async function createPropertyValue(propertyId, value, colorHex = null) {
  return insert('property_values', {
    property_id: propertyId,
    value,
    color_hex: colorHex,
  });
}

// Varyant türü + değerlerini tek işlemde kaydeder (id yoksa yeni tür). Değer sırası dizideki sıradır.
async function saveVariantType(id, data) {
  const name = String(data.name || '').trim();
  if (!name) throw Object.assign(new Error('Varyant türü adı gerekli.'), { status: 400 });
  const inputType = data.inputType === 'color' ? 'color' : (data.inputType === 'text' ? 'text' : 'select');
  const vals = (Array.isArray(data.values) ? data.values : []).map((v) => ({
    id: v.id ? parseInt(v.id, 10) : null,
    value: String(v.value || '').trim(),
    colorHex: /^#[0-9a-fA-F]{6}$/.test(v.colorHex || '') ? v.colorHex : null,
    imageUrl: v.imageUrl ? String(v.imageUrl) : null,
  }));
  if (vals.some((v) => !v.value)) throw Object.assign(new Error('Boş değer olamaz.'), { status: 400 });
  const seen = new Set();
  for (const v of vals) {
    const k = v.value.toLocaleLowerCase('tr');
    if (seen.has(k)) throw Object.assign(new Error(`"${v.value}" iki kez yazılmış.`), { status: 400 });
    seen.add(k);
  }
  return withTx(async () => {
    let prop;
    if (id) {
      prop = await queryOne('UPDATE properties SET name = $1, slug = $2, input_type = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4 RETURNING *', [name, slugify(name), inputType, id]);
      if (!prop) throw Object.assign(new Error('Varyant türü bulunamadı.'), { status: 404 });
    } else {
      prop = await insert('properties', { name, slug: slugify(name), input_type: inputType });
    }
    const old = await queryAll('SELECT id FROM property_values WHERE property_id = $1', [prop.id]);
    const keep = new Set(vals.filter((v) => v.id).map((v) => v.id));
    for (const o of old) if (!keep.has(o.id)) await query('DELETE FROM property_values WHERE id = $1', [o.id]);
    // Adları takas ederken benzersizlik çakışmasın: önce var olanları geçici adlandır
    const oldIds = new Set(old.map((o) => o.id));
    for (const v of vals) if (v.id && oldIds.has(v.id)) await query('UPDATE property_values SET value = $1 WHERE id = $2', ['~tmp~' + v.id, v.id]);
    for (let i = 0; i < vals.length; i++) {
      const v = vals[i];
      if (v.id && oldIds.has(v.id)) await query('UPDATE property_values SET value = $1, color_hex = $2, image_url = $3, sort_order = $4 WHERE id = $5', [v.value, v.colorHex, v.imageUrl, i, v.id]);
      else await query('INSERT INTO property_values (property_id, value, color_hex, image_url, sort_order) VALUES ($1,$2,$3,$4,$5)', [prop.id, v.value, v.colorHex, v.imageUrl, i]);
    }
    return prop;
  });
}

async function getTaxRates() {
  return queryAll('SELECT * FROM tax_rates ORDER BY name');
}

async function createTaxRate(name, rate, description = '') {
  return insert('tax_rates', {
    name,
    rate,
    description,
  });
}

async function getWarehouses() {
  return queryAll('SELECT * FROM warehouses ORDER BY name');
}

async function createWarehouse(name, slug, address = '', isDefault = false) {
  return insert('warehouses', {
    name,
    slug,
    address,
    is_default: isDefault,
  });
}

// ========== Ürünler (Products) ==========
const num = (v) => (v === '' || v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v));
const idOrNull = (v) => (v === '' || v === null || v === undefined ? null : parseInt(v, 10) || null);
const txt = (v) => (v === undefined || v === null ? null : String(v).trim() || null);
function slugify(s) {
  const map = { ç: 'c', ğ: 'g', ı: 'i', İ: 'i', ö: 'o', ş: 's', ü: 'u', Ç: 'c', Ğ: 'g', Ö: 'o', Ş: 's', Ü: 'u' };
  return String(s || '').replace(/[çğıİöşüÇĞÖŞÜ]/g, (c) => map[c]).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'urun';
}

const PRODUCT_SELECT = `SELECT p.*, b.name AS brand_name, c.name AS category_name, t.name AS tax_name, t.rate AS tax_rate,
  COALESCE((SELECT SUM(s.quantity) FROM stock s JOIN product_variants v ON v.id = s.variant_id WHERE v.product_id = p.id), 0)::int AS total_stock,
  (SELECT COUNT(*) FROM product_variants v WHERE v.product_id = p.id)::int AS variant_count,
  (SELECT COUNT(*) FROM product_variants v WHERE v.product_id = p.id AND v.name IS NOT NULL)::int AS named_variants
  FROM products p
  LEFT JOIN brands b ON p.brand_id = b.id
  LEFT JOIN categories c ON p.category_id = c.id
  LEFT JOIN tax_rates t ON p.tax_rate_id = t.id`;

async function getProducts(limit = 200, offset = 0) {
  return queryAll(`${PRODUCT_SELECT} ORDER BY p.updated_at DESC LIMIT $1 OFFSET $2`, [limit, offset]);
}

async function getProduct(id) {
  const product = await queryOne(`${PRODUCT_SELECT} WHERE p.id = $1`, [id]);
  if (!product) return null;
  product.variants = await queryAll(
    `SELECT v.*, COALESCE((SELECT SUM(quantity) FROM stock WHERE variant_id = v.id), 0)::int AS stock_total
     FROM product_variants v WHERE v.product_id = $1 ORDER BY v.id`, [id]);
  for (const v of product.variants) {
    v.stock = await queryAll('SELECT * FROM stock WHERE variant_id = $1', [v.id]);
  }
  return product;
}

function cleanTags(v) {
  const list = Array.isArray(v) ? v : typeof v === 'string' ? v.split(',') : [];
  const seen = new Set(), out = [];
  for (const t of list) {
    const s = String(t).replace(/\s+/g, ' ').trim().slice(0, 100);
    const k = s.toLocaleLowerCase('tr');
    if (s && !seen.has(k)) { seen.add(k); out.push(s); }
  }
  return out.slice(0, 50);
}

// Ürün etiketleri tanımı
const listProductTags = () => queryAll('SELECT t.*, (SELECT COUNT(*) FROM products p WHERE t.name = ANY(p.tags))::int AS product_count FROM product_tags t ORDER BY t.name');
async function createProductTag(d) {
  const name = cleanTags([d && d.name])[0];
  if (!name) throw Object.assign(new Error('Etiket adı gerekli.'), { status: 400 });
  return insert('product_tags', { name });
}
async function renameProductTag(id, d) {
  const old = await queryOne('SELECT * FROM product_tags WHERE id = $1', [id]);
  if (!old) throw Object.assign(new Error('Etiket bulunamadı.'), { status: 404 });
  const name = cleanTags([d && d.name])[0];
  if (!name) throw Object.assign(new Error('Etiket adı gerekli.'), { status: 400 });
  return withTx(async () => {
    const row = await queryOne('UPDATE product_tags SET name = $1 WHERE id = $2 RETURNING *', [name, id]);
    if (name !== old.name) {
      // Üründe yeni ad zaten varsa tekrar oluşmasın
      await query(`UPDATE products SET tags = ARRAY(SELECT DISTINCT ON (x) x FROM unnest(array_replace(tags, $1, $2)) WITH ORDINALITY AS u(x, o) ORDER BY x, o)
        WHERE $1 = ANY(tags)`, [old.name, name]);
    }
    return row;
  });
}
async function deleteProductTag(id) {
  const old = await queryOne('SELECT * FROM product_tags WHERE id = $1', [id]);
  if (!old) return;
  await withTx(async () => {
    await query('UPDATE products SET tags = array_remove(tags, $1) WHERE $1 = ANY(tags)', [old.name]);
    await query('DELETE FROM product_tags WHERE id = $1', [id]);
  });
}
async function registerTags(tags) {
  for (const name of tags) await query('INSERT INTO product_tags (name) SELECT $1::varchar WHERE NOT EXISTS (SELECT 1 FROM product_tags WHERE lower(name) = lower($1::varchar))', [name]);
}

function productRow(d, existing) {
  const name = txt(d.name);
  return {
    name,
    slug: slugify(d.slug || name),
    description: sanitizeHtml(d.description) || null,
    brand_id: idOrNull(d.brandId),
    category_id: idOrNull(d.categoryId),
    sku: txt(d.sku),
    barcode: txt(d.barcode),
    purchase_price: num(d.purchasePrice),
    sale_price: num(d.salePrice),
    discount_price: num(d.discountPrice),
    tax_rate_id: idOrNull(d.taxRateId),
    status: ['draft', 'active', 'archived'].includes(d.status) ? d.status : 'draft',
    is_published: Boolean(d.isPublished),
    seo_title: txt(d.seoTitle),
    seo_description: txt(d.seoDescription),
    seo_keywords: txt(d.seoKeywords),
    weight: num(d.weight),
    desi: num(d.desi),
    tags: cleanTags(d.tags),
    images: JSON.stringify(Array.isArray(d.images) ? d.images.filter((u) => typeof u === 'string' && u.startsWith('/uploads/')).slice(0, 20) : []),
  };
}

async function saveVariants(productId, data, row, warehouseId) {
  let variants = Array.isArray(data.variants) && data.variants.length ? data.variants : null;
  if (!variants) {
    const ex = await queryOne('SELECT id FROM product_variants WHERE product_id = $1 AND name IS NULL ORDER BY id LIMIT 1', [productId]);
    variants = [{ id: ex && ex.id, name: null, sku: row.sku, barcode: row.barcode, stock: data.stock, warehouseId: data.warehouseId }];
  }
  const keep = [];
  for (const v of variants) {
    const row = {
      product_id: productId,
      name: txt(v.name),
      sku: txt(v.sku) || `SKU-${productId}-${Date.now().toString(36)}${keep.length}`,
      barcode: txt(v.barcode),
      sale_price: num(v.salePrice),
      discount_price: num(v.discountPrice),
      weight: num(v.weight),
      desi: num(v.desi),
      is_active: v.isActive !== false,
    };
    let saved;
    if (v.id) {
      const { product_id, ...rest } = row;
      saved = await update('product_variants', v.id, rest);
    } else {
      saved = await insert('product_variants', row);
    }
    keep.push(saved.id);
    const wh = idOrNull(v.warehouseId) || warehouseId;
    if (wh && v.stock !== undefined && v.stock !== '') await updateStock(saved.id, wh, parseInt(v.stock, 10) || 0);
  }
  await query('DELETE FROM product_variants WHERE product_id = $1 AND NOT (id = ANY($2::int[]))', [productId, keep]);
}

async function defaultWarehouseId() {
  const w = await queryOne('SELECT id FROM warehouses ORDER BY is_default DESC, id LIMIT 1');
  return w ? w.id : null;
}

async function uniqueSlug(base, exceptId) {
  let slug = base, i = 2;
  while (await queryOne('SELECT id FROM products WHERE slug = $1 AND id <> $2', [slug, exceptId || 0])) slug = `${base}-${i++}`;
  return slug;
}

async function createProduct(data) {
  const id = await withTx(async () => {
    const row = productRow(data);
    row.slug = await uniqueSlug(row.slug);
    const product = await insert('products', row);
    await registerTags(row.tags);
    await saveVariants(product.id, data, row, await defaultWarehouseId());
    return product.id;
  });
  return getProduct(id);
}

async function updateProduct(id, data) {
  await withTx(async () => {
    const row = productRow(data);
    row.slug = await uniqueSlug(row.slug, id);
    await update('products', id, row);
    await registerTags(row.tags);
    await saveVariants(id, data, row, await defaultWarehouseId());
  });
  return getProduct(id);
}

async function createProductVariant(productId, data) {
  return insert('product_variants', {
    product_id: productId, sku: txt(data.sku), barcode: txt(data.barcode), sale_price: num(data.salePrice),
    discount_price: num(data.discountPrice), weight: num(data.weight), desi: num(data.desi), is_active: data.isActive !== false,
  });
}

async function getStock(variantId, warehouseId) {
  return queryOne('SELECT * FROM stock WHERE variant_id = $1 AND warehouse_id = $2', [variantId, warehouseId]);
}

async function updateStock(variantId, warehouseId, quantity) {
  const existing = await getStock(variantId, warehouseId);
  const diff = quantity - (existing ? existing.quantity : 0);
  const row = existing ? await update('stock', existing.id, { quantity }) : await insert('stock', { variant_id: variantId, warehouse_id: warehouseId, quantity });
  if (diff) await insert('stock_movements', { variant_id: variantId, warehouse_id: warehouseId, quantity_change: diff, movement_type: 'adjustment', notes: 'Panelden güncellendi' });
  return row;
}

async function seedDefaults() {
  const n = await queryOne('SELECT COUNT(*)::int AS n FROM tax_rates');
  if (n && n.n === 0) for (const [name, rate] of [['KDV %20', 20], ['KDV %10', 10], ['KDV %1', 1], ['KDV %0', 0]]) await insert('tax_rates', { name, rate });
  const w = await queryOne('SELECT COUNT(*)::int AS n FROM warehouses');
  if (w && w.n === 0) await insert('warehouses', { name: 'Merkez Depo', slug: 'merkez-depo', is_default: true });
}

async function getStockList() {
  return queryAll(`SELECT v.id AS variant_id, p.id AS product_id, p.name AS product_name, v.name AS variant_name, v.sku,
      w.id AS warehouse_id, w.name AS warehouse_name, COALESCE(s.quantity, 0)::int AS quantity
    FROM product_variants v JOIN products p ON p.id = v.product_id CROSS JOIN warehouses w
    LEFT JOIN stock s ON s.variant_id = v.id AND s.warehouse_id = w.id
    ORDER BY p.name, v.id, w.id`);
}

async function bulkProducts(ids, action) {
  ids = (ids || []).map((i) => parseInt(i, 10)).filter(Boolean);
  if (!ids.length) return 0;
  if (action === 'delete') { await query('DELETE FROM products WHERE id = ANY($1::int[])', [ids]); return ids.length; }
  const st = { active: ['active', true], draft: ['draft', false], archived: ['archived', false] }[action];
  if (!st) throw Object.assign(new Error('Geçersiz işlem.'), { status: 400 });
  await query('UPDATE products SET status = $2, is_published = $3, updated_at = CURRENT_TIMESTAMP WHERE id = ANY($1::int[])', [ids, st[0], st[1]]);
  return ids.length;
}

const DEF_TABLES = {
  brands: { table: 'brands', cols: { name: 'name', slug: 'slug', description: 'description', logoUrl: 'logo_url' } },
  categories: { table: 'categories', cols: { name: 'name', slug: 'slug', parentId: 'parent_id', description: 'description', icon: 'icon' } },
  properties: { table: 'properties', cols: { name: 'name', slug: 'slug', inputType: 'input_type', description: 'description' } },
  'property-values': { table: 'property_values', cols: { value: 'value', colorHex: 'color_hex' }, noUpdatedAt: true },
  'tax-rates': { table: 'tax_rates', cols: { name: 'name', rate: 'rate', description: 'description' } },
  warehouses: { table: 'warehouses', cols: { name: 'name', slug: 'slug', address: 'address', isDefault: 'is_default' } },
};

async function updateDefinition(type, id, data) {
  const def = DEF_TABLES[type];
  if (!def) throw Object.assign(new Error('Bilinmeyen tanım.'), { status: 404 });
  const row = {};
  for (const [k, col] of Object.entries(def.cols)) if (data[k] !== undefined) row[col] = data[k] === '' ? null : data[k];
  if (row.slug !== undefined || row.name) row.slug = slugify(data.slug || data.name);
  if (def.cols.slug === undefined) delete row.slug;
  if (row.parent_id !== undefined) row.parent_id = idOrNull(row.parent_id);
  if (row.is_default) await query('UPDATE warehouses SET is_default = false');
  if (def.noUpdatedAt) {
    const keys = Object.keys(row);
    return queryOne(`UPDATE ${def.table} SET ${keys.map((k, i) => `${k} = $${i + 1}`).join(', ')} WHERE id = $${keys.length + 1} RETURNING *`, [...Object.values(row), id]);
  }
  return update(def.table, id, row);
}

async function deleteDefinition(type, id) {
  const def = DEF_TABLES[type];
  if (!def) throw Object.assign(new Error('Bilinmeyen tanım.'), { status: 404 });
  if (type === 'properties') await query('DELETE FROM property_values WHERE property_id = $1', [id]);
  await deleteRow(def.table, id);
}

async function close() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = {
  num, idOrNull, txt,
  getPool,
  initSchema,
  query,
  queryOne,
  queryAll,
  insert,
  update,
  deleteRow,
  close,
  withTx,
  // Definitions helpers
  getBrands,
  createBrand,
  updateBrand,
  getCategories,
  createCategory,
  getProperties,
  getPropertyValues,
  createProperty,
  saveVariantType,
  createPropertyValue,
  getTaxRates,
  createTaxRate,
  getWarehouses,
  createWarehouse,
  // Products helpers
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  createProductVariant,
  getStock,
  updateStock,
  getStockList,
  bulkProducts,
  updateDefinition,
  deleteDefinition,
  seedDefaults,
  slugify,
  listProductTags, createProductTag, renameProductTag, deleteProductTag,
};
