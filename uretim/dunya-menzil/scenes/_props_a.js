/* Preview sheets for engine/props-a.js (world & nature).
   Render:  DM_HASH=solo=_props_a node tools/render.cjs stills --times 0.5,2,4 --out <dir>
   Sheets (lt ranges, u = lt mod 10 is the local animation time):
     0  big world hero (decor pops in 0→1.6 s, gate glow, travellers) + decor 0 / .5 / 1 / small (crosshair = bigWorldGate)
     1  big world: close-up of the han (r = 1100)
     2  trees: kinds, fruit ripening, growth, leaf fall (crown breaks into leaves), small sizes, night: 1
     3  saplings (growth), wheat (glow, growth), flowers (5 kinds, bloom, stem:false, small)
     4  clouds: day / dusk / night
     5  personal worlds: home (life, glow, door opening; crosshair = personalWorldDoor), sea, city, field, orchard,
        night (moon, stars, warm windows), small
     6  personal world states: dissolve, flicker, mirror, glow, door, seed
     7  ground 'spring' (full size)      8  arch gate opening (+ closed / open small)
     9  ponds: gold + reflection + ripples, day + tree reflection, night
     10 drop bloom progression         11–13 ground 'garden' / 'dusk' / 'night'      14 big world rotation, shadow, alpha
   Sheet i is shown for lt in [10·i, 10·i + 10); u = lt − 10·i is the local animation time.
*/
(function () {
  const E = window.E;
  const PR = E.props;
  const label = (L, txt, x, y, s = 30) => E.note(L.ink, txt, x, y, { size: s, alpha: 0.55 });

  const groundSheet = (L, u, pal) => {
    const sky = { spring: [E.shade(E.P.cerulean, 0.5), E.shade(E.P.ochre, 0.7)], garden: [E.shade(E.P.cerulean, 0.55), E.shade(E.P.gamboge, 0.75)],
      dusk: ['#D9A0A8', '#F2C891'], night: ['#26314F', '#4A5A86'] }[pal];
    E.skyWash(L.paint, sky[0], sky[1], { mottle: 0.15 });
    if (pal === 'night') E.wash(L.paint, E.rrect(0, 0, 1080, 1920, 0), '#2F3B60', { alpha: 0.6 });
    PR.cloud(L, 300, 420, 360, { t: u, seed: 4, tone: pal === 'night' ? 'night' : pal === 'dusk' ? 'dusk' : 'day' });
    PR.ground(L, 1120, { palette: pal, t: u, seed: 2 });
    const night = pal === 'night' ? 1 : 0;
    PR.tree(L, 820, 1330, 300, { kind: 'cypress', t: u, night, color: pal === 'dusk' ? '#5E7A52' : undefined });
    PR.tree(L, 900, 1360, 240, { kind: 'round', t: u, night, color: pal === 'dusk' ? '#8E9A5A' : undefined });
    label(L, 'ground: ' + pal, 540, 1840);
  };

  const sheets = [
    // ---------------------------------------------------------------- 0: big world hero
    (L, u) => {
      E.skyWash(L.paint, E.shade(E.P.cerulean, 0.55), E.shade(E.P.ochre, 0.7), { mid: E.shade(E.P.skyWash, 0.6), mottle: 0.2 });
      const decor = E.clamp(u / 1.6);
      PR.bigWorld(L, 540, 860, 410, { t: u, decor, gateGlow: E.ep(u, 1.2, 2.2), travellers: 1, rotSpeed: 0.04 });
      const g = PR.bigWorldGate(540, 860, 410);
      E.pencil(L.ink, [[g[0] - 30, g[1]], [g[0] + 30, g[1]]], { a: 0.5, w: 1 });
      E.pencil(L.ink, [[g[0], g[1] - 30], [g[0], g[1] + 30]], { a: 0.5, w: 1 });
      PR.bigWorld(L, 170, 1640, 120, { t: u, decor: 0, simple: true });
      PR.bigWorld(L, 430, 1640, 120, { t: u, decor: 0.5, gateGlow: 0.5 });
      PR.bigWorld(L, 700, 1640, 120, { t: u, decor: 1, gateGlow: 1 });
      PR.bigWorld(L, 920, 1660, 70, { t: u, decor: 1, gateGlow: 1 });
      label(L, 'decor 0 / .5 / 1 / small', 540, 1850);
    },
    // ---------------------------------------------------------------- 1: big world close-up of the han
    (L, u) => {
      E.skyWash(L.paint, E.shade(E.P.cerulean, 0.5), E.shade(E.P.blush, 0.7), { mid: E.shade(E.P.skyWash, 0.6), mottle: 0.2 });
      PR.bigWorld(L, 540, 1900, 1100, { t: u, decor: E.clamp(u / 2), gateGlow: E.ep(u, 0.5, 2), travellers: 1 });
    },

    // ---------------------------------------------------------------- 2: trees (kinds × growth / leaf fall)
    (L, u) => {
      E.skyWash(L.paint, E.shade(E.P.cerulean, 0.6), E.shade(E.P.ochre, 0.75), { mid: E.shade(E.P.skyWash, 0.7), mottle: 0.15 });
      PR.tree(L, 200, 760, 560, { kind: 'round', t: u });
      PR.tree(L, 540, 760, 600, { kind: 'cypress', t: u });
      PR.tree(L, 860, 760, 540, { kind: 'fruit', t: u, fruit: E.clamp(u / 3) });
      PR.tree(L, 200, 1420, 420, { kind: 'blossom', t: u, leafFall: (u % 5) / 5 * 0.6 });
      PR.tree(L, 470, 1420, 420, { kind: 'round', t: u, growth: (u % 4) / 3, seed: 3 });
      PR.tree(L, 720, 1420, 420, { kind: 'round', t: u, leafFall: (u % 5) / 4, seed: 2 });
      PR.tree(L, 930, 1420, 300, { kind: 'cypress', t: u, growth: (u % 4) / 3, seed: 2 });
      PR.tree(L, 120, 1800, 140, { kind: 'round', t: u });
      PR.tree(L, 220, 1800, 140, { kind: 'cypress', t: u });
      PR.tree(L, 320, 1800, 140, { kind: 'fruit', t: u });
      PR.tree(L, 420, 1800, 140, { kind: 'blossom', t: u });
      PR.tree(L, 500, 1800, 70, { kind: 'fruit', t: u });
      PR.tree(L, 560, 1800, 70, { kind: 'round', t: u });
      // night option (moonlit palette) over a night wash
      E.wash(L.paint, E.rrect(640, 1560, 430, 330, 24), '#2F3B60', { alpha: 0.9 });
      PR.tree(L, 760, 1850, 250, { kind: 'round', t: u, night: 1 });
      PR.tree(L, 900, 1850, 250, { kind: 'cypress', t: u, night: 1 });
      PR.tree(L, 1000, 1850, 160, { kind: 'fruit', t: u, night: 1 });
      label(L, 'night: 1', 850, 1590);
      for (const f of PR.treeFruits(860, 760, 540, { kind: 'fruit', t: u, fruit: E.clamp(u / 3) })) E.pencil(L.ink, [[f.x - 4, f.y], [f.x + 4, f.y]], { a: 0.0 });
      label(L, 'round · cypress · fruit (ripening)', 540, 820);
      label(L, 'blossom·fall · growth · leafFall · cypress growth', 540, 1480);
    },
    // ---------------------------------------------------------------- 3: saplings, wheat, flowers
    (L, u) => {
      E.skyWash(L.paint, E.shade(E.P.cerulean, 0.65), E.shade(E.P.ochre, 0.7), { mid: E.shade(E.P.skyWash, 0.75), mottle: 0.15 });
      for (let i = 0; i < 5; i++) PR.sapling(L, 120 + i * 200, 360, 230, { t: u, growth: [0.05, 0.25, 0.5, 0.75, 1][i], seed: i + 1, stake: i === 4 });
      label(L, 'sapling growth 0.05 · .25 · .5 · .75 · 1 (stake)', 540, 420);
      PR.wheat(L, 160, 900, 380, { t: u, count: 5 });
      PR.wheat(L, 420, 900, 380, { t: u, count: 7, glow: 1, seed: 2 });
      PR.wheat(L, 660, 900, 380, { t: u, count: 5, growth: (u % 4) / 3, seed: 3 });
      PR.wheat(L, 880, 900, 200, { t: u, count: 3, seed: 4 });
      PR.wheat(L, 980, 900, 90, { t: u, count: 4, seed: 5 });
      label(L, 'wheat · glow · growth · small', 540, 960);
      const kinds = ['tulip', 'rose', 'daisy', 'carnation', 'wild'];
      kinds.forEach((k, i) => {
        PR.flower(L, 110 + i * 205, 1330, 300, { kind: k, t: u, seed: i + 1 });
        PR.flower(L, 70 + i * 205, 1560, 150, { kind: k, t: u, bloom: (u % 3) / 2, seed: i + 3 });
        PR.flower(L, 150 + i * 205, 1520, 110, { kind: k, t: u, stem: false, seed: i + 5 });
        PR.flower(L, 160 + i * 205, 1700, 60, { kind: k, t: u, seed: i + 7 });
      });
      label(L, 'tulip · rose · daisy · carnation · wild', 540, 1380);
    },
    // ---------------------------------------------------------------- 4: clouds
    (L, u) => {
      E.skyWash(L.paint, E.shade(E.P.cerulean, 0.15), E.shade(E.P.skyWash, 0.4), { mottle: 0.2 });
      PR.cloud(L, 330, 330, 520, { t: u, seed: 1 });
      PR.cloud(L, 820, 520, 380, { t: u, seed: 2 });
      PR.cloud(L, 200, 640, 200, { t: u, seed: 3 });
      E.wash(L.paint, E.rrect(0, 760, 1080, 560, 0), '#E9A98B', { alpha: 0.75 });
      E.wash(L.paint, E.rrect(0, 760, 1080, 560, 0), '#9C93B8', { alpha: 0.35, grad: { from: [0, 760], to: [0, 1320], c2: '#F2C88F' } });
      PR.cloud(L, 360, 1000, 520, { t: u, seed: 4, tone: 'dusk' });
      PR.cloud(L, 840, 1180, 300, { t: u, seed: 5, tone: 'dusk' });
      E.wash(L.paint, E.rrect(0, 1320, 1080, 600, 0), '#2F3B60', { alpha: 0.95 });
      PR.cloud(L, 380, 1600, 520, { t: u, seed: 6, tone: 'night' });
      PR.cloud(L, 860, 1760, 280, { t: u, seed: 7, tone: 'night' });
    },

    // ---------------------------------------------------------------- 5: personal worlds (kinds)
    (L, u) => {
      E.skyWash(L.paint, E.shade(E.P.cerulean, 0.6), E.shade(E.P.blush, 0.7), { mid: E.shade(E.P.skyWash, 0.7), mottle: 0.15 });
      PR.personalWorld(L, 540, 520, 330, { t: u, kind: 'home', life: 1, glow: E.ep(u, 1, 3) * 0.6, doorOpen: E.ep(u, 2, 3.5) });
      const dp = PR.personalWorldDoor(540, 520, 330);
      E.pencil(L.ink, [[dp[0] - 14, dp[1]], [dp[0] + 14, dp[1]]], { a: 0.6, w: 1 });
      PR.personalWorld(L, 200, 1130, 160, { t: u, kind: 'sea', life: 1 });
      PR.personalWorld(L, 540, 1130, 160, { t: u, kind: 'city', life: 1, glow: 0.4 });
      PR.personalWorld(L, 880, 1130, 160, { t: u, kind: 'field', life: 1 });
      PR.personalWorld(L, 200, 1560, 160, { t: u, kind: 'orchard', life: 1 });
      PR.personalWorld(L, 540, 1560, 160, { t: u, kind: 'home', life: 1, night: 1, glow: 0.5 });
      PR.personalWorld(L, 800, 1560, 90, { t: u, kind: 'home', life: 1 });
      PR.personalWorld(L, 960, 1560, 50, { t: u, kind: 'home' });
      label(L, 'sea · city · field', 540, 1325);
      label(L, 'orchard · night · small', 540, 1760);
    },
    // ---------------------------------------------------------------- 6: personal world states
    (L, u) => {
      E.skyWash(L.paint, E.shade(E.P.cerulean, 0.6), E.shade(E.P.ochre, 0.75), { mid: E.shade(E.P.skyWash, 0.7), mottle: 0.15 });
      const st = [
        ['dissolve .35', { dissolve: 0.35 }], ['dissolve .7', { dissolve: 0.7 }], ['dissolve 1', { dissolve: 1 }],
        ['flicker 1', { flicker: 1 }], ['mirror (sweep)', { mirror: E.clamp((u % 4) / 3) }], ['mirror 1', { mirror: 1 }],
        ['glow 1', { glow: 1 }], ['door open', { doorOpen: 1, glow: 0.3 }], ['seed 2', { seed: 2 }],
      ];
      st.forEach(([name, o], i) => {
        const cx = 190 + (i % 3) * 350, cy = 330 + Math.floor(i / 3) * 560;
        PR.personalWorld(L, cx, cy, 150, { t: u, life: 1, ...o });
        label(L, name, cx, cy + 200);
      });
    },

    // ---------------------------------------------------------------- 7: ground (spring), full size
    (L, u) => groundSheet(L, u, 'spring'),
    // ---------------------------------------------------------------- 8: arch gate (closed → open) + small
    (L, u) => {
      E.skyWash(L.paint, E.shade(E.P.cerulean, 0.6), E.shade(E.P.ochre, 0.7), { mid: E.shade(E.P.skyWash, 0.7), mottle: 0.15 });
      PR.ground(L, 1250, { palette: 'garden', t: u, seed: 3 });
      const op = E.ep(u, 0.5, 3.5);
      PR.archGate(L, 540, 1300, 560, 980, { open: op, t: u });
      PR.archGate(L, 130, 1700, 150, 260, { open: 0, t: u });
      PR.archGate(L, 950, 1700, 150, 260, { open: 1, t: u });
      label(L, 'open ' + op.toFixed(2), 540, 1360);
    },
    // ---------------------------------------------------------------- 9: pond (tones, ripples, reflection callback)
    (L, u) => {
      E.skyWash(L.paint, E.shade(E.P.gold, 0.55), E.shade(E.P.blush, 0.55), { mottle: 0.15 });
      const heart = (L2) => { E.wash(L2.paint, E.blob(540, 330, 60, { seed: 3, irr: 0.1 }), '#E58A9C', { mode: 'over' }); E.glow(L2.light, 540, 330, 140, '#FFB0C0', 0.8); };
      heart(L);
      PR.pond(L, 540, 640, 820, 260, { t: u, tone: 'gold', ripple: 1, rippleX: 540, rippleY: 640, reflect: heart, lineY: 470 });
      PR.tree(L, 200, 480, 300, { kind: 'cypress', t: u });
      PR.pond(L, 300, 1050, 480, 150, { t: u, tone: 'day', reflect: (L2) => PR.tree(L2, 200, 980, 200, { kind: 'round', t: u }), lineY: 980 });
      PR.tree(L, 200, 980, 200, { kind: 'round', t: u });
      E.wash(L.paint, E.rrect(0, 1250, 1080, 670, 0), '#2F3B60', { alpha: 0.9 });
      PR.pond(L, 540, 1520, 760, 220, { t: u, tone: 'night', ripple: 0.6 });
      PR.pond(L, 860, 1050, 260, 80, { t: u, tone: 'day', ripple: 1 });
    },
    // ---------------------------------------------------------------- 10: drop bloom progression
    (L, u) => {
      E.skyWash(L.paint, '#F3EEE4', '#ECE4D6', { mottle: 0.1 });
      [0.12, 0.26, 0.34, 0.45, 0.65, 1].forEach((p, i) => {
        const cx = 190 + (i % 3) * 350, cy = 420 + Math.floor(i / 3) * 560;
        PR.dropBloom(L, cx, cy, 150, { p, seed: 2 });
        label(L, 'p ' + p, cx, cy + 220);
      });
      PR.dropBloom(L, 540, 1640, 220, { p: E.clamp((u % 4) / 3), color: '#9B3B4A', seed: 5 });
    },
    // ---------------------------------------------------------------- 11-13: other ground palettes
    (L, u) => groundSheet(L, u, 'garden'),
    (L, u) => groundSheet(L, u, 'dusk'),
    (L, u) => groundSheet(L, u, 'night'),
    // ---------------------------------------------------------------- 14: big world rotation / options
    (L, u) => {
      E.skyWash(L.paint, E.shade(E.P.lavender, 0.55), E.shade(E.P.ochre, 0.7), { mottle: 0.15 });
      [0.6, 1.6, 3.14, -1.2].forEach((rot, i) => {
        const cx = 280 + (i % 2) * 520, cy = 420 + Math.floor(i / 2) * 600;
        PR.bigWorld(L, cx, cy, 200, { t: u, rot, decor: 1, travellers: 1, gateGlow: 0.5 });
        label(L, 'rot ' + rot, cx, cy + 290);
      });
      PR.bigWorld(L, 540, 1560, 170, { t: u, decor: 1, shadow: 1, aura: 0, alpha: 0.85 });
      label(L, 'shadow 1 · aura 0 · alpha .85', 540, 1860);
    },
  ];

  E.scene('_props_a', {
    draw(L, lt) {
      const i = Math.max(0, Math.min(sheets.length - 1, Math.floor(lt / 10)));
      sheets[i](L, lt - i * 10);
    },
  });
})();
