// Uygulamayı (ana ekran, Oku akışı, Kenz, Güneş ve okuyucu) gerçek tarayıcıda baştan sona dener.
// Önce dist-test/ altına deneme derlemesi yapar: kitap listesi scripts/fixtures/kitaplar.json (örnek PDF; Risale
// metni değildir), gerisi uygulamanın kendisi.
// Kullanım: npm run test:oku                            (Playwright + Chromium gerekir)
//           node scripts/oku-test.mjs --ekran <klasör>  (ayrıca her adımın ekran görüntüsünü kaydeder)
//           node scripts/oku-test.mjs --derleme       (deneme derlemesini atlar; dist-test/ hazırsa)
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

const root = resolve('dist-test');
if (!process.argv.includes('--derleme')) {
  process.env.KITAPLAR_JSON = 'scripts/fixtures/kitaplar.json';
  const { build } = await import('vite');
  await build({ logLevel: 'warn', build: { outDir: root, emptyOutDir: true } });
}
/** Örnek kitap PDF'i: deneme listesindeki https://kitap.deneme/… adresi buradan verilir */
const ornekPdf = await readFile(resolve('scripts/fixtures/ornek-kitap.pdf'));
const kitapYolu = async (ctx) =>
  ctx.route('https://kitap.deneme/**', (r) =>
    r.fulfill({ status: 200, body: ornekPdf, headers: { 'content-type': 'application/pdf', 'access-control-allow-origin': '*' } }),
  );
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.wasm': 'application/wasm', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif', '.jpg': 'image/jpeg', '.mp4': 'video/mp4', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
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
await kitapYolu(context);
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

const F = 'fenler-haliki-tanittirir';
const I = 'ihlas';
const temaRengi = () => page.evaluate(() => document.querySelector('meta[name="theme-color"]').content);
/** Ekranda görünen, yazı taşıyan en içteki öğeler */
const gorunenYazilar = (p, kok, haric = '') =>
  p.evaluate(
    ([kok, haric]) =>
      Array.from(document.querySelectorAll(`${kok} *`))
        .filter((e) => e.childElementCount === 0 && e.textContent.trim() && !(haric && e.closest(haric)))
        .filter((e) => {
          const r = e.getBoundingClientRect();
          const s = getComputedStyle(e);
          return r.width > 2 && r.height > 2 && r.bottom > 0 && r.top < innerHeight && s.visibility !== 'hidden' && Number(s.opacity) > 0;
        })
        .map((e) => ({ yazi: e.textContent.trim(), ust: e.getBoundingClientRect().top })),
    [kok, haric],
  );
const opaklik = (secici) => page.locator(secici).evaluate((e) => Number(getComputedStyle(e).opacity));

console.log('Ana ekran');

await adim('ana ekran: yalnız gökyüzü, söz ve alt menü; üstte yazı yok, hiçbir sekme seçili değil; video indirilmez', async () => {
  await page.goto(base);
  await page.waitForSelector('.quote');
  // Oku'yu birkaç saniye sonra aç: gizli Oku hiçbir şey oynatmamalı.
  await page.waitForTimeout(3000);
  const kaynaklar = await page.evaluate(() => Array.from(document.querySelectorAll('.reel video'), (v) => v.getAttribute('src')));
  assert.deepEqual(kaynaklar, [null, null]);
  const yazilar = await gorunenYazilar(page, '#view-ana');
  assert.deepEqual(
    yazilar.map((y) => y.yazi),
    ['Güneşten daha parlak', 've cennet gibi güzel', 've saadet-i ebediye gibi', 'şirin hakikatler'],
  );
  assert.ok(yazilar.every((y) => y.ust > 844 * 0.25), 'ekranın üstünde yazı var');
  assert.equal(await page.locator('#view-kenz').getAttribute('hidden'), '');
  assert.equal(await page.locator('.tab[aria-current]').count(), 0);
  const sekmeler = await page.locator('.tab').evaluateAll((l) =>
    l.map((t) => [t.textContent.trim(), getComputedStyle(t.querySelector('.tab__label')).color, getComputedStyle(t, '::before').opacity]),
  );
  // Üç sekmenin yazısı da lacivert; seçili kapsül yok
  assert.deepEqual(sekmeler, [
    ['Oku', 'rgb(2, 32, 100)', '0'],
    ['Kenz', 'rgb(2, 32, 100)', '0'],
    ['Güneş', 'rgb(2, 32, 100)', '0'],
  ]);
  assert.equal(await temaRengi(), '#5AA2EC');
});

await adim('telefon tarayıcısında (390 x 664) menü küçülmez', async () => {
  await page.setViewportSize({ width: 390, height: 664 });
  await page.waitForTimeout(100);
  const m = await page.locator('.tabbar').boundingBox();
  assert.ok(Math.abs(m.width - 352.2) < 0.5, `menü genişliği ${m.width}`);
  assert.ok(m.y + m.height <= 664 - 18, 'menü ekranın altına yapışık');
  await page.setViewportSize({ width: 390, height: 844 });
});

console.log('Oku akışı');

await adim('Oku sekmesi ilk videoyu sesli oynatır', async () => {
  await page.locator('.tab--oku').click();
  await oynuyor(F);
  assert.equal(await aktif(), F);
  assert.equal(new URL(page.url()).hash, `#/oku/${F}`);
  assert.equal(await page.locator(`.reel[data-id="${F}"] video`).evaluate((v) => v.muted), false);
  assert.equal(await temaRengi(), '#000000');
});

/** Oku görünümünde ekranda görünen bütün <button> öğeleri */
const gorunenDugmeler = (p) =>
  p.evaluate(() =>
    Array.from(document.querySelectorAll('#view-oku button'))
      .filter((b) => {
        const r = b.getBoundingClientRect();
        const s = getComputedStyle(b);
        // (görünmez, yalnız klavyeyle odaklanınca beliren "Oku'dan çık" 1 px'liktir; sayılmaz)
        return r.width > 2 && r.height > 2 && r.bottom > 0 && r.top < innerHeight && s.visibility !== 'hidden' && s.display !== 'none';
      })
      .map((b) => b.textContent.trim()),
  );

