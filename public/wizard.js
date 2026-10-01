// Teklif sihirbazı: kısa sorularla ihtiyaca uygun paketi ve ek hizmetleri belirler, özeti bize gönderir.
(() => {
  const root = document.querySelector('[data-wizard]');
  if (!root) return;
  const q = (s) => root.querySelector(s);
  const el = { stage: q('.wz-stage'), count: q('.wz-count'), track: q('.wz-track'), fill: q('.wz-fill'), back: q('.wz-back'), next: q('.wz-next'), hint: q('.wz-hint'), screen: q('.wz-screen') };
  const KVKK = root.dataset.kvkk || '';

  // Sayaç: kişi yazmaya başlayınca 2 dakikadan geri sayar, sonuç ekranında erken bittiyse tebrik eder
  const timer = (() => {
    const box = document.querySelector('[data-wz-timer]');
    if (!box) return { start() {}, finish() {}, reset() {} };
    const txt = box.querySelector('.wz-timer-txt'), clock = box.querySelector('.wz-timer-clock'), bar = box.querySelector('.wz-timer-bar i');
    const TOTAL = 120000;
    let t0 = 0, tick = 0, done = false;
    const fmt = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
    const set = (state, text, c) => { box.dataset.state = state; txt.textContent = text; if (c != null) clock.textContent = c; };
    const draw = () => {
      const left = TOTAL - (Date.now() - t0);
      bar.style.width = Math.max(0, (left / TOTAL) * 100) + '%';
      if (left <= 0) { clearInterval(tick); tick = 0; set('over', 'Süre doldu ama acele yok, rahat rahat devam edin.', '00:00'); bar.style.width = '0%'; return; }
      set('run', left < 30000 ? 'Son saniyeler, neredeyse bitti!' : 'Kalan süre, hadi 2 dakikada bitirelim.', fmt(left));
    };
    return {
      start() { if (t0 || done) return; t0 = Date.now(); draw(); tick = setInterval(draw, 250); },
      finish() {
        if (!t0 || done) return;
        done = true; clearInterval(tick); tick = 0;
        const used = Date.now() - t0, sec = Math.round(used / 1000), took = (sec >= 60 ? Math.floor(sec / 60) + ' dk ' : '') + (sec % 60) + ' sn';
        if (used < TOTAL) { set('win', '2 dakika bile sürmedi! Sadece ' + took + ' sürdü.', fmt(TOTAL - used)); bar.style.width = ((TOTAL - used) / TOTAL * 100) + '%'; }
        else { set('over', 'Biraz uzadı ama güzel bir plan çıktı. ' + took + ' sürdü.', '00:00'); }
      },
      reset() { clearInterval(tick); tick = 0; t0 = 0; done = false; bar.style.width = '100%'; set('idle', 'Bu iş yaklaşık 2 dakika sürer', '02:00'); },
    };
  })();
  const state = { step: 0, answers: {}, services: new Set(), extras: new Set(), contact: { name: '', email: '', phone: '', consent: true, marketing: true, mkDefault: true, website: '' }, sent: false, leadSent: false, site: { has: '', url: '', ok: '', brand: '', host: '', msg: '', busy: false } };
  const emailOk = (v) => /^[^s@<>"']+@[^s@<>"']+.[^s@<>"']+$/.test(v);
  const contactOk = () => state.contact.name.trim().length >= 2 && emailOk(state.contact.email.trim()) && state.contact.consent;

  const serviceList = [
    ['photo', 'Ürün fotoğrafı', 'Ürünleriniz için yeni fotoğraflar çekilir. Hangi ürünlerin, nasıl çekileceğini sizinle konuşarak netleştiririz.'],
    ['google', 'Google kurulumu', 'Sitenizin Google bağlantıları kurulur; ziyaretleri ve satışları takip edebilirsiniz.'],
    ['seo', 'SEO', 'Ürünlerinizin Google aramalarında bulunmasını destekleyen çalışmalar yapılır.'],
    ['geo', 'GEO / AI görünürlüğü', 'Marka ve ürün bilgileriniz yapay zekâ aramalarında anlaşılabilecek şekilde düzenlenir.'],
    ['content', 'Metin & dijital tasarım', 'Ürün açıklamaları, site yazıları ve kampanya görselleri hazırlanır.'],
    ['cro', 'Satış deneyimi', 'Müşterinin ürünü bulmasını ve alışverişini tamamlamasını kolaylaştıran düzenlemeler yapılır.'],
    ['integration', 'Entegrasyonlar', 'Mağazanızın pazaryerleri ve kullandığınız diğer sistemlerle bağlantıları değerlendirilir.'],
    ['software', 'Özel yazılım', 'İşinize özel bir uygulama, yönetim ekranı veya otomatik çalışan araç geliştirilir.'],
    ['care', 'Bakım & destek', 'Site açıldıktan sonra güncellemeler ve teknik işler için düzenli destek alırsınız.'],
    ['consult', 'Danışmanlık', 'Nereden başlayacağınızı ve hangi işleri önce yapacağınızı birlikte belirleriz.'],
  ];

  const questions = {
    route: { title: 'Nasıl bir çalışma düşünüyorsunuz?', desc: 'Size uygun sorularla ilerleyelim.', options: [
      ['new', 'Yeni e-ticaret sitesi', 'Henüz sitem yok. Ürünlerimi internetten satabileceğim bir site istiyorum.'],
      ['migration', 'Platform geçişi', 'Sitem var. Ürünlerimi ve mağazamı ikas altyapısına taşımak istiyorum.'],
      ['custom', 'Özel proje', 'Hazır bir sitenin dışında, bana özel bir uygulama veya sistem gerekiyor.'],
      ['service', 'Sadece hizmet', 'Yeni site ya da taşıma istemiyorum, yalnızca ihtiyacım olan hizmeti almak istiyorum. Örneğin ürün fotoğrafı, Google kurulumu, SEO, yapay zekâ aramalarında görünürlük, metin ve tasarım, entegrasyon, bakım ve destek ya da danışmanlık.']] },
    platform: { title: 'Şu anda hangi altyapıyı kullanıyorsunuz?', desc: 'Veri taşıma kapsamını belirlemek için.', options: [
      ['ikas', 'ikas', 'Mağazam zaten ikas altyapısında.'], ['Shopify', 'Shopify', ''], ['WooCommerce', 'WooCommerce', ''], ['Ticimax / IdeaSoft', 'Ticimax / IdeaSoft', ''],
      ['other', 'Başka bir altyapı', 'Görüşmede birlikte değerlendirelim.'], ['unknown', 'Emin değilim', 'Bu bilgiyi daha sonra netleştirebiliriz.']] },
    marketplace: { title: "Pazaryeri yonetimi", desc: "Hangi platformlarda", options: [
      ["no", "Hayir, sadece kendi sitemde", "Yalnizca kendi sitemde satis"],
      ["local2", "Trendyol ve Hepsiburada", "Trendyol, Hepsiburada"],
      ["local5", "Trendyol, Hepsiburada, N11, Amazon, Etsy", "5 onemli pazaryeri"],
      ["advanced", "19 Yurt ici, 7 Yurt disi", "Trendyol, Hepsiburada, N11, Amazon ve Etsy pazaryerleri dahil toplam 26 pazaryeri ile entegre olarak siparislerinizi ve stoklarinizi tek ekrandan yonetebilirsiniz."]] },
    products: { title: "Kac urun satisacaksiniz", desc: "Urun sayisini secin", options: [
      ["1-100", "1-100 urun", "En fazla 100"],
      ["101-500", "101-500 urun", "100den fazla 500e kadar"],
      ["501+", "501+ urun", "500den fazla"],
      ["unknown", "Belli degil", "Bilmiyorum"]] },
    info: { title: 'Ürün bilgileriniz hazır mı?', desc: 'Her ürünün adı, fiyatı ve açıklaması elinizde var mı?', options: [
      ['ready', 'Hazır', 'Ürün adları, fiyatlar ve açıklamalar bir dosyada veya mevcut sitemde hazır.'],
      ['edit', 'Düzenlenmesi gerekiyor', 'Ürün bilgilerim var ama eksikler ve düzeltilmesi gereken yazılar bulunuyor.'],
      ['create', 'Baştan hazırlanmalı', 'Ürünlerim belli ama siteye konulacak isim ve açıklamalar henüz yazılmadı.'],
      ['unknown', 'Emin değilim', 'Elimdeki bilgilerin yeterli olup olmadığını bilmiyorum.']] },
    images: { title: 'Ürün fotoğraflarınız hazır mı?', desc: 'Sitede kullanabileceğiniz, ürünleri net gösteren fotoğraflarınızı düşünün.', options: [
      ['ready', 'Evet, hazır', 'Bütün ürünlerimin fotoğrafları var. Yeni çekim istemiyorum.'],
      ['partial', 'Bazıları hazır', 'Bazı ürünlerin fotoğrafı var, eksik olanlar için çekim istiyorum.'],
      ['shoot', 'Profesyonel çekim istiyorum', 'Fotoğraflarım yok veya mevcut fotoğrafları yenilemek istiyorum.'],
      ['unknown', 'Birlikte değerlendirelim', 'Fotoğraflarım var ama sitede kullanmaya uygun mu bilmiyorum.']] },
    access: { title: 'Mevcut sitenizin yönetim paneline erişiminiz var mı?', desc: 'Yönetici olarak giriş yapıp ürünleri ve ayarları görebiliyor musunuz?', options: [
      ['full', 'Evet, tam erişimim var', 'Yönetim paneline giriş yapabiliyorum, kullanıcı adı ve şifre bende.'],
      ['partial', 'Kısmen var', 'Bir kısmına erişebiliyorum, bazı bilgiler siteyi yapan kişide.'],
      ['none', 'Erişimim yok', 'Siteyi başkası kurdu, panele giriş bilgilerim yok.'],
      ['unknown', 'Emin değilim', 'Panelin olup olmadığını ya da giriş bilgilerini bilmiyorum.']] },
    domain: { title: 'Alan adı ve barındırma (hosting) kimin adına kayıtlı?', desc: 'Sitenizin adresi (örneğin ornek.com) ve sitenin durduğu sunucu kimde?', options: [
      ['mine', 'Benim adıma', 'Alan adı ve barındırma hesabı bende, yönetebiliyorum.'],
      ['other', 'Başkasının adına', 'Siteyi yapan kişi ya da şirket adına kayıtlı.'],
      ['partial', 'Biri bende, biri başkasında', 'Alan adı ve barındırma farklı kişilerde.'],
      ['unknown', 'Bilmiyorum', 'Bu bilgiyi daha sonra araştırabilirim.']] },
    active: { title: 'Siteniz şu anda yayında ve çalışıyor mu?', desc: 'Müşterileriniz bugün sitenizi açıp ürünlerinize bakabiliyor mu?', options: [
      ['selling', 'Yayında, satış yapıyor', 'Site açık ve siparişler alınıyor.'],
      ['live', 'Yayında ama satış yok', 'Site açık ama henüz sipariş almıyor ya da az alıyor.'],
      ['building', 'Henüz yayında değil', 'Site hazırlanıyor ya da yarım kaldı.'],
      ['broken', 'Çalışmıyor ya da sorunlu', 'Site açılmıyor, hata veriyor ya da eski kaldı.']] },
    setup: { title: 'Pazarlama ve ölçümleme kurulumları tam mı?', desc: 'Google (Analytics, Search Console, Tag Manager), Meta (Pixel, dönüşüm takibi), SEO ve ChatGPT gibi yapay zekâ aramalarında görünürlük kurulumlarını düşünün.', options: [
      ['full', 'Evet, hepsi tamam', 'Google, Meta ve SEO kurulumları yapılmış ve çalışıyor.'],
      ['partial', 'Bazıları eksik', 'Bir kısmı kurulu, eksik ya da hatalı olanlar var.'],
      ['none', 'Neredeyse hiçbiri yok', 'Site var ama Google, Meta ve SEO kurulumları yapılmamış.'],
      ['unknown', 'Bilmiyorum', 'Bu kurulumların tam olup olmadığını bilmiyorum.']] },
    market: { title: 'Nerelere satış yapmak istiyorsunuz?', desc: 'Siparişlerinizi hangi ülkelere göndermeyi planlıyorsunuz?', options: [
      ['tr', 'Türkiye', 'Şimdilik yalnızca Türkiye’deki müşterilere satış yapacağım.'],
      ['abroad', 'Yurt dışı', 'Türkiye dışındaki müşterilere satış yapacağım.'],
      ['both', 'Türkiye ve yurt dışı', 'Hem Türkiye’ye hem diğer ülkelere satış yapacağım.'],
      ['unknown', 'Henüz karar vermedim', 'Nerelere satış yapacağıma henüz karar vermedim.']] },
  };

  const steps = () => {
    const r = state.answers.route;
    // Mevcut web sitesi olanlara erişim, yayın ve kurulum durumu da sorulur
    const existing = state.site.has === 'yes' ? ['access', 'domain', 'active', 'setup'] : [];
    if (r === 'service') return ['contact', 'site', 'route', ...existing, 'services', 'result'];
    if (r === 'custom') return ['contact', 'site', 'route', 'brief', ...existing, 'services', 'result'];
    return ['contact', 'site', 'route', ...(r === 'migration' ? ['platform'] : []), ...existing, 'marketplace', 'products', 'info', 'images', 'market', 'result'];
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const bold = (t) => esc(t).replace(/(Google|SEO)/g, '<b>$1</b>');
  const card = (id, title, desc, selected, index, lock) => `<button type="button" class="wz-choice${lock ? ' wz-locked' : ''}" data-value="${esc(id)}" aria-pressed="${selected}" data-i="${index % 4}"${lock ? ' disabled aria-disabled="true"' : ''}><span class="wz-mark" aria-hidden="true">${lock ? '🔒' : selected ? '✓' : ''}</span>${id === 'ikas' ? '<span class="wz-ikas" aria-hidden="true"><i></i>ikas</span>' : ''}<strong>${esc(title)}</strong>${desc ? `<small>${bold(desc)}</small>` : ''}${lock ? `<small class="wz-lock-note">${esc(lock)}</small>` : ''}</button>`;
  // Web sitesi varsa "yeni site", yoksa "platform geçişi" anlamsız: kilitlenir
  const routeLock = (id) => {
    if (id === 'new' && state.site.has === 'yes') return 'Web siteniz olduğu için bu seçenek kapalı. Platform geçişi ya da özel proje seçebilirsiniz.';
    if (id === 'migration' && state.site.has === 'no') return 'Henüz web siteniz olmadığı için bu seçenek kapalı. Yeni e-ticaret sitesini seçebilirsiniz.';
    return '';
  };

  const packageName = () => {
    const a = state.answers;
    if (a.route === 'service') return 'Seçtiğiniz hizmetler';
    if (a.route === 'custom') return 'Custom';
    
    let score = 0;
    if (a.marketplace === 'local2') score += 2;
    if (a.marketplace === 'local5') score += 5;
    if (a.marketplace === 'advanced') score += 7;
    if (a.products === '101-500') score += 3;
    if (a.products === '501+') score += 5;
    if (['both', 'abroad'].includes(a.market)) score += 2;
    if (a.route === 'migration' || ['edit', 'create'].includes(a.info)) score += 3;
    if (a.platform === 'ikas') score += 1;
    
    if (score >= 7) return 'Advanced';
    if (score >= 4) return 'Signature';
    if (score >= 1) return 'Core';
    return 'Core';
  };
  const packageReason = () => {
    const a = state.answers;
    if (a.route === 'service') return 'Yalnızca seçtiğiniz bağımsız hizmetler.';
    if (a.route === 'custom') return 'Standart kurulumun dışında, işletmenize özel bir çalışma.';
    if (packageName() === 'Starter') return 'ikas\'ın ücretsiz temasında minimum özelleştirme ve kurulum.';
    if (packageName() === 'Advanced') return 'Yurt dışı satış hedefiniz için daha kapsamlı mağaza hazırlığı.';
    if (a.route === 'migration') return 'Mevcut mağazanızın taşınması ve yeni yapının hazırlanması.';
    if (packageName() === 'Signature') return 'Mağaza kurulumuna ek olarak ürün bilgileriniz ve katalog yapınız hazırlanacak.';
    return 'Hazır ürün bilgilerinizle, markanıza uygun mağaza kurulumu.';
  };
  // Paketlerin birbirinden farkı: her paket bir alttakinin tamamını içerir, üstüne "+" maddeleri ekler
  const PACKAGES = {
    Starter: { lower: '', note: 'ikas temasında temel kurulum, çalışan bir mağaza.', plus: ['ikas ücretsiz teması kurulumu', 'Ürün yüklemesi ve kategori düzenlemesi', 'Temel özelleştirmeler (renk, yazı)'] },
    Core: { lower: '', note: 'Hazır temayla düzenli bir başlangıç.', plus: ['Tema düzeninin markanıza uyarlanması', 'Ana sayfa ve mağaza kurulumları', 'Ürün ve kategori sayfalarının düzenlenmesi'] },
    Signature: { lower: 'Core', note: 'Markanızı anlatan özel sayfa kurgusu.', plus: ['Markaya özel ana sayfa bölüm kurgusu', 'Daha ayrıntılı ürün anlatımı ve sayfa tasarımı'] },
    Advanced: { lower: 'Signature', note: 'Daha ayrıntılı bir mağaza deneyimi.', plus: ['Farklı ürün grupları için sayfa düzenleri', 'Özel bölümler ve ayrıntılı alışveriş akışları'] },
  };
  // Paketin tüm özellikleri: alt paketlerin maddeleri dahil (Advanced = Core + Signature + Advanced)
  const packageChain = () => { const n = packageName(); return n === 'Advanced' ? ['Core', 'Signature', 'Advanced'] : n === 'Signature' ? ['Core', 'Signature'] : n === 'Core' ? ['Core'] : n === 'Starter' ? ['Starter'] : []; };
  // "Paketin tüm özellikleri" açılır listesi: kademeli, her paket bir alttakini içerir
  const ALL = {
    Starter: ['ikas ücretsiz teması kurulumu', 'Ürün yüklemesi ve kategori düzenlemesi', 'Temel özelleştirmeler (renk, yazı)', 'Ödeme yöntemi kurulumu', 'Temel SEO ayarları', 'Mobil uyumlu tema'],
    Core: ['Tema düzeninin markanıza uyarlanması', 'Ana sayfa ve mağaza kurulumları', 'Ürün ve kategori sayfalarının düzenlenmesi', 'Sınırsız trafik ve web alanı', 'Kampanya ve indirim kurguları', 'Ürün kişiselleştirme: renk, yazı, görsel seçimi', 'Dijital ürün satışı', 'Sosyal hesapla hızlı giriş', 'Otomatik sepet hatırlatma', 'Panelden sipariş oluşturma', 'Blog ve içerik sayfaları', 'E-ticaret ve temel SEO eğitimi'],
    Signature: ['Markaya özel ana sayfa bölüm kurgusu', 'Daha ayrıntılı ürün anlatımı ve sayfa tasarımı', 'Pazaryeri entegrasyonu: Trendyol, Hepsiburada, N11, Amazon, Etsy', 'Sınırsız e-ihracat: ülkeye göre fiyat, döviz ve dil', 'Gelişmiş sepet hatırlatma', 'Cross-sell ve up-sell', 'Paket ürün (bundle) ve asorti satış', 'Bölge bazlı teslimat', 'Ürün yorumları: hatırlatma, cevap verme, görselli yorum', 'Sipariş düzenleme'],
    Advanced: ['Farklı ürün grupları için sayfa düzenleri', 'Özel bölümler ve ayrıntılı alışveriş akışları', '19 yurt içi + 7 yurt dışı pazaryeri entegrasyonu', 'B2B / toptan satış altyapısı', 'ERP entegrasyonları', 'WhatsApp ile sepet hatırlatma', 'Ödeme sayfasında ve sonrasında çapraz satış', 'Özelleştirilmiş arama sonuçları ve eş anlamlı kelimeler', 'Konfigüratör / ürün takımı', 'Mobil uygulama (ücretli)'],
  };
  // Paket merdiveni: üstte bir üst paket, ortada size uygun paket, altta bir alt paket (kaydırılabilir)
  const ORDER = ['Starter', 'Core', 'Signature', 'Advanced'];
  const packTiers = (mid) => {
    const n = packageName(), i = ORDER.indexOf(n);
    if (i < 0) return mid;
    // yakından uzağa: üstte daha kapsamlı paketler, altta daha sade paketler (bir tarafta en fazla iki)
    const upList = ORDER.slice(i + 1), downList = ORDER.slice(0, i).reverse(), PEEK = 46;
    const nu = upList.length, nd = downList.length;
    const tier = (name, side, j) => '<div class="wz-peek ' + side + ' d' + j + '" style="' + (side === 'up' ? 'top:' + (PEEK * (nu - 1 - j)) + 'px;' : 'bottom:' + (PEEK * (nd - 1 - j)) + 'px;') + 'left:' + (14 * (j + 1)) + 'px;right:' + (14 * (j + 1)) + 'px"><b>' + name + '</b></div>';
    return '<div class="wz-stack" style="padding-top:' + (PEEK * nu) + 'px;padding-bottom:' + (PEEK * nd) + 'px">'
      + upList.map((name, j) => tier(name, 'up', j)).join('')
      + '<div class="wz-mid">' + mid + '</div>'
      + downList.map((name, j) => tier(name, 'down', j)).join('')
      + '</div>';
  };
  const packageFeatures = () => {
    const chain = packageChain();
    if (!chain.length) return '';
    const own = packageName(), lower = PACKAGES[own] && PACKAGES[own].lower;
    const mine = new Set(lower ? ALL[own] : []);
    const items = chain.flatMap((k) => ALL[k]);
    const letter = own.charAt(0);
    return '<details class="wz-all"><summary>Paketin tüm özelliklerini göster</summary>'
      + (lower ? '<p class="wz-all-note"><span class="wz-badge">' + letter + '</span> ' + esc(lower) + ' paketinde olmayan, ' + esc(own) + ' paketine özel özellikler</p>' : '')
      + '<ul class="wz-summary wz-allgrid">' + items.map((t) => '<li' + (mine.has(t) ? ' class="wz-own"' : '') + '><span class="wz-li-text">✓ ' + esc(t) + '</span>' + (mine.has(t) ? '<span class="wz-badge" title="' + esc(own) + ' paketine özel">' + letter + '</span>' : '') + '</li>').join('') + '</ul></details>';
  };
  // Bir alt pakete göre kazanımlar: [başlık, açıklama] (altyapı özellikleri, müşteri faydası diliyle)
  const DIFF = {
    Core: [
      ['Markanıza uygun bir mağaza', 'Tema renklerini ve yazı tiplerini markanıza göre özelleştiririz.'],
      ['Profesyonel görünen ürün sayfaları', 'Her ürün ayrıntılı ve çekici şekilde sunulur.'],
      ['Müşteriler kolayca alışveriş yapabilir', 'Basit ve hızlı ödeme süreci.'],
      ['Kampanya yapabilirsiniz', 'İndirimler ve promosyonlar panelden yönetilebilir.'],
      ['Sosyal ağlarda hızlı giriş', 'Müşteriler Facebook ya da Google ile giriş yapabilir.'],
    ],
    Signature: [
      ['Pazaryerlerini tek panelden yönetirsiniz', 'Trendyol, Hepsiburada, N11, Amazon ve Etsy siparişleri ve stokları tek ekranda.'],
      ['Yurt dışına satış yapabilirsiniz', 'Ülkeye göre fiyat, döviz ve dil. Sınırsız e-ihracat.'],
      ['Sepet başına daha çok satarsınız', 'Cross-sell, up-sell ve paket ürün kurguları.'],
      ['Terk edilen sepetleri geri kazanırsınız', 'Gelişmiş sepet hatırlatma.'],
      ['Destek telefonla da yanınızda', 'Telefon, e-posta ve ticket desteği (7/24).'],
    ],
    Advanced: [
      ['Tüm pazaryerleri tek yerden', '19 yurt içi + 7 yurt dışı pazaryeri. Siparişler ve stoklar tek ekranda, elle giriş yok.'],
      ['Bayilerinize toptan satış yaparsınız', 'B2B / toptan satış altyapısı, bayiye özel fiyatlar.'],
      ['Muhasebe ve ERP kendiliğinden bağlanır', 'Sipariş ve stok bilgisini ikinci kez girmezsiniz.'],
      ['WhatsApp ile sepet hatırlatma', 'Alışverişi yarım bırakan müşteriye WhatsApp üzerinden ulaşırsınız.'],
      ['Kendi mobil uygulamanız olur (ücretli)', 'Mağazanız telefonlarda uygulama olarak.'],
      ['Ödeme sayfasında ek ürün satarsınız', 'Ödeme sırasında ve sonrasında çapraz satış, sepet ortalamanız artar.'],
      ['Müşteri aradığını bulur', 'Özelleştirilmiş arama sonuçları ve eş anlamlı kelimeler.'],
    ],
  };
  const packageDiff = () => {
    const n = packageName(), p = PACKAGES[n], rows = DIFF[n];
    if (!p || !p.lower || !rows) return '';
    return '<div class="wz-diff"><h3 class="wz-diff-title">' + esc(n) + '’ın ' + esc(p.lower) + '’' + (p.lower === 'Core' ? 'a' : 'a') + ' göre avantajları</h3>'
      + '<div class="wz-gain">' + rows.map((r) => '<div class="wz-gain-card"><span class="wz-gain-tag">+ Kazanç</span><strong>' + esc(r[0]) + '</strong><p>' + esc(r[1]) + '</p></div>').join('') + '</div></div>';
  };

  const base = () => {
    const a = state.answers; let b = [];
    if (['new', 'migration'].includes(a.route)) {
      b = ['Markanıza uygun web tasarımı ve mobil alışveriş deneyimi', 'Ana sayfa, ürün ve kategori sayfalarının hazırlanması', 'Mağaza kurulumu, kontroller ve yayına alma', 'Ödeme, kargo ve temel SEO ayarları'];
      if (a.products) b.push('Tahmini katalog: ' + (a.products === 'unknown' ? 'henüz belli değil' : a.products + ' ürün'));
      if (a.info === 'ready') b.push('Hazır ürün verilerinin kontrolü ve aktarımı');
      if (a.info === 'edit') b.push('Ürün bilgilerinin ve kategori yapısının düzenlenmesi');
      if (a.info === 'create') b.push('Ürün içeriklerinin ve katalog yapısının hazırlanması');
      if (a.info === 'unknown') b.push('Ürün verilerinin görüşmede incelenmesi');
      if (a.route === 'migration') b.push('Platform geçişi, veri ve URL taşıma planı');
      if (['both', 'abroad'].includes(a.market)) b.push('Hedef pazara göre dil ve e-ihracat yapısının değerlendirilmesi');
    }
    if (a.route === 'custom') b = ['Özel proje ihtiyaç analizi', a.brief || 'Proje kapsamı ilk görüşmede netleştirilecek.'];
    return b;
  };
  const suggested = () => {
    const a = state.answers; const ids = [];
    if (['partial', 'shoot'].includes(a.images)) ids.push('photo');
    if (['new', 'migration'].includes(a.route)) ids.push('google');
    if (['both', 'abroad'].includes(a.market)) ids.push('integration');
    return ids;
  };
  const recommendationReason = (id) => {
    const a = state.answers;
    const reasons = { photo: (a.images === 'partial' ? 'Bazı ürünlerinizin fotoğrafı eksik.' : 'Yeni ürün fotoğrafları istediğinizi belirttiniz.') + ' Hangi ürünlerin, nasıl çekileceğini sizinle konuşarak netleştiririz.', google: 'Yeni mağazanızın ziyaretlerini ve satışlarını ölçebilmek için öneriyoruz.', integration: 'Yurt dışı satış hedefiniz için dil ve sistem ihtiyaçlarını birlikte değerlendirelim.' };
    return suggested().includes(id) ? reasons[id] : '';
  };
  const only = () => ['service', 'custom'].includes(state.answers.route);
  const selectedServices = () => serviceList.filter((s) => (only() ? state.services : state.extras).has(s[0]));

  const resultServiceCards = () => {
    const selected = new Set(selectedServices().map((s) => s[0]));
    const recommended = suggested().filter((id) => !selected.has(id));
    const available = serviceList.filter((s) => !selected.has(s[0]));
    const main = available.filter((s) => recommended.includes(s[0]));
    const other = available.filter((s) => !recommended.includes(s[0]));
    const all = [...main, ...other];
    return all.length ? '<div class="wz-reco"><div class="wz-reco-top"><h3 class="wz-reco-title">Cevaplarınıza uygun ek öneriler</h3><button type="button" class="wz-btn primary" data-addall>Hepsini ekle +</button></div><p class="wz-reco-lead">Pakete dahil olmayan tüm hizmetlerimiz burada. Size uygun olanlar başta.</p><div class="wz-grid">' + all.map((o) => card(o[0], o[1], recommended.includes(o[0]) ? recommendationReason(o[0]) : o[2], false, serviceList.indexOf(o))).join('') + '</div><div class="wz-reco-bottom"><button type="button" class="wz-btn primary" data-addall>Hepsini ekle +</button></div></div>' : '';
  };

  const siteLine = () => {
    const st = state.site;
    if (!st.has) return '';
    return 'Mevcut web sitesi: ' + (st.has === 'yes' ? (st.url.trim() || 'var (adres yazılmadı)') + (st.brand ? ' — marka: ' + st.brand : '') + (st.ok ? ' (site açılıyor)' : '') : 'yok') + String.fromCharCode(10);
  };
  // Sonuç sayfası: işaretlenen tüm cevaplar, soruda göründükleri renkte kutucuk olarak
  const answerChips = () => {
    const a = state.answers, st = state.site;
    const names = { route: 'Başlangıç', platform: 'Mevcut altyapı', products: 'Ürün sayısı', info: 'Ürün bilgileri', images: 'Fotoğraflar', market: 'Satış bölgesi', access: 'Panel erişimi', domain: 'Alan adı', active: 'Site durumu', setup: 'Kurulumlar' };
    const chips = [];
    if (st.has) chips.push(['Web sitesi', st.has === 'yes' ? 'Var' + (st.url ? ': ' + st.url : '') : 'Yok', st.has === 'yes' ? 0 : 1]);
    Object.keys(names).forEach((k) => {
      if (!a[k] || !questions[k]) return;
      const i = questions[k].options.findIndex((o) => o[0] === a[k]);
      chips.push([names[k], i >= 0 ? questions[k].options[i][1] : a[k], i >= 0 ? i : 0, k]);
    });
    if (a.brief) chips.push(['Proje notu', a.brief.length > 80 ? a.brief.slice(0, 80) + '…' : a.brief, 2]);
    const good = { info: ['ready'], images: ['ready'], access: ['full'], domain: ['mine'], active: ['selling'], setup: ['full'] };
    const tag = (c) => '<span class="wz-chip" data-i="' + (c[2] % 4) + '"><small>' + esc(c[0]) + '</small><b>' + esc(c[1]) + '</b></span>';
    const kind = (c) => { const k = c[3]; if (!good[k]) return 'n'; return good[k].includes(a[k]) ? 'p' : 'm'; };
    const note = chips.filter((c) => c[0] === 'Proje notu');
    const n = chips.filter((c) => kind(c) === 'n' && c[0] !== 'Proje notu'), p = chips.filter((c) => kind(c) === 'p'), m = chips.filter((c) => kind(c) === 'm');
    if (!chips.length) return '';
    return '<h3 class="wz-sub">Cevaplarınız</h3>'
      + (p.length || m.length ? '<div class="wz-pm"><div class="wz-pm-col wz-pm-plus"><h4>Artılarınız <b>+</b></h4><div class="wz-chips">' + (p.map(tag).join('') || '<p class="wz-pm-empty">Henüz yok.</p>') + '</div></div><div class="wz-pm-col wz-pm-minus"><h4>Eksikleriniz <b>−</b></h4>' + (m.length ? '<span class="wz-hang" aria-hidden="true"><i></i><b>Merak etmeyin, biz halledeceğiz</b></span>' : '') + '<div class="wz-chips">' + (m.map(tag).join('') || '<p class="wz-pm-empty">Eksik görünmüyor.</p>') + '</div></div></div>' : '')
      + (n.length ? '<div class="wz-basic"><h4>E-ticaret bilgileriniz</h4><div class="wz-chips">' + n.map(tag).join('') + '</div></div>' : '')
      + (note.length ? '<div class="wz-basic wz-note"><h4>Proje notu</h4><p>' + esc(state.answers.brief || '') + '</p></div>' : '');
  };
  const summaryText = () => {
    const a = state.answers;
    return 'THE GOATZ STUDIO — PROJE ÖZETİ\n\n' + (a.route === 'service' ? 'Bağımsız hizmetler' : 'Önerilen paket: ' + packageName()) + '\n\n'
      + base().map((s) => '• ' + s).join('\n') + '\n\nSEÇİLEN HİZMETLER\n' + (selectedServices().map((s) => '• ' + s[1]).join('\n') || '—') + '\n\nCEVAPLAR\n' + siteLine()
      + Object.entries(a).filter(([k]) => questions[k]).map(([k, v]) => questions[k].title + ' → ' + (questions[k].options.find((o) => o[0] === v) || ['', v])[1]).join('\n')
      + (a.brief ? '\n\nProje notu: ' + a.brief : '') + '\n\nÖn kapsamdır. Fiyatlar ve nihai kapsam görüşmede belirlenir.';
  };

  const contactForm = () => `<h2 tabindex="-1">Önce sizi tanıyalım.</h2><p class="wz-lead">Teklifinizi size ulaştırabilmemiz için iletişim bilgilerinizi alalım. Sonraki sorular birkaç dakika sürer.</p>
    <div class="wz-form">
      <label><span>Adınız soyadınız</span><input name="name" autocomplete="name" required maxlength="120" value="${esc(state.contact.name)}"></label>
      <label><span>E-posta</span><input name="email" type="email" autocomplete="email" required maxlength="160" value="${esc(state.contact.email)}"></label>
      <label><span>Telefon (isteğe bağlı)</span><input name="phone" type="tel" autocomplete="tel" maxlength="40" value="${esc(state.contact.phone)}"></label>
      <input class="wz-hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
      <label class="wz-consent"><input type="checkbox" name="consent" ${state.contact.consent ? 'checked' : ''}><span>${KVKK ? `<a href="${esc(KVKK)}" target="_blank" rel="noopener">KVKK Aydınlatma Metni</a>’ni` : 'KVKK Aydınlatma Metni’ni'} okudum; bilgilerimin teklif hazırlamak ve talebim konusunda benimle iletişime geçmek amacıyla işlenmesini kabul ediyorum.</span></label>
      <label class="wz-consent"><input type="checkbox" name="marketing" ${state.contact.marketing ? 'checked' : ''}><span>(İsteğe bağlı) Kampanya, duyuru ve yeni hizmetlerle ilgili e-posta almak istiyorum. Dilediğim zaman vazgeçebilirim.</span></label>
    </div>`;

  const leadMessage = (complete) => {
    const c = state.contact;
    const NL = String.fromCharCode(10);
    const head = (complete ? 'TEKLİF TALEBİ (proje oluşturucu)' : 'YARIM KALAN TEKLİF (sihirbaz başlatıldı, henüz tamamlanmadı)') + NL + 'Ticari elektronik ileti onayı: ' + (c.marketing ? 'EVET (kutu önceden işaretli geliyordu, kişi kaldırmadı)' : 'hayır (kişi kutuyu kaldırdı)');
    return (complete ? head + NL + NL + summaryText() : head).slice(0, 3900);
  };
  const post = (complete) => fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: state.contact.name.trim(), email: state.contact.email.trim(), phone: state.contact.phone.trim(), website: state.contact.website, message: leadMessage(complete) }) });

  const sendBox = () => `<div class="wz-send"><h3 class="wz-send-title">Teklif talebinizi gönderin</h3><p class="wz-lead">Bu özeti bize gönderirseniz <b>${esc(state.contact.name)}</b> adına hazırlayıp <b>${esc(state.contact.email)}</b> adresine dönüş yapalım. İlk görüşme ücretsizdir.</p>
    <button class="wz-btn primary" id="wz-send" type="button"${state.sent ? ' disabled' : ''}>${state.sent ? 'Gönderildi ✓' : 'Teklif talebini gönder ↗'}</button>
    <p class="wz-form-status${state.sent ? ' ok' : ''}" id="wz-send-status" role="status" aria-live="polite">${state.sent ? 'Teşekkürler! Teklif talebiniz bize ulaştı, en kısa sürede dönüş yapacağız.' : ''}</p></div>`;

  function render() {
    const seq = steps();
    if (state.step >= seq.length) state.step = seq.length - 1;
    const key = seq[state.step], result = key === 'result';
    el.stage.textContent = key === 'contact' ? 'Sizi tanıyalım' : key === 'site' ? 'Mevcut siteniz' : key === 'route' ? 'Başlangıç' : result ? 'Proje özeti' : 'İhtiyaçlarınız';
    el.count.textContent = `${state.step + 1} / ${seq.length}`;
    const pct = Math.round(((state.step + 1) / seq.length) * 100);
    el.fill.style.width = pct + '%';
    el.track.setAttribute('aria-valuenow', pct);
    el.back.disabled = state.step === 0;
    el.next.hidden = result;
    el.hint.textContent = result ? 'Özetiniz siz göndermeden bize iletilmez.' : 'Seçiminizi daha sonra değiştirebilirsiniz.';
    let html = '';
    if (key === 'site') {
      const st = state.site;
      html = '<h2 tabindex="-1">Şu anda bir web siteniz var mı?</h2><p class="wz-lead">Varsa adresini yazın, sitenize bakıp size daha doğru bir öneri hazırlayalım.</p><div class="wz-grid">'
        + card('yes', 'Evet, web sitem var', 'Mevcut bir sitem var. Adresini aşağıya yazacağım.', st.has === 'yes', 0)
        + card('no', 'Hayır, henüz yok', 'Henüz bir web sitem yok.', st.has === 'no', 1) + '</div>'
        + (st.has === 'yes' ? '<div class="wz-form wz-site"><label><span>Web sitenizin adresi</span><span class="wz-urlbox"><i>www.</i><input name="siteurl" type="text" inputmode="url" autocomplete="url" maxlength="200" placeholder="ornek.com" value="' + esc(st.url) + '"></span></label><p class="wz-site-status ' + (st.msg ? (st.ok ? 'ok' : 'err') : '') + '" aria-live="polite">' + esc(st.msg || '') + '</p></div>' : '');
      el.next.disabled = !st.has || (st.has === 'yes' && !st.ok);
    }
    if (key === 'contact') {
      html = contactForm();
      el.next.disabled = !contactOk();
    }
    if (questions[key]) {
      const qn = questions[key];
      if (key === 'route' && state.answers.route && routeLock(state.answers.route)) { state.answers = {}; state.services.clear(); state.extras.clear(); }
      html = `<h2 tabindex="-1">${qn.title}</h2><p class="wz-lead">${qn.desc}</p><div class="wz-grid">${qn.options.map((o, i) => card(o[0], o[1], o[2], state.answers[key] === o[0], i, key === 'route' ? routeLock(o[0]) : '')).join('')}</div>`;
      el.next.disabled = !state.answers[key];
    }
    if (key === 'brief') {
      html = '<h2 tabindex="-1">Aklınızdaki projeyi anlatın.</h2><p class="wz-lead">Ne yapmak istiyorsunuz? Kısa bir açıklama yeterli. Henüz net değilse boş bırakabilirsiniz.</p><label class="wz-sr" for="wz-brief">Proje açıklaması</label><textarea id="wz-brief" maxlength="1200" placeholder="Örneğin: Bayilerimin sipariş verebildiği özel bir sistem istiyorum.">' + esc(state.answers.brief || '') + '</textarea>';
      el.next.disabled = false;
    }
    if (key === 'services') {
      html = '<h2 tabindex="-1">Hangi konularda destek istiyorsunuz?</h2><p class="wz-lead">İhtiyacınız olan kartları seçin. Birden fazla seçebilirsiniz. Emin değilseniz Danışmanlık seçeneğiyle başlayın.</p><div class="wz-grid">' + serviceList.map((o, i) => card(o[0], o[1], o[2], state.services.has(o[0]), i)).join('') + '</div>';
      el.next.disabled = state.services.size === 0;
    }
    if (result) {
      const b = base();
      html = `<h2 tabindex="-1">Size uygun paket ve hizmetler.</h2><p class="wz-lead">Cevaplarınıza göre hazırladığımız ilk kapsam. Ek hizmetleri ayrı ayrı ekleyip çıkarabilirsiniz.</p>
        ${packTiers(`<div class="wz-pack"><div><small>SİZE UYGUN PAKET</small><h3>${packageName()}</h3><p>${esc(packageReason())}</p></div><span class="wz-pill">Sizin için en uygun</span></div>`)}
        ${answerChips()}
        <h3 class="wz-sub">Sizin için yapacaklarımız</h3>${b.length ? '<ul class="wz-summary wz-todo">' + b.map((s) => '<li>✓ ' + esc(s) + '</li>').join('') + '</ul>' : '<p class="wz-lead">Yeni web sitesi kurulumu eklenmedi. Seçtiğiniz hizmetler aşağıda.</p>'}
        ${packageDiff()}
        ${packageFeatures()}
        <div class="wz-sel"><div class="wz-sel-top" id="wz-sel-top"></div><h3 class="wz-sel-title">Seçtiğiniz bağımsız hizmetler</h3><div id="wz-selection"></div></div>${resultServiceCards()}
        <p class="wz-notice">Paket önerisi ilk görüşmede doğrulanır. Fiyatlar ve nihai kapsam görüşmede belirlenir.</p>
        ${sendBox()}
        <div class="wz-actions"><button class="wz-btn" id="wz-download" type="button">Özeti indir ↓</button><button class="wz-btn" id="wz-copy" type="button">Özeti kopyala</button><button class="wz-btn" id="wz-restart" type="button">Yeniden başla</button></div><div class="wz-status" role="status" id="wz-status"></div>`;
    }
    el.screen.innerHTML = '<div class="wz-scene' + (state.keep ? ' wz-keep' : '') + '">' + html + '</div>';
    if (result) timer.finish();

    el.screen.querySelectorAll('[data-value]').forEach((btn) => btn.addEventListener('click', () => {
      const v = btn.dataset.value;
      if (result || key === 'services') {
        const set = result && !only() ? state.extras : state.services;
        set.has(v) ? set.delete(v) : set.add(v);
        btn.setAttribute('aria-pressed', set.has(v));
        btn.querySelector('.wz-mark').textContent = set.has(v) ? '✓' : '';
        if (key === 'services') el.next.disabled = state.services.size === 0;
        if (result) {
          const r0 = btn.getBoundingClientRect(), y0 = window.scrollY;
          softRender();
          const it = set.has(v) ? el.screen.querySelector('.wz-item[data-id="' + v + '"]') : null;
          if (it && it.animate && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
            const dy = r0.top - it.getBoundingClientRect().top;
            it.style.position = 'relative'; it.style.zIndex = '5';
            it.animate([{ transform: 'translateY(' + dy + 'px)', opacity: .5 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 600, easing: 'cubic-bezier(.2,.8,.2,1)' });
          }
        }
      } else {
        if (key === 'site') { state.site.has = v; state.site.ok = ''; state.site.brand = ''; state.site.msg = ''; if (v === 'no') state.site.url = ''; render(); return; }
        if (key === 'route' && state.answers.route !== v) { state.answers = { route: v }; state.services.clear(); state.extras.clear(); } else state.answers[key] = v;
        render();
      }
    }));
    if (key === 'contact') {
      const fm = el.screen.querySelector('.wz-form');
      const f = (n) => fm.querySelector('[name="' + n + '"]');
      fm.addEventListener('input', () => { timer.start(); state.contact.name = f('name').value; state.contact.email = f('email').value; state.contact.phone = f('phone').value; state.contact.website = f('website').value; state.contact.consent = f('consent').checked; state.contact.marketing = f('marketing').checked; el.next.disabled = !contactOk(); });
    }
    if (key === 'site') { const u = el.screen.querySelector('[name="siteurl"]'); if (u) u.addEventListener('blur', () => { const st = state.site; if (st.has === 'yes' && st.url.trim() && !st.ok) checkSite(); }); if (u) u.addEventListener('input', () => { const st = state.site; u.value = u.value.replace(/^\s*(https?:\/\/)?(www\.)?/i, ''); st.url = u.value; st.ok = ''; st.brand = ''; st.msg = ''; el.next.disabled = true; clearTimeout(st.deb); if (st.url.trim().length > 3) st.deb = setTimeout(checkSite, 900); const p = el.screen.querySelector('.wz-site-status'); if (p) { p.textContent = ''; p.className = 'wz-site-status'; } }); }
    if (key === 'brief') q('#wz-brief').addEventListener('input', (e) => { state.answers.brief = e.target.value; });

    if (result) {
      updateSelection();
      el.screen.querySelectorAll('[data-addall]').forEach((b) => b.addEventListener('click', () => {
        const set = only() ? state.services : state.extras;
        el.screen.querySelectorAll('.wz-reco [data-value]').forEach((c) => set.add(c.dataset.value));
        softRender();
      }));
      q('#wz-download').onclick = () => {
        const blob = new Blob([summaryText()], { type: 'text/plain;charset=utf-8' }), url = URL.createObjectURL(blob), a = document.createElement('a');
        a.href = url; a.download = 'the-goatz-proje-ozeti.txt'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
        q('#wz-status').textContent = 'Proje özetiniz indirildi.';
      };
      q('#wz-copy').onclick = async () => {
        try { await navigator.clipboard.writeText(summaryText()); q('#wz-status').textContent = 'Proje özeti kopyalandı.'; } catch (e) { q('#wz-status').textContent = 'Kopyalama bu tarayıcıda kullanılamıyor. Özeti indirebilirsiniz.'; }
      };
      q('#wz-restart').onclick = () => { timer.reset(); state.step = 2; state.sent = false; state.answers = {}; state.services.clear(); state.extras.clear(); render(); };
      const sendBtn = q('#wz-send'), status = q('#wz-send-status');
      sendBtn.addEventListener('click', async () => {
        const c = state.contact;
        status.className = 'wz-form-status'; sendBtn.disabled = true; status.textContent = 'Gönderiliyor…';
        try {
          const res = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: c.name.trim(), email: c.email.trim(), phone: c.phone.trim(), website: c.website, message: leadMessage(true) }) });
          const j = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(j.error || 'Gönderilemedi, lütfen tekrar deneyin.');
          state.sent = true; sendBtn.textContent = 'Gönderildi ✓'; status.textContent = 'Teşekkürler! Teklif talebiniz bize ulaştı, en kısa sürede dönüş yapacağız.'; status.classList.add('ok');
        } catch (err) { sendBtn.disabled = false; status.textContent = err.message; status.classList.add('err'); }
      });
    }
  }
  // Sayfa yeniden çizilirken kaydırma yeri korunur (tıklayınca en alta atmasın)
  function softRender() {
    const y = window.scrollY;
    const put = () => { if (Math.abs(window.scrollY - y) > 1) { if (window.__lenis && window.__lenis.scrollTo) window.__lenis.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y); } };
    state.keep = true; render(); state.keep = false;
    put(); requestAnimationFrame(put); setTimeout(put, 60); setTimeout(put, 250);
  }
  function updateSelection() {
    const services = selectedServices();
    const box = q('#wz-selection');
    box.innerHTML = services.length
      ? '<div class="wz-selected">' + services.map((s) => '<div class="wz-item" data-id="' + s[0] + '" data-i="' + (serviceList.indexOf(s) % 4) + '"><div><strong>' + esc(s[1]) + '</strong><p>' + bold(s[2]) + '</p></div><button type="button" class="wz-btn" data-remove="' + s[0] + '" aria-label="' + esc(s[1]) + ' hizmetini çıkar">Çıkar</button></div>').join('') + '</div>'
      : '<div class="wz-empty">Henüz bağımsız hizmet eklemediniz. Web sitenizin temel kapsamı yukarıda yer alıyor.</div>';
    const top = q('#wz-sel-top');
    top.innerHTML = services.length ? '<button type="button" class="wz-btn" data-removeall>Hepsini çıkar ✕</button>' : '';
    const ra = top.querySelector('[data-removeall]');
    if (ra) ra.onclick = () => { (only() ? state.services : state.extras).clear(); softRender(); };
    box.querySelectorAll('[data-remove]').forEach((btn) => { btn.onclick = () => { (only() ? state.services : state.extras).delete(btn.dataset.remove); softRender(); }; });
  }
  const focusH2 = () => { const h = el.screen.querySelector('h2'); if (h) h.focus(); };
  const checkSite = () => { const st = state.site; if (!st.pending) st.pending = runCheck().finally(() => { st.pending = null; }); return st.pending; };
  const runCheck = async () => {
    const st = state.site; const asked = st.url; st.busy = true; st.msg = '';
    const p = el.screen.querySelector('.wz-site-status'); if (p) { p.className = 'wz-site-status'; p.textContent = 'Kontrol ediliyor…'; }
    let r;
    try { r = await (await fetch('/api/check-site', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: 'www.' + st.url.trim() }) })).json(); }
    catch (e) { r = { ok: false, message: 'Kontrol yapılamadı, bağlantınızı kontrol edip tekrar deneyin.' }; }
    st.busy = false;
    if (st.url !== asked) return;
    if (r.ok) { st.ok = r.finalUrl; st.host = r.host; st.brand = r.brand || ''; st.url = r.host; st.msg = 'Site açılıyor ✓' + (st.brand ? '  Marka adı: ' + st.brand : ''); }
    else st.msg = r.message || 'Site doğrulanamadı.';
    if (p) { p.className = 'wz-site-status ' + (r.ok ? 'ok' : 'err'); p.textContent = st.msg; const i = el.screen.querySelector('[name="siteurl"]'); if (i && r.ok) i.value = st.url; }
    if (steps()[state.step] === 'site') el.next.disabled = !r.ok;
  };
  el.next.onclick = async () => { if (steps()[state.step] === 'site' && state.site.has === 'yes' && !state.site.ok) { await checkSite(); if (!state.site.ok) return; } if (steps()[state.step] === 'contact' && !state.leadSent) { state.leadSent = true; post(false).catch(() => { state.leadSent = false; }); } state.step++; render(); focusH2(); };
  el.back.onclick = () => { state.step--; render(); focusH2(); };
  render();
})();

