// Formdan gelen mesajı e-posta ile bildirir (Resend API, ek paket gerekmez).
// Ortam değişkenleri: RESEND_API_KEY (zorunlu), MAIL_TO (varsayılan: panelde yazılı e-posta), MAIL_FROM.
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function configured() { return Boolean(process.env.RESEND_API_KEY); }

async function notify(msg, fallbackTo) {
  if (!configured()) return { sent: false, reason: 'RESEND_API_KEY ayarlı değil' };
  const to = process.env.MAIL_TO || fallbackTo;
  if (!to) return { sent: false, reason: 'Alıcı adres yok' };
  const from = process.env.MAIL_FROM || 'The Goatz Studio <onboarding@resend.dev>';
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5">
    <p><b>Siteden yeni mesaj</b></p>
    <p><b>Ad:</b> ${esc(msg.name)}<br><b>E-posta:</b> ${esc(msg.email)}<br><b>Telefon:</b> ${esc(msg.phone || '-')}</p>
    <p style="white-space:pre-wrap;border-left:3px solid #ffd731;padding-left:12px">${esc(msg.message)}</p>
    <p style="color:#666">Yanıtlamak için bu e-postayı yanıtla; yanıt doğrudan ${esc(msg.email)} adresine gider.</p></div>`;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [to], reply_to: msg.email, subject: `Yeni mesaj: ${msg.name}`, html }),
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
