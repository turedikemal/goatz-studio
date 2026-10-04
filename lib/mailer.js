// Formdan gelen mesajı e-posta ile bildirir (Resend API, ek paket gerekmez).
// Ortam değişkenleri: RESEND_API_KEY (zorunlu), MAIL_TO (varsayılan: panelde yazılı e-posta), MAIL_FROM.
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function configured() { return Boolean(process.env.RESEND_API_KEY); }

function reportHtml(msg, r, hasImg) {
  const date = new Date(msg.date).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', dateStyle: 'long', timeStyle: 'short' });
  const th = 'text-align:left;padding:8px 12px;background:#f4f4f2;border-bottom:1px solid #e2e2de;font-weight:700;width:38%;vertical-align:top';
  const td = 'padding:8px 12px;border-bottom:1px solid #e2e2de;vertical-align:top';
  const rows = (list, bold) => list.map(([k, v]) => `<tr><th style="${th}">${esc(k)}</th><td style="${td}${bold ? ';font-weight:700' : ''}">${esc(v || '—')}</td></tr>`).join('');
  const table = (inner) => `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;border:1px solid #e2e2de;font-size:14px;margin:0 0 22px">${inner}</table>`;
  const h = (t) => `<h2 style="font-size:13px;letter-spacing:.08em;margin:0 0 8px;color:#000">${esc(t.toLocaleUpperCase('tr-TR'))}</h2>`;
  const list = (items) => items.length ? `<ul style="margin:0 0 22px;padding-left:18px;font-size:14px">${items.map((x) => `<li style="margin:0 0 4px">${esc(x)}</li>`).join('')}</ul>` : '<p style="margin:0 0 22px;font-size:14px;color:#666">—</p>';
  // Hizmet satırı "Ad — Etiket: değer | Etiket: değer" biçiminde gelir: ad ve değerler koyu yazılır
  const svc = (x) => { const [name, ...rest] = String(x).split(' — '); const bits = rest.join(' — ').split(' | ').filter(Boolean).map((p) => { const i = p.indexOf(': '); return i > 0 ? `${esc(p.slice(0, i))}: <b>${esc(p.slice(i + 2))}</b>` : `<b>${esc(p)}</b>`; }); return { name, bits }; };
  const svcList = (items) => items.length ? `<ul style="margin:0 0 22px;padding-left:18px;font-size:14px">${items.map((x) => { const v = svc(x); return `<li style="margin:0 0 10px"><b style="font-size:15px">${esc(v.name)}</b>${v.bits.length ? '<br>' + v.bits.join('<br>') : ''}</li>`; }).join('')}</ul>` : '<p style="margin:0 0 22px;font-size:14px;color:#666">—</p>';
  const want = `<div style="border:2px solid #000;border-radius:10px;padding:14px 18px;margin:0 0 24px;background:#fffbe6">`
    + `<div style="font-size:12px;letter-spacing:.1em;font-weight:700;margin:0 0 8px">NE İSTİYOR?</div>`
    + `<div style="font-size:17px;margin:0 0 ${r.services.length || r.note ? 10 : 0}px"><b>${esc(r.route)}</b>${r.package && r.package !== r.route ? ` · <b>${esc(r.package)}</b>` : ''}</div>`
    + (r.services.length ? `<div style="font-size:14px;margin:0 0 ${r.note ? 10 : 0}px">Seçtiği hizmetler: ${r.services.map((x) => `<b>${esc(svc(x).name)}</b>`).join(', ')}</div>` : '')
    + (r.note ? `<div style="font-size:14px">Notu: <b>${esc(r.note)}</b></div>` : '')
    + `</div>`;
  return `<div style="font-family:Arial,Helvetica,sans-serif;color:#111;line-height:1.5;max-width:640px;margin:0 auto">
    <div style="background:#ffd731;border:2px solid #000;border-radius:10px;padding:18px 20px;margin:0 0 24px">
      <div style="font-size:12px;letter-spacing:.1em;font-weight:700">THE GOATZ STUDIO · TEKLİF RAPORU</div>
      <div style="font-size:22px;font-weight:800;margin:6px 0 2px">${esc(msg.name)}</div>
      <div style="font-size:13px">${esc(date)}</div>
    </div>
    ${want}
    ${h('Müşteri bilgileri')}${table(rows([['Ad soyad', msg.name], ['E-posta', msg.email], ['Telefon', msg.phone], ['Pazarlama e-postası onayı', r.marketing ? 'Evet' : 'Hayır']]))}
    ${h('Önerilen çözüm')}${table(rows([['Tür', r.route], ['Paket', r.package]], true))}
    ${h('Paket kapsamı')}${list(r.scope)}
    ${h('Seçilen hizmetler')}${svcList(r.services)}
    ${h('Cevaplar')}${table(rows(r.answers, true))}
    ${r.note ? h('Proje notu') + `<p style="margin:0 0 22px;font-size:14px;font-weight:700;white-space:pre-wrap">${esc(r.note)}</p>` : ''}
    <p style="font-size:12px;color:#666;margin:0 0 24px">Ön kapsamdır; fiyat ve nihai kapsam görüşmede belirlenir. Bu e-postayı yanıtlarsanız yanıt doğrudan ${esc(msg.email)} adresine gider.</p>
    ${hasImg ? h('Müşterinin gördüğü rapor ekranı') + '<img src="cid:teklif-raporu" alt="Teklif raporu" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:1px solid #000;border-radius:8px">' : ''}
  </div>`;
}

