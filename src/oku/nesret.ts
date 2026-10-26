// "Neşret": videonun paylaşım bağlantısını telefonun paylaşım menüsüyle (Instagram'daki gibi) gönderir.
// Bağlantı sitenin v/<id>/ sayfasıdır: önizlemesi o videonun görseli ve adıyla çıkar, açınca video başlar.
import { Capacitor } from '@capacitor/core';
import { site } from 'virtual:oku-videolar';
import { paylasimAdresi, type Video } from './ortak';

export type NesretSonucu = 'paylasildi' | 'kopyalandi' | 'vazgecildi' | 'olmadi';

async function kopyala(metin: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(metin);
    return true;
  } catch {
    // Pano izni yoksa eski yol
    const alan = document.createElement('textarea');
    alan.value = metin;
    alan.setAttribute('readonly', '');
    alan.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
    document.body.append(alan);
    alan.select();
    let oldu = false;
    try {
      oldu = document.execCommand('copy');
    } catch {
      oldu = false;
    }
    alan.remove();
    return oldu;
  }
}

export async function nesret(v: Video): Promise<NesretSonucu> {
  const url = paylasimAdresi(site, v.id);
  if (Capacitor.isNativePlatform()) {
    try {
      const { Share } = await import('@capacitor/share');
      await Share.share({ title: v.baslik, text: v.baslik, url, dialogTitle: 'Neşret' });
      return 'paylasildi';
    } catch (e) {
      // Kullanıcı menüyü kapatınca da hata döner
      return /cancel/i.test(String((e as Error)?.message ?? e)) ? 'vazgecildi' : (await kopyala(url)) ? 'kopyalandi' : 'olmadi';
    }
  }
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: v.baslik, text: v.baslik, url });
      return 'paylasildi';
    } catch (e) {
      if ((e as DOMException)?.name === 'AbortError') return 'vazgecildi';
    }
  }
  return (await kopyala(url)) ? 'kopyalandi' : 'olmadi';
}
