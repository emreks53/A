// Telefon uygulamasının paketine kitap PDF'leri konmaz (çok yer tutar); uygulama onları siteden okur.
// "npm run build" sonrası, "cap sync" öncesi çalışır.
import { existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const dizin = resolve('dist/kitaplar');
if (existsSync(dizin)) {
  rmSync(dizin, { recursive: true });
  console.log('dist/kitaplar pakete konmadı (PDF\'ler siteden okunur)');
}
