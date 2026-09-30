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
3. **"Nasıl çalışıyoruz?" bölümü** yeniden kurulacak. Fikir: "Bir seferde bir proje. Sizinki." (sınırlı sayıda proje, tek kişi odak). Doğru olmalı: aynı anda kaç proje, süre, destek bilgisi kullanıcıdan alınacak; "Müsaitlik" durum kartı düşünüldü.
4. Footer stickers: çorap logonun soluna alınacaktı (dar ekranda biniyor, geniş ekranda sığar); çıplak ayak gerçekçi değil ama kullanıcı "kalsın" dedi.
5. Yayındaki site (Railway) güncel mi kontrol edilmedi.