// Başlık ve alt yazı tamamen ekrana geldikten 2 sn sonra yavaşça forma iner (kullanıcı kendi kaydırırsa ya da dokunursa vazgeçer).
// Kaydırma kütüphanesinin seçeneklerine bağlı değildir: kendi yumuşak hareketini kare kare uygular.
(() => {
  const target = document.querySelector('[data-wizard]');
  if (!target) return;
  const log = (m) => { try { console.info('[teklif] ' + m); } catch (e) {} };
  if (location.hash) { log('adreste # var, otomatik inme kapalı'); return; }
  let cancelled = false;
  const stop = (e) => { if (!cancelled) log('kullanıcı ' + e.type + ' yaptı, otomatik inme iptal'); cancelled = true; };
  ['wheel', 'touchstart', 'keydown'].forEach((ev) => window.addEventListener(ev, stop, { once: true, passive: true }));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const setY = (y) => { if (window.__lenis && window.__lenis.scrollTo) window.__lenis.scrollTo(y, { immediate: true, force: true }); else window.scrollTo(0, y); };
  const go = () => {
    if (cancelled) return;
    const to = Math.max(0, Math.round(target.getBoundingClientRect().top + window.scrollY - 90));
    const from = window.scrollY;
    log('iniş başlıyor: ' + Math.round(from) + ' → ' + to + (reduced ? ' (animasyonsuz)' : ''));
    if (Math.abs(to - from) < 40) { log('zaten orada'); return; }
    if (reduced) { setY(to); return; }
    const DUR = 3000, t0 = performance.now();
    const timer = setInterval(() => {
      if (cancelled) { clearInterval(timer); return; }
      const p = Math.min(1, (performance.now() - t0) / DUR), e = 1 - Math.pow(1 - p, 3);
      setY(from + (to - from) * e);
      if (p >= 1) { clearInterval(timer); log('iniş bitti'); }
    }, 16);
  };
  // Yazıların tamamen ekrana gelmesi: hero içindeki bitmeyen (süzülme gibi sonsuz) animasyonlar hariç tüm giriş animasyonları bitmiş olmalı
  const hero = document.querySelector('.page-hero') || document.body;
  const sub = hero.querySelector('[data-sub]'), h1 = hero.querySelector('h1');
  const t0 = Date.now();
  const visible = (el) => !el || parseFloat(getComputedStyle(el).opacity) > 0.95;
  const running = () => (hero.getAnimations ? hero.getAnimations({ subtree: true }) : []).filter((an) => {
    let t; try { t = an.effect && an.effect.getComputedTiming(); } catch (e) { return false; }
    return t && t.iterations !== Infinity && (an.playState === 'running' || an.playState === 'pending');
  }).length;
  let quiet = 0;
  const wait = setInterval(() => {
    const ready = h1 && h1.classList.contains('ready') && visible(h1) && visible(sub);
    quiet = ready ? quiet + 1 : 0;
    if (quiet >= 2 || Date.now() - t0 > 6000) { clearInterval(wait); log((quiet >= 2 ? 'yazılar tamamen geldi' : 'zaman aşımı') + ' (' + (Date.now() - t0) + ' ms), 2 sn sonra inecek'); setTimeout(go, 2000); }
  }, 150);
  log('otomatik inme hazır, yazıların bitmesi bekleniyor');
})();
