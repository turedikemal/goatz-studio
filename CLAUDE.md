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
- SEO dosyaları `lib/seo.js` (robots.txt: arama motorları + yapay zekâ botları, sitemap.xml, llms.txt); yasal sayfalar robots'ta açık ama `noindex, follow` (kapalı olunca Google noindex'i göremiyordu), `/sepet` kapalı. Kökteki hizmet sayfaları (anahtar teslim, tekstudyo, ikas → Web tasarım; ürün çekimi → Fotoğraf; Google SEO → SEO) ekmek kırıntısında kategoriye bağlı.

## Gece evreni, sepet, SEO (2026-10-02/03)
- **Gece evreni** (`public/site.js`, "Mekik uçtuğu yöne bakar" bölümünden dosya sonuna): filolar, it dalaşı, ana gemi/taşıyıcı/düello, gezegenler; tüm gemiler tek döngüde (`loop`), gemi başına try/catch (tek hata döngüyü durdurmasın: bir kez tüm gemiler donmuştu). Sayfa açıldıktan 2 sn sonra başlar, gemiler hep kenardan girer, hiç durmaz, footer'da uzay yok. `f.w` gemi genişliğidir (açısal hız `f.om`). Yalnız ana gemiler büyük.
- **Sepet** (`public/cart.js`): Hizmetler'de yüzen sepet; sepette ürün varken üst menüdeki baştan ayrılmış yere (`#cartSlot`, `html.cart-slot`) girer, kaydırınca kendi yerine iner, en üste dönünce geri çıkar. Diğer sayfalarda üst menü sepeti sunucuda çizilir (`CART_TOP_HTML`, `html.cart-top-on`), tıklayınca bulunduğu sayfada panel açılır. Sepet anahtarı `localStorage['goatz-hizmet-sepeti']`.
- **Başlangıç kodu** (`lib/render.js` head inline script) bir şablon dizesinin içinde: düzenli ifadelerde ters eğik çizgi kaybolur (bir kez `//` yorum satırına dönüp tüm başlangıç kodunu bozmuştu). Orada regex kullanma.
- **SEO**: anasayfa h1 = logo başlığı "The Goatz Studio"; title ≤60 karakter; og:image yoksa logo; sonda eğik çizgi 301; `ProfessionalService` şeması (adres/telefon yasal sayfalardan, çalışma saati yok). Denetim betiği yerelde `.claude/audit.js`. Railway'de `SITE_URL=https://thegoatzstudio.com` tanımlı.

## SEO düzeltmeleri (2026-10-03)
- **Hız:** `send()` metin yanıtlarını gzip'ler. `lib/optimize.js` (yalnız sunucu, `pageHtml`): CSS/JS'e `?v=<özet>` ekler (sürümlü dosya 1 yıl önbellek, sürümsüz `no-cache`, panel `no-store`), `/uploads` görsellerine gerçek width/height yazar, eski görsel adlarını `image-redirects.json`'a göre yeni adla değiştirir. CSS: `:where(img[width][height]){height:auto}`.
- **Blog:** başlıksız ilk metin bloğu giriş olur (`.page-lead`, kalın + yatık; ana sayfa hariç tüm sayfalarda, hizmet/kategori sayfaları dahil). Sayfa türü `kind: 'blog'` + `date` (panel: Sayfa ayarları). Adres `/blog/<adres>` (`pagePath`, `lib/schema.js`); `/<adres>` 301 ile oraya gider. `/blog` sayfası `bloglist` bloğuyla listeler. BlogPosting şeması, yazı altında "Diğer yazılar".
- **Yeni sayfalar:** `/google-seo` (id `googleseo`), `/ikas` (id `ikas`), `/blog` + 5 yazı. Hizmet sayfalarında `Service` şeması (render.js `SERVICE`), Hizmetler'de `OfferCatalog`.
- **404:** menülü sayfa, noindex (`notFound`, server.js). İş adresi değişince `WORK_MOVED` ile 301.
- Adres: iş yeri (iletişim, SSS, şema) Fatih Sok. No: 39 İş Yeri: 4; yasal sayfalarda fatura adresi Medrese Sok. No: 1 İş Yeri: 2 kalır.
- Google İşletme Profili: `GBP_URL` (render.js, share.google bağlantısı) harita kartları, iletişim haritası butonu, şemada hasMap/sameAs. Eskiden harita "The Goatz Creative" (müşteri markası) arıyordu, düzeltildi.
- Başlık aralığı: `SPACED_PAGES` (googleseo, ikas, blog + blog yazıları, tekstudyo) `.pg-spaced` harf aralığı 0, satır yüksekliği `.95em + 2mm`. 1.16em+2mm "aşırı boş" bulundu; asıl şikâyet harflerin birbirine girmesiydi (negatif harf aralığı). /web-tasarim-urun-cekimi üst etiketi diğer sayfalar gibi beyaz; h1 sarı kutu (`t-hang`, tek satır, sağı yukarıda, sallanır; ilk iki kelime `t-lean` sağa yatık); h1 "Kapı müşterisi beklemeye son!" kalsın.
- Harita konumu (geo) ve çalışma saati şemada yok: bilinmiyor, uydurulmadı.

