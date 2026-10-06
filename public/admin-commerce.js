// Ticaret modülleri: Tanımlamalar, Ürünler, Stok. admin.js'in yardımcılarıyla çalışır.
window.GoatzCommerce = (ctx) => {
  const { h, request, toast, rerender } = ctx;

  const api = (method, url, data) => request(url, { method, body: data === undefined ? undefined : JSON.stringify(data) });
  const fail = (e) => toast(e.message || 'Bir hata oluştu.', true);
  const money = (n) => (n == null ? '—' : '₺' + Number(n).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  const loadingCard = (t) => h('div', { class: 'card' }, h('p', { class: 'muted' }, t));
  const STATUS = { draft: 'Taslak', active: 'Aktif', archived: 'Arşiv' };

  // ----- form yardımcıları: girdiler doğrudan nesneye bağlanır -----
  const field = (label, input, hint) => h('label', { class: 'field' }, h('span', {}, label), input, hint ? h('p', { class: 'hint' }, hint) : null);
  const text = (o, k, ph = '', type = 'text', extra = {}) => h('input', { type, placeholder: ph, value: o[k] ?? '', oninput: (e) => { o[k] = e.target.value; }, ...extra });
  const area = (o, k, ph = '', rows = 4) => h('textarea', { rows, placeholder: ph, oninput: (e) => { o[k] = e.target.value; } }, o[k] ?? '');
  const select = (o, k, options, onchange) => h('select', { onchange: (e) => { o[k] = e.target.value; if (onchange) onchange(); } },
    ...options.map(([v, l]) => h('option', { value: v, selected: String(o[k] ?? '') === String(v) }, l)));
  const check = (o, k, label) => h('label', { class: 'check-row' }, h('input', { type: 'checkbox', checked: !!o[k], onchange: (e) => { o[k] = e.target.checked; } }), h('span', {}, label));
  const row = (...kids) => h('div', { class: 'grid-form' }, ...kids);
  const table = (head, rows, empty) => h('div', { class: 'table-wrap' }, h('table', { class: 'data-table' },
    h('thead', {}, h('tr', {}, ...head.map((x) => h('th', {}, x)))),
    h('tbody', {}, rows.length ? rows : h('tr', {}, h('td', { colspan: head.length, class: 'muted' }, empty || 'Kayıt yok.')))));
  const counter = (val, max) => h('span', { class: 'hint' }, `${(val || '').length}/${max}`);

  // =====================================================================
  //  Tanımlamalar
  // =====================================================================
  const D = { loaded: false, loading: false, tab: 'brands', draft: {}, editId: null, valueDraft: {} };
  const data = { brands: [], categories: [], properties: [], taxes: [], warehouses: [], productTags: [] };

  async function loadDefs() {
    const [brands, categories, properties, taxes, warehouses, productTags] = await Promise.all([
      api('GET', '/api/definitions/brands'), api('GET', '/api/definitions/categories'), api('GET', '/api/definitions/properties'),
      api('GET', '/api/definitions/tax-rates'), api('GET', '/api/definitions/warehouses'),
      api('GET', '/api/definitions/product-tags').catch(() => []),
    ]);
    Object.assign(data, { brands, categories, properties, taxes, warehouses, productTags });
  }
  function ensure(state, loader) {
    if (state.loaded) return false;
    if (!state.loading) {
      state.loading = true;
      loader().catch(fail).finally(() => { state.loading = false; state.loaded = true; rerender(); });
    }
    return true;
  }
  const reloadDefs = async () => { try { await loadDefs(); } catch (e) { fail(e); } rerender(); };

  // Kategori ağacı: ana kategoriler üstte, alt kategoriler ana kategorinin altında (ada göre sıralı).
  const catOpen = new Set();
  function catTree(onlyOpen) {
    const ids = new Set(data.categories.map((c) => c.id)), kids = {};
    for (const c of data.categories) { const k = c.parent_id && ids.has(c.parent_id) ? c.parent_id : 0; (kids[k] = kids[k] || []).push(c); }
    for (const k of Object.keys(kids)) kids[k].sort((a, b) => a.name.localeCompare(b.name, 'tr'));
    const out = [], seen = new Set();
    const walk = (pid, depth) => { for (const c of kids[pid] || []) {
      if (seen.has(c.id)) continue; seen.add(c.id);
      const n = (kids[c.id] || []).length; out.push({ ...c, depth, kidCount: n });
      if (n && (!onlyOpen || catOpen.has(c.id))) walk(c.id, depth + 1);
    } };
    walk(0, 0); return out;
  }
  const parentName = (id) => (data.categories.find((c) => c.id === id) || {}).name || '—';
  const DEF_TABS = {
    brands: {
      label: 'Markalar', url: 'brands', noun: 'Marka', list: () => data.brands,
      head: ['Marka', 'Adres', 'Açıklama'], cells: (r) => [r.name, '/' + r.slug, r.description || '—'],
      form: (d) => [field('Marka adı', text(d, 'name', 'Örn. Goatz')), field('Açıklama', area(d, 'description', '', 3))],
      toDraft: (r) => ({ name: r.name, description: r.description || '' }),
    },
    categories: {
      label: 'Kategoriler', url: 'categories', noun: 'Kategori', list: () => catTree(true), total: () => data.categories.length,
      rowClick: (r) => { if (!r.kidCount) return; catOpen.has(r.id) ? catOpen.delete(r.id) : catOpen.add(r.id); rerender(); },
      head: ['Kategori', 'Üst kategori', 'Adres'],
      cells: (r) => [h('span', { class: 'cat-name', style: `padding-left:${r.depth * 22}px` },
        r.kidCount ? h('span', { class: 'cat-arrow' + (catOpen.has(r.id) ? ' open' : ''), 'aria-hidden': 'true' }, '▸') : h('span', { class: 'cat-arrow none' }),
        r.name, r.kidCount ? h('span', { class: 'cat-badge', title: 'Alt kategori sayısı' }, String(r.kidCount)) : null),
        r.parent_id ? parentName(r.parent_id) : '—', '/' + r.slug],
      form: (d, id) => [field('Kategori adı', text(d, 'name', 'Örn. Mumlar')),
        field('Üst kategori', select(d, 'parentId', [['', 'Ana kategori'], ...catTree(false).filter((c) => c.id !== id).map((c) => [c.id, '\u00a0\u00a0'.repeat(c.depth) + (c.depth ? '↳ ' : '') + c.name])])),
        field('Açıklama', area(d, 'description', '', 3))],
      toDraft: (r) => ({ name: r.name, parentId: r.parent_id || '', description: r.description || '' }),
    },
    taxes: {
      label: 'Vergi Oranları', url: 'tax-rates', noun: 'Vergi oranı', list: () => data.taxes,
      head: ['Ad', 'Oran'], cells: (r) => [r.name, '%' + r.rate],
      form: (d) => [field('Ad', text(d, 'name', 'Örn. KDV %20')), field('Oran (%)', text(d, 'rate', '20', 'number', { step: '0.01' }))],
      toDraft: (r) => ({ name: r.name, rate: r.rate }),
    },
    productTags: {
      label: 'Etiketler', url: 'product-tags', noun: 'Etiket', list: () => data.productTags,
      head: ['Etiket', 'Ürün sayısı'], cells: (r) => [r.name, String(r.product_count ?? 0)],
      form: (d) => [field('Etiket adı', text(d, 'name', 'Örn. Yeni sezon, İndirimde'), 'Ürün etiketleridir; müşteri etiketlerinden ayrıdır. Yeniden adlandırınca ürünlerdeki adı da değişir.')],
      toDraft: (r) => ({ name: r.name }),
    },
    warehouses: {
      label: 'Depolar', url: 'warehouses', noun: 'Depo', list: () => data.warehouses,
      head: ['Depo', 'Adres', 'Varsayılan'], cells: (r) => [r.name, r.address || '—', r.is_default ? 'Evet' : '—'],
      form: (d) => [field('Depo adı', text(d, 'name', 'Örn. Merkez Depo')), field('Adres', area(d, 'address', '', 3)), check(d, 'isDefault', 'Varsayılan depo')],
      toDraft: (r) => ({ name: r.name, address: r.address || '', isDefault: !!r.is_default }),
    },
  };

  function propertiesTab() {
    const pd = D.propDraft || (D.propDraft = { name: '', inputType: 'select' });
    const list = data.properties.map((p) => {
      const vd = D.valueDraft[p.id] || (D.valueDraft[p.id] = { value: '', colorHex: '' });
      return h('div', { class: 'card' },
        h('div', { class: 'row-between' }, h('h3', {}, p.name),
          h('button', { class: 'btn small danger', onclick: async () => {
            if (!confirm(`"${p.name}" ve tüm değerleri silinsin mi?`)) return;
            try { await api('DELETE', `/api/definitions/properties/${p.id}`); toast('Özellik silindi.'); await reloadDefs(); } catch (e) { fail(e); }
          } }, 'Sil')),
        h('div', { class: 'chips' }, ...(p.values.length ? p.values.map((v) => h('span', { class: 'chip' },
          v.color_hex ? h('i', { class: 'swatch', style: `background:${v.color_hex}` }) : null, v.value,
          h('button', { class: 'chip-x', title: 'Sil', onclick: async () => {
            try { await api('DELETE', `/api/definitions/property-values/${v.id}`); await reloadDefs(); } catch (e) { fail(e); }
          } }, '×'))) : [h('span', { class: 'muted' }, 'Henüz değer yok.')])),
        h('div', { class: 'inline-add' },
          text(vd, 'value', 'Yeni değer (Örn. Siyah, M)'),
          h('input', { type: 'color', title: 'Renk (isteğe bağlı)', value: vd.colorHex || '#000000', oninput: (e) => { vd.colorHex = e.target.value; } }),
          h('button', { class: 'btn small solid', onclick: async () => {
            if (!vd.value.trim()) return toast('Değer yazmalısın.', true);
            try {
              await api('POST', '/api/definitions/property-values', { propertyId: p.id, value: vd.value.trim(), colorHex: vd.colorHex || null });
              D.valueDraft[p.id] = { value: '', colorHex: '' }; await reloadDefs();
            } catch (e) { fail(e); }
          } }, '+ Değer ekle')));
    });
    return h('div', {},
      h('div', { class: 'card' }, h('h3', {}, 'Yeni özellik'),
        row(field('Özellik adı', text(pd, 'name', 'Örn. Renk, Beden, Boyut')),
          field('Tür', select(pd, 'inputType', [['select', 'Seçim listesi'], ['color', 'Renk'], ['text', 'Metin']]))),
        h('button', { class: 'btn solid', onclick: async () => {
          if (!pd.name.trim()) return toast('Özellik adı gerekli.', true);
          try { await api('POST', '/api/definitions/properties', { name: pd.name.trim(), inputType: pd.inputType }); D.propDraft = null; toast('Özellik eklendi.'); await reloadDefs(); } catch (e) { fail(e); }
        } }, '+ Özellik ekle')),
      ...list, data.properties.length ? null : h('p', { class: 'muted' }, 'Renk, Beden gibi özellikler tanımla; ürün formunda bu değerlerden varyant üretebilirsin.'));
  }

  function definitions(page) {
    if (page && page.tab && D.tabInit !== page.id) { D.tab = page.tab; D.tabInit = page.id; D.draft = {}; D.editId = null; }
    if (ensure(D, loadDefs)) return loadingCard('Tanımlamalar yükleniyor…');
    const ORDER = [['brands', 'Markalar'], ['categories', 'Kategoriler'], ['properties', 'Özellikler'], ['taxes', 'Vergi Oranları'], ['productTags', 'Etiketler'], ['warehouses', 'Depolar']];
    const tabs = h('div', { class: 'seg tabs-row' }, ...ORDER.map(([k, l]) => h('button', { class: D.tab === k ? 'on' : '', onclick: () => { D.tab = k; D.draft = {}; D.editId = null; rerender(); } }, l)));
    if (D.tab === 'properties') return h('div', {}, tabs, propertiesTab());

    const t = DEF_TABS[D.tab];
    const items = t.list();
    const reset = () => { D.draft = {}; D.editId = null; };
    const saveBtn = h('button', { class: 'btn solid', onclick: async () => {
      const body = { ...D.draft };
      if (!String(body.name || '').trim()) return toast('Ad gerekli.', true);
      try {
        if (D.editId) await api('PUT', `/api/definitions/${t.url}/${D.editId}`, body); else await api('POST', `/api/definitions/${t.url}`, body);
        toast(D.editId ? `${t.noun} güncellendi.` : `${t.noun} eklendi.`); reset(); await reloadDefs();
      } catch (e) { fail(e); }
    } }, D.editId ? 'Güncelle' : `+ ${t.noun} ekle`);

    const rows = items.map((r) => h('tr', t.rowClick ? { class: r.kidCount ? 'row-toggle' : '', onclick: () => t.rowClick(r) } : {}, ...t.cells(r).map((c) => h('td', {}, c)),
      h('td', { class: 'actions', onclick: (e) => e.stopPropagation() },
        h('button', { class: 'btn small', onclick: () => { D.editId = r.id; D.draft = t.toDraft(r); rerender(); } }, 'Düzenle'),
        h('button', { class: 'btn small danger', onclick: async () => {
          if (!confirm(`"${r.name}" silinsin mi?`)) return;
          try { await api('DELETE', `/api/definitions/${t.url}/${r.id}`); toast(`${t.noun} silindi.`); if (D.editId === r.id) reset(); await reloadDefs(); } catch (e) { fail(e); }
        } }, 'Sil'))));

    return h('div', {}, tabs,
      h('div', { class: 'card' }, h('h3', {}, D.editId ? `${t.noun} düzenle` : `Yeni ${t.noun.toLowerCase()}`),
        h('div', { class: 'stack' }, ...t.form(D.draft, D.editId)),
        h('div', { class: 'btn-row' }, saveBtn, D.editId ? h('button', { class: 'btn', onclick: () => { reset(); rerender(); } }, 'Vazgeç') : null)),
      h('div', { class: 'card' }, h('h3', {}, `${t.label} (${t.total ? t.total() : items.length})`), table([...t.head, ''], rows, `Henüz ${t.noun.toLowerCase()} yok.`)));
  }

  // =====================================================================
  //  Ürünler
  // =====================================================================
  const P = { loaded: false, loading: false, list: [], view: 'list', q: '', status: '', selected: new Set(), draft: null, gen: {}, busy: false };

  async function loadProducts() {
    const [list] = await Promise.all([api('GET', '/api/products'), loadDefs()]);
    P.list = list;
  }
  const reloadProducts = async () => { try { P.list = await api('GET', '/api/products'); } catch (e) { fail(e); } rerender(); };

  const blankDraft = () => ({
    name: '', slug: '', description: '', brandId: '', categoryId: '', taxRateId: (data.taxes.find((t) => Number(t.rate) === 20) || data.taxes[0] || {}).id || '', sku: '', barcode: '',
    purchasePrice: '', salePrice: '', discountPrice: '', weight: '', desi: '', status: 'draft', isPublished: false,
    seoTitle: '', seoDescription: '', seoKeywords: '', tags: [], images: [], variants: [], stock: '', warehouseId: (data.warehouses.find((w) => w.is_default) || data.warehouses[0] || {}).id || '',
  });

  async function openProduct(id) {
    try {
      const p = await api('GET', `/api/products/${id}`);
      const d = blankDraft();
      Object.assign(d, {
        id: p.id, name: p.name, slug: p.slug, description: p.description || '', brandId: p.brand_id || '', categoryId: p.category_id || '', taxRateId: p.tax_rate_id || '',
        sku: p.sku || '', barcode: p.barcode || '', purchasePrice: p.purchase_price ?? '', salePrice: p.sale_price ?? '', discountPrice: p.discount_price ?? '',
        weight: p.weight ?? '', desi: p.desi ?? '', status: p.status, isPublished: p.is_published, seoTitle: p.seo_title || '', seoDescription: p.seo_description || '',
        seoKeywords: p.seo_keywords || '', tags: Array.isArray(p.tags) ? p.tags.slice() : [], images: Array.isArray(p.images) ? p.images : [],
      });
      const named = p.variants.filter((v) => v.name);
      if (named.length) {
        d.variants = named.map((v) => ({ id: v.id, name: v.name, sku: v.sku, barcode: v.barcode || '', salePrice: v.sale_price ?? '', discountPrice: v.discount_price ?? '',
          stock: v.stock[0] ? v.stock[0].quantity : 0, warehouseId: v.stock[0] ? v.stock[0].warehouse_id : d.warehouseId }));
      } else if (p.variants[0]) {
        d.stock = p.variants[0].stock[0] ? p.variants[0].stock[0].quantity : 0;
        if (p.variants[0].stock[0]) d.warehouseId = p.variants[0].stock[0].warehouse_id;
      }
      P.draft = d; P.view = 'form'; P.gen = {}; rerender();
    } catch (e) { fail(e); }
  }

  async function saveProduct() {
    const d = P.draft;
    if (!d.name.trim()) return toast('Ürün adı gerekli.', true);
    if (d.salePrice === '' || Number(d.salePrice) < 0) return toast('Satış fiyatı gerekli.', true);
    if (d.discountPrice !== '' && Number(d.discountPrice) > Number(d.salePrice)) return toast('İndirimli fiyat satış fiyatından büyük olamaz.', true);
    if (P.busy) return;
    P.busy = true;
    try {
      const body = { ...d, isPublished: d.status === 'active' && d.isPublished };
      if (d.id) await api('PUT', `/api/products/${d.id}`, body); else await api('POST', '/api/products', body);
      toast(d.id ? 'Ürün güncellendi.' : 'Ürün eklendi.');
      P.view = 'list'; P.draft = null; await reloadProducts();
    } catch (e) { fail(e); } finally { P.busy = false; }
  }

  async function uploadImages(files) {
    for (const f of files) {
      if (!/^image\/(png|jpeg|webp|gif)$/.test(f.type)) { toast(`${f.name}: yalnızca PNG, JPG, WEBP, GIF.`, true); continue; }
      const dataUrl = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f); });
      try { const { url } = await api('POST', '/api/upload', { data: dataUrl }); P.draft.images.push(url); } catch (e) { fail(e); }
    }
    rerender();
  }

  // Yan yana görseller; işaretçi olaylarıyla (fare + dokunmatik) sürükle-bırak sıralama.
  function sortableThumbs(d) {
    const wrap = h('div', { class: 'thumbs sortable' });
    d.images.forEach((u, i) => wrap.append(h('div', { class: 'thumb', 'data-i': i },
      h('img', { src: u, alt: '', draggable: 'false' }),
      i === 0 ? h('span', { class: 'badge' }, 'Ana görsel') : null,
      h('span', { class: 'grip', title: 'Sürükle' }, '⠿'),
      h('button', { class: 'mini x', title: 'Kaldır', onpointerdown: (e) => e.stopPropagation(), onclick: () => { d.images.splice(i, 1); rerender(); } }, '×'))));
    let drag = null;
    wrap.addEventListener('pointerdown', (e) => {
      const el = e.target.closest('.thumb'); if (!el || e.button > 0 || e.target.closest('button')) return;
      drag = { el, id: e.pointerId, x: e.clientX, y: e.clientY, on: false, from: [...wrap.children].indexOf(el) };
    });
    wrap.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.on) {
        if (Math.hypot(dx, dy) < 6) return;
        drag.on = true; try { wrap.setPointerCapture(e.pointerId); } catch (_) {}
        drag.el.classList.add('dragging'); wrap.classList.add('is-dragging');
      }
      e.preventDefault();
      drag.el.style.transform = `translate(${dx}px,${dy}px)`;
      drag.el.style.pointerEvents = 'none';
      const over = document.elementFromPoint(e.clientX, e.clientY);
      const t = over && over.closest ? over.closest('.thumb') : null;
      if (t && t !== drag.el && t.parentNode === wrap) {
        const kids = [...wrap.children], ti = kids.indexOf(t), di = kids.indexOf(drag.el);
        const r0 = drag.el.getBoundingClientRect();
        wrap.insertBefore(drag.el, ti > di ? t.nextSibling : t);
        // DOM yer değiştirince başlangıç noktasını yeni yere göre düzelt (sıçrama olmasın)
        const r1 = drag.el.getBoundingClientRect();
        drag.x += r1.left - r0.left; drag.y += r1.top - r0.top;
        drag.el.style.transform = `translate(${e.clientX - drag.x}px,${e.clientY - drag.y}px)`;
      }
    });
    const end = () => {
      if (!drag) return; const { el, on } = drag; drag = null;
      if (!on) return;
      el.style.transform = ''; el.style.pointerEvents = ''; el.classList.remove('dragging'); wrap.classList.remove('is-dragging');
      const order = [...wrap.children].map((c) => Number(c.dataset.i));
      if (order.some((v, i) => v !== i)) { d.images = order.map((i) => d.images[i]); rerender(); }
    };
    wrap.addEventListener('pointerup', end); wrap.addEventListener('pointercancel', end);
    return wrap;
  }

  function generateVariants() {
    const d = P.draft;
    const groups = data.properties.map((p) => ({ p, vals: p.values.filter((v) => (P.gen[p.id] || new Set()).has(v.id)) })).filter((g) => g.vals.length);
    if (!groups.length) return toast('Önce en az bir özellik değeri seç.', true);
    let combos = [[]];
    for (const g of groups) combos = combos.flatMap((c) => g.vals.map((v) => [...c, v]));
    if (combos.length > 100) return toast('En fazla 100 kombinasyon üretilebilir.', true);
    const base = (d.sku || d.name || 'URUN').toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '');
    const short = (s) => s.toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, 4);
    let added = 0;
    for (const c of combos) {
      const name = c.map((v) => v.value).join(' / ');
      if (d.variants.some((v) => v.name === name)) continue;
      d.variants.push({ name, sku: `${base}-${c.map((v) => short(v.value)).join('-')}`, barcode: '', salePrice: '', discountPrice: '', stock: 0, warehouseId: d.warehouseId });
      added++;
    }
    toast(added ? `${added} varyant üretildi.` : 'Bu kombinasyonlar zaten var.'); rerender();
  }

  function refreshSerp() {
    const el = document.getElementById('serp'); const d = P.draft;
    if (!el || !d) return;
    const slug = (d.slug || d.name || 'urun-adi').toLowerCase().replace(/[^a-z0-9ğüşıöç]+/g, '-');
    el.children[0].textContent = `goatz.com › urun › ${slug}`;
    el.children[1].textContent = d.seoTitle || d.name || 'Ürün başlığı';
    el.children[2].textContent = d.seoDescription || plain(d.description).slice(0, 155) || 'Ürün açıklaması burada görünür.';
  }

  // Zengin metin editörü: taslak değişmesin diye her çizimde yeniden kurulur, içerik d.description'da tutulur.
  function descEditor(d) {
    if (!window.GoatzRich) return area(d, 'description', 'Ürün detayları, içerik, kullanım…', 6);
    const ed = window.GoatzRich.create({
      value: d.description || '', minHeight: 240,
      onChange: (html) => { d.description = html; refreshSerp(); },
      onUpload: async (f) => {
        if (!/^image\/(png|jpeg|webp|gif)$/.test(f.type)) throw new Error('Yalnızca PNG, JPG, WEBP, GIF.');
        const dataUrl = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f); });
        return (await api('POST', '/api/upload', { data: dataUrl })).url;
      },
    });
    // field() bir <label>; tıklamalar editöre odaklanmasın diye div sarmalayıcı kullan
    return h('div', { class: 'rte-wrap' }, ed.el);
  }
  const plain = (html) => { const t = document.createElement('div'); t.innerHTML = (window.GoatzRich ? window.GoatzRich.sanitize(html || '') : html || ''); return (t.textContent || '').replace(/\s+/g, ' ').trim(); };

  // Etiket alanı: yaz, Enter veya virgülle çip ekle; × ile sil; mevcut etiketler datalist önerisi.
  function tagsInput(d) {
    const wrap = h('div', { class: 'tag-input' });
    const listId = 'ptag-list';
    const add = (raw) => {
      for (const part of String(raw).split(',')) {
        const s = part.replace(/\s+/g, ' ').trim().slice(0, 100);
        if (s && !d.tags.some((t) => t.toLocaleLowerCase('tr') === s.toLocaleLowerCase('tr'))) d.tags.push(s);
      }
    };
    const input = h('input', { type: 'text', list: listId, placeholder: d.tags.length ? 'Etiket ekle…' : 'Etiket yaz, Enter veya virgülle ekle', maxlength: 100,
      onkeydown: (e) => {
        if (e.key === 'Enter' || e.key === ',') {
          e.preventDefault();
          if (input.value.trim()) { add(input.value); rerender(); setTimeout(() => { const n = document.querySelector('.tag-input input'); if (n) n.focus(); }, 0); }
        } else if (e.key === 'Backspace' && !input.value && d.tags.length) { d.tags.pop(); rerender(); setTimeout(() => { const n = document.querySelector('.tag-input input'); if (n) n.focus(); }, 0); }
      },
      onchange: () => { if (input.value.trim()) { add(input.value); setTimeout(rerender, 0); } } });
    const dl = h('datalist', { id: listId }, ...data.productTags.filter((t) => !d.tags.some((x) => x.toLocaleLowerCase('tr') === t.name.toLocaleLowerCase('tr'))).map((t) => h('option', { value: t.name })));
    wrap.append(...d.tags.map((t, i) => h('span', { class: 'chip' }, t, h('button', { type: 'button', class: 'chip-x', title: 'Sil', onclick: () => { d.tags.splice(i, 1); rerender(); } }, '×'))), input, dl);
    return wrap;
  }

  function productForm() {
    const d = P.draft;
    const opts = (list, label = 'Seçiniz') => [['', label], ...list];
    const catOpts = opts(catTree(false).map((c) => [c.id, '\u00a0\u00a0'.repeat(c.depth) + (c.depth ? '↳ ' : '') + c.name]));
    const snippetTitle = d.seoTitle || d.name || 'Ürün başlığı';
    const snippetSlug = (d.slug || d.name || 'urun-adi').toLowerCase().replace(/[^a-z0-9ğüşıöç]+/g, '-');
    const snippetDesc = d.seoDescription || plain(d.description).slice(0, 155) || 'Ürün açıklaması burada görünür.';

    const basic = h('div', { class: 'card' }, h('h3', {}, '1 · Ürün bilgileri'), h('div', { class: 'stack' },
      field('Ürün adı *', text(d, 'name', 'Örn. Seramik Kaplı Soya Mumu', 'text', { oninput: (e) => { d.name = e.target.value; refreshSerp(); } })),
      row(field('Marka', select(d, 'brandId', opts(data.brands.map((b) => [b.id, b.name]), 'Marka seç'))), field('Kategori', select(d, 'categoryId', catOpts))),
      h('div', { class: 'field' }, h('span', {}, 'Etiketler'), tagsInput(d), h('p', { class: 'hint' }, 'Enter veya virgülle ekle. Etiket listesini Tanımlamalar → Etiketler’den yönetebilirsin.')),
      h('div', { class: 'field' }, h('span', {}, 'Açıklama'), descEditor(d))));

    const priceCard = h('div', { class: 'card' }, h('h3', {}, '2 · Fiyat ve vergi'), h('div', { class: 'stack' },
      row(field('Satış fiyatı (₺) *', text(d, 'salePrice', '0,00', 'number', { step: '0.01', min: '0' })), field('İndirimli fiyat (₺)', text(d, 'discountPrice', '', 'number', { step: '0.01', min: '0' }))),
      row(field('Alış maliyeti (₺)', text(d, 'purchasePrice', '', 'number', { step: '0.01', min: '0' })),
        field('KDV oranı', select(d, 'taxRateId', opts(data.taxes.map((t) => [t.id, `${t.name}`]), 'Vergi seç'))))));

    const simpleStock = d.variants.length ? null : row(
      field('Stok adedi', text(d, 'stock', '0', 'number', { min: '0', step: '1' })),
      field('Depo', select(d, 'warehouseId', data.warehouses.map((w) => [w.id, w.name]))));
    const stockCard = h('div', { class: 'card' }, h('h3', {}, '3 · Stok ve lojistik'), h('div', { class: 'stack' },
      row(field('SKU (stok kodu)', text(d, 'sku', 'Örn. MUM-001')), field('Barkod', text(d, 'barcode', 'EAN / UPC'))),
      row(field('Ağırlık (kg)', text(d, 'weight', '', 'number', { step: '0.001', min: '0' })), field('Desi', text(d, 'desi', '', 'number', { step: '0.001', min: '0' }))),
      simpleStock, d.variants.length ? h('p', { class: 'hint' }, 'Varyant kullanıldığında stok her varyant satırında ayrı girilir.') : null));

    const genBox = h('div', { class: 'gen-box' }, data.properties.length
      ? [h('p', { class: 'hint' }, 'Kombinasyon üretmek için özellik değerlerini seç (Örn. Renk: Siyah, Beyaz × Beden: S, M).'),
        ...data.properties.filter((p) => p.values.length).map((p) => h('div', { class: 'gen-group' }, h('b', {}, p.name),
          h('div', { class: 'chips' }, ...p.values.map((v) => {
            const set = P.gen[p.id] || (P.gen[p.id] = new Set());
            return h('label', { class: 'chip pick' }, h('input', { type: 'checkbox', checked: set.has(v.id), onchange: (e) => { e.target.checked ? set.add(v.id) : set.delete(v.id); } }),
              v.color_hex ? h('i', { class: 'swatch', style: `background:${v.color_hex}` }) : null, v.value);
          })))),
        h('button', { class: 'btn small solid', onclick: generateVariants }, 'Kombinasyonları üret')]
      : h('p', { class: 'hint' }, 'Varyant üretmek için önce Tanımlamalar → Özellikler bölümünde Renk/Beden gibi özellikler ve değerleri ekle.'));

    const vrows = d.variants.map((v, i) => h('tr', {},
      h('td', {}, text(v, 'name', 'Varyant')), h('td', {}, text(v, 'sku', 'SKU')), h('td', {}, text(v, 'barcode', 'Barkod')),
      h('td', {}, text(v, 'salePrice', d.salePrice || 'Ürün fiyatı', 'number', { step: '0.01', min: '0' })),
      h('td', {}, text(v, 'stock', '0', 'number', { min: '0', step: '1' })),
      h('td', {}, select(v, 'warehouseId', data.warehouses.map((w) => [w.id, w.name]))),
      h('td', {}, h('button', { class: 'btn small danger', onclick: () => { d.variants.splice(i, 1); rerender(); } }, '×'))));
    const variantsCard = h('div', { class: 'card' }, h('h3', {}, '4 · Varyantlar'), genBox,
      d.variants.length ? table(['Varyant', 'SKU', 'Barkod', 'Fiyat (₺)', 'Stok', 'Depo', ''], vrows) : h('p', { class: 'hint' }, 'Varyant yok: ürün tek başına satılır.'),
      h('div', { class: 'btn-row' }, h('button', { class: 'btn small', onclick: () => { d.variants.push({ name: '', sku: '', barcode: '', salePrice: '', discountPrice: '', stock: 0, warehouseId: d.warehouseId }); rerender(); } }, '+ Elle varyant ekle')));

    const seoCard = h('div', { class: 'card' }, h('h3', {}, '5 · SEO ve meta bilgileri'), h('div', { class: 'stack' },
      field('SEO başlığı (title)', text(d, 'seoTitle', 'Boş bırakırsan ürün adı kullanılır', 'text', { maxlength: 70, oninput: (e) => { d.seoTitle = e.target.value; refreshSerp(); } }), 'Google’da görünen başlık. 60 karakter civarı ideal.'),
      field('Meta açıklaması (description)', h('textarea', { rows: 3, placeholder: 'Arama sonuçlarında başlığın altında görünür.', oninput: (e) => { d.seoDescription = e.target.value; refreshSerp(); } }, d.seoDescription || ''), '150–160 karakter ideal.'),
      row(field('Sayfa adresi (slug)', text(d, 'slug', 'Boş bırakırsan üründen üretilir', 'text', { oninput: (e) => { d.slug = e.target.value; refreshSerp(); } })), field('Anahtar kelimeler', text(d, 'seoKeywords', 'virgülle ayır: mum, soya, seramik'))),
      h('div', { class: 'serp', id: 'serp' }, h('div', { class: 'serp-url' }, `goatz.com › urun › ${snippetSlug}`), h('div', { class: 'serp-title' }, snippetTitle), h('div', { class: 'serp-desc' }, snippetDesc))));

    const imgs = h('div', { class: 'card' }, h('h3', {}, 'Görseller'),
      d.images.length ? sortableThumbs(d) : h('p', { class: 'hint' }, 'Henüz görsel yok. İlk görsel ana görsel olur.'),
      d.images.length > 1 ? h('p', { class: 'hint' }, 'Sırayı değiştirmek için görseli sürükleyin (dokunmatikte alttaki ⠿ tutamacından). İlk görsel ana görsel ve liste küçük resmidir.') : null,
      h('label', { class: 'btn small', style: 'margin-top:10px' }, '+ Görsel yükle', h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp,image/gif', multiple: true, hidden: true, onchange: (e) => uploadImages([...e.target.files]) })));

    const publish = h('div', { class: 'card' }, h('h3', {}, 'Yayın'), h('div', { class: 'stack' },
      field('Durum', select(d, 'status', Object.entries(STATUS), rerender)),
      d.status === 'active' ? check(d, 'isPublished', 'Mağazada göster') : h('p', { class: 'hint' }, 'Yalnızca “Aktif” ürünler mağazada yayınlanabilir.'),
      h('button', { class: 'btn solid wide', disabled: P.busy, onclick: saveProduct }, d.id ? 'Değişiklikleri kaydet' : 'Ürünü kaydet'),
      h('button', { class: 'btn wide', onclick: () => { P.view = 'list'; P.draft = null; rerender(); } }, 'Listeye dön')));

    return h('div', {}, h('div', { class: 'row-between' }, h('h3', { class: 'page-h' }, d.id ? 'Ürünü düzenle' : 'Yeni ürün')),
      h('div', { class: 'product-layout' }, h('div', {}, basic, imgs, priceCard, stockCard, variantsCard, seoCard), h('div', {}, publish)));
  }

  function productList() {
    const q = P.q.trim().toLocaleLowerCase('tr');
    const items = P.list.filter((p) => (!P.status || p.status === P.status)
      && (!q || [p.name, p.sku, p.brand_name, p.category_name, ...(p.tags || [])].some((x) => (x || '').toLocaleLowerCase('tr').includes(q))));
    const allSel = items.length && items.every((p) => P.selected.has(p.id));
    const bulk = async (action, label) => {
      const ids = [...P.selected]; if (!ids.length) return;
      if (action === 'delete' && !confirm(`${ids.length} ürün kalıcı olarak silinsin mi?`)) return;
      try { await api('POST', '/api/products/bulk', { ids, action }); toast(`${ids.length} ürün: ${label}.`); P.selected.clear(); await reloadProducts(); } catch (e) { fail(e); }
    };
    const rows = items.map((p) => h('tr', {},
      h('td', {}, h('input', { type: 'checkbox', checked: P.selected.has(p.id), onchange: (e) => { e.target.checked ? P.selected.add(p.id) : P.selected.delete(p.id); rerender(); } })),
      h('td', { class: 'prod-cell' },
        (() => { const u = Array.isArray(p.images) ? p.images[0] : null; return u ? h('img', { class: 'prod-thumb', src: u, alt: '', loading: 'lazy' }) : h('span', { class: 'prod-thumb empty', 'aria-hidden': 'true' }); })(),
        h('div', {}, h('button', { class: 'link', onclick: () => openProduct(p.id) }, p.name), p.sku ? h('div', { class: 'hint' }, p.sku) : null,
          Array.isArray(p.tags) && p.tags.length ? h('div', { class: 'chips tiny' }, ...p.tags.slice(0, 4).map((t) => h('span', { class: 'chip' }, t)), p.tags.length > 4 ? h('span', { class: 'hint' }, `+${p.tags.length - 4}`) : null) : null)),
      h('td', {}, p.brand_name || '—'), h('td', {}, p.category_name || '—'),
      h('td', {}, p.discount_price ? h('span', {}, h('s', { class: 'muted' }, money(p.sale_price)), ' ', money(p.discount_price)) : money(p.sale_price)),
      h('td', {}, p.total_stock), h('td', {}, p.variant_count > 1 || p.named_variants ? p.variant_count : '—'),
      h('td', {}, h('span', { class: `pill ${p.status}` }, STATUS[p.status] || p.status)),
      h('td', { class: 'actions' }, h('button', { class: 'btn small', onclick: () => openProduct(p.id) }, 'Düzenle'))));
    return h('div', {},
      h('div', { class: 'toolbar' },
        h('input', { type: 'search', class: 'search', placeholder: 'Ürün, SKU, marka, etiket ara…', value: P.q, oninput: (e) => { P.q = e.target.value; const pos = e.target.selectionStart; rerender(); const n = document.querySelector('.search'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } } }),
        h('select', { onchange: (e) => { P.status = e.target.value; rerender(); } }, ...[['', 'Tüm durumlar'], ...Object.entries(STATUS)].map(([v, l]) => h('option', { value: v, selected: P.status === v }, l))),
        h('button', { class: 'btn solid', onclick: () => { P.draft = blankDraft(); P.view = 'form'; P.gen = {}; rerender(); } }, '+ Yeni ürün')),
      P.selected.size ? h('div', { class: 'bulkbar' }, h('b', {}, `${P.selected.size} seçili`),
        h('button', { class: 'btn small', onclick: () => bulk('active', 'aktif yapıldı') }, 'Aktif yap'), h('button', { class: 'btn small', onclick: () => bulk('draft', 'taslağa alındı') }, 'Taslağa al'),
        h('button', { class: 'btn small', onclick: () => bulk('archived', 'arşivlendi') }, 'Arşivle'), h('button', { class: 'btn small danger', onclick: () => bulk('delete', 'silindi') }, 'Sil')) : null,
      h('div', { class: 'card' }, table([h('input', { type: 'checkbox', checked: !!allSel, onchange: (e) => { items.forEach((p) => (e.target.checked ? P.selected.add(p.id) : P.selected.delete(p.id))); rerender(); } }), 'Ürün', 'Marka', 'Kategori', 'Fiyat', 'Stok', 'Varyant', 'Durum', ''], rows,
        P.list.length ? 'Aramanla eşleşen ürün yok.' : 'Henüz ürün yok. “+ Yeni ürün” ile ilk ürününü ekle.')));
  }

  function products() {
    if (ensure(P, loadProducts)) return loadingCard('Ürünler yükleniyor…');
    return P.view === 'form' && P.draft ? productForm() : productList();
  }

  // =====================================================================
  //  Stok
  // =====================================================================
  const S = { loaded: false, loading: false, rows: [], q: '' };
  async function loadStock() { S.rows = await api('GET', '/api/stock'); }
  function stock() {
    if (ensure(S, loadStock)) return loadingCard('Stok yükleniyor…');
    const q = S.q.trim().toLocaleLowerCase('tr');
    const rows = S.rows.filter((r) => !q || `${r.product_name} ${r.variant_name || ''} ${r.sku || ''}`.toLocaleLowerCase('tr').includes(q));
    const tr = rows.map((r) => {
      const d = { qty: r.quantity };
      return h('tr', {}, h('td', {}, r.product_name, r.variant_name ? h('div', { class: 'hint' }, r.variant_name) : null), h('td', {}, r.sku || '—'), h('td', {}, r.warehouse_name),
        h('td', {}, text(d, 'qty', '0', 'number', { min: '0', step: '1', class: 'qty' })),
        h('td', { class: 'actions' }, h('button', { class: 'btn small solid', onclick: async () => {
          try { await api('POST', '/api/stock', { variantId: r.variant_id, warehouseId: r.warehouse_id, quantity: parseInt(d.qty, 10) || 0 }); toast('Stok güncellendi.'); S.loaded = false; rerender(); } catch (e) { fail(e); }
        } }, 'Kaydet')));
    });
    return h('div', {}, h('div', { class: 'toolbar' }, h('input', { type: 'search', class: 'search', placeholder: 'Ürün veya SKU ara…', value: S.q, oninput: (e) => { S.q = e.target.value; const pos = e.target.selectionStart; rerender(); const n = document.querySelector('.search'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } } })),
      h('div', { class: 'card' }, table(['Ürün', 'SKU', 'Depo', 'Adet', ''], tr, 'Stok kaydı yok. Önce ürün ekle.')));
  }

  return { definitions, products, stock, ui: { api, fail, money, field, text, area, select, check, row, table, ensure, loadingCard } };
};
