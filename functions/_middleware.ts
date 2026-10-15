/* Tüm istekler için ara katman.
   1) Eski site adresleri (tr.php?…, download.php?…, /dosyalar/…) → yeni adreslere 301 (panel/yonlendirmeler.json).
   2) Yönetim paneli: /yonetim/panel* oturum ister; /yonetim/ ve /panel-sablon/ arama motorlarına kapalı.
   3) Yönetim panelinden eklenen belge ve duyurular (D1) statik sayfalardaki data-ek işaretlerine yerleştirilir;
      statik sayfası olmayan yeni yıl sayfaları ve duyuru sayfaları /panel-sablon/ şablonlarından üretilir.
   Panelde içerik yoksa sayfalar hiç değiştirilmeden geçer. */
import YONLENDIRME from '../panel/yonlendirmeler.json';
import {
  type Env, type Dil, type Bolum, type BelgeEk, type HaberEk, type Harita, type PanelVerisi,
  esc, mb, tarihTr, jsonGom, donemSirasi, harita, panelVerisi, oturum, belgeHedefi, belgeSatiri, belgeYolu,
  belgeTuru, yilRotasi, yilBasligi, haberHtml, haberEkleri,
} from '../panel/ortak';

const ONEKLER = ['/tr.php', '/en.php', '/index.php', '/download.php', '/dosyalar/', '/resimler/', '/swf/'];
const coz = (s: string) => { try { return decodeURIComponent(s.replace(/\+/g, '%20')); } catch { return s; } };
let yonHaritasi: Map<string, string> | null = null;
function yonlendirme(yol: string): string | undefined {
  if (!yonHaritasi) {
    yonHaritasi = new Map();
    for (const [k, v] of Object.entries(YONLENDIRME as Record<string, string>)) { yonHaritasi.set(k, v); yonHaritasi.set(coz(k), v); }
  }
  return yonHaritasi.get(yol) ?? yonHaritasi.get(coz(yol));
}

const kapali = (r: Response, panel = false): Response => {
  const h = new Headers(r.headers);
  h.set('X-Robots-Tag', 'noindex, nofollow'); h.set('X-Frame-Options', 'DENY');
  if (panel) h.set('Cache-Control', 'no-store');
  return new Response(r.body, { status: r.status, statusText: r.statusText, headers: h });
};

const ILGILI = (p: string) => p === '/' || p === '/en/' || p.startsWith('/yatirimci-iliskileri/') || p.startsWith('/en/investor-relations/')
  || p.startsWith('/haberler/') || p === '/portfoy/degerleme-raporlari/' || p === '/en/portfolio/degerleme-raporlari/' || p === '/arama/' || p === '/en/search/';