await adim('Oku tam ekran: alt menü örtülür; ekranın üstünde yazı yok, altta küçük "geçtiği yer" ve soluk im var', async () => {
  await page.waitForTimeout(450);
  assert.equal(await page.locator('.tabbar').evaluate((e) => e.inert), true);
  const ortulu = await page.evaluate(() => {
    const m = document.querySelector('.tabbar').getBoundingClientRect();
    return !!document.elementFromPoint(m.left + m.width / 2, m.top + m.height / 2)?.closest('#view-oku');
  });
  assert.equal(ortulu, true, 'alt menü Oku\'nun üstünde görünüyor');
  const yazilar = await gorunenYazilar(page, '.reel[data-aktif]');
  assert.deepEqual(yazilar.map((y) => y.yazi).sort(), ['Menba', 'Neşret', 'On Birinci Şuâ · Altıncı Mesele']);
  assert.ok(yazilar.every((y) => y.ust > 844 * 0.4), `ekranın üstünde yazı var: ${JSON.stringify(yazilar)}`);
  await page.waitForFunction(() => document.querySelector('.akis__ipucu.gorunur')?.textContent === 'Çıkmak için sağa kaydırın');
  // İpucuyla birlikte ekran bir an sağa itilir, altından geldiği ana ekran görünür.
  await page.waitForFunction(() => document.getElementById('view-oku').classList.contains('durtulen'));
  assert.equal(await page.locator('#view-ana').getAttribute('data-alttan'), '');
  await page.waitForFunction(() => !document.getElementById('view-oku').classList.contains('durtulen'));
  assert.equal(await page.locator('#view-ana').getAttribute('data-alttan'), null);
  // (konumlar ekran yerine oturunca ölçülür: ipucunun dürtmesi bitti)
  const kaynak = await page.locator('.reel[data-aktif] .reel__kaynak').evaluate((e) => {
    const r = e.getBoundingClientRect();
    return { boy: getComputedStyle(e).fontSize, sol: r.left, alt: innerHeight - r.bottom };
  });
  assert.equal(kaynak.boy, '11px');
  assert.equal(kaynak.sol, 14);
  assert.ok(kaynak.alt < 30, `kaynak yazısı en altta olmalı: ${kaynak.alt}`);
  const damga = await page.locator('.reel[data-aktif] .reel__damga').evaluate((e) => {
    const r = e.getBoundingClientRect();
    return { w: r.width, op: getComputedStyle(e).opacity, sag: innerWidth - r.right, alt: innerHeight - r.bottom, src: e.getAttribute('src') };
  });
  assert.equal(damga.w, 18);
  assert.equal(damga.op, '0.4');
  assert.equal(damga.sag, 14);
  assert.ok(damga.alt < 30);
  assert.match(damga.src, /\.svg$/);
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

await adim('ilerleme çizgisi Instagram\'daki gibi: kenardan kenara 2 px, parlamasız; sürüklerken kalınlaşır, zaman görünür', async () => {
  const cizgi = await page.locator('.reel[data-aktif] .reel__ilerleme').evaluate((e) => {
    const iz = getComputedStyle(e, '::before');
    const dolu = getComputedStyle(e.querySelector('.reel__ilerleme-dolu'));
    const r = e.getBoundingClientRect();
    return {
      sol: r.left,
      sag: innerWidth - r.right,
      alt: innerHeight - r.bottom,
      iz: [iz.height, iz.backgroundColor, iz.boxShadow, iz.borderRadius],
      dolu: [dolu.height, dolu.backgroundColor, dolu.boxShadow, dolu.borderRadius, dolu.filter, dolu.backgroundImage],
      uc: getComputedStyle(e.querySelector('.reel__ilerleme-uc'), '::before').opacity,
    };
  });
  assert.deepEqual(cizgi, {
    sol: 0,
    sag: 0,
    alt: 0,
    iz: ['2px', 'rgba(255, 255, 255, 0.3)', 'none', '0px'],
    dolu: ['2px', 'rgb(255, 255, 255)', 'none', '0px', 'none', 'none'],
    uc: '0',
  });
  const c = await page.locator('.reel[data-aktif] .reel__ilerleme').boundingBox();
  const cdp = await context.newCDPSession(page);
  const y = c.y + c.height / 2;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 100, y }] });
  for (let i = 1; i <= 6; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 100 + i * 20, y }] });
    await page.waitForTimeout(16);
  }
  await page.waitForTimeout(300);
  const sararken = await page.locator('.reel[data-aktif]').evaluate((r) => ({
    sarma: r.hasAttribute('data-sarma'),
    iz: getComputedStyle(r.querySelector('.reel__ilerleme'), '::before').height,
    uc: getComputedStyle(r.querySelector('.reel__ilerleme-uc'), '::before').opacity,
    zaman: r.querySelector('.reel__zaman').textContent,
    cekilen: ['.reel__dugmeler', '.reel__kaynak', '.reel__damga'].map((s) => getComputedStyle(r.querySelector(s)).opacity),
  }));
  assert.equal(sararken.sarma, true);
  assert.equal(sararken.iz, '4px');
  assert.equal(sararken.uc, '1');
  assert.match(sararken.zaman, /^\d:\d\d \/ 2:05$/);
  assert.deepEqual(sararken.cekilen, ['0', '0', '0']);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(400);
  assert.equal(await page.locator('.reel[data-aktif]').evaluate((r) => r.hasAttribute('data-sarma')), false);
  assert.equal(await opaklik('.reel[data-aktif] .reel__dugmeler'), 1);
  const oran = await page.locator('.reel[data-aktif] video').evaluate((v) => v.currentTime / v.duration);
  assert.ok(Math.abs(oran - 220 / 390) < 0.05, `oran ${oran}`);
});

await adim('yukarı kaydırınca sonraki video gelir ve oynar; önceki durur', async () => {
  await page.locator('.akis').evaluate((a) => a.scrollTo({ top: a.clientHeight }));
  await oynuyor(I);
  assert.equal(await aktif(), I);
  assert.equal(await duruyor(F), true);
  assert.equal(new URL(page.url()).hash, `#/oku/${I}`);
  assert.equal(await page.locator('.reel[data-aktif] .reel__kaynak').innerText(), 'On Yedinci Lem’a');
});

await adim('geri kaydırınca önceki video baştan başlar', async () => {
  await page.locator('.akis').evaluate((a) => a.scrollTo({ top: 0 }));
  await page.waitForFunction((f) => document.querySelector('.reel[data-aktif]')?.dataset.id === f, F);
  const t = await page.locator(`.reel[data-id="${F}"] video`).evaluate((v) => v.currentTime);
  assert.ok(t < 2, `currentTime ${t}`);
  await oynuyor(F);
  assert.equal(await duruyor(I), true);
});

await adim('Menba: rahlede Kur\'an-ı Kerim, rafta Külliyat (Şuâlar öne çıkmış); Şuâlar, On Birinci Şuâ, Altıncı Mesele, 203. sayfa', async () => {
  await page.locator('.reel[data-aktif] .reel__dugme--menba').click();
  await page.waitForSelector('.alt-sayfa.acik');
  const s = '.alt-sayfa.acik';
  assert.equal(await page.locator(s).evaluate((e) => e.classList.contains('alt-sayfa--menba')), true);
  assert.equal(await page.locator(`${s} .alt-sayfa__baslik`).innerText(), 'MENBA');
  const cizim = await page.locator(`${s} .menba__cizim`).evaluate((e) => ({
    rol: e.getAttribute('role'),
    ad: e.getAttribute('aria-label'),
    one: Array.from(e.querySelectorAll('text'), (t) => [t.getAttribute('font-family'), t.textContent]).filter(([f]) => f.startsWith('Tinos')),
    sirtlar: e.querySelectorAll('text').length,
    w: e.querySelector('svg').getBoundingClientRect().width,
  }));
  assert.equal(cizim.rol, 'img');
  assert.match(cizim.ad, /Kur’an-ı Kerim/);
  assert.match(cizim.ad, /Şuâlar öne çıkmış/);
  assert.deepEqual(cizim.one, [['Tinos, serif', 'Şuâlar']]);
  // yazı: "RİSALE-İ NUR KÜLLİYATI" + 13 sırt + öne çıkan eser
  assert.equal(cizim.sirtlar, 15);
  assert.equal(cizim.w, 390);
  assert.equal(await page.locator(`${s} .menba__eser`).innerText(), 'Şuâlar');
  assert.deepEqual(await page.locator(`${s} .menba__yer li`).allTextContents(), ['On Birinci Şuâ', 'Altıncı Mesele', '203. sayfa']);
  assert.deepEqual(await page.locator(`${s} .menba__etiketler li`).allTextContents(), ['#fenler', '#marifetullah', '#tefekkür']);
  // Kaynak ve etiketler kaydırmadan görünür (sayfa açılırken aşağıdan kayar; yerine oturunca ölçülür)
  await page.waitForTimeout(450);
  const etiketler = await page.locator(`${s} .menba__etiketler`).boundingBox();
  assert.ok(etiketler.y + etiketler.height <= 844, `etiketler ekranın dışında: ${etiketler.y}`);
  assert.match(await page.locator(`${s} .menba__kunye`).innerText(), /Görüntü ve ses künyesi\s*2 kayıt/);
  assert.equal(await page.locator(`${s} .menba__kunye li`).count(), 2);
  // Menba açıkken videonun üstündeki her şey çekilir
  for (const x of ['.reel__dugmeler', '.reel__kaynak', '.reel__damga', '.reel__alt']) assert.equal(await opaklik(`.reel[data-aktif] ${x}`), 0, x);
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
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), `https://emreks53.github.io/A/v/${F}/`);
});

