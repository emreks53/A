// Telefon uygulamasına (Capacitor) ve tarayıcı çubuğuna özgü küçük ayarlar.
import { Capacitor } from '@capacitor/core';

const temaRengi = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
const ILK_RENK = temaRengi?.content ?? '#5AA2EC';

/**
 * Üstteki durum çubuğunu ekranın zeminine uydurur.
 * acikZemin: zemin açık renkliyse saat/pil simgeleri koyu çizilir. renk verilmezse ana ekranın rengi kullanılır.
 */
export function durumCubugu(acikZemin: boolean, renk?: string): void {
  if (temaRengi) temaRengi.content = renk ?? ILK_RENK;
  if (!Capacitor.isNativePlatform()) return;
  void import('@capacitor/status-bar')
    .then(({ StatusBar, Style }) => StatusBar.setStyle({ style: acikZemin ? Style.Light : Style.Dark }))
    .catch(() => undefined);
}