export const onRequest: PagesFunction<Env> = async ({ request, env, next }) => {
  const url = new URL(request.url);
  const p = url.pathname;

  // 1) Eski adresler
  if (ONEKLER.some((o) => p === o || p.startsWith(o.endsWith('/') ? o : o + '?') || p.startsWith(o))) {
    let hedef = yonlendirme(p + url.search);
    if (!hedef && (p === '/tr.php' || p === '/index.php')) hedef = '/';
    if (!hedef && p === '/en.php') hedef = '/en/';
    if (hedef) return new Response(null, { status: 301, headers: { location: new URL(hedef, url).toString(), 'cache-control': 'public, max-age=86400' } });
  }

  // 2) Yönetim paneli
  if (p === '/yonetim/panel' || p.startsWith('/yonetim/panel/')) {
    const o = await oturum(env, request).catch(() => null);
    if (!o) return new Response(null, { status: 302, headers: { location: '/yonetim/', 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' } });
    return kapali(await next(), true);
  }
  if (p.startsWith('/yonetim/') || p.startsWith('/panel-sablon/')) return kapali(await next());
  if (p.startsWith('/api/') || p.startsWith('/belgeler/') || p.startsWith('/panel-veri/') || (request.method !== 'GET' && request.method !== 'HEAD')) return next();

  // 3) Panel içeriği
  let res = await next();
  if (!ILGILI(p) && res.status !== 404) return res;
  if (res.status !== 404 && !(res.headers.get('content-type') || '').includes('text/html')) return res;
  let veri: PanelVerisi;
  try { veri = await panelVerisi(env); } catch { return res; }
  if (!veri.belgeler.length && !veri.haberler.length) return res;
  let h: Harita;
  try { h = await harita(env, url); } catch { return res; }
  const dil: Dil = p === '/en/' || p.startsWith('/en/') ? 'en' : 'tr';
  const y = yerlesim(h, veri, dil);
  let html: string;
  let durum = res.status;
  if (res.status === 404) {
    const s = await sablondan(env, url, h, veri, y, dil);
    if (!s) return res;
    html = s; durum = 200;
  } else {
    if (!ILGILI(p)) return res;
    html = await res.text();
  }
  html = donustur(html, p, h, veri, y, dil);
  const basliklar = new Headers(res.headers);
  basliklar.delete('content-length'); basliklar.delete('etag');
  basliklar.set('content-type', 'text/html; charset=utf-8');
  basliklar.set('cache-control', 'public, max-age=0, must-revalidate');
  return new Response(request.method === 'HEAD' ? null : html, { status: durum, headers: basliklar });
};

/* ---------- Yerleşim: panel belgelerinin bu dildeki yerleri ---------- */
interface Satir { html: string; yil: string; donem: number; id: number; adet?: number }
interface Yerlesim {
  rota: Map<string, Satir[]>;               // sayfa adresi → satırlar
  grup: Map<string, Satir[]>;               // "idx|yıl" → satırlar (Mali Tablo ve Raporlar)
  yeniYil: Map<string, Map<string, Satir[]>>; // kid → (statik sayfası olmayan yıl → satırlar)
  grupYeni: Map<number, Map<string, Satir[]>>;
  lib: Record<string, unknown>[];
  srch: Record<string, string>[];
  bolumTipi: Map<string, Bolum['tip']>;     // sayfa adresi → bölüm tipi (sıralama için)
}
const ekle = <K, V>(m: Map<K, V[]>, k: K, v: V) => { const a = m.get(k); if (a) a.push(v); else m.set(k, [v]); };
const sirala = (a: Satir[]) => a.sort((x, y) => x.donem - y.donem || x.id - y.id);

function yerlesim(h: Harita, veri: PanelVerisi, dil: Dil): Yerlesim {
  const y: Yerlesim = { rota: new Map(), grup: new Map(), yeniYil: new Map(), grupYeni: new Map(), lib: [], srch: [], bolumTipi: new Map() };
  const yilSayfalari = new Map<string, { bol: Bolum; yil: string; etiketler: string[] }>();
  for (const b of veri.belgeler) {
    const bol = h.bolumler.find((x) => x.kid === b.kid); if (!bol) continue;
    const hd = belgeHedefi(bol, b, dil, h); if (!hd) continue;
    const yol = belgeYolu(b.anahtar);
    const s: Satir = { html: belgeSatiri(dil, b.yil, hd.etiket, yol, b.boyut, b.dosya_adi), yil: b.yil, donem: donemSirasi(b.etiket), id: b.id };
    let sayfa = '';
    if (bol.tip === 'grup' && hd.grupIdx !== undefined) {
      ekle(y.grup, `${hd.grupIdx}|${b.yil}`, s);
      if (!bol.gruplar[hd.grupIdx].yillar.includes(b.yil)) {
        const m = y.grupYeni.get(hd.grupIdx) || new Map<string, Satir[]>(); ekle(m, b.yil, s); y.grupYeni.set(hd.grupIdx, m);
      }
      sayfa = dil === 'en' ? bol.kok.en + 'reports/' : bol.kok.tr;
    } else if (hd.rota) {
      ekle(y.rota, hd.rota, s); y.bolumTipi.set(hd.rota, bol.tip); sayfa = hd.rota;
      if (bol.tip === 'yil' && !bol.yillar[b.yil]?.[dil]) {
        const m = y.yeniYil.get(bol.kid) || new Map<string, Satir[]>(); ekle(m, b.yil, s); y.yeniYil.set(bol.kid, m);
      }
      if (bol.tip === 'yil') {
        const k = hd.rota; const v = yilSayfalari.get(k) || { bol, yil: b.yil, etiketler: [] }; v.etiketler.push(hd.etiket); yilSayfalari.set(k, v);
      }
    }
    const ust = dil === 'en' ? (bol.kid === 'dr' ? 'PORTFOLIO' : 'INVESTOR RELATIONS') : (bol.kid === 'dr' ? 'PORTFÖY ve PROJELERİMİZ' : 'YATIRIMCI KÖŞESİ');
    const ad = dil === 'en' ? bol.adEn : bol.ad;
    y.lib.push({ n: b.dosya_adi, p: yol, e: 'pdf', s: b.boyut, y: b.yil, t: belgeTuru(bol, b.grup), l: hd.etiket, c: `${ust} > ${ad} > ${b.yil}`, r: sayfa });
    y.srch.push({ r: sayfa, t: hd.etiket, k: `${ust} ${ad}`, b: `${b.yil} ${b.dosya_adi}` });
  }
  for (const [rota, v] of yilSayfalari) {
    if (v.bol.yillar[v.yil]?.[dil]) continue; // statik sayfası olan yıl zaten aramada
    y.srch.push({ r: rota, t: yilBasligi(v.bol, v.yil, dil), k: `${dil === 'en' ? 'INVESTOR RELATIONS' : 'YATIRIMCI KÖŞESİ'} ${dil === 'en' ? v.bol.adEn : v.bol.ad}`, b: ' ' + v.etiketler.join(' ') });
  }
  if (dil === 'tr') for (const n of veri.haberler) {
    y.srch.push({ r: `/haberler/${n.slug}/`, t: n.baslik, k: 'HABER & DUYURULAR', b: n.govde.replace(/\s+/g, ' ').slice(0, 400) });
  }
  return y;
}

/* ---------- Sayfa dönüşümü (metin üzerinde; sayfalar küçük, akış gerekmez) ---------- */
const ozNitelik = (etiket: string, ad: string) => { const m = new RegExp(`\\b${ad}="([^"]*)"`).exec(etiket); return m ? m[1] : ''; };

function donustur(html: string, p: string, h: Harita, veri: PanelVerisi, y: Yerlesim, dil: Dil): string {
  // a) Mevcut belge listesine ekleme: <i data-ek="belge" data-rota="…">
  html = html.replace(/<i data-ek="belge" data-rota="([^"]*)" hidden><\/i>/g, (tam, rota: string, konum: number) => {
    const s = y.rota.get(rota); if (!s) return tam;
    const tip = y.bolumTipi.get(rota);
    if (tip === 'yil') return sirala([...s]).map((x) => x.html).join('') + tam; // yıl sayfası: dönem sırasıyla sona
    return tam; // kök/alt sayfalar: aşağıda listenin başına (en yeni üstte)
  });
  for (const [rota, s] of y.rota) {
    if (y.bolumTipi.get(rota) === 'yil') continue;
    const isaret = `<i data-ek="belge" data-rota="${rota}" hidden></i>`;
    let konum = html.indexOf(isaret);
    while (konum >= 0) {
      const bas = html.lastIndexOf('<div class="doclist', konum);
      const kapanis = bas >= 0 ? html.indexOf('>', bas) + 1 : -1;
      if (kapanis > 0) {
        const ek = [...s].sort((a, b) => b.yil.localeCompare(a.yil) || b.id - a.id).map((x) => x.html).join('');
        html = html.slice(0, kapanis) + ek + html.slice(kapanis);
        konum = html.indexOf(isaret, konum + ek.length + isaret.length);
      } else konum = html.indexOf(isaret, konum + isaret.length);
    }
  }
  // b) Boş yer: <i data-ek="belge-bos" data-rota="…" data-sar="mt-6">
  html = html.replace(/<i data-ek="belge-bos"([^>]*)><\/i>/g, (tam, nit: string) => {
    const s = y.rota.get(ozNitelik(nit, 'data-rota')); if (!s) return tam;
    const sar = ozNitelik(nit, 'data-sar');
    const sirali = y.bolumTipi.get(ozNitelik(nit, 'data-rota')) === 'yil' ? sirala([...s]) : [...s].sort((a, b) => b.yil.localeCompare(a.yil) || b.id - a.id);
    return `<div class="doclist grid${sar ? ' ' + esc(sar) : ''}">${sirali.map((x) => x.html).join('')}</div>`;
  });
  // c) Statik sayfası olmayan yeni yıllar (bölüm ana sayfası): <i data-ek="yeni-yil" data-kid="…">
  html = html.replace(/<i data-ek="yeni-yil" data-kid="([^"]*)" hidden><\/i>/g, (tam, kid: string) => {
    const m = y.yeniYil.get(kid); const bol = h.bolumler.find((b) => b.kid === kid);
    if (!m || !bol) return tam;
    const yillar = [...m.keys()].sort((a, b) => b.localeCompare(a));
    return tam + yillar.map((yil) => `<section class="mt-10"><h2 class="text-[22px] font-medium mb-3"><a class="no-underline hover:underline underline-offset-[3px]" href="${esc(yilRotasi(bol, yil, dil))}">${esc(yilBasligi(bol, yil, dil))}</a></h2><div class="doclist grid">${sirala([...(m.get(yil) as Satir[])]).map((x) => x.html).join('')}</div></section>`).join('');
  });
  // d) Mali Tablo ve Raporlar grupları — önce mevcut yıl ayrıntılarındaki belge sayısı (yalnızca aynı <details> içinde)
  html = html.replace(/(<span class="text-celik text-\[13px\] font-normal tnum">)(\d+)(<\/span><\/summary><div class="doclist grid pb-3">)((?:(?!<\/details>)[\s\S])*?)(<i data-ek="grup-yil" data-idx="(\d+)" data-yil="(\d{4})" hidden><\/i>)/g,
    (tam, a: string, n: string, b: string, ic: string, isaret: string, idx: string, yil: string) => {
      const s = y.grup.get(`${idx}|${yil}`); return s ? a + (Number(n) + s.length) + b + ic + isaret : tam;
    });
  html = html.replace(/<i data-ek="grup-yil" data-idx="(\d+)" data-yil="(\d{4})" hidden><\/i>/g, (tam, idx: string, yil: string) => {
    const s = y.grup.get(`${idx}|${yil}`); return s ? sirala([...s]).map((x) => x.html).join('') + tam : tam;
  });
  html = html.replace(/<div class="border-t border-pus font-disp py-3 flex items-center justify-between text-celik" data-ek="grup-yil-bos" data-idx="(\d+)" data-yil="(\d{4})"><span>\d{4}<\/span><span class="text-\[13px\]">—<\/span><\/div>/g,
    (tam, idx: string, yil: string) => { const s = y.grup.get(`${idx}|${yil}`); return s ? detay(yil, s, false) : tam; });
  html = html.replace(/<i data-ek="grup-yeni" data-idx="(\d+)" hidden><\/i>/g, (tam, idx: string) => {
    const m = y.grupYeni.get(Number(idx)); if (!m) return tam;
    return tam + [...m.keys()].sort((a, b) => b.localeCompare(a)).map((yil) => detay(yil, m.get(yil) as Satir[], true)).join('');
  });
  // e) Belge kütüphanesi ve arama verisi
  if (y.lib.length) html = html.replace('<script type="application/json" id="libDataEk">[]</script>', `<script type="application/json" id="libDataEk">${jsonGom(y.lib)}</script>`);
  if (y.srch.length) html = html.replace('<script type="application/json" id="srchDataEk">[]</script>', `<script type="application/json" id="srchDataEk">${jsonGom(y.srch)}</script>`);
  // f) Duyurular listesi (TR)
  if (dil === 'tr' && veri.haberler.length) {
    html = html.replace(/(<ul class="[^"]*" data-ek="haber-listesi">)/, (tam) => tam + veri.haberler.map((n) =>
      `<li class="border-t border-pus last:border-b py-3 grid grid-cols-[110px_1fr] gap-4 max-[560px]:grid-cols-1 max-[560px]:gap-1"><time class="text-[13px] text-celik tnum" datetime="${esc(n.tarih)}">${esc(tarihTr(n.tarih))}</time><a class="no-underline font-semibold hover:underline underline-offset-[3px]" href="/haberler/${esc(n.slug)}/">${esc(n.baslik)}</a></li>`).join(''));
  }
  // g) Ana sayfa
  if (p === '/' || p === '/en/') html = anaSayfa(html, h, veri, dil);
  return html;
}

