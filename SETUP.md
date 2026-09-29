# Kurulum & Başlangıç

## Gereksinimler
- Node.js 18+
- npm

## Local Kurulum

```bash
git clone https://github.com/yourusername/goatz-studio.git
cd goatz-studio
npm install
```

## Çalıştırma

**Local development (5173 portu):**
```bash
npm start
```

Açılacak:
- **Site:** http://localhost:5173
- **Panel:** http://localhost:5173/admin (şifre: `1544`)

## Ortam Değişkenleri

`.env` dosyası oluştur (`.env.example` bak):

```env
ADMIN_PASSWORD=güçlü-şifre-koy-buraya
PORT=5173
```

**Production'da kesinlikle uzun, karmaşık bir şifre kullan!**

## Panel Kullanımı

### Bölümleri Yönet
1. **Sıra:** Sol menüde bölüme gelip tutup sürükle
2. **Gizle:** "Bu bölümü sitede göster" toggle'ını kapat
3. **Renk:** Her bölümün arka plan rengini seç

### Metin Stilleri
Her metin alanı için **Aa Yazı stili** var:
- Font, boyut, kalınlık
- Harf aralığı, satır aralığı
- Hizalama, renk, BÜYÜK HARF, eğik, çizgi

### Sayfalar
- **Yeni sayfa:** Sol menüde "+ Yeni sayfa"
- **Bloklar:** Text, Image+Text, Cards, Gallery
- **Slug:** Başlıktan otomatik ya da elle
- **SEO:** Başlık, açıklama, Open Graph

### Görseller
- Yükle: PNG, JPG, WebP, GIF (max 8 MB)
- Gallery'de bir tıkla açılır, ok tuşlarıyla gezilir

## Production Deployment

### Railway'e Yükleme

1. **Railway account:** railway.app'de giriş yap
2. **Repo bağla:** GitHub repo'nu Railway'e bağla
3. **Volume oluştur:** `/data` için persistent volume ekle
4. **ADMIN_PASSWORD:** Environment variable olarak uzun bir şifre koy
5. **Deploy:** Push ettiğinde otomatik deploy olur

**Örnek Dockerfile** (`railway.app` için, isteğe bağlı):
```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["node", "server.js"]
```

### Alan Adı Bağlama
1. Railway'de Custom Domain ekle
2. DNS ayarlarında CNAME ya da A record ekle
3. ~5 dakikada live olur

---

## Geliştirme

### Dosya Yapısı
```
goatz-studio/
├── server.js              # HTTP sunucu, API, oturum
├── lib/
│   ├── render.js          # HTML şablon (sunucu + tarayıcı)
│   ├── content.js         # JSON okuma/yazma, yedekleme
│   ├── schema.js          # İçerik doğrulama
│   └── default-content.js # Varsayılan yapı
├── public/
│   ├── admin.html/js/css  # Panel arayüzü
│   ├── site.html/js/css   # Site arayüzü
│   └── sprites.svg        # Sticker'lar
└── data/
    ├── content.json       # Canlı içerik
    ├── backups/           # Otomatik yedekler (30'lu rotasyon)
    └── uploads/           # Yüklenen görseller
```

### Sunucu Rotaları
- `GET /` — Ana sayfa
- `GET /admin` — Panel
- `GET /:slug` — Özel sayfa
- `POST /api/login` — Giriş
- `GET /api/content` — İçerik getir
- `PUT /api/content` — İçerik kaydet
- `POST /api/upload` — Görsel yükle
- `GET /sitemap.xml` — SEO sitemap
- `GET /robots.txt` — Robot direktifleri

### İçerik Şeması
`lib/default-content.js`'de varsayılan yapı tanımlı. Yeni alan eklemek:

1. `DEFAULT_CONTENT`'e alan ekle
2. `lib/schema.js`'de `conform()` otomatik doğrulama yapar
3. `lib/render.js`'de HTML şablonuna ekle
4. `public/admin.js`'de form alanı ekle

---

## Sorun Giderme

### "Panel şifresi ayarlanmamış"
```bash
ADMIN_PASSWORD=test npm start
```

### Yedekleme çalışmıyor
`data/` klasörü yazılabilir olduğundan emin ol:
```bash
chmod -R 755 data/
```

### Görseller yüklenmiyor
- File size 8 MB'dan büyük mü?
- PNG, JPG, WebP, GIF mi?
- Magic number doğrulaması başarısız mı → dosya bozuk olabilir

---

## Katılım
Pull request'ler hoş geldi! Büyük değişiklikler için öncesinde issue aç.

## Lisans
MIT