## Hizmet ve kategori sayfaları (2026-10-03 gece)
- Sayfa türü `kind: 'service'` → adres `/hizmetler/<adres>` (`pagePath`), `/<adres>` 301 ile oraya gider; `parent` = kategori sayfası kimliği (ekmek kırıntısı Ana sayfa > Hizmetler > kategori > hizmet, `Service` şeması otomatik).
- 8 kategori sayfası (`kweb, kseo, kfoto, kpazar, kdanis, kmetin, kmarka, kuygulama`; başlıkları Hizmetler'deki bölüm başlığıyla birebir aynı olmalı, `categoryPage` bununla eşleşir) + 18 hizmet sayfası (`h...`). Hizmetler kartlarında `target` alanı → "Detaylı bilgi" bağlantısı; anahtar teslim, Google SEO, ürün çekimi mevcut sayfalarına, danışmanlık ve uygulamalar iş sayfalarına gider.
- Metin bloğunda `collapse: true` → "Devamını oku" (site.js `[data-more]`), geniş ekranda iki sütun. İşlerde `about`/`aboutHeading` uzun proje açıklaması aynı biçimde; `works.about` /isler listesinin altındaki açıklama.
- Metin kuralları (kullanıcı): yapay zekâ izi bırakmayan doğal dil, her anahtar kelime öbeği sayfada 1 kez, bir sayfada her iç bağlantı hedefi 1 kez, ana sayfaya/marka adına bağlantı yok, sayfadaki butonlarla aynı bağlantı yok, kategori ≥700 / hizmet ≥350 kelime, uydurma yok.
- İşler'de sol filtre: Hizmetler'deki `svc-nav.js` (sol kapsüller ≥1200px, telefonda alt çubuk), `.work-group[data-g]` bölümlerine gider; renk kategori rengine göre (`gOf`). Eski üst düğme filtresi (`.work-filters`, Tümü + kategoriler) 2026-10-05'te Kemal'in isteğiyle geri geldi, sol kapsüller de durur: üst düğme yalnız o bölümü bırakır (`site.js` süzme, `goatzWorksAll/Filtered`), sol kapsüle basınca süzme kalkar ve bölüme gidilir (süzme açıkken kapsül üstüne gelince gitmez). Dar ekranda (<1200px) üst düğmeler kullanılır, `.svc-bar` şeridi İşler'de gizli (`.is-works`), Hizmetler'de durur. `/isler#web` bağlantıları süzmez, o bölüme kaydırır. Ekran görüntüleri `/mnt/project-files/isler-filtre/`.

## Ortak yapı (2026-10-03 gece, kullanıcı: "her sayfada birlik olsun")
- **Ana sayfa:** Neden biz'in altında SSS (`faq`) ve uzun açıklama (`about` bölümü, `S.about`).
- **Kural:** blog yazıları hariç her sayfada (ana sayfa, hizmet/kategori, İşler + tüm projeler, Süreç, SSS, iletişim, blog, teklif al) en altta SSS + "Devamını oku" açıklama var. Yeni sayfada ikisini de ekle.
- **SSS:** SSS sayfası dışındaki tüm SSS'ler aynı: sarı zemin (`sun`), üst etiket "SSS", başlık "<konu> soruları", "Tüm sorular ↗" butonu, sayfanın en alttaki uzun açıklamasının hemen önünde. Kodla üretilenler `faqStd()` (render.js). Ana sayfa SSS bölümü `c.faq` (bölüm `faq`, Neden biz'in arkasında), İşler listesi `works.faq`, proje sayfaları `works.items[].faq` (panelde alanları var). Blog yazıları, blog, iletişim de SSS'li.
- **Başlıklar:** `.blk-faq` ve `.blk-more` h2'leri her sayfada harf aralığı 0, satır `.95em + 2mm`. Uzun açıklamalar hep beyaz zemin.
- **Kelime vurgusu:** her sayfada paragraf/liste kelimeleri üzerine gelince sarı, yazı siyah (site.js sonu; kartlar, formlar, araçlar hariç). Eski sayfaya özel `HW_PAGES` boş. Yazı içi bağlantılar da üzerine gelince sarı.
- **ikas rozeti:** gövdede (`ikasMarks`, render.js) p/li/summary/h1-h3 içindeki "ikas" kelimesi Neden biz'deki rozetin küçüğü (`.ikas-mark`, mor, sarı nokta). Hero başlığı/alt yazı harflere bölünürken rozet korunur (site.js `MARK`).
- **"Kapı Müşterisi Beklemeye Son!!!"** (2026-10-04: ana sayfa hero'da "Anahtar teslim" başlığının üstünde, küçük, `.hero-hook`; İşler'de yalnız alt cümle kaldı): oval, siyah çerçeve, sağı yukarıda (-2.5deg).

