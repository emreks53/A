// Güneş (Risale-i Nur'u dijital okuma): kitap verisinin türleri ve hem uygulamada hem derleme eklentisinde
// (vite/kitaplar.ts) kullanılan yardımcılar.
import { kimlikYap } from '../oku/ortak.ts';

export interface IcindekilerOgesi {
  baslik: string;
  /** Kitabın basılı sayfa numarası */
  sayfa: number;
  /** 0: ana bölüm (ör. "On Yedinci Lem'a"), 1: alt bölüm (ör. "Birinci Nükte") */
  derinlik: number;
}

export interface Kitap {
  /** Külliyat'taki adı (KULLIYAT'tan; veride düz kesme işareti) */
  kitap: string;
  /** Adreste görünen kimliği: "lemalar" */
  kimlik: string;
  /** PDF: public/ altına göre yol (ör. "kitaplar/lemalar.pdf") ya da https adresi */
  pdf: string;
  /** PDF'in sayfa sayısı (biliniyorsa; rafta "480 sayfa" gibi gösterilir) */
  sayfaSayisi?: number;
  /** Basılı sayfa n, PDF'in (n + sayfaFarki). sayfasıdır (kapak, önsöz gibi numarasız sayfalar kadar) */
  sayfaFarki: number;
  icindekiler: IcindekilerOgesi[];
}

/** PDF'i olmayan kitapların dış sitedeki adresleri (ör. RNK Neşriyat'ın okuma sitesi rnk.tr) */
export interface Baglanti {
  /** Sitenin adı (rafta ve ekran okuyucuda söylenir) */
  ad: string;
  /** Adreste basılı sayfa numarasını taşıyan parametre (ör. "p": …&p=203); yoksa kitap sayfasız açılır */
  sayfaParametresi?: string;
  /** Eser adı → kitabın https adresi */
  adresler: Record<string, string>;
}

/** Kitabın dış sitedeki adresi (yoksa undefined); sayfa verilirse ve site destekliyorsa o basılı sayfada */
export function disAdres(b: Baglanti | null, kitap: string, sayfa?: number): string | undefined {
  const adres = b?.adresler[kitap];
  if (!b?.sayfaParametresi || !adres || !sayfa) return adres;
  const u = new URL(adres);
  u.searchParams.set(b.sayfaParametresi, String(sayfa));
  return u.href;
}

/** "Lem'alar" → "lemalar", "İşârâtü'l-İ'câz" → "isaratul-icaz" */
export function kitapKimligi(ad: string): string {
  return kimlikYap(ad.replace(/['’]/g, ''));
}

/** PDF sayfası → basılı sayfa (numarasız ön sayfalar için null) */
export function basiliSayfa(k: Pick<Kitap, 'sayfaFarki'>, pdfSayfasi: number): number | null {
  const n = pdfSayfasi - k.sayfaFarki;
  return n >= 1 ? n : null;
}

/** Basılı sayfa → PDF sayfası (1'den sayfa sayısına sınırlanır) */
export function pdfSayfasi(k: Pick<Kitap, 'sayfaFarki'>, basili: number, toplam = Infinity): number {
  return Math.min(Math.max(1, Math.round(basili) + k.sayfaFarki), toplam);
}

/** İçindekilerde verilen PDF sayfasının içinde bulunduğu en derin bölüm (yoksa null) */
export function bolumBul(k: Pick<Kitap, 'sayfaFarki' | 'icindekiler'>, pdfSayfasiNo: number): IcindekilerOgesi | null {
  let bulunan: IcindekilerOgesi | null = null;
  for (const o of k.icindekiler) {
    if (o.sayfa + k.sayfaFarki <= pdfSayfasiNo && (!bulunan || o.sayfa >= bulunan.sayfa)) bulunan = o;
  }
  return bulunan;
}

/** Kitabın bu (basılı) sayfalarında geçen video (okuyucudaki "Bu sayfanın videosu") */
export function sayfaninVideosu<V extends { kitap: string; sayfa?: number }>(videolar: readonly V[], kitap: string, basililar: (number | null)[]): V | undefined {
  return videolar.find((v) => v.kitap === kitap && v.sayfa !== undefined && basililar.includes(v.sayfa));
}
