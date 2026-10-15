/* Yönetim paneli ortak sunucu kodu (functions/_middleware.ts ve functions/api/yonetim/[[yol]].ts kullanır).
   15.10.2026: kaynak kod kaybından sonra, üretimdeki D1 şeması, yayındaki şablonlar (/panel-sablon/),
   /panel-veri/harita.json ve önceki mimari notlarına göre yeniden yazıldı. */

export interface Env {
  DB: D1Database;
  BELGELER: R2Bucket;
  ASSETS: Fetcher;
  RESEND_API_KEY?: string;
  KOD_TUZU?: string;
  ADMIN_EMAILS?: string;
  PANEL_FROM?: string;
}

export type Dil = 'tr' | 'en';

export interface BelgeEk {
  id: number; kid: string; grup: string; yil: string; etiket: string; etiket_en: string;
  anahtar: string; dosya_adi: string; boyut: number; sha256: string; sira: number; yayinda: number;
  olusturan: string; olusturma: string; guncelleme: string | null; hedef: string;
}
export interface HaberEki { ad: string; anahtar: string; boyut: number }
export interface HaberEk {
  id: number; slug: string; baslik: string; tarih: string; govde: string; ekler: string; yayinda: number;
  olusturan: string; olusturma: string; guncelleme: string | null;
}
export interface Bolum {
  kid: string; ad: string; adEn: string; tur: string; tip: 'yil' | 'kok' | 'grup' | 'alt';
  kok: Record<Dil, string>; yillar: Record<string, Record<Dil, string>>; desen: Record<Dil, string>;
  hedefler: { ad: string; rota: string }[]; gruplar: { ad: string; adEn: string; yillar: string[] }[]; og: string;
}
export interface GuncelBelge { tur: string; yil: string; rank: number; etiket: string; etiket_en?: string; ad: string; yol: string; boyut: number }
export interface Harita {
  bolumler: Bolum[]; esler: Record<string, string>; guncel: GuncelBelge[];
  haberler: { slug: string; baslik: string; tarih: string }[]; haberSluglari: string[]; turAdlari: Record<string, string>;
}
export interface PanelVerisi { belgeler: BelgeEk[]; haberler: HaberEk[] }

export const CEREZ = 'ypanel';
export const OTURUM_SURESI = 7 * 24 * 3600; // saniye

export const esc = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

/** Sitedeki biçim: "1,8 MB" */
export const mb = (b: number): string => (b / 1e6).toFixed(1).replace('.', ',') + ' MB';

/** 2026-10-15 → 15.10.2026 */
export const tarihTr = (t: string): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t || '');
  return m ? `${m[3]}.${m[2]}.${m[1]}` : t;
};

/** <script type="application/json"> içine güvenle gömülecek JSON */
export const jsonGom = (v: unknown): string => JSON.stringify(v).replace(/</g, '\\u003c');

/** Dönem sırası: "3 Aylık" → 3, "Yıllık" → 12, diğer → 0 */
export const donemSirasi = (etiket: string): number => {
  const m = /(\d{1,2})\s*[Aa]yl/.exec(etiket || '');
  if (m) return parseInt(m[1], 10);
  return /y[ıi]ll[ıi]k/i.test(etiket || '') ? 12 : 0;
};