- **Slayt zemini** (2026-10-04): ana sayfadaki şerit (`ribbon`) aynen kalır. Diğer sayfalarda `pageBg` (render.js): aynı dilde kıvrımlı bant ama sayfa grubuna göre farklı kıvrım (`BG_GROUP` → `BG_PATH`), rengi sayfa zemininin tonu (zemin %72 + sayfanın şerit rengi), siyah kenar yok, gece çok soluk. İkon/yıldız/çizgi deseni denendi, Kemal beğenmedi ("yıldız yazı kartı felan değil"). Dönüş: commit `0b542a4`. Süreç sayfası (`nasilcalisiyoruz`) istisna: `roadBg` = ilk yeniden tasarım (`fdd2ffd`): dört köşede sade soyut çizgi deseni (kesik çizgili yol, 3 durak, bayrak), band yok. Sonraki "yol haritası + renkli duraklar" denemeleri (`906cfbb`, `50a61ec`) Kemal'in isteğiyle geri alındı.
- **Neden Biz sayfası** (`/neden-biz`, id `nedenbiz`): üst menü "Neden Biz" buraya gider (`page:nedenbiz`). Blok türü `why` ana sayfadaki kartları + ikas panelini (`S.why`) sayfaya koyar; altında SSS ve açıklama. Ana sayfanın alt açıklaması artık "Stüdyoda neler oluyor?" (tekrar olmasın diye).
- **Kampanya penceresi** (yalnız ana sayfa, `PROMO_HTML` render.js + site.js sonu + site.css "promo"): "Shopier’den geçenlere %10". Kemal (2026-10-04): çerez şeridi ve pencere ayrı; ikisi de ana sayfa her açıldığında çıkar (pencere 1,5 sn sonra, bir kez; çerez şeridi pencerenin üstünde, z-index 95; çerez seçimi kaydedilir ama şerit yine çıkar). %10 rozeti süzülür (`promo-float`). "Teklif al" → `/teklif-al?kampanya=shopier`; sihirbaz e-postasına "Kampanya: Shopier’den taşıma, %10 indirim" satırı eklenir. Kaldırmak için `PROMO_HTML`'i boşalt. Deneme: `/?pencere` 1 sn'de açar, sayaca yazmaz. **Takip:** pencere görüntülenme/tıklama/kapatma `POST /api/promo` ile sayılır; Teklif al'a tıklayana 30 günlük `goatz_kampanya=shopier` çerezi, sonra hangi formdan yazarsa (`/api/contact`) mesaja kampanya satırı + `campaign`, e-posta konusu `[Shopier %10]`, kayıt `lib/promo.js` → PostgreSQL `promo_events` (DB yoksa `data/promo.json`). Panel: "Kampanya (Shopier %10)" sayfası. 
- **Kalıcı kayıt** (`lib/persist.js`, 2026-10-04): Railway'de disk her yayında sıfırlanır. Gelen mesajlar (`messages.json`), panelden yüklenen görseller (`uploads/`), panel yedekleri ve panelden kaydedilen içerik PostgreSQL `kalici_dosyalar` tablosuna da yazılır, açılışta geri yüklenir. İçerik kuralı: git'teki `content.json` panel kaydından beri değişmediyse panel sürümü geri gelir; değiştiyse (biz içerik push ettiysek) git kazanır, panel sürümü panelde **Yedekler**'e konur. Yani Kemal yayında panelden düzenleme yaptıysa, bizim içerik push'umuz onun düzenlemesini yedeğe iter: içerik değiştirmeden önce bunu ona sor/söyle.

