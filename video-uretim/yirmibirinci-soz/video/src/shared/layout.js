// layout.js — the numbers of /storyboard.json, loaded ONCE, plus the small helpers every team needs.
//
//   const L = await loadLayout(E)       (the world does this; acts use W.layout)
//
// Nothing in the film hand-copies a storyboard number: positions, framings, the camera path, the
// palette, the gloss windows and the shared motion all come from here. The only numbers written in
// this file are the SHARED STATE TIMELINE (storyboard §5 gives it as prose) and the four geometry
// formulas (given as formula strings); both are checked against the JSON at load time, so a
// storyboard revision that moves one of them is reported in the console instead of going unnoticed.
//
// Times: the storyboard writes times rounded to 2 decimals on the 30 fps grid. `L.ft(t)` snaps such
// a time to the exact frame time (4.17 -> 125 / 30); every stepped event of the film uses it.

const SB_URL = '/storyboard.json';

/** Storyboard §5 "State timeline of every shared asset, 0–24 s" (prose in teams.shared_state_timeline). */
const TIMELINE = {
  coat2: 0.07,                                  // hedge + mound second coat, rosettes, buds, cloud c1
  man: { passes: [0.13, 0.20, 0.27], turn: [1.47, 1.53, 1.60], warm: 10.07 },
  specks: { from: 0.27 },
  dusk: { sunset0: 1.27, sunset1: 2.63, dusk1: 4.13, dusk2: 4.27, recede: [10.73, 10.87] },
  mist: { build: [4.50, 4.67], thicken: [7.00, 7.07, 7.17], recede: [10.73, 10.87], thin: 16.47, out: [16.63, 16.73, 16.83] },
  ring: {
    on: [4.83, 4.90, 4.97, 5.03], counts: [4, 4, 3, 3],
    veil: [[7.00, 0.8], [7.07, 0.55], [7.17, 0.35]],   // strength after each thickening pass
    reink: [16.47, 0.7], crumble: [16.57, 16.63, 16.70], specksGone: 16.83,
  },
  sun: {
    disc: 8.77, bare: 9.17, halo: [9.57, 9.67, 9.77],
    settle: [11.90, 11.97, 12.03, 12.10], recede: [16.83, 16.93],
  },
  column: { on: [9.87, 9.97, 10.07] },          // leaves with sun.settle
  mound: { lit: 10.07 },
  film: { acts: 12.20, cover: 23.40, plate: 23.80, end2d: 24.00 },
};

const num = (s) => (String(s).match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);

/** Compile "y = 1135 + 18 * sin(x / 310 + 1.2)" style storyboard formulas (for cross-checks only). */
function compileFormula(str) {
  try {
    const rhs = String(str).split('=')[1].split(',')[0].replace(/\^/g, '**');
    // eslint-disable-next-line no-new-func
    return new Function('x', `const {sin, cos, PI} = Math; return ${rhs};`);
  } catch { return null; }
}

