// Bağımlılıksız zengin metin editörü (contenteditable). window.GoatzRich.create({ value, onChange, onUpload }) -> { el, getHTML }
(() => {
  const TAGS = 'p br b strong i em u s strike sub sup span div font h1 h2 h3 h4 h5 h6 ul ol li blockquote pre code hr a img table thead tbody tfoot tr td th caption colgroup col iframe video source'.split(' ');
  const DROP = 'script style noscript template object embed applet link meta base form textarea select svg math title head'.split(' ');
  const ATTR = { '*': ['style', 'class', 'align', 'title'], a: ['href', 'target', 'rel'], img: ['src', 'alt', 'width', 'height'], font: ['color', 'size'], td: ['colspan', 'rowspan'], th: ['colspan', 'rowspan'], col: ['span'], iframe: ['src', 'width', 'height', 'allowfullscreen', 'frameborder'], video: ['src', 'controls', 'width', 'height', 'poster'], source: ['src', 'type'] };
  const STYLE_OK = ['color', 'background-color', 'text-align', 'font-weight', 'font-style', 'text-decoration', 'font-size', 'width', 'height', 'max-width', 'border', 'border-collapse', 'padding', 'margin', 'vertical-align'];
  const VIDEO_HOSTS = /^https:\/\/(www\.youtube(-nocookie)?\.com\/embed\/|player\.vimeo\.com\/video\/)/i;
  const okUrl = (v, kind) => {
    const u = String(v).replace(/[\u0000- \u007f-\u009f​]+/g, '');
    if (!u) return false;
    if (kind === 'iframe') return VIDEO_HOSTS.test(u);
    if (kind === 'a') return /^(https?:|mailto:|tel:|#|\/(?!\/))/i.test(u) || !/^[a-z][a-z0-9+.-]*:/i.test(u);
    return /^(https?:\/\/|\/(?!\/)|data:image\/(png|jpe?g|gif|webp);base64,)/i.test(u);
  };
  const okStyle = (v) => v.split(';').map((d) => d.trim()).filter(Boolean).filter((d) => {
    const i = d.indexOf(':'); if (i < 0) return false;
    return STYLE_OK.includes(d.slice(0, i).trim().toLowerCase()) && !/url\s*\(|expression|javascript|@import|[<>\\]/i.test(d.slice(i + 1));
  }).join(';');

  // İstemci tarafı temizleyici: ayrıştırılmış DOM üzerinde izin listesi (sunucu da ayrıca temizler).
  function sanitize(html) {
    const doc = new DOMParser().parseFromString('<body>' + html, 'text/html');
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 8) return n.remove();
        if (n.nodeType !== 1) return;
        const t = n.tagName.toLowerCase();
        if (DROP.includes(t)) return n.remove();
        if (!TAGS.includes(t)) { walk(n); while (n.firstChild) n.parentNode.insertBefore(n.firstChild, n); return n.remove(); }
        const allowed = [...ATTR['*'], ...(ATTR[t] || [])];
        [...n.attributes].forEach((a) => {
          const k = a.name.toLowerCase(); let v = a.value;
          if (k.startsWith('on') || !allowed.includes(k)) return n.removeAttribute(a.name);
          if (k === 'href' && !okUrl(v, 'a')) return n.removeAttribute(a.name);
          if ((k === 'src' || k === 'poster') && !okUrl(v, t === 'iframe' ? 'iframe' : 'img')) return n.removeAttribute(a.name);
          if (k === 'style') { v = okStyle(v); if (!v) return n.removeAttribute(a.name); n.setAttribute('style', v); }
          if (k === 'target' && !/^_(blank|self)$/.test(v)) n.removeAttribute(a.name);
        });
        if (t === 'a') n.setAttribute('rel', 'noopener noreferrer');
        if ((t === 'iframe' || t === 'img' || t === 'source') && !n.getAttribute('src')) return n.remove();
        walk(n);
      });
    };
    walk(doc.body);
    return doc.body.innerHTML.trim();
  }

  const ICONS = {
    bold: '<b>B</b>', italic: '<i style="font-family:serif">I</i>', underline: '<u>U</u>', clear: 'Tx', left: '⯇', center: '☰', right: '⯈',
    ul: '•≡', ol: '1.', table: '▦', link: '🔗', unlink: '⛓', image: '🖼', video: '▶', code: '&lt;/&gt;', full: '⤢',
  };
  const ALIGN_SVG = (a) => `<svg width="16" height="14" viewBox="0 0 16 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="${a === 'left' ? 'M1 2h14M1 5.5h9M1 9h14M1 12.5h9' : a === 'center' ? 'M1 2h14M4 5.5h8M1 9h14M4 12.5h8' : 'M1 2h14M7 5.5h8M1 9h14M7 12.5h8'}"/></svg>`;

  function create(opts) {
    const o = Object.assign({ value: '', onChange() {}, onUpload: null, minHeight: 220 }, opts);
    const root = document.createElement('div'); root.className = 'rte';
    const bar = document.createElement('div'); bar.className = 'rte-bar'; bar.setAttribute('role', 'toolbar');
    const area = document.createElement('div'); area.className = 'rte-area'; area.contentEditable = 'true'; area.spellcheck = true;
    area.style.minHeight = o.minHeight + 'px';
    const src = document.createElement('textarea'); src.className = 'rte-src'; src.hidden = true; src.spellcheck = false;
    root.append(bar, area, src);
    area.innerHTML = sanitize(o.value || '');
    let saved = null, srcMode = false;

    const emit = () => { o.onChange(srcMode ? sanitize(src.value) : sanitize(area.innerHTML)); };
    const saveSel = () => { const s = getSelection(); if (s.rangeCount && area.contains(s.anchorNode)) saved = s.getRangeAt(0).cloneRange(); };
    const restoreSel = () => { area.focus(); if (saved) { const s = getSelection(); s.removeAllRanges(); s.addRange(saved); } };
    document.addEventListener('selectionchange', () => { if (document.activeElement === area) { saveSel(); mark(); } });
    const exec = (cmd, val) => { restoreSel(); document.execCommand('styleWithCSS', false, true); document.execCommand(cmd, false, val); saveSel(); emit(); mark(); };
    const insertHTML = (html) => { restoreSel(); document.execCommand('insertHTML', false, html); saveSel(); emit(); };
    const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

    const btns = {};
    const mk = (id, title, html, fn, cls) => {
      const b = document.createElement('button'); b.type = 'button'; b.title = title; b.setAttribute('aria-label', title); b.className = 'rte-btn' + (cls ? ' ' + cls : ''); b.innerHTML = html;
      b.addEventListener('mousedown', (e) => e.preventDefault()); // seçimi kaybetme
      b.addEventListener('click', fn); bar.append(b); btns[id] = b; return b;
    };
    const sep = () => { const s = document.createElement('i'); s.className = 'rte-sep'; bar.append(s); };

    // Biçim kodu ve tam ekran solda (ekran görüntüsündeki düzen)
    mk('code', 'Biçim kodu (HTML)', ICONS.code, () => toggleSrc());
    mk('full', 'Tam ekran', ICONS.full, () => { root.classList.toggle('rte-full'); document.body.classList.toggle('rte-lock', root.classList.contains('rte-full')); btns.full.classList.toggle('on', root.classList.contains('rte-full')); });
    sep();
    const fmt = document.createElement('select'); fmt.className = 'rte-fmt'; fmt.title = 'Biçim';
    [['p', 'Paragraf'], ['h2', 'Başlık 2'], ['h3', 'Başlık 3'], ['h4', 'Başlık 4'], ['blockquote', 'Alıntı']].forEach(([v, l]) => fmt.append(new Option(l, v)));
    fmt.addEventListener('change', () => { exec('formatBlock', fmt.value); });
    bar.append(fmt); sep();
    mk('bold', 'Kalın', ICONS.bold, () => exec('bold'));
    mk('italic', 'İtalik', ICONS.italic, () => exec('italic'));
    mk('underline', 'Altı çizili', ICONS.underline, () => exec('underline'));
    mk('clear', 'Biçimi temizle', ICONS.clear, () => { exec('removeFormat'); exec('formatBlock', 'p'); });
    sep();
    const col = document.createElement('input'); col.type = 'color'; col.className = 'rte-color'; col.value = '#d62828'; col.title = 'Metin rengi';
    col.addEventListener('mousedown', saveSel); col.addEventListener('input', () => exec('foreColor', col.value));
    const colLab = document.createElement('label'); colLab.className = 'rte-btn rte-colorwrap'; colLab.title = 'Metin rengi'; colLab.innerHTML = '<b>A</b>'; colLab.append(col); bar.append(colLab);
    sep();
    mk('left', 'Sola hizala', ALIGN_SVG('left'), () => exec('justifyLeft'));
    mk('center', 'Ortala', ALIGN_SVG('center'), () => exec('justifyCenter'));
    mk('right', 'Sağa hizala', ALIGN_SVG('right'), () => exec('justifyRight'));
    sep();
    mk('ul', 'Madde işaretli liste', ICONS.ul, () => exec('insertUnorderedList'));
    mk('ol', 'Numaralı liste', ICONS.ol, () => exec('insertOrderedList'));
    sep();
    mk('table', 'Tablo ekle', ICONS.table, () => {
      const r = parseInt(prompt('Satır sayısı', '3'), 10), c = parseInt(prompt('Sütun sayısı', '2'), 10);
      if (!(r > 0 && c > 0) || r > 30 || c > 10) return;
      const cell = (t) => `<${t}>${t === 'th' ? 'Başlık' : '&nbsp;'}</${t}>`;
      insertHTML(`<table class="rte-table"><thead><tr>${cell('th').repeat(c)}</tr></thead><tbody>${('<tr>' + cell('td').repeat(c) + '</tr>').repeat(r - 1 || 1)}</tbody></table><p><br></p>`);
    });
    mk('link', 'Bağlantı ekle', ICONS.link, () => {
      const u = prompt('Bağlantı adresi (https://…)', 'https://'); if (!u) return;
      if (!okUrl(u, 'a')) return alert('Bu adres kullanılamaz.');
      restoreSel();
      if (getSelection().isCollapsed) insertHTML(`<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(u)}</a>`);
      else { exec('createLink', u); area.querySelectorAll('a[href]').forEach((a) => { if (!a.target) a.target = '_blank'; }); emit(); }
    });
    mk('unlink', 'Bağlantıyı kaldır', ICONS.unlink, () => exec('unlink'));
    const file = document.createElement('input'); file.type = 'file'; file.accept = 'image/png,image/jpeg,image/webp,image/gif'; file.hidden = true;
    file.addEventListener('change', async () => {
      const f = file.files[0]; file.value = ''; if (!f || !o.onUpload) return;
      try { const url = await o.onUpload(f); if (url) insertHTML(`<img src="${esc(url)}" alt="">`); } catch (e) { alert(e.message || 'Görsel yüklenemedi.'); }
    });
    root.append(file);
    mk('image', 'Görsel ekle', ICONS.image, () => {
      saveSel();
      const u = o.onUpload ? prompt('Görsel adresi yazın; boş bırakıp Tamam derseniz bilgisayardan seçersiniz.', '') : prompt('Görsel adresi', 'https://');
      if (u === null) return;
      if (u.trim()) { if (!okUrl(u.trim(), 'img')) return alert('Bu adres kullanılamaz.'); insertHTML(`<img src="${esc(u.trim())}" alt="">`); } else if (o.onUpload) file.click();
    });
    mk('video', 'Video ekle', ICONS.video, () => {
      const u = (prompt('YouTube/Vimeo adresi ya da .mp4 bağlantısı', 'https://') || '').trim(); if (!u) return;
      let m = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/.exec(u), v = /vimeo\.com\/(?:video\/)?(\d+)/.exec(u);
      if (m) insertHTML(`<iframe src="https://www.youtube-nocookie.com/embed/${m[1]}" width="560" height="315" allowfullscreen frameborder="0"></iframe><p><br></p>`);
      else if (v) insertHTML(`<iframe src="https://player.vimeo.com/video/${v[1]}" width="560" height="315" allowfullscreen frameborder="0"></iframe><p><br></p>`);
      else if (/^(https:\/\/|\/uploads\/).+\.(mp4|webm|ogg)(\?.*)?$/i.test(u)) insertHTML(`<video src="${esc(u)}" controls width="560"></video><p><br></p>`);
      else alert('YouTube, Vimeo ya da .mp4/.webm bağlantısı girin.');
    });

    function mark() {
      const q = (c) => { try { return document.queryCommandState(c); } catch { return false; } };
      btns.bold.classList.toggle('on', q('bold')); btns.italic.classList.toggle('on', q('italic')); btns.underline.classList.toggle('on', q('underline'));
      btns.ul.classList.toggle('on', q('insertUnorderedList')); btns.ol.classList.toggle('on', q('insertOrderedList'));
      btns.left.classList.toggle('on', q('justifyLeft')); btns.center.classList.toggle('on', q('justifyCenter')); btns.right.classList.toggle('on', q('justifyRight'));
    }
    function toggleSrc() {
      srcMode = !srcMode;
      if (srcMode) { src.value = sanitize(area.innerHTML).replace(/(<\/(p|div|h\d|ul|ol|li|table|tr|blockquote)>)/gi, '$1\n'); src.style.height = Math.max(o.minHeight, area.offsetHeight) + 'px'; }
      else { area.innerHTML = sanitize(src.value); emit(); }
      area.hidden = srcMode; src.hidden = !srcMode; btns.code.classList.toggle('on', srcMode);
      bar.querySelectorAll('.rte-btn,.rte-fmt').forEach((b) => { if (b !== btns.code && b !== btns.full) b.toggleAttribute('disabled', srcMode); });
    }
    area.addEventListener('input', emit);
    area.addEventListener('blur', () => { area.innerHTML = sanitize(area.innerHTML); emit(); });
    src.addEventListener('input', () => o.onChange(sanitize(src.value)));
    area.addEventListener('paste', (e) => { // yapıştırılan HTML temizlensin
      const h = e.clipboardData && e.clipboardData.getData('text/html');
      if (h) { e.preventDefault(); insertHTML(sanitize(h)); }
    });
    return { el: root, getHTML: () => (srcMode ? sanitize(src.value) : sanitize(area.innerHTML)) };
  }
  window.GoatzRich = { create, sanitize };
})();
