/* Yönetim paneli API'si: /api/yonetim/*
   Giriş: e-postaya 6 haneli kod (10 dk), oturum çerezi 7 gün. Yalnızca ADMIN_EMAILS listesindeki adresler.
   Belgeler R2'ye (idealist-belgeler) yüklenir, kayıtlar D1'de (idealist-panel) tutulur; her değişiklik içerik
   sürümünü artırır ve işlem geçmişine yazılır. GET dışındaki istekler "x-panel: 1" başlığı ve aynı köken ister. */
import {
  type Env, type Bolum, type BelgeEk, type HaberEk, type HaberEki, CEREZ, OTURUM_SURESI,
  sha256Hex, rastgele, izinliler, cerezOku, oturum, harita, surumArtir, slugla, dosyaAdi, belgeTuru,
} from '../../../panel/ortak';

const PDF_SINIR = 60 * 1024 * 1024; // 60 MB
const KOD_SURESI = 10 * 60;         // 10 dk
const PENCERE = 15 * 60;            // kod gönderim penceresi
const PENCERE_GONDERIM = 5;         // pencerede en çok kod
const DENEME = 5;                   // kod başına en çok deneme
const simdi = () => Math.floor(Date.now() / 1000);

const json = (veri: unknown, durum = 200, ek: Record<string, string> = {}) =>
  new Response(JSON.stringify(veri), { status: durum, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex', ...ek } });
const hata = (mesaj: string, durum = 400) => json({ hata: mesaj }, durum);

async function kayit(env: Env, email: string, islem: string, ayrinti: unknown) {
  await env.DB.prepare(`INSERT INTO islem_kaydi (email, islem, ayrinti) VALUES (?, ?, ?)`).bind(email, islem, typeof ayrinti === 'string' ? ayrinti : JSON.stringify(ayrinti)).run();
}

async function pdfOku(f: File | string | null): Promise<{ ad: string; veri: ArrayBuffer } | string> {
  if (!f || typeof f === 'string') return 'PDF dosyası seçilmedi.';
  if (f.size > PDF_SINIR) return 'Dosya 60 MB sınırını aşıyor.';
  if (!f.size) return 'Dosya boş.';
  const veri = await f.arrayBuffer();
  const bas = new TextDecoder().decode(veri.slice(0, 1024));
  if (!bas.includes('%PDF-')) return 'Yalnızca PDF dosyası yüklenebilir.';
  return { ad: f.name || 'belge.pdf', veri };
}

/** R2, statik dosyalar ve D1'de kullanılmayan bir anahtar: ad.pdf, ad_2.pdf, ad_3.pdf … */
async function bosAnahtar(env: Env, url: URL, klasor: string, ad: string): Promise<string> {
  const govde = ad.replace(/\.pdf$/i, '');
  for (let i = 1; i < 100; i++) {
    const anahtar = `${klasor}/${i === 1 ? govde : `${govde}_${i}`}.pdf`;
    const [r2, d1] = await Promise.all([
      env.BELGELER.head(anahtar), // panel belgeleri ve duyuru ekleri
      env.DB.prepare(`SELECT 1 FROM belge_ek WHERE anahtar = ?`).bind(anahtar).first(),
    ]);
    if (r2 || d1) continue;
    const st = await env.ASSETS.fetch(new Request(new URL('/belgeler/' + anahtar, url).toString(), { method: 'HEAD' }));
    if (st.status === 404) return anahtar;
  }
  throw new Error('Uygun dosya adı bulunamadı.');
}

const yilGecerli = (y: string) => /^(19|20)\d{2}$/.test(y);
const tarihGecerli = (t: string) => /^\d{4}-\d{2}-\d{2}$/.test(t) && !isNaN(Date.parse(t + 'T00:00:00Z'));

export const onRequest: PagesFunction<Env> = async ({ request, env, params }) => {
  const url = new URL(request.url);
  const yol = ((params.yol as string[] | undefined) || []).join('/');
  const yontem = request.method;

  if (yontem !== 'GET' && yontem !== 'HEAD') {
    const koken = request.headers.get('origin');
    if (request.headers.get('x-panel') !== '1' || (koken && koken !== url.origin)) return hata('İzin verilmeyen istek.', 403);
  }

  /* ----- Giriş ----- */
  if (yol === 'kod' && yontem === 'POST') {
    const govde = (await request.json().catch(() => ({}))) as { email?: string };
    const email = String(govde.email || '').trim().toLowerCase();
    if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) return hata('Geçerli bir e-posta adresi yazın.');
    const genel = { mesaj: 'Adres yetkiliyse e-postanıza 6 haneli bir giriş kodu gönderildi.' };
    if (!izinliler(env).includes(email)) return json(genel); // yetkisiz adres: aynı yanıt
    if (!env.KOD_TUZU || !env.RESEND_API_KEY) return hata('Sunucu e-posta ayarları eksik.', 500);
    const t = simdi();
    const onceki = await env.DB.prepare(`SELECT gonderim, pencere FROM giris_kodu WHERE email = ?`).bind(email).first<{ gonderim: number; pencere: number }>();
    const pencereBas = onceki && t - onceki.pencere < PENCERE ? onceki.pencere : t;
    const gonderim = onceki && pencereBas === onceki.pencere ? onceki.gonderim + 1 : 1;
    if (gonderim > PENCERE_GONDERIM) return hata('Çok fazla kod istendi. Lütfen 15 dakika sonra yeniden deneyin.', 429);
    const kod = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, '0');
    const ozet = await sha256Hex(`${env.KOD_TUZU}:${email}:${kod}`);
    await env.DB.prepare(`INSERT INTO giris_kodu (email, kod_ozet, bitis, deneme, gonderim, pencere) VALUES (?, ?, ?, 0, ?, ?)
      ON CONFLICT(email) DO UPDATE SET kod_ozet = excluded.kod_ozet, bitis = excluded.bitis, deneme = 0, gonderim = excluded.gonderim, pencere = excluded.pencere`)
      .bind(email, ozet, t + KOD_SURESI, gonderim, pencereBas).run();
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: env.PANEL_FROM || 'İdealist GYO Panel <onboarding@resend.dev>', to: [email], subject: `Yönetim paneli giriş kodu: ${kod}`,
        text: `İdealist GYO yönetim paneli giriş kodunuz: ${kod}\n\nKod 10 dakika geçerlidir. Bu isteği siz yapmadıysanız bu e-postayı dikkate almayın.` }),
    });
    if (!r.ok) return hata('Kod e-postası gönderilemedi. Lütfen biraz sonra yeniden deneyin.', 502);
    return json(genel);
  }
  if (yol === 'giris' && yontem === 'POST') {
    const govde = (await request.json().catch(() => ({}))) as { email?: string; kod?: string };
    const email = String(govde.email || '').trim().toLowerCase(); const kod = String(govde.kod || '').trim();
    if (!/^\d{6}$/.test(kod)) return hata('Kod 6 haneli olmalı.');
    const k = await env.DB.prepare(`SELECT kod_ozet, bitis, deneme FROM giris_kodu WHERE email = ?`).bind(email).first<{ kod_ozet: string; bitis: number; deneme: number }>();
    if (!k || !env.KOD_TUZU || !izinliler(env).includes(email)) return hata('Kod geçersiz. Yeni kod isteyin.', 401);
    if (k.bitis < simdi()) return hata('Kodun süresi doldu. Yeni kod isteyin.', 401);
    if (k.deneme >= DENEME) return hata('Çok fazla hatalı deneme. Yeni kod isteyin.', 429);
    if ((await sha256Hex(`${env.KOD_TUZU}:${email}:${kod}`)) !== k.kod_ozet) {
      await env.DB.prepare(`UPDATE giris_kodu SET deneme = deneme + 1 WHERE email = ?`).bind(email).run();
      return hata('Kod hatalı.', 401);
    }
    const belirtec = rastgele(32);
    const ozet = await sha256Hex('oturum:' + belirtec);
    await env.DB.batch([
      env.DB.prepare(`UPDATE giris_kodu SET kod_ozet = '', bitis = 0 WHERE email = ?`).bind(email),
      env.DB.prepare(`DELETE FROM oturum WHERE bitis < ?`).bind(simdi()),
      env.DB.prepare(`INSERT INTO oturum (ozet, email, bitis) VALUES (?, ?, ?)`).bind(ozet, email, simdi() + OTURUM_SURESI),
      env.DB.prepare(`INSERT INTO islem_kaydi (email, islem, ayrinti) VALUES (?, 'giris', '')`).bind(email),
    ]);
    return json({ ok: true }, 200, { 'set-cookie': `${CEREZ}=${belirtec}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${OTURUM_SURESI}` });
  }
  if (yol === 'cikis' && yontem === 'POST') {
    const t = cerezOku(request);
    if (/^[0-9a-f]{64}$/.test(t)) await env.DB.prepare(`DELETE FROM oturum WHERE ozet = ?`).bind(await sha256Hex('oturum:' + t)).run();
    return json({ ok: true }, 200, { 'set-cookie': `${CEREZ}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0` });
  }

  /* ----- Oturum gerektirenler ----- */
  const o = await oturum(env, request);
  if (!o) return hata('Oturum açılmamış.', 401);
  if (yol === 'ben' && yontem === 'GET') return json({ email: o.email });
  if (yol === 'kayit' && yontem === 'GET') {
    const r = await env.DB.prepare(`SELECT zaman, email, islem, ayrinti FROM islem_kaydi ORDER BY id DESC LIMIT 50`).all();
    return json({ kayitlar: r.results });
  }

  const h = await harita(env, url);
  const [kaynak, idStr] = yol.split('/');
  const id = idStr ? Number(idStr) : NaN;

  if (kaynak === 'belgeler') {
    if (yontem === 'GET' && !idStr) {
      const r = await env.DB.prepare(`SELECT * FROM belge_ek ORDER BY id DESC`).all();
      return json({ belgeler: r.results });
    }
    if (yontem === 'POST' && !idStr) {
      const f = await request.formData().catch(() => null);
      if (!f) return hata('Form okunamadı; sayfayı yenileyip tekrar deneyin.');
      const kid = String(f.get('kid') || ''); const bol = h.bolumler.find((b) => b.kid === kid) as Bolum | undefined;
      if (!bol) return hata('Bölüm seçin.');
      const yil = String(f.get('yil') || '').trim(); if (!yilGecerli(yil)) return hata('Yılı dört haneli yazın (ör. 2026).');
      const etiket = String(f.get('etiket') || '').trim().slice(0, 300); if (!etiket) return hata('Belgenin Türkçe adını yazın.');
      const etiketEn = String(f.get('etiket_en') || '').trim().slice(0, 300);
      let grup = '', hedef = '';
      if (bol.tip === 'grup') { grup = String(f.get('grup') || ''); if (!bol.gruplar.some((g) => g.ad === grup)) return hata('Grubu seçin (Mali Tablolar / Dipnotlar).'); }
      if (bol.tip === 'alt' || bol.tip === 'kok') {
        hedef = String(f.get('hedef') || bol.kok.tr);
        if (!bol.hedefler.some((x) => x.rota === hedef)) return hata('Belgenin görüneceği sayfayı seçin.');
        if (hedef === bol.kok.tr) hedef = '';
      }
      const pdf = await pdfOku(f.get('dosya')); if (typeof pdf === 'string') return hata(pdf);
      const anahtar = await bosAnahtar(env, url, `${yil}/${belgeTuru(bol, grup)}`, dosyaAdi(pdf.ad));
      const sha = await sha256Hex(pdf.veri);
      await env.BELGELER.put(anahtar, pdf.veri, { httpMetadata: { contentType: 'application/pdf' } });
      const ad = anahtar.split('/').pop() as string;
      const r = await env.DB.prepare(`INSERT INTO belge_ek (kid, grup, yil, etiket, etiket_en, anahtar, dosya_adi, boyut, sha256, sira, yayinda, olusturan, hedef)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, ?, ?) RETURNING id`).bind(kid, grup, yil, etiket, etiketEn, anahtar, ad, pdf.veri.byteLength, sha, o.email, hedef).first<{ id: number }>();
      await surumArtir(env);
      await kayit(env, o.email, 'belge-ekle', { id: r?.id, anahtar, etiket });
      return json({ ok: true, id: r?.id, anahtar });
    }
    if (!Number.isInteger(id)) return hata('Geçersiz istek.', 404);
    const b = await env.DB.prepare(`SELECT * FROM belge_ek WHERE id = ?`).bind(id).first<BelgeEk>();
    if (!b) return hata('Belge bulunamadı.', 404);
    if (yontem === 'PATCH') {
      const g = (await request.json().catch(() => ({}))) as { etiket?: string; etiket_en?: string };
      const etiket = String(g.etiket ?? b.etiket).trim().slice(0, 300); if (!etiket) return hata('Belgenin Türkçe adı boş olamaz.');
      const etiketEn = String(g.etiket_en ?? b.etiket_en).trim().slice(0, 300);
      await env.DB.prepare(`UPDATE belge_ek SET etiket = ?, etiket_en = ?, guncelleme = datetime('now') WHERE id = ?`).bind(etiket, etiketEn, id).run();
      await surumArtir(env);
      await kayit(env, o.email, 'belge-duzenle', { id, eski: b.etiket, yeni: etiket, eski_en: b.etiket_en, yeni_en: etiketEn });
      return json({ ok: true });
    }
    if (yontem === 'DELETE') {
      await env.BELGELER.delete(b.anahtar);
      await env.DB.prepare(`DELETE FROM belge_ek WHERE id = ?`).bind(id).run();
      await surumArtir(env);
      await kayit(env, o.email, 'belge-kaldir', { id, anahtar: b.anahtar, etiket: b.etiket });
      return json({ ok: true });
    }
  }

  if (kaynak === 'haberler') {
    if (yontem === 'GET' && !idStr) {
      const r = await env.DB.prepare(`SELECT * FROM haber_ek ORDER BY tarih DESC, id DESC`).all();
      return json({ haberler: r.results });
    }
    if (yontem === 'POST' && !idStr) {
      const f = await request.formData().catch(() => null);
      if (!f) return hata('Form okunamadı; sayfayı yenileyip tekrar deneyin.');
      const baslik = String(f.get('baslik') || '').trim().slice(0, 300); if (!baslik) return hata('Başlık yazın.');
      const tarih = String(f.get('tarih') || '').trim(); if (!tarihGecerli(tarih)) return hata('Tarihi seçin.');
      const govdeMetin = String(f.get('govde') || '').trim().slice(0, 20000); if (!govdeMetin) return hata('Duyuru metnini yazın.');
      const dosyalar = f.getAll('ek').filter((x) => typeof x !== 'string' && x.size > 0);
      if (dosyalar.length > 5) return hata('En çok 5 PDF eklenebilir.');
      const pdfler: { ad: string; veri: ArrayBuffer }[] = [];
      for (const d of dosyalar) { const p = await pdfOku(d); if (typeof p === 'string') return hata(p); pdfler.push(p); }
      const taban = slugla(baslik); let slug = taban;
      for (let i = 2; h.haberSluglari.includes(slug) || (await env.DB.prepare(`SELECT 1 FROM haber_ek WHERE slug = ?`).bind(slug).first()); i++) slug = `${taban}-${i}`;
      const ekler: HaberEki[] = [];
      for (const p of pdfler) {
        const anahtar = await bosAnahtar(env, url, `${tarih.slice(0, 4)}/haberler`, dosyaAdi(p.ad));
        await env.BELGELER.put(anahtar, p.veri, { httpMetadata: { contentType: 'application/pdf' } });
        ekler.push({ ad: anahtar.split('/').pop() as string, anahtar, boyut: p.veri.byteLength });
      }
      const r = await env.DB.prepare(`INSERT INTO haber_ek (slug, baslik, tarih, govde, ekler, yayinda, olusturan) VALUES (?, ?, ?, ?, ?, 1, ?) RETURNING id`)
        .bind(slug, baslik, tarih, govdeMetin, JSON.stringify(ekler), o.email).first<{ id: number }>();
      await surumArtir(env);
      await kayit(env, o.email, 'haber-ekle', { id: r?.id, slug, baslik });
      return json({ ok: true, id: r?.id, slug });
    }
    if (!Number.isInteger(id)) return hata('Geçersiz istek.', 404);
    const n = await env.DB.prepare(`SELECT * FROM haber_ek WHERE id = ?`).bind(id).first<HaberEk>();
    if (!n) return hata('Duyuru bulunamadı.', 404);
    if (yontem === 'PATCH') {
      const g = (await request.json().catch(() => ({}))) as { baslik?: string; tarih?: string; govde?: string };
      const baslik = String(g.baslik ?? n.baslik).trim().slice(0, 300); const tarih = String(g.tarih ?? n.tarih).trim(); const govdeMetin = String(g.govde ?? n.govde).trim().slice(0, 20000);
      if (!baslik || !govdeMetin) return hata('Başlık ve metin boş olamaz.');
      if (!tarihGecerli(tarih)) return hata('Tarih geçersiz.');
      await env.DB.prepare(`UPDATE haber_ek SET baslik = ?, tarih = ?, govde = ?, guncelleme = datetime('now') WHERE id = ?`).bind(baslik, tarih, govdeMetin, id).run();
      await surumArtir(env);
      await kayit(env, o.email, 'haber-duzenle', { id, slug: n.slug, baslik });
      return json({ ok: true });
    }
    if (yontem === 'DELETE') {
      let ekler: HaberEki[] = []; try { ekler = JSON.parse(n.ekler || '[]'); } catch { /* bozuk kayıt */ }
      for (const e of ekler) await env.BELGELER.delete(e.anahtar);
      await env.DB.prepare(`DELETE FROM haber_ek WHERE id = ?`).bind(id).run();
      await surumArtir(env);
      await kayit(env, o.email, 'haber-kaldir', { id, slug: n.slug, baslik: n.baslik });
      return json({ ok: true });
    }
  }
  return hata('Bulunamadı.', 404);
};