await adim('paylaşım menüsü varsa bağlantı onunla gönderilir', async () => {
  await page.evaluate(() => {
    window.__paylasilan = null;
    Object.defineProperty(navigator, 'share', { value: async (d) => (window.__paylasilan = d), configurable: true });
  });
  await page.locator('.akis').evaluate((a) => a.scrollTo({ top: a.clientHeight }));
  await page.waitForFunction((i) => document.querySelector('.reel[data-aktif]')?.dataset.id === i, I);
  await page.locator('.reel[data-aktif] .reel__dugme--nesret').click();
  await page.waitForFunction(() => window.__paylasilan);
  assert.deepEqual(await page.evaluate(() => window.__paylasilan), {
    title: 'On Yedinci Lem’a’dan',
    text: 'On Yedinci Lem’a’dan',
    url: 'https://emreks53.github.io/A/v/ihlas/',
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

await adim('Menba: Lem’alar, On Yedinci Lem’a, 154. sayfa; künyesiz videoda künye yok; tutamak kapatır', async () => {
  await page.locator('.reel[data-aktif] .reel__dugme--menba').click();
  await page.waitForSelector('.alt-sayfa.acik');
  const s = '.alt-sayfa.acik';
  assert.equal(await page.locator(`${s} .menba__eser`).innerText(), 'Lem’alar');
  assert.deepEqual(await page.locator(`${s} .menba__yer li`).allTextContents(), ['On Yedinci Lem’a', '154. sayfa']);
  assert.deepEqual(await page.locator(`${s} .menba__etiketler li`).allTextContents(), ['#ihlas', '#muhabbet', '#kurtuluş']);
  assert.deepEqual(
    await page.locator(`${s} .menba__cizim text[font-family^="Tinos"]`).allTextContents(),
    ['Lem’alar'],
  );
  assert.equal(await page.locator(`${s} .menba__kunye`).count(), 0);
  // Sayfadaki her çizimin kimlikleri kendine özgüdür (iki Menba açılışı aynı kimliği kullanmaz)
  const kimlikler = await page.evaluate(() => Array.from(document.querySelectorAll('.menba__cizim [id]'), (e) => e.id));
  assert.equal(new Set(kimlikler).size, kimlikler.length);
  await page.locator(`${s} .alt-sayfa__tutamak`).click();
  await page.waitForFunction(() => !document.querySelector('.alt-sayfa.acik'));
  await page.waitForTimeout(300);
  assert.equal(await opaklik('.reel[data-aktif] .reel__dugmeler'), 1);
});

await adim('ilerleme çizgisine dokununca videoda o yere gidilir', async () => {
  const c = await page.locator('.reel[data-aktif] .reel__ilerleme').boundingBox();
  await page.mouse.click(c.x + c.width / 2, c.y + c.height / 2);
  const oran = await page.locator('.reel[data-aktif] video').evaluate((v) => v.currentTime / v.duration);
  assert.ok(Math.abs(oran - 0.5) < 0.05, `oran ${oran}`);
});

await adim('Escape ile Oku\'dan çıkılır (ana ekrana dönülür), Oku\'ya dönünce aynı video sürer', async () => {
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.getElementById('app').dataset.sekme === 'ana');
  assert.ok(['', '#/'].includes(new URL(page.url()).hash));
  await page.waitForTimeout(200);
  assert.equal(await duruyor(I), true);
  await page.locator('.tab--oku').click();
  await oynuyor(I);
  assert.equal(new URL(page.url()).hash, `#/oku/${I}`);
});

await adim('az sürükleyince yerine döner; sağa çekince Oku kapanır, altından ana ekran görünür', async () => {
  await page.waitForTimeout(500); // Oku sağdan kayarak açılırken (0,36 sn) değil, yerine oturunca
  const az = await surukle(page, 40, 110, 420);
  assert.equal(await page.locator('#view-ana').getAttribute('data-alttan'), '');
  await az.birak();
  await page.waitForTimeout(500);
  assert.equal(new URL(page.url()).hash, `#/oku/${I}`);
  assert.equal(await page.locator('#view-ana').getAttribute('data-alttan'), null);
  assert.equal(await duruyor(I), false, 'kısa sürükleme videoyu durdurmamalı');
  const cok = await surukle(page, 40, 320, 420);
  const kayma = await page.locator('#view-oku').evaluate((e) => new DOMMatrix(getComputedStyle(e).transform).m41);
  assert.ok(kayma > 200, `ekran parmağı izlemeli: ${kayma}`);
  await cok.birak();
  await page.waitForFunction(() => document.getElementById('app').dataset.sekme === 'ana');
  await page.waitForTimeout(400);
  assert.equal(await duruyor(I), true);
  assert.equal(await page.locator('#view-oku').evaluate((e) => e.style.transform), '');
  await page.locator('.tab--oku').click();
  await oynuyor(I);
});

await adim('klavyeyle ↑/↓ video değişir, odak yeni videoya geçer', async () => {
  await page.locator('.reel[data-aktif] .reel__dugme--nesret').focus();
  await page.keyboard.press('ArrowUp');
  await page.waitForFunction((f) => document.querySelector('.reel[data-aktif]')?.dataset.id === f, F);
  assert.equal(await page.evaluate(() => document.activeElement.closest('.reel')?.dataset.id), F);
  assert.ok(await page.evaluate(() => document.activeElement.classList.contains('reel__dugme--nesret')));
  await page.keyboard.press('ArrowDown');
  await page.waitForFunction((i) => document.querySelector('.reel[data-aktif]')?.dataset.id === i, I);
  assert.equal(await page.evaluate(() => document.activeElement.closest('.reel')?.dataset.id), I);
});

await adim('ilerleme çizgisi odaklıyken boşluk durdurur (video değiştirmez), ←/→ ileri geri sarar', async () => {
  await page.locator('.reel[data-aktif] .reel__ilerleme').focus();
  await page.keyboard.press(' ');
  await page.waitForTimeout(300);
  assert.equal(await aktif(), I);
  assert.equal(await duruyor(I), true);
  const t0 = await page.locator('.reel[data-aktif] video').evaluate((v) => v.currentTime);
  await page.keyboard.press('ArrowRight');
  const t1 = await page.locator('.reel[data-aktif] video').evaluate((v) => v.currentTime);
  assert.ok(Math.abs(t1 - t0 - 5) < 0.6, `${t0} → ${t1}`);
  await page.keyboard.press('ArrowUp');
  assert.equal(await aktif(), I, 'kaydırıcıda ↑ video değiştirmemeli');
  await page.keyboard.press(' ');
  await oynuyor(I);
});

await adim('medya tuşuyla durdurma kullanıcının durdurması sayılır; medya tuşuyla oynatınca çizgi yürür', async () => {
  await page.locator('.reel[data-aktif] video').evaluate((v) => v.pause());
  await page.waitForFunction(() => document.querySelector('.reel[data-aktif]').dataset.durum === 'durdu');
  // Oku'dan çıkıp dönünce kendiliğinden başlamamalı
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.getElementById('app').dataset.sekme === 'ana');
  await page.locator('.tab--oku').click();
  await page.waitForTimeout(500);
  assert.equal(await duruyor(I), true);
  await page.locator('.reel[data-aktif] video').evaluate((v) => v.play());
  const olc = () => page.locator('.reel[data-aktif] .reel__ilerleme-dolu').evaluate((e) => e.style.transform);
  const a = await olc();
  await page.waitForTimeout(1200);
  assert.notEqual(await olc(), a);
});

await adim('paylaşım bağlantısı videoyu açar (önizleme etiketleriyle)', async () => {
  const yanit = await page.request.get(base + 'v/ihlas/');
  const html = await yanit.text();
  assert.match(html, /<meta property="og:title" content="On Yedinci Lem’a’dan" \/>/);
  assert.match(html, /og:description" content="Nur-u Hakikat’te izleyin\. Menba: Lem’alar, On Yedinci Lem’a, 154\. sayfa · #ihlas #muhabbet #kurtuluş"/);
  assert.match(html, /og:image" content="https:\/\/emreks53\.github\.io\/A\/videolar\/ihlas-onizleme\.jpg"/);
  await page.goto(base + 'v/ihlas/');
  await page.waitForURL(/#\/oku\/ihlas$/);
  await oynuyor(I);
  // Bağlantıyla doğrudan açılınca altında ana ekran vardır: alt menüde hiçbir sekme seçili değildir
  assert.equal(await page.locator('.tab[aria-current]').count(), 0);
  // Bağlantıyla doğrudan açılınca çıkış ana ekrana gider; odak gizli Oku'da kalmaz
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.getElementById('app').dataset.sekme === 'ana');
  assert.equal(await page.evaluate(() => !!document.activeElement?.closest('#view-oku')), false);
});

await adim('sesli oynatmaya izin vermeyen tarayıcıda sessiz başlar, dokununca ses açılır', async () => {
  const b2 = await playwright.chromium.launch({ args: ['--autoplay-policy=document-user-activation-required'] });
  const p2 = await (await b2.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })).newPage();
  try {
    await p2.goto(base + `v/${F}/`);
    await p2.waitForSelector('.akis__sessiz:not([hidden])');
    await p2.waitForFunction(() => {
      const v = document.querySelector('.reel[data-aktif] video');
      return v.muted && !v.paused;
    });
    assert.match(await p2.locator('.akis__bildirim').innerText(), /Sesi açmak için videoya dokunun/);
    // bildirim de ekranın üstünde değil, altta çıkar
    const bildirim = await p2.locator('.akis__bildirim').boundingBox();
    assert.ok(bildirim.y > 844 * 0.6, `bildirim üstte: ${bildirim.y}`);
    // Bu durumda da ekranda yalnız iki düğme var
    assert.deepEqual(await gorunenDugmeler(p2), ['Neşret', 'Menba']);
    const sahne = await p2.locator('.reel[data-aktif] .reel__sahne').boundingBox();
    await p2.mouse.click(sahne.x + sahne.width / 2, sahne.y + sahne.height / 2);
    await p2.waitForFunction(() => {
      const v = document.querySelector('.reel[data-aktif] video');
      return !v.muted && !v.paused;
    });
    assert.equal(await p2.locator('.akis__sessiz').isHidden(), true);
    // yatay telefonda da ses göstergesi ve bildirim videonun 9:16 sütununun içinde
    const p3 = await (await b2.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true })).newPage();
    await p3.goto(base + `v/${F}/`);
    await p3.waitForSelector('.akis__sessiz:not([hidden])');
    await p3.waitForSelector('.akis__bildirim.gorunur');
    const yatay = await p3.evaluate(() => {
      const sutun = document.querySelector('.reel[data-aktif] .reel__sahne').getBoundingClientRect();
      const ses = document.querySelector('.akis__sessiz').getBoundingClientRect();
      const b = document.querySelector('.akis__bildirim');
      const br = b.getBoundingClientRect();
      return { ses: ses.left >= sutun.left && ses.right <= sutun.right, bildirim: br.left >= sutun.left - 0.5 && br.right <= sutun.right + 0.5, tasma: b.scrollWidth - b.clientWidth };
    });
    assert.deepEqual(yatay, { ses: true, bildirim: true, tasma: 0 });
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
    await p3.route('**/ihlas.mp4', (r) => (engelle ? r.abort() : r.continue()));
    await p3.goto(base + `#/oku/${F}`);
    await p3.waitForFunction(() => document.querySelector('.reel[data-id="ihlas"] video').error);
    engelle = false;
    await p3.locator('.akis').evaluate((a) => a.scrollTo({ top: a.clientHeight }));
    await p3.waitForFunction(() => {
      const v = document.querySelector('.reel[data-id="ihlas"] video');
      return !v.paused && v.currentTime > 0.3 && !v.error;
    });
    assert.equal(await p3.locator('.reel[data-id="ihlas"]').getAttribute('data-durum'), '');
  } finally {
    await b3.close();
  }
});

