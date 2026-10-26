import { kitaplar } from 'virtual:oku-katalog';
import { bolumCoz, type Bolum } from './metin';

export type { BolumOzet, KitapOzet } from '../../vite/oku-katalog';
export { kitaplar };

// Her bölüm ayrı bir parça olarak derlenir; yalnız açılan bölüm indirilir (çevrimdışı önbellekte hepsi bulunur).
const kaynaklar = import.meta.glob<string>('/content/oku/*/*.md', { query: '?raw', import: 'default' });
const onbellek = new Map<string, Promise<Bolum>>();

export function kitapBul(id: string | undefined) {
  return kitaplar.find((k) => k.id === id);
}

export function bolumBul(kitapId: string | undefined, bolumId: string | undefined) {
  const kitap = kitapBul(kitapId);
  const sira = kitap ? kitap.bolumler.findIndex((b) => b.id === bolumId) : -1;
  if (!kitap || sira < 0) return undefined;
  return { kitap, bolum: kitap.bolumler[sira], sira, onceki: kitap.bolumler[sira - 1], sonraki: kitap.bolumler[sira + 1] };
}

export function bolumYukle(dosya: string): Promise<Bolum> {
  let soz = onbellek.get(dosya);
  if (!soz) {
    const yukle = kaynaklar[dosya];
    if (!yukle) return Promise.reject(new Error(`Bölüm bulunamadı: ${dosya}`));
    soz = yukle().then(bolumCoz);
    soz.catch(() => onbellek.delete(dosya));
    onbellek.set(dosya, soz);
  }
  return soz;
}

/** Ortalama 180 kelime/dakika ile okuma süresi. */
export function okumaSuresi(kelime: number): string {
  const dk = Math.max(1, Math.round(kelime / 180));
  return `${dk} dk`;
}
