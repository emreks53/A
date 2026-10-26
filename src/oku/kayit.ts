// Okuma ayarları ve kalınan yer cihazda (localStorage) saklanır. Depolama kapalıysa (gizli pencere vb.)
// uygulama yine çalışır, yalnız hatırlamaz.

export type Tema = 'gunduz' | 'sepya' | 'gece';
export type Aralik = 'dar' | 'normal' | 'genis';

export interface Ayarlar {
  /** Yazı boyutu adımı: 0 (en küçük) … BOYUTLAR.length - 1 */
  boyut: number;
  aralik: Aralik;
  tema: Tema;
}

/** Gövde yazısının referans px cinsinden boyutları */
export const BOYUTLAR = [16, 17.5, 19, 21, 23.5, 26] as const;
export const VARSAYILAN: Ayarlar = { boyut: 2, aralik: 'normal', tema: 'gunduz' };

export interface Konum {
  /** En üstte görünen paragrafın sırası */
  p: number;
  /** O paragrafın ne kadarının yukarıda kaldığı (0-1) */
  ic: number;
  /** Bölümün şu anki konuma kadar olan kısmı (0-1) */
  oran: number;
  /** Bölümün şimdiye kadar en çok okunan kısmı (0-1); "okundu" işareti buna bakar */
  enCok?: number;
  zaman: number;
}

const ANAHTAR = { ayarlar: 'kenz.oku.ayarlar', konumlar: 'kenz.oku.konumlar', son: 'kenz.oku.son' };

function oku<T>(anahtar: string): T | undefined {
  try {
    const ham = localStorage.getItem(anahtar);
    return ham ? (JSON.parse(ham) as T) : undefined;
  } catch {
    return undefined;
  }
}

function yaz(anahtar: string, deger: unknown): void {
  try {
    localStorage.setItem(anahtar, JSON.stringify(deger));
  } catch {
    // depolama dolu ya da kapalı
  }
}

export function ayarlariOku(): Ayarlar {
  const a = oku<Partial<Ayarlar>>(ANAHTAR.ayarlar) ?? {};
  return {
    boyut: Number.isInteger(a.boyut) && a.boyut! >= 0 && a.boyut! < BOYUTLAR.length ? a.boyut! : VARSAYILAN.boyut,
    aralik: a.aralik === 'dar' || a.aralik === 'genis' || a.aralik === 'normal' ? a.aralik : VARSAYILAN.aralik,
    tema: a.tema === 'sepya' || a.tema === 'gece' || a.tema === 'gunduz' ? a.tema : VARSAYILAN.tema,
  };
}

export function ayarlariYaz(a: Ayarlar): void {
  yaz(ANAHTAR.ayarlar, a);
}

type Konumlar = Record<string, Konum>;

export function konumOku(kitap: string, bolum: string): Konum | undefined {
  return oku<Konumlar>(ANAHTAR.konumlar)?.[`${kitap}/${bolum}`];
}

export function konumYaz(kitap: string, bolum: string, konum: Konum): void {
  const hepsi = oku<Konumlar>(ANAHTAR.konumlar) ?? {};
  const onceki = hepsi[`${kitap}/${bolum}`];
  hepsi[`${kitap}/${bolum}`] = { ...konum, enCok: Math.max(konum.oran, onceki ? enCokOkunan(onceki) : 0) };
  yaz(ANAHTAR.konumlar, hepsi);
  yaz(ANAHTAR.son, { kitap, bolum });
}

export function enCokOkunan(k: Konum): number {
  return Math.max(k.oran, k.enCok ?? 0);
}

export function tumKonumlar(): Konumlar {
  return oku<Konumlar>(ANAHTAR.konumlar) ?? {};
}

export function sonOkunan(): { kitap: string; bolum: string } | undefined {
  const s = oku<{ kitap?: unknown; bolum?: unknown }>(ANAHTAR.son);
  return s && typeof s.kitap === 'string' && typeof s.bolum === 'string' ? { kitap: s.kitap, bolum: s.bolum } : undefined;
}
