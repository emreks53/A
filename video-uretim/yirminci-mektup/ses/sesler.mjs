// Sahnelerin ses efekti ipuçlarını (sesler) tek bir JSON'a döker: veri/sesler.json
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { KOK } from '../motor/temel.mjs';
import { ZAMAN } from '../sahneler/index.mjs';
const tum = [];
for (const z of ZAMAN) {
  try {
    const m = (await import(`../sahneler/${z.ad}.mjs`)).default;
    for (const s of m.sesler || []) if (s.t >= z.bas - 0.5 && s.t <= z.son + 0.5) tum.push({ ...s, sahne: z.ad });
  } catch (e) {
    console.error(z.ad, e.message);
  }
}
tum.sort((a, b) => a.t - b.t);
writeFileSync(path.join(KOK, 'veri', 'sesler.json'), JSON.stringify(tum, null, 1));
console.log(tum.length, 'ses ipucu');
