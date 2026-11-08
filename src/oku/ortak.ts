// Oku akışının veri türleri ve hem uygulamada hem derleme eklentisinde (vite/oku-videolar.ts) kullanılan yardımcılar.

/** Risale-i Nur Külliyatı, RNK Neşriyat kütüphanesindeki sırayla (Büyük Boy Eserler). Kenz'deki kitap sırası,
    Güneş'teki iki yığın (sütun sütun: ilk YIGIN_SUTUN eser sol yığın, üstten alta; sonra sağ yığın, en sağ altta
    Muhâkemat) ve Menba çizimindeki yığınlar bu sıradadır. */
export const KULLIYAT = [
  'Sözler',
  'Mektubat',
  "Lem'alar",
  'Şuâlar',
  'Mesnevî-i Nûriye',
  "İşârâtü'l-İ'câz",
  'Barla Lâhikası',
  'Kastamonu Lâhikası',
  'Emirdağ Lâhikası',
  'Sikke-i Tasdîk-i Gaybî',
  'Tarihçe-i Hayat',
  'Asâ-yı Mûsâ',
  'İman ve Küfür Muvâzeneleri',
  'Muhâkemat',
] as const;

/** Güneş ve Menba'daki sol yığının eser sayısı (geri kalanı sağ yığın) */
export const YIGIN_SUTUN = 7;

/** Külliyat'ın bütün ciltleri bu renktedir (Menba yığınları, açılan kapak; Güneş ve Kenz CSS'te aynı değerdeki var(--cilt) ile) */
export const CILT = '#D7787B';

/** Sırt ve kapak adının rengi: bezle uyan ten rengi (CSS'te var(--ten)) */
export const TEN = '#F8E2D4';

export type KulliyatEseri = (typeof KULLIYAT)[number];

/** Kalınlık / sırt boyu: kullanıcının fotoğrafından (RNK deri cilt Külliyat), perspektif düzeltilmiş.
    Göreli kalınlık "tıpatıp" bu oranlardan gelir. */
export const KALINLIK: Record<KulliyatEseri, number> = {
  Sözler: 0.1869,
  Mektubat: 0.131,
  "Lem'alar": 0.115,
  Şuâlar: 0.1582,
  'Mesnevî-i Nûriye': 0.0724,
  "İşârâtü'l-İ'câz": 0.0844,
  'Barla Lâhikası': 0.1003,
  'Kastamonu Lâhikası': 0.0751,
  'Emirdağ Lâhikası': 0.1097,
  'Sikke-i Tasdîk-i Gaybî': 0.0644,
  'Tarihçe-i Hayat': 0.1489,
  'Asâ-yı Mûsâ': 0.0878,
  'İman ve Küfür Muvâzeneleri': 0.0692,
  Muhâkemat: 0.0614,
};

/** Sırt boyu (mm): kalınlık mm = oran x 240 (yalnız gösterim birimi; ekrandaki ölçek CSS'te, iki yığında tek) */
export const SIRT_BOYU_MM = 240;

/** Kitabın kalınlığı (mm). Külliyat dışı bir ad için orta kalınlık. */
export function kalinlikMm(kitap: string): number {
  return ((KALINLIK as Record<string, number | undefined>)[kitap] ?? 0.1) * SIRT_BOYU_MM;
}

/** Sırt yazısı: satırlar, Menba'daki kısa ad ve EB Garamond 600 ölçüleri (harf aralığı .01em; Chromium'da ölçüldü).
    em: en uzun satırın eni; hm: yazının bandın yarı yüksekliğine sığması gereken yarım yüksekliği (em);
    dy: iki satırlı adın optik kaydırması (em). */
export const SIRT: Record<KulliyatEseri, { satirlar: string[]; kisa: string; em: number; hm: number; dy?: number }> = {
  Sözler: { satirlar: ['Sözler'], kisa: 'Sözler', em: 2.517, hm: 0.375 },
  Mektubat: { satirlar: ['Mektubat'], kisa: 'Mektubat', em: 4.103, hm: 0.375 },
  "Lem'alar": { satirlar: ['Lem’alar'], kisa: 'Lem’alar', em: 3.539, hm: 0.375 },
  Şuâlar: { satirlar: ['Şuâlar'], kisa: 'Şuâlar', em: 2.59, hm: 0.635 },
  'Mesnevî-i Nûriye': { satirlar: ['Mesnevî-i Nûriye'], kisa: 'Mesnevî', em: 7.183, hm: 0.645 },
  "İşârâtü'l-İ'câz": { satirlar: ['İşârâtü’l-İ’câz'], kisa: 'İşârât', em: 5.525, hm: 0.635 },
  'Barla Lâhikası': { satirlar: ['Barla Lâhikası'], kisa: 'Barla', em: 5.893, hm: 0.375 },
  // tek satırda bant enine sığmak için küçülürdü (390'da 14,6 px); iki satırda 16,5 px
  'Kastamonu Lâhikası': { satirlar: ['Kastamonu', 'Lâhikası'], kisa: 'Kastamonu', em: 4.772, hm: 0.805, dy: -0.015 },
  'Emirdağ Lâhikası': { satirlar: ['Emirdağ Lâhikası'], kisa: 'Emirdağ', em: 7.259, hm: 0.645 },
  'Sikke-i Tasdîk-i Gaybî': { satirlar: ['Sikke-i Tasdîk-i Gaybî'], kisa: 'Sikke', em: 9.128, hm: 0.645 },
  'Tarihçe-i Hayat': { satirlar: ['Tarihçe-i Hayat'], kisa: 'Tarihçe', em: 6.419, hm: 0.645 },
  'Asâ-yı Mûsâ': { satirlar: ['Asâ-yı Mûsâ'], kisa: 'Asâ-yı Mûsâ', em: 5.079, hm: 0.645 },
  'İman ve Küfür Muvâzeneleri': { satirlar: ['İman ve Küfür', 'Muvâzeneleri'], kisa: 'Muvâzene', em: 6.107, hm: 0.9, dy: 0.07 },
  Muhâkemat: { satirlar: ['Muhâkemat'], kisa: 'Muhâkemat', em: 4.991, hm: 0.375 },
};

