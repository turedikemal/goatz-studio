const { Pool } = require('pg');
const fs = require('fs');
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
      await p.query(stmt);
    }

    console.log('✅ Database schema initialized');
  } catch (err) {
    console.error('Database initialization error:', err.message);
  }
}

// Query helpers
async function query(sql, params = []) {
  const p = getPool();
  if (!p) throw new Error('Database not configured');

  try {
    const result = await p.query(sql, params);
    return result.rows;
  } catch (err) {
    console.error('Query error:', sql, err);
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
async function getProducts(limit = 100, offset = 0) {
  return queryAll(
    `SELECT p.*, b.name as brand_name, c.name as category_name, t.name as tax_name, t.rate as tax_rate
     FROM products p
     LEFT JOIN brands b ON p.brand_id = b.id
     LEFT JOIN categories c ON p.category_id = c.id
     LEFT JOIN tax_rates t ON p.tax_rate_id = t.id
     ORDER BY p.updated_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
}

async function getProduct(id) {
  const product = await queryOne(
    `SELECT p.*, b.name as brand_name, c.name as category_name, t.name as tax_name, t.rate as tax_rate
     FROM products p
     LEFT JOIN brands b ON p.brand_id = b.id
     LEFT JOIN categories c ON p.category_id = c.id
     LEFT JOIN tax_rates t ON p.tax_rate_id = t.id
     WHERE p.id = $1`,
    [id]
  );

  if (!product) return null;

  // Varyantları da yükle
  product.variants = await queryAll(
    'SELECT * FROM product_variants WHERE product_id = $1 ORDER BY id',
    [id]
  );

  // Her varyant için özellikleri yükle
  for (const variant of product.variants) {
    variant.properties = await queryAll(
      `SELECT pv.*, p.name as property_name, pv_val.value
       FROM variant_properties vp
       JOIN properties p ON vp.property_id = p.id
       JOIN property_values pv_val ON vp.property_value_id = pv_val.id
       WHERE vp.variant_id = $1`,
      [variant.id]
    );

    // Her varyant için stok yükle
    variant.stock = await queryAll(
      'SELECT * FROM stock WHERE variant_id = $1',
      [variant.id]
    );
  }

  return product;
}

async function createProduct(data) {
  const {
    name, slug, description, brandId, categoryId, sku, barcode,
    purchasePrice, salePrice, discountPrice, taxRateId, status,
    isPublished, seoTitle, seoDescription
  } = data;

  return insert('products', {
    name,
    slug: slug || name.toLowerCase().replace(/\s+/g, '-'),
    description,
    brand_id: brandId || null,
    category_id: categoryId || null,
    sku,
    barcode,
    purchase_price: purchasePrice,
    sale_price: salePrice,
    discount_price: discountPrice,
    tax_rate_id: taxRateId || null,
    status: status || 'draft',
    is_published: isPublished || false,
    seo_title: seoTitle,
    seo_description: seoDescription,
  });
}

async function updateProduct(id, data) {
  const {
    name, slug, description, brandId, categoryId, sku, barcode,
    purchasePrice, salePrice, discountPrice, taxRateId, status,
    isPublished, seoTitle, seoDescription
  } = data;

  return update('products', id, {
    name,
    slug,
    description,
    brand_id: brandId,
    category_id: categoryId,
    sku,
    barcode,
    purchase_price: purchasePrice,
    sale_price: salePrice,
    discount_price: discountPrice,
    tax_rate_id: taxRateId,
    status,
    is_published: isPublished,
    seo_title: seoTitle,
    seo_description: seoDescription,
  });
}

async function createProductVariant(productId, data) {
  const { sku, barcode, salePrice, discountPrice, weight, desi, isActive } = data;

  return insert('product_variants', {
    product_id: productId,
    sku,
    barcode,
    sale_price: salePrice,
    discount_price: discountPrice,
    weight,
    desi,
    is_active: isActive !== false,
  });
}

async function getStock(variantId, warehouseId) {
  return queryOne(
    'SELECT * FROM stock WHERE variant_id = $1 AND warehouse_id = $2',
    [variantId, warehouseId]
  );
}

async function updateStock(variantId, warehouseId, quantity) {
  const existing = await getStock(variantId, warehouseId);

  if (existing) {
    return update('stock', existing.id, { quantity });
  } else {
    return insert('stock', {
      variant_id: variantId,
      warehouse_id: warehouseId,
      quantity,
    });
  }
}

async function close() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

module.exports = {
  getPool,
  initSchema,
  query,
  queryOne,
  queryAll,
  insert,
  update,
  deleteRow,
  close,
  // Definitions helpers
  getBrands,
  createBrand,
  updateBrand,
  getCategories,
  createCategory,
  getProperties,
  getPropertyValues,
  createProperty,
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
};
