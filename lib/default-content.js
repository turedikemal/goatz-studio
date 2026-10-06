// Sitenin varsayılan içeriği. Panelden kaydedilen içerik data/content.json dosyasına yazılır;
// eksik alanlar her zaman buradan tamamlanır (bkz. lib/content.js).
const sticker = (type, x, y, mx, my, size, rotate, float = true) => ({ type, x, y, mx, my, size, rotate, float });

// ---------- Özel sayfalar: şablonlar (varsayılan içerikte sayfa yoktur) ----------
// target: kartın altındaki "Detaylı bilgi" bağlantısı (page:id, work:slug…); boşsa bağlantı yok
const CARD = { title: 'Kart başlığı', text: 'Kısa bir açıklama.', color: 'mint', sticker: 'star', image: '', target: '' };
const GALLERY_IMAGE = { image: '', caption: '' };
const BLOCK = {
  type: 'text', visible: true, background: 'paper',
  eyebrow: '', heading: 'Başlık', text: 'Metnini buraya yaz. Boş bir satır bırakarak yeni paragraf açabilirsin.',
  align: 'left',
  // collapse: metin uzunsa ilk kısmı görünür, gerisi "Devamını oku" ile açılır
  collapse: false,
  // partnerLockup: başlığın sağında ikas × The Goatz Studio işareti
  partnerLockup: false,
  image: '', imageSide: 'left', imageColor: 'mint', imageSticker: 'star',
  button: { label: '', target: '#iletisim' },
  columns: 3, cards: [CARD], ratio: 'square', images: [GALLERY_IMAGE],
};
const PAGE = {
  id: '', title: 'Yeni sayfa', slug: 'yeni-sayfa', slugAuto: true, visible: true, inNav: true, navLabel: '',
  seoTitle: '', seoDescription: '', background: 'sky', showContact: true,
  // kind: 'page' (normal sayfa), 'blog' (blog yazısı: /blog/<adres>, blog listesinde görünür) ya da 'service' (hizmet/kategori sayfası: /hizmetler/<adres>)
  // date: yayın tarihi (YYYY-AA-GG); parent: hizmet sayfasının bağlı olduğu kategori sayfasının kimliği (ekmek kırıntısı için)
  kind: 'page', date: '', parent: '',
  hero: {
    visible: true, eyebrow: '', title: '', subtitle: '', titleSize: 12,
    ribbon: { visible: true, color: 'blue' },
    stickers: [sticker('layers', 9, 26, 8, 14, 100, -12), sticker('bulb', 86, 32, 80, 30, 90, 10)],
  },
  blocks: [BLOCK],
};

// ---------- İşler (portföy) ----------
const WORK_SECTION = { title: '', text: '', sticker: '' };
const FAQ_ITEM = { title: '', text: '' };
const WORK = {
  title: 'Yeni proje', slug: '', category: 'web', year: '', client: '', summary: '', description: '',
  image: '', url: '', urlLabel: 'Siteyi ziyaret et', tags: [''], gallery: [GALLERY_IMAGE],
  color: '', featured: false, live: false, natural: false, badge: '', premium: false, lang: '', story: '', closing: '', slogan: '',
  // about: sayfanın altındaki uzun proje açıklaması ("Devamını oku" ile açılır; [metin](page:id) bağlantıları ve "## Ara başlık" desteklenir)
  aboutHeading: '', about: '', listLabel: '', fun: '', sections: [WORK_SECTION], visible: true,
  // Proje sayfasındaki SSS (ortak SSS görünümü; başlık boşsa "<Proje adı> soruları")
  faqHeading: '', faq: [FAQ_ITEM],
};