function detay(yil: string, s: Satir[], acik: boolean): string {
  return `<details class="border-t border-pus group"${acik ? ' open' : ''}><summary class="cursor-pointer font-disp font-semibold py-3 flex items-center justify-between list-none"><span>${esc(yil)}</span><span class="text-celik text-[13px] font-normal tnum">${s.length}</span></summary><div class="doclist grid pb-3">${sirala([...s]).map((x) => x.html).join('')}</div></details>`;
}

/* ---------- Ana sayfa: Yatırımcı Köşesi kutusu, güncel belgeler, son duyurular ---------- */
interface Aday { tur: string; yil: string; rank: number; etiket: string; ad: string; yol: string; boyut: number; panel: boolean; id: number }
function anaSayfa(html: string, h: Harita, veri: PanelVerisi, dil: Dil): string {
  const CID = ' data-astro-cid-bkwvb2u2';
  const adaylar: Aday[] = h.guncel.map((g) => ({ ...g, panel: false, id: 0 }));
  for (const b of veri.belgeler) {
    const bol = h.bolumler.find((x) => x.kid === b.kid); if (!bol) continue;
    const tur = belgeTuru(bol, b.grup);
    if (!['faaliyet-raporlari', 'mali-tablolar', 'degerleme-raporlari'].includes(tur)) continue;
    const etiket = dil === 'en' ? (b.etiket_en || '').trim() : b.etiket; if (!etiket) continue;
    adaylar.push({ tur, yil: b.yil, rank: donemSirasi(b.etiket), etiket, ad: b.dosya_adi, yol: belgeYolu(b.anahtar), boyut: b.boyut, panel: true, id: b.id });
  }
  const enYeni = (tur: string) => adaylar.filter((a) => a.tur === tur)
    .sort((a, b) => b.yil.localeCompare(a.yil) || b.rank - a.rank || Number(b.panel) - Number(a.panel) || b.id - a.id)[0];
  const fr = enYeni('faaliyet-raporlari'), mt = enYeni('mali-tablolar'), dr = enYeni('degerleme-raporlari');
  const frBol = h.bolumler.find((b) => b.kid === '14') as Bolum;
  const AD = dil === 'en' ? { fr: frBol.adEn, mt: 'Financial Statements', ir: 'Financial Statements' } : { fr: 'Faaliyet Raporları', mt: 'Mali Tablolar', ir: 'Mali Tablo ve Raporlar' };
  const kucuk = (a: Aday) => `<small class="block font-normal text-celik text-[13px] mt-[2px]"${CID}>${esc(a.ad)}, PDF ${mb(a.boyut)}</small>`;
  const irA = (ek: string, a: Aday, metin: string) => `<a data-ek="${ek}" class="no-underline font-bold text-[17px] leading-[1.25] block py-[6px] border-t border-pus" href="${esc(a.yol)}" download${CID}>${esc(metin)}${kucuk(a)}</a>`;
  if (fr?.panel) html = html.replace(/<a data-ek="ir-faaliyet"[\s\S]*?<\/small><\/a>/, irA('ir-faaliyet', fr, dil === 'en' ? `${fr.yil} ${AD.fr}, ${fr.etiket}` : `${yilBasligi(frBol, fr.yil, 'tr')}, ${fr.etiket}`));
  if (mt?.panel) html = html.replace(/<a data-ek="ir-mali"[\s\S]*?<\/small><\/a>/, irA('ir-mali', mt, `${AD.ir}, ${mt.yil} ${mt.etiket}`));
  if (fr?.panel || mt?.panel || dr?.panel) {
    const satir = (a: Aday | undefined, onek: string) => a ? `<a class="docrow" href="${esc(a.yol)}" download><span class="d-y">${esc(a.yil)}</span><span class="d-t">${esc(onek ? `${onek}, ${a.etiket}` : a.etiket)}</span><span class="d-f" title="${esc(a.ad)}">${esc(a.ad)}</span><span class="d-s">PDF ${mb(a.boyut)}</span><span class="d-dl">${dil === 'en' ? 'Download' : 'İndir'}</span></a>` : '';
    html = html.replace(/(<div class="doclist grid" data-ek="guncel"[^>]*>)[\s\S]*?(<\/div>)/, (_t, a: string, b: string) => a + satir(fr, AD.fr) + satir(mt, AD.mt) + satir(dr, '') + b);
  }
  if (dil === 'tr' && veri.haberler.length) {
    const tum = [...veri.haberler.map((n) => ({ slug: n.slug, baslik: n.baslik, tarih: n.tarih })), ...h.haberler]
      .sort((a, b) => b.tarih.localeCompare(a.tarih)).slice(0, 3);
    html = html.replace(/(<ul [^>]*data-ek="son-haberler"[^>]*>)[\s\S]*?(<\/ul>)/, (_t, a: string, b: string) => a + tum.map((n) =>
      `<li class="border-t border-murekkep pt-[14px] grid gap-2"${CID}><time class="font-disp text-[13px] text-celik tnum" datetime="${esc(n.tarih)}"${CID}>${esc(tarihTr(n.tarih))}</time><a class="font-disp font-semibold text-[17px] leading-[1.3] no-underline hover:underline underline-offset-[3px]" href="/haberler/${esc(n.slug)}/"${CID}>${esc(n.baslik)}</a></li>`).join('') + b);
  }
  return html;
}

