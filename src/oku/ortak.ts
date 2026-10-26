// Oku akışının veri türleri ve hem uygulamada hem derleme eklentisinde (vite/oku-videolar.ts) kullanılan yardımcılar.

export interface Menba {
  /** Risale-i Nur'daki eser, ör. "Lem'alar" */
  eser: string;
  /** Eserdeki yer, ör. "64. sayfa" ya da "19. Söz" */
  yer?: string;
}

export interface Video {
  id: string;
  baslik: string;
  /** public/ altına göre yollar */
  video: string;
  kapak: string;
  onizleme: string;
  menba: Menba[];
  /** Görüntü ve ses künyesi (lisansın gerektirdiği atıflar) */
  kunye?: string[];
}

/** "Lem'alar, 64. sayfa · Sözler, 19. Söz" */
export function menbaYazisi(menba: Menba[]): string {
  return menba.map((m) => (m.yer ? `${m.eser}, ${m.yer}` : m.eser)).join(' · ');
}

/** Neşret ile paylaşılan bağlantı: sitenin v/<id>/ sayfası (önizleme + uygulamadaki videoya yönlendirme) */
export function paylasimAdresi(site: string, id: string): string {
  return `${site}v/${id}/`;
}
