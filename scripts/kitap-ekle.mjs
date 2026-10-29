// Güneş'e kitap ekler ya da günceller:
//   node scripts/kitap-ekle.mjs "Lem'alar" ~/indirilenler/lemalar.pdf [--sayfa-farki 4]
// PDF'i public/kitaplar/<kimlik>.pdf olarak kopyalar; sayfa sayısını ve PDF'in kendi içindekiler listesini
// (varsa) okuyup content/kitaplar/kitaplar.json'a yazar. --sayfa-farki: basılı 1. sayfadan önceki numarasız
// sayfaların sayısı (kapak, önsöz …); içindekilerdeki sayfa numaraları basılı numaraya göre yazılır.
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const KULLIYAT = [
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
];
const kimlik = (ad) =>
  ad
    .replace(/['’]/g, '')
    .toLocaleLowerCase('tr')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ı/g, 'i')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const [ad, kaynakPdf, ...diger] = process.argv.slice(2);
const sade = (s) => s?.replace(/’/g, "'");
const kitap = KULLIYAT.find((k) => sade(k).toLocaleLowerCase('tr') === sade(ad ?? '').toLocaleLowerCase('tr'));
if (!kitap || !kaynakPdf) {
  console.error(`Kullanım: node scripts/kitap-ekle.mjs "<eser>" <dosya.pdf> [--sayfa-farki N]\nEserler: ${KULLIYAT.join(', ')}`);
  process.exit(1);
}
const farkIndex = diger.indexOf('--sayfa-farki');
const sayfaFarki = farkIndex >= 0 ? Number(diger[farkIndex + 1]) : 0;
if (!Number.isInteger(sayfaFarki) || sayfaFarki < 0) {
  console.error('--sayfa-farki sıfır ya da pozitif bir tam sayı olmalı');
  process.exit(1);
}

const veri = readFileSync(kaynakPdf);
if (veri.subarray(0, 5).toString('latin1') !== '%PDF-') {
  console.error(`${kaynakPdf} bir PDF değil`);
  process.exit(1);
}
const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
const gorev = pdfjs.getDocument({ data: new Uint8Array(veri), verbosity: 0 });
const belge = await gorev.promise;
const icindekiler = [];
const gez = async (ogeler, derinlik) => {
  for (const o of ogeler ?? []) {
    try {
      const hedef = typeof o.dest === 'string' ? await belge.getDestination(o.dest) : o.dest;
      if (hedef?.[0] !== undefined) {
        const sira = typeof hedef[0] === 'number' ? hedef[0] : await belge.getPageIndex(hedef[0]);
        const basili = sira + 1 - sayfaFarki;
        if (basili >= 1 && o.title?.trim()) icindekiler.push({ baslik: o.title.trim(), sayfa: basili, ...(derinlik ? { derinlik: Math.min(derinlik, 3) } : {}) });
      }
    } catch {
      // çözülemeyen öğe atlanır
    }
    await gez(o.items, derinlik + 1);
  }
};
await gez(await belge.getOutline(), 0);

const yol = `kitaplar/${kimlik(kitap)}.pdf`;
mkdirSync(resolve('public/kitaplar'), { recursive: true });
copyFileSync(kaynakPdf, resolve('public', yol));

const listeYolu = resolve('content/kitaplar/kitaplar.json');
const liste = JSON.parse(readFileSync(listeYolu, 'utf8'));
const onceki = liste.kitaplar.find((k) => k.kitap === kitap);
const kayit = {
  kitap,
  pdf: yol,
  sayfaSayisi: belge.numPages,
  ...(sayfaFarki ? { sayfaFarki } : {}),
  // PDF'te içindekiler yoksa elle yazılmış olan korunur
  icindekiler: icindekiler.length ? icindekiler : (onceki?.icindekiler ?? []),
};
liste.kitaplar = liste.kitaplar.filter((k) => k.kitap !== kitap).concat(kayit);
liste.kitaplar.sort((a, b) => KULLIYAT.indexOf(a.kitap) - KULLIYAT.indexOf(b.kitap));
writeFileSync(listeYolu, JSON.stringify(liste, null, 2) + '\n');
console.log(`${kitap}: public/${yol}, ${belge.numPages} sayfa, içindekiler ${kayit.icindekiler.length} başlık`);
await gorev.destroy();