await adim('telefon tarayıcısında (390 x 664) video kenardan kenara; yanlarda bulanık bant yok', async () => {
  await page.setViewportSize({ width: 390, height: 664 });
  await page.goto(base + `#/oku/${F}`);
  await page.waitForFunction(() => document.querySelector('.reel[data-aktif]'));
  const r = await page.locator('.reel[data-aktif]').evaluate((e) => ({
    sahne: e.querySelector('.reel__sahne').getBoundingClientRect().width,
    video: getComputedStyle(e.querySelector('video')).objectFit,
    arka: getComputedStyle(e, '::before').content,
    dugme: innerHeight - e.querySelector('.reel__dugmeler').getBoundingClientRect().bottom,
  }));
  assert.ok(Math.abs(r.sahne - 390) < 0.5, `sahne ${r.sahne}`);
  assert.equal(r.video, 'cover');
  assert.equal(r.arka, 'none');
  // Düğmeler altyazı bandının (karenin %64-82'si) üstünde
  assert.ok(r.dugme >= 664 * 0.38 - 1, `düğmeler altyazının üstünde olmalı: ${r.dugme}`);
  await page.setViewportSize({ width: 390, height: 844 });
});

await adim('bilinmeyen video adresi ilk videoyu açar, çökmez', async () => {
  await page.goto(base + '#/oku/boyle-bir-video-yok');
  await page.waitForFunction(() => document.querySelector('.reel[data-aktif]'));
});

console.log('Kenz');

await adim('Kenz ayrı ekran: gece kütüphanesi; videolar kitap kitap, kitapta bölüm bölüm', async () => {
  await page.goto(base);
  await page.waitForSelector('.quote');
  await page.locator('.tab--kenz').click();
  await page.waitForFunction(() => document.getElementById('app').dataset.sekme === 'kenz');
  assert.equal(new URL(page.url()).hash, '#/kenz');
  assert.equal(await page.locator('#view-ana').getAttribute('hidden'), '');
  assert.equal(await page.locator('#view-kenz').getAttribute('hidden'), null);
  assert.equal(await page.locator('#kenz-baslik').innerText(), 'Kenz');
  assert.equal(await page.locator('.tab--kenz').getAttribute('aria-current'), 'page');
  assert.equal(await temaRengi(), '#0C1A40');
  await page.waitForTimeout(300);
  assert.equal(await page.locator('.tab--kenz').evaluate((t) => getComputedStyle(t, '::before').opacity), '1');
  const kitaplar = await page.locator('.kitap').evaluateAll((l) =>
    l.map((k) => ({
      ad: k.querySelector('.kitap__ad').textContent,
      sayi: k.querySelector('.kitap__sayi').textContent,
      cilt: k.style.getPropertyValue('--cilt'),
      bolumler: Array.from(k.querySelectorAll('.bolum'), (b) => ({
        ad: b.querySelector('.bolum__ad span').textContent,
        buyuk: getComputedStyle(b.querySelector('.bolum__ad')).textTransform,
        dil: b.querySelector('.bolum__ad').lang,
        kartlar: Array.from(b.querySelectorAll('a.kart'), (a) => [a.getAttribute('href'), a.getAttribute('aria-label')]),
        yer: Array.from(b.querySelectorAll('.kart__yer'), (y) => y.textContent),
        sure: Array.from(b.querySelectorAll('.kart__sure'), (y) => y.textContent),
        etiket: Array.from(b.querySelectorAll('.kart__etiketler'), (e) => [
          Array.from(e.children, (c) => c.textContent).join(' '),
          new Set(Array.from(e.children, (c) => Math.round(c.getBoundingClientRect().top))).size,
        ]),
      })),
    })),
  );
  assert.deepEqual(kitaplar, [
    {
      ad: 'Lem’alar',
      sayi: '1 video',
      cilt: '#1F4A3B',
      bolumler: [
        {
          ad: 'On Yedinci Lem’a',
          buyuk: 'uppercase',
          dil: 'tr',
          kartlar: [['#/oku/ihlas', 'On Yedinci Lem’a’dan, 1:59. Lem’alar, 154. sayfa. #ihlas #muhabbet #kurtuluş']],
          yer: ['154. sayfa'],
          sure: ['1:59'],
          etiket: [['#ihlas #muhabbet #kurtuluş', 1]],
        },
      ],
    },
    {
      ad: 'Şuâlar',
      sayi: '1 video',
      cilt: '#5A3720',
      bolumler: [
        {
          ad: 'On Birinci Şuâ',
          buyuk: 'uppercase',
          dil: 'tr',
          kartlar: [[`#/oku/${F}`, 'On Birinci Şuâ’dan, 2:05. Şuâlar, Altıncı Mesele, 203. sayfa. #fenler #marifetullah #tefekkür']],
          yer: ['Altıncı Mesele · 203. sayfa'],
          sure: ['2:05'],
          etiket: [['#fenler #marifetullah #tefekkür', 1]],
        },
      ],
    },
  ]);
  // İki kitapta kitap fihristi yok (üç ve daha çok kitapta çıkar)
  assert.equal(await page.locator('.fihrist').count(), 0);
});

