/* Cloudflare Pages Function: iletişim formu.
   Ortam değişkenleri: RESEND_API_KEY (secret), IL_TO (alıcı e-posta), IL_FROM (gönderen). Anahtarlar koda yazılmaz. */
export const onRequestPost: PagesFunction<{ RESEND_API_KEY?: string; IL_TO?: string; IL_FROM?: string }> = async ({ request, env }) => {
  const data = await request.formData();
  if (data.get('website')) return new Response('ok', { status: 200 }); // honeypot
  const adsoyad = String(data.get('adsoyad') || '').trim(); const email = String(data.get('email') || '').trim(); const mesaj = String(data.get('mesaj') || '').trim();
  const firma = String(data.get('firma') || '').trim(); const tel = String(data.get('tel') || '').trim();
  /* Zorunlu alanlar, e-posta biçimi ve makul uzunluk sınırları (kötüye kullanım ve sağlayıcı reddi yerine açık 400) */
  const gecersiz = !adsoyad || !email || !mesaj || !data.get('kvkk') || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)
    || adsoyad.length > 200 || firma.length > 200 || email.length > 254 || tel.length > 50 || mesaj.length > 5000;
  if (gecersiz) return new Response(JSON.stringify({ ok: false }), { status: 400, headers: { 'content-type': 'application/json' } });
  const body = `Ad Soyad: ${adsoyad}\nFirma: ${firma}\nE-posta: ${email}\nTelefon: ${tel}\nDil: ${String(data.get('dil') || '').slice(0, 5)}\n\n${mesaj}`;
  if (env.RESEND_API_KEY && env.IL_TO) {
    const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' }, body: JSON.stringify({ from: env.IL_FROM || 'web@idealistgyo.com', to: [env.IL_TO], reply_to: email, subject: `İletişim formu: ${adsoyad.replace(/[\r\n]+/g, ' ')}`, text: body }) });
    if (!r.ok) return new Response(JSON.stringify({ ok: false }), { status: 502, headers: { 'content-type': 'application/json' } });
  }
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'content-type': 'application/json' } });
};
