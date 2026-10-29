// Okuyucuyu denemek için örnek kitap PDF'i (Risale metni değildir): node scripts/fixtures/ornek-kitap-yap.mjs
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = createRequire('/opt/node-tools/node_modules/')('playwright'); }
const dolgu = [
  'Bu sayfa, uygulamanın dijital okuyucusunu denemek için hazırlanmış örnek bir sayfadır. Asıl kitabın metni burada yer almaz; sayfa düzeni, yazı boyu ve sayfa çevirme denensin diye konmuştur.',
  'Okuyucu sayfayı ekrana sığdırır, iki parmakla yakınlaştırılır, çift dokunuşla büyür. Sayfalar sağa ve sola kaydırılarak çevrilir; kalınan yer hatırlanır.',
  'İçindekiler listesinden bir bölüme dokununca o bölümün ilk sayfası açılır. Sayfa göstergesi kitabın neresinde olunduğunu söyler.',
  'Gece okumasında sayfa koyulaşır, göz yormaz. Sepya kâğıt rengi uzun okumada rahattır.',
];
const bolumler = ['Birinci Bölüm', 'İkinci Bölüm', 'Üçüncü Bölüm', 'Dördüncü Bölüm', 'Beşinci Bölüm', 'Altıncı Bölüm'];
let html = `<!doctype html><meta charset="utf-8"><style>
@page { size: 148mm 210mm; margin: 16mm 14mm 18mm; }
body { font-family: 'Liberation Serif', serif; font-size: 11.5pt; line-height: 1.55; color: #111; }
h1 { text-align: center; font-size: 15pt; letter-spacing: .08em; margin: 0 0 8mm; page-break-before: always; }
h1:first-of-type { page-break-before: auto; }
.kapak { height: 170mm; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
.kapak h2 { font-size: 22pt; margin: 0 0 6mm; } .kapak p { margin: 0; color: #444; }
p { text-align: justify; margin: 0 0 3.5mm; text-indent: 6mm; }
.sayfa-no { position: fixed; bottom: -10mm; left: 0; right: 0; text-align: center; font-size: 9pt; color: #555; }
</style><div class="kapak"><h2>ÖRNEK KİTAP</h2><p>Okuyucu denemesi</p><p style="margin-top:4mm">(Risale-i Nur metni değildir)</p></div>`;
for (const b of bolumler) {
  html += `<h1>${b.toLocaleUpperCase('tr')}</h1>`;
  for (let i = 0; i < 28; i++) html += `<p>${dolgu[i % dolgu.length]} ${dolgu[(i + 1) % dolgu.length]}</p>`;
}
const b = await playwright.chromium.launch();
const p = await b.newPage();
await p.setContent(html);
const pdf = await p.pdf({ width: '148mm', height: '210mm', printBackground: true, outline: true, tagged: true, displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: '<div style="width:100%;text-align:center;font-size:8px;color:#555"><span class="pageNumber"></span></div>', margin: { top: '16mm', bottom: '18mm', left: '14mm', right: '14mm' } });
writeFileSync(new URL("./ornek-kitap.pdf", import.meta.url), pdf);
await b.close();
console.log('tamam', pdf.length);
