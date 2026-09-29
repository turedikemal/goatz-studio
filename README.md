# The Goatz Studio — web sitesi ve içerik paneli

Ek paket gerektirmeyen küçük bir Node.js uygulaması. Site ve panel aynı sunucuda çalışır.

- **Site:** `/`
- **Panel:** `/admin` (şifreyle girilir)

## Bilgisayarında çalıştırma

Node.js 20 veya üstü gerekir.

```bash
npm run dev
```

Sonra tarayıcıda `http://localhost:5173` (site) ve `http://localhost:5173/admin` (panel) adreslerini aç.
Panel şifresi `.env` dosyasındaki `ADMIN_PASSWORD` değeridir. İstersen değiştirebilirsin.

## Panelde neler düzenlenir?

| Bölüm | İçerik |
|---|---|
| Renkler ve stil | 11 renklik palet, köşe yuvarlaklıkları, boşluklar, dev başlık harf ve satır aralığı, animasyonlar |
| Marka ve SEO | Site adı, logo yazısı / görseli, Google başlığı ve açıklaması, paylaşım görseli |
| Bölüm sırası | Bölümleri sıralama, gizleme / gösterme |
| Kayan şerit | Duyurular, renk, hız |
| Menü | Linkler, hedefleri, siyah ana buton |
| Giriş | Dev başlık, renk ve boyutu, alt yazı, butonlar, kurdele, sticker'lar (masaüstü ve telefon konumu, boyut, eğim) |
| İşler vitrini | Ürün fotoğrafı kartı, örnek site penceresi ve kutucukları |
| Büyük italik yazı | Üç satırın tüm yazıları, sticker'ları ve buton kartı |
| Hizmetler | Sınırsız hizmet satırı: başlık, açıklama, buton, fotoğraf ya da sticker deseni |
| Neden biz | Başlık, butonlar, renkli kartlar (sticker veya fotoğraf) |
| Etiket bandı | Yazı, hız, etiket renkleri |
| Süreç sekmeleri | Sekmeler, adımlar, butonlar, görseller |
| İletişim | WhatsApp numarası ve hazır mesajı, Instagram, e-posta, kartlar |
| Alt bilgi (footer) | Ayrı bir bölüm: logo, tanıtım yazısı, sayfa ve iletişim linkleri (kendiliğinden dolar), genişliğe sığan dev yazı, alt satır, sticker'lar. Tüm sayfalarda görünür, sürüklenip gizlenebilir |
| Görsel kütüphanesi | Yükleme, seçme, silme |
| Yedekler | Otomatik yedekler (son 30 kayıt), içeriği indirme / yükleme, başlangıca dönme |

### Yazı stilleri

Her metin alanının altındaki **Aa Yazı stili** düğmesi bir kutu açar: yazı tipi (15 Google fontu), kalınlık, boyut, harf aralığı, satır aralığı, yatay hizalama (sola / ortala / sağa), dikey hizalama (üst / orta / alt), harf biçimi (BÜYÜK / küçük / İlk Harf), eğik, altı çizili ve renk. Boş bırakılan her ayar varsayılan değerde kalır; ayar yapılmış alanlarda düğmenin yanında turuncu nokta görünür. Sitenin geneli için yazı tipleri ve aralıklar **Renkler ve stil** sayfasındadır.

### Hareketler

Hareketler, referans alınan sitenin (Slush) animasyon sisteminden çıkarılan ayarlarla çalışır ve **Hareketler** sayfasından tek tek açılıp kapanır:

- **Açılış:** dev başlığın her harfi 5 kopyayla makara gibi yukarı kayarak yerine oturur; alt yazı cümle cümle, butonlar sırayla aşağıdan gelir; sticker'lar küçük ve dönmüş halden rastgele sırayla zıplar; kurdele belirir.
- **Büyük başlıklar:** harfler sağdan sola, soldan kayarak yerine oturur (kaydırmaya bağlı değil, ekranın %80'ine gelince bir kez oynar).
- **Alt başlıklar:** satırlar 3D dönerek gelir. **Kartlar** 3D uçarak gelir. **Vitrin kartları** küçük halden büyür.
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
