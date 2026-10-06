(() => {
  // =====================================================================
  //  Şema: panelde hangi alanın nasıl düzenleneceğini tanımlar
  // =====================================================================
  const COLOR_NAMES = {
    carbon: 'Siyah', paper: 'Beyaz', sky: 'Açık mavi', concrete: 'Gri', mist: 'Açık gri',
    blue: 'Mavi', mint: 'Nane yeşili', lavender: 'Lavanta', ember: 'Turuncu', sun: 'Sarı', violet: 'Mor',
  };
  const STICKERS = { camera: 'Kamera', browser: 'Tarayıcı', coin: 'Gülen jeton', check: 'Onay rozeti', cursor: 'İmleç', star: 'Yıldız', bottle: 'Şişe', pin: 'Konum pini', map: 'Harita', box: 'Paket', truck: 'Kamyon', medal: 'Madalya', store: 'Dükkan', cart: 'Sepet', chat: 'Yorum balonu', link: 'Zincir', sliders: 'Ayar çubukları', photo: 'Fotoğraf', grid: 'Izgara', palette: 'Renk paleti', heart: 'Kalp', magnifier: 'Büyüteç', globe: 'Dünya', pencil: 'Kalem', gear: 'Dişli', key: 'Anahtar', anahtar: 'Anahtar (tek başına)', refresh: 'Yenileme', rocket: 'Roket', chart: 'Grafik', product: 'Ürün şişesi (MARKA)', signpost: 'Yön tabelası', vitrin: 'Fransız vitrin', foot: 'Ayak', shoe: 'İskarpin', sock: 'Beyaz çorap', code: 'Kod', phone: 'Telefon', layers: 'Katmanlar', type: 'Yazı (Aa)', bag: 'Alışveriş çantası', tag: 'Fiyat etiketi', bulb: 'Ampul (fikir)' };
  const STICKER_VB = { camera: '0 0 120 100', browser: '0 0 120 100', bottle: '0 0 100 160', product: '0 0 100 160' };
  const TARGETS = [
    ['#top', 'Sayfanın başı'], ['works', 'İşler sayfası (portföy)'], ['work:web-sitesi-danismanligi', 'Web Sitesi Danışmanlığı (proje sayfası)'], ['work:aylik-site-yonetimi', 'Aylık Site Yönetimi (proje sayfası)'], ['work:kategori-yildizi', 'Kategori Yıldızı (proje sayfası)'], ['work:yorum-merkezi', 'Yorum Merkezi (proje sayfası)'], ['work:canli-siparis-haritasi', 'Canlı Sipariş Haritası (proje sayfası)'], ['works:photo', 'İşler → Ürün çekimi'], ['works:web', 'İşler → Web siteleri'], ['works:app', 'İşler → Web uygulamaları'], ['works:consulting', 'İşler → Danışmanlık'], ['#isler', 'İşler bölümü (ana sayfada)'], ['#hizmetler', 'Hizmetler bölümü'],
    ['#neden', 'Neden biz bölümü'], ['#surec', 'Süreç bölümü'], ['#iletisim', 'İletişim bölümü'],
    ['whatsapp', 'WhatsApp (iletişimdeki numara)'], ['instagram', 'Instagram (iletişimdeki hesap)'], ['email', 'E-posta (iletişimdeki adres)'],
  ];
  const SECTION_NAMES = {
    hero: 'Giriş (dev başlık)', showcase: 'İşler vitrini', statement: 'Büyük italik yazı', services: 'Hizmetler',
    why: 'Neden biz (kartlar)', band: 'Siyah etiket bandı', process: 'Süreç sekmeleri', faq: 'Sık sorulan sorular', about: 'Uzun açıklama (Devamını oku)', contact: 'İletişim', footer: 'Alt bilgi (footer)',
  };

  const text = (label, o = {}) => ({ type: 'text', label, ...o });
  const area = (label, o = {}) => ({ type: 'text', multiline: true, label, ...o });
  const number = (label, min, max, unit = '', step = 1, o = {}) => ({ type: 'number', label, min, max, unit, step, ...o });
  const bool = (label, o = {}) => ({ type: 'bool', label, ...o });
  const color = (label, o = {}) => ({ type: 'color', label, ...o });
  const hex = (label) => ({ type: 'hex', label });
  const image = (label, o = {}) => ({ type: 'image', label, ...o });
  const sticker = (label, o = {}) => ({ type: 'sticker', label, ...o });
  const target = (label = 'Tıklayınca nereye gitsin?', o = {}) => ({ type: 'target', label, ...o });
  const select = (label, options) => ({ type: 'select', label, options });
  const group = (label, fields, o = {}) => ({ type: 'group', label, fields, ...o });
  const list = (label, item, o = {}) => ({ type: 'list', label, item, ...o });
  const button = (label) => group(label, { label: text('Buton yazısı', { hint: 'Boş bırakırsan buton gizlenir.' }), target: target() });
  const ribbon = group('Mavi kurdele', { visible: bool('Kurdeleyi göster'), color: color('Kurdele rengi') });
  const lineHint = 'Satır atlamak için Enter\'a bas.';
  const style = (label, o = {}) => ({ type: 'style', label, ...o });
  const stickerList = (label) => list(label, group('', {
    type: sticker('Sticker'),
    pos: group('Masaüstündeki konum', { x: number('Soldan', -10, 100, '%'), y: number('Yukarıdan', -10, 100, '%') }, { flat: true, row: true }),
    mpos: group('Telefondaki konum', { mx: number('Soldan', -10, 100, '%'), my: number('Yukarıdan', -10, 100, '%') }, { flat: true, row: true }),
    size: number('Boyut', 30, 300, 'px'),
    rotate: number('Eğim', -180, 180, '°'),
    float: bool('Hafifçe sallansın'),
  }), { addLabel: 'Sticker ekle', title: (v) => STICKERS[v.type] || 'Sticker', max: 12,
    newItem: { type: 'star', x: 45, y: 60, mx: 45, my: 60, size: 100, rotate: 0, float: true } });

  const PAGES = [
    { group: 'Genel Bakış' },
    {
      id: 'dashboard', label: 'Dashboard', path: [], anchor: '#top', special: 'dashboard',
    },

    { group: 'Ürünler' },
    {
      id: 'urunler', label: 'Ürünler', path: [], anchor: '#top', special: 'products',
      intro: 'Ürünlerinizi ve varyantlarını yönetin. SEO, fiyat, stok ve görselleri ekleyin.',
    },
    {
      id: 'kategoriler', label: 'Kategori', path: [], anchor: '#top', special: 'definitions', tab: 'categories',
      intro: 'Ürün kategorilerini (alt kategorilerle) yönetin.',
    },
    {
      id: 'stok', label: 'Stok', path: [], anchor: '#top', special: 'stock',
      intro: 'Depo bazında stok adetlerini görüntüle ve güncelle.',
    },
    {
      id: 'fiyat-listesi', label: 'Fiyat Listesi', path: [], anchor: '#top', special: 'pricelist',
      intro: 'Ürün fiyat listeleri.',
    },
    {
      id: 'tanimlamalar', label: 'Tanımlamalar', path: [], anchor: '#top', special: 'definitions', tab: 'brands',
      intro: 'Markalar, kategoriler, varyant türleri, vergi oranları ve depolarını yönetin.',
    },

    { group: 'Siparişler' },
    {
      id: 'siparisler', label: 'Siparişlerim', path: [], anchor: '#top', special: 'orders',
      intro: 'Siparişleri filtrele, durumlarını yönet; ödeme, kargo, fatura ve iade işlemlerini yap.',
    },
    {
      id: 'terk-edilen', label: 'Terk edilen siparişler', path: [], anchor: '#top', special: 'abandoned',
      intro: 'Sepete ürün ekleyip siparişi tamamlamayanlar ve ödemesi tamamlanmayan siparişler.',
    },

    { group: 'Müşteriler' },
    {
      id: 'musteriler', label: 'Müşteriler', path: [], anchor: '#top', special: 'customers',
      intro: 'Müşteri bilgilerini, adreslerini ve sipariş geçmişini yönet.',
    },
    {
      id: 'etiketi', label: 'Etiketler', path: [], anchor: '#top', special: 'customer-tags',
      intro: 'Müşterileri gruplamak için etiketler oluştur (VIP, Toptan…).',
    },

    { group: 'Pazarlama' },
    {
      id: 'kuponlar', label: 'Kuponlar', path: [], anchor: '#top', special: 'coupons',
      intro: 'İndirim kuponları oluştur: yüzde, sabit tutar veya ücretsiz kargo.',
    },
    {
      id: 'kampanyalar', label: 'Kampanyalar', path: [], anchor: '#top', special: 'campaigns',
      intro: 'Kategori veya ürüne otomatik uygulanan indirim kampanyaları.',
    },
    {
      id: 'blog', label: 'Blog', path: [], anchor: '#top',
      intro: 'Blog yazılarını yönetin.',
    },
    {
      id: 'etkinlikler', label: 'Etkinlikler', path: [], anchor: '#top',
      intro: 'Etkinlikleri yönetin.',
    },

    { group: 'İşler' },
    {
      id: 'isler-projeler', label: 'Projeler', path: ['works'], anchor: '#top', previewPage: 'works',
      intro: 'Yaptığınız web siteleri, web uygulamaları ve danışmanlık işleri. Her proje /isler sayfasında kart olarak, kendi adresinde de ayrıntılı sayfa olarak görünür.',
      schema: {
        items: list('Projeler', group('', {
          title: text('Proje adı', { nostyle: true }),
          category: select('Kategori', () => state.works.categories.map((c) => [c.key, c.label])),
          badge: text('Rozet (örn. Geliştirmede, Yakında yayında)', { nostyle: true, compact: true }),
          premium: bool('Premium proje etiketi (kartta ve proje sayfasında görünür)'),
          lang: select('Adın dili (BÜYÜK HARF yazımı için)', [['', 'Türkçe (HAKİ, İŞLER)'], ['en', 'İngilizce (FINE, FOODS)']]),
          slogan: text('Kapak sloganı (görsel yoksa kapakta büyük yazılır)', { nostyle: true, compact: true }),
          listLabel: text('Açılır liste butonunun yazısı (boşsa “Yapılan işler”)', { nostyle: true, compact: true }),
          summary: area('Kısa açıklama (kartta görünür)', { nostyle: true }),
          image: image('Kapak görseli', { hint: 'Sitenin ekran görüntüsü önerilir (yatay, 16:10). Yüklemezsen renkli bir kart çıkar.' }),
          url: text('Site / uygulama adresi', { nostyle: true, hint: 'https://ile başlamalı. Boş bırakırsan ziyaret butonu çıkmaz.' }),
          detail: group('Detay sayfası', {
            description: area('Yapılan işler (karttaki açılır liste)', { nostyle: true, hint: 'Her satırın başına * koyarsan madde işaretli liste olur. Boş satır bırakarak yeni paragraf aç. Örn: önce bir başlık satırı, boş satır, sonra * ile başlayan maddeler.' }),
            client: text('Müşteri', { nostyle: true }),
            year: text('Yıl', { nostyle: true, compact: true }),
            tags: list('Teknolojiler / etiketler', text('', { nostyle: true }), { addLabel: 'Etiket ekle', newItem: '', max: 12 }),
            urlLabel: text('Ziyaret butonunun yazısı', { nostyle: true }),
            gallery: list('Galeri', group('', { image: image('Görsel'), caption: text('Alt yazı', { nostyle: true }), cover: bool('Grubun kapağı (kartta bu görsel görünür)') }), { addLabel: 'Görsel ekle', title: (v) => v.caption || 'Görsel', max: 12, newItem: { image: '', caption: '' } }),
            story: area('Hikaye (proje sayfasının girişi; paragraflar arasına boş satır)', { nostyle: true }),
            closing: area('Kapanış cümlesi', { nostyle: true }),
            aboutHeading: text('Uzun açıklama başlığı', { nostyle: true, hint: 'Boş bırakırsan "<Proje adı> hakkında" yazılır.' }),
            about: area('Uzun proje açıklaması (Devamını oku)', { nostyle: true, hint: 'Sayfanın altında, "Devamını oku" ile açılır. "## " ile ara başlık, [metin](page:kimlik) ile iç bağlantı.' }),
            faqHeading: text('SSS başlığı', { nostyle: true, hint: 'Boş bırakırsan "<Proje adı> soruları" yazılır.' }),
            faq: list('Sorular', group('', { title: text('Soru', { nostyle: true }), text: area('Cevap', { nostyle: true }) }), { addLabel: 'Soru ekle', title: (v) => v.title || 'Soru', max: 12, newItem: { title: 'Yeni soru?', text: '' } }),
            sections: list('Proje sayfası bölümleri (başlık + yazı)', group('', { title: text('Başlık', { nostyle: true }), text: area('Yazı', { nostyle: true }), sticker: select('Köşedeki sticker', [['', 'Konuya göre otomatik'], ...Object.entries(STICKERS)]) }), { addLabel: 'Bölüm ekle', title: (v) => v.title || 'Bölüm', max: 12, newItem: { title: '', text: '', sticker: '' } }),
            fun: select('Küçük eğlenceli gösterim', [['', 'Yok'], ['map', 'Sipariş haritası (şehir pini)'], ['reviews', 'Yorum yıldızları (parlar)'], ['delivery', 'Teslimat adımları (kamyon)'], ['badges', 'Rozet şablonları (çok satan)']]),
            slug: text('Sayfa adresi', { nostyle: true, hint: 'Boş bırakırsan proje adından üretilir. Örn. pati-mama → /isler/pati-mama' }),
          }),
          look: group('Görünüm', {
            color: select('Kart rengi', [['', 'Kategorinin rengi'], ...Object.entries(COLOR_NAMES)]),
            live: bool('Kapakta canlı siteyi göster (site gömülmeye izin veriyorsa; görsel yedek olarak kalır)'),
            natural: bool('Görseli kırpmadan göster (geniş afişler için)'),
            featured: bool('Öne çıkan (listede geniş kart)'),
            visible: bool('Sitede göster'),
          }),
        }), {
          addLabel: 'Proje ekle', title: (v) => v.title || 'Yeni proje', max: 100,
          newItem: { title: 'Yeni proje', slug: '', category: 'web', year: String(new Date().getFullYear()), client: '', summary: '', description: '', image: '', url: '', urlLabel: 'Siteyi ziyaret et', tags: [''], gallery: [{ image: '', caption: '' }], color: '', featured: false, live: false, natural: false, badge: '', premium: false, lang: '', story: '', closing: '', listLabel: '', fun: '', sections: [{ title: '', text: '' }], visible: true },
        }),
      },
    },
    {
      id: 'isler-ayarlar', label: 'Sayfa ve kategoriler', path: ['works'], anchor: '#top', previewPage: 'works',
      intro: '/isler sayfasının başlığı, kategoriler (Web siteleri, Web uygulamaları, Danışmanlık…) ve Google bilgileri.',
      schema: {
        visible: bool('İşler sayfası yayında (kapatırsan menüdeki İşler bağlantıları ana sayfadaki bölüme döner)'),
        hero: group('Sayfa başlığı', {
          visible: bool('Başlık alanını göster'),
          eyebrow: text('Küçük üst yazı', { nostyle: true }),
          title: text('Başlık', { nostyle: true }),
          subtitle: text('Alt yazı', { nostyle: true }),
          titleSize: number('Başlık boyutu', 4, 30, ''),
          ribbon,
          stickers: stickerList('Sticker\'lar'),
        }),
        categories: list('Kategoriler', group('', {
          label: text('Kategori adı', { nostyle: true }),
          color: color('Kart rengi'),
          sticker: sticker('Sticker'),
        }), {
          title: (v) => v.label || 'Kategori', max: 8,
          adders: [{ label: 'Kategori ekle', make: () => ({ key: `k${Math.random().toString(36).slice(2, 7)}`, label: 'Yeni kategori', color: 'sun', sticker: 'star' }) }],
        }),
        labels: group('Yazılar', {
          allLabel: text('“Tümü” filtresi', { nostyle: true, compact: true }),
          moreLabel: text('Açılır liste butonu', { nostyle: true, compact: true }),
          emptyText: text('Proje yokken görünen yazı', { nostyle: true }),
        }, { flat: true }),
        photo: group('Ürün çekimi bölümü (listede web uygulamalarından sonra)', {
          visible: bool('Bölümü göster'),
          heading: text('Başlık', { nostyle: true }),
          text: area('Yazı', { nostyle: true }),
          color: color('Kart rengi'),
          points: list('Maddeler', group('', { title: text('Başlık', { nostyle: true }), text: area('Yazı', { nostyle: true }) }), { addLabel: 'Madde ekle', title: (v) => v.title || 'Madde', max: 6, newItem: { title: '', text: '' } }),
          images: list('Çekim görselleri (kategoriye göre gruplanır)', group('', { image: image('Görsel', { hint: 'Kare gösterilir; konu ortada olsun.' }), category: text('Kategori (aynı adı yazanlar bir grupta toplanır)', { nostyle: true, compact: true }), caption: text('Alt yazı', { nostyle: true }) }), { addLabel: 'Görsel ekle', title: (v) => [v.category, v.caption].filter(Boolean).join(' · ') || 'Görsel', max: 60, newItem: { image: '', caption: '', category: '', cover: false } }),
        }),
        faqHeading: text('SSS başlığı (listenin altında)', { nostyle: true, hint: 'Boş bırakırsan "İşlerle ilgili sorular" yazılır.' }),
        faq: list('Sorular', group('', { title: text('Soru', { nostyle: true }), text: area('Cevap', { nostyle: true }) }), { addLabel: 'Soru ekle', title: (v) => v.title || 'Soru', max: 12, newItem: { title: 'Yeni soru?', text: '' } }),
        aboutHeading: text('Uzun açıklama başlığı (listenin en altında)', { nostyle: true }),
        about: area('Uzun açıklama (Devamını oku)', { nostyle: true, hint: '"## " ile ara başlık, [metin](page:kimlik) ile iç bağlantı.' }),
        approach: group('Ortak yaklaşım bölümü (listenin altında)', {
          visible: bool('Bölümü göster'),
          eyebrow: text('Küçük üst yazı', { nostyle: true }),
          heading: text('Başlık', { nostyle: true }),
          text: area('Giriş yazısı', { nostyle: true }),
          points: list('Maddeler', group('', { title: text('Başlık', { nostyle: true }), text: area('Yazı', { nostyle: true }) }), { addLabel: 'Madde ekle', title: (v) => v.title || 'Madde', max: 6, newItem: { title: '', text: '' } }),
          cards: list('Kartlar', group('', { title: text('Başlık', { nostyle: true }), text: area('Yazı', { nostyle: true }) }), { addLabel: 'Kart ekle', title: (v) => v.title || 'Kart', max: 4, newItem: { title: '', text: '' } }),
          quote: area('Alıntı', { nostyle: true }),
        }),
        showContact: bool('Sayfanın altında iletişim bölümünü göster'),
        seo: group('Google', {
          seoTitle: text('Sayfa başlığı', { nostyle: true }),
          seoDescription: area('Açıklama', { nostyle: true }),
        }, { flat: true }),
      },
    },

    { group: 'Tema Yönetimi' },
    {
      id: 'tema-overview', label: 'Temalar', path: [], anchor: '#top', special: 'themes',
      intro: 'Sitenin teması ve renkleri.',
    },
    {
      id: 'theme', label: 'Renkler ve Stil', path: ['theme'], anchor: '#top',
      intro: 'Sitenin tamamındaki renkleri ve genel görünümü buradan ayarlarsın. Bir rengi değiştirince o rengi kullanan her yer güncellenir. Bunlar gündüz renkleridir; gece görünümünün renkleri koda gömülüdür. Değişiklik, Kaydet\'e basınca yayına geçer.',
      schema: {
        colors: group('Renk paleti', Object.fromEntries(Object.entries(COLOR_NAMES).map(([k, v]) => [k, hex(v)]))),
        look: group('Genel görünüm', {
          pageBackground: color('Paneller arasındaki zemin rengi'),
          panelRadius: number('Bölüm köşe yuvarlaklığı', 0, 80, 'px'),
          cardRadius: number('Kart köşe yuvarlaklığı', 0, 60, 'px'),
          panelGap: number('Bölümler arası boşluk', 0, 60, 'px'),
        }, { flat: true }),
        typo: group('Genel yazı ayarları', {
          bodyTracking: number('Metin harf aralığı', -10, 20, '%', 0.5),
          bodyLeading: number('Metin satır aralığı', 80, 250, '%'),
          displayTracking: number('Dev başlık harf aralığı', -15, 10, '%'),
          displayLineHeight: number('Dev başlık satır aralığı', 60, 130, '%'),
          buttonTracking: number('Buton ve küçük etiket harf aralığı', -5, 20, '%', 0.1),
        }, { flat: true }),
      },
    },
    {
      id: 'motion', label: 'Hareketler', path: ['theme'], anchor: '#top',
      intro: 'Sitedeki tüm hareketler, referans sitenin animasyon sistemine göre çalışır. Hepsini tek tek açıp kapatabilir, hızını ve şiddetini ayarlayabilirsin. Açılış ve belirme animasyonlarını önizlemede değil, gerçek sitede (Siteyi aç) görürsün.',
      schema: {
        animations: bool('Tüm hareketler (kapatırsan sitede hiçbir şey oynamaz)'),
        motion: group('Hareket türleri', {
          smooth: bool('Yumuşak, ataletli kaydırma (fare ile gezerken)'),
          intro: bool('Açılış: dev başlığın harfleri boşluktan, bulanıklıktan sıyrılarak yavaşça belirir; alt yazı, butonlar ve sticker\'lar sırayla gelir'),
          reveal: bool('Büyük başlıklar: harfler sağdan sola, soldan kayarak yerine oturur'),
          headings: bool('Alt başlıklar: satırlar 3D dönerek gelir'),
          cards: bool('Kartlar: 3D uçarak gelir (renkli kartlar, iletişim kartları)'),
          pop: bool('Sticker\'lar: küçük ve dönmüş halden zıplayarak belirir, üstüne gelince bir tur atar'),
          idle: bool('Ağırlıksız süzülme: sticker\'lar ve dev başlığın harfleri boşlukta durmadan hafifçe salınır; fareyle çok hafif derinlik kayması'),
          parallax: bool('Kurdele ve banttaki sticker\'lar kaydırırken farklı hızda kayar'),
          device: bool('İşler vitrini: kartlar küçük halden büyüyerek gelir'),
          marquee: bool('Kayan bantlar: kaydırma yönü değişince bant da ters döner, bant kaydırmayla yana kayar'),
          navhide: bool('Menü: aşağı kaydırınca linkler sırayla yukarı uçar, yukarı kaydırınca geri gelir'),
          tabs: bool('Süreç sekmeleri: arka plan sekmeler arasında kayar, içerik soldan kayarak değişir'),
          slider: bool('Renkli kartlar: 4 saniyede bir kendiliğinden ilerler, sürüklenebilir'),
          speed: number('Hız', 25, 300, '%', 5, { hint: '100 = referans sitedeki hız. Büyütürsen hareketler hızlanır, küçültürsen yavaşlar.' }),
          intensity: number('Hareket şiddeti', 0, 200, '%', 5, { hint: 'Kayma miktarlarını (paralaks, bant kayması) büyütür ya da küçültür.' }),
        }),
      },
    },
    {
      id: 'brand', label: 'Marka ve SEO', path: [], anchor: '#top',
      intro: 'Logo, site adı ve Google\'da / paylaşımlarda görünen bilgiler.',
      schema: {
        brand: group('Marka', {
          siteName: text('Site adı', { nostyle: true }),
          logoText: text('Logo yazısı', { compact: true, hint: 'Logo görseli yoksa yuvarlak içinde görünür. 1–3 harf önerilir.', max: 3 }),
          logoImage: image('Logo görseli', { hint: 'Şeffaf zeminli PNG, WEBP ya da SVG en iyi sonucu verir. Tarayıcı sekmesindeki simge olarak da kullanılır.' }),
          logoSize: number('Logo boyutu', 24, 160, 'px', 1, { hint: 'Menüdeki logonun yüksekliği. Telefonda en fazla 64px görünür.' }),
          logoFrame: select('Logo çerçevesi', [['circle', 'Yuvarlak çerçeve (varsayılan)'], ['rounded', 'Yuvarlatılmış kare çerçeve'], ['none', 'Çerçevesiz, logo olduğu gibi']]),
          logoStyle: select('Logoyu temaya uydur (isteğe bağlı)', [['original', 'Uydurma, logo olduğu gibi kalsın (varsayılan)'], ['sticker', 'Sticker gibi: beyaz kenar ve siyah kontur'], ['tint', 'Tek renge boya: logoyu aşağıdaki renkte silüet yap']]),
          logoWordmark: bool('Logonun yanında yazıyı göster (sayfa başındayken görünür, aşağı kaydırınca yazı kapanır, sadece işaret kalır)'),
          logoWordColor: color('Logo yazısının rengi'),
          logoTint: color('Tek renge boyama rengi', { hint: 'Yalnızca "Tek renge boya" seçiliyse kullanılır. Şeffaf zeminli logolarda düzgün sonuç verir.' }),
        }),
        seo: group('Google ve paylaşım', {
          title: text('Sayfa başlığı', { nostyle: true, hint: 'Google sonuçlarında ve tarayıcı sekmesinde görünür. 60 karakter civarı ideal.', counter: 60 }),
          description: area('Açıklama', { nostyle: true, hint: 'Google sonuçlarında başlığın altında görünür. 150–160 karakter ideal.', counter: 160 }),
          shareImage: image('Paylaşım görseli', { hint: 'Link WhatsApp / Instagram\'da paylaşılınca çıkan görsel. 1200×630 önerilir.' }),
        }),
      },
    },
    {
      id: 'sections', label: 'Bölüm sırası', path: ['sections'], anchor: '#top', special: 'sections',
      intro: 'Bölümlerin sırasını oklarla değiştir, göz simgesiyle gizle ya da göster.',
    },
    {
      id: 'ticker', label: 'Kayan Şerit', path: ['ticker'], anchor: '#top',
      intro: 'Sayfanın en üstünde sürekli kayan duyuru şeridi.',
      schema: {
        visible: bool('Şeridi göster'),
        background: color('Arka plan rengi'),
        speed: number('Bir tur süresi (büyüdükçe yavaşlar)', 5, 120, 'sn'),
        items: list('Duyurular', text('', { nostyle: true }), { addLabel: 'Duyuru ekle', newItem: 'Yeni duyuru' }),
        itemsStyle: style('Duyuruların yazı stili', { compact: true }),
      },
    },
    {
      id: 'nav', label: 'Menü', path: ['nav'], anchor: '#top',
      intro: 'Sağ üstteki menü butonları. Telefonda "+" butonunun içinde görünürler.',
      schema: {
        links: list('Menü linkleri', group('', { label: text('Yazı', { nostyle: true }), target: target() }), { addLabel: 'Link ekle', title: (v) => v.label }),
        linksStyle: style('Menü linklerinin yazı stili', { compact: true }),
        cta: group('Siyah ana buton', { label: text('Buton yazısı', { compact: true, hint: 'Boş bırakırsan gizlenir.' }), target: target() }),
        hideLinksOnScroll: bool('Aşağı kaydırınca menü linklerini gizle'),
      },
    },
    {
      id: 'hero', label: 'Giriş (Dev Başlık)', path: ['hero'], anchor: '#top', section: 'hero',
      schema: {
        main: group('Başlık', {
          title: text('Dev başlık'),
          titleColor: color('Başlık rengi'),
          titleSize: number('Başlık büyüklüğü', 6, 40, '', 1, { hint: 'Ekran genişliğine göre ölçeklenir.' }),
          tagline: text('Alt yazı'),
          background: color('Arka plan rengi'),
        }, { flat: true }),
        ribbon,
        buttons: list('Butonlar', group('', {
          label: text('Yazı', { compact: true }), target: target(),
          style: select('Görünüm', [['outline', 'Çerçeveli (beyaz)'], ['solid', 'Dolu (siyah)']]),
          whatsappIcon: bool('Yanında WhatsApp simgesi olsun'),
        }), { addLabel: 'Buton ekle', title: (v) => v.label, max: 4 }),
        stickers: stickerList('Sticker\'lar'),
      },
    },
    {
      id: 'showcase', label: 'İşler vitrini', path: ['showcase'], anchor: '#isler', section: 'showcase',
      intro: 'Dev başlığın altındaki, örnek web sitesi ve ürün fotoğrafı kartının olduğu bölüm.',
      schema: {
        background: color('Arka plan rengi'),
        ribbon,
        photo: group('Ürün fotoğrafı kartı', {
          visible: bool('Kartı göster'),
          image: image('Fotoğraf', { hint: 'Dikey (4:5) bir ürün fotoğrafı en iyi sonucu verir.' }),
          background: color('Fotoğraf yoksa zemin rengi'),
          label: text('Alt yazı'),
          note: text('Küçük not', { hint: 'Boş bırakırsan görünmez.' }),
        }),
        browser: group('Örnek web sitesi penceresi', {
          visible: bool('Pencereyi göster'),
          address: text('Adres çubuğundaki yazı'),
          title: text('Başlık'),
          subtitle: text('Alt başlık'),
          accent: color('Başlık kutusunun rengi'),
          tiles: list('Ürün kutucukları', group('', { color: color('Zemin rengi'), image: image('Görsel') }), { addLabel: 'Kutucuk ekle', max: 6, title: (v, i) => `Kutucuk ${i + 1}` }),
        }),
      },
    },
    {
      id: 'statement', label: 'Büyük italik yazı', path: ['statement'], anchor: '.statement', section: 'statement',
      intro: 'Üç satırlık dev italik yazı. Her satırda yazılar ve aralardaki sticker\'lar ayrı ayrı düzenlenir.',
      schema: {
        background: color('Arka plan rengi'),
        l1: group('1. satır', { line1Start: text('Baştaki yazı', { nostyle: true }), line1Sticker: sticker('Aradaki sticker', { none: true }), line1End: text('Sondaki yazı', { nostyle: true }), line1Sticker2: sticker('Satır sonundaki sticker', { none: true }), line1Style: style('1. satırın yazı stili') }),
        l2: group('2. satır', {
          line2Sticker: sticker('Baştaki sticker', { none: true }), line2Start: text('Yazı', { nostyle: true }),
          card: group('Aradaki buton kartı', { visible: bool('Kartı göster'), label: text('Kart yazısı', { compact: true }), target: target(), color: color('Kart rengi') }),
          line2End: text('Sondaki yazı', { nostyle: true }),
          line2Style: style('2. satırın yazı stili'),
        }),
        button: button('Sayfaya giden buton (boşsa görünmez)'),
        l3: group('3. satır', { line3: text('Yazı'), line3Sticker: sticker('Sondaki sticker', { none: true }) }),
      },
    },
    {
      id: 'services', label: 'Hizmetler', path: ['services'], anchor: '#hizmetler', section: 'services',
      intro: 'Hepsi aynı boyutta kutular. Her kutuda tek cümlelik özet var; "Neler yapıyoruz?" düğmesine basınca altındaki işler açılır.',
      schema: {
        background: color('Bölümün arka plan rengi'),
        heading: text('Bölüm başlığı'),
        more: list('Hizmet kutuları', group('', {
          title: area('Başlık', { hint: lineHint }),
          text: area('Tek cümlelik özet'),
          color: color('Kutu rengi'),
          sticker: sticker('Sticker'),
          sticker2: sticker('2. sticker (isteğe bağlı, yanına eklenir)'),
          button: group('Ayrıntıların altındaki buton', { label: text('Buton yazısı', { compact: true, hint: 'Boş bırakırsan gizlenir.' }), target: target() }, { flat: true }),
          items: list('Açılınca görünen işler', group('', {
            label: text('İş adı', { compact: true, nostyle: true }),
            text: area('Açıklama', { nostyle: true }),
            target: target(),
          }), { addLabel: 'İş ekle', title: (v) => v.label, max: 12, newItem: { label: 'Yeni iş', text: 'Açıklama.', target: 'works:web' } }),
        }), { addLabel: 'Kutu ekle', title: (v) => String(v.title).replace(/\n/g, ' '), max: 12, newItem: { title: 'Yeni kutu', text: 'Kısa açıklama.', color: 'sun', sticker: 'star', sticker2: '', button: { label: '', target: '#iletisim' }, items: [{ label: 'Yeni iş', text: 'Açıklama.', target: 'works:web' }] } }),
      },
    },
    {
      id: 'why', label: 'Neden biz', path: ['why'], anchor: '#neden', section: 'why',
      intro: 'Başlık, iki buton ve yana kaydırılan renkli kartlar. Butonlar giriş bölümündeki butonlarla aynıdır.',
      schema: {
        background: color('Arka plan rengi'),
        heading: area('Başlık'),
        showButtons: bool('Başlığın altında butonları göster'),
        partnerShow: bool('İş ortaklığı bölümünü göster (ikas × The Goatz Studio)'),
        partnerTitle: text('İş ortaklığı: küçük etiket (örn. İş ortaklığı)'),
        partnerHeading: area('İş ortaklığı: başlık'),
        partnerText: area('İş ortaklığı: yazı'),
        partnerChips: area('İş ortaklığı: küçük maddeler (her satır bir madde)'),
        partnerButtonLabel: text('İş ortaklığı: buton yazısı (boşsa buton çıkmaz)'),
        partnerButtonTarget: text('İş ortaklığı: buton hedefi (örn. page:anahtarteslim)'),
        cards: list('Kartlar', group('', {
          title: area('Kart yazısı', { hint: lineHint }),
          text: area('Kartın arka yüzü (boş bırakırsan kart çevrilmez)'),
          color: color('Kart rengi'),
          sticker: sticker('Sticker'),
          image: image('Fotoğraf (isteğe bağlı)', { hint: 'Yüklersen sticker yerine kartın üst kısmında görünür.' }),
        }), { addLabel: 'Kart ekle', title: (v) => v.title.replace(/\n/g, ' '), max: 12, newItem: { title: 'Yeni\nkart', text: '', color: 'sun', sticker: 'star', image: '' } }),
      },
    },
    {
      id: 'faq', label: 'Sık sorulan sorular', path: ['faq'], anchor: '.blk-faq', section: 'faq',
      intro: 'Ana sayfadaki SSS. Görünümü sitedeki diğer SSS bölümleriyle aynıdır (sarı zemin, "Tüm sorular" butonu).',
      schema: {
        heading: text('Başlık', { nostyle: true }),
        cards: list('Sorular', group('', { title: text('Soru', { nostyle: true }), text: area('Cevap', { nostyle: true }) }), { addLabel: 'Soru ekle', title: (v) => v.title || 'Soru', max: 12, newItem: { title: 'Yeni soru?', text: '' } }),
      },
    },
    {
      id: 'about', label: 'Uzun açıklama', path: ['about'], anchor: '.blk-more', section: 'about',
      intro: 'Ana sayfadaki uzun açıklama. "Devamını oku" ile açılır, geniş ekranda iki sütun. "## " ile ara başlık, [metin](page:kimlik) ile iç bağlantı.',
      schema: {
        eyebrow: text('Küçük üst yazı', { nostyle: true }),
        heading: text('Başlık', { nostyle: true }),
        text: area('Yazı', { nostyle: true }),
      },
    },
    {
      id: 'band', label: 'Etiket bandı', path: ['band'], anchor: '.band', section: 'band',
      intro: 'Siyah zeminde iki sıra halinde kayan renkli etiketler.',
      schema: {
        text: text('Etiket yazısı'),
        speed: number('Bir tur süresi (büyüdükçe yavaşlar)', 5, 120, 'sn'),
        row1: list('Üst sıradaki etiket renkleri', color(''), { addLabel: 'Renk ekle', newItem: 'sun', max: 8 }),
        row2: list('Orta sıradaki etiket renkleri', color(''), { addLabel: 'Renk ekle', newItem: 'mint', max: 8 }),
        row3: list('Alt sıradaki etiket renkleri', color(''), { addLabel: 'Renk ekle', newItem: 'sun', max: 8 }),
        stickers: stickerList('Banttaki sticker\'lar'),
      },
    },
    {
      id: 'process', label: 'Süreç sekmeleri', path: ['process'], anchor: '#surec', section: 'process',
      intro: 'Sekmeli "Nasıl çalışıyoruz?" bölümü. Her sekmenin kendi adımları vardır.',
      schema: {
        background: color('Arka plan rengi'),
        heading: text('Başlık'),
        intro: area('Kısa açıklama (isteğe bağlı)'),
        roadmap: list('Yol haritası adımları', group('', {
          title: area('Başlık', { hint: lineHint }), text: area('Açıklama'), color: color('Renk'), sticker: sticker('Sticker'),
        }), { addLabel: 'Adım ekle', title: (v) => (v.title || '').split('\n').join(' '), max: 6, newItem: { title: 'Yeni adım', text: 'Açıklama.', color: 'sun', sticker: 'star' } }),
        button: group('Alttaki buton', { label: text('Buton yazısı', { compact: true, hint: 'Boş bırakırsan gizlenir.' }), target: target() }, { flat: true }),
        tabs: list('Sekmeler (eski; yol haritası doluysa kullanılmaz)', group('', {
          tab: text('Sekme adı', { compact: true }),
          title: area('Büyük başlık', { hint: lineHint }),
          steps: list('Adımlar', area('', { nostyle: true }), { addLabel: 'Adım ekle', newItem: 'Yeni adım.', max: 10 }),
          stepsStyle: style('Adımların yazı stili', { compact: true }),
          button: group('Buton', { label: text('Buton yazısı', { compact: true, hint: 'Boş bırakırsan gizlenir.' }), target: target() }, { flat: true }),
          visual: group('Görsel alanı', {
            image: image('Fotoğraf (isteğe bağlı)'), color: color('Zemin rengi'), sticker: sticker('Sticker'),
          }),
        }), {
          addLabel: 'Sekme ekle', title: (v) => v.tab, max: 6,
          newItem: { tab: 'Yeni sekme', title: 'Yeni\nsekme', color: 'sun', sticker: 'star', image: '', steps: ['İlk adım.'], button: { label: 'Teklif al ↗', target: '#iletisim' } },
        }),
      },
    },
    {
      id: 'contact', label: 'İletişim', path: ['contact'], anchor: '#iletisim', section: 'contact',
      intro: 'Buradaki bilgiler sitedeki tüm WhatsApp, Instagram ve e-posta butonlarında kullanılır.',
      schema: {
        info: group('İletişim bilgileri', {
          whatsapp: text('WhatsApp numarası', { nostyle: true, hint: 'Ülke koduyla, boşluksuz yaz. Örnek: 905321234567', inputmode: 'tel' }),
          whatsappMessage: area('WhatsApp hazır mesajı', { nostyle: true, hint: 'Müşteri butona basınca mesaj kutusunda bu yazı hazır gelir.' }),
          instagram: text('Instagram kullanıcı adı', { nostyle: true, hint: '@ ile ya da @ olmadan yazabilirsin.' }),
          email: text('E-posta adresi', { nostyle: true, inputmode: 'email' }),
        }),
        look: group('Görünüm', { heading: area('Dev başlık', { hint: lineHint }), background: color('Arka plan rengi') }),
        cards: group('İletişim kartları', Object.fromEntries(['whatsapp', 'instagram', 'email'].map((k) => [k, group({ whatsapp: 'WhatsApp kartı', instagram: 'Instagram kartı', email: 'E-posta kartı' }[k], {
          visible: bool('Kartı göster'), label: text('Üstteki küçük yazı'), title: text('Büyük yazı'), infoStyle: style('Alttaki numara / hesap yazısının stili'), color: color('Kart rengi'),
        })]))),
      },
    },
    {
      id: 'footer', label: 'Alt bilgi (footer)', path: ['footer'], anchor: '#altbilgi', section: 'footer',
      intro: 'Sitenin ve tüm sayfaların en altındaki bölüm. Logo, tanıtım yazısı, sayfa ve iletişim linkleri (kendiliğinden dolar), dev yazı ve alt satırdan oluşur.',
      schema: {
        background: color('Arka plan rengi'),
        brand: group('Marka alanı', {
          showLogo: bool('Logoyu göster'),
          description: area('Kısa tanıtım yazısı', { hint: 'Boş bırakırsan görünmez.' }),
        }, { flat: true }),
        cols: group('Sütunlar', {
          showLinks: bool('Sayfa linkleri sütununu göster'),
          linksTitle: text('Sayfa linkleri sütun başlığı', { compact: true, hint: 'Linkler menüden ve "Menüye ekle" işaretli sayfalardan kendiliğinden gelir.' }),
          extraLinks: list('Alt bilgiye ek bağlantılar (menüde görünmez)', group('', { label: text('Yazı', { nostyle: true }), target: target() }), { addLabel: 'Bağlantı ekle', title: (v) => v.label || 'Bağlantı', max: 10, newItem: { label: '', target: '#iletisim' } }),
          showContact: bool('İletişim sütununu göster'),
          contactTitle: text('İletişim sütun başlığı', { compact: true, hint: 'WhatsApp, Instagram ve e-posta, İletişim sayfasında girdiklerinden gelir.' }),
        }, { flat: true }),
        legal: group('Yasal bağlantılar sütunu (Sayfalar\'ın solunda)', {
          showLegal: bool('Yasal sütununu göster'),
          legalTitle: text('Sütun başlığı', { compact: true }),
          legalLinks: list('Yasal sayfa linkleri', group('', { label: text('Yazı', { nostyle: true }), target: target() }), { addLabel: 'Link ekle', title: (v) => v.label || 'Link', max: 10, newItem: { label: '', target: '#iletisim' } }),
          companyInfo: area('Firma bilgisi (isteğe bağlı)', { hint: 'Ünvan, vergi no, adres gibi bilgileri buraya yazarsan marka alanının altında küçük yazıyla görünür. Boşsa görünmez.' }),
        }, { flat: true }),
        big: group('Dev yazı', { bigText: text('Dev yazı', { hint: 'Boş bırakırsan görünmez.' }) }, { flat: true }),
        bottom: group('Alt satır', { copyright: text('Sol alttaki yazı'), tagline: text('Sağ alttaki yazı') }, { flat: true }),
        stickers: stickerList('Sticker\'lar'),
      },
    },
    { group: 'Entegrasyonlar' },
    {
      id: 'entegrasyon-odeme', label: 'Ödeme', path: [], anchor: '#top',
      intro: 'Ödeme hizmetlerini entegre edin (Stripe, PayPal, vb).',
    },
    {
      id: 'entegrasyon-kargo', label: 'Kargo', path: [], anchor: '#top',
      intro: 'Kargo hizmetlerini entegre edin.',
    },
    {
      id: 'entegrasyon-pazaryeri', label: 'Pazaryerleri', path: [], anchor: '#top',
      intro: 'Pazaryeri entegrasyonlarını yönetin.',
    },

    { group: 'Ayarlar' },
    {
      id: 'ayar-magaza', label: 'Mağaza', path: [], anchor: '#top',
      intro: 'Mağaza bilgilerini yapılandırın.',
    },
    {
      id: 'ayar-lokalizasyon', label: 'Lokalizasyon', path: [], anchor: '#top',
      intro: 'Dil, para birimi ve bölge ayarları.',
    },
    {
      id: 'ayar-bildirimler', label: 'Bildirimler', path: [], anchor: '#top',
      intro: 'E-posta ve SMS bildirimlerini yapılandırın.',
    },
    {
      id: 'ayar-kullanicilar', label: 'Kullanıcılar', path: [], anchor: '#top',
      intro: 'Kullanıcıları ve rollerini yönetin.',
    },
    { id: 'mesajlar', label: 'Gelen Mesajlar', special: 'messages', anchor: '#top', intro: 'İletişim formundan gelen mesajlar. Yanıt için e-posta adresine tıkla.' },
    { id: 'kampanya', label: 'Kampanya (Shopier %10)', special: 'promo', anchor: '#top', intro: 'Ana sayfadaki Shopier %10 penceresi: kaç kişi gördü, kaçı Teklif al’a tıkladı, kimler form gönderdi. Pencereden Teklif al’a tıklayan kişi 30 gün içinde hangi formdan yazarsa yazsın burada görünür.' },
    { id: 'media', label: 'Görsel Kütüphanesi', special: 'media', anchor: '#top', intro: 'Yüklediğin tüm görseller. Buradan yeni görsel yükleyebilir ya da kullanmadıklarını silebilirsin.' },
    { id: 'backups', label: 'Yedekler', special: 'backups', anchor: '#top', intro: 'Her kaydetmede eski içerik otomatik yedeklenir (son 30 kayıt). Bir yedeği yükleyip kaydedersen site o hale döner.' },
  ];

  // ---------- Özel sayfalar: şema ----------
  const BLOCK_TYPES = { why: 'Neden biz (ana sayfadaki kartlar ve ikas paneli)', form: 'İletişim formu', text: 'Başlık ve metin', imagetext: 'Görsel + metin', cards: 'Kart ızgarası', faq: 'Sık sorulan sorular', gallery: 'Galeri', wizard: 'Teklif sihirbazı (proje oluşturucu)', map: 'Konum haritası', cartpage: 'Sepet sayfası içeriği', bloglist: 'Blog yazıları listesi' };
  const is = (...types) => (o) => types.includes(o.type);
  const BLOCK_FIELDS = {
    type: select('Blok türü', Object.entries(BLOCK_TYPES)),
    visible: bool('Bu bloğu sayfada göster'),
    background: color('Blok arka plan rengi'),
    eyebrow: text('Küçük üst yazı', { compact: true }),
    heading: area('Başlık', { hint: lineHint }),
    text: area('Metin', { hint: 'Boş bir satır bırakarak yeni paragraf açarsın.', showIf: is('text', 'imagetext', 'cards', 'faq', 'gallery', 'form') }),
    align: select('Hizalama', [['left', 'Sola yaslı'], ['center', 'Ortalı']]),
    collapse: bool('Uzun metni kısalt ("Devamını oku" düğmesiyle açılır)', { showIf: is('text') }),
    partnerLockup: bool('Başlığın sağında ikas × The Goatz Studio işareti', { showIf: is('text') }),
    image: image('Görsel', { hint: 'Kare ya da yatay bir görsel iyi durur.', showIf: is('imagetext') }),
    imageSide: select('Görsel hangi tarafta?', [['left', 'Solda'], ['right', 'Sağda']]),
    imageColor: color('Görsel yokken zemin rengi'),
    imageSticker: sticker('Görsel yokken sticker'),
    button: group('Buton', { label: text('Buton yazısı', { compact: true, hint: 'Boş bırakırsan buton görünmez.' }), target: target() }, { flat: true }),
    columns: number('Sütun sayısı', 1, 5, '', 1, { hint: 'Kart ızgarasında en fazla 4, galeride en fazla 5 sütun kullanılır. Telefonda otomatik azalır.', showIf: is('cards', 'gallery') }),
    cards: list('Kartlar', group('', {
      title: area('Başlık', { hint: lineHint }),
      text: area('Açıklama'),
      color: color('Kart rengi'),
      sticker: sticker('Sticker'),
      image: image('Fotoğraf (isteğe bağlı)', { hint: 'Yüklersen sticker yerine kartın üstünde görünür.' }),
      target: target('"Detaylı bilgi" bağlantısı (isteğe bağlı)', { optional: true }),
    }), { addLabel: 'Kart ekle', max: 12, title: (v) => v.title.replace(/\n/g, ' '), showIf: is('cards', 'faq'),
      newItem: { title: 'Yeni soru', text: 'Cevap. Bağlantı için {{Metin|/adres}} yazabilirsin.', color: 'sun', sticker: 'star', image: '' } }),
    ratio: select('Görsel oranı', [['square', 'Kare'], ['portrait', 'Dikey (4:5)'], ['wide', 'Yatay (16:10)'], ['natural', 'Orijinal oran']]),
    bulk: { type: 'gallerybulk', hint: 'Birden çok fotoğrafı tek seferde seçip yükleyebilirsin (en fazla 40 görsel).' },
    images: list('Görseller', group('', { image: image('Görsel'), caption: text('Alt yazı (isteğe bağlı)', { nostyle: true }) }),
      { addLabel: 'Görsel ekle', max: 40, title: (v, i) => v.caption || `Görsel ${i + 1}`, newItem: { image: '', caption: '' } }),
  };
  // Hangi alan hangi blok türünde görünür
  BLOCK_FIELDS.align.showIf = is('text', 'cards', 'gallery');
  BLOCK_FIELDS.imageSide.showIf = is('imagetext');
  BLOCK_FIELDS.imageColor.showIf = is('imagetext');
  BLOCK_FIELDS.imageSticker.showIf = is('imagetext');
  BLOCK_FIELDS.button.showIf = is('text', 'imagetext', 'form', 'faq');
  BLOCK_FIELDS.ratio.showIf = is('gallery');
  BLOCK_FIELDS.bulk.showIf = is('gallery');
  BLOCK_FIELDS.images.showIf = is('gallery');
  BLOCK_FIELDS.heading.showIf = () => true;

  const PAGE_SCHEMA = {
    settings: group('Sayfa ayarları', {
      visible: bool('Sayfayı sitede yayında göster'),
      kind: select('Sayfa türü', [['page', 'Normal sayfa'], ['blog', 'Blog yazısı (adresi /blog/... olur, Blog listesinde görünür)'], ['service', 'Hizmet / kategori sayfası (adresi /hizmetler/... olur)']]),
      parent: text('Bağlı olduğu kategori sayfası (hizmet sayfası)', { nostyle: true, hint: 'Kategori sayfasının kimliği (örn. kmarka). Kategori sayfalarında boş kalır.', max: 24 }),
      date: text('Yayın tarihi (blog yazısı)', { nostyle: true, hint: 'YYYY-AA-GG biçiminde. Örnek: 2026-10-03', max: 10 }),
      title: text('Sayfa adı', { nostyle: true, hint: 'Menüde ve tarayıcı sekmesinde görünür.', max: 60 }),
      slugAuto: bool('Sayfa adresini sayfa adından otomatik oluştur', { rerender: true }),
      slug: text('Sayfa adresi', { nostyle: true, hint: 'Yalnızca küçük harf, rakam ve tire. Örnek: hakkimizda', max: 40 }),
      inNav: bool('Sitenin menüsüne ekle'),
      navLabel: text('Menüdeki yazı', { nostyle: true, hint: 'Boş bırakırsan sayfa adı kullanılır.', max: 30 }),
      showContact: bool('Sayfanın altında iletişim bölümünü göster'),
      background: color('Üst bölümün arka plan rengi'),
    }, { flat: true }),
    seo: group('Google ve paylaşım', {
      seoTitle: text('Google başlığı', { nostyle: true, hint: 'Boş bırakırsan "Sayfa adı — Site adı" kullanılır.', counter: 60 }),
      seoDescription: area('Google açıklaması', { nostyle: true, hint: 'Boş bırakırsan ana sayfanın açıklaması kullanılır.', counter: 160 }),
    }, { flat: true }),
    hero: group('Sayfanın üst başlık bölümü', {
      visible: bool('Üst başlık bölümünü göster'),
      eyebrow: text('Küçük üst yazı', { compact: true, hint: 'Boş bırakırsan görünmez.' }),
      title: text('Büyük başlık', { hint: 'Boş bırakırsan sayfa adı kullanılır.' }),
      titleSize: number('Başlık büyüklüğü', 4, 30, '', 1, { hint: 'Ekran genişliğine göre ölçeklenir.' }),
      subtitle: text('Alt yazı', { hint: 'Boş bırakırsan görünmez.' }),
      ribbon,
      stickers: stickerList('Sticker\'lar'),
    }),
    blocks: list('İçerik blokları', group('', BLOCK_FIELDS), {
      addLabel: 'Blok ekle', max: 40, title: (v) => `${BLOCK_TYPES[v.type] || 'Blok'}${v.heading ? ` · ${v.heading.replace(/\n/g, ' ')}` : ''}`,
      adders: Object.entries(BLOCK_TYPES).map(([type, name]) => ({ label: name, make: () => newBlock(type) })),
    }),
  };
  PAGE_SCHEMA.settings.fields.slug.showIf = (o) => !o.slugAuto;

  const newBlock = (type) => {
    const b = structuredClone(window.GoatzRender.DEFAULTS.pages.__item.blocks[0]);
    b.type = type; b.cards = []; b.images = [];
    if (type === 'text') { b.heading = 'Başlık'; }
    if (type === 'imagetext') { b.heading = 'Görsel ve metin'; b.background = 'sky'; }
    if (type === 'cards') {
      b.heading = 'Neler yapıyoruz?'; b.text = ''; b.align = 'center';
      b.cards = [
        { title: 'Ürün\nçekimi', text: 'Kısa açıklama.', color: 'mint', sticker: 'camera', image: '' },
        { title: 'Web\nsitesi', text: 'Kısa açıklama.', color: 'lavender', sticker: 'browser', image: '' },
        { title: 'Marka\ndanışmanlığı', text: 'Kısa açıklama.', color: 'sun', sticker: 'star', image: '' },
      ];
    }
    if (type === 'faq') { b.heading = 'Sık sorulan sorular'; b.eyebrow = 'SSS'; b.text = ''; b.background = 'sun'; b.button = { label: 'Tüm sorular ↗', target: 'page:sss' }; b.cards = [{ title: 'Örnek soru?', text: 'Örnek cevap.', color: 'sun', sticker: 'star', image: '' }]; }
    if (type === 'gallery') { b.heading = 'Galeri'; b.text = ''; }
    return b;
  };
  const newPage = () => {
    const p = structuredClone(window.GoatzRender.DEFAULTS.pages.__item);
    p.id = `p${Math.random().toString(36).slice(2, 8)}`;
    let n = 1, title = 'Yeni sayfa';
    while (state.pages.some((x) => x.title === title)) title = `Yeni sayfa ${++n}`;
    p.title = title;
    p.blocks = [newBlock('text')];
    return p;
  };
  // Hareketler tek sayfada toplanmaz: her hareket, ait olduğu bölümün "Hareket" satırında durur (site.js'te hangi bölümü etkilediğine göre).
  // Bölüme ait olmayan, tüm siteyi ilgilendirenler Tema Ayarları altında üç ayrı satırdadır.
  const MF = PAGES.find((x) => x.id === 'motion').schema.motion.fields;
  const MOTION_FOR = {
    ticker: ['marquee'], nav: ['navhide'], hero: ['intro', 'idle', 'parallax'], showcase: ['device'],
    services: ['cards'], why: ['cards', 'slider'], band: ['marquee', 'parallax'], process: ['tabs'], contact: ['cards'],
  };
  const motionSchema = (flags) => ({ motion: group('Hareket', Object.fromEntries(flags.map((f) => [f, MF[f]]))) });
  {
    const mi = PAGES.findIndex((x) => x.id === 'motion');
    PAGES.splice(mi + 1, 0,
      { id: 'm-text', label: 'Başlık hareketleri', path: ['theme'], anchor: '#top', schema: { motion: group('Başlık hareketleri', { reveal: MF.reveal, headings: MF.headings }) } },
      { id: 'm-sticker', label: 'Sticker hareketleri', path: ['theme'], anchor: '#top', schema: { motion: group('Sticker hareketleri', { pop: MF.pop }) } },
      { id: 'm-font', label: 'Yazı tipi', path: ['theme'], anchor: '#top', schema: { font: { type: 'fontpicker', label: 'Sitenin yazı tipi' } } },
      { id: 'm-global', label: 'Kaydırma ve hız', path: ['theme'], anchor: '#top', schema: { animations: bool('Tüm hareketler (kapatırsan sitede hiçbir şey oynamaz)'), motion: group('Kaydırma ve hız', { smooth: MF.smooth, speed: MF.speed, intensity: MF.intensity }) } });
  }
  // Marka (site adı + logo) menüde göründüğü için tema düzenleyicide Menü bölümünün altındadır; Ayarlar'da yalnız SEO kalır (aynı veri iki yerde düzenlenmez).
  const BRAND_GROUP = PAGES.find((x) => x.id === 'brand').schema.brand;
  {
    const bd = PAGES.find((x) => x.id === 'brand');
    PAGES.splice(PAGES.findIndex((x) => x.id === 'ayar-magaza'), 0, { id: 'ayar-marka', label: 'SEO ve paylaşım', path: [], anchor: '#top', intro: 'Google\'da ve paylaşımlarda görünen bilgiler.', schema: { seo: bd.schema.seo } });
    for (const id of ['brand', 'ayar-magaza']) PAGES.splice(PAGES.findIndex((x) => x.id === id), 1);
  }
  const customDef = (p) => ({ id: `pg:${p.id}`, label: p.title || 'Sayfa', custom: true, pageId: p.id, anchor: '#top' });

  // Gruplar "flat" olabilir ya da bir veri anahtarına karşılık gelmeyebilir.
  // Bir grubun alt alanları ebeveyn nesnede duruyorsa (anahtar veride yoksa) grup yalnızca görseldir.

  // =====================================================================
  //  Durum
  // =====================================================================
  let state = null;
  let saved = '';
  // Panele ilk girişte (yeni sekme ya da şifreyle giriş) hep Dashboard açılır; aynı sekmede yenileyince sayfa korunur
  const freshVisit = (() => { try { if (sessionStorage.getItem('goatz-panel-acik')) return false; sessionStorage.setItem('goatz-panel-acik', '1'); } catch {} return true; })();
  if (freshVisit && location.hash) history.replaceState(null, '', location.pathname + location.search);
  let page = PAGES.find((p) => p.id === (location.hash.slice(1) || 'dashboard')) || PAGES.find((p) => p.id === 'hero');
  let previewPage = null; // önizlenen özel sayfanın kimliği (null = ana sayfa)
  const changeHooks = new Set();
  const collapsed = new Map();
  let pendingImage = null;

  const $ = (s, r = document) => r.querySelector(s);
  const h = (tag, attrs = {}, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'html') el.innerHTML = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(kid));
    return el;
  };
  const get = (path) => path.reduce((o, k) => (o == null ? o : o[k]), state);
  const set = (path, value) => {
    const parent = get(path.slice(0, -1));
    parent[path[path.length - 1]] = value;
    changed();
  };

  async function request(url, opts = {}) {
    const res = await fetch(url, { credentials: 'same-origin', ...opts, headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) } });
    if (res.status === 401 && !url.endsWith('/login')) { showLogin(); throw new Error('Oturum kapandı, tekrar giriş yap.'); }
    const type = res.headers.get('content-type') || '';
    const data = type.includes('json') ? await res.json() : await res.text();
    if (!res.ok) throw new Error(data.error || 'Bir hata oluştu.');
    return data;
  }

  function toast(msg, err = false, action = null) {
    document.querySelectorAll('.toast').forEach((x) => x.remove());
    const t = h('div', { class: `toast${err ? ' err' : ''}`, role: 'status' }, msg,
      action ? h('button', { type: 'button', class: 'toast-act', onclick: () => { action.run(); t.remove(); } }, action.label) : null);
    document.body.append(t);
    setTimeout(() => t.remove(), action ? 7000 : 2600);
  }

  // =====================================================================
  //  Giriş
  // =====================================================================
  function showLogin() {
    $('#app').hidden = true;
    $('#login').hidden = false;
    $('#password').focus();
  }
  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    $('#loginError').textContent = '';
    try {
      await request('/api/login', { method: 'POST', body: JSON.stringify({ password: $('#password').value }) });
      $('#password').value = '';
      if (location.hash) history.replaceState(null, '', location.pathname + location.search);
      page = PAGES.find((p) => p.id === 'dashboard'); previewPage = null;
      start();
    } catch (err) { $('#loginError').textContent = err.message; }
  });
  $('#logoutBtn').addEventListener('click', async () => {
    if (isDirty() && !confirm('Kaydedilmemiş değişiklikler var. Yine de çıkılsın mı?')) return;
    await request('/api/logout', { method: 'POST', body: '{}' });
    saved = JSON.stringify(state);
    showLogin();
  });

  let unreadMsgs = 0;
  function setUnread(n) { if (n !== unreadMsgs) { unreadMsgs = n; renderNav(); } }
  const refreshUnread = () => request('/api/messages').then((l) => setUnread(l.filter((m) => !m.read).length)).catch(() => {});
  async function start() {
    state = await request('/api/content');
    saved = JSON.stringify(state);
    const cp = state.pages.find((p) => `pg:${p.id}` === location.hash.slice(1));
    if (cp) { page = customDef(cp); previewPage = cp.id; }
    else if (page.previewPage) previewPage = page.previewPage;
    $('#login').hidden = true;
    $('#app').hidden = false;
    const bl = $('.brand .logo-dot');
    if (state.brand.logoImage && bl) { bl.classList.add('has-img'); bl.replaceChildren(h('img', { src: state.brand.logoImage, alt: '' })); }
    if (cp && location.hash.length > 1) { editTheme = activeId(); tePageSel = cp.id; teView = 'sections'; }
    if (!page.custom && TE_IDS().has(page.id) && location.hash.length > 1) {
      editTheme = activeId();
      teView = ['theme', 'brand', 'sections', 'm-text', 'm-sticker', 'm-font', 'm-global'].includes(page.id) ? 'settings' : 'sections';
    }
    navFollow = location.hash.length > 1;
    renderNav();
    renderPage();
    refreshPreview(true);
    updateStatus();
    refreshUnread();
    setInterval(() => { if (!document.hidden) refreshUnread(); }, 60000);
    if (location.hash.length > 1 || page.id === 'dashboard') openPanel();
  }

  // =====================================================================
  //  Kaydetme ve durum
  // =====================================================================
  const isDirty = () => state && JSON.stringify(state) !== saved;
  function updateStatus() {
    const dirty = isDirty();
    $('#saveBtn').disabled = !dirty;
    const ts = $('#teSave'); if (ts) ts.disabled = !dirty;
    const ps = $('#panelSave'); if (ps) { ps.disabled = !dirty; ps.hidden = !dirty; }
    $('#status').textContent = dirty ? '● Kaydedilmemiş değişiklikler' : 'Tüm değişiklikler kaydedildi';
    $('#status').classList.toggle('dirty', dirty);
  }
  // Her değişiklik bir sonraki çizim karesinde önizlemeye işlenir (beklemeden, sayfa yenilenmeden).
  let patchQueued = false;
  function changed() {
    updateStatus();
    changeHooks.forEach((fn) => fn());
    if (patchQueued) return;
    patchQueued = true;
    requestAnimationFrame(() => { patchQueued = false; livePatch(); });
  }
  async function save() {
    if (!isDirty()) return;
    $('#saveBtn').disabled = true;
    let fontWarn = '';
    try {
      if (liveStash) {
        // Yayında olmayan tema düzenleniyor: yayındaki ayarlar aynen kalır, düzenlenen tema state.themes içine yazılır.
        const r = await request('/api/content', { method: 'PUT', body: JSON.stringify({ ...state, ...liveStash, themes: { ...state.themes, [editTheme]: pickSlice(state) } }) });
        fontWarn = r.fontWarning; delete r.fontWarning;
        liveStash = pickSlice(r);
        state = { ...r, ...structuredClone(r.themes[editTheme] || pickSlice(state)) };
      } else state = await request('/api/content', { method: 'PUT', body: JSON.stringify(state) });
      if (state.fontWarning) { fontWarn = state.fontWarning; delete state.fontWarning; }
      saved = JSON.stringify(state);
      updateStatus();
      if (fontWarn) { toast(`Kaydedildi, ama ${fontWarn}`, true); renderPage(); } else toast('Kaydedildi. Site güncellendi.');
    } catch (err) { toast(err.message, true); updateStatus(); }
  }
  $('#saveBtn').addEventListener('click', save);
  $('#panelSave').addEventListener('click', save);
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
  });
  window.addEventListener('beforeunload', (e) => { if (isDirty()) { e.preventDefault(); e.returnValue = ''; } });

  // =====================================================================
  //  Önizleme
  // =====================================================================
  const frame = $('#preview');
  // Önizleme tarayıcıda üretilir (aynı şablon dosyası) ve canlı sayfaya yalnızca değişen yerler işlenir.
  // Böylece kaydırıcıyı sürüklerken sayfa yenilenmez, kaydırma konumu ve animasyonlar bozulmaz.
  let lastTree = null;
  const previewHtml = () => {
    const R = window.GoatzRender;
    return R.render(R.conform(R.DEFAULTS, state), { preview: true, page: previewPage });
  };
  const parseDoc = (html) => new DOMParser().parseFromString(html, 'text/html');

  const styleMap = (css) => {
    const t = document.createElement('div');
    t.style.cssText = css || '';
    const m = new Map();
    for (let i = 0; i < t.style.length; i++) {
      const k = t.style[i];
      m.set(k, [t.style.getPropertyValue(k), t.style.getPropertyPriority(k)]);
    }
    return m;
  };
  // Eski ve yeni özellikleri karşılaştırıp yalnızca farkı canlı elemana uygular
  // (betiğin eklediği sınıflar ve stil değişkenleri korunur).
  function syncAttrs(o, n, l) {
    for (const name of new Set([...o.getAttributeNames(), ...n.getAttributeNames()])) {
      const ov = o.getAttribute(name), nv = n.getAttribute(name);
      if (ov === nv) continue;
      if (name === 'class') {
        const os = new Set((ov || '').split(/\s+/).filter(Boolean)), ns = new Set((nv || '').split(/\s+/).filter(Boolean));
        os.forEach((c) => { if (!ns.has(c)) l.classList.remove(c); });
        ns.forEach((c) => { if (!os.has(c)) l.classList.add(c); });
      } else if (name === 'style') {
        const om = styleMap(ov), nm = styleMap(nv);
        om.forEach((_, k) => { if (!nm.has(k)) l.style.removeProperty(k); });
        nm.forEach(([v, p], k) => { const prev = om.get(k); if (!prev || prev[0] !== v || prev[1] !== p) l.style.setProperty(k, v, p); });
      } else if (nv === null) l.removeAttribute(name);
      else l.setAttribute(name, nv);
    }
  }
  function patchNode(o, n, l, doc) {
    if (o.nodeType === 3) { if (o.data !== n.data && l && l.nodeType === 3) l.data = n.data; return; }
    if (o.nodeType !== 1) return;
    const same = l && l.nodeType === 1 && l.tagName === o.tagName && o.tagName === n.tagName && o.childNodes.length === n.childNodes.length;
    if (!same) { if (l) l.replaceWith(doc.importNode(n, true)); return; }
    syncAttrs(o, n, l);
    // Betiğin bölümlerin başına eklediği gece gökyüzü (.ns) şablonda yoktur; sıra kaymasın diye sayılmaz.
    const lk = [...l.childNodes].filter((x) => !(x.nodeType === 1 && x.classList.contains('ns')));
    for (let i = 0; i < o.childNodes.length; i++) patchNode(o.childNodes[i], n.childNodes[i], lk[i], doc);
  }
  function patchHead(n, d) {
    const ns = n.head.querySelector('style'), ls = d.head.querySelector('style');
    if (ns && ls && ls.textContent !== ns.textContent) ls.textContent = ns.textContent;
    const sel = 'link[href^="/fonts/"]';
    const nl = n.head.querySelector(sel), ll = d.head.querySelector(sel);
    if (nl && ll && ll.getAttribute('href') !== nl.getAttribute('href')) ll.setAttribute('href', nl.getAttribute('href'));
    if (d.title !== n.title) d.title = n.title;
  }
  function livePatch() {
    if ($('#split').classList.contains('no-preview') || !window.GoatzRender) return;
    const d = frame.contentDocument;
    if (!lastTree || !d || !d.body || !d.body.children.length) { refreshPreview(false); return; }
    try {
      const next = parseDoc(previewHtml());
      patchHead(next, d);
      syncAttrs(lastTree.documentElement, next.documentElement, d.documentElement);
      patchNode(lastTree.body, next.body, d.body, d);
      lastTree = next;
    } catch (err) {
      console.error('Önizleme yaması başarısız, sayfa yeniden yükleniyor:', err);
      refreshPreview(false);
    }
  }

  function refreshPreview(scrollToAnchor) {
    if ($('#split').classList.contains('no-preview') || !window.GoatzRender) return;
    let y = 0;
    try { y = frame.contentWindow.scrollY; } catch { /* ilk yükleme */ }
    try {
      const html = previewHtml();
      lastTree = parseDoc(html);
      frame.onload = () => {
        const doc = frame.contentDocument;
        if (!doc) return;
        doc.documentElement.style.scrollBehavior = 'auto';
        // Önizlemedeki linkler paneli terk etmesin.
        // srcdoc içinde '#bölüm' linkleri çerçeveyi panel adresine götürür (iç içe panel açılır).
        // Bu yüzden tüm linkleri burada durdurup kendimiz kaydırıyoruz.
        doc.addEventListener('click', (e) => {
          const a = e.target.closest('a');
          if (!a) return;
          e.preventDefault();
          const href = a.getAttribute('href') || '';
          if (href.startsWith('#')) {
            const el = href === '#top' || href === '#' ? null : doc.querySelector(href);
            const win = frame.contentWindow;
            win.scrollTo({ top: el ? el.getBoundingClientRect().top + win.scrollY - 60 : 0, behavior: 'smooth' });
          } else toast('Önizlemede dış linkler açılmaz.');
        });
        if (scrollToAnchor) scrollPreviewTo(page.anchor);
        else frame.contentWindow.scrollTo(0, y);
      };
      frame.srcdoc = html;
    } catch (err) { toast(err.message, true); }
  }
  function scrollPreviewTo(anchor) {
    const doc = frame.contentDocument;
    if (!doc) return;
    const el = anchor && anchor !== '#top' ? doc.querySelector(anchor) : null;
    frame.contentWindow.scrollTo(0, el ? el.getBoundingClientRect().top + frame.contentWindow.scrollY - 60 : 0);
  }
  document.querySelectorAll('.seg button').forEach((b) => b.addEventListener('click', () => {
    document.querySelectorAll('.seg button').forEach((x) => x.classList.toggle('on', x === b));
    frame.style.width = b.dataset.w;
  }));

  // =====================================================================
  //  Sol menü
  // =====================================================================
  // Sayfayı hemen siler, "Geri al" ile aynı yerine geri getirilir (onay penceresi yok).
  function deletePage(id) {
    const idx = state.pages.findIndex((p) => p.id === id);
    if (idx < 0) return;
    const [removed] = state.pages.splice(idx, 1);
    changed();
    if (page.custom && page.pageId === id) selectPage(homePage()); else renderNav();
    toast(`"${removed.title || 'Sayfa'}" silindi`, false, {
      label: 'Geri al',
      run: () => { state.pages.splice(Math.min(idx, state.pages.length), 0, removed); changed(); renderNav(); selectPage(customDef(removed)); },
    });
  }
  // Sol menüde bir öğeyi yukarı ya da aşağı taşır (ana sayfa bölümleri ve özel sayfalar)
  function moveItem(arr, i, d) {
    const j = i + d;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    changed(); renderNav(); renderPage();
  }

  // Sol menüde öğeyi tutup sürükleyerek yerini değiştirme. Sürüklerken diğer satırlar yer açar, bırakınca sıra kaydedilir.
  let navDragAt = 0;
  const notJustDragged = (fn) => () => { if (performance.now() - navDragAt > 300) fn(); };
  function dragSort(rowEl) {
    rowEl.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.target.closest('.nt')) return;
      const group = rowEl.dataset.group;
      const rows = [...document.querySelectorAll(`#pages .nav-row[data-group="${group}"]`)];
      const from = rows.indexOf(rowEl);
      if (rows.length < 2 || from < 0) return;
      const rects = rows.map((r) => r.getBoundingClientRect());
      const tops = rects.map((r) => r.top);
      const mids = rects.map((r) => r.top + r.height / 2);
      const startY = e.clientY;
      let dragging = false, to = from;
      const place = (dy) => {
        const center = mids[from] + dy;
        to = 0;
        rows.forEach((_, k) => { if (k !== from && mids[k] < center) to++; });
        rows.forEach((r, k) => {
          if (k === from) return;
          let shift = 0;
          if (from < to && k > from && k <= to) shift = tops[k - 1] - tops[k];
          else if (from > to && k >= to && k < from) shift = tops[k + 1] - tops[k];
          r.style.transform = shift ? `translateY(${shift}px)` : '';
        });
      };
      const onMove = (ev) => {
        const dy = ev.clientY - startY;
        if (!dragging) {
          if (Math.abs(dy) < 5) return;
          dragging = true;
          rowEl.classList.add('dragging');
          document.body.classList.add('is-dragging-nav');
          rows.forEach((r) => { if (r !== rowEl) r.classList.add('shifting'); });
        }
        rowEl.style.transform = `translateY(${dy}px)`;
        place(dy);
      };
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
        if (!dragging) return;
        navDragAt = performance.now();
        document.body.classList.remove('is-dragging-nav');
        rows.forEach((r) => { r.classList.remove('dragging', 'shifting'); r.style.transform = ''; });
        if (to === from) return;
        const ids = rows.map((r) => r.dataset.id);
        const [moved] = ids.splice(from, 1);
        ids.splice(to, 0, moved);
        const arr = group === 'sections' ? state.sections : state.pages;
        arr.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
        changed(); renderNav(); renderPage();
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    });
  }

  const openPanel = () => $('#panel').classList.add('open');
  const closePanel = () => $('#panel').classList.remove('open');
  $('#panelClose').addEventListener('click', closePanel);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && $('#panel').classList.contains('open') && !document.querySelector('dialog[open]') && !e.target.closest?.('input, textarea, select')) closePanel();
  });

  // Sol menü akordeonu: aynı anda yalnız bir grup açık; varsayılan hepsi kapalı, aktif sayfanın grubu açılır.
  let openGroup = null, navFollow = false, navView = 'main'; // navView: 'main' ana menü, 'settings' yalnız Ayarlar görünümü
  const TEMA = 'Tema Yönetimi', AYAR = 'Ayarlar';
  // Tema görünümündeki iki akordeon: ilki tema ayarları, ikincisi ana sayfanın sitedeki sırası (kodda eskiden de bu adla geçiyordu).
  const G_TEMA = 'Tema', G_FLOW = 'Ana sayfa · sitedeki sıra';
  let previewOn = false; // tema bölümlerinde canlı önizleme göster/gizle (varsayılan gizli: editör sağ alanın tamamını kullanır)
  function selectPage(p) {
    if (!editTheme && p.id !== 'tema-overview' && (p.custom || TE_IDS().has(p.id))) {
      editTheme = activeId(); tePageSel = p.custom ? p.pageId : 'home'; teOpen.clear();
      teView = ['theme', 'brand', 'sections', 'm-text', 'm-sticker', 'm-font', 'm-global'].includes(p.id) ? 'settings' : 'sections';
    }
    page = p;
    navFollow = !editTheme;
    history.replaceState(null, '', `#${p.id}`);
    const target = p.custom ? p.pageId : (p.previewPage || null);
    renderNav();
    renderPage();
    if (target !== previewPage) { previewPage = target; refreshPreview(true); } else scrollPreviewTo(p.anchor);
    $('.sidebar').classList.remove('open');
    openPanel();
  }
  const homePage = () => PAGES.find((x) => x.id === 'hero');

  const panelIsOpen = () => $('#panel').classList.contains('open');
  const isOn = (id) => panelIsOpen() && id === page.id;
  // Kaydedilmemiş değişiklik varsa sorar ("Kaydet ve dön" / "Kaydetmeden dön" / "İptal"), yoksa sormadan devam eder.
  // Kaydetmeden dönmek, değişiklikleri son kayda geri alır.
  function confirmLeave(proceed, o = {}) {
    if (!isDirty()) { (o.plain || proceed)(); return; }
    const dlg = h('dialog', { class: 'modal confirm-dlg', 'aria-label': 'Kaydetmek istiyor musunuz?' },
      h('div', { class: 'modal-head' }, h('h3', {}, 'Kaydetmek istiyor musunuz?')),
      h('p', { style: 'padding:0 18px' }, 'Kaydedilmemiş değişiklikler var.'),
      h('div', { style: 'display:flex;flex-wrap:wrap;gap:8px;padding:14px 18px 18px;justify-content:flex-end' },
        h('button', { type: 'button', class: 'btn', onclick: () => dlg.close() }, 'İptal'),
        h('button', { type: 'button', class: 'btn', onclick: () => { dlg.close(); if (o.discardFn) o.discardFn(); else { state = JSON.parse(saved); proceed(); } } }, 'Kaydetmeden dön'),
        h('button', { type: 'button', class: 'btn solid', onclick: async () => { dlg.close(); await save(); if (!isDirty()) (o.saveFn || proceed)(); } }, 'Kaydet ve dön')));
    dlg.addEventListener('close', () => dlg.remove());
    document.body.appendChild(dlg);
    dlg.showModal();
  }
  // "Panele dön"
  function goBack() {
    confirmLeave(() => { navView = 'main'; $('#panel').classList.remove('open'); renderNav(); renderPage(); refreshPreview(true); updateStatus(); });
  }

  // Sol menü: sitenin temasıyla aynı dilde çizilir ve ana sayfa bölümleri sitedeki gerçek sırayla dizilir.
  // Her bölümün yanındaki nokta, o bölümün sitedeki zemin rengidir.
  function renderNav() {
    if (editTheme) { navFollow = false; renderThemeNav(); return; }
    const nav = $('#pages');
    const byId = (id) => PAGES.find((p) => p.id === id);
    const dotColor = (p) => {
      const key = p.section ? state[p.section]?.background : p.id === 'ticker' ? state.ticker.background : null;
      return key ? state.theme.colors[key] : null;
    };
    const tool = (label, title, disabled, fn, cls = '') => h('button', {
      type: 'button', class: `nt ${cls}`.trim(), title, 'aria-label': title, disabled: disabled || null,
      onclick: (e) => { e.stopPropagation(); fn(); },
    }, label);
    const row = (main, tools, on, drag) => {
      const el = h('div', { class: `nav-row${on ? ' on' : ''}${tools ? ` tools${tools.length}` : ''}${drag ? ' movable' : ''}`, 'data-group': drag ? drag.group : null, 'data-id': drag ? drag.id : null },
        main, tools ? h('span', { class: 'nav-tools' }, ...tools) : null);
      if (drag) { main.title = 'Tutup sürükleyerek yerini değiştir'; dragSort(el); }
      return el;
    };
    const btn = (p) => {
      const sec = p.section && state.sections.find((x) => x.id === p.section);
      const dc = dotColor(p);
      const main = h('button', { class: p.id === page.id ? 'on' : '', onclick: notJustDragged(() => selectPage(p)) },
        dc ? h('i', { class: 'dot', style: `background:${dc}` }) : null,
        h('span', { class: 'lbl' }, p.label),
        sec && !sec.visible ? h('span', { class: 'eye', title: 'Bu bölüm gizli' }, 'gizli') : null,
        p.id === 'mesajlar' && unreadMsgs > 0 ? h('span', { class: 'nav-badge', title: `${unreadMsgs} okunmamış mesaj` }, String(unreadMsgs > 99 ? '99+' : unreadMsgs)) : null);
      if (!sec) return main;
      return row(main, null, p.id === page.id, { group: 'sections', id: p.section });
    };
    const items = [];
    const gOf = new Map(); // öğe -> grup adı
    const pageGroup = {}; // sayfa kimliği -> grup adı
    let curG = null;
    const head = (t, c) => {
      const isOpen = openGroup === t;
      return h('button', { type: 'button', class: `group${isOpen ? ' open' : ''}`, 'data-g': t, style: `--gc:${c}`, 'aria-expanded': String(isOpen),
        onclick: () => { openGroup = isOpen ? null : t; renderNav(); } },
      h('span', { class: 'lbl' }, t), h('i', { class: 'chev', 'aria-hidden': 'true' }));
    };
    // Akordeon açmayan başlık: tıklayınca ayrı görünüme (Ayarlar) ya da sayfaya götürür.
    const linkHead = (t, c, fn) => h('button', { type: 'button', class: 'group nav-link', style: `--gc:${c}`, onclick: fn }, h('span', { class: 'lbl' }, t), h('i', { class: 'chev', 'aria-hidden': 'true' }));
    const push = (...els) => els.forEach((e) => { items.push(e); gOf.set(e, curG); });
    const groupColors = {
      'Genel Bakış': 'var(--sky)',
      'Ürünler': '#55db9c',
      'Siparişler': '#4da2ff',
      'Müşteriler': '#e9ccff',
      'Pazarlama': '#fb4903',
      'İşler': '#55db9c',
      'Tema Yönetimi': '#ffd731',
      'Entegrasyonlar': '#5c4ade',
      'Ayarlar': '#cccccc',
      'Sayfalar': 'var(--mint)',
      'Ana sayfa · sitedeki sıra': 'var(--lavender)',
    };

    // Ana sayfa bölümleri (kayan şerit, menü, sıralanabilir bölümler) tek kez ve sitedeki gerçek sırayla, Tema Yönetimi içinde çizilir.
    const flow = [byId('ticker'), byId('nav'), ...state.sections.map((x) => PAGES.find((p) => p.section === x.id)).filter(Boolean)];
    const inFlow = (p) => p.section || p.id === 'ticker' || p.id === 'nav';
    let flowDone = false;
    let currentGroup = null;
    PAGES.forEach((p) => {
      if (p.group) {
        if (currentGroup !== p.group) {
          currentGroup = p.group;
          // "Genel Bakış" başlığı yok: Dashboard başlıksız, en üstte tek düğme olarak durur.
          if (p.group === 'Genel Bakış') curG = null;
          else if (p.group === TEMA) curG = G_TEMA; // ana menüde yalnız tek düğme (en altta); öğeleri tema düzenleyicide
          else if (p.group === AYAR) {
            items.push(linkHead(AYAR, groupColors[AYAR], () => { navView = 'settings'; const f = byId('ayar-marka'); if (f) selectPage(f); else renderNav(); }));
            curG = AYAR;
          }
          else { items.push(head(p.group, groupColors[p.group] || 'var(--bg)')); curG = p.group; }
        }
      } else if (p.id) {
        if (inFlow(p)) {
          if (!flowDone) { flowDone = true; flow.forEach((f) => { pageGroup[f.id] = curG; }); push(...flow.map(btn).filter(Boolean)); }
          return;
        }
        pageGroup[p.id] = curG;
        const b = btn(p);
        if (b) push(b);
      }
    });

    if (navFollow) {
      navFollow = false;
      const g = pageGroup[page.id];
      navView = g === AYAR ? 'settings' : 'main';
      if (g && g !== G_TEMA && g !== AYAR) openGroup = g;
    }
    const isTema = (it) => gOf.get(it) === G_TEMA;
    const isAyar = (it) => gOf.get(it) === AYAR;
    items.forEach((it) => { const g = gOf.get(it); it.hidden = !!g && g !== G_TEMA && g !== AYAR && g !== openGroup; });
    let shown;
    if (navView === 'settings') {
      // Ayarlar ayrı görünüm: ana menü gizlenir, yalnız Ayarlar öğeleri ve "Panele dön" görünür.
      const ay = items.filter(isAyar); ay.forEach((it) => { it.hidden = false; });
      shown = [h('button', { type: 'button', class: 'back-btn', onclick: goBack }, '← Panele dön'), ...ay];
    } else {
      shown = items.filter((it) => !isTema(it) && !isAyar(it));
      shown.push(h('button', { type: 'button', class: 'group nav-link', onclick: () => { const t = byId('tema-overview'); if (t) selectPage(t); } },
        h('span', { class: 'lbl' }, TEMA), h('i', { class: 'chev', 'aria-hidden': 'true' })));
    }
    items.length = 0; items.push(...shown);
    nav.replaceChildren(...items);
  }
  $('#menuToggle').addEventListener('click', () => $('.sidebar').classList.toggle('open'));

  // =====================================================================
  //  Sayfa (form) çizimi
  // =====================================================================
  function renderPage() {
    const ed = $('#editor');
    const top = ed.scrollTop;
    changeHooks.clear();
    if (page.custom && !state.pages.some((p) => p.id === page.pageId)) { page = homePage(); previewPage = null; renderNav(); refreshPreview(true); }

    // Preview pane'i sadece tema/site yönetimi sayfalarında göster
    const themePages = ['theme', 'motion', 'brand', 'sections', 'ticker', 'nav', 'hero', 'showcase', 'statement', 'services', 'why', 'band', 'process', 'contact', 'footer', 'media', 'backups', 'pages', 'ayar-marka', 'tema-overview', 'isler-projeler', 'isler-ayarlar'];
    const te = !!editTheme;
    $('#app').classList.toggle('te', te);
    $('#panelClose').textContent = te ? '←' : '×';
    $('#panelClose').setAttribute('aria-label', te ? 'Geri' : 'Paneli kapat');
    const isThemePage = te || page.custom || themePages.includes(page.id);
    const splitEl = $('#split');
    const wasHidden = splitEl.classList.contains('no-preview');
    splitEl.classList.toggle('no-preview', !isThemePage);
    const panelWide = () => !te && (!isThemePage || !previewOn);
    $('#panel').classList.toggle('wide', panelWide());
    { const ph = $('.panel-head'); let pt = $('#previewToggle');
      if (!pt) { pt = h('button', { type: 'button', class: 'btn small', id: 'previewToggle' }); ph.insertBefore(pt, $('#panelClose')); }
      pt.hidden = !isThemePage || te;
      pt.textContent = previewOn ? 'Önizlemeyi gizle' : 'Önizleme';
      pt.onclick = () => { previewOn = !previewOn; pt.textContent = previewOn ? 'Önizlemeyi gizle' : 'Önizleme'; $('#panel').classList.toggle('wide', panelWide()); }; }
    if (isThemePage && wasHidden) refreshPreview(true);

    if (page.custom) {
      const pg = state.pages.find((p) => p.id === page.pageId);
      $('#pageTitle').textContent = pg.title || 'Sayfa';
      ed.replaceChildren(...customPageEditor());
      ed.scrollTop = top;
      return;
    }
    $('#pageTitle').textContent = page.label;
    sales.onPage(page);
    const parts = [];
    if (page.intro) parts.push(h('p', { class: 'intro' }, page.intro));
    if (page.section) {
      const sec = state.sections.find((s) => s.id === page.section);
      parts.push(h('div', { class: 'card' }, switchField('Bu bölümü sitede göster', sec.visible, (v) => { sec.visible = v; changed(); renderNav(); })));
    }
    if (page.special === 'dashboard') parts.push(dash.page());
    else if (page.special === 'sections') parts.push(sectionsEditor());
    else if (page.special === 'media') parts.push(mediaPage());
    else if (page.special === 'backups') parts.push(backupsPage());
    else if (page.special === 'messages') parts.push(messagesPage());
    else if (page.special === 'promo') parts.push(promoPage());
    else if (page.special === 'themes') parts.push(themesEditor());
    else if (page.special === 'pricelist') parts.push(h('div', { class: 'card' }, h('h3', {}, 'Fiyat Listesi'), h('p', { class: 'muted' }, 'Henüz fiyat listesi yok.')));
    else if (page.special === 'definitions') parts.push(commerce.definitions(page));
    else if (page.special === 'products') parts.push(commerce.products());
    else if (page.special === 'stock') parts.push(commerce.stock());
    else if (page.special === 'orders') parts.push(sales.orders(page));
    else if (page.special === 'abandoned') parts.push(sales.abandoned());
    else if (page.special === 'returns') parts.push(sales.returns());
    else if (page.special === 'customers') parts.push(sales.customers());
    else if (page.special === 'customer-tags') parts.push(sales.customerTags());
    else if (page.special === 'coupons') parts.push(sales.coupons());
    else if (page.special === 'campaigns') parts.push(sales.campaigns());
    else if (page.schema && Object.keys(page.schema).length > 0) parts.push(...(te ? teRows(page) : objectFields(page.schema, page.path, true)));
    else parts.push(placeholderPage(page.label));
    ed.replaceChildren(...parts);
    ed.scrollTop = top;
  }
  const rerender = () => renderPage();

  // Şemadaki alanları çizer. Grup anahtarı veride yoksa grup yalnızca görsel bir kutudur.
  function objectFields(schema, path, topLevel = false) {
    const out = [];
    const loose = [];
    const flush = () => { if (loose.length) { out.push(topLevel ? h('div', { class: 'card' }, h('div', { class: 'fields' }, ...loose.splice(0))) : h('div', { class: 'fields' }, ...loose.splice(0))); } };
    for (const [key, def] of Object.entries(schema)) {
      const obj = get(path);
      if (def.showIf && obj && !def.showIf(obj)) continue;
      const exists = obj && Object.prototype.hasOwnProperty.call(obj, key);
      if (def.type === 'group') {
        const childPath = exists ? [...path, key] : path;
        const inner = objectFields(def.fields, childPath);
        const body = def.row ? h('div', { class: 'row2' }, ...inner) : h('div', { class: 'fields' }, ...inner);
        if (def.flat && !topLevel) { loose.push(h('div', { class: 'field' }, def.label ? h('span', { class: 'field-label' }, def.label) : null, body)); continue; }
        flush();
        out.push(h('div', { class: topLevel ? 'card' : 'card inner-card' }, def.label ? h('h3', {}, def.label) : null, body));
        continue;
      }
      if (def.type === 'list') { flush(); out.push(topLevel ? h('div', { class: 'card' }, listField(def, [...path, key])) : listField(def, [...path, key])); continue; }
      loose.push(field(def, [...path, key]));
    }
    flush();
    return out;
  }

  function field(def, path) {
    const value = get(path);
    const onSet = (v) => set(path, v);
    switch (def.type) {
      case 'text': return textField(def, value, onSet, path);
      case 'style': return h('div', { class: 'field' }, styleBlock(path.slice(0, -1), path[path.length - 1], def.compact, def.label));
      case 'number': return numberField(def, value, onSet);
      case 'bool': return switchField(def.label, value, (v) => { onSet(v); if (def.rerender) rerender(); });
      case 'color': return colorField(def, value, (v) => { onSet(v); rerender(); });
      case 'hex': return hexField(def, value, onSet);
      case 'image': return imageField(def, value, (v) => { onSet(v); rerender(); });
      case 'sticker': return stickerField(def, value, (v) => { onSet(v); rerender(); });
      case 'target': return targetField(def, value, onSet);
      case 'select': return selectField(def, value, onSet);
      case 'fontpicker': return fontPicker(def, value, onSet);
      case 'gallerybulk': return bulkUploadField(def, path);
      default: return h('p', {}, `Bilinmeyen alan: ${def.type}`);
    }
  }

  function wrap(def, control, extra) {
    return h('label', { class: 'field' }, def.label ? h('span', {}, def.label) : null, control, def.hint ? h('p', { class: 'hint' }, def.hint) : null, extra || null);
  }

  function textField(def, value, onSet, path) {
    const counter = def.counter ? h('p', { class: 'hint' }) : null;
    const updateCounter = (v) => { if (counter) counter.textContent = `${v.length} / ${def.counter} karakter${v.length > def.counter ? ' — biraz uzun' : ''}`; };
    const attrs = { value, maxlength: def.max || 2000, inputmode: def.inputmode, oninput: (e) => { onSet(e.target.value); updateCounter(e.target.value); } };
    const input = def.multiline ? h('textarea', { ...attrs, rows: Math.min(8, Math.max(2, value.split('\n').length + 1)) }) : h('input', { type: 'text', ...attrs });
    if (def.multiline) input.value = value;
    updateCounter(value);
    const label = wrap(def, input, counter);
    if (def.nostyle || !path) return label;
    return h('div', { class: 'field-wrap' }, label, styleBlock(path.slice(0, -1), `${path[path.length - 1]}Style`, def.compact));
  }

  // ---------- Yazı stili (her metin alanı için) ----------
  const EMPTY_STYLE = { font: '', size: '', weight: '', italic: '', upper: '', underline: '', tracking: '', leading: '', align: '', valign: '', color: '' };
  const openStyles = new Set();
  const WEIGHT_OPTS = [['', 'Varsayılan'], ['400', 'Normal (400)'], ['500', 'Orta (500)'], ['600', 'Yarı kalın (600)'], ['700', 'Kalın (700)'], ['800', 'Çok kalın (800)'], ['900', 'En kalın (900)']];

  function styleBlock(parentPath, key, compact, label = 'Yazı stili') {
    const id = [...parentPath, key].join('.');
    const current = () => { const v = get(parentPath)[key]; return v && typeof v === 'object' ? v : null; };
    const isSet = () => { const v = current(); return !!v && Object.values(v).some((x) => x !== ''); };
    const btn = h('button', { type: 'button', class: 'aa', 'aria-expanded': String(openStyles.has(id)) }, h('b', {}, 'Aa'), ` ${label}`, h('i', { class: 'dot', title: 'Özel stil uygulanıyor' }));
    const badge = () => btn.classList.toggle('set', isSet());
    const editor = styleEditor(parentPath, key, compact, badge);
    editor.hidden = !openStyles.has(id);
    btn.addEventListener('click', () => {
      editor.hidden = !editor.hidden;
      if (editor.hidden) openStyles.delete(id); else openStyles.add(id);
      btn.setAttribute('aria-expanded', String(!editor.hidden));
    });
    badge();
    return h('div', { class: 'tstyle-wrap' }, btn, editor);
  }

  function styleEditor(parentPath, key, compact, onBadge) {
    const box = h('div', { class: 'tstyle' });
    const cur = () => { const v = get(parentPath)[key]; return v && typeof v === 'object' ? v : EMPTY_STYLE; };
    const write = (patch, redraw = true) => {
      const next = { ...EMPTY_STYLE, ...cur(), ...patch };
      const parent = get(parentPath);
      if (Object.values(next).every((v) => v === '')) delete parent[key]; else parent[key] = next;
      changed(); onBadge();
      if (redraw) draw();
    };
    const seg = (name, options) => h('div', { class: 'seg2', role: 'group' }, options.map(([v, l, t]) => h('button', {
      type: 'button', class: cur()[name] === v ? 'on' : '', title: t || l, 'aria-pressed': String(cur()[name] === v),
      onclick: () => write({ [name]: cur()[name] === v ? '' : v }),
    }, l)));
    const optNumber = (name, text, min, max, unit, initial, hint) => {
      const v = cur()[name];
      const range = h('input', { type: 'range', min, max, step: 1, value: v === '' ? initial : v, 'aria-label': text });
      const num = h('input', { type: 'number', min, max, step: 1, value: v, placeholder: '—', 'aria-label': text });
      range.addEventListener('input', () => { num.value = range.value; write({ [name]: range.value }, false); });
      num.addEventListener('change', () => {
        if (num.value === '') return write({ [name]: '' });
        const n = Math.min(max, Math.max(min, Number(num.value)));
        write({ [name]: String(n) });
      });
      return h('div', { class: 'field' }, h('span', {}, text),
        h('div', { class: 'range' }, range, num, h('em', {}, unit), v !== '' ? h('button', { type: 'button', class: 'btn small', onclick: () => write({ [name]: '' }) }, 'Sıfırla') : null),
        hint ? h('p', { class: 'hint' }, hint) : null);
    };
    const draw = () => {
      const st = cur();
      const c = st.color;
      box.replaceChildren(
        h('div', { class: 'row2' },
          h('label', { class: 'field' }, h('span', {}, 'Kalınlık'),
            h('select', { onchange: (e) => write({ weight: e.target.value }) }, WEIGHT_OPTS.map(([k, n]) => h('option', { value: k, selected: st.weight === k }, n))))),
        optNumber('size', 'Boyut', 30, 300, '%', 100, '100 = varsayılan boyut.'),
        optNumber('tracking', 'Harf aralığı', -20, 50, '%', 0, '0 = harfler arası normal. Eksi değerler sıkıştırır, artı değerler açar.'),
        optNumber('leading', 'Satır aralığı', 40, 300, '%', 100, '100 = satır yüksekliği yazı boyutuna eşit. Büyük başlıklarda 75–90 arası sıkı görünür.'),
        compact ? null : h('div', { class: 'row2' },
          h('div', { class: 'field' }, h('span', {}, 'Yatay hizalama'), seg('align', [['left', 'Sola', 'Sola yaslı'], ['center', 'Ortala'], ['right', 'Sağa', 'Sağa yaslı']])),
          h('div', { class: 'field' }, h('span', {}, 'Dikey hizalama'), seg('valign', [['top', 'Üst'], ['middle', 'Orta'], ['bottom', 'Alt']]))),
        h('div', { class: 'row2' },
          h('div', { class: 'field' }, h('span', {}, 'Harf biçimi'), seg('upper', [['upper', 'BÜYÜK'], ['lower', 'küçük'], ['title', 'İlk Harf'], ['none', 'Normal']])),
          h('div', { class: 'field' }, h('span', {}, 'Eğik / çizgi'), seg('italic', [['on', 'Eğik'], ['off', 'Düz']]), seg('underline', [['on', 'Altı çizili']]))),
        h('div', { class: 'field' }, h('span', {}, `Yazı rengi: ${c ? COLOR_NAMES[c] : 'Varsayılan'}`),
          h('div', { class: 'swatches', role: 'radiogroup', 'aria-label': 'Yazı rengi' },
            h('button', { type: 'button', class: 'swatch none', role: 'radio', 'aria-checked': String(!c), title: 'Varsayılan', 'aria-label': 'Varsayılan renk', onclick: () => write({ color: '' }) }, '∅'),
            Object.entries(COLOR_NAMES).map(([k, name]) => h('button', {
              type: 'button', class: 'swatch', role: 'radio', 'aria-checked': String(c === k), title: name, 'aria-label': name,
              style: `background:${state.theme.colors[k]}`, onclick: () => write({ color: k }),
            })))),
        h('div', {}, h('button', { type: 'button', class: 'btn small', onclick: () => { const parent = get(parentPath); delete parent[key]; changed(); onBadge(); draw(); } }, 'Bu yazının stilini sıfırla')));
    };
    draw();
    return box;
  }

  function numberField(def, value, onSet) {
    const range = h('input', { type: 'range', min: def.min, max: def.max, step: def.step, value, 'aria-label': def.label });
    const num = h('input', { type: 'number', min: def.min, max: def.max, step: def.step, value, 'aria-label': def.label });
    const apply = (v) => {
      const n = Math.min(def.max, Math.max(def.min, Number(v)));
      if (!Number.isFinite(n)) return;
      range.value = n; num.value = n; onSet(n);
    };
    range.addEventListener('input', () => apply(range.value));
    num.addEventListener('change', () => apply(num.value));
    return h('div', { class: 'field' }, h('span', {}, def.label), h('div', { class: 'range' }, range, num, h('em', {}, def.unit)), def.hint ? h('p', { class: 'hint' }, def.hint) : null);
  }

  function switchField(label, value, onSet) {
    return h('label', { class: 'switch' }, h('input', { type: 'checkbox', role: 'switch', checked: value, onchange: (e) => onSet(e.target.checked) }), label);
  }

  function colorField(def, value, onSet) {
    const box = h('div', { class: 'swatches', role: 'radiogroup', 'aria-label': def.label || 'Renk' },
      Object.entries(COLOR_NAMES).map(([k, name]) => h('button', {
        type: 'button', class: 'swatch', role: 'radio', 'aria-checked': String(value === k), title: name, 'aria-label': name,
        style: `background:${state.theme.colors[k]}`, onclick: () => onSet(k),
      })));
    return h('div', { class: 'field' }, def.label ? h('span', {}, `${def.label}: ${COLOR_NAMES[value] || value}`) : h('span', { class: 'hint' }, COLOR_NAMES[value] || value), box);
  }

  function hexField(def, value, onSet) {
    const pick = h('input', { type: 'color', value, 'aria-label': def.label });
    const txt = h('input', { type: 'text', value, maxlength: 7, 'aria-label': `${def.label} kodu` });
    pick.addEventListener('input', () => { txt.value = pick.value; onSet(pick.value); });
    txt.addEventListener('change', () => {
      const v = txt.value.trim().startsWith('#') ? txt.value.trim() : `#${txt.value.trim()}`;
      if (/^#[0-9a-fA-F]{6}$/.test(v)) { pick.value = v.toLowerCase(); onSet(v.toLowerCase()); } else { txt.value = pick.value; toast('Renk kodu #RRGGBB biçiminde olmalı.', true); }
    });
    return h('div', { class: 'field' }, h('span', {}, def.label), h('div', { class: 'hex' }, pick, txt));
  }

  function imageField(def, value, onSet) {
    const upload = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp,image/gif', hidden: true });
    upload.addEventListener('change', async () => {
      const file = upload.files[0];
      if (!file) return;
      try { onSet(await uploadFile(file)); toast('Görsel yüklendi.'); } catch (err) { toast(err.message, true); }
    });
    return h('div', { class: 'field' },
      h('span', {}, def.label),
      h('div', { class: 'image-field' },
        h('div', { class: `thumb${value ? ' has' : ''}`, style: value ? `background-image:url('${value}')` : '' }, value ? '' : 'Görsel yok'),
        h('div', { class: 'image-actions' },
          h('label', { class: 'btn small solid' }, 'Yükle', upload),
          h('button', { type: 'button', class: 'btn small', onclick: () => openLibrary(onSet) }, 'Kütüphaneden seç'),
          value ? h('button', { type: 'button', class: 'btn small danger', onclick: () => onSet('') }, 'Kaldır') : null)),
      def.hint ? h('p', { class: 'hint' }, def.hint) : null);
  }

  const stickerSvg = (id) => `<svg viewBox="${STICKER_VB[id] || '0 0 100 100'}"><use href="#s-${id}"/></svg>`;
  function stickerField(def, value, onSet) {
    const opts = [...(def.none ? [['', 'Yok']] : []), ...Object.entries(STICKERS)];
    return h('div', { class: 'field' },
      h('span', {}, `${def.label}: ${STICKERS[value] || 'Yok'}`),
      h('div', { class: 'stickers', role: 'radiogroup', 'aria-label': def.label },
        opts.map(([k, name]) => h('button', {
          type: 'button', class: `stk${k ? '' : ' none'}`, role: 'radio', 'aria-checked': String(value === k), title: name, 'aria-label': name,
          html: k ? stickerSvg(k) : 'Yok', onclick: () => onSet(k),
        }))));
  }

  function targetField(def, value, onSet) {
    const targets = [...(def.optional ? [['', 'Bağlantı yok']] : []), ...TARGETS, ...state.pages.map((p) => [`page:${p.id}`, `Sayfa: ${p.title || 'adsız'}`])];
    const known = targets.some(([v]) => v === value);
    const sel = h('select', { 'aria-label': def.label },
      targets.map(([v, l]) => h('option', { value: v, selected: v === value }, l)),
      h('option', { value: '__custom', selected: !known }, 'Başka bir adres (link)…'));
    const custom = h('input', { type: 'url', placeholder: 'https://…', value: known ? '' : value, hidden: known });
    sel.addEventListener('change', () => {
      if (sel.value === '__custom') { custom.hidden = false; custom.focus(); onSet(custom.value); } else { custom.hidden = true; onSet(sel.value); }
    });
    custom.addEventListener('input', () => onSet(custom.value.trim()));
    return h('div', { class: 'field target' }, h('span', {}, def.label), sel, custom,
      h('p', { class: 'hint' }, 'Dış adresler http:// veya https:// ile başlamalı.'));
  }

  function selectField(def, value, onSet) {
    const sel = h('select', { onchange: (e) => { onSet(e.target.value); rerender(); } }, (typeof def.options === 'function' ? def.options() : def.options).map(([v, l]) => h('option', { value: v, selected: v === value }, l)));
    return wrap(def, sel);
  }

  // ---------- Yazı tipi seçici (Google Fonts kataloğu) ----------
  // Sitede tek yazı tipi vardır. Seçilince sunucu dosyaları indirir (ziyaretçi Google'a gitmez); indirilemezse eski yazı tipi kalır.
  // Satırların önizlemesi için yalnız panelde Google'dan küçük (yalnız adı kapsayan) CSS yüklenir.
  let fontCatalog = null;
  const FONT_CATS = [['', 'Tümü'], ['sans-serif', 'Sans'], ['serif', 'Serif'], ['display', 'Gösterişli'], ['handwriting', 'El yazısı'], ['monospace', 'Mono']];
  const loadedFontPrev = new Set();
  function previewFont(name) {
    if (loadedFontPrev.has(name)) return;
    loadedFontPrev.add(name);
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name).replace(/%20/g, '+')}&text=${encodeURIComponent(name)}&display=swap`;
    document.head.appendChild(l);
  }
  function fontPicker(def, value, onSet) {
    const cur = value || 'Inter';
    const status = h('small', { class: 'fp-status' }, '');
    const curBox = h('div', { class: 'fp-cur', style: `font-family:'${cur}', system-ui, sans-serif` }, cur);
    previewFont(cur);
    const search = h('input', { type: 'search', placeholder: 'Yazı tipi ara…', 'aria-label': 'Yazı tipi ara' });
    const cat = h('select', { 'aria-label': 'Tür' }, FONT_CATS.map(([v, l]) => h('option', { value: v }, l)));
    const listEl = h('div', { class: 'fp-list', role: 'listbox' }, h('p', { class: 'hint' }, 'Katalog yükleniyor…'));
    const count = h('small', { class: 'fp-count' }, '');
    let busy = false, io = null;
    async function pick(name) {
      if (busy || name === (get(['theme', 'font']) || 'Inter')) return;
      busy = true;
      status.textContent = `"${name}" sunucuya indiriliyor…`;
      status.className = 'fp-status';
      try {
        await request('/api/fonts/ensure', { method: 'POST', body: JSON.stringify({ family: name }) });
        onSet(name);
        curBox.textContent = name;
        curBox.style.fontFamily = `'${name}', system-ui, sans-serif`;
        status.textContent = 'Uygulandı. Yayına geçmesi için Kaydet.';
        listEl.querySelectorAll('.on').forEach((x) => x.classList.remove('on'));
        const row = [...listEl.children].find((x) => x.dataset.name === name);
        if (row) row.classList.add('on');
      } catch (err) {
        status.textContent = err.message || 'İndirilemedi, önceki yazı tipi korundu.';
        status.className = 'fp-status err';
        toast(status.textContent, true);
      } finally { busy = false; }
    }
    function draw() {
      if (!fontCatalog) return;
      const q = search.value.trim().toLowerCase(), ct = cat.value;
      const sel = get(['theme', 'font']) || 'Inter';
      const rows = fontCatalog.filter((r) => (!ct || r[1] === ct) && (!q || r[0].toLowerCase().includes(q)));
      count.textContent = `${rows.length} yazı tipi`;
      if (io) io.disconnect();
      io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { previewFont(e.target.dataset.name); io.unobserve(e.target); } }), { root: listEl, rootMargin: '200px' });
      const nodes = rows.map((r) => {
        const b = h('button', { type: 'button', role: 'option', class: `fp-row${r[0] === sel ? ' on' : ''}`, 'data-name': r[0], style: `font-family:'${r[0]}', system-ui, sans-serif`, onclick: () => pick(r[0]) }, r[0]);
        io.observe(b);
        return b;
      });
      listEl.replaceChildren(...(nodes.length ? nodes : [h('p', { class: 'hint' }, 'Eşleşen yazı tipi yok.')]));
    }
    search.addEventListener('input', draw);
    cat.addEventListener('change', draw);
    (fontCatalog ? Promise.resolve() : request('/api/fonts/catalog').then((c) => { fontCatalog = c; })).then(draw).catch(() => { listEl.replaceChildren(h('p', { class: 'hint' }, 'Katalog yüklenemedi.')); });
    return h('div', { class: 'field fp' },
      h('span', {}, def.label || 'Yazı tipi'),
      curBox,
      h('p', { class: 'hint' }, 'Sitede tek yazı tipi kullanılır (metin ve başlıklar). Seçilen tema için kaydedilir; Google Fonts kataloğundaki tüm aileler listelenir. Dosyalar sunucudan gelir, ziyaretçiler Google\'a bağlanmaz.'),
      h('div', { class: 'fp-tools' }, search, cat),
      count, listEl, status);
  }

  // ---------- Listeler ----------
  function listField(def, path) {
    const arr = get(path);
    const isObj = def.item.type === 'group';
    const key = path.join('.');
    const move = (i, d) => { const [x] = arr.splice(i, 1); arr.splice(i + d, 0, x); changed(); rerender(); };
    const items = arr.map((val, i) => {
      const tools = h('div', { class: 'item-tools' },
        h('button', { type: 'button', title: 'Yukarı taşı', 'aria-label': 'Yukarı taşı', disabled: i === 0, onclick: (e) => { e.stopPropagation(); move(i, -1); } }, '↑'),
        h('button', { type: 'button', title: 'Aşağı taşı', 'aria-label': 'Aşağı taşı', disabled: i === arr.length - 1, onclick: (e) => { e.stopPropagation(); move(i, 1); } }, '↓'),
        h('button', { type: 'button', title: 'Kopyala', 'aria-label': 'Kopyala', disabled: def.max && arr.length >= def.max, onclick: (e) => { e.stopPropagation(); arr.splice(i + 1, 0, structuredClone(val)); changed(); rerender(); } }, '⧉'),
        h('button', { type: 'button', title: 'Sil', 'aria-label': 'Sil', onclick: (e) => {
          e.stopPropagation();
          const [removed] = arr.splice(i, 1);
          changed(); rerender();
          toast('Silindi', false, { label: 'Geri al', run: () => { arr.splice(i, 0, removed); changed(); rerender(); } });
        } }, '✕'));
      if (!isObj) {
        const control = field({ ...def.item, label: '' }, [...path, i]);
        return h('div', { class: 'item simple' }, h('span', { class: 'num' }, i + 1), h('div', { class: 'grow' }, control), tools);
      }
      const ck = `${key}.${i}`;
      const isCollapsed = collapsed.has(ck) ? collapsed.get(ck) : arr.length > 2;
      const title = (def.title && def.title(val, i)) || `${i + 1}. öğe`;
      const item = h('div', { class: `item${isCollapsed ? ' collapsed' : ''}` },
        h('div', { class: 'item-head', onclick: () => { collapsed.set(ck, !item.classList.contains('collapsed')); item.classList.toggle('collapsed'); } },
          h('span', { class: 'num' }, i + 1), h('b', {}, title || '(boş)'), tools),
        h('div', { class: 'item-body' }, h('div', { class: 'fields' }, ...objectFields(def.item.fields, [...path, i]))));
      return item;
    });
    const addItem = (fresh) => {
      arr.push(fresh);
      collapsed.set(`${key}.${arr.length - 1}`, false);
      changed(); rerender();
    };
    const add = def.adders
      ? h('span', { class: 'adders' }, def.adders.map((a) => h('button', { type: 'button', class: 'btn small', disabled: def.max && arr.length >= def.max, onclick: () => addItem(a.make()) }, `+ ${a.label}`)))
      : h('button', {
        type: 'button', class: 'btn small', disabled: def.max && arr.length >= def.max,
        onclick: () => addItem(def.newItem !== undefined ? structuredClone(def.newItem) : structuredClone(arr[arr.length - 1] ?? (isObj ? {} : ''))),
      }, `+ ${def.addLabel || 'Ekle'}`);
    return h('div', { class: 'field' },
      def.label ? h('span', { class: 'field-label' }, `${def.label} (${arr.length})`) : null,
      h('div', { class: 'list' }, ...items),
      h('div', {}, add, def.max ? h('span', { class: 'hint' }, `  En fazla ${def.max}`) : null));
  }

  // ---------- Galeri: birden çok görsel yükleme ----------
  function bulkUploadField(def, path) {
    const arrPath = [...path.slice(0, -1), 'images'];
    const input = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp,image/gif', multiple: true, hidden: true });
    input.addEventListener('change', async () => {
      const arr = get(arrPath);
      let n = 0;
      for (const f of input.files) {
        if (arr.length >= 40) { toast('Bir galeriye en fazla 40 görsel eklenebilir.', true); break; }
        try { arr.push({ image: await uploadFile(f), caption: '' }); n++; } catch (err) { toast(err.message, true); }
      }
      input.value = '';
      if (n) { changed(); rerender(); toast(`${n} görsel eklendi.`); }
    });
    return h('div', { class: 'field' }, h('label', { class: 'btn small solid' }, 'Birden çok görsel yükle', input), def.hint ? h('p', { class: 'hint' }, def.hint) : null);
  }

  // ---------- Özel sayfa editörü ----------
  function customPageEditor() {
    const idx = state.pages.findIndex((p) => p.id === page.pageId);
    const pg = state.pages[idx];
    const R = window.GoatzRender;
    const addr = h('code', {}, '');
    const openLink = h('a', { class: 'btn small', target: '_blank', rel: 'noopener' }, 'Sayfayı aç ↗');
    const refreshAddr = () => {
      const slug = R.resolvePages(state.pages)[idx]?.slug || '';
      addr.textContent = `/${slug}`;
      openLink.href = `/${slug}`;
      openLink.title = pg.visible ? 'Yayındaki sayfayı yeni sekmede aç (kaydettiysen)' : 'Bu sayfa yayında değil';
      $('#pageTitle').textContent = pg.title || 'Sayfa';
    };
    let navTimer;
    changeHooks.add(() => { refreshAddr(); clearTimeout(navTimer); navTimer = setTimeout(renderNav, 200); });
    refreshAddr();
    const move = (d) => {
      const [x] = state.pages.splice(idx, 1);
      state.pages.splice(idx + d, 0, x);
      changed(); renderNav(); renderPage();
    };
    const actions = h('div', { class: 'card' },
      h('p', { class: 'intro', style: 'margin:0 0 10px' }, 'Sayfa adresi: ', addr, ' · ', 'Menüdeki sırayı oklarla değiştirirsin.'),
      h('div', { class: 'image-actions' },
        openLink,
        h('button', { type: 'button', class: 'btn small', disabled: idx === 0, onclick: () => move(-1) }, '↑ Menüde öne al'),
        h('button', { type: 'button', class: 'btn small', disabled: idx === state.pages.length - 1, onclick: () => move(1) }, '↓ Menüde geri al'),
        h('button', { type: 'button', class: 'btn small', disabled: state.pages.length >= 100, onclick: () => {
          const copy = structuredClone(pg);
          copy.id = `p${Math.random().toString(36).slice(2, 8)}`;
          copy.title = `${pg.title} (kopya)`; copy.slugAuto = true;
          state.pages.splice(idx + 1, 0, copy);
          changed(); selectPage(customDef(copy));
        } }, '⧉ Kopyala'),
        h('button', { type: 'button', class: 'btn small danger', onclick: () => deletePage(pg.id) }, 'Sayfayı sil')));
    if (editTheme) return [actions, ...teRows({ id: `pg:${pg.id}`, schema: PAGE_SCHEMA, path: ['pages', idx] })];
    return [actions, ...objectFields(PAGE_SCHEMA, ['pages', idx], true)];
  }

  // ---------- Bölüm sırası ----------
  function sectionsEditor() {
    const arr = state.sections;
    return h('div', { class: 'card sections-list' }, h('div', { class: 'list' }, arr.map((s, i) => h('div', { class: `item${s.visible ? '' : ' off'}` },
      h('div', { class: 'item-head' },
        h('span', { class: 'num' }, i + 1), h('b', {}, SECTION_NAMES[s.id]),
        h('div', { class: 'item-tools' },
          h('button', { type: 'button', title: s.visible ? 'Gizle' : 'Göster', 'aria-label': s.visible ? 'Gizle' : 'Göster', onclick: () => { s.visible = !s.visible; changed(); rerender(); renderNav(); } }, s.visible ? '👁' : '🚫'),
          h('button', { type: 'button', 'aria-label': 'Yukarı taşı', disabled: i === 0, onclick: () => { arr.splice(i - 1, 0, arr.splice(i, 1)[0]); changed(); rerender(); renderNav(); } }, '↑'),
          h('button', { type: 'button', 'aria-label': 'Aşağı taşı', disabled: i === arr.length - 1, onclick: () => { arr.splice(i + 1, 0, arr.splice(i, 1)[0]); changed(); rerender(); renderNav(); } }, '↓')))))));
  }

  // ---------- Görseller ----------
  function uploadFile(file) {
    return new Promise((resolve, reject) => {
      if (file.size > 8 * 1024 * 1024) return reject(new Error('Görsel en fazla 8 MB olabilir.'));
      const r = new FileReader();
      r.onload = async () => {
        try { resolve((await request('/api/upload', { method: 'POST', body: JSON.stringify({ data: r.result }) })).url); } catch (e) { reject(e); }
      };
      r.onerror = () => reject(new Error('Dosya okunamadı.'));
      r.readAsDataURL(file);
    });
  }

  function usedImages() {
    const urls = new Set();
    JSON.stringify(state, (k, v) => { if (typeof v === 'string' && v.startsWith('/uploads/')) urls.add(v); return v; });
    return urls;
  }

  async function fillGrid(grid, onPick) {
    grid.replaceChildren(h('p', { class: 'empty' }, 'Yükleniyor…'));
    const files = await request('/api/uploads');
    const used = usedImages();
    if (!files.length) { grid.replaceChildren(h('p', { class: 'empty' }, 'Henüz görsel yüklenmedi.')); return; }
    grid.replaceChildren(...files.map((f) => h('div', { class: 'tile' },
      h('button', { type: 'button', class: 'pick', style: `background-image:url('${f.url}')`, 'aria-label': onPick ? 'Bu görseli seç' : f.name, onclick: () => onPick && onPick(f.url) }),
      h('div', { class: 'meta' }, h('span', {}, `${Math.round(f.size / 1024)} KB${used.has(f.url) ? ' · kullanılıyor' : ''}`),
        h('button', { type: 'button', class: 'btn small danger', onclick: async () => {
          if (used.has(f.url) && !confirm('Bu görsel sitede kullanılıyor. Silersen o alanda görsel boş kalır. Silinsin mi?')) return;
          if (!used.has(f.url) && !confirm('Görsel kalıcı olarak silinsin mi?')) return;
          try { await request(`/api/uploads/${encodeURIComponent(f.name)}`, { method: 'DELETE' }); toast('Görsel silindi.'); fillGrid(grid, onPick); } catch (err) { toast(err.message, true); }
        } }, 'Sil')))));
  }

  const lib = $('#library');
  function openLibrary(onPick) {
    pendingImage = onPick;
    fillGrid($('#libGrid'), (url) => { lib.close(); pendingImage && pendingImage(url); });
    lib.showModal();
  }
  lib.querySelector('[data-close]').addEventListener('click', () => lib.close());
  $('#libUpload').addEventListener('change', async (e) => {
    for (const f of e.target.files) { try { await uploadFile(f); } catch (err) { toast(err.message, true); } }
    e.target.value = '';
    fillGrid($('#libGrid'), (url) => { lib.close(); pendingImage && pendingImage(url); });
  });

  function mediaPage() {
    const grid = h('div', { class: 'grid', style: 'padding:0' });
    const up = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp,image/gif', multiple: true, hidden: true });
    up.addEventListener('change', async () => {
      for (const f of up.files) { try { await uploadFile(f); } catch (err) { toast(err.message, true); } }
      up.value = '';
      toast('Yükleme tamamlandı.');
      fillGrid(grid, null);
    });
    fillGrid(grid, null);
    return h('div', { class: 'card' }, h('div', { style: 'margin-bottom:12px' }, h('label', { class: 'btn solid' }, 'Görsel yükle', up)), grid);
  }

  // ---------- Yedekler ----------
  function messagesPage() {
    const box = h('div', {}, h('p', { class: 'muted' }, 'Yükleniyor…'));
    const card = (m) => {
      const form = h('div', { hidden: true, style: 'margin:10px 0 0' });
      const ta = h('textarea', { rows: 5, placeholder: `${m.name} adlı kişiye yanıtın…`, style: 'width:100%;box-sizing:border-box;padding:10px;border:1px solid var(--line,#ccc);border-radius:10px;font:inherit' });
      const send = h('button', { type: 'button', class: 'btn small', onclick: async () => {
        if (ta.value.trim().length < 2) return toast('Yanıt boş olamaz.', true);
        send.disabled = true;
        try { await request('/api/messages/reply', { method: 'POST', body: JSON.stringify({ id: m.id, text: ta.value }) }); toast('Yanıt gönderildi.'); load(); }
        catch (err) { toast(err.message, true); send.disabled = false; }
      } }, 'Yanıtı gönder');
      form.append(ta, h('div', { style: 'margin-top:8px' }, send));
      const actions = [h('button', { type: 'button', class: 'btn small', onclick: () => { form.hidden = !form.hidden; if (!form.hidden) ta.focus(); } }, 'Yanıtla')];
      if (!m.read) actions.push(h('button', { type: 'button', class: 'btn small', onclick: async () => { await request('/api/messages/read', { method: 'POST', body: JSON.stringify({ id: m.id }) }); load(); } }, 'Okundu'));
      actions.push(h('button', { type: 'button', class: 'btn small', onclick: async () => { if (confirm('Bu mesaj silinsin mi?')) { await request(`/api/messages/${m.id}`, { method: 'DELETE' }); load(); } } }, 'Sil'));
      const replies = (m.replies || []).map((r) => h('div', { style: 'margin:10px 0 0;padding:8px 12px;border-left:3px solid #55db9c;background:rgba(85,219,156,.12);border-radius:6px' },
        h('div', { class: 'muted', style: 'font-size:12px' }, `Yanıtın · ${new Date(r.date).toLocaleString('tr-TR')}`),
        h('div', { style: 'white-space:pre-wrap' }, r.text)));
      return h('div', { class: 'card', style: 'margin-bottom:12px' },
        h('p', { style: 'margin:0 0 6px;font-weight:700' }, `${m.read ? '' : '● '}${m.name}  ·  ${new Date(m.date).toLocaleString('tr-TR')}`, m.campaign === 'shopier' ? h('span', { style: 'margin-left:8px;padding:2px 8px;border:1.5px solid #000;border-radius:999px;background:#ffd731;color:#000;font-size:12px' }, 'Shopier %10') : ''),
        h('p', { class: 'muted', style: 'margin:0 0 8px' }, [m.email, m.phone].filter(Boolean).join('  ·  ')),
        h('p', { style: 'margin:0 0 10px;white-space:pre-wrap' }, m.message),
        ...replies,
        h('div', { style: 'display:flex;gap:8px;margin-top:10px' }, ...actions),
        form);
    };
    const load = () => request('/api/messages').then((list) => {
      box.replaceChildren(...(list.length ? list.map(card) : [h('p', { class: 'muted' }, 'Henüz mesaj yok.')]));
      setUnread(list.filter((m) => !m.read).length);
    }).catch((err) => box.replaceChildren(h('p', { class: 'error' }, err.message)));
    load();
    return box;
  }
  function promoPage() {
    const box = h('div', {}, h('p', { class: 'muted' }, 'Yükleniyor…'));
    request('/api/promo').then((d) => {
      const c = d.counts;
      const rate = (a, b) => (b ? ` (%${Math.round((a / b) * 100)})` : '');
      const stat = (label, k, base) => h('div', { class: 'card', style: 'flex:1 1 150px;margin:0' },
        h('p', { class: 'muted', style: 'margin:0 0 4px;font-size:13px' }, label),
        h('p', { style: 'margin:0;font-size:28px;font-weight:800' }, String(c[k].all)),
        h('p', { class: 'muted', style: 'margin:4px 0 0;font-size:12px' }, `Son 7 gün: ${c[k].week}${base ? rate(c[k].all, c[base].all) : ''}`));
      const row = (l) => h('tr', {}, h('td', {}, new Date(l.ts).toLocaleString('tr-TR')), h('td', {}, l.name || ''), h('td', {}, h('a', { href: `mailto:${l.email}` }, l.email || '')), h('td', {}, l.phone || ''), h('td', {}, l.kind || ''));
      const td = 'padding:6px 10px;border-bottom:1px solid var(--line,#ddd);text-align:left';
      box.replaceChildren(
        h('div', { style: 'display:flex;flex-wrap:wrap;gap:10px;margin-bottom:16px' }, stat('Pencereyi gören', 'view'), stat('Teklif al’a tıklayan', 'click', 'view'), stat('Kapatan', 'close', 'view'), stat('Form gönderen', 'lead', 'click')),
        h('h3', { style: 'margin:8px 0' }, 'Kampanyadan gelen talepler'),
        d.leads.length ? h('div', { style: 'overflow:auto' }, h('table', { style: 'width:100%;border-collapse:collapse;font-size:14px' },
          h('thead', {}, h('tr', {}, ...['Tarih', 'Ad', 'E-posta', 'Telefon', 'Nereden'].map((t) => h('th', { style: td }, t)))),
          h('tbody', {}, ...d.leads.map(row)))) : h('p', { class: 'muted' }, 'Henüz kampanyadan gelen talep yok.'),
        h('p', { class: 'muted', style: 'margin-top:12px;font-size:12px' }, 'Bu kişilerin mesajları "Gelen Mesajlar"da da "Shopier %10" etiketiyle durur; e-posta konusu [Shopier %10] ile başlar.'));
      box.querySelectorAll('td').forEach((x) => { x.style.cssText = td; });
    }).catch((err) => box.replaceChildren(h('p', { class: 'error' }, err.message)));
    return box;
  }
  function backupsPage() {
    const box = h('div', {}, h('p', { class: 'muted' }, 'Yükleniyor…'));
    request('/api/backups').then((list) => {
      box.replaceChildren(...(list.length ? list.map((name) => {
        const d = name.replace('content-', '').replace('.json', '').replace(/T(\d\d)-(\d\d)-(\d\d)-\d+Z/, 'T$1:$2:$3Z');
        const when = new Date(d);
        return h('div', { class: 'backup-row' },
          h('span', {}, Number.isNaN(when.getTime()) ? name : when.toLocaleString('tr-TR')),
          h('button', { type: 'button', class: 'btn small', onclick: async () => {
            if (isDirty() && !confirm('Kaydedilmemiş değişikliklerin kaybolacak. Devam edilsin mi?')) return;
            state = await request(`/api/backups/${encodeURIComponent(name)}`);
            changed(); renderNav(); toast('Yedek yüklendi. Siteye uygulamak için Kaydet\'e bas.');
          } }, 'Bu yedeği yükle'));
      }) : [h('p', { class: 'muted' }, 'Henüz yedek yok. İlk kaydetmeden sonra burada görünür.')]));
    }).catch((err) => box.replaceChildren(h('p', { class: 'error' }, err.message)));

    const importInput = h('input', { type: 'file', accept: 'application/json,.json', hidden: true });
    importInput.addEventListener('change', async () => {
      const f = importInput.files[0];
      if (!f) return;
      try {
        const data = JSON.parse(await f.text());
        if (!data || typeof data !== 'object' || !data.hero) throw new Error();
        const defaults = await request('/api/defaults');
        state = mergeDefaults(defaults, data);
        changed(); renderNav(); renderPage(); toast('Dosya yüklendi. Uygulamak için Kaydet\'e bas.');
      } catch { toast('Bu dosya geçerli bir site içeriği değil.', true); }
      importInput.value = '';
    });

    return h('div', {},
      h('div', { class: 'card' }, h('h3', {}, 'Otomatik yedekler'), box),
      h('div', { class: 'card' }, h('h3', {}, 'Dışa / içe aktar'),
        h('p', { class: 'hint' }, 'Tüm içeriği bir dosya olarak bilgisayarına indirebilir, sonra geri yükleyebilirsin. Görseller dosyaya dahil değildir.'),
        h('div', { class: 'image-actions', style: 'margin-top:10px' },
          h('button', { type: 'button', class: 'btn small', onclick: () => {
            const a = h('a', { href: URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })), download: `goatz-icerik-${new Date().toISOString().slice(0, 10)}.json` });
            a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
          } }, 'İçeriği indir'),
          h('label', { class: 'btn small' }, 'Dosyadan yükle', importInput))),
      h('div', { class: 'card' }, h('h3', {}, 'Başlangıç içeriği'),
        h('p', { class: 'hint' }, 'Tüm metinleri, renkleri ve ayarları ilk haline döndürür. Yüklediğin görseller silinmez.'),
        h('button', { type: 'button', class: 'btn small danger', style: 'margin-top:10px', onclick: async () => {
          if (!confirm('Tüm içerik ilk haline dönsün mü? Kaydet\'e basana kadar site değişmez.')) return;
          state = await request('/api/defaults');
          changed(); renderNav(); toast('Başlangıç içeriği yüklendi. Uygulamak için Kaydet\'e bas.');
        } }, 'Başlangıç içeriğine dön')));
  }

  // ---------- Temalar ----------
  // Hazır paletler: yalnız renk anahtarlarını değiştirir (siyah/beyaz sabit, kalın siyah çizgi kimliği korunur).
  // Seçilen temanın kimliği theme.preset içinde saklanır; renkler yine theme.colors'ta durur (site bunu okur).
  const THEMES = [
    { id: 'sun', name: 'The Sun', note: 'Varsayılan', colors: { sky: '#dceeff', concrete: '#cccccc', mist: '#e9e9e9', blue: '#4da2ff', mint: '#55db9c', lavender: '#e9ccff', ember: '#fb4903', sun: '#ffd731', violet: '#5c4ade' } },
    { id: 'nane', name: 'Nane', note: 'Yeşil ağırlıklı', colors: { sky: '#dff5ea', concrete: '#c4d1ca', mist: '#e7efe9', blue: '#3fb7c9', mint: '#2fd18b', lavender: '#cdeedd', ember: '#ff7a45', sun: '#c8f26b', violet: '#1f8a70' } },
    { id: 'lavanta', name: 'Lavanta', note: 'Mor ağırlıklı', colors: { sky: '#ece4ff', concrete: '#cdc8d8', mist: '#ece9f2', blue: '#7fa6ff', mint: '#8fe6c0', lavender: '#d4b8ff', ember: '#ff5f8f', sun: '#ffe27a', violet: '#6a3df0' } },
    { id: 'okyanus', name: 'Okyanus', note: 'Mavi ağırlıklı', colors: { sky: '#d2eaff', concrete: '#c3cfdb', mist: '#e5ecf3', blue: '#1f7cff', mint: '#34dcc0', lavender: '#bcd2ff', ember: '#ff5a36', sun: '#ffd23f', violet: '#1a3fd1' } },
    { id: 'ates', name: 'Ateş', note: 'Turuncu ağırlıklı', colors: { sky: '#ffe8dc', concrete: '#d4c6bf', mist: '#f0e9e5', blue: '#5aa9ff', mint: '#9ee37d', lavender: '#ffcdb8', ember: '#ff3d1f', sun: '#ffc233', violet: '#b3261e' } },
  ];
  const THEME_KEYS = ['sun', 'mint', 'lavender', 'blue', 'ember', 'violet'];
  // ---- Tema verisi: yayındaki tema üst düzey alanlarda, diğerleri state.themes[kimlik] içinde durur ----
  const sliceKeys = () => Object.keys(window.GoatzRender.DEFAULTS.themes.__dict);
  const pickSlice = (o) => Object.fromEntries(sliceKeys().map((k) => [k, structuredClone(o[k])]));
  let editTheme = null;   // düzenlenen temanın kimliği (null = tema listesi / ana panel)
  let liveStash = null;   // yayında olmayan bir tema düzenlenirken yayındaki temanın ayarları
  let teView = 'sections'; // 'sections' | 'settings'
  let tePageSel = 'home';
  const teOpen = new Set();
  const activeId = () => { const id = (liveStash || state).theme.preset; return THEMES.some((t) => t.id === id) ? id : 'sun'; };
  const freshTheme = (id) => { const v = pickSlice(state); v.theme.preset = id; Object.assign(v.theme.colors, THEMES.find((t) => t.id === id).colors); return v; };
  const TE_IDS = () => new Set(['ticker', 'nav', ...state.sections.map((x) => PAGES.find((q) => q.section === x.id)?.id), 'theme', 'sections', 'm-text', 'm-sticker', 'm-font', 'm-global']);

  function enterTheme(id) {
    if (isDirty()) { confirmLeave(() => enterTheme(id)); return; }
    const act = activeId();
    editTheme = id; teView = 'sections'; tePageSel = 'home'; teOpen.clear();
    if (id !== act && !liveStash) {
      liveStash = pickSlice(state);
      Object.assign(state, structuredClone(state.themes[id] || freshTheme(id)));
      saved = JSON.stringify(state);
    }
    page = PAGES.find((x) => x.id === 'tema-overview');
    previewPage = null;
    $('#panel').classList.remove('open');
    renderNav(); renderPage(); refreshPreview(true); updateStatus();
  }
  // Kaydedilmemiş değişiklikler çöpe atılır (saved anına dönülür), sonra yayındaki tema geri konur.
  function leaveTheme(discard) {
    if (discard) state = JSON.parse(saved);
    if (liveStash) { Object.assign(state, liveStash); liveStash = null; }
    editTheme = null; previewPage = null;
    saved = JSON.stringify(state);
    page = PAGES.find((x) => x.id === 'tema-overview');
    navView = 'main'; openGroup = null; $('#panel').classList.add('open');
    history.replaceState(null, '', '#tema-overview');
    renderNav(); renderPage(); refreshPreview(true); updateStatus();
  }
  async function activate(id) {
    if (isDirty()) { toast('Önce Kaydet\'e bas, sonra yayına al.', true); return; }
    const t = THEMES.find((x) => x.id === id);
    if (!confirm(`${t.name} teması yayına alınsın mı? Site hemen bu temaya geçer; şu anki tema listeye geçer, ayarları kaybolmaz.`)) return;
    const cur = activeId();
    const themes = { ...state.themes };
    let live, old;
    if (liveStash) { old = liveStash; live = pickSlice(state); } else { old = pickSlice(state); live = structuredClone(themes[id] || freshTheme(id)); }
    themes[cur] = old; delete themes[id];
    live.theme.preset = id;
    try {
      const r = await request('/api/content', { method: 'PUT', body: JSON.stringify({ ...state, ...live, themes }) });
      state = r; liveStash = null; saved = JSON.stringify(state);
      toast(`${t.name} yayında. Site güncellendi.`);
    } catch (err) { toast(err.message, true); return; }
    renderNav(); renderPage(); refreshPreview(true); updateStatus();
  }

  function themesEditor() {
    const act = activeId();
    return h('div', {},
      h('p', { class: 'hint' }, 'Bir tema seçip Düzenle\'ye gir: o temanın sayfa bölümlerini ve ayarlarını açarsın. Her temanın ayarları ayrı saklanır ve ayrı kaydedilir. Yayına al\'dan sonra site o temaya geçer.'),
      h('div', { class: 'theme-grid' },
        ...THEMES.map((t) => h('div', { class: `theme-card${t.id === act ? ' on' : ''}` },
          h('span', { class: 'theme-sw' }, ...THEME_KEYS.map((k) => h('i', { style: `background:${t.colors[k]}` }))),
          h('b', {}, t.name),
          h('small', {}, t.id === act ? 'Yayında' : t.note),
          h('div', { class: 'theme-actions' },
            h('button', { type: 'button', class: 'btn small solid', onclick: () => enterTheme(t.id) }, 'Düzenle'),
            t.id === act ? null : h('button', { type: 'button', class: 'btn small', onclick: () => activate(t.id) }, 'Yayına al'))))),
      h('p', { class: 'hint' }, 'Gece görünümünün renkleri koda gömülüdür, buradan değişmez. Marka ve SEO, görseller, sayfalar ve işler tüm temalar için ortaktır.'));
  }

  // Sayfa seçici (ikas gibi özel açılır liste): üstte standart sayfalar (sitede gerçekten karşılığı olanlar), altta diğer mevcut sayfalar.
  const STD_PAGES = [['home', 'Anasayfa'], ['hizmetler', 'Hizmetler Sayfası'], ['iletisim', 'İletişim Sayfası'], ['teklifal', 'Teklif Al Sayfası'], ['sepet', 'Sepet Sayfası'], ['sss', 'Sık Sorulan Sorular Sayfası'], ['blog', 'Blog Anasayfa'], ['@blog', 'Blog Yazısı Sayfası']];
  function pageEntries() {
    const std = [];
    for (const [id, name] of STD_PAGES) {
      if (id === 'home') { std.push({ id, name }); continue; }
      if (id === '@blog') { const b = state.pages.find((x) => x.kind === 'blog'); if (b) std.push({ id: b.id, name, sub: b.title }); continue; }
      if (state.pages.some((x) => x.id === id)) std.push({ id, name });
    }
    const stdIds = new Set(std.map((e) => e.id));
    const custom = state.pages.filter((x) => !STD_PAGES.some(([sid]) => sid === x.id)).map((x) => ({ id: x.id, name: x.title || 'Sayfa', del: true }));
    return { std, custom, stdIds };
  }
  function pagePicker() {
    const { std, custom } = pageEntries();
    const cur = std.find((e) => e.id === tePageSel) || custom.find((e) => e.id === tePageSel) || std[0];
    const wrap = h('div', { class: 'te-dd' });
    const menu = h('div', { class: 'te-dd-menu', role: 'listbox', hidden: true });
    const close = () => { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
    const pick = (id) => {
      tePageSel = id; previewPage = id === 'home' ? null : id;
      $('#panel').classList.remove('open'); renderNav(); refreshPreview(true);
    };
    const item = (e) => h('div', { class: `te-dd-row${e.id === tePageSel ? ' on' : ''}` },
      h('button', { type: 'button', class: 'te-dd-item', role: 'option', 'aria-selected': String(e.id === tePageSel), onclick: () => pick(e.id) },
        h('span', { class: 'te-dd-check', 'aria-hidden': 'true' }, e.id === tePageSel ? '✓' : ''), h('span', { class: 'te-dd-name' }, e.name), e.sub ? h('small', {}, e.sub) : null),
      e.del ? h('button', { type: 'button', class: 'te-dd-del', title: 'Sayfayı sil', 'aria-label': `${e.name} sayfasını sil`, onclick: () => {
        close();
        if (!confirm(`"${e.name}" sayfası silinsin mi?`)) return;
        if (tePageSel === e.id) { tePageSel = 'home'; previewPage = null; }
        page = PAGES.find((x) => x.id === 'tema-overview'); $('#panel').classList.remove('open');
        deletePage(e.id); refreshPreview(true);
      } }, '🗑') : null);
    menu.append(...std.map(item), h('div', { class: 'te-dd-sep' }, 'Diğer sayfalar'), ...custom.map(item),
      h('button', { type: 'button', class: 'te-dd-new', onclick: () => {
        close();
        if (state.pages.length >= 100) { toast('En fazla 100 sayfa oluşturabilirsin.', true); return; }
        const np = newPage(); state.pages.push(np); changed(); tePageSel = np.id; selectPage(customDef(np));
      } }, '⊕ Yeni Sayfa Oluştur'));
    const btn = h('button', { type: 'button', class: 'te-dd-btn', 'aria-haspopup': 'listbox', 'aria-expanded': 'false', onclick: (ev) => { ev.stopPropagation(); menu.hidden = !menu.hidden; btn.setAttribute('aria-expanded', String(!menu.hidden)); if (!menu.hidden) menu.querySelector('.on .te-dd-item')?.scrollIntoView({ block: 'nearest' }); } },
      h('span', { class: 'lbl' }, cur ? cur.name : 'Anasayfa'), h('i', { class: 'chev', 'aria-hidden': 'true' }));
    wrap.append(btn, menu);
    wrap.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') { close(); btn.focus(); } });
    return wrap;
  }
  document.addEventListener('click', (e) => { document.querySelectorAll('.te-dd-menu:not([hidden])').forEach((m) => { if (!e.target.closest('.te-dd')) { m.hidden = true; m.parentNode.querySelector('.te-dd-btn')?.setAttribute('aria-expanded', 'false'); } }); });

  // ---- Tema düzenleyici (sol sütun): sayfa seçici + bölüm listesi + Tema Ayarları ----
  function renderThemeNav() {
    const nav = $('#pages');
    const th = THEMES.find((t) => t.id === editTheme) || THEMES[0];
    const act = editTheme === activeId();
    const dotColor = (p) => { const key = p.section ? state[p.section]?.background : p.id === 'ticker' ? state.ticker.background : null; return key ? state.theme.colors[key] : null; };
    const rowBtn = (p, label, extra) => {
      const sec = p.section && state.sections.find((x) => x.id === p.section);
      const dc = dotColor(p);
      return h('button', { type: 'button', class: `te-item${isOn(p.id) ? ' on' : ''}`, onclick: () => selectPage(p) },
        dc ? h('i', { class: 'dot', style: `background:${dc}` }) : null,
        h('span', { class: 'lbl' }, label || p.label),
        sec && !sec.visible ? h('span', { class: 'eye' }, 'gizli') : null,
        extra ? h('small', { class: 'te-note' }, extra) : null,
        h('i', { class: 'chev', 'aria-hidden': 'true' }));
    };
    const rows = [
      h('button', { type: 'button', class: 'back-btn', onclick: leaveEditFlow }, '← Temalara dön'),
      h('div', { class: 'te-head' },
        h('span', { class: 'te-sw' }, ...THEME_KEYS.map((k) => h('i', { style: `background:${th.colors[k]}` }))),
        h('b', {}, th.name),
        act ? h('span', { class: 'te-badge' }, 'Yayında') : h('button', { type: 'button', class: 'btn small', onclick: () => activate(editTheme) }, 'Yayına al'),
        h('button', { type: 'button', class: 'btn small solid', id: 'teSave', disabled: !isDirty(), onclick: save }, 'Kaydet')),
    ];
    if (teView === 'settings') {
      rows.push(h('button', { type: 'button', class: 'te-sub-back', onclick: () => { teView = 'sections'; renderNav(); } }, '‹ Sayfa bölümleri'),
        h('h3', { class: 'te-title' }, 'Tema Ayarları'));
      for (const id of ['theme', 'm-font', 'm-text', 'm-sticker', 'm-global', 'sections']) {
        const p = PAGES.find((x) => x.id === id);
        rows.push(rowBtn(p));
      }
    } else {
      rows.push(pagePicker());
      if (tePageSel === 'home') {
        const flow = [PAGES.find((x) => x.id === 'ticker'), PAGES.find((x) => x.id === 'nav'), ...state.sections.map((x) => PAGES.find((q) => q.section === x.id)).filter(Boolean)];
        flow.forEach((p) => rows.push(rowBtn(p)));
      } else {
        const pg = state.pages.find((x) => x.id === tePageSel);
        if (pg) {
          // Sayfanın kendi bölümleri: ayarlar, Google, üst başlık ve içerik blokları (her biri panelde açılır satır).
          for (const k of Object.keys(PAGE_SCHEMA)) {
            const d = PAGE_SCHEMA[k];
            const label = k === 'blocks' ? `${d.label} (${pg.blocks.length})` : d.label;
            rows.push(h('button', { type: 'button', class: 'te-item', onclick: () => { teOpen.add(`pg:${pg.id}:${k}`); selectPage(customDef(pg)); } },
              h('span', { class: 'lbl' }, label), h('i', { class: 'chev', 'aria-hidden': 'true' })));
          }
        }
      }
      rows.push(h('button', { type: 'button', class: 'te-item te-settings', onclick: () => { teView = 'settings'; renderNav(); } },
        h('span', { class: 'lbl' }, 'Tema Ayarları'), h('i', { class: 'chev', 'aria-hidden': 'true' })));
    }
    nav.replaceChildren(...rows);
  }
  const leaveEditFlow = () => confirmLeave(() => {}, { discardFn: () => leaveTheme(true), saveFn: () => leaveTheme(false), plain: () => leaveTheme(false) });

  // Bölüm paneli: alanlar ikas gibi açılır satırlara bölünür; hareketler bölümün kendi "Hareket" satırındadır.
  function teRow(key, label, nodes) {
    const d = h('details', { class: 'te-row', open: teOpen.has(key) || null }, h('summary', {}, h('span', {}, label), h('i', { class: 'chev', 'aria-hidden': 'true' })), h('div', { class: 'te-body' }, ...nodes));
    d.addEventListener('toggle', () => { if (d.open) teOpen.add(key); else teOpen.delete(key); });
    return d;
  }
  function teRows(pg) {
    const rows = [];
    const entries = Object.entries(pg.schema || {});
    const loose = Object.fromEntries(entries.filter(([, d]) => d.type !== 'group' && d.type !== 'list'));
    if (pg.id === 'm-font') teOpen.add('m-font:_');
    if (Object.keys(loose).length) rows.push(teRow(`${pg.id}:_`, pg.id === 'm-font' ? 'Yazı tipi seçimi' : 'Genel', objectFields(loose, pg.path)));
    for (const [k, d] of entries) if (d.type === 'group' || d.type === 'list') rows.push(teRow(`${pg.id}:${k}`, d.label || k, objectFields({ [k]: d }, pg.path)));
    if (pg.id === 'nav') rows.push(teRow('nav:#marka', 'Marka ve logo', [h('p', { class: 'hint' }, 'Site adı ve logo tüm temalar için ortaktır.'), ...objectFields({ brand: BRAND_GROUP }, [])]));
    if (MOTION_FOR[pg.id]) rows.push(teRow(`${pg.id}:#hareket`, 'Hareket', objectFields(motionSchema(MOTION_FOR[pg.id]), ['theme'])));
    return rows;
  }

  const commerce = window.GoatzCommerce({ h, request, toast, rerender: () => renderPage() });
  const sales = window.GoatzSales({ h, toast, rerender: () => renderPage(), goto: (id) => { const pg = PAGES.find((x) => x.id === id); if (pg) selectPage(pg); }, ui: commerce.ui });

  const dash = window.GoatzDashboard({ h, request, goto: (id) => { const pg = PAGES.find((x) => x.id === id); if (pg) selectPage(pg); }, sales, commerce });

  function placeholderPage(title) {
    return h('div', { class: 'card' },
      h('h3', {}, title),
      h('p', { class: 'muted' }, 'Bu bölüm yakında eklenecek.'),
      h('p', { style: 'opacity: 0.5; font-size: 12px; margin-top: 8px' }, '🚀 Geliştirme aşamasında...'));
  }

  function mergeDefaults(def, val) {
    if (Array.isArray(def)) return Array.isArray(val) ? val : def;
    if (def && typeof def === 'object') {
      const out = {};
      for (const k of Object.keys(def)) out[k] = mergeDefaults(def[k], val ? val[k] : undefined);
      return out;
    }
    return typeof val === typeof def ? val : def;
  }

  // =====================================================================
  //  Başlat
  // =====================================================================
  (async () => {
    // Sticker çizimlerini panelde de kullanabilmek için yükle.
    try {
      const sprites = await fetch('/sprites.svg').then((r) => r.text());
      document.body.insertAdjacentHTML('afterbegin', sprites);
      if (window.GoatzRender) window.GoatzRender.setSprites(sprites);
    } catch { /* sticker önizlemeleri olmadan devam */ }
    const me = await request('/api/me');
    if (!me.configured) {
      showLogin();
      $('#loginError').textContent = 'Panel şifresi sunucuda ayarlanmamış (ADMIN_PASSWORD).';
      return;
    }
    if (me.authed) start(); else showLogin();
  })();
})();
