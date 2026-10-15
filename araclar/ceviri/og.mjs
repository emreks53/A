// EN paylaşım görselleri (OG, 1200×630): açık zeminli şablonda başlık alanı boşaltılıp İngilizce bölüm adı ve
// sayfa başlığı sitenin yazı tipleriyle yeniden yazılır (ölçüler mevcut görsellerden: Frank Ruhl Libre 74px/79px,
// Figtree 20px; son satır taban çizgisi y=485, bölüm adı ondan 88px yukarıda; uzun başlıkta yazı küçülür).
// Kullanım: node araclar/ceviri/og.mjs <işler.json>   (işler: [{cikti, taban, kicker, baslik}], yollar site/ köküne göre)
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { readFileSync, writeFileSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const KOK = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'site');
const isler = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const gecici = mkdtempSync(join(tmpdir(), 'og-'));
const kacis = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--allow-file-access-from-files'] });
const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
for (const is of isler) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:F;src:url(file://${KOK}/fonts/frank-ruhl-libre-normal.woff2) format('woff2');font-weight:300 900}
@font-face{font-family:G;src:url(file://${KOK}/fonts/figtree-normal.woff2) format('woff2');font-weight:300 900}
html,body{margin:0;width:1200px;height:630px;overflow:hidden}
body{background:url(file://${KOK}/${is.taban}) 0 0/1200px 630px no-repeat;position:relative}
#bos{position:absolute;left:40px;top:136px;width:690px;height:404px;background:#F2F2F0}
#k{position:absolute;left:64px;font:400 20px/1 G;letter-spacing:.1em;text-transform:uppercase;color:#5d6b78;white-space:nowrap}
#t{position:absolute;left:64px;width:650px;font-family:F;font-weight:500;letter-spacing:-.012em;color:#16191d;margin:0}
i{display:inline-block;width:0;height:0;vertical-align:baseline}
</style></head><body><div id="bos"></div><div id="k"><i id="kb"></i>${kacis(is.kicker)}</div><h1 id="t"><i id="t1"></i>${kacis(is.baslik)}<i id="t2"></i></h1></body></html>`;
  const yol = join(gecici, 'og.html');
  writeFileSync(yol, html);
  await p.goto('file://' + yol);
  await p.evaluate(() => document.fonts.ready);
  const sonuc = await p.evaluate(() => {
    const t = document.getElementById('t'), k = document.getElementById('k');
    const olc = (id) => document.getElementById(id).getBoundingClientRect().top;
    let s = 74;
    for (const [boy, enCok] of [[74, 3], [64, 4], [56, 5], [48, 6], [42, 7]]) {
      s = boy; t.style.fontSize = s + 'px'; t.style.lineHeight = Math.round(s * 79 / 74) + 'px'; t.style.top = '0px';
      const satir = Math.round((olc('t2') - olc('t1')) / Math.round(s * 79 / 74)) + 1;
      if (satir <= enCok) break;
    }
    // son satır taban çizgisi 485'e
    t.style.top = (485 - olc('t2')) + 'px';
    const ilk = olc('t1');
    k.style.top = '0px';
    k.style.top = (ilk - Math.round(s * 88 / 74) - olc('kb')) + 'px';
    return { s, ust: k.getBoundingClientRect().top, ilk };
  });
  if (sonuc.ust < 140) throw new Error('başlık sığmadı: ' + is.cikti + ' ' + JSON.stringify(sonuc));
  await p.screenshot({ path: join(KOK, is.cikti), type: 'jpeg', quality: 88 });
  console.log(is.cikti, sonuc.s + 'px');
}
await b.close();