await adim('menünün altındaki ve yanındaki koyu bantta görünmeyen karta dokunulmaz; kaydırma oradan da başlar', async () => {
  await page.setViewportSize({ width: 390, height: 560 });
  await page.waitForTimeout(200);
  const noktalar = await page.evaluate(() => {
    const m = document.querySelector('.tabbar').getBoundingClientRect();
    return [
      [195, Math.round((m.bottom + innerHeight) / 2)], // menünün altı
      // menünün solu (menüye çok yakın dokunuşu tarayıcı parmak payıyla menüye yöneltir; aralığın ortası)
      [Math.round(m.left / 2), Math.round(m.top + 30)],
    ];
  });
  // Bir kartın her iki noktanın altına girdiği kaydırma yerini bul
  const yer = await page.evaluate((noktalar) => {
    const k = document.querySelector('.kenz');
    for (let y = 0; y <= k.scrollHeight - k.clientHeight; y += 4) {
      k.scrollTop = y;
      if (noktalar.every(([x, yy]) => document.elementsFromPoint(x, yy).some((e) => e.closest('.kart')))) return y;
    }
    return -1;
  }, noktalar);
  assert.ok(yer >= 0, 'menünün altına giren kart bulunamadı; deneme anlamsız');
  await page.waitForTimeout(200);
  for (const [x, y] of noktalar) {
    await page.touchscreen.tap(x, y);
    await page.waitForTimeout(250);
    assert.equal(new URL(page.url()).hash, '#/kenz', `(${x},${y}) görünmeyen kartı açtı`);
    assert.equal(await page.evaluate(() => !!document.activeElement?.closest('.kart')), false, 'görünmeyen kart odak aldı');
  }
  // Menünün yanından başlayan dokunuşla kaydırma çalışır
  await page.locator('.kenz').evaluate((k) => (k.scrollTop = 0));
  await page.waitForTimeout(100);
  const [x, y] = noktalar[1];
  const cdp = await context.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - i * 30 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(600);
  const sonra = await page.locator('.kenz').evaluate((k) => k.scrollTop);
  assert.ok(sonra > 100, `kaydırma olmadı: 0 → ${sonra}`);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.kenz').evaluate((k) => (k.scrollTop = k.scrollHeight));
  await page.waitForTimeout(300);
});

await adim('karta dokununca video Oku\'da açılır; sağa kaydırınca altından Kenz görünür ve aynı yere dönülür', async () => {
  const y = await page.locator('.kenz').evaluate((k) => k.scrollTop);
  await page.locator('a.kart[data-video="ihlas"]').click();
  await page.waitForURL(/#\/oku\/ihlas$/);
  // Oku sağdan gelirken altta Kenz sönmez, ardında gündüz fotoğrafı görünmez
  const gecis = await page.evaluate(() => ({
    kenz: getComputedStyle(document.getElementById('view-kenz')).opacity,
    foto: getComputedStyle(document.querySelector('.bg')).opacity,
    secili: document.querySelector('.tab[aria-current]')?.dataset.tab,
  }));
  assert.deepEqual(gecis, { kenz: '1', foto: '0', secili: 'kenz' });
  await oynuyor(I);
  await page.waitForTimeout(500);
  const cek = await surukle(page, 40, 320, 420);
  assert.equal(await page.locator('#view-kenz').getAttribute('data-alttan'), '');
  await cek.birak();
  await page.waitForFunction(() => document.getElementById('app').dataset.sekme === 'kenz');
  assert.equal(new URL(page.url()).hash, '#/kenz');
  assert.equal(await page.locator('.kenz').evaluate((k) => k.scrollTop), y);
  assert.equal(await duruyor(I), true);
});

await adim('klavyeyle: kartta Enter videoyu açar, odak videoya geçer; Escape karta geri getirir', async () => {
  await page.locator(`a.kart[data-video="${F}"]`).focus();
  await page.keyboard.press('Enter');
  await page.waitForURL(new RegExp(`#/oku/${F}$`));
  await oynuyor(F);
  assert.equal(await page.evaluate(() => document.activeElement?.closest('.reel')?.dataset.id), F);
  await page.keyboard.press('Tab');
  await page.waitForTimeout(300);
  // Tab akışı başa kaydırmaz: hâlâ aynı video
  assert.equal(await aktif(), F);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.getElementById('app').dataset.sekme === 'kenz');
  assert.equal(await page.evaluate(() => document.activeElement?.dataset.video), F);
});

await adim('Oku\'dan geri tuşuyla dönünce Kenz bir anda yerindedir (sönükten belirmez)', async () => {
  await page.locator('a.kart[data-video="ihlas"]').click();
  await oynuyor(I);
  await page.waitForTimeout(450);
  await page.evaluate(() => history.back());
  await page.waitForFunction(() => document.getElementById('app').dataset.sekme === 'kenz');
  assert.equal(await page.locator('#view-kenz').evaluate((e) => getComputedStyle(e).opacity), '1');
  assert.equal(await page.locator('.bg').evaluate((e) => getComputedStyle(e).opacity), '0');
});

await adim('açık sekmeye yeniden dokununca ana ekrana dönülür', async () => {
  await page.locator('.tab--kenz').click();
  await page.waitForFunction(() => document.getElementById('app').dataset.sekme === 'ana');
  assert.ok(['', '#/'].includes(new URL(page.url()).hash));
  assert.equal(await page.locator('.tab[aria-current]').count(), 0);
  assert.equal(await temaRengi(), '#5AA2EC');
});

await adim('sayfa yeniden yüklense de (uygulama güncellenince) çıkışlar geldiği ekrana döner', async () => {
  await page.goto(base);
  await page.waitForSelector('.quote');
  await page.locator('.tab--kenz').click();
  await page.waitForFunction(() => document.getElementById('app').dataset.sekme === 'kenz');
  await page.locator('a.kart[data-video="ihlas"]').click();
  await oynuyor(I);
  await page.reload();
  await oynuyor(I);
  assert.equal(await page.evaluate(() => document.getElementById('app').dataset.zemin), 'kenz');
  assert.equal(await page.locator('.tab[aria-current]').getAttribute('data-tab'), 'kenz');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.getElementById('app').dataset.sekme === 'kenz');
  assert.equal(new URL(page.url()).hash, '#/kenz');
  // Kenz'de yeniden yükle, Kenz'e yeniden dokun: geçmişteki ana ekran kaydına dönülür (fazladan kayıt yok)
  await page.reload();
  await page.waitForSelector('.kart');
  await page.locator('.tab--kenz').click();
  await page.waitForFunction(() => document.getElementById('app').dataset.sekme === 'ana');
  assert.equal(new URL(page.url()).hash, '');
});

await adim('İleri tuşuyla Oku\'ya dönülünce bırakılan ekran altta görünür, çıkış oraya gider', async () => {
  await page.goto(base);
  await page.waitForSelector('.quote');
  await page.locator('.tab--kenz').click();
  await page.waitForFunction(() => document.getElementById('app').dataset.sekme === 'kenz');
  await page.locator('a.kart[data-video="ihlas"]').click();
  await oynuyor(I);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.getElementById('app').dataset.sekme === 'kenz');
  await page.locator('.tab--gunes').click();
  await page.waitForFunction(() => document.getElementById('app').dataset.sekme === 'gunes');
  await page.goForward();
  await page.waitForFunction(() => document.getElementById('app').dataset.sekme === 'oku');
  assert.equal(await page.evaluate(() => document.getElementById('app').dataset.zemin), 'gunes');
  assert.equal(await page.locator('.tab[aria-current]').getAttribute('data-tab'), 'gunes');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.getElementById('app').dataset.sekme === 'gunes');
  assert.equal(new URL(page.url()).hash, '#/gunes');
});

