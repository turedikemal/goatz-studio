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
  // ----- SEO kartı (ürün ve kategori): slug, başlık, açıklama, gelişmiş ayarlar, canlı Google önizlemesi -----
  const SEO_DOMAIN = 'thegoatzstudio.com';
  const trSlug = (t) => String(t || '').replace(/[çğıİöşüÇĞÖŞÜ]/g, (c) => ({ ç: 'c', ğ: 'g', ı: 'i', İ: 'i', ö: 'o', ş: 's', ü: 'u', Ç: 'c', Ğ: 'g', Ö: 'o', Ş: 's', Ü: 'u' }[c]))
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 185);
  let seoRefresh = null;
  // d: taslak (name, slug, seoTitle, seoDescription, seoNoindex, seoCanonical); fallbackDesc: boş açıklama için öneri metni
  function seoCard(d, fallbackDesc, extra) {
    const cnt = (el, n) => { el.textContent = `${n}/`; };
    const slugCnt = h('span', { class: 'hint' }), titleCnt = h('span', { class: 'hint' }), descCnt = h('span', { class: 'hint' });
    const pvUrl = h('div', { class: 'serp-url' }), pvTitle = h('div', { class: 'serp-title' }), pvDesc = h('div', { class: 'serp-desc' });
    const slugPh = () => trSlug(d.name) || 'adres';
    const update = () => {
      const slug = trSlug(d.slug) || slugPh();
      slugCnt.textContent = `${(d.slug || '').length}/185`; titleCnt.textContent = `${(d.seoTitle || '').length}/256`; descCnt.textContent = `${(d.seoDescription || '').length}/320`;
      pvUrl.textContent = `${SEO_DOMAIN} › ${slug}`;
      pvTitle.textContent = d.seoTitle || d.name || 'Sayfa başlığı';
      pvDesc.textContent = d.seoDescription || (fallbackDesc ? fallbackDesc() : '') || 'Açıklama arama sonuçlarında başlığın altında görünür.';
      slugIn.placeholder = slugPh(); titleIn.placeholder = d.name || 'Boş bırakırsan ad kullanılır'; descIn.placeholder = (fallbackDesc ? fallbackDesc() : '') || 'Arama sonuçlarında başlığın altında görünür.';
    };
    const slugIn = h('input', { type: 'text', value: d.slug || '', maxlength: 185, oninput: (e) => { d.slug = e.target.value; update(); },
      onblur: (e) => { if (e.target.value.trim()) { d.slug = trSlug(e.target.value); e.target.value = d.slug; update(); } } });
    const titleIn = h('input', { type: 'text', value: d.seoTitle || '', maxlength: 256, oninput: (e) => { d.seoTitle = e.target.value; update(); } });
    const descIn = h('textarea', { rows: 4, maxlength: 320, oninput: (e) => { d.seoDescription = e.target.value; update(); } }, d.seoDescription || '');
    // Canonical: "/" önekli giriş, Enter veya Ekle ile eklenir (tek adres)
    const canBox = h('div', { class: 'seo-can' });
    const drawCan = () => {
      const inp = h('input', { type: 'text', placeholder: 'urun-adresi veya https://…', 'aria-label': 'Canonical URL',
        onkeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } } });
      const add = () => {
        let t = inp.value.trim(); if (!t) return;
        if (!/^https?:\/\//i.test(t)) t = '/' + t.replace(/^\/+/, '');
        d.seoCanonical = t; drawCan();
      };
      canBox.replaceChildren(d.seoCanonical
        ? h('span', { class: 'chip' }, d.seoCanonical, h('button', { type: 'button', class: 'chip-x', title: 'Kaldır', onclick: () => { d.seoCanonical = ''; drawCan(); } }, '×'))
        : h('div', { class: 'seo-pre' }, h('span', { class: 'seo-slash' }, '/'), inp, h('button', { type: 'button', class: 'btn small', onclick: add }, 'Ekle')));
    };
    drawCan();
    const adv = h('details', { class: 'seo-adv', open: !!(d.seoNoindex || d.seoCanonical) },
      h('summary', {}, 'Gelişmiş SEO Ayarları'),
      h('div', { class: 'stack' },
        check(d, 'seoNoindex', 'Bu sayfayı arama motorlarının taramasını engelle'),
        h('div', { class: 'field' }, h('span', {}, 'Canonical URL'), canBox, h('p', { class: 'hint' }, 'Aynı içerik başka adreste varsa asıl adresi yaz. Boş bırakırsan sayfanın kendi adresi sayılır.'))));
    const left = h('div', { class: 'stack' },
      h('label', { class: 'field' }, h('span', { class: 'row-between' }, 'Slug', slugCnt), h('div', { class: 'seo-pre' }, h('span', { class: 'seo-slash' }, '/'), slugIn),
        h('p', { class: 'hint' }, 'Türkçe harfler dönüştürülür; yalnız küçük harf, rakam ve tire. Boşsa addan önerilir; aynı adres varsa sonuna sayı eklenir.')),
      h('label', { class: 'field' }, h('span', { class: 'row-between' }, 'Sayfa Başlığı', titleCnt), titleIn),
      h('label', { class: 'field' }, h('span', { class: 'row-between' }, 'Açıklama', descCnt), descIn),
      extra || null, adv);
    const right = h('div', { class: 'seo-prev' }, h('span', { class: 'seo-prev-h' }, 'Önizleme'), h('div', { class: 'serp', id: 'serp' }, pvUrl, pvTitle, pvDesc),
      h('p', { class: 'hint' }, 'Alanlar boşken gri öneri görünür; kaydedilen değer değildir.'));
    update(); seoRefresh = update;
    return h('div', { class: 'seo-grid' }, left, right);
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
      form: (d, id) => [field('Kategori adı', text(d, 'name', 'Örn. Mumlar', 'text', { oninput: (e) => { d.name = e.target.value; refreshSerp(); } })),
        field('Üst kategori', select(d, 'parentId', [['', 'Ana kategori'], ...catTree(false).filter((c) => c.id !== id).map((c) => [c.id, '\u00a0\u00a0'.repeat(c.depth) + (c.depth ? '↳ ' : '') + c.name])])),
        field('Açıklama', h('textarea', { rows: 3, oninput: (e) => { d.description = e.target.value; refreshSerp(); } }, d.description ?? '')),
        h('div', { class: 'seo-sec' }, h('h4', {}, 'Arama Motoru Optimizasyonu (SEO)'), (() => { d.name = d.name || ''; return seoCard(d, () => String(d.description || '').slice(0, 155)); })())],
      toDraft: (r) => ({ name: r.name, parentId: r.parent_id || '', description: r.description || '', slug: r.slug || '', seoTitle: r.seo_title || '', seoDescription: r.seo_description || '', seoNoindex: !!r.seo_noindex, seoCanonical: r.seo_canonical || '' }),
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

  // ----- Varyant Türleri: arama kutulu tablo + sağdan açılan yan panel (ikas tarzı) -----
  const VT = { q: '', page: 0, size: 20 };
  const STYLES = [['list', 'Liste', 'Açılır liste veya metin düğmeleri (Örn. Beden: S, M, L)'], ['color', 'Renk / Görsel', 'Renk daireleri veya görsel kutusu (Örn. Renk: Kırmızı, Mavi)']];
  const styleOf = (p) => (p.input_type === 'color' ? 'color' : 'list');
  const readFile = (f) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f); });
  const valBox = (v, big) => (v.image_url || v.imageUrl)
    ? h('img', { class: 'vt-box' + (big ? ' big' : ''), src: v.image_url || v.imageUrl, alt: v.value || '', title: v.value || '' })
    : (v.color_hex || v.colorHex) ? h('i', { class: 'vt-box' + (big ? ' big' : ''), style: `background:${v.color_hex || v.colorHex}`, title: v.value || '' }) : null;

  function openVariantTypePanel(p) {
    const d = { name: p ? p.name : '', style: p ? styleOf(p) : 'list', orig: p ? p.input_type : 'select', values: p ? p.values.map((v) => ({ id: v.id, value: v.value, colorHex: v.color_hex || '', imageUrl: v.image_url || '' })) : [], add: '' };
    let dirty = false, busy = false;
    const touch = () => { dirty = true; };
    const overlay = h('div', { class: 'vt-overlay' });
    const close = (force) => {
      if (!force && dirty && !confirm('Kaydedilmemiş değişiklikler silinsin mi?')) return;
      window.removeEventListener('keydown', onKey, true); panel.classList.remove('open'); overlay.classList.remove('open');
      setTimeout(() => { overlay.remove(); panel.remove(); }, 200);
    };
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    overlay.addEventListener('click', () => close());
    window.addEventListener('keydown', onKey, true);

    const nameIn = h('input', { type: 'text', placeholder: 'Örn. Renk, Boyut', value: d.name, maxlength: 255, oninput: (e) => { d.name = e.target.value; touch(); } });
    const styleBox = h('div', { class: 'vt-styles', role: 'radiogroup' });
    const valuesBox = h('div', { class: 'vt-values' });

    const drawStyle = () => {
      styleBox.replaceChildren(...STYLES.map(([k, l, t]) => h('button', { type: 'button', role: 'radio', 'aria-checked': String(d.style === k), class: 'vt-style' + (d.style === k ? ' on' : ''),
        onclick: () => { d.style = k; touch(); drawStyle(); drawValues(); } },
        h('span', { class: 'vt-style-demo' }, k === 'list'
          ? [h('i', { class: 'vt-pill' }, 'S'), h('i', { class: 'vt-pill' }, 'M'), h('i', { class: 'vt-pill' }, 'L')]
          : [h('i', { class: 'vt-dot', style: 'background:#fb4903' }), h('i', { class: 'vt-dot', style: 'background:#5c4ade' }), h('i', { class: 'vt-dot img' })]),
        h('b', {}, l), h('small', {}, t))));
    };
    const move = (i, dir) => { const j = i + dir; if (j < 0 || j >= d.values.length) return; [d.values[i], d.values[j]] = [d.values[j], d.values[i]]; touch(); drawValues(); };
    const addValue = (raw) => {
      let n = 0;
      for (const part of String(raw).split(',')) {
        const t = part.replace(/\s+/g, ' ').trim().slice(0, 255);
        if (!t) continue;
        if (d.values.some((v) => v.value.toLocaleLowerCase('tr') === t.toLocaleLowerCase('tr'))) { toast(`"${t}" zaten var.`, true); continue; }
        d.values.push({ id: null, value: t, colorHex: '', imageUrl: '' }); n++;
      }
      if (n) touch();
      return n;
    };
    const uploadFor = async (v, f) => {
      if (!f) return;
      if (!/^image\/(png|jpeg|webp|gif)$/.test(f.type)) return toast('Yalnızca PNG, JPG, WEBP, GIF.', true);
      try { v.imageUrl = (await api('POST', '/api/upload', { data: await readFile(f) })).url; touch(); drawValues(); } catch (e) { fail(e); }
    };
    const drawValues = () => {
      const isColor = d.style === 'color';
      const addIn = h('input', { type: 'text', placeholder: isColor ? 'Örn. Kırmızı, Mavi' : 'Örn. Geniş, Dar', value: d.add, 'aria-label': 'Yeni değer',
        oninput: (e) => { d.add = e.target.value; },
        onkeydown: (e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); if (addValue(addIn.value)) { d.add = ''; drawValues(); const n = valuesBox.querySelector('.vt-add input'); if (n) n.focus(); } } } });
      const rows = d.values.map((v, i) => h('div', { class: 'vt-val' },
        isColor ? h('div', { class: 'vt-pick' },
          h('label', { class: 'vt-swatch', title: 'Renk seç' }, valBox(v, true) || h('span', { class: 'vt-empty' }, '+'),
            h('input', { type: 'color', value: v.colorHex || '#000000', oninput: (e) => { v.colorHex = e.target.value; touch(); }, onchange: () => drawValues() })),
          h('label', { class: 'btn small vt-up' }, v.imageUrl ? 'Görseli değiştir' : 'Görsel yükle',
            h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp,image/gif', hidden: true, onchange: (e) => { uploadFor(v, e.target.files[0]); e.target.value = ''; } })),
          v.imageUrl ? h('button', { type: 'button', class: 'btn small', title: 'Görseli kaldır', onclick: () => { v.imageUrl = ''; touch(); drawValues(); } }, 'Görseli kaldır') : null,
          v.colorHex ? h('button', { type: 'button', class: 'btn small', title: 'Rengi kaldır', onclick: () => { v.colorHex = ''; touch(); drawValues(); } }, 'Rengi kaldır') : null) : null,
        h('input', { type: 'text', class: 'vt-name', value: v.value, 'aria-label': 'Değer', maxlength: 255, oninput: (e) => { v.value = e.target.value; touch(); } }),
        h('div', { class: 'vt-ctl' },
          h('button', { type: 'button', class: 'mini', title: 'Yukarı', disabled: i === 0, onclick: () => move(i, -1) }, '↑'),
          h('button', { type: 'button', class: 'mini', title: 'Aşağı', disabled: i === d.values.length - 1, onclick: () => move(i, 1) }, '↓'),
          h('button', { type: 'button', class: 'mini x', title: 'Sil', onclick: () => { d.values.splice(i, 1); touch(); drawValues(); } }, '×'))));
      valuesBox.replaceChildren(
        h('div', { class: 'vt-add' }, addIn, h('button', { type: 'button', class: 'btn small solid', onclick: () => { if (addValue(addIn.value)) { d.add = ''; drawValues(); } else toast('Bir değer yazmalısın.', true); } }, '+ Ekle')),
        h('p', { class: 'hint' }, 'Enter veya virgülle ekle. Sıralamayı ↑ ↓ ile değiştir.' + (isColor ? ' Her değere renk seç ve/veya görsel yükle (görsel varsa görsel gösterilir).' : '')),
        ...rows, ...(d.values.length ? [] : [h('p', { class: 'muted' }, 'Henüz değer yok.')]));
    };

    const save = async () => {
      if (busy) return;
      if (!d.name.trim()) { nameIn.focus(); return toast('Varyant türü adı gerekli.', true); }
      if (d.add.trim()) addValue(d.add), d.add = '';
      if (!d.values.length) return toast('En az bir varyant değeri ekle.', true);
      if (d.values.some((v) => !v.value.trim())) return toast('Boş değer olamaz.', true);
      busy = true; saveBtn.disabled = true;
      try {
        const body = { name: d.name.trim(), inputType: d.style === 'color' ? 'color' : (d.orig === 'text' ? 'text' : 'select'), values: d.values.map((v) => ({ id: v.id, value: v.value.trim(), colorHex: v.colorHex || null, imageUrl: v.imageUrl || null })) };
        if (p) await api('PUT', `/api/definitions/variant-types/${p.id}`, body); else await api('POST', '/api/definitions/variant-types', body);
        toast(p ? 'Varyant türü güncellendi.' : 'Varyant türü eklendi.'); close(true); await reloadDefs();
      } catch (e) { fail(e); busy = false; saveBtn.disabled = false; }
    };
    const saveBtn = h('button', { type: 'button', class: 'btn solid', onclick: save }, 'Kaydet');
    const panel = h('aside', { class: 'vt-panel', role: 'dialog', 'aria-modal': 'true', 'aria-label': p ? 'Varyant türünü düzenle' : 'Varyant türü oluştur' },
      h('div', { class: 'vt-head' }, h('h3', {}, p ? 'Varyant Türünü Düzenle' : 'Varyant Türü Oluştur'), h('button', { type: 'button', class: 'mini x', title: 'Kapat', onclick: () => close() }, '×')),
      h('div', { class: 'vt-body' },
        field('Varyant Türü Adı *', nameIn),
        h('div', { class: 'field' }, h('span', {}, 'Seçim Stili *'), styleBox),
        h('div', { class: 'field' }, h('span', {}, 'Varyantlar *'), valuesBox)),
      h('div', { class: 'vt-foot' }, h('button', { type: 'button', class: 'btn', onclick: () => close() }, 'Vazgeç'), saveBtn));
    drawStyle(); drawValues();
    document.body.append(overlay, panel);
    requestAnimationFrame(() => { overlay.classList.add('open'); panel.classList.add('open'); if (!p) nameIn.focus(); });
  }

  function propertiesTab() {
    const q = VT.q.trim().toLocaleLowerCase('tr');
    const all = data.properties.filter((p) => !q || p.name.toLocaleLowerCase('tr') === q || p.name.toLocaleLowerCase('tr').includes(q) || p.values.some((v) => v.value.toLocaleLowerCase('tr').includes(q)));
    const pages = Math.max(1, Math.ceil(all.length / VT.size));
    if (VT.page >= pages) VT.page = pages - 1;
    const slice = all.slice(VT.page * VT.size, VT.page * VT.size + VT.size);
    const MAXV = 14;
    const rows = slice.map((p) => h('tr', { class: 'row-toggle', onclick: () => openVariantTypePanel(p) },
      h('td', {}, h('b', {}, p.name), h('div', { class: 'hint' }, styleOf(p) === 'color' ? 'Renk / Görsel' : 'Liste')),
      h('td', {}, h('div', { class: 'vt-vals' }, ...(p.values.length ? [...p.values.slice(0, MAXV).map((v) => valBox(v) || h('span', { class: 'chip' }, v.value)),
        p.values.length > MAXV ? h('span', { class: 'muted' }, `+${p.values.length - MAXV}`) : null] : [h('span', { class: 'muted' }, '—')]))),
      h('td', { class: 'actions', onclick: (e) => e.stopPropagation() },
        h('button', { class: 'btn small', onclick: () => openVariantTypePanel(p) }, 'Düzenle'),
        h('button', { class: 'btn small danger', onclick: async () => {
          if (!confirm(`"${p.name}" ve tüm değerleri silinsin mi?`)) return;
          try { await api('DELETE', `/api/definitions/properties/${p.id}`); toast('Varyant türü silindi.'); await reloadDefs(); } catch (e) { fail(e); }
        } }, 'Sil'))));
    const from = all.length ? VT.page * VT.size + 1 : 0, to = Math.min(all.length, (VT.page + 1) * VT.size);
    const search = h('input', { type: 'search', class: 'vt-search', placeholder: 'Ara (tür veya değer)', value: VT.q, 'aria-label': 'Varyant türü ara',
      oninput: (e) => { VT.q = e.target.value; VT.page = 0; const pos = e.target.selectionStart; rerender(); const n = document.querySelector('.vt-search'); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (_) {} } } });
    return h('div', {},
      h('div', { class: 'card' },
        h('div', { class: 'row-between' }, search, h('button', { class: 'btn solid', onclick: () => openVariantTypePanel(null) }, '+ Varyant Türü Oluştur')),
        table(['Tür', 'Tanımlanmış Değerler', ''], rows, data.properties.length ? 'Aramayla eşleşen varyant türü yok.' : 'Henüz varyant türü yok. Renk, Beden gibi türler tanımla; ürün formunda bu değerlerden varyant üretebilirsin.'),
        h('div', { class: 'vt-pager' }, h('span', { class: 'muted' }, `${from}-${to} / ${all.length} adet`),
          h('span', {}, h('button', { class: 'btn small', disabled: VT.page <= 0, onclick: () => { VT.page--; rerender(); } }, '‹ Önceki'),
            h('button', { class: 'btn small', disabled: VT.page >= pages - 1, onclick: () => { VT.page++; rerender(); } }, 'Sonraki ›')))));
  }

  function definitions(page) {
    if (page && page.tab && D.tabInit !== page.id) { D.tab = page.tab; D.tabInit = page.id; D.draft = {}; D.editId = null; }
    if (ensure(D, loadDefs)) return loadingCard('Tanımlamalar yükleniyor…');
    const ORDER = [['brands', 'Markalar'], ['categories', 'Kategoriler'], ['properties', 'Varyant Türleri'], ['taxes', 'Vergi Oranları'], ['productTags', 'Etiketler'], ['warehouses', 'Depolar']];
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
    seoTitle: '', seoDescription: '', seoKeywords: '', seoNoindex: false, seoCanonical: '', tags: [], images: [], variants: [], stock: '', warehouseId: (data.warehouses.find((w) => w.is_default) || data.warehouses[0] || {}).id || '',
  });

  async function openProduct(id) {
    try {
      const p = await api('GET', `/api/products/${id}`);
      const d = blankDraft();
      Object.assign(d, {
        id: p.id, name: p.name, slug: p.slug, description: p.description || '', brandId: p.brand_id || '', categoryId: p.category_id || '', taxRateId: p.tax_rate_id || '',
        sku: p.sku || '', barcode: p.barcode || '', purchasePrice: p.purchase_price ?? '', salePrice: p.sale_price ?? '', discountPrice: p.discount_price ?? '',
        weight: p.weight ?? '', desi: p.desi ?? '', status: p.status, isPublished: p.is_published, seoTitle: p.seo_title || '', seoDescription: p.seo_description || '',
        seoKeywords: p.seo_keywords || '', seoNoindex: !!p.seo_noindex, seoCanonical: p.seo_canonical || '', tags: Array.isArray(p.tags) ? p.tags.slice() : [], images: Array.isArray(p.images) ? p.images : [],
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
    if (!groups.length) return toast('Önce en az bir varyant türü değeri seç.', true);
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

  function refreshSerp() { if (seoRefresh) seoRefresh(); }

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
      ? [h('p', { class: 'hint' }, 'Kombinasyon üretmek için varyant türü değerlerini seç (Örn. Renk: Siyah, Beyaz × Beden: S, M).'),
        ...data.properties.filter((p) => p.values.length).map((p) => h('div', { class: 'gen-group' }, h('b', {}, p.name),
          h('div', { class: 'chips' }, ...p.values.map((v) => {
            const set = P.gen[p.id] || (P.gen[p.id] = new Set());
            return h('label', { class: 'chip pick' }, h('input', { type: 'checkbox', checked: set.has(v.id), onchange: (e) => { e.target.checked ? set.add(v.id) : set.delete(v.id); } }),
              v.image_url ? h('img', { class: 'vt-box sm', src: v.image_url, alt: '' }) : v.color_hex ? h('i', { class: 'swatch', style: `background:${v.color_hex}` }) : null, v.value);
          })))),
        h('button', { class: 'btn small solid', onclick: generateVariants }, 'Kombinasyonları üret')]
      : h('p', { class: 'hint' }, 'Varyant üretmek için önce Tanımlamalar → Varyant Türleri bölümünde Renk/Beden gibi türler ve değerlerini ekle.'));

    const vrows = d.variants.map((v, i) => h('tr', {},
      h('td', {}, text(v, 'name', 'Varyant')), h('td', {}, text(v, 'sku', 'SKU')), h('td', {}, text(v, 'barcode', 'Barkod')),
      h('td', {}, text(v, 'salePrice', d.salePrice || 'Ürün fiyatı', 'number', { step: '0.01', min: '0' })),
      h('td', {}, text(v, 'stock', '0', 'number', { min: '0', step: '1' })),
      h('td', {}, select(v, 'warehouseId', data.warehouses.map((w) => [w.id, w.name]))),
      h('td', {}, h('button', { class: 'btn small danger', onclick: () => { d.variants.splice(i, 1); rerender(); } }, '×'))));
    const variantsCard = h('div', { class: 'card' }, h('h3', {}, '4 · Varyantlar'), genBox,
      d.variants.length ? table(['Varyant', 'SKU', 'Barkod', 'Fiyat (₺)', 'Stok', 'Depo', ''], vrows) : h('p', { class: 'hint' }, 'Varyant yok: ürün tek başına satılır.'),
      h('div', { class: 'btn-row' }, h('button', { class: 'btn small', onclick: () => { d.variants.push({ name: '', sku: '', barcode: '', salePrice: '', discountPrice: '', stock: 0, warehouseId: d.warehouseId }); rerender(); } }, '+ Elle varyant ekle')));

    const seoBlock = h('div', { class: 'card' }, h('h3', {}, '5 · Arama Motoru Optimizasyonu (SEO)'),
      seoCard(d, () => plain(d.description).slice(0, 155), field('Anahtar kelimeler', text(d, 'seoKeywords', 'virgülle ayır: mum, soya, seramik'))));

    const imgs = h('div', { class: 'card' }, h('h3', {}, 'Görseller'),
      d.images.length ? sortableThumbs(d) : h('p', { class: 'hint' }, 'Henüz görsel yok. İlk görsel ana görsel olur.'),
      d.images.length > 1 ? h('p', { class: 'hint' }, 'Sırayı değiştirmek için görseli sürükleyin (dokunmatikte alttaki ⠿ tutamacından). İlk görsel ana görsel ve liste küçük resmidir.') : null,
      h('label', { class: 'btn small', style: 'margin-top:10px' }, '+ Görsel yükle', h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp,image/gif', multiple: true, hidden: true, onchange: (e) => uploadImages([...e.target.files]) })));

    // Yayın: başlık hizasında tek satırlık kompakt şerit (form tam genişlik kalır)
    const publish = h('div', { class: 'pub-bar' },
      h('label', { class: 'pub-field' }, h('span', {}, 'Durum'), select(d, 'status', Object.entries(STATUS), rerender)),
      d.status === 'active' ? check(d, 'isPublished', 'Mağazada göster') : h('span', { class: 'hint pub-hint' }, 'Yalnız “Aktif” ürün mağazada görünür'),
      h('button', { class: 'btn', onclick: () => { P.view = 'list'; P.draft = null; rerender(); } }, 'Listeye dön'),
      h('button', { class: 'btn solid', disabled: P.busy, onclick: saveProduct }, d.id ? 'Değişiklikleri kaydet' : 'Ürünü kaydet'));

    return h('div', {}, h('div', { class: 'pub-head' }, h('h3', { class: 'page-h' }, d.id ? 'Ürünü düzenle' : 'Yeni ürün'), publish),
      h('div', { class: 'product-form' }, basic, imgs, priceCard, stockCard, variantsCard, seoBlock));
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

  const newProduct = () => { P.draft = blankDraft(); P.view = 'form'; P.gen = {}; };
  return { definitions, products, stock, newProduct, ui: { api, fail, money, field, text, area, select, check, row, table, ensure, loadingCard } };
};
