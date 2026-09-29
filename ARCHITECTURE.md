# Mimari & Teknik Detaylar

## Sistem Tasarımı

```
┌─────────────────────────────────────────────┐
│           Tarayıcı (Client)                  │
├─────────────────────────────────────────────┤
│  Admin Panel (/admin)      Site (/index)    │
│  ├─ admin.html/js/css      ├─ site.html    │
│  ├─ Canlı önizleme (iframe)│ ├─ site.js    │
│  ├─ Sürükle-bırak menu     │ └─ site.css   │
│  └─ Form controls          └─ Animasyonlar │
│                                              │
│  API Requests → /api/* (JSON)                │
└─────────────────────────────────────────────┘
           ↕ HTTPS/HTTP
┌─────────────────────────────────────────────┐
│      Node.js HTTP Server (server.js)        │
├─────────────────────────────────────────────┤
│  Oturum Yönetimi (Session + Cookie)        │
│  ├─ SHA256 password hashing                 │
│  ├─ HttpOnly SameSite cookies               │
│  └─ 7 günlük session TTL                    │
│                                              │
│  API Rotaları                               │
│  ├─ POST /api/login → token                 │
│  ├─ GET/PUT /api/content → JSON             │
│  ├─ POST /api/upload → base64 → disk        │
│  └─ GET /api/backups → yedekler            │
│                                              │
│  HTML Üretim (lib/render.js)               │
│  ├─ Sunucu: Node.js → HTML dizesi          │
│  └─ Tarayıcı: /render-bundle.js → VDOM    │
│                                              │
│  İçerik Layer (lib/content.js)             │
│  ├─ Okuma: data/content.json                │
│  ├─ Yazma: atomic write                     │
│  └─ Yedekleme: 30'lu rotasyon               │
└─────────────────────────────────────────────┘
           ↕ Dosya Sistemi
┌─────────────────────────────────────────────┐
│          Disk (data/)                       │
├─────────────────────────────────────────────┤
│  ├─ content.json (canlı içerik)            │
│  ├─ backups/ (30 yedek dosyası)            │
│  └─ uploads/ (yüklenen görseller)          │
└─────────────────────────────────────────────┘
```

---

## Temel Bileşenler

### 1. server.js
**Sorumluluğu:** HTTP sunucusu, routing, güvenlik

**Oturum Sistemi:**
- Cookie: `gs_session` (HttpOnly, SameSite=Strict)
- Token: 32-byte random hex
- Hash: SHA256 (timing-safe comparison)
- Brute-force koruması: 10 deneme → 15 dakika bekleme

**API Endpoints:**
```
POST /api/login           # Oturum aç
POST /api/logout          # Oturum kapat
GET  /api/content         # İçeriği getir
PUT  /api/content         # İçeriği kaydet
POST /api/upload          # Görsel yükle
DELETE /api/uploads/:name # Görsel sil
GET  /api/backups         # Yedekleri listele
GET  /api/backups/:id     # Yedek getir
GET  /sitemap.xml         # SEO sitemap
GET  /robots.txt          # Robot direktifleri
GET  /:slug               # Sayfa render
```

**Güvenlik:**
- NOSNIFF header (MIME sniffing önleme)
- Strict-Origin-When-Cross-Origin referrer policy
- Base64 image validation (magic number kontrol)
- Safe file path joining (directory traversal önleme)
- Max upload: 8 MB

---

### 2. lib/render.js
**Sorumluluğu:** HTML şablon motor (server + browser)

**Dual Render:**
```javascript
// Sunucu tarafında
const html = render(content);  // Node.js → HTML string

// Tarayıcıda (panel preview)
const html = window.GoatzRender.render(content);  // VDOM → HTML
```

**Şablon Yapısı:**
- `S.hero(content)` — Başlık + sticker'lar + kayan şerit
- `S.showcase(content)` — Vitrin kartları
- `S.statement(content)` — Büyük yazı
- `S.services(content)` — Hizmet satırları
- `S.cards(content)` — Kartlar (sticker + başlık)
- `S.band(content)` — Etiket bandı (3 sıra, tilt animation)
- `S.process(content)` — Sekme panel
- `S.contact(content)` — İletişim formu
- `S.footer(content)` — Alt bilgi + dev yazı (auto-fit)
- `B.*` — Blok renderers (text, imagetext, cards, gallery)