await adim('adres çubuğuna yazılan adresten geri gelince açık sekmeye dokunmak uygulamadan çıkarmaz', async () => {
  await page.goto('about:blank');
  await page.goto(base + '#/kenz');
  await page.waitForSelector('.kart');
  await page.evaluate(() => (location.hash = '#/'));
  await page.waitForFunction(() => document.getElementById('app').dataset.sekme === 'ana');
  await page.goBack();
  await page.waitForFunction(() => document.getElementById('app').dataset.sekme === 'kenz');
  await page.locator('.tab--kenz').click();
  await page.waitForFunction(() => document.getElementById('app')?.dataset.sekme === 'ana');
  assert.ok(page.url().startsWith(base), `uygulamadan çıkıldı: ${page.url()}`);
});

console.log('Güneş');

const sekme = () => page.evaluate(() => document.getElementById('app').dataset.sekme);
const sekmeOlsun = (s, p = page) => p.waitForFunction((s) => document.getElementById('app')?.dataset.sekme === s, s);
const hash = (p = page) => new URL(p.url()).hash;
const hashOlsun = (h, p = page) => p.waitForFunction((h) => location.hash === h, h);
const sayfaNo = (p = page) => p.locator('.okuyucu__sayfa-no').innerText();
/** Okuyucuda görünen sayfa(lar) çizilmiş */
const cizildi = (p = page) =>
  p.waitForFunction(() => {
    const iz = document.querySelector('.okuyucu__iz');
    const g = iz && Math.round(iz.scrollLeft / iz.clientWidth);
    const yuva = iz?.children[g];
    return yuva && Array.from(yuva.children).every((s) => s.hasAttribute('data-cizildi') && s.querySelector('canvas')?.width > 0);
  });
const ESERLER = ['Sözler', 'Mektubat', 'Lem’alar', 'Şuâlar', 'İşârâtü’l-İ’câz', 'Mesnevî-i Nûriye', 'Asâ-yı Mûsâ', 'Barla Lâhikası', 'Kastamonu Lâhikası', 'Emirdağ Lâhikası', 'Sikke-i Tasdîk-i Gaybî', 'Tarihçe-i Hayat', 'Muhâkemat', 'İman ve Küfür Muvâzeneleri'];

await adim('Güneş kütüphanesi: üstte süs Kur\'an-ı Kerim (dokunulmaz), altında 14 eser Külliyat sırasıyla; PDF\'i olan açılır, olmayan "yakında"; Kenz ile Güneş arası geçiş geçmişe yazılmaz', async () => {
  await page.locator('.tab--kenz').click();
  await sekmeOlsun('kenz');
  await page.locator('.tab--gunes').click();
  await sekmeOlsun('gunes');
  assert.equal(await page.locator('.tab--gunes').getAttribute('aria-current'), 'page');
  const raf = await page.evaluate(() =>
    Array.from(document.querySelectorAll('#view-gunes .cilt'), (e) => {
      const r = e.getBoundingClientRect();
      return { ad: e.getAttribute('aria-label') ?? e.querySelector('.visually-hidden').textContent.replace(/, yakında$/, ''), etiket: e.tagName, href: e.getAttribute('href'), yakinda: e.classList.contains('cilt--yakinda'), w: r.width, h: r.height };
    }),
  );
  assert.deepEqual(raf.map((s) => s.ad), ESERLER);
  assert.deepEqual(raf.filter((s) => !s.yakinda).map((s) => [s.ad, s.href]), [['Sözler', '#/gunes/sozler'], ['Lem’alar', '#/gunes/lemalar']]);
  for (const s of raf) {
    assert.ok(s.w >= 44 && s.h >= 44, `${s.ad} dokunma alanı ${s.w}×${s.h}`);
    assert.equal(s.etiket, s.yakinda ? 'SPAN' : 'A');
  }
  // "yakında" eserler ekran okuyucuya da söylenir
  assert.equal(await page.locator('#view-gunes .cilt--yakinda .visually-hidden').first().textContent(), 'Mektubat, yakında');
  // Kur'an-ı Kerim yalnız süstür: ne bağlantı ne düğme; üstüne dokunulunca bir şey olmaz
  const mushaf = page.locator('#view-gunes .gunes__sahne');
  assert.equal(await mushaf.getAttribute('aria-hidden'), 'true');
  const m = await mushaf.boundingBox();
  assert.ok(m.width >= 140, `mushaf ${m.width}`);
  await page.mouse.click(m.x + m.width / 2, m.y + m.height / 2);
  await page.waitForTimeout(300);
  assert.equal(await sekme(), 'gunes');
  assert.equal(await page.locator('#view-gunes h1').innerText(), 'RİSALE-İ NUR KÜLLİYATI');
  // Hiçbir şey okunmamışken "kaldığın yer" yok; her şey ekrana sığar (kaydırma yok)
  assert.equal(await page.locator('#view-gunes .gunes__devam').count(), 0);
  const sigar = await page.evaluate(() => {
    const son = document.querySelector('#view-gunes li:last-child .cilt').getBoundingClientRect();
    return son.bottom <= document.querySelector('.tabbar').getBoundingClientRect().top;
  });
  assert.ok(sigar, 'raf alt menünün altında kalıyor');
  assert.equal(await temaRengi(), '#0B1338');
  await page.goBack();
  await sekmeOlsun('ana');
});

await adim('kitaba dokununca okuyucu tam ekran açılır: kapak, alt menü gizli, adres #/gunes/lemalar; PDF yalnız şimdi indirilir', async () => {
  const istekler = [];
  page.on('request', (r) => r.url().startsWith('https://kitap.deneme/') && istekler.push(r.url()));
  await page.locator('.tab--gunes').click();
  await sekmeOlsun('gunes');
  assert.deepEqual(istekler, []);
  await page.locator('#view-gunes .cilt[data-kitap="lemalar"]').click();
  // cilt raftan çekilip açılır (≈1 s), sonra okuyucu
  await page.waitForSelector('.acilis');
  await sekmeOlsun('kitap');
  await page.waitForFunction(() => !document.querySelector('.acilis'));
  await cizildi();
  assert.ok(istekler.length > 0);
  assert.equal(hash(), '#/gunes/lemalar');
  assert.equal(await sayfaNo(), 'Kapak / 36');
  assert.equal(await page.locator('.okuyucu__kitap').innerText(), 'Lem’alar');
  assert.equal(await page.locator('.tabbar').evaluate((t) => t.inert), true);
  assert.equal(await page.locator('#view-gunes').isHidden(), true);
  // Sayfa ekrana sığar, en az ekran genişliğinin %85'i
  const s = await page.locator('.okuyucu__yuva').first().locator('.okuyucu__sayfa').boundingBox();
  assert.ok(s.width >= 390 * 0.85 && s.y >= 0 && s.y + s.height <= 844, JSON.stringify(s));
  // Tuval cihaz piksel oranında çizilir (bulanık değil)
  const oran = await page.locator('.okuyucu__yuva').first().locator('canvas').evaluate((c) => c.width / c.getBoundingClientRect().width);
  assert.ok(Math.abs(oran - 2) < 0.05, `oran ${oran}`);
});

await adim('sayfa çevirme: sağ kenara dokunmak, ok tuşları ve yana kaydırma; adres sayfayla değişir, geçmişe kayıt eklenmez', async () => {
  const uzunluk = await page.evaluate(() => history.length);
  await page.mouse.click(370, 420);
  await hashOlsun('#/gunes/lemalar/1');
  assert.equal(await sayfaNo(), '1 / 36');
  await page.keyboard.press('ArrowRight');
  await hashOlsun('#/gunes/lemalar/2');
  await page.keyboard.press('ArrowLeft');
  await hashOlsun('#/gunes/lemalar/1');
  const k = await surukle(page, 320, 60, 420);
  await k.birak();
  await hashOlsun('#/gunes/lemalar/2');
  await cizildi();
  await page.mouse.click(20, 420);
  await hashOlsun('#/gunes/lemalar/1');
  assert.equal(await page.evaluate(() => history.length), uzunluk);
});

