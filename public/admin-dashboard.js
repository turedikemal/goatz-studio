// Panel ana sayfası (Dashboard): e-ticaret özeti (GET /api/dashboard).
// Yalnız veritabanındaki gerçek sipariş/ürün/stok verisi gösterilir; veri yoksa boş durum yazılır.
window.GoatzDashboard = (ctx) => {
  const { h, request, goto, sales, commerce } = ctx;
  const { money } = commerce.ui;

  const PERIODS = [['today', 'Bugün'], ['7', 'Son 7 gün'], ['30', 'Son 30 gün']];
  const PREV = { today: 'Dün', 7: 'Önceki 7 gün', 30: 'Önceki 30 gün' };
  const STATUS = { received: 'Sipariş alındı', preparing: 'Hazırlanıyor', ready: 'Kargoya hazır', shipped: 'Gönderildi', delivered: 'Teslim edildi', cancelled: 'İptal edildi', returned: 'İade edildi' };
  const PAY = { pending: 'Bekliyor', paid: 'Ödendi', partial: 'Kısmi ödeme', refunded: 'İade edildi', failed: 'Başarısız' };
  const CHANNEL = { manual: 'Manuel', web: 'Web mağaza', trendyol: 'Trendyol', hepsiburada: 'Hepsiburada', instagram: 'Instagram', whatsapp: 'WhatsApp' };
  const TZ = 'Europe/Istanbul'; // dönemler sunucuda Türkiye gününe göre bölünür
  const OPEN_STATUSES = 'received,preparing,ready,shipped,delivered';

  const S = { period: (() => { try { return localStorage.getItem('goatz-dash-donem') || '7'; } catch { return '7'; } })(), data: null, loading: false, error: null, box: null };
  const num = (n) => Number(n || 0).toLocaleString('tr-TR');
  const short = (n) => '₺' + (n >= 1e6 ? `${(n / 1e6).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} mn` : n >= 1e3 ? `${(n / 1e3).toLocaleString('tr-TR', { maximumFractionDigits: 1 })} bin` : num(n));
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
  const card = (cls, ...kids) => h('div', { class: `card db-card ${cls || ''}`.trim() }, ...kids);
  const change = (cur, prev) => {
    if (!prev) return '';
    const p = Math.round(((cur - prev) / prev) * 100);
    return p === 0 ? ' · değişmedi' : ` · ${p > 0 ? '+' : '−'}%${Math.abs(p)}`;
  };

  async function load() {
    S.loading = true; S.error = null; paint();
    try { S.data = await request(`/api/dashboard?period=${S.period}`); }
    catch (e) { S.error = e.message; }
    S.loading = false; paint();
  }

  // ----- Özet şeridi -----
  function stats(d) {
    const prev = PREV[d.period];
    const cell = (label, value, sub) => h('div', { class: 'db-stat' }, h('span', { class: 'db-label' }, label), h('b', { class: 'db-num' }, value), h('span', { class: 'db-sub' }, sub));
    const avg = d.count ? d.revenue / d.count : 0, pavg = d.prevCount ? d.prevRevenue / d.prevCount : 0;
    return h('div', { class: 'card db-stats' },
      cell('Ciro', money(d.revenue), `${prev}: ${money(d.prevRevenue)}${change(d.revenue, d.prevRevenue)}`),
      cell('Sipariş', num(d.count), `${prev}: ${num(d.prevCount)}${change(d.count, d.prevCount)}`),
      cell('Ortalama sepet', d.count ? money(avg) : '—', `${prev}: ${d.prevCount ? money(pavg) : '—'}`),
      cell('Satılan ürün', num(d.units), `${prev}: ${num(d.prevUnits)} adet`),
      cell('Yeni müşteri', num(d.customers), `${prev}: ${num(d.prevCustomers)}`));
  }

  // ----- Satış grafiği: tek seri (ciro), dönem başına gün ya da saat sütunu -----
  function chart(d) {
    const s = d.series, max = Math.max(...s.map((x) => x.revenue));
    const nice = (() => {
      if (!max) return 1000;
      const p = 10 ** Math.floor(Math.log10(max)), m = max / p;
      return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
    })();
    const hourly = d.period === 'today';
    const hm = (t) => t.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', timeZone: TZ });
    const label = (x, i) => {
      const t = new Date(x.t);
      if (hourly) return i % 3 === 0 ? hm(t) : '';
      if (s.length <= 7) return t.toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', timeZone: TZ });
      return i % 5 === 0 || i === s.length - 1 ? t.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', timeZone: TZ }) : '';
    };
    const full = (x) => {
      const t = new Date(x.t);
      return hourly ? `${hm(t)} – ${hm(new Date(t.getTime() + 36e5))}` : t.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ });
    };
    const tip = h('div', { class: 'db-tip', hidden: true });
    const plot = h('div', { class: 'db-plot' },
      ...[1, 0.5, 0].map((f) => h('div', { class: 'db-gl', style: `bottom:${f * 100}%` }, h('span', {}, f ? short(nice * f) : '₺0'))),
      h('div', { class: 'db-bars' }, ...s.map((x) => {
        const col = h('div', { class: 'db-col', tabindex: '0', 'aria-label': `${full(x)}: ${money(x.revenue)}, ${x.orders} sipariş` },
          h('i', { class: 'db-bar', style: `height:${x.revenue ? Math.max(1.5, (x.revenue / nice) * 100) : 0}%` }));
        const show = () => {
          tip.replaceChildren(h('b', {}, full(x)), h('span', {}, `Ciro: ${money(x.revenue)}`), h('span', {}, `Sipariş: ${num(x.orders)}`));
          tip.hidden = false;
          const pr = plot.getBoundingClientRect(), cr = col.getBoundingClientRect();
          tip.style.left = `${Math.min(Math.max(cr.left - pr.left + cr.width / 2, 80), pr.width - 80)}px`;
        };
        col.addEventListener('mouseenter', show); col.addEventListener('focus', show);
        col.addEventListener('mouseleave', () => { tip.hidden = true; }); col.addEventListener('blur', () => { tip.hidden = true; });
        return col;
      })), tip);
    const axis = h('div', { class: 'db-xaxis' }, ...s.map((x, i) => h('span', {}, label(x, i))));
    return card('db-chart', head(hourly ? 'Bugünkü satışlar · saatlik ciro' : 'Satışlar · günlük ciro'),
      h('div', { class: 'db-chart-wrap' }, plot, axis, max ? null : h('p', { class: 'db-chart-empty' }, 'Bu dönemde satış yok.')),
      h('p', { class: 'db-foot' }, 'İptal ve iade edilen siparişler ciroya sayılmaz' + (d.cancelled ? ` (bu dönemde ${num(d.cancelled)} sipariş).` : '.')));
  }

  // ----- Satış kanalları -----
  function channels(d) {
    const top = d.channels[0]?.revenue || 0;
    return card('', head('Satış kanalları'),
      d.channels.length ? h('div', { class: 'db-chan' }, ...d.channels.map((c) => h('div', { class: 'db-chan-row' },
        h('div', { class: 'db-chan-l' }, h('span', {}, CHANNEL[c.channel] || c.channel), h('b', {}, money(c.revenue))),
        h('div', { class: 'db-meter' }, h('i', { style: `width:${top ? (c.revenue / top) * 100 : 0}%` })),
        h('small', {}, `${num(c.orders)} sipariş · cironun %${d.revenue ? Math.round((c.revenue / d.revenue) * 100) : 0}`))))
        : h('p', { class: 'muted db-empty' }, 'Bu dönemde satış yok.'));
  }

  // ----- Sipariş durumu, ödeme, stok -----
  const row = (label, n, fn, hint, value) => h('button', { type: 'button', class: `db-todo${n ? ' on' : ''}`, onclick: fn, disabled: fn ? null : true },
    h('span', { class: 'db-todo-l' }, label, hint ? h('small', {}, hint) : null), h('span', { class: 'db-val' }, value || ''), h('b', { class: 'db-count' }, num(n)), h('i', { class: 'chev', 'aria-hidden': 'true' }));
  function pipeline(d) {
    const o = d.open;
    return card('', head('Sipariş durumu', more('Tümü', () => goto('siparisler'))), h('div', { class: 'db-todos' },
      row('Onay bekliyor', o.received, () => sales.ordersWith({ status: 'received' }), 'Sipariş alındı'),
      row('Hazırlanıyor', o.preparing, () => sales.ordersWith({ status: 'preparing' })),
      row('Kargoya verilecek', o.ready, () => sales.ordersWith({ status: 'ready' }), 'Kargoya hazır'),
      row('Kargoda', o.shipped, () => sales.ordersWith({ status: 'shipped' }), 'Gönderildi, teslim edilmedi'),
      d.returns ? row('Açık iade talebi', d.returns, null, 'Sipariş ayrıntısından yönetilir') : null));
  }
  function payments(d) {
    const by = Object.fromEntries(d.unpaid.map((x) => [x.status, x]));
    const total = d.unpaid.reduce((a, x) => a + x.sum, 0);
    const r = (k, label) => row(label, by[k]?.n || 0, () => sales.ordersWith({ payment: k, status: OPEN_STATUSES }), null, by[k] ? money(by[k].sum) : '');
    return card('', head('Bekleyen ödemeler'), h('div', { class: 'db-todos' }, r('pending', 'Ödeme bekleniyor'), r('partial', 'Kısmi ödendi'), r('failed', 'Ödeme başarısız')),
      h('p', { class: 'db-foot' }, total ? `Toplam ${money(total)} tahsil edilmedi (iptal/iade hariç).` : 'Ödemesi bekleyen sipariş yok.'));
  }
  function stock(d) {
    const out = d.stock.filter((x) => x.qty <= 0), low = d.stock.filter((x) => x.qty > 0);
    const name = (x) => (x.variant_name ? `${x.product_name} · ${x.variant_name}` : x.product_name);
    const list = d.stock.slice(0, 4).map((x) => h('div', { class: 'db-kv' }, h('span', {}, name(x)), h('b', { class: x.qty <= 0 ? 'db-zero' : '' }, x.qty <= 0 ? 'Tükendi' : `${x.qty} adet`)));
    return card('', head('Stok uyarıları', more('Stok', () => goto('stok'))),
      h('div', { class: 'db-split' }, h('div', {}, h('b', {}, num(out.length)), h('span', {}, 'Tükenen varyant')), h('div', {}, h('b', {}, num(low.length)), h('span', {}, `Az kalan (${d.lowStock} adet ve altı)`))),
      d.stock.length ? h('div', {}, ...list, d.stock.length > 4 ? h('p', { class: 'db-foot' }, `ve ${num(d.stock.length - 4)} varyant daha`) : null)
        : h('p', { class: 'muted db-empty' }, d.products.active ? 'Yayındaki ürünlerde stok sorunu yok.' : 'Yayında ürün yok.'));
  }

  // ----- En çok satanlar + son siparişler -----
  function bestsellers(d) {
    return card('', head('En çok satanlar', more('Ürünler', () => goto('urunler'))),
      d.top.length ? h('div', { class: 'db-rank' }, ...d.top.map((p, i) => h('div', { class: 'db-rank-row' },
        h('span', { class: 'db-rank-n' }, String(i + 1)), h('span', { class: 'db-rank-name' }, p.name, h('small', {}, `${num(p.qty)} adet`)), h('b', {}, money(p.revenue)))))
        : h('p', { class: 'muted db-empty' }, 'Bu dönemde satılan ürün yok.'));
  }
  function recentOrders(d) {
    const body = d.recent.length
      ? h('div', { class: 'table-wrap' }, h('table', { class: 'data-table db-table' },
        h('thead', {}, h('tr', {}, ...['Sipariş', 'Tarih', 'Müşteri', 'Ödeme', 'Durum', 'Tutar'].map((t, i) => h('th', { class: i === 5 ? 'num' : null }, t)))),
        h('tbody', {}, ...d.recent.map((r) => h('tr', { class: 'db-row', onclick: () => sales.openOrder(r.id) },
          h('td', {}, h('button', { type: 'button', class: 'link' }, `#${r.order_no}`), h('div', { class: 'hint' }, CHANNEL[r.channel] || r.channel || '')),
          h('td', {}, when(r.created_at)),
          h('td', {}, r.customer_name || '—', h('div', { class: 'hint' }, `${r.item_count} ürün`)),
          h('td', {}, pill(r.payment_status, PAY[r.payment_status] || r.payment_status)),
          h('td', {}, pill(r.status, STATUS[r.status] || r.status)),
          h('td', { class: 'num' }, money(r.total)))))))
      : h('div', { class: 'db-empty' }, h('p', { class: 'muted' }, 'Henüz sipariş yok.'), h('button', { type: 'button', class: 'btn small', onclick: () => sales.newOrder() }, '+ Sipariş oluştur'));
    return card('', head('Son siparişler', d.recent.length ? more('Tüm siparişler', () => goto('siparisler')) : null), body);
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
    const note = (t, err) => h('div', { class: 'card' }, h('p', { class: err ? 'error' : 'muted' }, t));
    S.box.classList.toggle('is-loading', S.loading && !!d);
    if (S.error) return S.box.replaceChildren(top, note(S.error, true));
    if (!d) return S.box.replaceChildren(top, note('Yükleniyor…'));
    if (!d.db) return S.box.replaceChildren(top, note('Veritabanı bağlı değil: sipariş, ürün ve stok verisi okunamıyor.'));
    if (d.error) return S.box.replaceChildren(top, note(d.error, true));
    S.box.replaceChildren(top, stats(d),
      h('div', { class: 'db-grid-a' }, chart(d), channels(d)),
      h('div', { class: 'db-grid3' }, pipeline(d), payments(d), stock(d)),
      h('div', { class: 'db-grid-b' }, bestsellers(d), recentOrders(d)));
  }

  function page() {
    S.box = h('div', { class: 'db' });
    paint();
    load();
    return S.box;
  }
  return { page };
};
