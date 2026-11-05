// HTML -> PNG yardimcisi (dokular.py tarafindan cagrilir).
// Kullanim: node cek.mjs jobs.json
// jobs.json: [{html: "/abs/file.html", out: "/abs/out.png", w: cssW, h: cssH, dsf: 3.2, transparent: true}]
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire('/opt/node22/lib/node_modules/');
const { chromium } = require('playwright');

const jobs = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const browser = await chromium.launch();
for (const j of jobs) {
  const ctx = await browser.newContext({
    viewport: { width: Math.round(j.w), height: Math.round(j.h) },
    deviceScaleFactor: j.dsf,
  });
  const page = await ctx.newPage();
  page.on('console', (m) => console.log('[page]', m.text()));
  await page.goto('file://' + j.html);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);
  if (j.fit) await page.evaluate(() => window.fitLayout && window.fitLayout());
  await page.waitForTimeout(50);
  await page.screenshot({ path: j.out, omitBackground: !!j.transparent, fullPage: false });
  console.log('wrote', j.out);
  await ctx.close();
}
await browser.close();