**İçerik Doğrulama:**
```javascript
// Gelen veri → şablon → doğrulanmış çıktı
conform(template, userInput);
// Bilinmeyen alanlar → atılır
// Yanlış tip → varsayılan
// Eksikler → tamamlanır
```

**Sticker Sistemi:**
```javascript
// Sprite SVG'den seçilen sticker'ları HTML'e embed eder
stickerTag(sticker, i, className, driftOffset);
// output: <svg class="sticker idle-on" data-pop data-par="...">...</svg>
```

---

### 3. lib/content.js
**Sorumluluğu:** Disk I/O, yedekleme, veri kalıcılığı

**Okuma:**
```javascript
const data = load();  // content.json → JS object
// withPages() otomatik sayfa adreslerini çözer
```

**Yazma (Atomic):**
```javascript
save(newData);
// 1. Temporary file yaz
// 2. Atomic rename → content.json
// 3. Yedek oluştur (timestamp)
// 4. Eski yedekleri sil (30 dosya tutulur)
```

**Yedekleme:**
- Dosya adı: `content-2026-09-29T18-41-51-891Z.json`
- Otomatik: Her save'de yeni yedek
- Saklama: 30 son dosya, eski olanlar silinir
- Restore: API `/api/backups/:id`

---

### 4. lib/schema.js
**Sorumluluğu:** İçerik şeması, doğrulama, slug üretimi

**conform() Fonksiyonu:**
```javascript
// Template ile veriyi karşılaştırır, geçerli hale getirir
conform({
  title: 'Başlık',
  blocks: [{ type: 'text', text: '' }]
}, userInput);

// Kural:
// - Array template → array input (veya clone template)
// - Object template → object input (unknown keys dropped)
// - Eksik key → default value
// - Type mismatch → default type
```

**Slug Üretimi:**
```javascript
slugify('Hakkımızda');          // → 'hakkimizda' (ç/ğ/ı dönüştür)
slugify('Proje 1');             // → 'proje-1'
resolvePages(pages);             // Tüm sluglar unique, valid
// Rezerve kelimeler: 'admin', 'api', 'uploads', 'sitemap' vb.
// Çakışma → '-2', '-3' eklenirişi
```

**TEXT_STYLE:**
```javascript
{
  font: '',      // Google Font name
  size: '',      // '16px', '2rem', 'clamp(14px, 2vw, 20px)'
  weight: '',    // '400', '700'
  italic: '',    // '1' (true) ya da '' (false)
  upper: '',     // 'uppercase' ya da ''
  underline: '', // '1' (true) ya da ''
  tracking: '',  // 'letter-spacing: ...'
  leading: '',   // 'line-height: ...'
  align: '',     // 'left', 'center', 'right'
  valign: '',    // 'top', 'middle', 'bottom'
  color: ''      // '#fff', 'var(--sky)' vb.
}
```

---

### 5. lib/default-content.js
**Sorumluluğu:** Varsayılan değerler, şablon yapısı

**İçerik Örneği:**
```javascript
{
  theme: {
    colors: { paper: '#fff', sky: '#...', ... },
    logoText: 'GOATZ',
    ...
  },
  brand: { siteName: '...',  email: '...', ... },
  sections: [
    { id: 'hero', visible: true },
    { id: 'showcase', visible: true },
    ...
  ],
  pages: [],  // Kullanıcı tarafından oluşturulan
  footer: { ... }
}
```

---

## Panel Mimarisi (public/admin.js)

### State Management
```javascript
const state = load();  // /api/content → JS object
const page = { custom: false, id: 'hero' };  // Seçili sayfa

// Herhangi bir değişiklik:
changed() → updateStatus('● Kaydedilmemiş değişiklikler')
        → patchNode(preview, newHtml)  // DOM diffing
        → refreshPreview()  // Canlı önizleme güncelle
```

### Form Rendering
```javascript
const field = (key, def, value) => {
  // def = {type, label, hint, options, ...}
  // type: 'text', 'textarea', 'color', 'select', 'checkbox', 'number'
  // render → input element
  // onChange → state[key] = newValue → changed()
}

const customDef = (page) => {
  // Özel sayfa → PAGES_SCHEMA temelinde form
  // title, slug, visible, inNav, blocks[], vb.
}
```

### Preview Update (DOM Patching)
```javascript
// iframe içinde eski HTML → yeni HTML
patchNode(oldEl, newEl);
// Fark: transform, translate, opacity vb. kontrol eder
// Slider sürüklerken hiç yenileme yok (smooth)
```

