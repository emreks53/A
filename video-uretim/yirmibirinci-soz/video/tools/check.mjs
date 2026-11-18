#!/usr/bin/env node
// Engine self-check:  node tools/check.mjs [--fills]
//   1. the SAME PAINTING at every render scale: dab lists of the scatterer and of the builders scenes
//      use (sky, foliage, mosque, flower, leaf, cloud, glow, sun, lettering) are identical at scale
//      0.5, 1 and 2 (the supersampled final) — previews and sheets predict the final dab for dab;
//   2. the frozen stamp fill table (sponge.js FILL) still matches the 2x tiles (re-freeze it with
//      --fills after changing stamp recipes, levels or the stamp seed — that changes every painting);
//   3. unit checks of track / poseTrack / lagPose / beat / rig stretch + IK + bake + through-mask /
//      multi-contour shapes / outline stencils / lettering (stroke, path, font check) / rays / stream.
// Exit code 0 = all good. Takes about a minute; nothing is left running.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const run = (scale) => {
  const r = spawnSync('node', [path.join(here, 'lab.mjs'), path.join(here, 'probes', 'check.js'), '--scale', String(scale)], { encoding: 'utf8', maxBuffer: 1 << 26 });
  if (r.status !== 0) { console.error(`check failed at scale ${scale}: ${(r.stderr || r.stdout).trim().split('\n').pop()}`); process.exit(1); }
  return JSON.parse(r.stdout.trim().split('\n').pop());
};
const scales = [0.5, 1, 2];
const res = scales.map(run);
let bad = 0;
for (const name of Object.keys(res[0].hashes)) {
  const vals = res.map((r) => r.hashes[name]);
  const same = vals.every((v) => v === vals[0]);
  if (!same) bad++;
  console.log(`${same ? 'ok  ' : 'FAIL'} dabs ${name.padEnd(22)} ${same ? vals[0] : scales.map((s, i) => `@${s} ${vals[i]}`).join('  ')}`);
}
console.log(`info mask-reveal prints of the dome per scale: ${res.map((r) => r.info.maskPrints).join(' / ')}`);
const f2 = res[2].fills;
const fillOk = f2.q === 2 && f2.maxErr < 1e-9;
if (!fillOk) bad++;
console.log(`${fillOk ? 'ok  ' : 'FAIL'} frozen fill table vs 2x tiles: max error ${f2.maxErr.toExponential(2)}`);
if (process.argv.includes('--fills')) console.log(JSON.stringify(f2.measured));
const unit = res.flatMap((r) => r.unit);
for (const u of unit) { bad++; console.log(`FAIL ${u}`); }
if (!unit.length) console.log('ok   unit checks (track, poseTrack, lagPose, beat, rig, shapes, lettering, fx)');
console.log(bad ? `${bad} check(s) FAILED` : 'all checks passed');
process.exit(bad ? 1 : 0);
