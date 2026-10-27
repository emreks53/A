// Oku akışını gerçek tarayıcıda baştan sona dener (derlenmiş dist/ üzerinde).
// Kullanım: npm run build && npm run test:oku          (Playwright + Chromium gerekir)
//           node scripts/oku-test.mjs --ekran <klasör>  (ayrıca her adımın ekran görüntüsünü kaydeder)
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { extname, join, resolve } from 'node:path';

const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require('playwright');
} catch {
  playwright = createRequire('/opt/node-tools/node_modules/')('playwright');
}

const ekranIndex = process.argv.indexOf('--ekran');
const ekranKlasoru = ekranIndex > 0 ? resolve(process.argv[ekranIndex + 1]) : null;
if (ekranKlasoru) await mkdir(ekranKlasoru, { recursive: true });

const root = resolve('dist');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif', '.jpg': 'image/jpeg', '.mp4': 'video/mp4', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
// GitHub Pages'teki gibi /A/ alt yolundan, video için bayt aralığı (Range) desteğiyle sunar.
const server = createServer(async (req, res) => {
  const tam = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (!tam.startsWith('/A/')) return res.writeHead(404).end();
  const path = tam.slice(2);
  const file = join(root, path.endsWith('/') ? path + 'index.html' : path);
  try {
    const { size } = await stat(file);
    const type = types[extname(file)] ?? 'application/octet-stream';
    const aralik = req.headers.range?.match(/bytes=(\d*)-(\d*)/);
    if (aralik) {
      const bas = aralik[1] ? Number(aralik[1]) : size - Number(aralik[2]);
      const son = aralik[1] && aralik[2] ? Math.min(Number(aralik[2]), size - 1) : size - 1;
      res.writeHead(206, { 'content-type': type, 'content-range': `bytes ${bas}-${son}/${size}`, 'accept-ranges': 'bytes', 'content-length': son - bas + 1 });
      createReadStream(file, { start: bas, end: son }).pipe(res);
    } else {
      res.writeHead(200, { 'content-type': type, 'accept-ranges': 'bytes', 'content-length': size });
      if (req.method === 'HEAD') res.end();
      else res.end(await readFile(file));
    }
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/A/`;

const browser = await playwright.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: base.replace(/\/A\/$/, '') });
const page = await context.newPage();
const hatalar = [];
page.on('pageerror', (e) => hatalar.push(String(e)));
page.on('console', (m) => m.type() === 'error' && !m.text().startsWith('Failed to load resource') && hatalar.push(m.text()));
page.on('response', (r) => r.status() >= 400 && hatalar.push(`${r.status()} ${new URL(r.url()).pathname}`));

let gecen = 0;
let sira = 0;
async function adim(ad, fn) {
  try {
    await fn();
    gecen++;
    console.log(`  ✓ ${ad}`);
    if (ekranKlasoru) await page.screenshot({ path: join(ekranKlasoru, `${String(++sira).padStart(2, '0')}.png`) });
  } catch (e) {
    console.error(`  ✗ ${ad}\n    ${e.message.split('\n').join('\n    ')}`);
    await page.screenshot({ path: 'oku-test-hata.png' }).catch(() => {});
    await browser.close();
    server.close();
    process.exit(1);
  }
}

const aktif = () => page.evaluate(() => document.querySelector('.reel[data-aktif]')?.dataset.id);
const oynuyor = (id) =>
  page.waitForFunction((i) => {
    const v = document.querySelector(`.reel[data-id="${i}"] video`);
    return v && !v.paused && v.currentTime > 0.3;
  }, id);
const duruyor = (id) => page.evaluate((i) => document.querySelector(`.reel[data-id="${i}"] video`).paused, id);

/** Gerçek dokunmatik sürükleme (CDP): x1'den x2'ye, y sabit */
async function surukle(p, x1, x2, y, adimSayisi = 8) {
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x1, y }] });
  for (let i = 1; i <= adimSayisi; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x1 + ((x2 - x1) * i) / adimSayisi, y }] });
    await p.waitForTimeout(16);
  }
  return {
    birak: () => cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }),
  };
}

console.log('Oku akışı');

await adim('ana ekran açılışta video indirmez', async () => {
  await page.goto(base);
  await page.waitForSelector('.quote');
  await page.waitForTimeout(400);
  const kaynaklar = await page.evaluate(() => Array.from(document.querySelectorAll('.reel video'), (v) => v.getAttribute('src')));
  assert.deepEqual(kaynaklar, [null, null]);
});

await adim('Oku sekmesi ilk videoyu sesli oynatır', async () => {
  await page.locator('.tab--oku').click();
  await oynuyor('sevgi-ve-guzellik');
  assert.equal(await aktif(), 'sevgi-ve-guzellik');
  assert.equal(new URL(page.url()).hash, '#/oku/sevgi-ve-guzellik');
  assert.equal(await page.locator('.reel[data-id="sevgi-ve-guzellik"] video').evaluate((v) => v.muted), false);
});

/** Oku görünümünde ekranda görünen bütün <button> öğeleri */
const gorunenDugmeler = (p) =>
  p.evaluate(() =>
    Array.from(document.querySelectorAll('#view-oku button'))
      .filter((b) => {
        const r = b.getBoundingClientRect();
        const s = getComputedStyle(b);
        return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && s.visibility !== 'hidden' && s.display !== 'none';
      })
      .map((b) => b.textContent.trim()),
  );

await adim('Oku tam ekran: alt menü ve "Oku" yazısı görünmez; ilk açılışta kaydırma ipucu', async () => {
  await page.waitForTimeout(450);
  const menu = await page.locator('.tabbar').evaluate((e) => ({ op: getComputedStyle(e).opacity, pe: getComputedStyle(e).pointerEvents, ust: e.getBoundingClientRect().top }));
  assert.equal(menu.pe, 'none');
  assert.equal(Number(menu.op), 0);
  assert.ok(menu.ust >= 844, `alt menü ekranda: ${menu.ust}`);
  const gorunurOku = await page.evaluate(() =>
    Array.from(document.querySelectorAll('#view-oku *')).some((e) => e.childElementCount === 0 && e.textContent.trim() === 'Oku' && e.getBoundingClientRect().width > 2),
  );
  assert.equal(gorunurOku, false, '"Oku" yazısı ekranda');
  await page.waitForFunction(() => document.querySelector('.akis__bildirim.gorunur')?.textContent === 'Çıkmak için sağa kaydırın');
});

await adim('ekranda yalnız iki düğme var: Neşret ve Menba', async () => {
  assert.deepEqual(await gorunenDugmeler(page), ['Neşret', 'Menba']);
});

await adim('videoya dokununca durur, yeniden dokununca sürer', async () => {
  const sahne = await page.locator('.reel[data-aktif] .reel__sahne').boundingBox();
  await page.mouse.click(sahne.x + sahne.width / 2, sahne.y + sahne.height / 2);
  await page.waitForFunction(() => document.querySelector('.reel[data-aktif] video').paused);
  assert.equal(await page.locator('.reel[data-aktif]').getAttribute('data-durum'), 'durdu');
  await page.mouse.click(sahne.x + sahne.width / 2, sahne.y + sahne.height / 2);
  await page.waitForFunction(() => !document.querySelector('.reel[data-aktif] video').paused);
});

await adim('yukarı kaydırınca sonraki video gelir ve oynar; önceki durur', async () => {
  await page.locator('.akis').evaluate((a) => a.scrollTo({ top: a.clientHeight }));
  await oynuyor('ahlak-mucizesi');
  assert.equal(await aktif(), 'ahlak-mucizesi');
  assert.equal(await duruyor('sevgi-ve-guzellik'), true);
  assert.equal(new URL(page.url()).hash, '#/oku/ahlak-mucizesi');
});

await adim('geri kaydırınca önceki video baştan başlar', async () => {
  await page.locator('.akis').evaluate((a) => a.scrollTo({ top: 0 }));
  await page.waitForFunction(() => document.querySelector('.reel[data-aktif]')?.dataset.id === 'sevgi-ve-guzellik');
  const t = await page.locator('.reel[data-id="sevgi-ve-guzellik"] video').evaluate((v) => v.currentTime);
  assert.ok(t < 2, `currentTime ${t}`);
  await oynuyor('sevgi-ve-guzellik');
  assert.equal(await duruyor('ahlak-mucizesi'), true);
});

await adim("Menba kaynağı gösterir (Lem'alar, 64. sayfa) ve künyeyi içerir", async () => {
  await page.locator('.reel[data-aktif] .reel__dugme--menba').click();
  await page.waitForSelector('.alt-sayfa.acik');
  const metin = await page.locator('.alt-sayfa.acik').innerText();
  assert.match(metin, /Lem'alar/);
  assert.match(metin, /64\. sayfa/);
  assert.match(await page.locator('.alt-sayfa.acik .menba__kunye').innerText(), /Görüntü ve ses künyesi/);
  assert.equal(await page.locator('.alt-sayfa.acik .menba__kunye li').count(), 4);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('.alt-sayfa.acik'));
});

await adim('Menba açıkken Tab odağı pencerenin içinde tutar', async () => {
  await page.locator('.reel[data-aktif] .reel__dugme--menba').click();
  await page.waitForSelector('.alt-sayfa.acik');
  const odaklar = [];
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Tab');
    odaklar.push(await page.evaluate(() => (document.activeElement.closest('.alt-sayfa') ? document.activeElement.tagName : 'DIŞARI')));
  }
  assert.ok(!odaklar.includes('DIŞARI'), odaklar.join(','));
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('.alt-sayfa.acik'));
});

await adim('Neşret paylaşım bağlantısını verir (paylaşım menüsü yoksa kopyalar)', async () => {
  await page.evaluate(() => {
    // Masaüstü Chromium'da paylaşım menüsü yok; kopyalama yolunu sınarız
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
  });
  await page.locator('.reel[data-aktif] .reel__dugme--nesret').click();
  await page.waitForSelector('.akis__bildirim.gorunur');
  assert.equal(await page.locator('.akis__bildirim').innerText(), 'Bağlantı kopyalandı');
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), 'https://emreks53.github.io/A/v/sevgi-ve-guzellik/');
});

await adim('paylaşım menüsü varsa bağlantı onunla gönderilir', async () => {
  await page.evaluate(() => {
    window.__paylasilan = null;
    Object.defineProperty(navigator, 'share', { value: async (d) => (window.__paylasilan = d), configurable: true });
  });
  await page.locator('.akis').evaluate((a) => a.scrollTo({ top: a.clientHeight }));
  await page.waitForFunction(() => document.querySelector('.reel[data-aktif]')?.dataset.id === 'ahlak-mucizesi');
  await page.locator('.reel[data-aktif] .reel__dugme--nesret').click();
  await page.waitForFunction(() => window.__paylasilan);
  assert.deepEqual(await page.evaluate(() => window.__paylasilan), {
    title: "Ahlâk Mu'cizesi",
    text: "Ahlâk Mu'cizesi",
    url: 'https://emreks53.github.io/A/v/ahlak-mucizesi/',
  });
});

await adim('Neşret\'e çift dokunuş tek paylaşım açar', async () => {
  await page.evaluate(() => {
    window.__paylasimSayisi = 0;
    Object.defineProperty(navigator, 'share', {
      value: () => {
        window.__paylasimSayisi++;
        return new Promise((r) => setTimeout(r, 400));
      },
      configurable: true,
    });
  });
  await page.locator('.reel[data-aktif] .reel__dugme--nesret').dblclick();
  await page.waitForTimeout(600);
  assert.equal(await page.evaluate(() => window.__paylasimSayisi), 1);
});

await adim('Menba: Mektubat, 195. sayfa · Sözler, 19. Söz', async () => {
  await page.locator('.reel[data-aktif] .reel__dugme--menba').click();
  await page.waitForSelector('.alt-sayfa.acik');
  const kaynaklar = await page.locator('.alt-sayfa.acik .menba__kaynak').evaluateAll((l) => l.map((x) => x.innerText.replace(/\s+/g, ' ')));
  assert.deepEqual(kaynaklar, ['Mektubat 195. sayfa', 'Sözler 19. Söz']);
  await page.locator('.alt-sayfa.acik .alt-sayfa__kapat').click();
  await page.waitForFunction(() => !document.querySelector('.alt-sayfa.acik'));
});

await adim('ilerleme çizgisine dokununca videoda o yere gidilir', async () => {
  const c = await page.locator('.reel[data-aktif] .reel__ilerleme').boundingBox();
  await page.mouse.click(c.x + c.width / 2, c.y + c.height / 2);
  const oran = await page.locator('.reel[data-aktif] video').evaluate((v) => v.currentTime / v.duration);
  assert.ok(Math.abs(oran - 0.5) < 0.05, `oran ${oran}`);
});

await adim('Escape ile Oku\'dan çıkılır (Kenz\'e dönülür), Oku\'ya dönünce aynı video sürer', async () => {
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.getElementById('app').dataset.sekme === 'kenz');
  await page.waitForTimeout(200);
  assert.equal(await duruyor('ahlak-mucizesi'), true);
  await page.locator('.tab--oku').click();
  await oynuyor('ahlak-mucizesi');
  assert.equal(new URL(page.url()).hash, '#/oku/ahlak-mucizesi');
});

await adim('az sürükleyince yerine döner; sağa çekince Oku kapanır, altından Kenz görünür', async () => {
  await page.waitForTimeout(500); // Oku sağdan kayarak açılırken (0,36 sn) değil, yerine oturunca
  const az = await surukle(page, 40, 110, 420);
  assert.equal(await page.locator('#view-kenz').getAttribute('data-alttan'), '');
  await az.birak();
  await page.waitForTimeout(500);
  assert.equal(new URL(page.url()).hash, '#/oku/ahlak-mucizesi');
  assert.equal(await page.locator('#view-kenz').getAttribute('data-alttan'), null);
  assert.equal(await duruyor('ahlak-mucizesi'), false, 'kısa sürükleme videoyu durdurmamalı');
  const cok = await surukle(page, 40, 320, 420);
  const kayma = await page.locator('#view-oku').evaluate((e) => new DOMMatrix(getComputedStyle(e).transform).m41);
  assert.ok(kayma > 200, `ekran parmağı izlemeli: ${kayma}`);
  await cok.birak();
  await page.waitForFunction(() => document.getElementById('app').dataset.sekme === 'kenz');
  await page.waitForTimeout(400);
  assert.equal(await duruyor('ahlak-mucizesi'), true);
  assert.equal(await page.locator('#view-oku').evaluate((e) => e.style.transform), '');
  await page.locator('.tab--oku').click();
  await oynuyor('ahlak-mucizesi');
});

await adim('klavyeyle ↑/↓ video değişir, odak yeni videoya geçer', async () => {
  await page.locator('.reel[data-aktif] .reel__dugme--nesret').focus();
  await page.keyboard.press('ArrowUp');
  await page.waitForFunction(() => document.querySelector('.reel[data-aktif]')?.dataset.id === 'sevgi-ve-guzellik');
  assert.equal(await page.evaluate(() => document.activeElement.closest('.reel')?.dataset.id), 'sevgi-ve-guzellik');
  assert.ok(await page.evaluate(() => document.activeElement.classList.contains('reel__dugme--nesret')));
  await page.keyboard.press('ArrowDown');
  await page.waitForFunction(() => document.querySelector('.reel[data-aktif]')?.dataset.id === 'ahlak-mucizesi');
  assert.equal(await page.evaluate(() => document.activeElement.closest('.reel')?.dataset.id), 'ahlak-mucizesi');
});

await adim('ilerleme çizgisi odaklıyken boşluk durdurur (video değiştirmez), ←/→ ileri geri sarar', async () => {
  await page.locator('.reel[data-aktif] .reel__ilerleme').focus();
  await page.keyboard.press(' ');
  await page.waitForTimeout(300);
  assert.equal(await aktif(), 'ahlak-mucizesi');
  assert.equal(await duruyor('ahlak-mucizesi'), true);
  const t0 = await page.locator('.reel[data-aktif] video').evaluate((v) => v.currentTime);
  await page.keyboard.press('ArrowRight');
  const t1 = await page.locator('.reel[data-aktif] video').evaluate((v) => v.currentTime);
  assert.ok(Math.abs(t1 - t0 - 5) < 0.6, `${t0} → ${t1}`);
  await page.keyboard.press('ArrowUp');
  assert.equal(await aktif(), 'ahlak-mucizesi', 'kaydırıcıda ↑ video değiştirmemeli');
  await page.keyboard.press(' ');
  await oynuyor('ahlak-mucizesi');
});

await adim('medya tuşuyla durdurma kullanıcının durdurması sayılır; medya tuşuyla oynatınca çizgi yürür', async () => {
  await page.locator('.reel[data-aktif] video').evaluate((v) => v.pause());
  await page.waitForFunction(() => document.querySelector('.reel[data-aktif]').dataset.durum === 'durdu');
  // Oku'dan çıkıp dönünce kendiliğinden başlamamalı
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.getElementById('app').dataset.sekme === 'kenz');
  await page.locator('.tab--oku').click();
  await page.waitForTimeout(500);
  assert.equal(await duruyor('ahlak-mucizesi'), true);
  await page.locator('.reel[data-aktif] video').evaluate((v) => v.play());
  const olc = () => page.locator('.reel[data-aktif] .reel__ilerleme-dolu').evaluate((e) => e.style.transform);
  const a = await olc();
  await page.waitForTimeout(1200);
  assert.notEqual(await olc(), a);
});

await adim('paylaşım bağlantısı videoyu açar (önizleme etiketleriyle)', async () => {
  const yanit = await page.request.get(base + 'v/ahlak-mucizesi/');
  const html = await yanit.text();
  assert.match(html, /<meta property="og:title" content="Ahlâk Mu&#39;cizesi" \/>/);
  assert.match(html, /og:image" content="https:\/\/emreks53\.github\.io\/A\/videolar\/ahlak-mucizesi-onizleme\.jpg"/);
  await page.goto(base + 'v/ahlak-mucizesi/');
  await page.waitForURL(/#\/oku\/ahlak-mucizesi$/);
  await oynuyor('ahlak-mucizesi');
  assert.equal(await page.locator('.tab--oku').getAttribute('aria-current'), 'page');
  // Bağlantıyla doğrudan açılınca çıkış Kenz'e gider
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.getElementById('app').dataset.sekme === 'kenz');
});

await adim('sesli oynatmaya izin vermeyen tarayıcıda sessiz başlar, dokununca ses açılır', async () => {
  const b2 = await playwright.chromium.launch({ args: ['--autoplay-policy=document-user-activation-required'] });
  const p2 = await (await b2.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })).newPage();
  try {
    await p2.goto(base + 'v/sevgi-ve-guzellik/');
    await p2.waitForSelector('.akis__sessiz:not([hidden])');
    await p2.waitForFunction(() => {
      const v = document.querySelector('.reel[data-aktif] video');
      return v.muted && !v.paused;
    });
    assert.match(await p2.locator('.akis__bildirim').innerText(), /Sesi açmak için videoya dokunun/);
    // Bu durumda da ekranda yalnız iki düğme var
    assert.deepEqual(await gorunenDugmeler(p2), ['Neşret', 'Menba']);
    const sahne = await p2.locator('.reel[data-aktif] .reel__sahne').boundingBox();
    await p2.mouse.click(sahne.x + sahne.width / 2, sahne.y + sahne.height / 2);
    await p2.waitForFunction(() => {
      const v = document.querySelector('.reel[data-aktif] video');
      return !v.muted && !v.paused;
    });
    assert.equal(await p2.locator('.akis__sessiz').isHidden(), true);
  } finally {
    await b2.close();
  }
});

await adim('önceden yüklenirken hata alan video kaydırınca yeniden yüklenip oynar', async () => {
  const b3 = await playwright.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const c3 = await b3.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const p3 = await c3.newPage();
  try {
    let engelle = true;
    await p3.route('**/ahlak-mucizesi.mp4', (r) => (engelle ? r.abort() : r.continue()));
    await p3.goto(base + '#/oku/sevgi-ve-guzellik');
    await p3.waitForFunction(() => document.querySelector('.reel[data-id="ahlak-mucizesi"] video').error);
    engelle = false;
    await p3.locator('.akis').evaluate((a) => a.scrollTo({ top: a.clientHeight }));
    await p3.waitForFunction(() => {
      const v = document.querySelector('.reel[data-id="ahlak-mucizesi"] video');
      return !v.paused && v.currentTime > 0.3 && !v.error;
    });
    assert.equal(await p3.locator('.reel[data-id="ahlak-mucizesi"]').getAttribute('data-durum'), '');
  } finally {
    await b3.close();
  }
});

await adim('bilinmeyen video adresi ilk videoyu açar, çökmez', async () => {
  await page.goto(base + '#/oku/boyle-bir-video-yok');
  await page.waitForFunction(() => document.querySelector('.reel[data-aktif]'));
});

await adim('konsolda hata yok', async () => {
  assert.deepEqual(hatalar, []);
});

console.log(`${gecen} adım geçti`);
await browser.close();
server.close();
