// Bütün sahnelerin ses efekti işaretlerini toplar
const T = require('../scenes/index');
const out = [];
for (const s of T.SCENES) for (const c of (s.sfx || [])) out.push(Object.assign({ scene: s.id }, c));
out.sort((a, b) => a.t - b.t);
require('fs').writeFileSync(process.argv[2] || 'audio/cues.json', JSON.stringify(out, null, 1));
console.log(out.length, 'işaret');