await adim('dokunarak sayfa çevrilince çubuklar çekilir (gizliyken odak almaz); ortaya dokunmak gösterir ve gizler', async () => {
  // (önceki adımın son dokunuşu sayfa çevirdi)
  await page.waitForFunction(() => !document.querySelector('.okuyucu').hasAttribute('data-arayuz'));
  assert.equal(await page.locator('.okuyucu__ust').evaluate((e) => e.inert), true);
  await page.waitForTimeout(400);
  assert.equal(await opaklik('.okuyucu__ust'), 0);
  await page.mouse.click(195, 420);
  await page.waitForFunction(() => document.querySelector('.okuyucu').hasAttribute('data-arayuz'));
  assert.equal(await page.locator('.okuyucu__ust').evaluate((e) => e.inert), false);
  await page.mouse.click(195, 420);
  await page.waitForFunction(() => !document.querySelector('.okuyucu').hasAttribute('data-arayuz'));
  await page.mouse.click(195, 420);
  await page.waitForFunction(() => document.querySelector('.okuyucu').hasAttribute('data-arayuz'));
  // klavyeyle çevirirken çubuklar açık kalır
  await page.keyboard.press('ArrowRight');
  await hashOlsun('#/gunes/lemalar/2');
  await page.waitForTimeout(400);
  assert.equal(await page.locator('.okuyucu').getAttribute('data-arayuz'), '');
  await page.keyboard.press('ArrowLeft');
  await hashOlsun('#/gunes/lemalar/1');
});

await adim('İçindekiler: bölüme dokununca ilk sayfası açılır, bölüm adı başlıkta; bulunulan bölüm işaretli; "Sayfaya git"', async () => {
  await page.locator('.okuyucu__icindekiler-d').click();
  const s = '.alt-sayfa.acik';
  await page.waitForSelector(s);
  assert.deepEqual(await page.locator(`${s} .icindekiler__ad`).allTextContents(), ['Birinci Bölüm', 'İkinci Bölüm', 'Üçüncü Bölüm', 'Dördüncü Bölüm', 'Beşinci Bölüm', 'Altıncı Bölüm']);
  assert.equal(await page.locator(`${s} [aria-current="true"] .icindekiler__ad`).innerText(), 'Birinci Bölüm');
  await page.locator(`${s} .icindekiler__oge`, { hasText: 'Üçüncü Bölüm' }).click();
  await hashOlsun('#/gunes/lemalar/13');
  await page.waitForFunction(() => !document.querySelector('.alt-sayfa.acik'));
  assert.equal(await page.locator('.okuyucu__bolum').innerText(), 'Üçüncü Bölüm');
  assert.equal(await sayfaNo(), '13 / 36');
  await cizildi();
  await page.locator('.okuyucu__icindekiler-d').click();
  await page.waitForSelector(s);
  assert.equal(await page.locator(`${s} [aria-current="true"] .icindekiler__ad`).innerText(), 'Üçüncü Bölüm');
  await page.locator(`${s} .icindekiler__git-giris`).fill('20');
  await page.locator(`${s} .icindekiler__git-giris`).press('Enter');
  await hashOlsun('#/gunes/lemalar/20');
  assert.equal(await page.locator('.okuyucu__bolum').innerText(), 'Dördüncü Bölüm');
  await cizildi();
});

await adim('Görünüm: gece teması sayfayı koyulaştırır, tarayıcı çubuğu rengini alır', async () => {
  await page.locator('.okuyucu__ayar-d').click();
  const s = '.alt-sayfa.acik';
  await page.waitForSelector(s);
  assert.deepEqual(await page.locator(`${s} .gorunum-ayar__ad`).allTextContents(), ['Gündüz', 'Sepya', 'Gece']);
  assert.equal(await page.locator(`${s} [aria-checked="true"] .gorunum-ayar__ad`).innerText(), 'Gündüz');
  await page.locator(`${s} [data-tema="gece"]`).click();
  assert.equal(await page.locator('.okuyucu').getAttribute('data-tema'), 'gece');
  assert.equal(await temaRengi(), '#0A1534');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('.alt-sayfa.acik'));
  // sayfa ters çevrilmiş renkte (beyaz kâğıt koyu görünür)
  assert.match(await page.locator('.okuyucu__yuva canvas').first().evaluate((c) => getComputedStyle(c).filter), /invert/);
  assert.equal(await sekme(), 'kitap');
});

await adim('çift dokunuş sayfayı büyütür (keskin çizilir); çift dokunuş ya da Escape küçültür, aynı sayfada kalınır', async () => {
  await page.mouse.dblclick(195, 420);
  await page.waitForFunction(() => !document.querySelector('.okuyucu__yakin').hidden);
  await page.waitForFunction(() => document.querySelector('.okuyucu__yakin canvas').width > 0);
  const b = await page.locator('.okuyucu__yakin canvas').boundingBox();
  assert.ok(b.width > 390 * 1.8, `yakın genişlik ${b.width}`);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.querySelector('.okuyucu__yakin').hidden);
  assert.equal(await sekme(), 'kitap');
  assert.equal(hash(), '#/gunes/lemalar/20');
});

await adim('kapatınca Güneş\'e dönülür, odak kitapta; "kaldığın yer" kartı son sayfayı gösterir ve oradan açar', async () => {
  await page.locator('.okuyucu__kapat').click();
  await sekmeOlsun('gunes');
  assert.equal(hash(), '#/gunes');
  assert.equal(await page.evaluate(() => document.activeElement?.dataset.kitap), 'lemalar');
  const kart = page.locator('#view-gunes .gunes__devam');
  await kart.waitFor();
  assert.match((await kart.innerText()).replace(/\s+/g, ' '), /KALDIĞIN YER Lem’alar Dördüncü Bölüm · 20\. sayfa/);
  await kart.click();
  await sekmeOlsun('kitap');
  await page.waitForFunction(() => !document.querySelector('.acilis'));
  await cizildi();
  assert.equal(hash(), '#/gunes/lemalar/20');
  assert.equal(await page.locator('.okuyucu').getAttribute('data-tema'), 'gece');
  // geri tuşu Güneş'e döner
  await page.goBack();
  await sekmeOlsun('gunes');
  // cilde dokununca kalınan yerden açılır, bir an "Kaldığın yerden" bildirimi; "Baştan aç" kapağa gider
  await page.locator('#view-gunes .cilt[data-kitap="lemalar"]').click();
  await sekmeOlsun('kitap');
  await page.waitForFunction(() => !document.querySelector('.acilis'));
  await page.waitForSelector('.okuyucu__bildirim:not([hidden])');
  assert.equal((await page.locator('.okuyucu__bildirim').innerText()).replace(/\s+/g, ' '), 'Kaldığın yerden: 20. sayfa Baştan aç');
  assert.equal(await sayfaNo(), '20 / 36');
  const b = await page.locator('.okuyucu__bildirim').boundingBox();
  assert.ok(b.x >= 16 && b.x + b.width <= 390 - 16, `bildirim taşıyor: ${JSON.stringify(b)}`);
  await page.locator('.okuyucu__bildirim-d').click();
  await hashOlsun('#/gunes/lemalar');
  assert.equal(await sayfaNo(), 'Kapak / 36');
  assert.equal(await page.locator('.okuyucu__bildirim').isHidden(), true);
  await page.goBack();
  await sekmeOlsun('gunes');
});

await adim('derin bağlantı: #/gunes/lemalar/7 o sayfada açılır, tema hatırlanır; kapatınca Güneş\'e (geçmişe kayıt eklemeden)', async () => {
  await page.goto('about:blank');
  await page.goto(base + '#/gunes/lemalar/7');
  await sekmeOlsun('kitap');
  await cizildi();
  assert.equal(await sayfaNo(), '7 / 36');
  assert.equal(await page.locator('.okuyucu__bolum').innerText(), 'İkinci Bölüm');
  assert.equal(await page.locator('.okuyucu').getAttribute('data-tema'), 'gece');
  await page.keyboard.press('Escape');
  await sekmeOlsun('gunes');
  assert.equal(hash(), '#/gunes');
  await page.goBack();
  assert.equal(page.url(), 'about:blank');
  await page.goForward();
  await sekmeOlsun('gunes');
});

