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

  const S = { period: (() => { try { return localStorage.getItem('goatz-dash-donem') || '7'; } catch { return '7'; } })(), data: null, loading: false, error: null, box: null, range: null, rangeData: null, rangeBusy: false, rangeError: null,
    demo: (() => { try { return localStorage.getItem('goatz-dash-ornek') === '1'; } catch { return false; } })(), busy: false };
  const setDemo = (v) => { S.demo = v; try { localStorage.setItem('goatz-dash-ornek', v ? '1' : '0'); } catch { /* sorun değil */ } };
  // Dashboard'dan açılan sipariş listesi, o an görünen veriyle (örnek ya da gerçek) aynı kayıtları gösterir
  const df = (f) => (S.data && S.data.sample && S.data.sample.orders ? { ...f, demo: S.demo ? '1' : '0' } : f);
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
    try {
      S.data = await request(`/api/dashboard?period=${S.period}${S.demo ? '&demo=1' : ''}`);
      if (S.demo && !(S.data.sample && S.data.sample.orders)) { setDemo(false); S.data = await request(`/api/dashboard?period=${S.period}`); }
      // Hiç gerçek sipariş yokken boş dashboard göstermek yerine örnek veriyi aç; örnek yoksa bir kez kendiliğinden ekle
      // (elle silinmişse ya da bu oturumda "Gerçek veriye dön" denmişse yapma)
      const d = S.data;
      if (!S.demo && !S.chosenReal && d.db && !d.error && !(d.recent || []).length) {
        let deleted = false; try { deleted = localStorage.getItem('goatz-ornek-silindi') === '1'; } catch { /* sorun değil */ }
        if (!(d.sample && d.sample.orders) && !deleted) { S.busy = true; paint(); try { await request('/api/demo', { method: 'POST' }); } finally { S.busy = false; } }
        if ((d.sample && d.sample.orders) || !deleted) { setDemo(true); S.data = await request(`/api/dashboard?period=${S.period}&demo=1`); }
      }
    }
    catch (e) { S.error = e.message; }
    S.loading = false; paint();
    if (S.range) loadRange();
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

  // ----- Satış grafiği: tek seri (ciro). Varsayılan üstteki dönem; istenirse tarih aralığı + adım (saat/gün/hafta/ay) seçilir -----
  const STEP_LABEL = { hour: 'Saatlik', day: 'Günlük', week: 'Haftalık', month: 'Aylık' };
  const ymd = (t) => new Date(t).toLocaleDateString('en-CA', { timeZone: TZ }); // YYYY-AA-GG (Türkiye günü)
  async function loadRange() {
    const r = S.range;
    S.rangeBusy = true; S.rangeError = null; paint();
    try { S.rangeData = await request(`/api/dashboard/series?from=${r.from}&to=${r.to}&step=${r.step}${S.demo ? '&demo=1' : ''}`); }
    catch (e) { S.rangeError = e.message; S.rangeData = null; }
    S.rangeBusy = false; paint();
  }
  function rangeControls(d, step) {
    const s0 = d.series[0] ? ymd(d.series[0].t) : ymd(Date.now());
    const cur = S.range || { from: s0, to: ymd(Date.now()), step };
    const draft = { ...cur };
    const date = (k) => h('input', { type: 'date', value: draft[k], max: ymd(Date.now()), onchange: (e) => { draft[k] = e.target.value; } });
    const sel = h('select', { onchange: (e) => { draft.step = e.target.value; } }, ...Object.entries(STEP_LABEL).map(([k, l]) => h('option', { value: k, selected: draft.step === k }, l)));
    return h('div', { class: 'db-range' },
      h('label', {}, h('span', {}, 'Başlangıç'), date('from')), h('label', {}, h('span', {}, 'Bitiş'), date('to')),
      h('label', {}, h('span', {}, 'Aralık'), sel),
      h('button', { type: 'button', class: 'btn small solid', disabled: S.rangeBusy || null, onclick: () => {
        if (!draft.from || !draft.to) return;
        if (draft.from > draft.to) [draft.from, draft.to] = [draft.to, draft.from];
        S.range = draft; loadRange();
      } }, S.rangeBusy ? 'Yükleniyor…' : 'Uygula'),
      S.range ? h('button', { type: 'button', class: 'btn small', onclick: () => { S.range = null; S.rangeData = null; S.rangeError = null; paint(); } }, 'Üstteki döneme dön') : null);
  }
  function chart(d) {
    const custom = S.range && S.rangeData && S.rangeData.series;
    const step = custom ? S.rangeData.step : d.period === 'today' ? 'hour' : 'day';
    const s = custom ? S.rangeData.series : d.series;
    const cancelledN = custom ? S.rangeData.cancelled : d.cancelled;
    const max = Math.max(0, ...s.map((x) => x.revenue));
    const nice = (() => {
      if (!max) return 1000;
      const p = 10 ** Math.floor(Math.log10(max)), m = max / p;
      return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p;
    })();
    const o = (x) => ({ timeZone: TZ, ...x });
    const hm = (t) => t.toLocaleTimeString('tr-TR', o({ hour: '2-digit', minute: '2-digit' }));
    const multiDay = s.length > 1 && ymd(s[0].t) !== ymd(s[s.length - 1].t);
    const every = Math.max(1, Math.ceil(s.length / (step === 'hour' && !multiDay ? 8 : 10)));
    const label = (x, i) => {
      if (i % every !== 0 && i !== s.length - 1) return '';
      const t = new Date(x.t);
      if (step === 'hour') return multiDay ? `${t.toLocaleDateString('tr-TR', o({ day: 'numeric', month: 'short' }))} ${hm(t)}` : hm(t);
      if (step === 'month') return t.toLocaleDateString('tr-TR', o({ month: 'short', year: '2-digit' }));
      if (step === 'day' && s.length <= 7) return t.toLocaleDateString('tr-TR', o({ weekday: 'short', day: 'numeric' }));
      return t.toLocaleDateString('tr-TR', o({ day: 'numeric', month: 'short' }));
    };
    const full = (x) => {
      const t = new Date(x.t);
      if (step === 'hour') return `${t.toLocaleDateString('tr-TR', o({ day: 'numeric', month: 'long' }))} ${hm(t)} – ${hm(new Date(t.getTime() + 36e5))}`;
      if (step === 'week') return `${t.toLocaleDateString('tr-TR', o({ day: 'numeric', month: 'long' }))} haftası`;
      if (step === 'month') return t.toLocaleDateString('tr-TR', o({ month: 'long', year: 'numeric' }));
      return t.toLocaleDateString('tr-TR', o({ weekday: 'long', day: 'numeric', month: 'long' }));
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
          tip.style.left = `${Math.min(Math.max(cr.left - pr.left + cr.width / 2, 90), pr.width - 90)}px`;
        };
        col.addEventListener('mouseenter', show); col.addEventListener('focus', show);
        col.addEventListener('mouseleave', () => { tip.hidden = true; }); col.addEventListener('blur', () => { tip.hidden = true; });
        return col;
      })), tip);
    const axis = h('div', { class: 'db-xaxis' }, ...s.map((x, i) => h('span', {}, label(x, i))));
    const total = s.reduce((a, x) => a + x.revenue, 0);
    const title = custom ? `Satışlar · ${STEP_LABEL[step].toLocaleLowerCase('tr')} ciro · ${new Date(S.rangeData.from + 'T12:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} – ${new Date(S.rangeData.to + 'T12:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}`
      : step === 'hour' ? 'Bugünkü satışlar · saatlik ciro' : 'Satışlar · günlük ciro';
    return card('db-chart', head(title, custom ? h('span', { class: 'db-sum' }, `Toplam ${money(total)}`) : null), rangeControls(d, step),
      S.rangeError ? h('p', { class: 'error', style: 'margin:0 0 8px' }, S.rangeError) : null,
      h('div', { class: 'db-chart-wrap' }, plot, axis, max ? null : h('p', { class: 'db-chart-empty' }, 'Bu aralıkta satış yok.')),
      h('p', { class: 'db-foot' }, 'İptal ve iade edilen siparişler ciroya sayılmaz' + (cancelledN ? ` (bu aralıkta ${num(cancelledN)} sipariş).` : '.')));
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
    return card('', head('Sipariş durumu', more('Tümü', () => sales.ordersWith(df({})))), h('div', { class: 'db-todos' },
      row('Onay bekliyor', o.received, () => sales.ordersWith(df({ status: 'received' })), 'Sipariş alındı'),
      row('Hazırlanıyor', o.preparing, () => sales.ordersWith(df({ status: 'preparing' }))),
      row('Kargoya verilecek', o.ready, () => sales.ordersWith(df({ status: 'ready' })), 'Kargoya hazır'),
      row('Kargoda', o.shipped, () => sales.ordersWith(df({ status: 'shipped' })), 'Gönderildi, teslim edilmedi'),
      d.returns ? row('Açık iade talebi', d.returns, null, 'Sipariş ayrıntısından yönetilir') : null));
  }
  function payments(d) {
    const by = Object.fromEntries(d.unpaid.map((x) => [x.status, x]));
    const total = d.unpaid.reduce((a, x) => a + x.sum, 0);
    const r = (k, label) => row(label, by[k]?.n || 0, () => sales.ordersWith(df({ payment: k, status: OPEN_STATUSES })), null, by[k] ? money(by[k].sum) : '');
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
      : h('div', { class: 'db-empty' }, h('p', { class: 'muted' }, 'Henüz sipariş yok.'));
    return card('', head('Son siparişler', d.recent.length ? more('Tüm siparişler', () => sales.ordersWith(df({}))) : null), body);
  }

  // Örnek veri: tek düğmeyle ekle/sil; görünürken sarı şerit rakamların gerçek olmadığını söyler
  async function sampleDo(method) {
    if (S.busy) return;
    if (method === 'DELETE' && !confirm('Tüm örnek siparişler, örnek ürünler ve örnek müşteriler silinsin mi? Gerçek kayıtlara dokunulmaz.')) return;
    S.busy = true; paint();
    try {
      await request('/api/demo', { method }); setDemo(method === 'POST');
      try { if (method === 'DELETE') localStorage.setItem('goatz-ornek-silindi', '1'); else localStorage.removeItem('goatz-ornek-silindi'); } catch { /* sorun değil */ }
    }
    catch (e) { S.busy = false; S.error = e.message; paint(); return; }
    S.busy = false; load();
  }
  function sampleBar(d) {
    const sm = d.sample || { orders: 0 };
    const b = (label, fn, cls = '') => h('button', { type: 'button', class: `btn small ${cls}`.trim(), disabled: S.busy || null, onclick: fn }, label);
    if (S.demo && sm.orders) {
      return h('div', { class: 'db-sample on' }, h('span', { class: 'db-sample-tag' }, 'ÖRNEK VERİ'),
        h('p', {}, `Bu rakamlar gerçek değil. ${sm.orders} örnek sipariş, ${sm.products} örnek ürün ve ${sm.customers} örnek müşteri, dashboard’un nasıl çalıştığını göstermek için eklendi. Fiyatlar uydurmadır.`),
        h('div', { class: 'db-sample-act' }, b('Gerçek veriye dön', () => { S.chosenReal = true; setDemo(false); load(); }), b(S.busy ? 'Siliniyor…' : 'Örnek veriyi sil', () => sampleDo('DELETE'), 'danger')));
    }
    if (sm.orders) {
      return h('div', { class: 'db-sample' }, h('p', {}, `Panelde örnek veri var (${sm.orders} sipariş). Aşağıdaki rakamlar yalnız gerçek kayıtlardan.`),
        h('div', { class: 'db-sample-act' }, b('Örnek veriyi göster', () => { setDemo(true); load(); }), b('Örnek veriyi sil', () => sampleDo('DELETE'), 'danger')));
    }
    return h('div', { class: 'db-sample' }, h('p', {}, 'Dashboard’un dolu hâlini görmek için örnek satışlar ekleyebilirsin. Hepsi “örnek” işaretli olur, gerçek ciroya karışmaz ve tek düğmeyle silinir.'),
      h('div', { class: 'db-sample-act' }, b(S.busy ? 'Ekleniyor…' : 'Örnek satışları ekle', () => sampleDo('POST'))));
  }

  function paint() {
    if (!S.box) return;
    const seg = h('div', { class: 'seg', role: 'group', 'aria-label': 'Dönem' }, ...PERIODS.map(([k, l]) => h('button', { type: 'button', class: S.period === k ? 'on' : '', onclick: () => {
      if (S.period === k) return; S.period = k; try { localStorage.setItem('goatz-dash-donem', k); } catch { /* sorun değil */ } load();
    } }, l)));
    const actions = h('div', { class: 'db-actions' },
      h('a', { class: 'btn', href: '/', target: '_blank', rel: 'noopener' }, 'Siteyi aç ↗'));
    const top = h('div', { class: 'db-top' }, seg, actions);
    const d = S.data;
    const note = (t, err) => h('div', { class: 'card' }, h('p', { class: err ? 'error' : 'muted' }, t));
    S.box.classList.toggle('is-loading', S.loading && !!d);
    if (S.error) return S.box.replaceChildren(top, note(S.error, true));
    if (!d) return S.box.replaceChildren(top, note('Yükleniyor…'));
    if (!d.db) return S.box.replaceChildren(top, note('Veritabanı bağlı değil: sipariş, ürün ve stok verisi okunamıyor.'));
    if (d.error) return S.box.replaceChildren(top, note(d.error, true));
    S.box.replaceChildren(top, sampleBar(d), stats(d),
      h('div', { class: 'db-grid-b' }, recentOrders(d), bestsellers(d)),
      h('div', { class: 'db-grid-a' }, chart(d), channels(d)),
      h('div', { class: 'db-grid3' }, pipeline(d), payments(d), stock(d)));
  }

  function page() {
    S.box = h('div', { class: 'db' });
    paint();
    load();
    return S.box;
  }
  return { page };
};