function crossCheck(sb, L, warn) {
  // 1. geometry formulas
  const probes = [-200, 0, 137, 270, 540, 733, 810, 1300];
  const pairs = [
    ['layout.ground.lip_formula', sb.layout.ground.lip_formula, L.lip, probes],
    ['layout.horizon.crest_formula', sb.layout.horizon.crest_formula, L.crest, probes],
    ['layout.sun_arc.formula', sb.layout.sun_arc.formula, L.arc.y, probes],
    ['layout.ground.mound.profile', sb.layout.ground.mound.profile, L.mound.top, [280, 400, 540, 700, 800]],
  ];
  for (const [name, str, fn, xs] of pairs) {
    const f = compileFormula(str);
    if (!f) { warn(`cannot read formula ${name}: "${str}"`); continue; }
    for (const x of xs) {
      if (Math.abs(f(x) - fn(x)) > 0.01) { warn(`${name} changed ("${str}") — update layout.js`); break; }
    }
  }
  // 2. every time of the shared timeline must still be written in the storyboard's prose timeline
  const prose = sb.teams.shared_state_timeline.map((e) => e.timeline).join(' | ');
  const have = new Set(num(prose).map((v) => v.toFixed(2)));
  const T = TIMELINE;
  const want = [
    T.coat2, ...T.man.turn, T.man.warm, T.specks.from,
    ...Object.values(T.dusk).flat(), ...Object.values(T.mist).flat(),
    ...T.ring.on, ...T.ring.veil.map((v) => v[0]), T.ring.reink[0], ...T.ring.crumble,
    T.sun.disc, T.sun.bare, ...T.sun.halo, ...T.sun.settle, ...T.sun.recede, ...T.column.on, T.mound.lit,
  ];
  for (const v of want) if (!have.has(v.toFixed(2))) warn(`timeline time ${v} is not in storyboard.teams.shared_state_timeline any more`);
  const opens = sb.layout.flowers.lip.map((f) => f.opens.toFixed(2));
  for (const v of opens) if (!have.has(v)) warn(`flower opening time ${v} differs between layout.flowers and the shared timeline`);
  // 3. shared motion constants
  const m = sb.shared_motion;
  const expect = (name, str, vals) => {
    const got = num(str).map(Math.abs);   // "4-9 px" and "+-0.6 %" read as negatives
    for (const v of vals) if (!got.includes(v)) warn(`shared_motion.${name} changed ("${str}") — update layout.js`);
  };
  expect('camera_drift', m.camera_drift, [7, 4, 6, 0.002]);
  expect('breathing', m.breathing, [3, 3.4, 0.6]);
  expect('halo_breath', m.halo_breath, [0.03, 4.0]);
  expect('far_light_breath', m.far_light_breath, [0.02, 17.07, 3.0]);
  expect('flower_sway', m.flower_sway, [0.06, 1.1, 1.7, 3, 0.9]);
  expect('mist', m.mist, [4]);
  expect('specks', m.specks, [12, 4, 9, 1.2, 0.8, 1150, 1190]);
}

/**
 * Pure builder (no fetch): storyboard object -> layout. `E` supplies ease / cameraPath / driftCamera.
 */
