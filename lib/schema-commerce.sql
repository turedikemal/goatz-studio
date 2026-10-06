-- Goatz Studio E-Ticaret Şeması
-- PostgreSQL 12+

-- Markalar
CREATE TABLE IF NOT EXISTS brands (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  logo_url VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Kategoriler
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  parent_id INTEGER REFERENCES categories(id),
  description TEXT,
  icon VARCHAR(100),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Varyant Türleri (properties tablosu) - Renk, Beden, vb. input_type: select/text = Liste, color = Renk / Görsel
CREATE TABLE IF NOT EXISTS properties (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  input_type VARCHAR(50) DEFAULT 'select', -- select, text, number, color
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Özellik Değerleri - Siyah, Beyaz, S, M, L, vb.
CREATE TABLE IF NOT EXISTS property_values (
  id SERIAL PRIMARY KEY,
  property_id INTEGER NOT NULL REFERENCES properties(id),
  value VARCHAR(255) NOT NULL,
  color_hex VARCHAR(7), -- Renk özelliği için
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(property_id, value)
);

-- Varyant türü değeri için görsel (Renk / Görsel seçim stili)
ALTER TABLE property_values ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Depolar
CREATE TABLE IF NOT EXISTS warehouses (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  slug VARCHAR(255) NOT NULL UNIQUE,
  address TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vergi Oranları
CREATE TABLE IF NOT EXISTS tax_rates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  rate DECIMAL(5, 2) NOT NULL, -- 20.00 for 20%
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Kargo Şirketleri
CREATE TABLE IF NOT EXISTS shipping_providers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  code VARCHAR(50) NOT NULL UNIQUE,
  api_url VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ödeme Yöntemleri
CREATE TABLE IF NOT EXISTS payment_methods (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  code VARCHAR(50) NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ürünler
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  brand_id INTEGER REFERENCES brands(id),
  category_id INTEGER REFERENCES categories(id),
  sku VARCHAR(100),
  barcode VARCHAR(100),
  purchase_price DECIMAL(12, 2),
  sale_price DECIMAL(12, 2) NOT NULL,
  discount_price DECIMAL(12, 2),
  tax_rate_id INTEGER REFERENCES tax_rates(id),
  status VARCHAR(50) DEFAULT 'draft', -- draft, active, archived
  is_published BOOLEAN DEFAULT false,
  seo_title VARCHAR(255),
  seo_description TEXT,
  seo_keywords TEXT,
  weight DECIMAL(8, 3),
  desi DECIMAL(8, 3),
  images JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ürün etiketleri (müşteri etiketlerinden ayrı)
CREATE TABLE IF NOT EXISTS product_tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE products ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';

-- Ürün Varyantları
CREATE TABLE IF NOT EXISTS product_variants (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name VARCHAR(255),
  sku VARCHAR(100) NOT NULL UNIQUE,
  barcode VARCHAR(100),
  sale_price DECIMAL(12, 2),
  discount_price DECIMAL(12, 2),
  weight DECIMAL(8, 3), -- kg
  desi DECIMAL(8, 3),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Varyant Özellik Değerleri
CREATE TABLE IF NOT EXISTS variant_properties (
  id SERIAL PRIMARY KEY,
  variant_id INTEGER NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  property_id INTEGER NOT NULL REFERENCES properties(id),
  property_value_id INTEGER NOT NULL REFERENCES property_values(id),
  UNIQUE(variant_id, property_id)
);

-- Stok
CREATE TABLE IF NOT EXISTS stock (
  id SERIAL PRIMARY KEY,
  variant_id INTEGER NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
  quantity INTEGER DEFAULT 0,
  reserved INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(variant_id, warehouse_id)
);

-- Stok Hareketleri (Audit)
CREATE TABLE IF NOT EXISTS stock_movements (
  id SERIAL PRIMARY KEY,
  variant_id INTEGER NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
  quantity_change INTEGER NOT NULL,
  movement_type VARCHAR(50), -- in, out, adjustment, reservation
  reference_id INTEGER, -- Sipariş ID vb.
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_variant ON stock(variant_id);
CREATE INDEX IF NOT EXISTS idx_stock_warehouse ON stock(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);

-- ===== Müşteriler =====
CREATE TABLE IF NOT EXISTS customer_tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  color VARCHAR(20) DEFAULT '#e9ccff',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(120) NOT NULL,
  last_name VARCHAR(120),
  email VARCHAR(255),
  phone VARCHAR(50),
  company VARCHAR(255),
  tax_no VARCHAR(50),
  tax_office VARCHAR(120),
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  accepts_marketing BOOLEAN DEFAULT false,
  addresses JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_email ON customers (LOWER(email)) WHERE email IS NOT NULL AND email <> '';

-- ===== İndirimler =====
CREATE TABLE IF NOT EXISTS coupons (
  id SERIAL PRIMARY KEY,
  code VARCHAR(60) NOT NULL UNIQUE,
  description TEXT,
  type VARCHAR(20) NOT NULL DEFAULT 'percent',
  value DECIMAL(12, 2) DEFAULT 0,
  min_order_total DECIMAL(12, 2) DEFAULT 0,
  max_uses INTEGER,
  used_count INTEGER DEFAULT 0,
  starts_at TIMESTAMP,
  ends_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS campaigns (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(20) NOT NULL DEFAULT 'percent',
  value DECIMAL(12, 2) NOT NULL DEFAULT 0,
  scope VARCHAR(20) NOT NULL DEFAULT 'all',
  scope_ids INTEGER[] DEFAULT '{}',
  min_order_total DECIMAL(12, 2) DEFAULT 0,
  starts_at TIMESTAMP,
  ends_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===== Siparişler =====
CREATE SEQUENCE IF NOT EXISTS order_no_seq START 1001;

CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  order_no INTEGER NOT NULL UNIQUE DEFAULT nextval('order_no_seq'),
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  customer_name VARCHAR(255),
  customer_email VARCHAR(255),
  customer_phone VARCHAR(50),
  channel VARCHAR(40) DEFAULT 'manual',
  status VARCHAR(30) NOT NULL DEFAULT 'received',
  payment_status VARCHAR(30) NOT NULL DEFAULT 'pending',
  payment_method VARCHAR(60),
  shipping_address JSONB DEFAULT '{}',
  carrier VARCHAR(80),
  tracking_no VARCHAR(120),
  shipped_at TIMESTAMP,
  delivered_at TIMESTAMP,
  invoice_no VARCHAR(60),
  invoice_date TIMESTAMP,
  subtotal DECIMAL(12, 2) DEFAULT 0,
  discount_total DECIMAL(12, 2) DEFAULT 0,
  shipping_total DECIMAL(12, 2) DEFAULT 0,
  tax_total DECIMAL(12, 2) DEFAULT 0,
  total DECIMAL(12, 2) DEFAULT 0,
  coupon_code VARCHAR(60),
  notes TEXT,
  stock_restored BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  variant_id INTEGER REFERENCES product_variants(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(12, 2) NOT NULL,
  discount_unit DECIMAL(12, 2) DEFAULT 0,
  campaign_name VARCHAR(255),
  tax_rate DECIMAL(5, 2) DEFAULT 0,
  line_total DECIMAL(12, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS order_events (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  type VARCHAR(40),
  message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS order_returns (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'requested',
  reason VARCHAR(120),
  note TEXT,
  items JSONB DEFAULT '[]',
  refund_amount DECIMAL(12, 2) DEFAULT 0,
  restocked BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS saved_filters (
  id SERIAL PRIMARY KEY,
  scope VARCHAR(40) NOT NULL,
  name VARCHAR(120) NOT NULL,
  filter JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_events_order ON order_events(order_id);


-- SEO kartı (ürün ve kategori): slug mevcut slug sütunudur
ALTER TABLE products ALTER COLUMN seo_title TYPE TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_noindex BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_canonical TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS seo_title TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS seo_description TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS seo_noindex BOOLEAN DEFAULT false;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS seo_canonical TEXT;
