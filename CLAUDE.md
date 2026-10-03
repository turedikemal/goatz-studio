# The Goatz Studio — proje notları (Claude için)

Web tasarım + e-ticaret + ürün çekimi stüdyosu sitesi, içerik paneli (/admin) ve e-ticaret yönetimi. Öncelik **web tasarım**, ürün çekimi ikinci sırada.

## Çalıştırma
- Node >= 20, `npm install`, `.env` (bkz. `.env.example`), `npm run dev` → http://localhost:5173, panel: /admin
- `.env` git'e girmez. Gizli anahtarları (RESEND_API_KEY vb.) asla sohbete yazdırma, kullanıcı kendi yapıştırır.
- Sunucu sprite (`public/sprites.svg`), `lib/render.js` ve içerik şablonlarını başlangıçta okur: bunları değiştirince sunucuyu yeniden başlat. Tarayıcıda `#hash` aynı sayfaya gidince yenilemez, CSS/JS değişince sert yenile.

## Yapı
- `server.js` HTTP sunucu ve API; `lib/render.js` sayfa üretimi (sunucu + panel önizleme paketi); `lib/default-content.js` varsayılanlar; `data/content.json` kaydedilen içerik (git'te).
- `lib/schema.js` içerik doğrulama; yeni alan eklerken `default-content.js` + `public/admin.js` şeması birlikte güncellenir.
- `public/site.js` hareket sistemi: sticker efektleri `CLICKS` haritasında (`st-<id>`), efekt fare üstüne gelince çalışır. Efekti olmayan sticker'lar üstüne gelince 360° döner; bu istenmiyor, o yüzden her sticker'ın (yoksa `noFx`) girişi olmalı.
- Sticker eklemek: `public/sprites.svg` (symbol `s-<id>`), `lib/render.js` `STICKERS` (+ `STICKER_VIEWBOX` gerekiyorsa), `public/admin.js` `STICKERS` adı, `public/site.js` `CLICKS`.
- İletişim formu: `/iletisim` → `POST /api/contact` → `data/messages.json` (git dışı) + panelde "Gelen Mesajlar" (okunmamış rozeti). E-posta: `lib/mailer.js` (Resend).
- Özel sayfalar `data/content.json > pages` (tekstudyo, iletisim, gizlilik, kvkk, cerez, kosullar).
- E-ticaret: PostgreSQL (`lib/db.js`, `sales*.js`); yerel veri git'te yok.

## Kullanıcıyla çalışma tarzı
- Türkçe, kısa ve net yaz. Kullanıcı gereksiz uzatmayı sevmez.
- İstenmeden metin/iddia uydurma (fiyat, süre, adet, garanti). Gerekiyorsa sor ya da boş bırak.
- Görsel değişikliği tarayıcıda doğrula; yaptığını ve yapmadığını dürüstçe söyle.
- Stil: kalın siyah çizgili sticker'lar, tema renkleri (mint, lavender, sun, blue, ember, violet), büyük italik başlıklar. Başlık satır aralığı ~.95 (İ/Ü/Ö noktaları çarpmasın).
- Kullanıcı commit + push'u genelde ister; `master`'a gider. Dönüş noktaları: tag `donus-noktasi-isler`, `yedek-2026-10-01`.

## Bekleyen / açık işler
1. **Resend e-postası:** `thegoatzstudio.com` Resend'de doğrulanmamış (403). Domains'te hangi alan adı Verified bak; `MAIL_FROM` ayarla ya da DNS kaydı ekle. Railway'e RESEND_API_KEY, MAIL_TO, MAIL_FROM değişkenleri eklenecek.
2. **Yasal sayfalar** taslak; avukat/muhasebeci kontrolü gerek. Firma ünvanı, vergi no, adres girilecek (panel: Alt bilgi → Firma bilgisi). Satış başlarsa mesafeli satış + iade/iptal eklenmeli.
3. **Süre / adet / destek bilgisi** sayfalara hiç yazılmadı (uydurma yok). "Hızlı teslim" kartı ve süreç metinleri için kullanıcıdan gerçek bilgi alınınca eklenecek. "Randevulu üretim / müsaitlik" fikri bekliyor (aynı anda kaç proje? doğru olmalı).
4. **İkonlar:** Slush'taki gibi gerçek 3D render istiyor; SVG ile olmuyor (denendi, beğenilmedi, geri alındı). Yol: kullanıcı ChatGPT vb. ile görsel/SVG üretir (`ikon-komutlari.md` hazır komutlar), biz bağlarız. Şu an coin (gülen jeton) ve rocket kullanıcının SVG'leri, `key` anahtar sticker'ı yeni. **Slush logolu/markalı çizim kullanma.**
5. Yayındaki site (Railway) 2026-10-02/03 itibarıyla güncel; `SITE_URL=https://thegoatzstudio.com` production ortamında tanımlı (canonical/sitemap/robots buna göre).

## Yapılanlar / kararlar (2026-10-01)
- **Sayfalar:** `/nasil-calisiyoruz` (süreç), `/anahtar-teslim-e-ticaret` (hero butonu "Anahtar teslim nedir?"); İşler'e "Danışmanlık ve Yönetim" kategorisi (Web Sitesi Danışmanlığı, Aylık Site Yönetimi, kapakta `slogan` alanı).
- **Anasayfa:** Süreç bölümü artık tek yol haritası (`process.roadmap`); eski sekmeler `tabs` olarak kodda duruyor, `roadmap` boşsa geri gelir. "Neden biz" kartları tıklayınca çevrilir (arka yüz = kartın `text` alanı), fareyle kenara yaklaşınca akıcı kayar. Hizmet butonları işler/sayfalara gider (`works:web`, `page:...` hedefleri). Hero'da buton: "Anahtar teslim nedir?" (İşleri gör / WhatsApp kaldırıldı, tekrar demek).
- **Başlıkta espri:** `[[yanlış|doğrusu]]` yazılırsa yanlış kısım turuncu çizgiyle çizilir, doğrusu sarı etiketle yanına eklenir (`brFix`).
- **Satır aralığı:** `TIGHT_PAGES` (render.js) içindeki sayfalarda başlık satır arası 2 mm (noktalı harflerin tepesine göre).
- **Logo:** `brand.logoWordmark` açıkken işaret (favicon PNG, siyah çizgili) + yazı (`the-goatz-studio-logo.svg` yazı parçası, sprites.svg `lg-text`) görünür; aşağı kaydırınca yazı kapanır. Yazı rengi siyah. İşaretin siyah çizgisi önemli, düz SVG işaret kullanma.
- **Tasarım dersleri:** Parlak/gölgeli/gradyanlı "3D" ikon ve tüylü şerit beğenilmedi ("yapay"). Site kimliği: düz renk, kalın siyah çizgi. Gölge istenmiyor. Şerit düz kalsın.
- **Yedekler/betikler:** `.claude/*` yerel (git dışı). Uygulama kodunda kayıt: `data/content.json`.

## Teklif sihirbazı (/teklif-al) — 2026-10-01 sonu
- `public/wizard.js` (yalnız `data-wizard` bloklu sayfada yüklenir) + `B.wizard` (`lib/render.js`) + panelde blok türü "Teklif sihirbazı". Metinler/sorular koda gömülü (`questions`, `PACKAGES`, `ALL`, `DIFF`), panelden düzenlenmez.
- Akış: kimlik (KVKK + pazarlama onayı önceden işaretli) → mevcut site (adres zorunlu, `POST /api/check-site` → `lib/sitecheck.js` www ile dener, yoksa www'suz; iç ağ adresleri engelli) → sorular → sonuç. Kimlik adımı geçilince yarım lead e-postası (`/api/contact`), sonuçta tam talep. 2 dk sayaç, sağ üstte.
- Sonuç sayfası: paket yığını (seçilen ortada sabit, öteki paketler arkasında), cevaplar artı/eksi, alt paket avantajları (`DIFF`, ikas Lift/Scale/Scale Plus'a göre; Core=Lift, Signature=Scale, Advanced=Scale Plus varsayımı), paketin tüm özellikleri (pakete özel maddeler baş harf rozetli), seçilen hizmetler (Hepsini çıkar), ek öneriler (Hepsini ekle).
- Sayfa açılışında otomatik aşağı inme: yazılar bitince 2 sn bekler, 3 sn'de iner; konsolda `[teklif]` logları. Gerçek Chrome'da çalıştığı doğrulanmadı.
- Test panelindeki gizli tarayıcı ekran görüntüsü siyah, animasyonlar orada ölçülemez; görsel doğrulama kullanıcıdan istenir.
- Açık: sonuç sayfasındaki yeni paket yığını ve renkler tarayıcıda görülmedi; "Ödeme, kargo" maddesi (`base()`); marka adı bazı sitelerde uzun başlık geliyor; test mesajları panelde silinecek; `.env.example` içindeki ADMIN_PASSWORD değiştirilmeli.

## Hizmetler sayfası ve sepet (2026-10-02)
- `/hizmetler` (panelde "Hizmetler" sayfası): 6 kart bölümü, metinler ana sayfadaki "Neler yapıyoruz?" kutularından; blok başlığından otomatik bağlantı noktası (`#urun-cekimi`). Menüdeki "Hizmetler" bu sayfaya gider. Geri dönüş etiketi: `donus-noktasi-hizmetler-oncesi`.
- Hizmet sepeti: `public/cart.js` (yalnız bu sayfada, `data-svc-cart` işaretiyle yüklenir). Kartlarda "Sepete ekle", sağda yapışkan sepet düğmesi, panelde "Fiyat al" formu → `POST /api/contact`, mesaj `FİYAT TALEBİ (hizmet sepeti)` ile başlar (`lib/mailer.js` konu satırı buna göre). Sepet `localStorage`'ta tutulur. Formda pazarlama onayı yok, yalnız KVKK.
- SEO dosyaları `lib/seo.js` (robots.txt: arama motorları + yapay zekâ botları, sitemap.xml, llms.txt); yasal sayfalar robots'ta kapalı.

## Gece evreni, sepet, SEO (2026-10-02/03)
- **Gece evreni** (`public/site.js`, "Mekik uçtuğu yöne bakar" bölümünden dosya sonuna): filolar, it dalaşı, ana gemi/taşıyıcı/düello, gezegenler; tüm gemiler tek döngüde (`loop`), gemi başına try/catch (tek hata döngüyü durdurmasın: bir kez tüm gemiler donmuştu). Sayfa açıldıktan 2 sn sonra başlar, gemiler hep kenardan girer, hiç durmaz, footer'da uzay yok. `f.w` gemi genişliğidir (açısal hız `f.om`). Yalnız ana gemiler büyük.
- **Sepet** (`public/cart.js`): Hizmetler'de yüzen sepet; sepette ürün varken üst menüdeki baştan ayrılmış yere (`#cartSlot`, `html.cart-slot`) girer, kaydırınca kendi yerine iner, en üste dönünce geri çıkar. Diğer sayfalarda üst menü sepeti sunucuda çizilir (`CART_TOP_HTML`, `html.cart-top-on`), tıklayınca bulunduğu sayfada panel açılır. Sepet anahtarı `localStorage['goatz-hizmet-sepeti']`.
- **Başlangıç kodu** (`lib/render.js` head inline script) bir şablon dizesinin içinde: düzenli ifadelerde ters eğik çizgi kaybolur (bir kez `//` yorum satırına dönüp tüm başlangıç kodunu bozmuştu). Orada regex kullanma.
- **SEO**: anasayfa h1 = logo başlığı "The Goatz Studio"; title ≤60 karakter; og:image yoksa logo; sonda eğik çizgi 301; `ProfessionalService` şeması (adres/telefon yasal sayfalardan, çalışma saati yok). Denetim betiği yerelde `.claude/audit.js`. Railway'de `SITE_URL=https://thegoatzstudio.com` tanımlı.

## SEO düzeltmeleri (2026-10-03)
- **Hız:** `send()` metin yanıtlarını gzip'ler. `lib/optimize.js` (yalnız sunucu, `pageHtml`): CSS/JS'e `?v=<özet>` ekler (sürümlü dosya 1 yıl önbellek, sürümsüz `no-cache`, panel `no-store`), `/uploads` görsellerine gerçek width/height yazar, eski görsel adlarını `image-redirects.json`'a göre yeni adla değiştirir. CSS: `:where(img[width][height]){height:auto}`.
- **Blog:** sayfa türü `kind: 'blog'` + `date` (panel: Sayfa ayarları). Adres `/blog/<adres>` (`pagePath`, `lib/schema.js`); `/<adres>` 301 ile oraya gider. `/blog` sayfası `bloglist` bloğuyla listeler. BlogPosting şeması, yazı altında "Diğer yazılar".
- **Yeni sayfalar:** `/google-seo` (id `googleseo`), `/ikas` (id `ikas`), `/blog` + 5 yazı. Hizmet sayfalarında `Service` şeması (render.js `SERVICE`), Hizmetler'de `OfferCatalog`.
- **404:** menülü sayfa, noindex (`notFound`, server.js). İş adresi değişince `WORK_MOVED` ile 301.
- Adres: iş yeri (iletişim, SSS, şema) Fatih Sok. No: 39 İş Yeri: 4; yasal sayfalarda fatura adresi Medrese Sok. No: 1 İş Yeri: 2 kalır.
- Google İşletme Profili: `GBP_URL` (render.js, share.google bağlantısı) harita kartları, iletişim haritası butonu, şemada hasMap/sameAs. Eskiden harita "The Goatz Creative" (müşteri markası) arıyordu, düzeltildi.
- Başlık aralığı: `SPACED_PAGES` (googleseo, ikas, blog + blog yazıları, tekstudyo) `.pg-spaced` harf aralığı 0, satır yüksekliği `.95em + 2mm`. 1.16em+2mm "aşırı boş" bulundu; asıl şikâyet harflerin birbirine girmesiydi (negatif harf aralığı). /web-tasarim-urun-cekimi üst etiketi diğer sayfalar gibi beyaz; h1 sarı kutu (`t-hang`, sağı yukarıda, sallanır); h1 "Kapı müşterisi beklemeye son!" kalsın.
- Harita konumu (geo) ve çalışma saati şemada yok: bilinmiyor, uydurulmadı.