export function buildLayout(sb, E, { warn = (m) => console.warn('[layout] ' + m) } = {}) {
  const fps = sb.fps;
  const fr = (t) => Math.round(t * fps + 1e-9);
  const ft = (t) => fr(t) / fps;
  const lay = sb.layout;
  const W = lay.frame.w, H = lay.frame.h;
  const TAU = Math.PI * 2;

  // ---------------------------------------------------------------- geometry
  const g = lay.ground, md = g.mound, hz = lay.horizon, arc = lay.sun_arc;
  const lip = (x) => g.lip_y + 7 * Math.sin((x - 540) / 230);
  const crest = (x) => hz.far_ridge_crest_y + 18 * Math.sin(x / 310 + 1.2) + 8 * Math.sin(x / 97);
  const arcY = (x) => arc.apex[1] + (arc.left_foot[1] - arc.apex[1]) * ((x - arc.apex[0]) / (arc.apex[0] - arc.left_foot[0])) ** 2;
  const moundHalf = (md.x1 - md.x0) / 2, moundMid = (md.x0 + md.x1) / 2;
  const moundTop = (x) => g.lip_y - (g.lip_y - md.top_y) * (1 - ((x - moundMid) / moundHalf) ** 4);

  // ---------------------------------------------------------------- framings and camera
  const cameras = {};
  for (const [name, c] of Object.entries(sb.cameras)) cameras[name] = { x: c.cx, y: c.cy, zoom: c.zoom, rot: 0, name, use: c.use };
  const inThenLinear = (a) => { const k = 1 - a / 2; return (u) => (u < a ? (u * u) / (2 * a) / k : (u - a / 2) / k); };
  const easeOf = (name, dt) => {
    if (!name || name === 'start' || name === 'hold') return E.ease.cubic.inOut;   // identical keys: any ease
    if (name.startsWith('inThenLinear')) return inThenLinear(num(name)[0] / dt);
    const [fam, dir] = name.split('.');
    const f = E.ease[fam]?.[dir];
    if (!f) throw new Error(`layout: unknown camera ease "${name}"`);
    return f;
  };
  const camKeys = [];
  for (const act of ['act1', 'act2']) {
    for (const k of sb.camera_path[act]) {
      const t = ft(k.t), c = cameras[k.framing];
      if (!c) throw new Error(`layout: camera_path names unknown framing "${k.framing}"`);
      if (camKeys.length && Math.abs(camKeys[camKeys.length - 1].t - t) < 1e-9) continue;   // the duplicated hand-off key
      const prev = camKeys[camKeys.length - 1];
      camKeys.push({ t, x: c.x, y: c.y, zoom: c.zoom, framing: k.framing, easeName: k.ease ?? 'start', ease: easeOf(k.ease, prev ? t - prev.t : 1) });
    }
  }
  const camPath = E.cameraPath(camKeys.map(({ t, x, y, zoom, ease }) => ({ t, x, y, zoom, ease })));
  const [dSeed, dAmp, dPeriod, dZoom] = [7, 4, 6, 0.002];           // shared_motion.camera_drift (cross-checked)
  const drift = (cam, t) => E.driftCamera(cam, t, { seed: dSeed, amp: dAmp, period: dPeriod, zoom: dZoom, rot: 0 });
  const cam = (t) => drift(camPath(t), t);

  /**
   * Layer rectangle [x0, y0, x1, y1] (LAYER px of a plane with this parallax) that can ever be on
   * screen: union over every key of the camera path (the path between two keys never leaves the
   * hull of its ends: position is linear and the zoom term convex in the eased progress), grown by
   * the drift amplitude and `margin` px.
   */
  const visibleRect = (parallax, margin = 0, names = null) => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const list = names ? names.map((n) => cameras[n]) : camKeys;
    for (const c of list) {
      const z = Math.exp(Math.log(c.zoom) * parallax);            // the drift only ever zooms IN
      const cx = W / 2 + (c.x - W / 2) * parallax, cy = H / 2 + (c.y - H / 2) * parallax;
      const mx = dAmp * parallax + margin, my = dAmp * 0.7 * parallax + margin;
      x0 = Math.min(x0, cx - W / 2 / z - mx); x1 = Math.max(x1, cx + W / 2 / z + mx);
      y0 = Math.min(y0, cy - H / 2 / z - my); y1 = Math.max(y1, cy + H / 2 / z + my);
    }
    return [Math.floor(x0), Math.floor(y0), Math.ceil(x1), Math.ceil(y1)];
  };

  // ---------------------------------------------------------------- shared motion (pure functions of absolute t)
  const cloud = lay.clouds[0];
  const mistBox = lay.mist_bank.layer_bbox;
  const motion = {
    /** breathing: shoulders dy = 3 sin(2π t / 3.4) px, torso scaleY ±0.6 % */
    breath: (t) => ({ dy: 3 * Math.sin((TAU * t) / 3.4), sy: 1 + 0.006 * Math.sin((TAU * t) / 3.4) }),
    /** halo scale = 1 + 0.03 sin(2π t / 4.0); the disc itself is rigid */
    haloBreath: (t) => 1 + 0.03 * Math.sin((TAU * t) / 4.0),
    /** far light scale = 1 + 0.02 sin(2π (t − 17.07) / 3.0) */
    farLightBreath: (t) => 1 + 0.02 * Math.sin((TAU * (t - 17.07)) / 3.0),
    /** flower i (1..6): rot = 0.06 sin(1.1 t + 1.7 i) rad, dx = 3 sin(0.9 t + 1.7 i) px */
    flowerSway: (i, t) => ({ rot: 0.06 * Math.sin(1.1 * t + 1.7 * i), dx: 3 * Math.sin(0.9 * t + 1.7 * i) }),
    /** cloud c1: layer x = x0 + drift_px_per_s * t */
    cloudX: (t) => cloud.layer_centre_at_t0[0] + cloud.drift_px_per_s * t,
    /** mist: x offset = 4 t px, wrapping inside its bbox */
    mistDx: (t) => { const w = mistBox.x1 - mistBox.x0; return (((4 * t) % w) + w) % w; },
    mistSpeed: 4,
    specks: { count: 12, size: [4, 9], parallax: 1.2, alpha: 0.8, fadeY: [1150, 1190] },
    drift: { seed: dSeed, amp: dAmp, period: dPeriod, zoom: dZoom },
  };

  // ---------------------------------------------------------------- the layout object
  const sun = lay.suns.today, ring = lay.suns.tomorrow_ring;
  const gb = lay.gloss_band;
  const L = {
    sb, fps, W, H, fr, ft,
    T: TIMELINE,
    /** frame-snapped comparison: has the stepped event written as time `tEvent` happened at t? */
    on: (t, tEvent) => t >= ft(tEvent) - 1e-6,
    /** number of entries of a list of event times that have happened at t */
    count: (t, list) => list.reduce((n, v) => n + (t >= ft(v) - 1e-6 ? 1 : 0), 0),

    layout: lay,
    // ground
    lipY: g.lip_y, lip, hedge: { x: g.world_x, bottom: g.fills_to_world_y },
    mound: { x0: md.x0, x1: md.x1, topY: md.top_y, top: moundTop, lit: { x: g.lit_patch_x, y: g.lit_patch_y } },
    crest, ridge: { parallax: hz.parallax, x: hz.layer_x, bottom: hz.layer_filled_down_to_y, crestY: hz.far_ridge_crest_y },
    // figure
    man: lay.man,
    // suns
    sun: { x: sun.centre[0], y: sun.centre[1], r: sun.r, halo: sun.halo_r, annulus: sun.annulus },
    yesterday: lay.suns.yesterday,
    ring: { x: ring.centre[0], y: ring.centre[1], r: ring.r, dashes: ring.dashes, stroke: ring.stroke },
    arc: { y: arcY, leftFoot: arc.left_foot, apex: arc.apex, rightFoot: arc.right_foot, dots: arc.dots.centres, dotR: arc.dots.r },
    // sky
    zones: lay.sky_zones, veil: lay.veil_cloud, cloud, mist: { parallax: lay.mist_bank.parallax, box: mistBox },
    // flowers (i = 1..6 for the shared sway)
    flowers: lay.flowers.lip.map((f, k) => ({ id: f.id, i: k + 1, x: f.centre[0], y: f.centre[1], r: f.r, opens: f.opens })),
    buds: lay.flowers.closed_buds_outside_the_light.map((b) => ({ id: b.id, x: b.centre[0], y: b.centre[1] })),
    // act-2 geography (owned by act 2; here for convenience)
    hours: lay.hours_ring, coin: lay.coin, farLight: lay.far_horizon_light, knoll: lay.knoll,
    lightBeads: lay.light_beads, chest: lay.chest, mosque: lay.mosque, rug: lay.rug, deed: lay.deed,
    // gloss
    gloss: { y0: gb.y0, y1: gb.y1, baseline: gb.baseline_y, calmScreen: gb.calm_field_screen, calmWorld: gb.calm_field_world, windows: gb.windows },
    glossList: gb.windows.map((w) => ({ text: w.text, t: w.t0, end: w.t1 })),
    safe: lay.safe_zones,
    planes: Object.fromEntries(lay.layers_back_to_front.map((l) => [l.layer, l.parallax])),

    // cameras
    cameras, framing: (name) => { const c = cameras[name]; if (!c) throw new Error(`layout: no framing "${name}"`); return { x: c.x, y: c.y, zoom: c.zoom, rot: 0 }; },
    camKeys, camPath, drift, cam, visibleRect, inThenLinear,
    /** world / layer point -> frame px for a camera (or a framing name) */
    toScreen: (c, x, y, parallax = 1) => E.worldToFrame(typeof c === 'string' ? cameras[c] : c, parallax, x, y),
    /** frame px -> world / layer point of a plane */
    toWorld: (c, sx, sy, parallax = 1) => {
      const k = typeof c === 'string' ? cameras[c] : c, z = Math.exp(Math.log(k.zoom) * parallax);
      return [(sx - W / 2) / z + W / 2 + (k.x - W / 2) * parallax, (sy - H / 2) / z + H / 2 + (k.y - H / 2) * parallax];
    },

    // colour
    palette: sb.palette,
    /** palette entry by name: L.pal('hedge_dark') -> '#1F5C3A'; lists with an index: L.pal('dusk', 1) */
    pal: (name, i = null) => {
      const v = sb.palette[name];
      if (v === undefined) throw new Error(`layout: no palette entry "${name}"`);
      return i === null ? v : v[i];
    },
    motion,
  };
  crossCheck(sb, L, warn);
  return L;
}

let cached = null;
/** Fetch /storyboard.json once and build the layout. */
export async function loadLayout(E, url = SB_URL) {
  if (!cached) {
    cached = (async () => {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`layout: cannot load ${url} (${res.status})`);
      return buildLayout(await res.json(), E);
    })();
  }
  return cached;
}
