// Sitenin varsayılan içeriği. Panelden kaydedilen içerik data/content.json dosyasına yazılır;
// eksik alanlar her zaman buradan tamamlanır (bkz. lib/content.js).
const sticker = (type, x, y, mx, my, size, rotate, float = true) => ({ type, x, y, mx, my, size, rotate, float });

// ---------- Özel sayfalar: şablonlar (varsayılan içerikte sayfa yoktur) ----------
const CARD = { title: 'Kart başlığı', text: 'Kısa bir açıklama.', color: 'mint', sticker: 'star', image: '' };
const GALLERY_IMAGE = { image: '', caption: '' };
const BLOCK = {
  type: 'text', visible: true, background: 'paper',
  eyebrow: '', heading: 'Başlık', text: 'Metnini buraya yaz. Boş bir satır bırakarak yeni paragraf açabilirsin.',
  align: 'left',
  image: '', imageSide: 'left', imageColor: 'mint', imageSticker: 'star',
  button: { label: '', target: '#iletisim' },
  columns: 3, cards: [CARD], ratio: 'square', images: [GALLERY_IMAGE],
};
const PAGE = {
  id: '', title: 'Yeni sayfa', slug: 'yeni-sayfa', slugAuto: true, visible: true, inNav: true, navLabel: '',
  seoTitle: '', seoDescription: '', background: 'sky', showContact: true,
  hero: {
    visible: true, eyebrow: '', title: '', subtitle: '', titleSize: 12,
    ribbon: { visible: true, color: 'blue' },
    stickers: [sticker('camera', 9, 26, 8, 14, 100, -12), sticker('coin', 86, 32, 80, 30, 90, 10)],
  },
  blocks: [BLOCK],
};

// ---------- İşler (portföy) ----------
const WORK = {
  title: 'Yeni proje', slug: '', category: 'web', year: '', client: '', summary: '', description: '',
  image: '', url: '', urlLabel: 'Siteyi ziyaret et', tags: [''], gallery: [GALLERY_IMAGE],
  color: '', featured: false, live: false, visible: true,
};

const DEFAULTS = {
  theme: {
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
      { label: 'Süreç', target: '#surec' },
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
    line1Start: 'Çekim',
    line1Sticker: 'camera',
    line1End: '+ tasarım',
    line2Sticker: 'check',
    line2Start: 'tek',
    card: { visible: true, label: 'Teklif al', target: '#iletisim', color: 'violet' },
    line2End: 'stüdyo',
    line3: 'Goatz studio',
    line3Sticker: 'browser',
  },
  services: {
    background: 'paper',
    items: [
      {
        title: 'Ürün\nçekimi',
        text: 'Beyaz fonda katalog çekimlerinden konsept kurgulara kadar, ürününü en iyi açısından gösteren fotoğraflar. E-ticaret sitelerine ve pazaryerlerine hazır teslim.',
        button: { label: 'Fiyat sor ↗', target: '#iletisim' },
        color: 'mint', image: '', media: 'pattern', stickerA: 'camera', stickerB: 'coin',
      },
      {
        title: 'Web\nsitesi',
        text: 'Hızlı açılan, telefonda kusursuz görünen, markana özel tasarlanmış siteler. Tanıtım sitesinden e-ticarete kadar tasarımı da kurulumu da bizden.',
        button: { label: 'Fiyat sor ↗', target: '#iletisim' },
        color: 'lavender', image: '', media: 'pattern', stickerA: 'browser', stickerB: 'cursor',
      },
      {
        title: 'İkisi\nbir arada',
        text: 'Ürünlerini çekiyoruz, o fotoğraflarla siteni kuruyoruz. Tek muhatap, tek takvim, baştan sona tutarlı bir marka görünümü.',
        button: { label: 'Paketi incele ↗', target: '#iletisim' },
        color: 'blue', image: '', media: 'sticker', stickerA: 'star', stickerB: 'camera',
      },
    ],
  },
  why: {
    background: 'paper',
    heading: 'Çek, tasarla, yayına al. Hepsi tek stüdyoda, sürpriz maliyet olmadan.',
    showButtons: true,
    cards: [
      { title: 'Net\nfiyat', color: 'ember', sticker: 'coin', image: '' },
      { title: 'Hızlı\nteslim', color: 'sun', sticker: 'camera', image: '' },
      { title: 'Mobilde\nkusursuz', color: 'blue', sticker: 'browser', image: '' },
      { title: 'Satışa\nhazır', color: 'lavender', sticker: 'check', image: '' },
      { title: 'Tek\nmuhatap', color: 'mint', sticker: 'star', image: '' },
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
    description: 'Ürün çekimi ve web tasarım stüdyosu. Ürünlerini çekiyor, siteni tasarlıyor, yayına alıyoruz.',
    showLinks: true,
    linksTitle: 'Sayfalar',
    showContact: true,
    contactTitle: 'İletişim',
    bigText: 'Goatz Studio',
    copyright: '© 2026 The Goatz Studio',
    tagline: 'Ürün çekimi · Web tasarım',
    stickers: [sticker('star', 5, 8, 4, 6, 90, -10), sticker('coin', 88, 12, 78, 8, 100, 10)],
  },
  works: {
    visible: true,
    background: 'sky',
    seoTitle: 'İşler — The Goatz Studio',
    seoDescription: 'The Goatz Studio işleri: web siteleri, web uygulamaları ve danışmanlık projeleri.',
    hero: {
      visible: true, eyebrow: 'Portföy', title: 'İşler', subtitle: 'Web siteleri, web uygulamaları ve danışmanlık projelerimiz.', titleSize: 12,
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
    showContact: true,
  },
  pages: [],
};
DEFAULTS.pages.__item = PAGE;
DEFAULTS.works.items.__item = WORK;
module.exports = DEFAULTS;