await adim('PDF\'i eklenmemiş eserin ve bilinmeyen kitabın adresi Güneş kütüphanesini açar', async () => {
  for (const adres of ['#/gunes/muhakemat', '#/gunes/yok-boyle-kitap/3']) {
    await page.evaluate((a) => (location.hash = a), adres);
    await hashOlsun('#/gunes');
    assert.equal(await sekme(), 'gunes');
  }
  // "yakında" esere dokunmak bir şey açmaz
  await page.locator('#view-gunes .cilt[data-kitap="muhakemat"]').click();
  await page.waitForTimeout(300);
  assert.equal(hash(), '#/gunes');
});

await adim('Menba\'da "Kitapta oku": kitap videonun sayfasında açılır; kapatınca aynı video sürer', async () => {
  await page.goto('about:blank');
  await page.goto(base + `#/oku/${I}`);
  await oynuyor(I);
  await page.locator('.reel[data-aktif] .reel__dugme--menba').click();
  const s = '.alt-sayfa.acik';
  await page.waitForSelector(s);
  const oku = page.locator(`${s} .menba__oku`);
  assert.equal(await oku.getAttribute('href'), '#/gunes/lemalar/154');
  assert.equal(await oku.getAttribute('aria-label'), 'Kitapta oku: Lem’alar, 154. sayfa');
  const b = await oku.boundingBox();
  assert.ok(b.height >= 44, `yükseklik ${b.height}`);
  await oku.click();
  await sekmeOlsun('kitap');
  await cizildi();
  // Örnek PDF'te 154. sayfa yok: son sayfada açılır (adres de ona döner)
  await hashOlsun('#/gunes/lemalar/36');
  assert.equal(await sayfaNo(), '36 / 36');
  assert.equal(await duruyor(I), true);
  await page.keyboard.press('Escape');
  await sekmeOlsun('oku');
  assert.equal(hash(), `#/oku/${I}`);
  await oynuyor(I);
  await page.keyboard.press('Escape');
  await sekmeOlsun('ana');
});

await adim('yatay geniş ekranda iki sayfa yan yana; kapak tek', async () => {
  const c2 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  try {
    await kitapYolu(c2);
    const p2 = await c2.newPage();
    p2.on('pageerror', (e) => hatalar.push(String(e)));
    await p2.goto(base + '#/gunes/sozler/1');
    await sekmeOlsun('kitap', p2);
    await cizildi(p2);
    assert.equal(await p2.locator('.okuyucu').getAttribute('data-cift'), '');
    assert.equal(await sayfaNo(p2), '1–2 / 36');
    const yuva = p2.locator('.okuyucu__yuva[data-i="1"] .okuyucu__sayfa');
    assert.equal(await yuva.count(), 2);
    const [a, b] = [await yuva.nth(0).boundingBox(), await yuva.nth(1).boundingBox()];
    assert.ok(Math.abs(a.y - b.y) < 1 && b.x >= a.x + a.width - 1, 'yan yana değil');
    await p2.keyboard.press('ArrowRight');
    await hashOlsun('#/gunes/sozler/3', p2);
    assert.equal(await sayfaNo(p2), '3–4 / 36');
    await p2.keyboard.press('Home');
    await hashOlsun('#/gunes/sozler', p2);
    assert.equal(await p2.locator('.okuyucu__yuva[data-i="0"] .okuyucu__sayfa').count(), 1);
    // Sözler'in içindekiler listesi elle yazılmamış: PDF'in kendi listesi kullanılır
    await p2.locator('.okuyucu__icindekiler-d').click();
    await p2.waitForSelector('.alt-sayfa.acik .icindekiler__oge');
    assert.ok((await p2.locator('.alt-sayfa.acik .icindekiler__oge').count()) >= 6);
  } finally {
    await c2.close();
  }
});

await adim('telefon tarayıcısında (360 x 640) raf ve kart menünün üstüne sığar, sırtlar en az 44 px; hareket azaltılmışsa kitap geçişsiz açılır', async () => {
  const c2 = await browser.newContext({ viewport: { width: 360, height: 640 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  try {
    await kitapYolu(c2);
    const p2 = await c2.newPage();
    p2.on('pageerror', (e) => hatalar.push(String(e)));
    await p2.goto(base + '#/gunes');
    await p2.evaluate(() => localStorage.setItem('nuruhakikat.gunes.yer', JSON.stringify({ lemalar: { sayfa: 8, zaman: Date.now() } })));
    await p2.reload();
    await p2.waitForSelector('#view-gunes .gunes__devam');
    const olcu = await p2.evaluate(() => {
      const menu = document.querySelector('.tabbar').getBoundingClientRect().top;
      const ciltler = Array.from(document.querySelectorAll('#view-gunes .cilt'), (c) => c.getBoundingClientRect());
      const kart = document.querySelector('#view-gunes .gunes__devam').getBoundingClientRect();
      const sahne = document.querySelector('#view-gunes .gunes__sahne').getBoundingClientRect();
      return { menu, enDar: Math.min(...ciltler.map((r) => r.width)), enAlt: Math.max(...ciltler.map((r) => r.bottom)), kartAlt: kart.bottom, kartUst: kart.top, sahneUst: sahne.top, kaydirma: document.querySelector('.gunes').scrollHeight - innerHeight };
    });
    assert.ok(olcu.enDar >= 44, `en dar sırt ${olcu.enDar}`);
    assert.ok(olcu.enAlt < olcu.kartUst && olcu.kartAlt <= olcu.menu, JSON.stringify(olcu));
    assert.ok(olcu.sahneUst >= 0 && olcu.kaydirma <= 0, JSON.stringify(olcu));
    let gecis = false;
    await p2.exposeFunction('gecisGoruldu', () => (gecis = true));
    await p2.evaluate(() => new MutationObserver(() => document.querySelector('.acilis') && window.gecisGoruldu()).observe(document.body, { childList: true }));
    await p2.locator('#view-gunes .cilt[data-kitap="lemalar"]').click();
    await sekmeOlsun('kitap', p2);
    await cizildi(p2);
    assert.equal(gecis, false);
    assert.equal(await sayfaNo(p2), '7 / 36');
  } finally {
    await c2.close();
  }
});

await adim('PDF indirilemezse "Kitap açılamadı" ve "Yeniden dene"; yeniden deneyince açılır', async () => {
  const c2 = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  try {
    let izin = false;
    await c2.route('https://kitap.deneme/**', (r) =>
      izin ? r.fulfill({ status: 200, body: ornekPdf, headers: { 'content-type': 'application/pdf', 'access-control-allow-origin': '*' } }) : r.abort('internetdisconnected'),
    );
    const p2 = await c2.newPage();
    p2.on('pageerror', (e) => hatalar.push(String(e)));
    await p2.goto(base + '#/gunes/lemalar/3');
    await p2.waitForSelector('.okuyucu__yeniden');
    assert.match(await p2.locator('.okuyucu__durum').innerText(), /Kitap açılamadı/);
    izin = true;
    await p2.locator('.okuyucu__yeniden').click();
    await cizildi(p2);
    assert.equal(await sayfaNo(p2), '3 / 36');
  } finally {
    await c2.close();
  }
});

await adim('masaüstünde: kütüphane ortada bir sütun; ipucu Escape\'i söyler; görünmez "Oku\'dan çık" klavyeyle Kenz\'e döndürür', async () => {
  const c2 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  try {
    const p2 = await c2.newPage();
    await p2.goto(base + '#/kenz');
    await p2.waitForSelector('.kart');
    assert.ok((await p2.locator('.kutuphane').boundingBox()).width <= 600);
    await p2.locator('.tab--oku').click();
    await p2.waitForFunction(() => document.querySelector('.akis__ipucu.gorunur')?.textContent === 'Çıkmak için Esc tuşuna basın');
    // Ekranda yine yalnız iki düğme
    assert.deepEqual(await gorunenDugmeler(p2), ['Neşret', 'Menba']);
    await p2.locator('.akis__cik').focus();
    await p2.keyboard.press('Enter');
    await p2.waitForFunction(() => document.getElementById('app').dataset.sekme === 'kenz');
  } finally {
    await c2.close();
  }
});

await adim('konsolda hata yok', async () => {
  assert.deepEqual(hatalar, []);
});

console.log(`${gecen} adım geçti`);
await browser.close();
server.close();