/* ---------- Şablondan sayfa: yeni yıl sayfaları ve panel duyuruları ---------- */
async function sablondan(env: Env, url: URL, h: Harita, veri: PanelVerisi, y: Yerlesim, dil: Dil): Promise<string | null> {
  const p = url.pathname;
  const yilM = /^\/(?:yatirimci-iliskileri|en\/investor-relations)\/([a-z-]+)\/(\d{4})\/$/.exec(p);
  if (yilM) {
    const kok = p.slice(0, p.length - 5);
    const bol = h.bolumler.find((b) => b.tip === 'yil' && b.kok[dil] === kok);
    if (!bol || !y.rota.has(p)) return null;
    const yil = yilM[2];
    const sablon = `/panel-sablon/yk/${dil}-${bol.kid}/`;
    const r = await env.ASSETS.fetch(new URL(sablon, url).toString());
    if (!r.ok) return null;
    const diger: Dil = dil === 'tr' ? 'en' : 'tr';
    const digerVar = !!bol.yillar[yil]?.[diger] || veri.belgeler.some((b) => b.kid === bol.kid && b.yil === yil && (diger === 'tr' || (b.etiket_en || '').trim()));
    const esYol = digerVar ? yilRotasi(bol, yil, diger) : bol.kok[diger];
    const og = dil === 'tr' ? bol.og : '/og/' + bol.kok.en.slice(1, -1).replace(/\//g, '--') + '.jpg';
    return (await r.text()).split(sablon).join(p).split('__ESYOL__').join(esYol).split('__BASLIK__').join(esc(yilBasligi(bol, yil, dil)))
      .split('/og/ana-sayfa.jpg').join(og).split('/og/en.jpg').join(og);
  }
  const haberM = /^\/haberler\/([a-z0-9-]+)\/$/.exec(p);
  if (haberM) {
    const n = veri.haberler.find((x) => x.slug === haberM[1]); if (!n) return null;
    const sablon = '/panel-sablon/haber/';
    const r = await env.ASSETS.fetch(new URL(sablon, url).toString());
    if (!r.ok) return null;
    const aciklama = n.govde.replace(/\s+/g, ' ').trim().slice(0, 155);
    let s = (await r.text()).split(sablon).join(p).split('__BASLIK__').join(esc(n.baslik)).split('__TARIH__').join(esc(tarihTr(n.tarih))).split('__ACIKLAMA__').join(esc(aciklama));
    const ekler = haberEkleri(n);
    const govde = `<div class="haber-govde">\n${haberHtml(n.govde)}\n${ekler.length ? `<div class="doc-items">${ekler.map((e) => `<a class="doc-link" href="${esc(belgeYolu(e.anahtar))}" download>${esc(e.ad)} (PDF ${mb(e.boyut)})</a>`).join('')}</div>` : ''}\n</div>`;
    s = s.replace('<div class="prose-ufuk" data-ek="haber-govde"></div>', `<div class="prose-ufuk" data-ek="haber-govde">${govde}</div>`);
    return s;
  }
  return null;
}

export type { BelgeEk, HaberEk };