### Sürükle-Bırak (dragSort)
```javascript
dragSort(rowEl);  // Etkinleştir
// pointerdown → cursor grab
// pointermove → translateY + diğerleri shift
// pointerup → array.sort() → changed()
```

---

## Site Animasyonları (public/site.js)

### Motion System

**1. Giriş Animasyonları (scroll trigger)**
```javascript
// Letter reveal: sağdan sola
// Sticker pop: scale 0 + rotate -90° → scale 1 + rotate 0°
// Card fly-in: translateY(40%) + scale(0.75) + opacity(0)
```

**2. Idle Animasyonlar (sürekli)**
```javascript
// drift: 8-13 sn, position + rotate
// flavor-camera: bob + scale
// flavor-coin: width/height nefes
// flavor-check: pulse scale
// flavor-star: float scale

// Hex offset: performance.now() % 9000 → deterministic
```

**3. Parallax**
```javascript
// data-par="dx,dy" → y kaydırması sırasında offset
// --py CSS var: scroll progress % → transform
// Yazılar sabit, görsel/sticker'lar arka planda kaymış görünür
```

**4. Tab Crossfade**
```javascript
// Old panel: z:1, opacity:1
// New panel: z:2, opacity:0 → opacity:1 (0.22s)
// onfinish: old hidden
// Hiç flicker yok, smooth transition
```

---

## SEO & Multi-Page

### Slug Sistemi
```javascript
page.title → page.slug (otomatik)
// Türkçe: Hakkımızda → hakkimizda
// Çakışma: Sayfa → sayfa-2
// Route: /hakkimizda → page.id lookup
```

### Meta Tags
```html
<title>Sayfa Başlığı · The Goatz Studio</title>
<meta name="description" content="...">
<meta property="og:title" content="...">
<meta property="og:description" content="...">
<meta property="og:image" content="...">
```

### Sitemap & Robots
```xml
<!-- /sitemap.xml -->
<?xml version="1.0"?>
<urlset xmlns="...">
  <url><loc>https://example.com/</loc></url>
  <url><loc>https://example.com/hakkimizda</loc></url>
  ...
</urlset>
```

```
# /robots.txt
User-agent: *
Disallow: /admin
Sitemap: https://example.com/sitemap.xml
```

---

## Tarayıcı Bundle (/render-bundle.js)

Panel'deki canlı önizleme, tarayıcıda `render()` çalıştırması gerekir.

```javascript
// server.js:
if (pathname === '/render-bundle.js') {
  // lib/render.js + lib/schema.js + lib/default-content.js
  // CommonJS wrapper
  // window.GoatzRender = { render, conform, ... }
}
```

**Bundle Boyutu:** ~50 KB (minified ~15 KB)

---

## İmplementasyon Notları

### Neden Vanilla WAAPI?
- Framework bağımlılığı yok
- Slush.app'tan daha kolay (GSAP, ScrollTrigger kullanmıyor)
- Element.animate() + requestAnimationFrame yeterli

### Neden DOM Patching?
- Slider sürüklemede iframe'i 350ms'de yeniden yüklemek → kasma
- patchNode() seçici update: sadece değişen nodes
- Smooth: transform, opacity dokunulmamış kalır

### Neden CommonJS Bundle?
- render() sunucuda da çalışmalı (Node.js)
- Panelde de çalışmalı (tarayıcı)
- Zero-dependency: npm build step yok

### Veri Kalıcılığı
- JSON file: basit, insan-okunur
- Atomic write: güvenli
- Yedekler: recovery için
- Production'da → database (PostgreSQL) taşıyabilir

---

## Deployment Notes

### Railway
- Volume: `/data` (persistent)
- Env: `ADMIN_PASSWORD`, `PORT`
- Build: `npm install` otomatik
- Start: `npm start` (package.json script)

### Self-hosted
- Node 18+
- Nginx reverse proxy (SSL)
- Systemd service
- Cron job for cleanup (eski yedekleri manuel sil)

### Security Checklist
- [ ] ADMIN_PASSWORD uzun (12+ karakter, special chars)
- [ ] HTTPS enabled (SSL sertifikası)
- [ ] /admin kısıtlandı (IP whitelist?)
- [ ] rate limiting (brute-force)
- [ ] Regular backups (dış disk)
- [ ] data/ klasörü yazılabilir, readable (chmod 755)
