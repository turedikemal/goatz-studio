# Goatz Studio CMS

Ürün çekimi + web tasarım hizmetleri için **tam özellikli, zero-dependency CMS** — Slush.app tarzı animasyonlarla birlikte.

**Live:** https://thegoatzstudio.com (henüz deploy edilmedi)

---

## ✨ Özellikler

### 🎛️ Panel (Admin)
- **Görsel düzenleme:** Tüm metin, renk, görsel, animasyon — panelden kontrol et
- **✍️ Metin stilleri:** 15 Google font, boyut, kalınlık, harf/satır aralığı, renk, BÜYÜK HARF, eğik, çizgi
- **📦 Blok türleri:** Text, Image+Text, Cards (sticker + başlık), Gallery (lightbox ile)
- **📄 Sayfalar:** Sınırsız sayfa, otomatik slug üretimi (Türkçe destekli)
- **🖱️ Sürükle-bırak:** Bölümleri ve sayfaları tutup sürükleyerek sırala
- **📸 Görsel yönetimi:** PNG, JPG, WebP, GIF yükle, auto-crop
- **💾 Otomatik yedekleme:** 30 yedek dosyası, herhangi birine geri dön
- **⚡ Canlı önizleme:** Slider sürüklerken hiç gecikme (DOM patching)
- **🔐 Oturum:** Password-protected, HttpOnly cookies, brute-force koruması

### 🎨 Site
- **🎬 Slush.app tarzı animasyonlar:**
  - Harf açılır (sağdan sola)
  - Sticker'lar süzülüp sallanır (drift + flavor animations)
  - Kartlar 3D uçarak gelir
  - Parallax (yazılar sabit, görseller kaymış)
  - Tab crossfade (flickersiz geçiş)
  - Kayan şerit (scroll yönüne göre hız değişir)
- **📱 Responsive:** Mobile, tablet, desktop
- **🎨 Tema:** 9 pastel renk + custom palette
- **🔍 SEO:** Sitemap.xml, robots.txt, OpenGraph, per-page meta
- **🌐 Multi-language:** Türkçe (extensible)
- **⚡ Fast:** Zero framework, vanilla JS/CSS
- **🖼️ Galeri:** Lightbox, ok tuşları, Escape kapanır

---

## 🚀 Hızlı Başlangıç

### Local Kurulum

```bash
git clone https://github.com/yourusername/goatz-studio.git
cd goatz-studio
npm install
ADMIN_PASSWORD=test npm start
```

Açılacak:
- **Site:** http://localhost:5173
- **Panel:** http://localhost:5173/admin (şifre: `test`)

### Environment Variables

`.env` oluştur (`.env.example` bak):
```env
ADMIN_PASSWORD=güçlü-şifre-buraya
PORT=5173
```

---

## 📖 Dokümantasyon

- **[SETUP.md](SETUP.md)** — Kurulum, panel kullanımı, production deployment
- **[ARCHITECTURE.md](ARCHITECTURE.md)** — Teknik detaylar, sistem tasarımı, mimari

---

## 📁 Dosya Yapısı

```
goatz-studio/
├── server.js                  # HTTP sunucu + API
├── lib/
│   ├── render.js              # HTML şablon motor
│   ├── content.js             # Disk I/O + yedekleme
│   ├── schema.js              # İçerik doğrulama
│   └── default-content.js     # Varsayılan yapı
├── public/
│   ├── admin.html/js/css      # Panel arayüzü
│   ├── site.html/js/css       # Site arayüzü
│   └── sprites.svg            # Sticker SVG'ler
├── data/
│   ├── content.json           # Canlı içerik
│   ├── backups/               # Otomatik yedekler
│   └── uploads/               # Yüklenen görseller
├── package.json
├── SETUP.md                   # Kurulum rehberi
└── ARCHITECTURE.md            # Teknik detaylar
```

---

## 🎯 Panel Bölümleri