const DEFAULTS = {
  theme: {
    preset: 'sun',
    colors: {
      carbon: '#000000', paper: '#ffffff', sky: '#dceeff', concrete: '#cccccc', mist: '#e9e9e9',
      blue: '#4da2ff', mint: '#55db9c', lavender: '#e9ccff', ember: '#fb4903', sun: '#ffd731', violet: '#5c4ade',
    },
    pageBackground: 'carbon',
    panelRadius: 30,
    cardRadius: 20,
    panelGap: 8,
    displayTracking: -6,
    displayLineHeight: 80,
    animations: true,
    bodyFont: 'inter',
    displayFont: 'inter',
    bodyTracking: -1,
    bodyLeading: 145,
    buttonTracking: 3.2,
    motion: {
      smooth: true, intro: true, reveal: true, headings: true, cards: true, pop: true,
      idle: true, parallax: true, device: true, marquee: true, navhide: true,
      tabs: true, slider: true, speed: 100, intensity: 100,
    },
  },
  brand: {
    siteName: 'The Goatz Studio',
    logoText: 'G',
    logoImage: '',
    logoSize: 44,
    logoFrame: 'circle',
    logoStyle: 'original',
    logoTint: 'carbon',
    logoWordmark: true,
    logoWordColor: 'violet',
  },
  seo: {
    title: 'The Goatz Studio — Ürün Çekimi ve Web Tasarım',
    description: 'The Goatz Studio: ürün fotoğrafçılığı ve web sitesi tasarımı. Ürününü çekiyor, markanı yayına alıyoruz.',
    shareImage: '',
  },
  sections: [
    { id: 'hero', visible: true },
    { id: 'showcase', visible: true },
    { id: 'statement', visible: true },
    { id: 'services', visible: true },
    { id: 'why', visible: true },
    { id: 'band', visible: true },
    { id: 'process', visible: true },
    { id: 'faq', visible: true },
    { id: 'about', visible: true },
    { id: 'contact', visible: true },
    { id: 'footer', visible: true },
  ],
  ticker: {
    visible: true,
    background: 'lavender',
    speed: 30,
    items: ['Ürün çekimi + web sitesi paketi', 'İlk görüşme ücretsiz', 'E-ticarete hazır görseller', 'Mobil uyumlu siteler'],
  },
  nav: {
    links: [
      { label: 'Hizmetler', target: '#hizmetler' },
      { label: 'İşler', target: '#isler' },
      { label: 'Neden Biz', target: '#neden' },
      { label: 'Süreç', target: 'page:nasilcalisiyoruz' },
      { label: 'İletişim', target: '#iletisim' },
    ],
    cta: { label: 'Teklif Al', target: '#iletisim' },
    hideLinksOnScroll: true,
  },
  hero: {
    background: 'sky',
    title: 'Goatz',
    titleColor: 'carbon',
    titleSize: 24,
    tagline: 'Ürünün parlasın. Markan büyüsün.',
    ribbon: { visible: true, color: 'blue' },
    buttons: [
      { label: 'İşleri gör', target: '#isler', style: 'outline', whatsappIcon: false },
      { label: "WhatsApp'tan yaz", target: 'whatsapp', style: 'outline', whatsappIcon: true },
    ],
    stickers: [
      sticker('camera', 12, 20, 6, 11, 120, -14),
      sticker('coin', 52, 22, 76, 12, 110, 10),
      sticker('browser', 78, 36, 78, 80, 120, 12),
      sticker('check', 13, 44, 6, 80, 100, -8),
    ],
  },
  showcase: {
    background: 'sky',
    ribbon: { visible: true, color: 'blue' },
    browser: {
      visible: true,
      address: 'markan.com',
      title: 'Yeni sezon koleksiyonu',
      subtitle: 'Web tasarımı · Goatz Studio',
      accent: 'violet',
      tiles: [
        { color: 'sun', image: '' },
        { color: 'mint', image: '' },
        { color: 'lavender', image: '' },
      ],
    },
    photo: {
      visible: true,
      image: '',
      background: 'sun',
      label: 'Ürün çekimi · Stüdyo',
      note: 'Yer tutucu: buraya senin çekimin gelecek',
    },
  },
  statement: {
    background: 'sky',
    line1Start: 'Web tasarım',
    line1Sticker: 'browser',
    line1End: '+ ürün çekimi',
    line1Sticker2: '',
    line2Sticker: 'check',
    line2Start: 'tek',
    card: { visible: true, label: 'Teklif al', target: '#iletisim', color: 'violet' },
    line2End: 'stüdyoda',
    line3: 'Goatz studio',
    line3Sticker: '',
    button: { label: '', target: '#iletisim' },
  },
  services: {
    background: 'paper',
    heading: 'Neler yapıyoruz?',
    more: [{title:'Ürün çekimi',color:'mint',sticker:'camera',sticker2:'',text:'Ürününü en iyi açısından gösteren, e-ticaret sitelerine ve pazaryerlerine hazır fotoğraflar.',button:{label:'Çekimlerimiz ↗',target:'works:photo'},items:[{label:'Çanakkale Ürün Fotoğrafı',text:'Üreticiler, yerel markalar ve e-ticaret mağazaları için çekim yapıyoruz. Ürünlerini getirebilir ya da çekimi birlikte planlayabiliriz; fotoğraflar doğrudan web sitende kullanılacak şekilde hazırlanır.',target:'works:photo'},{label:'E-Ticaret Fotoğrafları',text:'Ürün listesi, ürün detay sayfası ve kampanya görsellerini aynı dilde hazırlıyoruz; mağazan tutarlı ve güvenilir görünür.',target:'works:photo'},{label:'Beyaz Fon Ürün Fotoğrafları',text:'Ürünü tek başına ve en temiz haliyle gösterir. Pazaryerlerinin ve ürün listelerinin istediği bu çekimlerde ürün net, dengeli ışıkta ve gerçek rengiyle görünür.',target:'works:photo'},{label:'Renkli Fon Ürün Fotoğrafları',text:'Markanın kişiliğini öne çıkarır. Ürüne ve marka renklerine uygun fonlarla ana sayfa, kampanya ve sosyal medya görselleri hazırlıyoruz.',target:'works:photo'}]},{title:'Web sitesi',color:'lavender',sticker:'browser',sticker2:'',text:'Hızlı açılan, telefonda kusursuz görünen, markana özel tasarlanmış siteler.',button:{label:'Web işlerimiz ↗',target:'works:web'},items:[{label:'Markaya Özel Web Tasarım & UI/UX',text:'Sayfa düzenlerini, tipografiyi, içerik hiyerarşisini ve kullanıcı etkileşimlerini markayla uyumlu, sade ve anlaşılır hale getiriyoruz.',target:'works:web'},{label:'Mobil Uyumlu ve Satış Odaklı Tasarım',text:'Masaüstü, tablet ve mobilde tutarlı çalışan bir yapı kuruyor, mobil kullanıcıların ürünlere ve satın alma adımlarına hızlı ulaşması için kullanıcı deneyimini optimize ediyoruz.',target:'works:web'},{label:'Anahtar Teslim E-Ticaret Kurulumu',text:'Web sitesinin temel yapısından ürün sayfalarına, kategori sisteminden içerik alanlarına kadar tüm e-ticaret altyapısını kuruyoruz.',target:'page:anahtarteslim'}]},{title:'İkisi bir arada',color:'blue',sticker:'camera',sticker2:'browser',text:'Ürünlerini çekiyoruz, o fotoğraflarla siteni kuruyoruz.',button:{label:'Paketi incele ↗',target:'page:tekstudyo'},items:[{label:'Fotoğraflar siteye uyar',text:'Çekimleri sitenin tasarımını bilerek yapıyoruz. Ölçü, kadraj ve fon baştan siteye göre seçilir.',target:'page:tekstudyo'},{label:'Site fotoğrafları taşır',text:'Siteyi, çektiğimiz ürün fotoğraflarının öne çıkacağı şekilde tasarlıyoruz. Ürün, sayfanın yıldızı olur.',target:'page:tekstudyo'}]},{title:'Google\'da görünürlük',color:'sun',sticker:'magnifier',text:'Sitenin arama sonuçlarında, Google Merchant Center\'da ve ölçümlemede doğru görünmesi için çalışıyoruz.',items:[{label:'SEO & Teknik SEO',text:'Sayfa başlıklarını, meta açıklamalarını, URL yapılarını ve iç bağlantıları düzenliyor, teknik SEO altyapısını arama motorlarının siteyi doğru taramasına göre optimize ediyoruz.',target:'works:web'},{label:'Google Arama Görünürlüğü',text:'Ürün, kategori ve içerik sayfalarını arama niyetine uygun hale getiriyor, anahtar kelime ve sayfa optimizasyonları yapıyoruz.',target:'works:web'},{label:'Google Merchant Center',text:'Ürünlerin Google\'da listelenebilmesi için Merchant Center bağlantısını kuruyoruz.',target:'works:web'},{label:'Google Tag Manager & Ölçümleme',text:'Dönüşümleri ve ziyaretçi hareketlerini takip edebilmek için ölçümleme altyapısını Google Tag Manager ile düzenliyoruz.',target:'works:web'}],sticker2:'',button:{label:'',target:'#iletisim'}},{title:'Görünürlük & içerik',color:'mint',sticker:'chart',text:'İçeriklerin arama ve yapay zekâ destekli yanıt motorları tarafından doğru anlaşılması için çalışıyoruz.',items:[{label:'GEO Optimizasyonu',text:'İçeriklerin yapay zekâ destekli arama ve yanıt motorları tarafından da doğru anlaşılıp kullanılabilmesi için GEO optimizasyonu yapıyoruz.',target:'works:web'},{label:'Blog & Organik Trafik',text:'Arama niyetine uygun içerikler hazırlıyor, blog yazılarını ürün ve kategori sayfalarıyla bağlantılı hale getiriyoruz.',target:'works:web'},{label:'Türkçe & İngilizce Çok Dilli Site',text:'URL yapılarını, başlıkları, meta bilgilerini ve sayfa organizasyonunu iki dil için ayrı ayrı düzenliyoruz.',target:'works:web'},{label:'Site İçi Linkleme',text:'Kategori, ürün ve blog sayfaları arasında mantıklı bağlantılar kuruyoruz.',target:'works:web'}],sticker2:'',button:{label:'',target:'#iletisim'}},{title:'Pazaryeri & entegrasyonlar',color:'ember',sticker:'cart',text:'Ürünleri pazaryerlerinde de satışa sunuyor, tüm satış kanallarını tek yerden yönetilebilir hale getiriyoruz.',items:[{label:'Trendyol & Hepsiburada Entegrasyonu',text:'Ürünlerin Trendyol ve Hepsiburada\'da da satışa sunulabilmesi için entegrasyon altyapısını kuruyoruz.',target:'works:web'},{label:'Ortak Yönetim Paneli',text:'Site ve pazaryerlerindeki satış süreçlerini tek yerden takip edebileceğin ortak bir yönetim paneli kuruyoruz.',target:'works:web'}],sticker2:'',button:{label:'',target:'#iletisim'}},{title:'Kurulum & altyapı',color:'lavender',sticker:'layers',text:'Ürün ve kategori yapısından site hızına, bağlantılardan yönlendirmelere teknik altyapıyı düzenliyoruz.',items:[{label:'Ürün & Kategori Sayfaları',text:'Ürün gruplarını, açıklamaları ve kategori hiyerarşilerini daha anlaşılır hale getiriyoruz.',target:'works:web'},{label:'Site Hızı & Teknik Optimizasyon',text:'Sayfa yapıları, mobil kullanım ve teknik performans üzerinde iyileştirmeler yapıyoruz.',target:'works:web'},{label:'URL, Yönlendirme & Site Mimarisi',text:'Eski ve hatalı URL\'leri analiz ediyor, 404 veren sayfalara doğru yönlendirmeler kuruyor, sitemap\'i kontrol ediyoruz.',target:'works:web'}],sticker2:'',button:{label:'',target:'#iletisim'}},{title:'Web uygulamaları',color:'blue',sticker:'cursor',text:'E-ticaret mağazalarına eklenen, satışı destekleyen özel uygulamalar geliştiriyoruz.',items:[{label:'Kategori Yıldızı',text:'Çok satan ürünleri kategori ve ürün sayfalarında rozetlerle öne çıkarır.',target:'work:kategori-yildizi'},{label:'Yorum Merkezi',text:'Müşteri yorumlarını tek merkezde toplar ve mağaza vitrininde gösterir.',target:'work:yorum-merkezi'},{label:'Canlı Sipariş Haritası',text:'Türkiye genelindeki siparişleri interaktif harita üzerinde gösterir.',target:'work:canli-siparis-haritasi'}],sticker2:'',button:{label:'',target:'#iletisim'}},{title:'Danışmanlık & yönetim',color:'sun',sticker:'bulb',text:'Sitenin yol haritasını birlikte çıkarıyor, istersen tüm işlemlerini düzenli olarak biz yürütüyoruz.',items:[{label:'Web Sitesi Danışmanlığı',text:'Sitenin satışa nasıl daha iyi hizmet edeceğini birlikte bulup net bir yol haritasına dönüştürüyoruz.',target:'work:web-sitesi-danismanligi'},{label:'Aylık Site Yönetimi',text:'İstersen sitenin tüm iş ve işlemlerini düzenli olarak biz yürütürüz.',target:'work:aylik-site-yonetimi'}],sticker2:'',button:{label:'',target:'#iletisim'}}],
  },
  why: {
    background: 'paper',
    heading: 'Çek, tasarla, yayına al. Hepsi tek stüdyoda, sürpriz maliyet olmadan.',
    showButtons: true,
    partnerShow: false, partnerTitle: '', partnerHeading: '', partnerText: '', partnerChips: '', partnerButtonLabel: '', partnerButtonTarget: '#iletisim',
    cards: [
      { title: 'Net\nfiyat', color: 'ember', sticker: 'coin', image: '', text: '' },
      { title: 'Hızlı\nteslim', color: 'sun', sticker: 'camera', image: '', text: '' },
      { title: 'Mobilde\nkusursuz', color: 'blue', sticker: 'browser', image: '', text: '' },
      { title: 'Satışa\nhazır', color: 'lavender', sticker: 'check', image: '', text: '' },
      { title: 'Tek\nmuhatap', color: 'mint', sticker: 'star', image: '', text: '' },
    ],
  },
  band: {
    text: 'Goatz studio',
    speed: 36,
    row1: ['blue', 'paper', 'sun', 'mint'],
    row2: ['lavender', 'ember', 'paper', 'sun'],
    row3: ['mint', 'sun', 'blue', 'paper'],
    stickers: [
      sticker('camera', 9, 8, 8, 8, 110, -12),
      sticker('star', 84, 12, 78, 10, 90, 14),
      sticker('coin', 46, 78, 40, 80, 100, 8),
      sticker('browser', 76, 74, 66, 82, 110, -8),
    ],
  },
  process: {
    background: 'paper',
    heading: 'Nasıl çalışıyoruz?',
    intro: '',
    roadmap: [
      { title: 'Tanışma', text: 'Ne istediğini, ürünlerini ve hedefini konuşuyoruz.', color: 'sun', sticker: 'chat' },
      { title: 'Plan', text: 'Ne yapılacağını, sırasını ve içeriği netleştiriyoruz.', color: 'lavender', sticker: 'pencil' },
      { title: 'Üretim', text: 'Çekim ve tasarım yapılıyor; taslakları sen görüp onaylıyorsun.', color: 'mint', sticker: 'camera' },
      { title: 'Yayın', text: 'Test edip yayına alıyoruz ya da dosyaları teslim ediyoruz.', color: 'blue', sticker: 'rocket' },
    ],
    button: { label: 'Başlayalım ↗', target: '#iletisim' },
    tabs: [
      {
        tab: 'Ürün çekimi', title: 'Ürün\nçekimi', color: 'sun', sticker: 'camera', image: '',
        steps: ['Ürünlerini ve nerede kullanacağını konuşuyoruz.', 'Ürünleri stüdyoya gönderiyorsun ya da biz geliyoruz.', 'Çekim, rötuş ve boyutlandırma yapılıyor.', 'Kullanıma hazır dosyalar sana teslim ediliyor.'],
        button: { label: 'Çekim planla ↗', target: '#iletisim' },
      },
      {
        tab: 'Web sitesi', title: 'Web\nsitesi', color: 'lavender', sticker: 'browser', image: '',
        steps: ['Hedefini, sayfalarını ve içeriğini netleştiriyoruz.', 'Tasarım taslağını görüp onaylıyorsun.', 'Siteyi kuruyor, telefonda ve bilgisayarda test ediyoruz.', 'Alan adına bağlayıp yayına alıyoruz.'],
        button: { label: 'Site konuşalım ↗', target: '#iletisim' },
      },
      {
        tab: 'Paket', title: 'Çekim +\nsite', color: 'mint', sticker: 'check', image: '',
        steps: ['Tek görüşmede hem çekimi hem siteyi planlıyoruz.', 'Önce ürünlerini çekiyoruz.', 'Siteyi bu fotoğraflarla tasarlıyoruz.', 'Her şey tek seferde yayında.'],
        button: { label: 'Paket teklifi al ↗', target: '#iletisim' },
      },
    ],
  },
  // Ana sayfa SSS bölümü (diğer sayfalardaki SSS ile aynı görünüm)
  faq: { heading: 'Merak edilenler', cards: [FAQ_ITEM] },
  // Ana sayfa uzun açıklaması (Neden biz'in altında, SSS'den sonra; "Devamını oku", iki sütun)
  about: { eyebrow: 'Neden biz', heading: '', text: '' },
  contact: {
    background: 'paper',
    heading: 'Hadi\nbaşlayalım',
    whatsapp: '',
    whatsappMessage: 'Merhaba, The Goatz Studio hakkında bilgi almak istiyorum.',
    instagram: '',
    email: '',
    cards: {
      whatsapp: { visible: true, label: 'WhatsApp', title: 'Yaz', color: 'mint' },
      instagram: { visible: true, label: 'Instagram', title: 'Takip et', color: 'lavender' },
      email: { visible: true, label: 'E-posta', title: 'Mesaj at', color: 'sun' },
    },
  },
  footer: {
    background: 'carbon',
    showLogo: true,
    description: 'Web tasarım ve e-ticaret stüdyosu. Siteni tasarlıyor, ürünlerini çekiyor, yayına alıyoruz.',
    showLinks: true,
    linksTitle: 'Sayfalar',
    showContact: true,
    contactTitle: 'İletişim',
    showLegal: true,
    legalTitle: 'Yasal',
    extraLinks: [{ label: 'SSS', target: 'page:sss' }],
    legalLinks: [{ label: 'Gizlilik Politikası', target: 'page:gizlilik' }, { label: 'KVKK Aydınlatma Metni', target: 'page:kvkk' }, { label: 'Çerez Politikası', target: 'page:cerez' }, { label: 'Kullanım Koşulları', target: 'page:kosullar' }],
    companyInfo: '',
    bigText: 'Goatz Studio',
    copyright: '© 2026 The Goatz Studio',
    tagline: 'Web tasarım · E-ticaret · Ürün çekimi',
    stickers: [sticker('foot', 91, 8, 80, 4, 90, 8), sticker('shoe', 4, 50, 4, 46, 110, -6), sticker('sock', 4, 9, 2, 8, 85, -6)],
  },
  works: {
    visible: true,
    background: 'sky',
    seoTitle: 'İşler — The Goatz Studio',
    seoDescription: 'The Goatz Studio işleri: web siteleri, web uygulamaları ve danışmanlık projeleri.',
    hero: {
      visible: true, eyebrow: 'Portföy', title: 'İşler', subtitle: 'Web siteleri, web uygulamaları, ürün çekimi ve danışmanlık projelerimiz.', titleSize: 12,
      ribbon: { visible: true, color: 'blue' },
      stickers: [sticker('browser', 80, 30, 74, 18, 110, 10), sticker('check', 10, 42, 6, 62, 90, -8), sticker('star', 52, 16, 46, 10, 80, 12)],
    },
    allLabel: 'Tümü',
    moreLabel: 'Yapılan işler',
    emptyText: 'Projeler çok yakında burada.',
    categories: [
      { key: 'web', label: 'Web siteleri', color: 'mint', sticker: 'browser' },
      { key: 'app', label: 'Web uygulamaları', color: 'lavender', sticker: 'cursor' },
      { key: 'consulting', label: 'Danışmanlık', color: 'sun', sticker: 'check' },
    ],
    items: [],
    photo: { visible: true, heading: 'Ürün çekimi', text: 'Web sitelerine özel, e-ticarete uygun profesyonel e-ticaret ürün çekimleri.', points: [{ title: '', text: '' }], images: [{ image: '', caption: '', category: '', cover: false }], color: 'sun' },
    // Listenin altındaki uzun açıklama ("Devamını oku"); [metin](page:id) bağlantıları ve "## Ara başlık" desteklenir
    aboutHeading: '', about: '',
    // Listenin altındaki SSS (ortak SSS görünümü)
    faqHeading: '', faq: [FAQ_ITEM],
    approach: { visible: false, eyebrow: '', heading: '', text: '', points: [{ title: '', text: '' }], cards: [{ title: '', text: '' }], quote: '' },
    showContact: true,
  },
  pages: [],
};
DEFAULTS.pages.__item = PAGE;
DEFAULTS.works.items.__item = WORK;
DEFAULTS.works.photo.points.__item = DEFAULTS.works.photo.points[0];
DEFAULTS.works.photo.images.__item = DEFAULTS.works.photo.images[0];
module.exports = DEFAULTS;