/** Satırların em boyu (EB Garamond 600, harf aralığı .01em): Menba çizimi ve kapaktaki yazı boyu için */
export const SATIR_EM: Record<string, number> = {
  Sözler: 2.517,
  Mektubat: 4.103,
  'Lem’alar': 3.539,
  Şuâlar: 2.59,
  'Mesnevî-i Nûriye': 7.183,
  'İşârâtü’l-İ’câz': 5.525,
  'Barla Lâhikası': 5.893,
  'Kastamonu Lâhikası': 8.494,
  'Emirdağ Lâhikası': 7.259,
  'Sikke-i Tasdîk-i Gaybî': 9.128,
  'Tarihçe-i Hayat': 6.419,
  'Asâ-yı Mûsâ': 5.079,
  'İman ve Küfür': 6.107,
  Muvâzeneleri: 5.532,
  'İman ve Küfür Muvâzeneleri': 11.874,
  Muhâkemat: 4.991,
  İşârât: 2.357,
  Mesnevî: 3.418,
  Barla: 2.171,
  Kastamonu: 4.772,
  Lâhikası: 3.487,
  Emirdağ: 3.537,
  Sikke: 2.249,
  Tarihçe: 3.098,
  Muvâzene: 4.158,
};

export interface Video {
  id: string;
  /** Geçtiği yer: ör. "On Yedinci Lem'a'dan" */
  baslik: string;
  /** Risale-i Nur'daki kitap (KULLIYAT'tan), ör. "Lem'alar" */
  kitap: string;
  /** Kitaptaki bölüm, ör. "On Yedinci Lem'a" */
  bolum: string;
  /** Bölümün içindeki kısım (isteğe bağlı), ör. "Altıncı Mesele" */
  kisim?: string;
  /** Kitaptaki sayfa (isteğe bağlı) */
  sayfa?: number;
  /** Konusunu anlatan üç etiket, "#" olmadan: ör. ["ihlas", "muhabbet", "kurtuluş"] */
  etiketler: string[];
  /** Süre (saniye); derlemede video dosyasından okunur */
  sure: number;
  /** public/ altına göre yollar */
  video: string;
  kapak: string;
  onizleme: string;
  /** Görüntü ve ses künyesi (lisansın gerektirdiği ya da teşekkür edilen kaynaklar) */
  kunye?: string[];
}

/** "Lem'alar, On Yedinci Lem'a, 154. sayfa" (kısım varsa bölümden sonra) */
export function menbaYazisi(v: Pick<Video, 'kitap' | 'bolum' | 'kisim' | 'sayfa'>): string {
  return [v.kitap, v.bolum, v.kisim, v.sayfa ? `${v.sayfa}. sayfa` : undefined].filter(Boolean).join(', ');
}

/** Reels'in altındaki küçük yazı: "On Yedinci Lem’a", "On Birinci Şuâ · Altıncı Mesele" */
export function reelKaynagi(v: Pick<Video, 'bolum' | 'kisim'>): string {
  return tipografik(v.kisim ? `${v.bolum} · ${v.kisim}` : v.bolum);
}

/** ["ihlas", "muhabbet"] → "#ihlas #muhabbet" */
export function etiketYazisi(etiketler: string[]): string {
  return etiketler.map((e) => `#${e}`).join(' ');
}

/** 134 → "2:14" */
export function sureYazisi(saniye: number): string {
  const s = Math.max(0, Math.round(saniye));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Neşret ile paylaşılan bağlantı: sitenin v/<id>/ sayfası (önizleme + uygulamadaki videoya yönlendirme) */
export function paylasimAdresi(site: string, id: string): string {
  return `${site}v/${id}/`;
}

/** Adreslerde ve kimliklerde kullanılan sade yazım: "İşârâtü'l-İ'câz" → "isaratu-l-i-caz" */
export function kimlikYap(s: string): string {
  return s
    .toLocaleLowerCase('tr')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Ekranda düz kesme işareti yerine tipografik olanı: "Lem'alar" → "Lem’alar" (veride düz kalır) */
export function tipografik(metin: string): string {
  return metin.replace(/'/g, '’');
}