| Bölüm | İçerik |
|---|---|
| **Genel** | — |
| Renkler ve stil | 9 pastel renk, köşe yuvarlaklıkları, animasyon şiddeti |
| Hareketler | Scroll triggers, giriş animasyonları, idle motions |
| Marka ve SEO | Site adı, logo, description, OG tags |
| Bölüm sırası | Bölümleri sırala, gizle/göster |
| **Sayfalar** | Özel sayfalar + bloklar (text/image/cards/gallery) |
| **Ana Sayfa** | Sitedeki sıra — kayan şerit, menü, bölümler, footer |
| **Araçlar** | Medya kütüphanesi, yedekler |

### Metin Stilleri
Her metin alanında **Aa Yazı stili** düğmesi:
- Font (15 Google), boyut, kalınlık
- Harf/satır aralığı, yatay/dikey hizalama
- Renk, BÜYÜK HARF, eğik, altı çizili

### Sayfalar
1. **Yeni sayfa:** `+ Yeni sayfa` tıkla
2. **Slug:** Başlıktan otomatik (Türkçe support)
3. **Bloklar:** Text, Image+Text, Cards, Gallery ekle
4. **SEO:** Başlık, description, Open Graph
- **Süzülme hissi:** Sticker'lar yavaş, geniş ve her biri farklı ritimde sürekli süzülür (referans sitedeki Lottie sticker'larının karşılığı), üstüne gelince tur atar. Vitrin kartları ağırlıksız salınır, kurdele çok yavaş nefes alır. Sticker'lar, kartlar ve görseller (yazılar hariç) kaydırırken farklı hızlarda kayar.
- **Menü linkleri** aşağı kaydırınca sırayla yukarı uçar, yukarı kaydırınca geri gelir.
- **Kayan bantlar** kaydırma yönü değişince ters döner. **Süreç sekmelerinde** siyah arka plan sekmeler arasında kayar, içerik soldan kayarak değişir; bölüm görününce ikinci sekme kendiliğinden açılır. **Renkli kartlar** 4 saniyede bir ilerler.
- **Yumuşak kaydırma** [Lenis](https://github.com/darkroomengineering/lenis) kütüphanesiyle yapılır ve jsDelivr CDN'inden yüklenir; yüklenemezse site normal kaydırmayla çalışır.

Hız (%25–300) ve şiddet (%0–200) ayarlanabilir. `prefers-reduced-motion` açık olan cihazlarda hiçbir hareket oynatılmaz. Panel önizlemesinde açılış ve belirme animasyonları oynatılmaz; onları gerçek sitede görürsün.

### Sayfalar ve bloklar

Sol menüdeki **Sayfalar** grubunda **+ Yeni sayfa** ile istediğin kadar (en fazla 30) sayfa açarsın. Her sayfanın kendi adresi (`/hakkimizda`), Google başlığı ve açıklaması vardır; sayfa adından otomatik ya da elle yazılan adres kullanılır; "Sitenin menüsüne ekle" işaretliyse menüde görünür (sırayı oklarla değiştirirsin). Sayfayı gizleyebilir, kopyalayabilir, silebilirsin. Butonların hedef listesine sayfalar kendiliğinden eklenir. `/sitemap.xml` ve `/robots.txt` otomatik üretilir.

Her sayfa bir üst başlık bölümü (dev başlık, alt yazı, kurdele, sticker'lar) ve istediğin sırada **bloklardan** oluşur:

| Blok | İçerik |
|---|---|
| Başlık ve metin | Küçük üst yazı, başlık, paragraflar (boş satır = yeni paragraf), buton; sola ya da ortalı |
| Görsel + metin | Görsel solda ya da sağda, başlık, metin, buton |
| Kart ızgarası | 1–4 sütun renkli kart (sticker ya da fotoğraflı) |
| Galeri | 1–5 sütun, dört görsel oranı, toplu yükleme, tıklayınca büyür (ok tuşlarıyla gezilir) |

Bütün metinlerde **Aa Yazı stili** ve bloklarda arka plan rengi vardır. Ana sayfanın bölümleri eskisi gibi düzenlenir.

### Logo

**Marka ve SEO** sayfasında logo görseli yüklenir; boyutu (24–160 px) ve çerçevesi (yuvarlak / yuvarlatılmış kare / çerçevesiz) ayarlanır. İsteğe bağlı **Logoyu temaya uydur** seçeneği vardır: varsayılanı "olduğu gibi"dir; "sticker gibi" beyaz kenar ve siyah kontur ekler, "tek renge boya" logoyu paletten seçilen renkte silüet yapar (şeffaf zeminli PNG / WEBP / SVG'lerde düzgün çalışır).

### Canlı önizleme

Önizleme tarayıcıda üretilir (`/render-bundle.js`, sunucudaki şablonla aynı dosya) ve sayfa yenilenmeden yalnızca değişen yerler işlenir. Bu yüzden kaydırıcıyı sürüklerken önizleme aynı karede güncellenir.

Değişiklikler sağdaki canlı önizlemede anında görünür, **Kaydet**'e basınca (veya Cmd/Ctrl + S) siteye yansır.

## Dosyalar

```
server.js              Sunucu, giriş, kaydetme, görsel yükleme
lib/default-content.js Başlangıç içeriği (içeriğin yapısı da buradan gelir)
lib/content.js         İçeriği okuma, doğrulama, kaydetme ve yedekleme
lib/render.js          Sitenin HTML şablonu
public/                Site stili, site scripti, panel, sticker çizimleri
data/                  Kaydedilen içerik, yedekler ve yüklenen görseller (git'e girmez)
```

## Yayına alma (Railway örneği)

1. Projeyi Railway'e yükle. Başlatma komutu: `npm start`.
2. **Variables** kısmına ekle:
   - `ADMIN_PASSWORD`: uzun, tahmin edilemez bir şifre (yereldekinden farklı olsun)
   - `DATA_DIR`: `/data`
3. Servise bir **Volume** ekle ve `/data` yoluna bağla. Bunu yapmazsan her yeni yayında panelde yaptığın değişiklikler ve yüklediğin görseller silinir.
4. Alan adını (thegoatzstudio.com) servise bağla.
---

## 🚢 Production Deployment

### Railway

1. GitHub repo'nu bağla
2. Environment variable: `ADMIN_PASSWORD=...`
3. Volume ekle: `/data` (persistent)
4. Deploy otomatik olur

### Self-hosted

```bash
npm install
ADMIN_PASSWORD=... PORT=3000 node server.js
```

Nginx reverse proxy + SSL:
```nginx
server {
  listen 443 ssl http2;
  server_name thegoatzstudio.com;
  location / {
    proxy_pass http://localhost:3000;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

---

## 🔐 Güvenlik

- **Password hashing:** SHA256 (timing-safe)
- **HttpOnly cookies:** JS erişimi yok
- **CSRF protection:** SameSite=Strict
- **File validation:** Magic number kontrol
- **Brute-force:** 10 deneme → 15 dakika bekleme

**Production checklist:**
- [ ] Uzun, güçlü ADMIN_PASSWORD
- [ ] HTTPS/SSL enabled
- [ ] Rate limiting (proxy layer)
- [ ] Regular backups

---

## 🛠️ Katkı

Hatalar, öneriler, PR'lar hoş geldi!

```bash
git checkout -b feature/something
# yapma...
git commit -m "Add: something cool"
git push origin feature/something
```

---

## 📜 Lisans

MIT

---

## 👤 Kişi

**Kemal Turedi** — turedikemal@gmail.com

The Goatz Studio — Ürün çekimi + Web tasarım

---

**Yapma cevapla, paylaşarak yardım et!** ⭐
