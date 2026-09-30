# Goatz Studio E-Ticaret Modülü - Veritabanı Kurulumu

## Genel Bakış

Goatz Studio CMS, e-ticaret özelliklerini PostgreSQL veritabanı üzerinde çalıştırır. Mevcut tema ve sayfa editörü (`content.json`) değişmeden kalır.

## Railway'de PostgreSQL Kurulumu

### 1. Railway Projesi Oluştur
```bash
railway init
```

### 2. PostgreSQL Ekleme
Railway dashboard'da:
1. **+ New** → **Database** → **PostgreSQL** seç
2. Veritabanı otomatik oluşturulur

### 3. Ortam Değişkeni (Env Var)
Railway otomatik olarak `DATABASE_URL` ekler. Kontrol et:
```bash
railway variables
```

Çıktı şöyle görünmelidir:
```
DATABASE_URL=postgresql://user:password@host:port/dbname
```

### 4. Uygulamayı Deploy Edin
```bash
railway up
```

Veritabanı şeması otomatik olarak ilk startup'ta oluşturulur.

---

## Yerel Geliştirme (PostgreSQL Kurulu Varsa)

### 1. PostgreSQL Başlat
```bash
# macOS (Homebrew)
brew services start postgresql

# Linux
sudo systemctl start postgresql

# Windows
# PostgreSQL Windows hizmeti başlatıcı kullan
```

### 2. Veritabanı Oluştur
```bash
createdb goatz
```

### 3. .env Dosyası Oluştur
```bash
cp .env.example .env
```

Dosyayı düzenle:
```
DATABASE_URL=postgresql://localhost/goatz
ADMIN_PASSWORD=1544
```

### 4. Sunucu Başlat
```bash
npm install  # pg paketini yükle
npm start    # veya: npm run dev
```

Şema otomatik oluşturulur.

---

## İçindekiler

### Markalar (Brands)
- Ürün markaları
- Logo, açıklama
- Slug (URL-safe isim)

### Kategoriler (Categories)
- Ürün kategorileri
- Hiyerarşik (alt kategoriler)
- Ikon, açıklama

### Özellikler (Properties)
- Renk, Beden, vb.
- Değer listeleri

### Vergi Oranları (Tax Rates)
- KDV %20, %10, vb.
- Ürünlere atanır

### Depolar (Warehouses)
- Stok konumları
- Varsayılan depo

### Ürünler (Products)
- Ürün bilgileri
- Kategori, marka, fiyat
- Durum: draft, active, archived

### Varyantlar (Variants)
- Ürün varyasyonları (Renk + Beden)
- Kendi SKU ve stok

### Stok (Stock)
- Depo başına varyant miktarları
- Hareketleri (audit log)

---

## API Endpoints

Panelden otomatik olarak çağrılır. Manuel test için:

### Markalar
```bash
# Tüm markalar
curl -H "Cookie: gs_session=TOKEN" http://localhost:5173/api/definitions/brands

# Marka ekle
curl -X POST http://localhost:5173/api/definitions/brands \
  -H "Content-Type: application/json" \
  -H "Cookie: gs_session=TOKEN" \
  -d '{"name": "Apple", "slug": "apple"}'

# Marka sil
curl -X DELETE http://localhost:5173/api/definitions/brands/1 \
  -H "Cookie: gs_session=TOKEN"
```

### Kategoriler, Özellikler, vb. Benzer şekilde

---

## Veritabanı Şeması

Şema `lib/schema-commerce.sql`'de tanımlanmıştır.

Tüm tablolar:
- `brands` - Markalar
- `categories` - Kategoriler (hiyerarşik)
- `properties` - Özellik türleri
- `property_values` - Özellik değerleri
- `warehouses` - Depolar
- `tax_rates` - Vergi oranları
- `shipping_providers` - Kargo firmaları
- `payment_methods` - Ödeme yöntemleri
- `products` - Ürünler
- `product_variants` - Varyantlar
- `variant_properties` - Varyant özellikleri
- `stock` - Stok miktarları
- `stock_movements` - Stok hareketi geçmişi

---

## Sorun Giderme

### "DATABASE_URL not set"
```bash
# Railway'de
railway variables set DATABASE_URL postgresql://...

# Yerel'de
echo 'DATABASE_URL=postgresql://localhost/goatz' >> .env
```

### "Bağlantı reddedildi"
- PostgreSQL servisinin çalışıp çalışmadığını kontrol et
- `DATABASE_URL` doğru mu?
- Firewall/güvenlik duvarı engellemiyor mu?

### "Tablo bulunamadı"
Şema oluşturulmamış. Sunucuyu yeniden başlatarak düzeltilir:
```bash
npm start
```

---

## Geliştirme Aşamaları

1. ✅ Phase 1: Altyapı ve Veritabanı
2. ⏳ Phase 2: Tanımlamalar (Brands, Categories, Properties)
3. ⏳ Phase 3: Ürün ve Stok
4. ⏳ Phase 4: Mağaza ve Sepet
5. ⏳ Phase 5: Sipariş Operasyonu
6. ⏳ Phase 6: Ödeme ve Entegrasyonlar
7. ⏳ Phase 7: Pazarlama ve Raporlar
8. ⏳ Phase 8: Pazaryerleri

Mevcut durumu görmek için: `/admin` → Tanımlamalar sekmesi