async function notify(msg, fallbackTo, files = {}, report = null) {
  if (!configured()) return { sent: false, reason: 'RESEND_API_KEY ayarlı değil' };
  const to = process.env.MAIL_TO || fallbackTo;
  if (!to) return { sent: false, reason: 'Alıcı adres yok' };
  const from = process.env.MAIL_FROM || 'The Goatz Studio <onboarding@resend.dev>';
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5">
    <p><b>${/^TEKLİF TALEBİ/.test(msg.message) ? 'Siteden yeni teklif talebi (proje oluşturucu)' : /^FİYAT TALEBİ/.test(msg.message) ? 'Siteden yeni fiyat talebi (hizmet sepeti)' : 'Siteden yeni mesaj'}</b></p>
    <p><b>Ad:</b> ${esc(msg.name)}<br><b>E-posta:</b> ${esc(msg.email)}<br><b>Telefon:</b> ${esc(msg.phone || '-')}</p>
    <p style="white-space:pre-wrap;border-left:3px solid #ffd731;padding-left:12px">${esc(msg.message)}</p>
    <p style="color:#666">Yanıtlamak için bu e-postayı yanıtla; yanıt doğrudan ${esc(msg.email)} adresine gider.</p>
    ${files.jpeg ? '<p><b>Teklif raporu:</b></p><img src="cid:teklif-raporu" alt="Teklif raporu" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:1px solid #000;border-radius:8px">' : ''}</div>`;
  const subject = report ? `Teklif raporu: ${msg.name} — ${report.package}` : `${/^TEKLİF TALEBİ/.test(msg.message) ? 'Yeni teklif talebi' : /^FİYAT TALEBİ/.test(msg.message) ? 'Yeni fiyat talebi (hizmet sepeti)' : /^YARIM KALAN/.test(msg.message) ? 'Yarım kalan teklif (lead)' : 'Yeni mesaj'}: ${msg.name}`;
  const payload = { from, to: [to], reply_to: msg.email, subject: (msg.campaign === 'shopier' ? '[Shopier %10] ' : '') + subject, html: report ? reportHtml(msg, report, !!files.jpeg) : html };
  const att = [];
  if (files.jpeg) att.push({ filename: 'teklif-raporu.jpg', content: files.jpeg, content_id: 'teklif-raporu' });
  if (files.pdf) att.push({ filename: 'teklif-raporu.pdf', content: files.pdf });
  if (att.length) payload.attachments = att;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) return { sent: false, reason: `Resend ${res.status}: ${(await res.text()).slice(0, 200)}` };
  return { sent: true };
}

// Panelden yazılan yanıtı müşteriye gönderir (aynı kanal; yanıt adresi hello@).
async function reply(msg, text, fallbackTo) {
  if (!configured()) throw Object.assign(new Error('E-posta hizmeti ayarlı değil (RESEND_API_KEY).'), { status: 503 });
  const from = process.env.MAIL_FROM || 'The Goatz Studio <onboarding@resend.dev>';
  const replyTo = process.env.MAIL_TO || fallbackTo;
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.55">
    <p style="white-space:pre-wrap">${esc(text)}</p>
    <hr style="border:0;border-top:1px solid #ddd;margin:20px 0">
    <p style="color:#666;font-size:13px">${esc(new Date(msg.date).toLocaleString('tr-TR'))} tarihli mesajınız:</p>
    <p style="color:#666;font-size:13px;white-space:pre-wrap">${esc(msg.message)}</p></div>`;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [msg.email], ...(replyTo ? { reply_to: replyTo } : {}), subject: 'Mesajınız hakkında — The Goatz Studio', html, text }),
  });
  if (!res.ok) throw Object.assign(new Error(`E-posta gönderilemedi (${res.status}). ${(await res.text()).slice(0, 160)}`), { status: 502 });
}

module.exports = { notify, reply, configured };
