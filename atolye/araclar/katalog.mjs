#!/usr/bin/env node
// Atölye kataloğu: stiller/*/stil.json kimlik kartlarını denetler ve şunları üretir:
//   katalog.json  — bütün stiller, numara sırasıyla (makine için)
//   KATALOG.md    — aile aile görselli liste
//   galeri.html   — araclar/galeri-sablon.html şablonuna veriyi gömerek tarayıcı galerisi
// Kullanım: node atolye/araclar/katalog.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const kok = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dizin = path.join(kok, 'stiller');
const ALANLAR = ['kod', 'no', 'ad', 'ad_en', 'aile', 'ozgun', 'ozet', 'tanim', 'koken', 'ayirt_edici', 'palet', 'kodla_cizim', 'etiketler'];
const AILE_SIRASI = ['Boya ve Kuru Teknikler', 'Türk-İslam Sanatları', 'Uzak Doğu', 'Sanat Akımları', 'Grafik ve Dijital', 'Atölye Render Üslupları'];

const sorunlar = [];
const stiller = [];
for (const klasor of fs.readdirSync(dizin).sort()) {
  const yol = path.join(dizin, klasor);
  if (!fs.statSync(yol).isDirectory()) continue;
  const m = /^(S-(\d{3}))-[a-z0-9-]+$/.exec(klasor);
  if (!m) {
    sorunlar.push(`${klasor}: klasör adı "S-001-kisa-ad" biçiminde değil`);
    continue;
  }
  const kartYolu = path.join(yol, 'stil.json');
  if (!fs.existsSync(kartYolu)) {
    sorunlar.push(`${klasor}: stil.json yok`);
    continue;
  }
  let kart;
  try {
    kart = JSON.parse(fs.readFileSync(kartYolu, 'utf8'));
  } catch (e) {
    sorunlar.push(`${klasor}: stil.json okunamadı (${e.message})`);
    continue;
  }
  for (const a of ALANLAR) if (kart[a] === undefined || kart[a] === '') sorunlar.push(`${klasor}: "${a}" alanı eksik`);
  if (kart.kod !== m[1]) sorunlar.push(`${klasor}: kod "${kart.kod}" klasörle uyuşmuyor`);
  if (kart.no !== Number(m[2])) sorunlar.push(`${klasor}: no ${kart.no} koda uymuyor`);
  if (!AILE_SIRASI.includes(kart.aile)) sorunlar.push(`${klasor}: bilinmeyen aile "${kart.aile}"`);
  for (const r of kart.palet || []) if (!/^#[0-9A-Fa-f]{6}$/.test(r)) sorunlar.push(`${klasor}: palet rengi "${r}" #RRGGBB değil`);
  for (const d of ['ornek.html', 'ornek.webp']) if (!fs.existsSync(path.join(yol, d))) sorunlar.push(`${klasor}: ${d} yok`);
  stiller.push({ ...kart, klasor, gorsel: `stiller/${klasor}/ornek.webp`, kucuk: `stiller/${klasor}/kucuk.webp` });
}
stiller.sort((a, b) => a.no - b.no);
const kodlar = new Set();
for (const s of stiller) {
  if (kodlar.has(s.kod)) sorunlar.push(`${s.kod}: aynı kod iki kez kullanılmış`);
  kodlar.add(s.kod);
}

fs.writeFileSync(path.join(kok, 'katalog.json'), JSON.stringify(stiller, null, 2) + '\n');

// KATALOG.md
const ozgunSayisi = stiller.filter((s) => s.ozgun).length;
let md = `# Atölye kataloğu\n\n`;
md += `${stiller.length} stil · ${new Set(stiller.map((s) => s.aile)).size} aile · ${ozgunSayisi} atölye render üslubu. `;
md += `Bütün örnekler aynı sahneyi çizer (bkz. [sahne/SAHNE.md](sahne/SAHNE.md)). `;
md += `Bu dosya \`node atolye/araclar/katalog.mjs\` ile üretilir; elle düzenlemeyin.\n\n`;
md += `![Bütün stiller tek paftada](pafta.webp)\n\n`;
md += `| Kod | Stil | Aile |\n| --- | --- | --- |\n`;
for (const s of stiller) md += `| [${s.kod}](#${s.kod.toLowerCase()}) | ${s.ad}${s.ozgun ? ' ✦' : ''} | ${s.aile} |\n`;
md += `\n✦ atölyenin tanımladığı render üslubu\n`;
for (const aile of AILE_SIRASI) {
  const grup = stiller.filter((s) => s.aile === aile);
  if (!grup.length) continue;
  md += `\n## ${aile}\n`;
  for (const s of grup) {
    md += `\n### ${s.kod}\n\n`;
    md += `**${s.ad}** · *${s.ad_en}*${s.ozgun ? ' · ✦ atölye üslubu' : ''}\n\n`;
    md += `<img src="${s.gorsel}" width="360" alt="${s.kod} ${s.ad} örnek görseli">\n\n`;
    md += `${s.tanim}\n\n`;
    md += `- **Köken:** ${s.koken}\n`;
    md += `- **Ayırt edici:** ${s.ayirt_edici.join('; ')}\n`;
    md += `- **Palet:** ${s.palet.map((r) => '`' + r + '`').join(' ')}\n`;
    md += `- **Kodla çizim:** ${s.kodla_cizim}\n`;
    md += `- **Kaynak:** [\`${s.klasor}/ornek.html\`](stiller/${s.klasor}/ornek.html)\n`;
  }
}
fs.writeFileSync(path.join(kok, 'KATALOG.md'), md);

// galeri.html
const sablonYolu = path.join(kok, 'araclar', 'galeri-sablon.html');
if (fs.existsSync(sablonYolu)) {
  const veri = stiller.map(({ kod, no, ad, ad_en, aile, ozgun, ozet, tanim, koken, ayirt_edici, palet, kodla_cizim, etiketler, klasor, gorsel, kucuk }) => ({
    kod, no, ad, ad_en, aile, ozgun, ozet, tanim, koken, ayirt_edici, palet, kodla_cizim, etiketler, klasor, gorsel, kucuk,
  }));
  const json = JSON.stringify({ aileler: AILE_SIRASI.filter((a) => veri.some((s) => s.aile === a)), stiller: veri }).replace(/</g, '\\u003c');
  const sablon = fs.readFileSync(sablonYolu, 'utf8');
  if (!sablon.includes('/*KATALOG*/null')) sorunlar.push('galeri-sablon.html: /*KATALOG*/null yer tutucusu yok');
  const govde = sablon.replace('/*KATALOG*/null', json);
  // Depodaki galeri.html tam bir belge olur; şablonun <div class="sayfa"> öncesi (başlık, yazı tipleri, stil) head'e girer.
  const bol = govde.indexOf('\n<div class="sayfa">');
  const tam =
    '<!doctype html>\n<html lang="tr">\n<head>\n<meta charset="utf-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' +
    `${govde.slice(0, bol)}\n</head>\n<body>${govde.slice(bol)}\n</body>\n</html>\n`;
  fs.writeFileSync(path.join(kok, 'galeri.html'), tam);
  // --yayin <klasör>: yayın için yalnızca sayfa içeriği (belge iskeleti yayında eklenir) <klasör>/index.html
  const i = process.argv.indexOf('--yayin');
  if (i > 0 && process.argv[i + 1]) {
    fs.mkdirSync(process.argv[i + 1], { recursive: true });
    fs.writeFileSync(path.join(process.argv[i + 1], 'index.html'), govde);
  }
}

console.log(`${stiller.length} stil kataloğa yazıldı (${ozgunSayisi} atölye üslubu).`);
if (sorunlar.length) {
  console.log(`\n${sorunlar.length} sorun:`);
  for (const s of sorunlar) console.log(`  - ${s}`);
  process.exitCode = 1;
}
