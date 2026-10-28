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

/** Ekranda düz kesme işareti yerine tipografik olanı: "Lem'alar" → "Lem’alar" (veride düz kalır) */
export function tipografik(metin: string): string {
  return metin.replace(/'/g, '’');
}
