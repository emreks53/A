// Oku akışının veri türleri ve hem uygulamada hem derleme eklentisinde (vite/oku-videolar.ts) kullanılan yardımcılar.

/** Risale-i Nur Külliyatı: Kenz'deki kitap sırası ve Menba'daki dizi bu sıradadır. */
export const KULLIYAT = [
  'Sözler',
  'Mektubat',
  "Lem'alar",
  'Şuâlar',
  "İşârâtü'l-İ'câz",
  'Mesnevî-i Nûriye',
  'Asâ-yı Mûsâ',
  'Barla Lâhikası',
  'Kastamonu Lâhikası',
  'Emirdağ Lâhikası',
  'Sikke-i Tasdîk-i Gaybî',
  'Tarihçe-i Hayat',
  'Muhâkemat',
  'İman ve Küfür Muvâzeneleri',
] as const;

/** Külliyat'ın bütün ciltleri bu renktedir (Menba rafı, açılan kapak; Güneş rafı ve Kenz CSS'te aynı değerdeki var(--cilt) ile) */
export const CILT = '#D7787B';

type KulliyatEseri = (typeof KULLIYAT)[number];

/** RNK Neşriyat baskısının sayfa sayısı: kitabın kalınlığı buna göre */
export const SAYFA: Record<KulliyatEseri, number> = {
  Sözler: 862,
  Mektubat: 575,
  "Lem'alar": 498,
  Şuâlar: 654,
  "İşârâtü'l-İ'câz": 324,
  'Mesnevî-i Nûriye': 271,
  'Asâ-yı Mûsâ': 251,
  'Barla Lâhikası': 397,
  'Kastamonu Lâhikası': 254,
  'Emirdağ Lâhikası': 559,
  'Sikke-i Tasdîk-i Gaybî': 269,
  'Tarihçe-i Hayat': 720,
  Muhâkemat: 143,
  'İman ve Küfür Muvâzeneleri': 208,
};

/** Kitabın gerçek kalınlığı (mm): iki kapak ~6 mm + sayfa başına 0,05 mm. Külliyat dışı bir ad için orta kalınlık. */
export function kalinlikMm(kitap: string): number {
  const sayfa = (SAYFA as Record<string, number | undefined>)[kitap];
  return 6 + 0.05 * (sayfa ?? 400);
}

/** Sırt yazısı: Güneş'teki satırlar, satır uzunluğuna göre yazı boyu katsayısı k (= .97 / en uzun satırın em boyu)
    ve Menba rafındaki kısa ad */
export const SIRT: Record<KulliyatEseri, { satirlar: string[]; k: number; kisa: string }> = {
  Sözler: { satirlar: ['Sözler'], k: 0.3764, kisa: 'Sözler' },
  Mektubat: { satirlar: ['Mektubat'], k: 0.2319, kisa: 'Mektubat' },
  "Lem'alar": { satirlar: ['Lem’alar'], k: 0.268, kisa: 'Lem’alar' },
  Şuâlar: { satirlar: ['Şuâlar'], k: 0.366, kisa: 'Şuâlar' },
  "İşârâtü'l-İ'câz": { satirlar: ['İşârâtü’l-İ’câz'], k: 0.1709, kisa: 'İşârât' },
  'Mesnevî-i Nûriye': { satirlar: ['Mesnevî-i Nûriye'], k: 0.1321, kisa: 'Mesnevî' },
  'Asâ-yı Mûsâ': { satirlar: ['Asâ-yı Mûsâ'], k: 0.1869, kisa: 'Asâ-yı Mûsâ' },
  'Barla Lâhikası': { satirlar: ['Barla Lâhikası'], k: 0.1608, kisa: 'Barla' },
  'Kastamonu Lâhikası': { satirlar: ['Kastamonu Lâhikası'], k: 0.1118, kisa: 'Kastamonu' },
  'Emirdağ Lâhikası': { satirlar: ['Emirdağ Lâhikası'], k: 0.1307, kisa: 'Emirdağ' },
  'Sikke-i Tasdîk-i Gaybî': { satirlar: ['Sikke-i Tasdîk-i', 'Gaybî'], k: 0.147, kisa: 'Sikke' },
  'Tarihçe-i Hayat': { satirlar: ['Tarihçe-i Hayat'], k: 0.1477, kisa: 'Tarihçe' },
  Muhâkemat: { satirlar: ['Muhâkemat'], k: 0.1909, kisa: 'Muhâkemat' },
  'İman ve Küfür Muvâzeneleri': { satirlar: ['İman ve Küfür', 'Muvâzeneleri'], k: 0.1555, kisa: 'Muvâzene' },
};

/** Sırt satırlarının em boyu (EB Garamond 600, harf aralığı .02em; Chromium'da ölçüldü): SVG'deki yazı boyu için */
export const SATIR_EM: Record<string, number> = {
  Sözler: 2.577,
  Mektubat: 4.183,
  'Lem’alar': 3.619,
  Şuâlar: 2.65,
  'İşârâtü’l-İ’câz': 5.675,
  'Mesnevî-i Nûriye': 7.343,
  'Asâ-yı Mûsâ': 5.189,
  'Barla Lâhikası': 6.033,
  'Kastamonu Lâhikası': 8.674,
  'Emirdağ Lâhikası': 7.419,
  'Sikke-i Tasdîk-i': 6.598,
  Gaybî: 2.505,
  'Tarihçe-i Hayat': 6.569,
  Muhâkemat: 5.081,
  'İman ve Küfür': 6.237,
  Muvâzeneleri: 5.652,
  İşârât: 2.417,
  Mesnevî: 3.488,
  Barla: 2.221,
  Kastamonu: 4.862,
  Emirdağ: 3.607,
  Sikke: 2.299,
  Tarihçe: 3.168,
  Muvâzene: 4.238,
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
