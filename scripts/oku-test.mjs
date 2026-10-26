// Oku bölümünü gerçek tarayıcıda baştan sona dener (derlenmiş dist/ üzerinde).
// Kullanım: npm run build && npm run test:oku   (Playwright + Chromium gerekir)
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require('playwright');
} catch {
  playwright = createRequire('/opt/node-tools/node_modules/')('playwright');
}

const root = resolve('dist');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.json': 'application/json', '.jsonl': 'application/jsonl', '.webmanifest': 'application/manifest+json' };
const server = createServer(async (req, res) => {
  const tam = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (!tam.startsWith('/A/')) return res.writeHead(404).end();
  const path = tam.slice(2);
  const file = join(root, path.endsWith('/') ? path + 'index.html' : path);
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
// GitHub Pages'teki gibi alt yolda çalıştığını da sınamak için /A/ altından sunulur.
const base = `http://127.0.0.1:${server.address().port}/A/`;

const browser = await playwright.chromium.launch();
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const page = await context.newPage();
const hatalar = [];
page.on('pageerror', (e) => hatalar.push(String(e)));
page.on('console', (m) => m.type() === 'error' && hatalar.push(m.text()));

let gecen = 0;
async function adim(ad, fn) {
  try {
    await fn();
    gecen++;
    console.log(`  ✓ ${ad}`);
  } catch (e) {
    console.error(`  ✗ ${ad}\n    ${e.message.split('\n').join('\n    ')}`);
    await page.screenshot({ path: `oku-test-hata.png` }).catch(() => {});
    await browser.close();
    server.close();
    process.exit(1);
  }
}

/** Metinde geçen kelimenin ortasına dokunur. */
async function kelimeyeDokun(kelime, sira = 0) {
  const nokta = await page.evaluate(
    ([k, s]) => {
      const kok = document.querySelector('.okuyucu-metin');
      const w = document.createTreeWalker(kok, NodeFilter.SHOW_TEXT);
      let bulunan = 0;
      for (let n = w.nextNode(); n; n = w.nextNode()) {
        let i = -1;
        while ((i = n.data.indexOf(k, i + 1)) >= 0) {
          if (bulunan++ < s) continue;
          const r = document.createRange();
          r.setStart(n, i + Math.floor(k.length / 2));
          r.setEnd(n, i + Math.floor(k.length / 2) + 1);
          r.startContainer.parentElement.scrollIntoView({ block: 'center' });
          const b = r.getBoundingClientRect();
          return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
        }
      }
      return null;
    },
    [kelime, sira],
  );
  assert.ok(nokta, `"${kelime}" metinde bulunamadı`);
  await page.waitForTimeout(150);
  await page.mouse.click(nokta.x, nokta.y);
}

async function sayfaMetni() {
  await page.waitForSelector('.alt-sayfa.acik');
  await page.waitForFunction(() => !document.querySelector('.alt-sayfa.acik .madde__durum')?.textContent?.includes('açılıyor'));
  return page.locator('.alt-sayfa.acik .alt-sayfa__govde').innerText();
}

const kaydirmaOrani = () =>
  page.evaluate(() => {
    const k = document.querySelector('.okuyucu-kaydirma');
    return k.scrollTop / (k.scrollHeight - k.clientHeight);
  });

console.log('Oku bölümü');
await page.goto(base + '#/oku');

await adim('kitaplık örnek kitabı listeler', async () => {
  await page.waitForSelector('.kitap-karti');
  assert.match(await page.locator('.kitap-karti').first().innerText(), /Örnek Kitap/);
  assert.equal(await page.locator('.tab--oku').getAttribute('aria-current'), 'page');
});

await adim('kitaba dokununca bölümler açılır', async () => {
  await page.locator('.kitap-karti').first().click();
  await page.waitForSelector('.bolum-satiri');
  assert.equal(await page.locator('.bolum-satiri').count(), 2);
  assert.equal(new URL(page.url()).hash, '#/oku/ornek');
});

await adim('bölüm açılır, alt menü gizlenir', async () => {
  await page.locator('.bolum-satiri').first().click();
  await page.waitForSelector('.okuyucu-metin h1');
  assert.equal(await page.locator('.okuyucu-metin h1').innerText(), 'Okuma Ekranı');
  await page.waitForTimeout(450);
  assert.equal(await page.locator('.tabbar').evaluate((e) => getComputedStyle(e).pointerEvents), 'none');
  assert.equal(await page.locator('.metin__p--ar').getAttribute('dir'), 'rtl');
});

await adim('ekli kelimeye dokununca kökünün manası açılır', async () => {
  await kelimeyeDokun('kudretinin');
  const metin = await sayfaMetni();
  assert.match(metin, /^kudret\b/m, metin);
  assert.match(metin, /Güç/);
});

await adim('başka kelimeye dokununca sayfa yenilenir; terkip tanınır', async () => {
  await kelimeyeDokun('mana-yı');
  const metin = await sayfaMetni();
  assert.match(metin, /mana-yı harfî/, metin);
  assert.equal(await page.locator('.alt-sayfa').count(), 1);
});

await adim('boşluğa dokununca sayfa kapanır', async () => {
  const k = await page.locator('.okuyucu-metin').boundingBox();
  await page.mouse.click(k.x + 4, k.y + k.height / 3);
  await page.waitForFunction(() => !document.querySelector('.alt-sayfa.acik'));
});

await adim('dipnot işareti dipnotu açar', async () => {
  await page.locator('a[data-dipnot]').first().scrollIntoViewIfNeeded();
  await page.locator('a[data-dipnot]').first().click();
  const metin = await sayfaMetni();
  assert.match(metin, /Dipnotlar böyle görünür/);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('.alt-sayfa.acik'));
});

await adim('boşluğa dokununca gizlenen üst çubuk geri gelir', async () => {
  await page.waitForFunction(() => document.querySelector('.oku-ekran--okuma').classList.contains('ust-gizli'));
  const k = await page.locator('.okuyucu-metin').boundingBox();
  await page.mouse.click(k.x + 4, 420);
  await page.waitForFunction(() => !document.querySelector('.oku-ekran--okuma').classList.contains('ust-gizli'));
  await page.waitForTimeout(350);
});

await adim('okuma ayarları uygulanır ve saklanır', async () => {
  await page.locator('.okuyucu-ust__aa').click();
  await page.waitForSelector('.alt-sayfa--ayarlar.acik');
  const once = await page.locator('.okuyucu-metin').evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
  await page.locator('.ayar__boyut-dugme--buyuk').click();
  const sonra = await page.locator('.okuyucu-metin').evaluate((e) => parseFloat(getComputedStyle(e).fontSize));
  assert.ok(sonra > once, `${once} → ${sonra}`);
  await page.locator('.ayar__secim--tema [data-deger="gece"]').click();
  assert.equal(await page.locator('.oku-ekran--okuma').getAttribute('data-tema'), 'gece');
  assert.equal(await page.locator('.alt-sayfa--ayarlar').getAttribute('data-tema'), 'gece');
  await page.locator('.alt-sayfa__kapat').click();
  await page.reload();
  await page.waitForSelector('.okuyucu-metin h1');
  assert.equal(await page.locator('.oku-ekran--okuma').getAttribute('data-tema'), 'gece');
  await page.evaluate(() => localStorage.removeItem('kenz.oku.ayarlar'));
});

await adim('kalınan yer yeniden açılışta hatırlanır', async () => {
  await page.goto(base + '#/oku/ornek/okuma-uzerine');
  await page.waitForSelector('.okuyucu-metin h1');
  await page.evaluate(() => {
    const k = document.querySelector('.okuyucu-kaydirma');
    k.scrollTop = (k.scrollHeight - k.clientHeight) * 0.5;
  });
  await page.waitForTimeout(900);
  const once = await kaydirmaOrani();
  await page.reload();
  await page.waitForSelector('.okuyucu-metin h1');
  await page.waitForTimeout(400);
  const sonra = await kaydirmaOrani();
  assert.ok(Math.abs(sonra - once) < 0.03, `${once} → ${sonra}`);
});

await adim('kitaplıkta "kaldığın yerden" kartı', async () => {
  await page.goto(base + '#/oku');
  await page.waitForSelector('.devam-karti');
  assert.match(await page.locator('.devam-karti').innerText(), /Okuma Üzerine Notlar/);
});

await adim('geri düğmesi tarayıcı geçmişiyle aynı yolu izler', async () => {
  await page.locator('.devam-karti').click();
  await page.waitForSelector('.okuyucu-metin h1');
  await page.locator('.okuyucu-ust__geri').click();
  await page.waitForSelector('.bolum-satiri');
  assert.equal(new URL(page.url()).hash, '#/oku/ornek');
  await page.goBack();
  await page.waitForSelector('.okuyucu-metin h1');
});

await adim('sonraki bölüm geçmişe eklenmeden açılır', async () => {
  await page.goto(base + '#/oku/ornek');
  await page.locator('.bolum-satiri').first().click();
  await page.waitForSelector('.okuyucu-metin h1');
  await page.locator('.okuyucu-gecis__bag--sonraki').click();
  await page.waitForFunction(() => document.querySelector('.okuyucu-metin h1')?.textContent === 'Okuma Üzerine Notlar');
  await page.goBack();
  await page.waitForSelector('.bolum-satiri');
});

await adim('sekmeler arası geçişte Oku kaldığı ekranı korur', async () => {
  await page.locator('.bolum-satiri').nth(1).click();
  await page.waitForSelector('.okuyucu-metin h1');
  await page.goto(base + '#/kenz');
  assert.equal(await page.locator('.quote').isVisible(), true);
  await page.locator('.tab--oku').click();
  await page.waitForSelector('.okuyucu-metin h1');
  assert.equal(new URL(page.url()).hash, '#/oku/ornek/okuma-uzerine');
});

await adim('bitmiş bölüm yeniden açılıp kapatılınca "okundu" kalır', async () => {
  await page.evaluate(() => {
    const k = document.querySelector('.okuyucu-kaydirma');
    k.scrollTop = k.scrollHeight;
  });
  await page.waitForTimeout(900);
  await page.goto(base + '#/oku/ornek');
  await page.waitForSelector('.bolum-satiri');
  assert.equal(await page.locator('.bolum-satiri').nth(1).locator('.bolum-satiri__durum--bitti').count(), 1);
  await page.locator('.bolum-satiri').nth(1).click();
  await page.waitForSelector('.okuyucu-metin h1');
  await page.waitForTimeout(700);
  assert.ok((await kaydirmaOrani()) < 0.05, 'bitmiş bölüm baştan açılmalı');
  await page.locator('.okuyucu-ust__geri').click();
  await page.waitForSelector('.bolum-satiri');
  assert.equal(await page.locator('.bolum-satiri').nth(1).locator('.bolum-satiri__durum--bitti').count(), 1);
});

await adim('bilinmeyen bölüm adresi çökmez', async () => {
  await page.goto(base + '#/oku/ornek/yok-boyle');
  await page.waitForSelector('.oku-ekran--bos');
});

await adim('konsolda hata yok', async () => {
  assert.deepEqual(hatalar, []);
});

console.log(`${gecen} adım geçti`);
await browser.close();
server.close();