export async function sha256Hex(veri: ArrayBuffer | string): Promise<string> {
  const buf = typeof veri === 'string' ? new TextEncoder().encode(veri) : veri;
  const h = await crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const TR_HARF: Record<string, string> = { ç: 'c', Ç: 'c', ğ: 'g', Ğ: 'g', ı: 'i', İ: 'i', ö: 'o', Ö: 'o', ş: 's', Ş: 's', ü: 'u', Ü: 'u', â: 'a', Â: 'a', î: 'i', Î: 'i', û: 'u', Û: 'u' };
const latinle = (s: string) => s.replace(/[çÇğĞıİöÖşŞüÜâÂîÎûÛ]/g, (c) => TR_HARF[c]).normalize('NFKD').replace(/[̀-ͯ]/g, '');

/** Başlıktan adres parçası (Türkçe harfler sadeleştirilir, en çok 80 karakter) */
export const slugla = (s: string): string =>
  latinle(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80).replace(/-+$/g, '') || 'duyuru';

/** Yüklenen dosya için güvenli ad: harf/rakam/_-. ; uzantı .pdf */
export const dosyaAdi = (ad: string): string => {
  const taban = (ad || 'belge').split(/[\\/]/).pop() || 'belge';
  const govde = latinle(taban.replace(/\.pdf$/i, '')).replace(/[^A-Za-z0-9._-]+/g, '_').replace(/_+/g, '_').replace(/^[._-]+|[._-]+$/g, '').slice(0, 120);
  return (govde || 'belge') + '.pdf';
};

export const rastgele = (n = 32): string => {
  const b = new Uint8Array(n); crypto.getRandomValues(b);
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
};

/* ---------- Statik harita (/panel-veri/harita.json, derleme anında üretildi) ---------- */
let haritaOnbellek: Harita | null = null;
export async function harita(env: Env, url: URL | string): Promise<Harita> {
  if (haritaOnbellek) return haritaOnbellek;
  const r = await env.ASSETS.fetch(new URL('/panel-veri/harita.json', url).toString());
  if (!r.ok) throw new Error('harita.json okunamadı');
  haritaOnbellek = (await r.json()) as Harita;
  return haritaOnbellek;
}

/* ---------- Panel verisi (D1), içerik sürümüne göre 5 sn önbellek ---------- */
let veriOnbellek: { surum: string; zaman: number; veri: PanelVerisi } | null = null;
export async function panelVerisi(env: Env): Promise<PanelVerisi> {
  const simdi = Date.now();
  if (veriOnbellek && simdi - veriOnbellek.zaman < 5000) return veriOnbellek.veri;
  const s = await env.DB.prepare(`SELECT deger FROM meta WHERE anahtar = 'surum'`).first<{ deger: string }>();
  const surum = s?.deger || '0';
  if (veriOnbellek && veriOnbellek.surum === surum) { veriOnbellek.zaman = simdi; return veriOnbellek.veri; }
  const [b, h] = await env.DB.batch([
    env.DB.prepare(`SELECT * FROM belge_ek WHERE yayinda = 1 ORDER BY yil DESC, sira DESC, id DESC`),
    env.DB.prepare(`SELECT * FROM haber_ek WHERE yayinda = 1 ORDER BY tarih DESC, id DESC`),
  ]);
  const veri: PanelVerisi = { belgeler: (b.results || []) as unknown as BelgeEk[], haberler: (h.results || []) as unknown as HaberEk[] };
  veriOnbellek = { surum, zaman: simdi, veri };
  return veri;
}
export async function surumArtir(env: Env): Promise<void> {
  await env.DB.prepare(`UPDATE meta SET deger = CAST(CAST(deger AS INTEGER) + 1 AS TEXT) WHERE anahtar = 'surum'`).run();
  veriOnbellek = null;
}

/* ---------- Belge yerleşimi ---------- */
export const belgeYolu = (anahtar: string): string => '/belgeler/' + anahtar.split('/').map(encodeURIComponent).join('/');

/** Belgenin R2 klasörü / belge kütüphanesi türü */
export const belgeTuru = (bol: Bolum, grup: string): string =>
  bol.kid === '4' ? (grup === 'Dipnotlar' ? 'dipnotlar' : 'mali-tablolar') : bol.tur;

export const yilRotasi = (bol: Bolum, yil: string, dil: Dil): string => bol.yillar[yil]?.[dil] || bol.kok[dil] + yil + '/';
export const yilBasligi = (bol: Bolum, yil: string, dil: Dil): string => (bol.desen[dil] || '{yil}').replace('{yil}', yil);

export interface Hedef { rota?: string; grupIdx?: number; yil: string; etiket: string }
/** Belgenin bir dildeki yeri. EN'de yalnızca İngilizce adı girilmiş belgeler gösterilir. */
export function belgeHedefi(bol: Bolum, b: BelgeEk, dil: Dil, h: Harita): Hedef | null {
  const etiket = dil === 'en' ? (b.etiket_en || '').trim() : b.etiket;
  if (!etiket) return null;
  if (bol.tip === 'yil') return { rota: yilRotasi(bol, b.yil, dil), yil: b.yil, etiket };
  if (bol.tip === 'grup') {
    const idx = bol.gruplar.findIndex((g) => g.ad === b.grup);
    return idx < 0 ? null : { grupIdx: idx, yil: b.yil, etiket };
  }
  const trRota = b.hedef || bol.kok.tr;
  if (dil === 'tr') return { rota: trRota, yil: b.yil, etiket };
  const en = trRota === bol.kok.tr ? bol.kok.en : h.esler[trRota];
  return en ? { rota: en, yil: b.yil, etiket } : null;
}

/** Sitedeki belge satırı (statik sayfalardaki .docrow ile aynı yapı) */
export const belgeSatiri = (dil: Dil, yil: string, etiket: string, yol: string, boyut: number, ad: string): string =>
  `<a class="docrow" href="${esc(yol)}" download><span class="d-y">${esc(yil)}</span><span class="d-t">${esc(etiket)}</span>` +
  `<span class="d-f" title="${esc(ad)}">${esc(ad)}</span><span class="d-s">PDF ${mb(boyut)}</span><span class="d-dl">${dil === 'en' ? 'Download' : 'İndir'}</span></a>`;

/** Duyuru metni: kaçışlı, boş satır = paragraf, tek satır sonu = <br>, adresler bağlantı */
export function haberHtml(govde: string): string {
  const bag = (s: string) => s.replace(/\bhttps?:\/\/[^\s<]+[^\s<.,;:!?)]/g, (u) => `<a href="${u}" rel="noopener">${u}</a>`);
  return (govde || '').replace(/\r\n?/g, '\n').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
    .map((p) => `<p>${bag(esc(p)).replace(/\n/g, '<br>')}</p>`).join('\n');
}
export const haberEkleri = (h: HaberEk): HaberEki[] => { try { return JSON.parse(h.ekler || '[]'); } catch { return []; } };

/* ---------- Oturum ---------- */
export const izinliler = (env: Env): string[] => (env.ADMIN_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
export function cerezOku(req: Request, ad = CEREZ): string {
  const c = req.headers.get('cookie') || '';
  for (const p of c.split(';')) { const [k, ...v] = p.trim().split('='); if (k === ad) return v.join('='); }
  return '';
}
export async function oturum(env: Env, req: Request): Promise<{ email: string } | null> {
  const t = cerezOku(req);
  if (!/^[0-9a-f]{64}$/.test(t)) return null;
  const ozet = await sha256Hex('oturum:' + t);
  const o = await env.DB.prepare(`SELECT email, bitis FROM oturum WHERE ozet = ?`).bind(ozet).first<{ email: string; bitis: number }>();
  if (!o || o.bitis < Math.floor(Date.now() / 1000)) return null;
  if (!izinliler(env).includes(o.email.toLowerCase())) return null;
  return { email: o.email };
}
