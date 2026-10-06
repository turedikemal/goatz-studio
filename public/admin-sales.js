// Satış modülleri: Siparişler, İadeler, Müşteriler, Etiketler, Kuponlar, Kampanyalar.
window.GoatzSales = (ctx) => {
  const { h, toast, rerender, goto, ui } = ctx;
  const { api, fail, money, field, text, area, select, check, row, table, ensure, loadingCard } = ui;

  const STATUS = { received: 'Sipariş alındı', preparing: 'Hazırlanıyor', ready: 'Kargoya hazır', shipped: 'Gönderildi', delivered: 'Teslim edildi', cancelled: 'İptal edildi', returned: 'İade edildi' };
  const PAY = { pending: 'Bekliyor', paid: 'Ödendi', partial: 'Kısmi ödeme', refunded: 'İade edildi', failed: 'Başarısız' };
  const RET = { requested: 'Talep edildi', approved: 'Onaylandı', received: 'Teslim alındı', refunded: 'İade yapıldı', rejected: 'Reddedildi' };
  const CHANNELS = [['manual', 'Manuel'], ['web', 'Web mağaza'], ['trendyol', 'Trendyol'], ['hepsiburada', 'Hepsiburada'], ['instagram', 'Instagram'], ['whatsapp', 'WhatsApp']];
  const CHANNEL = Object.fromEntries(CHANNELS);
  const CARRIERS = ['Yurtiçi Kargo', 'Aras Kargo', 'MNG Kargo', 'PTT Kargo', 'Sürat Kargo', 'UPS', 'Diğer'];
  const PAY_METHODS = ['Kredi kartı', 'Havale / EFT', 'Kapıda ödeme', 'Nakit', 'Diğer'];
  const NEXT = { received: ['preparing'], preparing: ['ready'], shipped: ['delivered'] };
  const RETURN_REASONS = ['Ürün hasarlı', 'Yanlış ürün', 'Beğenilmedi', 'Geç teslimat', 'Diğer'];

  const fmt = (d) => (d ? new Date(d).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }) : '—');
  const day = (d) => (d ? new Date(d).toLocaleDateString('tr-TR') : '—');
  const localInput = (d) => { if (!d) return ''; const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16); };
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pill = (cls, label) => h('span', { class: `pill s-${cls}` }, label);
  const btn = (label, onclick, cls = '') => h('button', { class: `btn small ${cls}`, onclick }, label);
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const qs = (o) => Object.entries(o).filter(([, v]) => v !== '' && v != null).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  const addressLine = (a) => [a.address, a.district, a.city, a.postalCode].filter(Boolean).join(', ');
  const confirmDo = (msg) => confirm(msg);
  let lastPage = null, keep = false;
  const visit = (id) => { keep = true; goto(id); keep = false; };

  // =====================================================================
  //  Siparişler
  // =====================================================================
  const O = {
    hideDemo: (() => { try { return localStorage.getItem('goatz-ornek-siparis') === 'gizli'; } catch { return false; } })(), demoOrder: null,
    loaded: false, loading: false, view: 'list', preset: null, f: {}, data: { rows: [], total: 0, sum: 0 }, selected: new Set(), filters: [], adv: false,
    page: 0, detail: null, dirty: false, busy: false, ret: { reason: RETURN_REASONS[0], note: '', qty: {}, amount: '' },
    refs: { loaded: false, loading: false, customers: [], products: [] }, draft: null, lines: [],
  };
  const PRESETS = {
    siparisler: { title: null, f: {} },
    odemeler: { title: 'Ödeme durumu', f: { payment: 'pending,partial,failed', status: 'received,preparing,ready,shipped,delivered' } },
    kargo: { title: 'Kargo operasyonu', f: { status: 'received,preparing,ready,shipped' } },
  };
  const blankFilter = () => ({ q: '', status: '', payment: '', channel: '', carrier: '', from: '', to: '', min: '', max: '' });

  async function loadOrders() {
    const { rows, total, sum } = await api('GET', `/api/orders?${qs({ ...O.f, limit: 50, offset: O.page * 50 })}`);
    O.data = { rows, total, sum };
    O.selected = new Set([...O.selected].filter((id) => rows.some((r) => r.id === id)));
  }
  async function loadFilters() { O.filters = await api('GET', '/api/saved-filters?scope=orders'); }
  const refresh = async () => { try { await loadOrders(); } catch (e) { fail(e); } rerender(); };

  function toggleIn(key, value) {
    const set = new Set(String(O.f[key] || '').split(',').filter(Boolean));
    set.has(value) ? set.delete(value) : set.add(value);
    O.f[key] = [...set].join(',');
    O.page = 0; refresh();
  }
  const chips = (key, dict) => h('div', { class: 'chips' }, ...Object.entries(dict).map(([k, l]) => {
    const on = String(O.f[key] || '').split(',').includes(k);
    return h('button', { class: `chip-toggle ${on ? 'on' : ''}`, onclick: () => toggleIn(key, k) }, l);
  }));

  function orderList(page) {
    const kargoView = page.id === 'kargo', payView = page.id === 'odemeler';
    const a = O.f;
    const search = h('input', { type: 'search', class: 'search', placeholder: 'Sipariş no, müşteri, telefon, takip no…', value: a.q || '', onkeydown: (e) => { if (e.key === 'Enter') { a.q = e.target.value; O.page = 0; refresh(); } }, onchange: (e) => { a.q = e.target.value; O.page = 0; refresh(); } });
    const saved = h('select', { onchange: (e) => {
      const f = O.filters.find((x) => String(x.id) === e.target.value);
      if (f) { O.f = { ...blankFilter(), ...f.filter }; O.page = 0; refresh(); }
    } }, h('option', { value: '' }, 'Kayıtlı filtreler'), ...O.filters.map((f) => h('option', { value: f.id }, f.name)));
    const adv = O.adv ? h('div', { class: 'card adv-filters' }, row(
      field('Kanal', select(a, 'channel', [['', 'Tümü'], ...CHANNELS], () => { O.page = 0; refresh(); })),
      field('Kargo firması', select(a, 'carrier', [['', 'Tümü'], ...CARRIERS.map((c) => [c, c])], () => { O.page = 0; refresh(); })),
      field('Başlangıç tarihi', text(a, 'from', '', 'date', { onchange: () => { O.page = 0; refresh(); } })),
      field('Bitiş tarihi', text(a, 'to', '', 'date', { onchange: () => { O.page = 0; refresh(); } })),
      field('En az tutar (₺)', text(a, 'min', '', 'number', { onchange: () => { O.page = 0; refresh(); } })),
      field('En çok tutar (₺)', text(a, 'max', '', 'number', { onchange: () => { O.page = 0; refresh(); } }))),
      h('div', { class: 'btn-row' }, btn('Filtreleri temizle', () => { O.f = { ...blankFilter(), ...(PRESETS[page.id] || PRESETS.siparisler).f }; O.page = 0; refresh(); }),
        btn('Bu filtreyi kaydet', async () => {
          const name = prompt('Filtre adı:'); if (!name) return;
          const { q, ...filter } = O.f; if (q) filter.q = q;
          try { await api('POST', '/api/saved-filters', { scope: 'orders', name, filter }); await loadFilters(); toast('Filtre kaydedildi.'); rerender(); } catch (e) { fail(e); }
        }),
        O.filters.length ? btn('Kayıtlı filtre sil…', async () => {
          const name = prompt(`Silinecek filtre adı:\n${O.filters.map((f) => f.name).join(', ')}`); const f = O.filters.find((x) => x.name === name);
          if (!f) return; try { await api('DELETE', `/api/saved-filters/${f.id}`); await loadFilters(); toast('Filtre silindi.'); rerender(); } catch (e) { fail(e); }
        }) : null)) : null;

    const bulk = async (action, label) => {
      const ids = [...O.selected]; if (!ids.length) return;
      if (action === 'status:cancelled' && !confirmDo(`${ids.length} sipariş iptal edilsin mi? Stoklar geri eklenir.`)) return;
      try {
        const r = await api('POST', '/api/orders/bulk', { ids, action });
        toast(`${r.ok} sipariş: ${label}.${r.failed ? ` ${r.failed} sipariş işlenemedi: ${r.errors[0]}` : ''}`, r.failed > 0 && r.ok === 0);
        O.selected.clear(); await refresh();
      } catch (e) { fail(e); }
    };
    const rows = O.data.rows.map((o) => h('tr', {},
      h('td', {}, h('input', { type: 'checkbox', checked: O.selected.has(o.id), onchange: (e) => { e.target.checked ? O.selected.add(o.id) : O.selected.delete(o.id); rerender(); } })),
      h('td', {}, h('button', { class: 'link', onclick: () => openOrder(o.id) }, `#${o.order_no}`), h('div', { class: 'hint' }, fmt(o.created_at))),
      h('td', {}, o.customer_name || '—', o.customer_phone ? h('div', { class: 'hint' }, o.customer_phone) : null),
      h('td', {}, CHANNEL[o.channel] || o.channel), h('td', {}, o.item_count),
      h('td', { class: 'num' }, money(o.total)),
      h('td', {}, pill(o.payment_status, PAY[o.payment_status]), payView && o.payment_status !== 'paid' && !['cancelled', 'returned'].includes(o.status)
        ? h('div', {}, btn('Ödendi işaretle', async () => { try { await api('POST', `/api/orders/${o.id}/payment`, { paymentStatus: 'paid' }); toast('Ödeme alındı.'); await refresh(); } catch (e) { fail(e); } })) : null),
      h('td', {}, pill(o.status, STATUS[o.status])),
      kargoView ? h('td', {}, o.carrier ? `${o.carrier}${o.tracking_no ? ' · ' + o.tracking_no : ''}` : '—') : null,
      h('td', { class: 'actions' }, btn(kargoView && !o.carrier ? 'Kargola' : 'Aç', () => openOrder(o.id)))));
    const demoRow = !O.hideDemo && O.page === 0 ? h('tr', { class: 'demo-row' },
      h('td', {}),
      h('td', {}, h('button', { class: 'link', onclick: () => { O.detail = demoOrder(); O.view = 'detail'; O.ret = { reason: RETURN_REASONS[0], note: '', qty: {}, amount: '' }; rerender(); } }, 'ÖRNEK'), h('div', { class: 'hint' }, 'gösterim amaçlı')),
      h('td', {}, 'Örnek Müşteri'), h('td', {}, 'Elle'), h('td', {}, 1), h('td', { class: 'num' }, money(demoOrder().total)),
      h('td', {}, pill(demoOrder().payment_status, PAY[demoOrder().payment_status])), h('td', {}, pill(demoOrder().status, STATUS[demoOrder().status])),
      kargoView ? h('td', {}, '—') : null,
      h('td', { class: 'actions' }, btn('Aç', () => { O.detail = demoOrder(); O.view = 'detail'; rerender(); }), btn('Gizle', () => { O.hideDemo = true; try { localStorage.setItem('goatz-ornek-siparis', 'gizli'); } catch { /* sorun değil */ } rerender(); }))) : null;
    const allSel = O.data.rows.length && O.data.rows.every((o) => O.selected.has(o.id));
    const pages = Math.max(1, Math.ceil(O.data.total / 50));

    return h('div', {},
      h('div', { class: 'toolbar' }, search, saved,
        btn(O.adv ? 'Filtreleri gizle' : 'Gelişmiş filtre', () => { O.adv = !O.adv; rerender(); }),
        O.hideDemo ? btn('Örnek siparişi göster', () => { O.hideDemo = false; try { localStorage.removeItem('goatz-ornek-siparis'); } catch { /* sorun değil */ } rerender(); }) : null,
        h('button', { class: 'btn solid', onclick: () => newOrder() }, '+ Sipariş oluştur')),
      adv,
      h('div', { class: 'filter-row' }, h('b', {}, 'Durum'), chips('status', STATUS)),
      h('div', { class: 'filter-row' }, h('b', {}, 'Ödeme'), chips('payment', PAY)),
      O.selected.size ? h('div', { class: 'bulkbar' }, h('b', {}, `${O.selected.size} seçili`),
        btn('Hazırlanıyor', () => bulk('status:preparing', 'hazırlanıyor')), btn('Kargoya hazır', () => bulk('status:ready', 'kargoya hazır')),
        btn('Teslim edildi', () => bulk('status:delivered', 'teslim edildi')), btn('Ödendi işaretle', () => bulk('paid', 'ödendi')),
        btn('Fatura kes', () => bulk('invoice', 'faturalandı')), btn('İptal et', () => bulk('status:cancelled', 'iptal edildi'), 'danger')) : null,
      h('div', { class: 'card' },
        table([h('input', { type: 'checkbox', checked: !!allSel, onchange: (e) => { O.data.rows.forEach((o) => (e.target.checked ? O.selected.add(o.id) : O.selected.delete(o.id))); rerender(); } }),
          'Sipariş', 'Müşteri', 'Kanal', 'Ürün', 'Tutar', 'Ödeme', 'Durum', kargoView ? 'Kargo' : null, ''].filter((x) => x !== null), [demoRow, ...rows].filter(Boolean),
        'Bu filtreyle eşleşen sipariş yok.'),
        h('div', { class: 'list-foot' }, h('span', { class: 'muted' }, `${O.data.total} sipariş · toplam ${money(O.data.sum)}`),
          h('div', { class: 'btn-row', style: 'margin:0' }, btn('‹ Önceki', () => { O.page--; refresh(); }, O.page === 0 ? 'hidden-btn' : ''), h('span', { class: 'muted' }, `${O.page + 1} / ${pages}`),
            btn('Sonraki ›', () => { O.page++; refresh(); }, O.page + 1 >= pages ? 'hidden-btn' : '')))));
  }

  async function openOrder(id) {
    try { O.detail = await api('GET', `/api/orders/${id}`); O.view = 'detail'; O.ret = { reason: RETURN_REASONS[0], note: '', qty: {}, amount: '' }; visit('siparisler'); rerender(); } catch (e) { fail(e); }
  }
  ctx.openOrder = openOrder;

  function printInvoice(o) {
    const a = o.shipping_address || {};
    const w = window.open('', '_blank');
    if (!w) return toast('Açılır pencere engellendi. Tarayıcıdan izin ver.', true);
    const rows = o.items.map((i) => `<tr><td>${esc(i.name)}<br><small>${esc(i.sku || '')}</small></td><td>${i.quantity}</td><td>${money(i.unit_price)}</td><td>${money(i.line_total)}</td></tr>`).join('');
    w.document.write(`<!doctype html><meta charset="utf-8"><title>Fatura ${esc(o.invoice_no || '#' + o.order_no)}</title>
<style>body{font:14px/1.5 Inter,system-ui,sans-serif;margin:40px;color:#000}h1{margin:0}table{width:100%;border-collapse:collapse;margin-top:24px}th,td{text-align:left;padding:8px;border-bottom:1px solid #ccc}td:nth-child(n+2),th:nth-child(n+2){text-align:right}.tot{margin-top:16px;margin-left:auto;width:280px}.tot div{display:flex;justify-content:space-between;padding:3px 0}.b{font-weight:800;border-top:2px solid #000;margin-top:6px;padding-top:6px}small{color:#666}.top{display:flex;justify-content:space-between}</style>
<div class="top"><div><h1>The Goatz Studio</h1><small>Satış faturası</small></div><div style="text-align:right"><b>${esc(o.invoice_no || 'Fatura kesilmedi')}</b><br>${day(o.invoice_date || o.created_at)}<br>Sipariş #${o.order_no}</div></div>
<p><b>${esc(o.customer_name)}</b><br>${esc(addressLine(a))}<br>${esc(o.customer_email || '')} ${esc(o.customer_phone || '')}</p>
<table><thead><tr><th>Ürün</th><th>Adet</th><th>Birim</th><th>Tutar</th></tr></thead><tbody>${rows}</tbody></table>
<div class="tot"><div><span>Ara toplam</span><span>${money(o.subtotal)}</span></div><div><span>İndirim</span><span>-${money(o.discount_total)}</span></div><div><span>Kargo</span><span>${money(o.shipping_total)}</span></div><div><span>KDV (dahil)</span><span>${money(o.tax_total)}</span></div><div class="b"><span>Genel toplam</span><span>${money(o.total)}</span></div></div>
<script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script>`);
    w.document.close();
  }

  // ----- Örnek sipariş: yalnız tarayıcıda durur (veritabanına yazılmaz, sayımlara girmez, "Örneği gizle" ile kalkar) -----
  const demoOrder = () => {
    if (!O.demoOrder) {
      const t = new Date().toISOString();
      O.demoOrder = { demo: true, id: 'demo', order_no: 'ÖRNEK', created_at: t, channel: 'manual', status: 'shipped', payment_status: 'pending', payment_method: '',
        customer_name: 'Örnek Müşteri', customer_email: '', customer_phone: '', customer_id: null, shipping_address: {}, carrier: '', tracking_no: '',
        subtotal: 0, discount_total: 0, shipping_total: 0, tax_total: 0, total: 0, coupon_code: null, notes: '', invoice_no: null, invoice_date: null,
        items: [{ id: 1, name: 'Örnek Ürün', sku: '', quantity: 1, unit_price: 0, discount_unit: 0, campaign_name: '', line_total: 0 }],
        events: [{ created_at: t, message: 'Örnek sipariş (gösterim). Gerçek veri değildir.' }], returns: [] };
    }
    return O.demoOrder;
  };
  async function demoApi(method, url, body = {}) {
    const o = demoOrder(); const now = new Date().toISOString();
    const ev = (message) => o.events.unshift({ created_at: now, message });
    let m;
    if (/\/status$/.test(url)) { o.status = body.status; ev(`Durum: ${STATUS[body.status]}`); }
    else if (/\/payment$/.test(url)) { o.payment_status = body.paymentStatus || o.payment_status; o.payment_method = body.paymentMethod || ''; ev(`Ödeme durumu: ${PAY[o.payment_status]}`); }
    else if (/\/shipping$/.test(url)) { o.carrier = body.carrier; o.tracking_no = body.trackingNo || ''; o.status = 'shipped'; ev(`Kargo: ${o.carrier}${o.tracking_no ? ' · ' + o.tracking_no : ''}`); }
    else if (/\/invoice$/.test(url)) { o.invoice_no = 'ÖRNEK-0001'; o.invoice_date = now; ev('Fatura oluşturuldu (örnek).'); }
    else if (/\/returns$/.test(url)) { o.returns.unshift({ id: o.returns.length + 1, status: 'requested', reason: body.reason, note: body.note, refund_amount: Number(body.refundAmount) || 0 }); ev('İade talebi açıldı.'); }
    else if ((m = /\/api\/returns\/(\d+)$/.exec(url))) { const r = o.returns.find((x) => x.id === +m[1]); if (r) { r.status = body.status; ev(`İade: ${RET[r.status]}`); } }
    else if (method === 'PUT') o.notes = body.notes || '';
    return o;
  }

  function orderDetail() {
    const o = O.detail; const call = o && o.demo ? demoApi : api; if (!o) { O.view = 'list'; return orderList({ id: 'siparisler' }); }
    const act = async (fn, msg) => { if (O.busy) return; O.busy = true; try { O.detail = await fn(); O.dirty = true; toast(msg); } catch (e) { fail(e); } finally { O.busy = false; rerender(); } };
    const a = o.shipping_address || {};
    const canCancel = ['received', 'preparing', 'ready'].includes(o.status);
    const canShip = ['received', 'preparing', 'ready', 'shipped'].includes(o.status);
    const shipDraft = { carrier: o.carrier || CARRIERS[0], trackingNo: o.tracking_no || '' };
    const payDraft = { paymentStatus: o.payment_status, paymentMethod: o.payment_method || '' };
    const note = { notes: o.notes || '' };

    const items = h('div', { class: 'card' }, h('h3', {}, 'Ürünler'), table(['Ürün', 'Adet', 'Birim', 'İndirim', 'Tutar'],
      o.items.map((i) => h('tr', {}, h('td', {}, i.name, i.sku ? h('div', { class: 'hint' }, i.sku) : null), h('td', {}, i.quantity), h('td', { class: 'num' }, money(i.unit_price)),
        h('td', {}, Number(i.discount_unit) ? h('span', {}, `-${money(i.discount_unit)}`, h('div', { class: 'hint' }, i.campaign_name || '')) : '—'), h('td', { class: 'num' }, money(i.line_total))))),
      h('div', { class: 'totals' },
        h('div', {}, h('span', {}, 'Ara toplam'), h('span', {}, money(o.subtotal))),
        h('div', {}, h('span', {}, `Toplam indirim${o.coupon_code ? ` (kampanya + kupon ${o.coupon_code})` : ''}`), h('span', {}, `-${money(o.discount_total)}`)),
        h('div', {}, h('span', {}, 'Kargo'), h('span', {}, money(o.shipping_total))),
        h('div', { class: 'hint' }, h('span', {}, 'KDV (fiyata dahil)'), h('span', {}, money(o.tax_total))),
        h('div', { class: 'grand' }, h('span', {}, 'Toplam'), h('span', {}, money(o.total)))));

    const customer = h('div', { class: 'card' }, h('h3', {}, 'Müşteri ve teslimat'),
      h('div', { class: 'kv' }, h('b', {}, o.customer_name || 'Misafir'), o.customer_email ? h('span', {}, o.customer_email) : null, o.customer_phone ? h('span', {}, o.customer_phone) : null,
        addressLine(a) ? h('span', { class: 'addr' }, `${a.fullName ? a.fullName + ' · ' : ''}${addressLine(a)}`) : h('span', { class: 'muted' }, 'Teslimat adresi girilmemiş.')),
      o.customer_id ? btn('Müşteri kartı', () => openCustomer(o.customer_id)) : null);

    const timeline = h('div', { class: 'card' }, h('h3', {}, 'Geçmiş'), h('ul', { class: 'timeline' },
      ...o.events.map((e) => h('li', {}, h('span', { class: 'when' }, fmt(e.created_at)), h('span', {}, e.message)))));

    const nextBtns = (NEXT[o.status] || []).map((s) => h('button', { class: 'btn solid wide', onclick: () => act(() => call('POST', `/api/orders/${o.id}/status`, { status: s }), `Durum: ${STATUS[s]}`) }, `→ ${STATUS[s]}`));
    const statusCard = h('div', { class: 'card' }, h('h3', {}, 'Durum'), h('div', { class: 'stack' }, pill(o.status, STATUS[o.status]), ...nextBtns,
      canCancel ? h('button', { class: 'btn wide danger', onclick: () => { if (confirmDo('Sipariş iptal edilsin mi? Ürünler stoğa geri eklenir.')) act(() => call('POST', `/api/orders/${o.id}/status`, { status: 'cancelled' }), 'Sipariş iptal edildi; stok geri eklendi.'); } }, 'Siparişi iptal et') : null,
      o.status === 'cancelled' && o.payment_status === 'paid' ? h('p', { class: 'hint warn' }, 'İptal edilen siparişin ödemesi alınmış. Ödeme bölümünden “İade edildi” olarak işaretle.') : null));

    const payCard = h('div', { class: 'card' }, h('h3', {}, 'Ödeme durumu'), h('div', { class: 'stack' },
      field('Durum', select(payDraft, 'paymentStatus', Object.entries(PAY))),
      field('Yöntem', select(payDraft, 'paymentMethod', [['', 'Seçiniz'], ...PAY_METHODS.map((m) => [m, m])])),
      h('button', { class: 'btn wide', onclick: () => act(() => call('POST', `/api/orders/${o.id}/payment`, payDraft), 'Ödeme güncellendi.') }, 'Ödemeyi kaydet')));

    const shipCard = h('div', { class: 'card' }, h('h3', {}, 'Kargo'), canShip ? h('div', { class: 'stack' },
      field('Kargo firması', select(shipDraft, 'carrier', CARRIERS.map((c) => [c, c]))), field('Takip numarası', text(shipDraft, 'trackingNo', 'Örn. YK123456')),
      h('button', { class: 'btn wide', onclick: () => act(() => call('POST', `/api/orders/${o.id}/shipping`, shipDraft), o.status === 'shipped' ? 'Kargo bilgisi güncellendi.' : 'Sipariş kargoya verildi.') }, o.status === 'shipped' ? 'Kargo bilgisini güncelle' : 'Kargoya ver'))
      : h('p', { class: 'hint' }, o.carrier ? `${o.carrier} · ${o.tracking_no || 'takip no yok'}` : 'Kargo bilgisi yok.'));

    const invCard = h('div', { class: 'card' }, h('h3', {}, 'Fatura'), h('div', { class: 'stack' },
      o.invoice_no ? h('span', {}, h('b', {}, o.invoice_no), h('div', { class: 'hint' }, day(o.invoice_date))) : h('p', { class: 'hint' }, 'Henüz fatura kesilmedi.'),
      !o.invoice_no && o.status !== 'cancelled' ? h('button', { class: 'btn wide', onclick: () => act(() => call('POST', `/api/orders/${o.id}/invoice`), 'Fatura oluşturuldu.') }, 'Fatura oluştur') : null,
      h('button', { class: 'btn wide', onclick: () => printInvoice(o) }, o.invoice_no ? 'Faturayı yazdır' : 'Sipariş özetini yazdır')));

    const returnsCard = (() => {
      const existing = o.returns.map((r) => h('div', { class: 'ret-row' },
        h('div', {}, h('b', {}, `İade #${r.id}`), ' ', pill(r.status, RET[r.status]), h('div', { class: 'hint' }, `${r.reason || '—'} · ${money(r.refund_amount)}${r.note ? ' · ' + r.note : ''}`)),
        h('div', { class: 'btn-row', style: 'margin:0' }, ...({ requested: [['approved', 'Onayla'], ['rejected', 'Reddet']], approved: [['received', 'Teslim alındı'], ['rejected', 'Reddet']], received: [['refunded', 'İade yapıldı']] }[r.status] || [])
          .map(([s, l]) => btn(l, () => act(async () => { await call('PUT', `/api/returns/${r.id}`, { status: s }); return call('GET', `/api/orders/${o.id}`); }, `İade: ${RET[s]}`))))));
      const can = ['shipped', 'delivered'].includes(o.status);
      const suggested = o.items.reduce((s, i) => s + (Number(O.ret.qty[i.id]) || 0) * (i.line_total / i.quantity), 0);
      const form = can ? h('div', { class: 'stack ret-form' }, h('b', {}, 'Yeni iade talebi'),
        ...o.items.map((i) => h('label', { class: 'ret-line' }, h('span', {}, `${i.name} (en fazla ${i.quantity})`),
          h('input', { type: 'number', min: 0, max: i.quantity, value: O.ret.qty[i.id] || 0, oninput: (e) => { O.ret.qty[i.id] = e.target.value; const el = document.getElementById('ret-sug'); if (el) el.textContent = money(o.items.reduce((s, x) => s + (Number(O.ret.qty[x.id]) || 0) * (x.line_total / x.quantity), 0)); } }))),
        field('Neden', select(O.ret, 'reason', RETURN_REASONS.map((r) => [r, r]))), field('Not', text(O.ret, 'note', 'İsteğe bağlı')),
        field('İade tutarı (₺)', text(O.ret, 'amount', 'Boş bırakırsan ürün tutarı kullanılır', 'number', { step: '0.01' }), ''),
        h('p', { class: 'hint' }, 'Önerilen tutar: ', h('b', { id: 'ret-sug' }, money(suggested))),
        h('button', { class: 'btn wide', onclick: () => {
          const items = o.items.map((i) => ({ orderItemId: i.id, quantity: Number(O.ret.qty[i.id]) || 0 })).filter((i) => i.quantity > 0);
          act(() => call('POST', `/api/orders/${o.id}/returns`, { reason: O.ret.reason, note: O.ret.note, refundAmount: O.ret.amount, items }), 'İade talebi açıldı.').then(() => { O.ret = { reason: RETURN_REASONS[0], note: '', qty: {}, amount: '' }; });
        } }, 'İade talebi aç')) : h('p', { class: 'hint' }, 'İade yalnızca gönderilmiş veya teslim edilmiş siparişler için açılabilir.');
      return h('div', { class: 'card' }, h('h3', {}, 'İade'), ...(existing.length ? existing : [h('p', { class: 'hint' }, 'İade kaydı yok.')]), form);
    })();

    const noteCard = h('div', { class: 'card' }, h('h3', {}, 'Sipariş notu'), h('div', { class: 'stack' }, area(note, 'notes', 'Sipariş ile ilgili not…', 3),
      h('button', { class: 'btn wide', onclick: () => act(() => call('PUT', `/api/orders/${o.id}`, { notes: note.notes }), 'Not kaydedildi.') }, 'Notu kaydet')));

    return h('div', {},
      h('div', { class: 'row-between' }, h('div', {}, h('h3', { class: 'page-h' }, o.demo ? 'ÖRNEK sipariş' : `Sipariş #${o.order_no}`, o.demo ? h('span', { class: 'pill s-received', style: 'margin-left:8px' }, 'ÖRNEK') : null), h('div', { class: 'hint' }, o.demo ? 'Gösterim amaçlı örnek: gerçek müşteri ya da sipariş değildir, kaydedilmez, sayımlara girmez. Ödeme, kargo ve iade bölümlerini burada deneyebilirsin.' : `${fmt(o.created_at)} · ${CHANNEL[o.channel] || o.channel}`)),
        h('div', { class: 'btn-row', style: 'margin:0' }, pill(o.status, STATUS[o.status]), pill(o.payment_status, PAY[o.payment_status]),
          btn('‹ Listeye dön', () => { O.view = 'list'; O.detail = null; if (O.dirty) { O.dirty = false; refresh(); } else rerender(); }))),
      h('div', { class: 'product-layout' }, h('div', {}, items, customer, returnsCard, timeline), h('div', {}, statusCard, payCard, shipCard, invCard, noteCard)));
  }

  // ----- Sipariş oluşturma -----
  async function loadRefs() {
    const [customers, products] = await Promise.all([api('GET', '/api/customers'), api('GET', '/api/products')]);
    O.refs.customers = customers; O.refs.products = products;
  }
  const blankLine = () => ({ productId: '', variantId: '', quantity: 1, unitPrice: '', product: null });
  function newOrder(customerId) {
    O.refs.loaded = false; O.refs.loading = false;
    O.draft = {
      customerMode: 'existing', customerId: '', customer: { firstName: '', lastName: '', email: '', phone: '' }, shippingAddress: { fullName: '', phone: '', city: '', district: '', address: '', postalCode: '' },
      couponCode: '', shippingTotal: '', channel: 'manual', paymentStatus: 'pending', paymentMethod: '', notes: '', ignoreStock: false, needsFill: Boolean(customerId),
    };
    if (customerId) O.draft.customerId = customerId;
    O.lines = [blankLine()]; O.view = 'create'; O.priceResult = null; visit('siparisler'); rerender();
  }
  const priceNow = debounce(async () => {
    const box = document.getElementById('order-summary'); if (!box) return;
    const items = O.lines.filter((l) => l.productId && (l.variantId || !(l.product && l.product.variants.some((v) => v.name)))).map((l) => ({ productId: +l.productId, variantId: l.variantId ? +l.variantId : null, quantity: +l.quantity || 1, unitPrice: l.unitPrice }));
    if (!items.length) { box.replaceChildren(h('p', { class: 'hint' }, 'Ürün ekledikçe toplam burada hesaplanır.')); O.priceResult = null; return; }
    try {
      const p = await api('POST', '/api/orders/price', { items, couponCode: O.draft.couponCode, shippingTotal: O.draft.shippingTotal });
      O.priceResult = p;
      box.replaceChildren(
        h('div', { class: 'totals' },
          ...p.lines.map((l) => h('div', { class: 'hint' }, h('span', {}, `${l.quantity} × ${l.name}`), h('span', {}, money(l.lineTotal)))),
          h('div', {}, h('span', {}, 'Ara toplam'), h('span', {}, money(p.subtotal))),
          p.campaignTotal ? h('div', { class: 'good' }, h('span', {}, `Kampanya indirimi${[...new Set(p.lines.map((l) => l.campaignName).filter(Boolean))].length ? ` (${[...new Set(p.lines.map((l) => l.campaignName).filter(Boolean))].join(', ')})` : ''}`), h('span', {}, `-${money(p.campaignTotal)}`)) : null,
          p.couponDiscount ? h('div', { class: 'good' }, h('span', {}, `Kupon ${p.couponCode}`), h('span', {}, `-${money(p.couponDiscount)}`)) : null,
          p.freeShipping ? h('div', { class: 'good' }, h('span', {}, `Kupon ${p.couponCode}`), h('span', {}, 'Ücretsiz kargo')) : null,
          h('div', {}, h('span', {}, 'Kargo'), h('span', {}, money(p.shippingTotal))),
          h('div', { class: 'hint' }, h('span', {}, 'KDV (dahil)'), h('span', {}, money(p.taxTotal))),
          h('div', { class: 'grand' }, h('span', {}, 'Toplam'), h('span', {}, money(p.total)))));
    } catch (e) { O.priceResult = null; box.replaceChildren(h('p', { class: 'hint warn' }, e.message)); }
  }, 250);

  function orderForm() {
    if (ensure(O.refs, loadRefs)) return loadingCard('Müşteri ve ürünler yükleniyor…');
    const d = O.draft; if (!d) { O.view = 'list'; return orderList({ id: 'siparisler' }); }
    const pick = async (line, id) => {
      line.productId = id; line.variantId = ''; line.product = null;
      if (id) { try { line.product = await api('GET', `/api/products/${id}`); const named = line.product.variants.filter((v) => v.name); if (named.length === 1) line.variantId = named[0].id; } catch (e) { fail(e); } }
      rerender(); priceNow();
    };
    const applyCustomer = (id) => {
      d.customerId = id; const c = O.refs.customers.find((x) => String(x.id) === String(id));
      if (c) { const ad = (c.addresses || [])[0]; d.shippingAddress = ad ? { fullName: ad.fullName || `${c.first_name} ${c.last_name || ''}`.trim(), phone: ad.phone || c.phone || '', city: ad.city || '', district: ad.district || '', address: ad.address || '', postalCode: ad.postalCode || '' } : { ...d.shippingAddress, fullName: `${c.first_name} ${c.last_name || ''}`.trim(), phone: c.phone || '' }; }
    };
    const fillFromCustomer = (id) => { applyCustomer(id); rerender(); };
    if (d.needsFill) { d.needsFill = false; applyCustomer(d.customerId); }
    const custCard = h('div', { class: 'card' }, h('h3', {}, 'Müşteri'), h('div', { class: 'stack' },
      h('div', { class: 'seg' }, ...[['existing', 'Kayıtlı müşteri'], ['new', 'Yeni müşteri'], ['guest', 'Misafir']].map(([k, l]) => h('button', { class: d.customerMode === k ? 'on' : '', onclick: () => { d.customerMode = k; rerender(); } }, l))),
      d.customerMode === 'existing' ? field('Müşteri', select(d, 'customerId', [['', 'Seçiniz'], ...O.refs.customers.map((c) => [c.id, `${c.first_name} ${c.last_name || ''}${c.email ? ' · ' + c.email : ''}`])], () => fillFromCustomer(d.customerId))) : null,
      d.customerMode !== 'existing' ? row(field('Ad', text(d.customer, 'firstName')), field('Soyad', text(d.customer, 'lastName')), field('E-posta', text(d.customer, 'email', '', 'text')), field('Telefon', text(d.customer, 'phone'))) : null,
      d.customerMode === 'new' ? h('p', { class: 'hint' }, 'Yeni müşteri sipariş ile birlikte müşteri listesine eklenir (aynı e-posta varsa mevcut kayıt kullanılır).') : null));
    const addrCard = h('div', { class: 'card' }, h('h3', {}, 'Teslimat adresi'), h('div', { class: 'stack' },
      row(field('Ad soyad', text(d.shippingAddress, 'fullName')), field('Telefon', text(d.shippingAddress, 'phone'))),
      row(field('İl', text(d.shippingAddress, 'city')), field('İlçe', text(d.shippingAddress, 'district')), field('Posta kodu', text(d.shippingAddress, 'postalCode'))),
      field('Adres', area(d.shippingAddress, 'address', '', 2))));

    const lineRows = O.lines.map((l, i) => {
      const named = l.product ? l.product.variants.filter((v) => v.name) : [];
      return h('div', { class: 'line-row' },
        h('select', { onchange: (e) => pick(l, e.target.value) }, h('option', { value: '' }, 'Ürün seç'), ...O.refs.products.map((p) => h('option', { value: p.id, selected: String(l.productId) === String(p.id) }, `${p.name} · ${money(p.discount_price || p.sale_price)} · stok ${p.total_stock}`))),
        named.length ? h('select', { onchange: (e) => { l.variantId = e.target.value; priceNow(); rerender(); } }, h('option', { value: '' }, 'Varyant seç'), ...named.map((v) => h('option', { value: v.id, selected: String(l.variantId) === String(v.id) }, `${v.name} (stok ${v.stock_total})`))) : h('span', {}),
        h('input', { type: 'number', min: 1, value: l.quantity, title: 'Adet', oninput: (e) => { l.quantity = e.target.value; priceNow(); } }),
        h('input', { type: 'number', step: '0.01', min: 0, value: l.unitPrice, placeholder: 'Birim fiyat (ops.)', title: 'Elle fiyat girersen kampanya uygulanmaz', oninput: (e) => { l.unitPrice = e.target.value; priceNow(); } }),
        btn('×', () => { O.lines.splice(i, 1); if (!O.lines.length) O.lines.push(blankLine()); rerender(); priceNow(); }, 'danger'));
    });
    const itemsCard = h('div', { class: 'card' }, h('h3', {}, 'Ürünler'), ...lineRows, h('div', { class: 'btn-row' }, btn('+ Ürün ekle', () => { O.lines.push(blankLine()); rerender(); })));

    const summary = h('div', { class: 'card' }, h('h3', {}, 'Sipariş özeti'), h('div', { id: 'order-summary' }, h('p', { class: 'hint' }, 'Hesaplanıyor…')),
      h('div', { class: 'stack', style: 'margin-top:12px' },
        field('Kupon kodu', text(d, 'couponCode', 'Varsa kupon kodu', 'text', { oninput: (e) => { d.couponCode = e.target.value; priceNow(); } })),
        field('Kargo ücreti (₺)', text(d, 'shippingTotal', '0', 'number', { step: '0.01', min: '0', oninput: (e) => { d.shippingTotal = e.target.value; priceNow(); } })),
        field('Kanal', select(d, 'channel', CHANNELS)),
        field('Ödeme durumu', select(d, 'paymentStatus', Object.entries(PAY))), field('Ödeme yöntemi', select(d, 'paymentMethod', [['', 'Seçiniz'], ...PAY_METHODS.map((m) => [m, m])])),
        field('Not', area(d, 'notes', '', 2)), check(d, 'ignoreStock', 'Stok yetersiz olsa da siparişi oluştur'),
        h('button', { class: 'btn solid wide', disabled: O.busy, onclick: submitOrder }, 'Siparişi oluştur'),
        btn('Vazgeç', () => { O.view = 'list'; O.draft = null; rerender(); })));
    setTimeout(priceNow, 0);
    return h('div', {}, h('h3', { class: 'page-h' }, 'Yeni sipariş'), h('div', { class: 'product-layout' }, h('div', {}, custCard, addrCard, itemsCard), h('div', {}, summary)));
  }
  async function submitOrder() {
    const d = O.draft; if (O.busy) return;
    const items = O.lines.filter((l) => l.productId).map((l) => ({ productId: +l.productId, variantId: l.variantId ? +l.variantId : null, quantity: +l.quantity || 1, unitPrice: l.unitPrice }));
    if (!items.length) return toast('En az bir ürün ekle.', true);
    if (d.customerMode === 'existing' && !d.customerId) return toast('Müşteri seç ya da “Misafir / Yeni müşteri” kullan.', true);
    if (d.customerMode === 'new' && !String(d.customer.firstName).trim()) return toast('Yeni müşteri için ad gerekli.', true);
    O.busy = true;
    try {
      const body = { ...d, items, customerId: d.customerMode === 'existing' ? d.customerId : null, customer: d.customerMode === 'existing' ? undefined : d.customer, saveCustomer: d.customerMode === 'new' };
      O.detail = await api('POST', '/api/orders', body); O.view = 'detail'; O.draft = null; O.dirty = true; toast(`Sipariş #${O.detail.order_no} oluşturuldu.`);
    } catch (e) { fail(e); } finally { O.busy = false; rerender(); }
  }

  async function initOrders() { await Promise.all([loadFilters(), loadOrders()]); }
  function orders(page) {
    if (O.preset !== page.id) {
      O.preset = page.id; O.f = { ...blankFilter(), ...(PRESETS[page.id] || PRESETS.siparisler).f }; O.page = 0; O.selected.clear(); O.loaded = false; O.adv = false;
    }
    if (ensure(O, initOrders)) return loadingCard('Siparişler yükleniyor…');
    if (O.view === 'detail') return orderDetail();
    if (O.view === 'create') return orderForm();
    return orderList(page);
  }

  // =====================================================================
  //  İadeler
  // =====================================================================
  const R = { loaded: false, loading: false, rows: [], status: '' };
  async function loadReturns() { R.rows = await api('GET', '/api/returns'); }
  function returns() {
    if (ensure(R, loadReturns)) return loadingCard('İadeler yükleniyor…');
    const rows = R.rows.filter((r) => !R.status || r.status === R.status).map((r) => h('tr', {},
      h('td', {}, `#${r.id}`), h('td', {}, h('button', { class: 'link', onclick: () => openOrder(r.order_id) }, `#${r.order_no}`), h('div', { class: 'hint' }, r.customer_name || '')),
      h('td', {}, r.reason || '—', r.note ? h('div', { class: 'hint' }, r.note) : null), h('td', { class: 'num' }, money(r.refund_amount)), h('td', {}, pill(r.status, RET[r.status])), h('td', {}, fmt(r.created_at)),
      h('td', { class: 'actions' }, ...({ requested: [['approved', 'Onayla'], ['rejected', 'Reddet']], approved: [['received', 'Teslim alındı'], ['rejected', 'Reddet']], received: [['refunded', 'İade yapıldı']] }[r.status] || [])
        .map(([s, l]) => btn(l, async () => { try { await api('PUT', `/api/returns/${r.id}`, { status: s }); toast(`İade: ${RET[s]}`); R.loaded = false; O.dirty = true; rerender(); } catch (e) { fail(e); } })))));
    return h('div', {}, h('div', { class: 'toolbar' }, h('select', { onchange: (e) => { R.status = e.target.value; rerender(); } }, ...[['', 'Tüm durumlar'], ...Object.entries(RET)].map(([v, l]) => h('option', { value: v, selected: R.status === v }, l)))),
      h('div', { class: 'card' }, table(['İade', 'Sipariş', 'Neden', 'Tutar', 'Durum', 'Tarih', ''], rows, 'İade kaydı yok. İade, sipariş detayından açılır.')));
  }

  // =====================================================================
  //  Müşteriler
  // =====================================================================
  const C = { loaded: false, loading: false, list: [], tags: [], q: '', tag: '', segment: '', view: 'list', draft: null, detail: null, editId: null, busy: false };
  async function loadCustomers() {
    const [list, tags] = await Promise.all([api('GET', `/api/customers?${qs({ q: C.q, tag: C.tag, segment: C.segment })}`), api('GET', '/api/customer-tags')]);
    C.list = list; C.tags = tags;
  }
  const reloadCustomers = async () => { try { await loadCustomers(); } catch (e) { fail(e); } rerender(); };
  const fullName = (c) => `${c.first_name} ${c.last_name || ''}`.trim();
  const tagChip = (name) => { const t = C.tags.find((x) => x.name === name); return h('span', { class: 'chip', style: t ? `background:${t.color}` : '' }, name); };
  const blankCustomer = () => ({ firstName: '', lastName: '', email: '', phone: '', company: '', taxNo: '', taxOffice: '', tags: [], notes: '', acceptsMarketing: false, addresses: [] });

  async function openCustomer(id) {
    try { C.detail = await api('GET', `/api/customers/${id}`); if (!C.loaded) await loadCustomers().catch(() => {}); C.view = 'detail'; visit('musteriler'); rerender(); } catch (e) { fail(e); }
  }
  function editCustomer(c) {
    C.editId = c ? c.id : null;
    C.draft = c ? { firstName: c.first_name, lastName: c.last_name || '', email: c.email || '', phone: c.phone || '', company: c.company || '', taxNo: c.tax_no || '', taxOffice: c.tax_office || '', tags: [...(c.tags || [])], notes: c.notes || '', acceptsMarketing: !!c.accepts_marketing, addresses: (c.addresses || []).map((a) => ({ ...a })) } : blankCustomer();
    C.view = 'form'; rerender();
  }
  async function saveCustomer() {
    const d = C.draft; if (!String(d.firstName).trim()) return toast('Müşteri adı gerekli.', true);
    if (C.busy) return; C.busy = true;
    try {
      const saved = C.editId ? await api('PUT', `/api/customers/${C.editId}`, d) : await api('POST', '/api/customers', d);
      toast(C.editId ? 'Müşteri güncellendi.' : 'Müşteri eklendi.'); C.detail = saved; C.view = 'detail'; await loadCustomers();
    } catch (e) { fail(e); } finally { C.busy = false; rerender(); }
  }
  function customerForm() {
    const d = C.draft;
    const tagPick = h('div', { class: 'chips' }, ...C.tags.map((t) => h('button', { class: `chip-toggle ${d.tags.includes(t.name) ? 'on' : ''}`, onclick: () => { d.tags = d.tags.includes(t.name) ? d.tags.filter((x) => x !== t.name) : [...d.tags, t.name]; rerender(); } }, t.name)),
      C.tags.length ? null : h('span', { class: 'hint' }, 'Etiket yok. Müşteriler → Etiketler bölümünden ekleyebilirsin.'));
    const addrs = d.addresses.map((a, i) => h('div', { class: 'addr-card' }, row(field('Başlık', text(a, 'title', 'Ev, İş…')), field('Ad soyad', text(a, 'fullName')), field('Telefon', text(a, 'phone'))),
      row(field('İl', text(a, 'city')), field('İlçe', text(a, 'district')), field('Posta kodu', text(a, 'postalCode'))), field('Adres', area(a, 'address', '', 2)), btn('Adresi sil', () => { d.addresses.splice(i, 1); rerender(); }, 'danger')));
    return h('div', {}, h('h3', { class: 'page-h' }, C.editId ? 'Müşteriyi düzenle' : 'Yeni müşteri'), h('div', { class: 'product-layout' },
      h('div', {}, h('div', { class: 'card' }, h('h3', {}, 'Kişi bilgileri'), h('div', { class: 'stack' },
        row(field('Ad *', text(d, 'firstName')), field('Soyad', text(d, 'lastName'))), row(field('E-posta', text(d, 'email')), field('Telefon', text(d, 'phone'))),
        row(field('Firma', text(d, 'company')), field('Vergi dairesi', text(d, 'taxOffice')), field('Vergi / TC no', text(d, 'taxNo'))), field('Not', area(d, 'notes', 'Müşteri hakkında not…', 3)))),
      h('div', { class: 'card' }, h('h3', {}, 'Adresler'), ...addrs, h('div', { class: 'btn-row' }, btn('+ Adres ekle', () => { d.addresses.push({ title: '', fullName: '', phone: '', city: '', district: '', address: '', postalCode: '' }); rerender(); })))),
      h('div', {}, h('div', { class: 'card' }, h('h3', {}, 'Etiketler'), tagPick, h('div', { class: 'stack', style: 'margin-top:12px' }, check(d, 'acceptsMarketing', 'Pazarlama iletisine izin verdi'))),
        h('div', { class: 'card' }, h('div', { class: 'stack' }, h('button', { class: 'btn solid wide', disabled: C.busy, onclick: saveCustomer }, C.editId ? 'Değişiklikleri kaydet' : 'Müşteriyi kaydet'),
          btn('Vazgeç', () => { C.view = C.editId && C.detail ? 'detail' : 'list'; rerender(); }, 'wide'))))));
  }
  function customerDetail() {
    const c = C.detail; if (!c) { C.view = 'list'; return customerList(); }
    const addrs = (c.addresses || []).map((a) => h('div', { class: 'addr-card' }, h('b', {}, a.title || 'Adres'), h('div', { class: 'hint' }, `${a.fullName ? a.fullName + ' · ' : ''}${a.phone || ''}`), h('div', {}, addressLine(a))));
    const ord = c.orders.map((o) => h('tr', {}, h('td', {}, h('button', { class: 'link', onclick: () => openOrder(o.id) }, `#${o.order_no}`)), h('td', {}, fmt(o.created_at)), h('td', {}, pill(o.status, STATUS[o.status])), h('td', {}, pill(o.payment_status, PAY[o.payment_status])), h('td', { class: 'num' }, money(o.total))));
    return h('div', {}, h('div', { class: 'row-between' }, h('h3', { class: 'page-h' }, fullName(c)), h('div', { class: 'btn-row', style: 'margin:0' },
      btn('Düzenle', () => editCustomer(c)), btn('Sipariş oluştur', () => newOrder(c.id), 'solid'),
      btn('‹ Listeye dön', () => { C.view = 'list'; C.detail = null; rerender(); }))),
      h('div', { class: 'product-layout' }, h('div', {}, h('div', { class: 'card' }, h('h3', {}, 'Sipariş geçmişi'), table(['Sipariş', 'Tarih', 'Durum', 'Ödeme', 'Tutar'], ord, 'Bu müşterinin siparişi yok.')),
        h('div', { class: 'card' }, h('h3', {}, 'Adresler'), ...(addrs.length ? addrs : [h('p', { class: 'hint' }, 'Kayıtlı adres yok.')]))),
      h('div', {}, h('div', { class: 'card' }, h('h3', {}, 'Özet'), h('div', { class: 'kv' },
        h('span', {}, 'Toplam harcama: ', h('b', {}, money(c.total_spent))), h('span', {}, 'Sipariş sayısı: ', h('b', {}, c.order_count)), h('span', {}, 'Son sipariş: ', h('b', {}, day(c.last_order))),
        c.email ? h('span', {}, c.email) : null, c.phone ? h('span', {}, c.phone) : null, c.company ? h('span', {}, `${c.company}${c.tax_no ? ' · ' + c.tax_no : ''}`) : null,
        h('span', { class: 'hint' }, c.accepts_marketing ? 'Pazarlama iletisine izinli' : 'Pazarlama izni yok'))),
      h('div', { class: 'card' }, h('h3', {}, 'Etiketler'), h('div', { class: 'chips' }, ...((c.tags || []).length ? c.tags.map(tagChip) : [h('span', { class: 'hint' }, 'Etiket yok.')]))),
      c.notes ? h('div', { class: 'card' }, h('h3', {}, 'Not'), h('p', {}, c.notes)) : null,
      h('div', { class: 'card' }, btn('Müşteriyi sil', async () => {
        if (!confirmDo(`${fullName(c)} silinsin mi? Siparişleri silinmez, misafir olarak kalır.`)) return;
        try { await api('DELETE', `/api/customers/${c.id}`); toast('Müşteri silindi.'); C.view = 'list'; C.detail = null; await reloadCustomers(); } catch (e) { fail(e); }
      }, 'danger wide')))));
  }
  function customerList() {
    const load = () => reloadCustomers();
    const rows = C.list.map((c) => h('tr', {}, h('td', {}, h('button', { class: 'link', onclick: () => openCustomer(c.id) }, fullName(c)), c.company ? h('div', { class: 'hint' }, c.company) : null),
      h('td', {}, c.email || '—', c.phone ? h('div', { class: 'hint' }, c.phone) : null), h('td', {}, h('div', { class: 'chips', style: 'margin:0' }, ...(c.tags || []).map(tagChip))),
      h('td', {}, c.order_count), h('td', { class: 'num' }, money(c.total_spent)), h('td', {}, day(c.last_order)), h('td', { class: 'actions' }, btn('Düzenle', () => editCustomer(c)))));
    return h('div', {}, h('div', { class: 'toolbar' },
      h('input', { type: 'search', class: 'search', placeholder: 'İsim, e-posta, telefon, firma ara…', value: C.q, onkeydown: (e) => { if (e.key === 'Enter') { C.q = e.target.value; load(); } }, onchange: (e) => { C.q = e.target.value; load(); } }),
      h('select', { onchange: (e) => { C.tag = e.target.value; load(); } }, h('option', { value: '' }, 'Tüm etiketler'), ...C.tags.map((t) => h('option', { value: t.name, selected: C.tag === t.name }, t.name))),
      h('select', { onchange: (e) => { C.segment = e.target.value; load(); } }, ...[['', 'Tüm müşteriler'], ['buyers', 'Alışveriş yapanlar'], ['repeat', 'Tekrar alışveriş yapanlar'], ['new', 'Henüz sipariş vermeyenler'], ['marketing', 'Pazarlama izni olanlar']].map(([v, l]) => h('option', { value: v, selected: C.segment === v }, l))),
      h('button', { class: 'btn solid', onclick: () => editCustomer(null) }, '+ Yeni müşteri')),
      h('div', { class: 'card' }, table(['Müşteri', 'İletişim', 'Etiketler', 'Sipariş', 'Harcama', 'Son sipariş', ''], rows, 'Müşteri yok. “+ Yeni müşteri” ile ekle.'), h('div', { class: 'list-foot' }, h('span', { class: 'muted' }, `${C.list.length} müşteri`))));
  }
  function customers() {
    if (ensure(C, loadCustomers)) return loadingCard('Müşteriler yükleniyor…');
    if (C.view === 'form') return customerForm();
    if (C.view === 'detail') return customerDetail();
    return customerList();
  }

  // =====================================================================
  //  Müşteri etiketleri
  // =====================================================================
  const T = { loaded: false, loading: false, tags: [], draft: { name: '', color: '#e9ccff' }, editId: null };
  async function loadTags() { T.tags = await api('GET', '/api/customer-tags'); }
  function customerTags() {
    if (ensure(T, loadTags)) return loadingCard('Etiketler yükleniyor…');
    const reload = async () => { await loadTags().catch(fail); C.loaded = false; rerender(); };
    const d = T.draft;
    const form = h('div', { class: 'card' }, h('h3', {}, T.editId ? 'Etiketi düzenle' : 'Yeni etiket'), h('div', { class: 'inline-add' }, text(d, 'name', 'Örn. VIP, Toptan, Kurumsal'),
      h('input', { type: 'color', value: d.color, oninput: (e) => { d.color = e.target.value; } }),
      h('button', { class: 'btn solid small', onclick: async () => {
        if (!d.name.trim()) return toast('Etiket adı gerekli.', true);
        try { T.editId ? await api('PUT', `/api/customer-tags/${T.editId}`, d) : await api('POST', '/api/customer-tags', d); toast(T.editId ? 'Etiket güncellendi.' : 'Etiket eklendi.'); T.draft = { name: '', color: '#e9ccff' }; T.editId = null; await reload(); } catch (e) { fail(e); }
      } }, T.editId ? 'Güncelle' : '+ Etiket ekle'), T.editId ? btn('Vazgeç', () => { T.editId = null; T.draft = { name: '', color: '#e9ccff' }; rerender(); }) : null));
    const rows = T.tags.map((t) => h('tr', {}, h('td', {}, h('span', { class: 'chip', style: `background:${t.color}` }, t.name)), h('td', {}, t.customer_count),
      h('td', { class: 'actions' }, btn('Düzenle', () => { T.editId = t.id; T.draft = { name: t.name, color: t.color }; rerender(); }),
        btn('Sil', async () => { if (!confirmDo(`"${t.name}" etiketi silinsin mi? Müşterilerden de kaldırılır.`)) return; try { await api('DELETE', `/api/customer-tags/${t.id}`); toast('Etiket silindi.'); await reload(); } catch (e) { fail(e); } }, 'danger'))));
    return h('div', {}, form, h('div', { class: 'card' }, table(['Etiket', 'Müşteri sayısı', ''], rows, 'Henüz etiket yok.')));
  }

  // =====================================================================
  //  Kuponlar
  // =====================================================================
  const K = { loaded: false, loading: false, list: [], draft: null, editId: null };
  async function loadCoupons() { K.list = await api('GET', '/api/coupons'); }
  const dateState = (x) => { const n = Date.now(); if (!x.is_active) return ['archived', 'Pasif']; if (x.starts_at && new Date(x.starts_at) > n) return ['draft', 'Planlandı']; if (x.ends_at && new Date(x.ends_at) < n) return ['archived', 'Süresi doldu']; return ['active', 'Aktif']; };
  const discountLabel = (x) => (x.type === 'percent' ? `%${x.value}` : x.type === 'fixed' ? money(x.value) : 'Ücretsiz kargo');
  const range = (x) => (x.starts_at || x.ends_at ? `${day(x.starts_at)} → ${x.ends_at ? day(x.ends_at) : 'süresiz'}` : 'Süresiz');
  function coupons() {
    if (ensure(K, loadCoupons)) return loadingCard('Kuponlar yükleniyor…');
    const reload = async () => { await loadCoupons().catch(fail); rerender(); };
    const edit = (x) => { K.editId = x ? x.id : null; K.draft = x ? { code: x.code, description: x.description || '', type: x.type, value: x.value, minOrderTotal: x.min_order_total, maxUses: x.max_uses ?? '', startsAt: localInput(x.starts_at), endsAt: localInput(x.ends_at), isActive: x.is_active } : { code: '', description: '', type: 'percent', value: '', minOrderTotal: '', maxUses: '', startsAt: '', endsAt: '', isActive: true }; rerender(); };
    if (K.draft) {
      const d = K.draft;
      return h('div', {}, h('div', { class: 'card' }, h('h3', {}, K.editId ? 'Kuponu düzenle' : 'Yeni kupon'), h('div', { class: 'stack' },
        row(field('Kupon kodu *', text(d, 'code', 'Örn. HOSGELDIN10', 'text', { oninput: (e) => { e.target.value = e.target.value.toUpperCase().replace(/\s+/g, ''); d.code = e.target.value; } })),
          field('İndirim türü', select(d, 'type', [['percent', 'Yüzde (%)'], ['fixed', 'Sabit tutar (₺)'], ['free_shipping', 'Ücretsiz kargo']], rerender)),
          d.type !== 'free_shipping' ? field(d.type === 'percent' ? 'İndirim (%)' : 'İndirim (₺)', text(d, 'value', '', 'number', { step: '0.01', min: '0' })) : null),
        row(field('Minimum sipariş tutarı (₺)', text(d, 'minOrderTotal', '0', 'number', { min: '0' })), field('Toplam kullanım limiti', text(d, 'maxUses', 'Sınırsız', 'number', { min: '1' }))),
        row(field('Başlangıç', text(d, 'startsAt', '', 'datetime-local')), field('Bitiş', text(d, 'endsAt', '', 'datetime-local'))),
        field('Açıklama', area(d, 'description', 'İç notu (müşteri görmez)', 2)), check(d, 'isActive', 'Kupon aktif'),
        h('div', { class: 'btn-row' }, h('button', { class: 'btn solid', onclick: async () => {
          try { K.editId ? await api('PUT', `/api/coupons/${K.editId}`, d) : await api('POST', '/api/coupons', d); toast(K.editId ? 'Kupon güncellendi.' : 'Kupon oluşturuldu.'); K.draft = null; K.editId = null; await reload(); } catch (e) { fail(e); }
        } }, 'Kaydet'), btn('Vazgeç', () => { K.draft = null; K.editId = null; rerender(); })))));
    }
    const rows = K.list.map((x) => { const [st, label] = dateState(x); return h('tr', {}, h('td', {}, h('b', {}, x.code), x.description ? h('div', { class: 'hint' }, x.description) : null), h('td', {}, discountLabel(x), Number(x.min_order_total) ? h('div', { class: 'hint' }, `min. ${money(x.min_order_total)}`) : null),
      h('td', {}, `${x.used_count}${x.max_uses != null ? ' / ' + x.max_uses : ''}`), h('td', {}, range(x)), h('td', {}, pill(st, label)),
      h('td', { class: 'actions' }, btn('Düzenle', () => edit(x)), btn(x.is_active ? 'Kapat' : 'Aç', async () => { try { await api('PUT', `/api/coupons/${x.id}`, { code: x.code, description: x.description, type: x.type, value: x.value, minOrderTotal: x.min_order_total, maxUses: x.max_uses, startsAt: x.starts_at, endsAt: x.ends_at, isActive: !x.is_active }); await reload(); } catch (e) { fail(e); } }),
        btn('Sil', async () => { if (!confirmDo(`${x.code} kuponu silinsin mi?`)) return; try { await api('DELETE', `/api/coupons/${x.id}`); toast('Kupon silindi.'); await reload(); } catch (e) { fail(e); } }, 'danger'))); });
    return h('div', {}, h('div', { class: 'toolbar' }, h('button', { class: 'btn solid', onclick: () => edit(null) }, '+ Yeni kupon')),
      h('div', { class: 'card' }, table(['Kod', 'İndirim', 'Kullanım', 'Geçerlilik', 'Durum', ''], rows, 'Henüz kupon yok.')));
  }

  // =====================================================================
  //  Kampanyalar (siparişe otomatik uygulanır)
  // =====================================================================
  const G = { loaded: false, loading: false, list: [], cats: [], prods: [], draft: null, editId: null };
  async function loadCampaigns() { const [list, cats, prods] = await Promise.all([api('GET', '/api/campaigns'), api('GET', '/api/definitions/categories'), api('GET', '/api/products')]); G.list = list; G.cats = cats; G.prods = prods; }
  const scopeLabel = (x) => (x.scope === 'all' ? 'Tüm ürünler' : x.scope === 'category' ? `Kategori: ${x.scope_ids.map((id) => (G.cats.find((c) => c.id === id) || {}).name).filter(Boolean).join(', ') || '—'}` : `Ürün: ${x.scope_ids.map((id) => (G.prods.find((p) => p.id === id) || {}).name).filter(Boolean).join(', ') || '—'}`);
  function campaigns() {
    if (ensure(G, loadCampaigns)) return loadingCard('Kampanyalar yükleniyor…');
    const reload = async () => { await loadCampaigns().catch(fail); rerender(); };
    const edit = (x) => { G.editId = x ? x.id : null; G.draft = x ? { name: x.name, description: x.description || '', type: x.type, value: x.value, scope: x.scope, scopeIds: [...x.scope_ids], minOrderTotal: x.min_order_total, startsAt: localInput(x.starts_at), endsAt: localInput(x.ends_at), isActive: x.is_active } : { name: '', description: '', type: 'percent', value: '', scope: 'all', scopeIds: [], minOrderTotal: '', startsAt: '', endsAt: '', isActive: true }; rerender(); };
    if (G.draft) {
      const d = G.draft; const src = d.scope === 'category' ? G.cats.map((c) => [c.id, c.name]) : G.prods.map((p) => [p.id, p.name]);
      return h('div', {}, h('div', { class: 'card' }, h('h3', {}, G.editId ? 'Kampanyayı düzenle' : 'Yeni kampanya'), h('div', { class: 'stack' },
        field('Kampanya adı *', text(d, 'name', 'Örn. Mumlarda %20 indirim')),
        row(field('İndirim türü', select(d, 'type', [['percent', 'Yüzde (%)'], ['fixed', 'Ürün başına sabit tutar (₺)']])), field('İndirim değeri', text(d, 'value', '', 'number', { step: '0.01', min: '0' })), field('Min. sepet tutarı (₺)', text(d, 'minOrderTotal', '0', 'number', { min: '0' }))),
        field('Uygulanacağı yer', select(d, 'scope', [['all', 'Tüm ürünler'], ['category', 'Seçili kategoriler'], ['product', 'Seçili ürünler']], () => { d.scopeIds = []; rerender(); })),
        d.scope !== 'all' ? h('div', { class: 'chips' }, ...src.map(([id, name]) => h('button', { class: `chip-toggle ${d.scopeIds.includes(id) ? 'on' : ''}`, onclick: () => { d.scopeIds = d.scopeIds.includes(id) ? d.scopeIds.filter((x) => x !== id) : [...d.scopeIds, id]; rerender(); } }, name))) : null,
        row(field('Başlangıç', text(d, 'startsAt', '', 'datetime-local')), field('Bitiş', text(d, 'endsAt', '', 'datetime-local'))),
        field('Açıklama', area(d, 'description', 'İç notu', 2)), check(d, 'isActive', 'Kampanya aktif'),
        h('p', { class: 'hint' }, 'Aktif kampanyalar siparişlere otomatik uygulanır. Bir ürüne birden fazla kampanya uyuyorsa en yüksek indirim geçerli olur. Elle fiyat girilen satırlara kampanya uygulanmaz.'),
        h('div', { class: 'btn-row' }, h('button', { class: 'btn solid', onclick: async () => {
          try { G.editId ? await api('PUT', `/api/campaigns/${G.editId}`, d) : await api('POST', '/api/campaigns', d); toast(G.editId ? 'Kampanya güncellendi.' : 'Kampanya oluşturuldu.'); G.draft = null; G.editId = null; await reload(); } catch (e) { fail(e); }
        } }, 'Kaydet'), btn('Vazgeç', () => { G.draft = null; G.editId = null; rerender(); })))));
    }
    const rows = G.list.map((x) => { const [st, label] = dateState(x); return h('tr', {}, h('td', {}, h('b', {}, x.name), x.description ? h('div', { class: 'hint' }, x.description) : null), h('td', {}, x.type === 'percent' ? `%${x.value}` : `${money(x.value)} / ürün`), h('td', {}, scopeLabel(x)), h('td', {}, range(x)), h('td', {}, pill(st, label)),
      h('td', { class: 'actions' }, btn('Düzenle', () => edit(x)), btn(x.is_active ? 'Kapat' : 'Aç', async () => { try { await api('PUT', `/api/campaigns/${x.id}`, { name: x.name, description: x.description, type: x.type, value: x.value, scope: x.scope, scopeIds: x.scope_ids, minOrderTotal: x.min_order_total, startsAt: x.starts_at, endsAt: x.ends_at, isActive: !x.is_active }); await reload(); } catch (e) { fail(e); } }),
        btn('Sil', async () => { if (!confirmDo(`"${x.name}" kampanyası silinsin mi?`)) return; try { await api('DELETE', `/api/campaigns/${x.id}`); toast('Kampanya silindi.'); await reload(); } catch (e) { fail(e); } }, 'danger'))); });
    return h('div', {}, h('div', { class: 'toolbar' }, h('button', { class: 'btn solid', onclick: () => edit(null) }, '+ Yeni kampanya')),
      h('div', { class: 'card' }, table(['Kampanya', 'İndirim', 'Kapsam', 'Geçerlilik', 'Durum', ''], rows, 'Henüz kampanya yok.')));
  }

  function onPage(page) {
    if (page.id !== lastPage) {
      if (!keep) { O.view = 'list'; O.detail = null; O.draft = null; C.view = 'list'; C.detail = null; C.draft = null; K.draft = null; G.draft = null; }
      lastPage = page.id;
    }
  }

  // Dashboard'dan: siparişleri verilen filtreyle aç
  function ordersWith(f) {
    O.preset = 'siparisler'; O.f = { ...blankFilter(), ...f }; O.page = 0; O.selected.clear(); O.loaded = false; O.adv = false; O.view = 'list'; O.detail = null;
    visit('siparisler'); rerender();
  }

  return { orders, returns, customers, customerTags, coupons, campaigns, onPage, newOrder: () => newOrder(), openOrder, ordersWith };
};