## Google Analytics 4 (2026-10-04)
- `GA_MEASUREMENT_ID` (varsayılan `G-FBQTBMTMRF` kodda, Railway değişkeni gerekmez; değişken tanımlıysa o geçerli, boş değer varsayılanı kullanır, kapatmak için `GA_MEASUREMENT_ID=off`). `render.js > gaHead()` head'e consent-mode betiği koyar: varsayılan `denied`; `localStorage['goatz-cerez']==='kabul'` ise ya da çerez şeridinde "Kabul et" denince (`site.js` → `goatzGA(true)`) gtag.js yüklenir, yenileme yok. Panel önizleme ve 404 (noindex) hariç.
- Olaylar `window.goatzEvent` ile (GA yüklü değilse sessiz): `click_whatsapp`, `click_phone`, `click_teklif_al`, `generate_lead` (iletişim, sihirbaz, sepet), `promo_view/click/close`.
- **Çerez şeridi** (2026-10-04): ana sayfada her açılışta çıkar (`data-ck-always`, promo penceresinin üstünde); diğer tüm herkese açık sayfalarda (panel önizleme hariç) yalnız `localStorage['goatz-cerez']` boşken çıkar, seçim her yerde geçerli. Açıkken `--ck-h` ile mobil alt çubuk (sepet/kategori/yukarı ok) şeridin üstüne çıkar (site.css sonu).
- `/cerez-politikasi` (id `cerez`) kodla uyumlu yeniden yazıldı: goatz-cerez, goatz-tema, goatz-hizmet-sepeti, goatz-kampanya-shopier (localStorage), goatz_kampanya (çerez, 30 gün, yalnız promo "Teklif al"), gs_session (panel), GA4 `_ga` / `_ga_FBQTBMTMRF` yalnız "Kabul et" sonrası. Yeni depolama/çerez eklenirse bu sayfa güncellenmeli.

## Mobil kategori filtresi v2 (2026-10-04)
- Hizmetler ve İşler'de dar ekran (<1200px) için alt hap kaldırıldı: `svc-nav.js` `.svc-bar` artık üst menünün altına yapışan yatay kaydırılan şerit (üstten 64px, tam genişlik, solan kenarlar). Çip = renkli nokta + kısa ad (`SHORT`; tam ad `aria-label`), 44px yükseklik; aktif çip kategori renginde dolu, kalın siyah çerçeve, kaydırınca görünüme kayar. CSS: site.css "Dar ekran (<1200px) kategori şeridi". ≥1200px sol kapsüller aynen.
- Alt köşelerde yalnız sepet (sol) ve yukarı oku (sağ), 44px yuvarlak; çerez şeridi açıkken `--sb-b` ile şeridin üstüne çıkar. Kategoriye gidişte üstte 128px pay bırakılır (şerit başlığı örtmesin).
- Kontrol edilmeyen: gerçek iPhone Safari (safe-area, adres çubuğu); yalnız Playwright. Ekran görüntüleri `/mnt/project-files/mobil-filtre-v2/`.

## Tek yazı tipi (2026-10-06)
- Sitede tek yazı tipi var: `theme.font` (Google Fonts aile adı, tema başına; varsayılan `Inter`). Eski `bodyFont`/`displayFont`/metin başına `font` kalktı. Panel: Tema Ayarları > Yazı tipi (arama + her satır kendi yazı tipiyle; önizleme CSS'i yalnız panelde Google'dan gelir).
- Ziyaretçi Google'a gitmez: `lib/fonts.js` seçilen ailenin woff2 (latin + latin-ext) dosyalarını indirir, `data/fonts/<ad>/` (+ `persist` ile PostgreSQL), `/fonts/<ad>/font.css`. Katalog `lib/fonts-catalog.json` (1526 aile, Türkçe karakterli). `POST /api/fonts/ensure`; kayıtta indirilemeyen yazı tipi önceki yazı tipine döner (`fontWarning`). `data/fonts/inter` git'te (varsayılan, ağ gerekmesin), ötekiler git dışı sayılmalı/commit edilmez.
- Yalnız 400/500/700/900 inen kalınlıklar; sahte kalın kapalı (`font-synthesis-weight:none`), italik yoksa tarayıcı eğik üretir.

## Panel Dashboard (2026-10-06)
- Panel açılınca (adres çubuğunda `#` yoksa) Dashboard gelir. Sunucu: `GET /api/dashboard?period=today|7|30` (`lib/dashboard.js`, dönemler Türkiye gününe göre), panel: `public/admin-dashboard.js` + admin.css "Dashboard" bölümü.
- E-ticaret odaklı (Kemal ilk sürümü "e-ticarete uygun değil" buldu; mesaj/teklif/Shopier/Analytics kartları kaldırıldı): ciro, sipariş, ortalama sepet, satılan adet, yeni müşteri (önceki döneme göre), günlük/saatlik ciro grafiği, satış kanalları, sipariş durumu, bekleyen ödemeler, stok uyarıları (tükenen + 5 ve altı, `LOW_STOCK`), en çok satanlar, son siparişler. İptal/iade ciroya sayılmaz. Yalnız gerçek veri; DB yoksa bunu söyler.
- Bilinçli olarak yok: emoji, renkli/gradyanlı KPI kartları (Kemal: "standart AI dashboard istemiyorum"). Grafik tek seri, siyah sütun.
