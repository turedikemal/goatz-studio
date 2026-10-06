// Panel ana sayfası (Dashboard): satış özeti, yapılacaklar, son siparişler, gelen talepler.
// Yalnız sunucunun gerçekten tuttuğu veri gösterilir (GET /api/dashboard); olmayan veri için boş durum yazılır.
window.GoatzDashboard = (ctx) => {
  const { h, request, goto, sales, commerce } = ctx;
  const { money } = commerce.ui;

  const PERIODS = [['today', 'Bugün'], ['7', 'Son 7 gün'], ['30', 'Son 30 gün']];
  const PREV = { today: 'Dün', 7: 'Önceki 7 gün', 30: 'Önceki 30 gün' };
  const STATUS = { received: 'Sipariş alındı', preparing: 'Hazırlanıyor', ready: 'Kargoya hazır', shipped: 'Gönderildi', delivered: 'Teslim edildi', cancelled: 'İptal edildi', returned: 'İade edildi' };
  const PAY = { pending: 'Bekliyor', paid: 'Ödendi', partial: 'Kısmi ödeme', refunded: 'İade edildi', failed: 'Başarısız' };
  const CHANNEL = { manual: 'Manuel', web: 'Web mağaza', trendyol: 'Trendyol', hepsiburada: 'Hepsiburada', instagram: 'Instagram', whatsapp: 'WhatsApp' };
  const KIND = { teklif: 'Teklif talebi', fiyat: 'Fiyat talebi', yarim: 'Yarım kalan teklif', mesaj: 'İletişim formu' };
  const GA_URL = 'https://analytics.google.com/analytics/web/';

  const S = { period: (() => { try { return localStorage.getItem('goatz-dash-donem') || '7'; } catch { return '7'; } })(), data: null, loading: false, error: null, box: null };
  const num = (n) => Number(n || 0).toLocaleString('tr-TR');
  const when = (d) => {
    const t = new Date(d), now = new Date();
    const time = t.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    if (t.toDateString() === now.toDateString()) return `Bugün ${time}`;
    if (t.toDateString() === new Date(now.getTime() - 864e5).toDateString()) return `Dün ${time}`;
    return t.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }) + ` ${time}`;
  };
  const pill = (cls, label) => h('span', { class: `pill s-${cls}` }, label);
  const head = (title, link) => h('div', { class: 'db-head' }, h('h3', {}, title), link || null);
  const more = (label, fn) => h('button', { type: 'button', class: 'db-more', onclick: fn }, label);

  async function load() {
    S.loading = true; S.error = null; paint();
    try { S.data = await request(`/api/dashboard?period=${S.period}`); }
    catch (e) { S.error = e.message; }
    S.loading = false; paint();
  }

  // ----- Özet şeridi -----
  function stats(d) {
    const o = d.orders, m = d.messages;
    const leads = m.kinds.teklif + m.kinds.fiyat + m.kinds.mesaj;
    const noDb = !o ? (d.db ? (d.ordersError || 'Sipariş verisi okunamadı.') : 'Veritabanı bağlı değil') : null;
    const cell = (label, value, sub) => h('div', { class: 'db-stat' }, h('span', { class: 'db-label' }, label), h('b', { class: 'db-num' }, value), h('span', { class: 'db-sub' }, sub));
    const prev = PREV[d.period];
    return h('div', { class: 'card db-stats' },
      cell('Satış', o ? money(o.revenue) : '—', o ? `${prev}: ${money(o.prevRevenue)}` : noDb),
      cell('Sipariş', o ? num(o.count) : '—', o ? `${prev}: ${num(o.prevCount)}${o.cancelled ? ` · ${num(o.cancelled)} iptal/iade sayılmadı` : ''}` : noDb),
      cell('Ortalama sepet', o && o.count ? money(o.revenue / o.count) : '—', o ? (o.prevCount ? `${prev}: ${money(o.prevRevenue / o.prevCount)}` : `${prev}: —`) : noDb),
      cell('Gelen talep', num(leads), `${prev}: ${num(m.prevLeads)}${m.kinds.yarim ? ` · ${num(m.kinds.yarim)} yarım kalan sayılmadı` : ''}`));
  }

  // ----- Yapılacaklar: her satır ilgili listeye götürür -----
  function todo(d) {
    const o = d.orders, m = d.messages;
    const row = (label, n, fn, hint) => h('button', { type: 'button', class: `db-todo${n ? ' on' : ''}`, onclick: fn, disabled: fn ? null : true },
      h('span', { class: 'db-todo-l' }, label, hint ? h('small', {}, hint) : null), h('b', { class: 'db-count' }, num(n)), h('i', { class: 'chev', 'aria-hidden': 'true' }));
    const rows = [row('Okunmamış mesaj', m.unread, () => goto('mesajlar'))];
    if (o) {
      rows.push(
        row('Onay bekleyen sipariş', o.todo.received, () => sales.ordersWith({ status: 'received' }), 'Sipariş alındı'),
        row('Hazırlanan sipariş', o.todo.preparing, () => sales.ordersWith({ status: 'preparing' })),
        row('Kargoya verilecek', o.todo.ready, () => sales.ordersWith({ status: 'ready' }), 'Kargoya hazır'),
        row('Ödemesi tamamlanmamış', o.todo.unpaid, () => sales.ordersWith({ payment: 'pending,partial,failed', status: 'received,preparing,ready,shipped,delivered' })),
        o.todo.returns ? row('Açık iade talebi', o.todo.returns, null, 'Sipariş ayrıntısından yönetilir') : null,
        row('Stokta kalmayan varyant', o.stockOut.length, () => goto('stok'), o.stockOut.length ? o.stockOut.slice(0, 2).map((x) => x.variant_name ? `${x.product_name} · ${x.variant_name}` : x.product_name).join(', ') + (o.stockOut.length > 2 ? '…' : '') : 'Aktif ürünlerde'));
    }
    return h('div', { class: 'card db-card' }, head('Yapılacaklar'), h('div', { class: 'db-todos' }, ...rows),
      !o ? h('p', { class: 'muted db-note' }, 'Sipariş ve stok satırları veritabanı bağlanınca görünür.') : null);
  }

  // ----- Gelen talepler (form, sihirbaz, sepet) -----
  function leads(d) {
    const m = d.messages;
    const split = h('div', { class: 'db-split' }, ...['teklif', 'fiyat', 'mesaj', 'yarim'].map((k) => h('div', {}, h('b', {}, num(m.kinds[k])), h('span', {}, KIND[k]))));
    const list = m.recent.length
      ? h('div', { class: 'db-list' }, ...m.recent.map((x) => h('button', { type: 'button', class: `db-li${x.read ? '' : ' unread'}`, onclick: () => goto('mesajlar') },
        h('span', { class: 'db-li-main' }, h('b', {}, x.name), h('small', {}, KIND[x.kind] + (x.campaign === 'shopier' ? ' · Shopier %10' : ''))),
        h('span', { class: 'db-li-side' }, when(x.date)))))
      : h('p', { class: 'muted db-empty' }, 'Henüz gelen talep yok.');
    return h('div', { class: 'card db-card' }, head('Gelen talepler', more('Tümü', () => goto('mesajlar'))),
      h('p', { class: 'db-cap' }, PERIODS.find((p) => p[0] === d.period)[1]), split, h('p', { class: 'db-cap' }, 'Son gelenler'), list);
  }

  // ----- Son siparişler -----
  function recentOrders(d) {
    const o = d.orders;
    let body;
    if (!o) body = h('p', { class: 'muted db-empty' }, d.db ? (d.ordersError || 'Sipariş verisi okunamadı.') : 'Veritabanı bağlı değil, siparişler gösterilemiyor.');
    else if (!o.recent.length) body = h('div', { class: 'db-empty' }, h('p', { class: 'muted' }, 'Henüz sipariş yok.'), h('button', { type: 'button', class: 'btn small', onclick: () => sales.newOrder() }, '+ Sipariş oluştur'));
    else {
      body = h('div', { class: 'table-wrap' }, h('table', { class: 'data-table db-table' },
        h('thead', {}, h('tr', {}, ...['Sipariş', 'Tarih', 'Müşteri', 'Kanal', 'Ödeme', 'Durum', 'Tutar'].map((t, i) => h('th', { class: i === 6 ? 'num' : null }, t)))),
        h('tbody', {}, ...o.recent.map((r) => h('tr', { class: 'db-row', onclick: () => sales.openOrder(r.id) },
          h('td', {}, h('button', { type: 'button', class: 'link' }, `#${r.order_no}`)),
          h('td', {}, when(r.created_at)),
          h('td', {}, r.customer_name || '—', h('div', { class: 'hint' }, `${r.item_count} ürün`)),
          h('td', {}, CHANNEL[r.channel] || r.channel || '—'),
          h('td', {}, pill(r.payment_status, PAY[r.payment_status] || r.payment_status)),
          h('td', {}, pill(r.status, STATUS[r.status] || r.status)),
          h('td', { class: 'num' }, money(r.total)))))));
    }
    return h('div', { class: 'card db-card' }, head('Son siparişler', o && o.recent.length ? more('Tüm siparişler', () => goto('siparisler')) : null), body);
  }

  // ----- Alt satır: ürünler, kampanya penceresi, ziyaretçi verisi -----
  function bottom(d) {
    const o = d.orders, p = d.promo;
    const kv = (k, v) => h('div', { class: 'db-kv' }, h('span', {}, k), h('b', {}, v));
    const prod = h('div', { class: 'card db-card' }, head('Ürünler', more('Ürünlere git', () => goto('urunler'))),
      o ? h('div', {}, kv('Yayında', num(o.products.active)), kv('Taslak', num(o.products.draft)), kv('Toplam', num(o.products.total)))
        : h('p', { class: 'muted db-empty' }, 'Veritabanı bağlı değil.'));
    const promoCard = h('div', { class: 'card db-card' }, head('Shopier %10 penceresi', more('Ayrıntı', () => goto('kampanya'))),
      p ? h('div', {}, h('p', { class: 'db-cap' }, 'Son 7 gün'), kv('Gören', num(p.view.week)), kv('Teklif al’a tıklayan', num(p.click.week)), kv('Form gönderen', num(p.lead.week)))
        : h('p', { class: 'muted db-empty' }, 'Kampanya verisi okunamadı.'));
    const ga = h('div', { class: 'card db-card' }, head('Ziyaretçiler'),
      h('p', { class: 'muted db-note' }, 'Ziyaretçi sayıları panelde tutulmuyor. Google Analytics, yalnız çerezleri kabul eden ziyaretçileri sayar.'),
      h('a', { class: 'btn small', href: GA_URL, target: '_blank', rel: 'noopener' }, 'Analytics’i aç ↗'));
    return h('div', { class: 'db-grid3' }, prod, promoCard, ga);
  }

  function paint() {
    if (!S.box) return;
    const seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Dönem' }, ...PERIODS.map(([k, l]) => h('button', { type: 'button', class: S.period === k ? 'on' : '', onclick: () => {
      if (S.period === k) return; S.period = k; try { localStorage.setItem('goatz-dash-donem', k); } catch { /* sorun değil */ } load();
    } }, l)));
    const actions = h('div', { class: 'db-actions' },
      h('button', { type: 'button', class: 'btn solid', onclick: () => sales.newOrder() }, '+ Sipariş oluştur'),
      h('button', { type: 'button', class: 'btn', onclick: () => { commerce.newProduct(); goto('urunler'); } }, '+ Ürün ekle'),
      h('a', { class: 'btn', href: '/', target: '_blank', rel: 'noopener' }, 'Siteyi aç ↗'));
    const top = h('div', { class: 'db-top' }, seg, actions);
    const d = S.data;
    if (!d) { S.box.replaceChildren(top, S.error ? h('div', { class: 'card' }, h('p', { class: 'error' }, S.error)) : h('div', { class: 'card' }, h('p', { class: 'muted' }, 'Yükleniyor…'))); return; }
    S.box.classList.toggle('is-loading', S.loading);
    S.box.replaceChildren(...[top,
      S.error ? h('div', { class: 'card' }, h('p', { class: 'error' }, S.error)) : null,
      stats(d),
      h('div', { class: 'db-grid2' }, todo(d), leads(d)),
      recentOrders(d),
      bottom(d)].filter(Boolean));
  }

  // Her açılışta taze veri; kutu yeniden çizilse de son veri hemen görünür.
  function page() {
    S.box = h('div', { class: 'db' });
    paint();
    load();
    return S.box;
  }
  return { page };
};
