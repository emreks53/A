// Deterministic frame renderer. Loads one scene module and renders frames on demand for tools/render.mjs.
// URL params: scene=<id> (from data/timeline.json), w, h (output size, default 1080x1920), scale (internal 3D render scale, default 1)
import * as THREE from 'three';
import { makeComposer, DEFAULT_POST } from './post.js';
import { UI } from './ui.js';
import * as U from './lib/util.js';
import * as TEX from './lib/textures.js';
import * as ENV from './lib/env.js';
import * as MODELS from './lib/models.js';
import * as FX from './lib/fx.js';

const P = new URLSearchParams(location.search);
const W = +(P.get('w') || 1080), H = +(P.get('h') || 1920);
const SCALE = +(P.get('scale') || 1);
const RW = Math.round(W * SCALE), RH = Math.round(H * SCALE);
const SCENE_ID = P.get('scene');

const norm = s => s.toLocaleLowerCase('tr-TR').normalize('NFC').replace(/[^\p{L}\p{N}]/gu, '').replace(/â/g, 'a').replace(/î/g, 'i').replace(/û/g, 'u');

function deepMerge(a, b) { for (const k in b) { if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object') deepMerge(a[k], b[k]); else a[k] = b[k]; } return a; }

async function main() {
  const [timeline, words] = await Promise.all([fetch('data/timeline.json').then(r => r.json()), fetch('data/words.json').then(r => r.json())]);
  const info = timeline.scenes.find(s => s.id === SCENE_ID);
  if (!info) throw new Error('unknown scene ' + SCENE_ID);
  await document.fonts.ready;
  await Promise.all(['900 40px Nunito', '800 40px Nunito', '600 40px Nunito', 'italic 500 40px Lora', '600 40px Lora', '700 40px "Playfair Display"', '900 40px "Playfair Display"', '700 40px Cinzel', '400 40px Amiri', '800 40px "Baloo 2"'].map(f => document.fonts.load(f, 'ÇĞİÖŞÜçğıöşüâ')));

  const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1); renderer.setSize(RW, RH, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.style.width = W + 'px'; renderer.domElement.style.height = H + 'px';
  document.body.appendChild(renderer.domElement);

  const overlay = document.createElement('canvas'); overlay.width = W; overlay.height = H; document.body.appendChild(overlay);
  const out = document.createElement('canvas'); out.width = W; out.height = H; const outX = out.getContext('2d'); outX.imageSmoothingEnabled = true; outX.imageSmoothingQuality = 'high';

  FX.PX.scale = SCALE / 0.5; // particle sprites were tuned on 0.5-scale previews
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, W / H, 0.1, 1000);
  camera.layers.enable(1);
  const ui = new UI(overlay, W, H); ui.camera = camera;
  const pp = makeComposer(renderer, scene, camera, RW, RH, { msaa: +(P.get('msaa') ?? 0), smaa: P.get('smaa') !== '0' });
  const post = DEFAULT_POST();

  // depth pre-pass for DOF
  const depthRT = new THREE.WebGLRenderTarget(RW >> 1, RH >> 1, { type: THREE.UnsignedByteType });
  const depthMat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });

  const sceneWords = words.filter(w => w.s >= info.start - 1.0 && w.s <= info.end + 1.0).map(w => ({ ...w, ls: w.s - info.start, le: w.e - info.start }));
  const ctx = {
    THREE, renderer, scene, camera, W, H, ui, post, U, TEX, ENV, MODELS, FX,
    info, start: info.start, end: info.end, dur: info.end - info.start,
    words: sceneWords,
    // local time (seconds from scene start) of the n-th word in this scene's window whose text starts with `text`
    wordTime(text, n = 0) { const k = norm(text); const m = sceneWords.filter(w => norm(w.w).startsWith(k)); if (!m[n]) { console.warn('wordTime: not found', text, n); return 0; } return m[n].ls; },
    wordEnd(text, n = 0) { const k = norm(text); const m = sceneWords.filter(w => norm(w.w).startsWith(k)); if (!m[n]) { console.warn('wordEnd: not found', text, n); return 0; } return m[n].le; },
    rng: U.rng,
    loadHDR: (name, o) => ENV.loadHDR(renderer, name, o),
    setPost(o) { deepMerge(post, o); },
    t: 0,
  };
  window.CTX = ctx;

  const mod = await import(`../scenes/${info.file}?v=${Date.now()}`);
  const S = mod.default;
  if (S.post) deepMerge(post, typeof S.post === 'function' ? S.post(ctx) : S.post);
  const t0 = performance.now();
  await S.setup(ctx);
  const setupMs = performance.now() - t0;
  renderer.compile(scene, camera);

  const pmap = { aces: THREE.ACESFilmicToneMapping, agx: THREE.AgXToneMapping, neutral: THREE.NeutralToneMapping };
  let frameNo = 0;
  const FPS = +(P.get('fps') || 30);
  const acc = document.createElement('canvas'); acc.width = W; acc.height = H; const accX = acc.getContext('2d'); accX.imageSmoothingEnabled = true; accX.imageSmoothingQuality = 'high';
  function renderFrame(t, compose = true, seed = null) {
    ctx.t = t; ui.clear();
    scene.traverse(o => { if (o.userData.uniforms && o.userData.uniforms.time) o.userData.uniforms.time.value = t; if (o.userData.update) o.userData.update(t, ctx); });
    S.update(t, ctx);
    camera.updateMatrixWorld();
    scene.traverse(o => { if (o.userData.yBillboard) { const wp = new THREE.Vector3(); o.getWorldPosition(wp); const a = Math.atan2(camera.position.x - wp.x, camera.position.z - wp.z); const pq = new THREE.Quaternion(); if (o.parent) o.parent.getWorldQuaternion(pq); o.quaternion.copy(pq.invert().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), a))); } });
    // apply post settings (scene may change ctx.post every frame)
    renderer.toneMapping = pmap[post.toneMapping] ?? THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = post.exposure;
    pp.bloom.enabled = post.bloom.enabled; pp.bloom.strength = post.bloom.strength; pp.bloom.radius = post.bloom.radius; pp.bloom.threshold = post.bloom.threshold;
    pp.gtao.enabled = !!post.ao.enabled;
    pp.finish.p = post; pp.finish.u.seed.value = seed ?? ((frameNo++ % 97) * 1.37 + t);
    if (post.dof.enabled && !post.dof.tiltShift) {
      const hidden = []; scene.traverse(o => { if (o.visible && (o.userData.noDepth || o.isPoints || o.isSprite || (o.material && o.material.transparent && !o.userData.depthOk))) { o.visible = false; hidden.push(o); } });
      const bg = scene.background; scene.background = null; scene.overrideMaterial = depthMat;
      renderer.setRenderTarget(depthRT); renderer.setClearColor(0xffffff, 1); renderer.clear(); renderer.render(scene, camera);
      scene.overrideMaterial = null; scene.background = bg; hidden.forEach(o => (o.visible = true)); renderer.setRenderTarget(null); renderer.setClearColor(0x000000, 1);
      pp.finish.u.tDepth.value = depthRT.texture; pp.finish.u.cNear.value = camera.near; pp.finish.u.cFar.value = camera.far;
    }
    pp.composer.render();
    if (!compose) return;
    outX.drawImage(renderer.domElement, 0, 0, W, H);
    outX.drawImage(overlay, 0, 0);
  }
  // Motion blur: post.motionBlur = { samples: 2..5, shutter: 0.5 } (fraction of a frame). Sub-frames are averaged;
  // the overlay (typography) comes from the sub-frame closest to t, so text stays crisp.
  function renderBlurred(t) {
    ctx.t = t; S.update(t, ctx); // let the scene set post.motionBlur for THIS frame before sampling
    const mb = post.motionBlur; const n = Math.max(1, Math.round((mb && mb.samples) || 1));
    if (n <= 1) { renderFrame(t); return; }
    const sh = (mb.shutter ?? 0.5) / FPS; const seed = (frameNo++ % 97) * 1.37 + t;
    const ts = []; for (let i = 0; i < n; i++) ts.push(t - sh / 2 + sh * (i + 0.5) / n);
    ts.sort((a, b) => Math.abs(b - t) - Math.abs(a - t));
    ts.forEach((ti, k) => { renderFrame(ti, false, seed); accX.globalAlpha = 1 / (k + 1); accX.drawImage(renderer.domElement, 0, 0, W, H); });
    accX.globalAlpha = 1; outX.drawImage(acc, 0, 0); outX.drawImage(overlay, 0, 0);
  }
  async function grab(t, quality = 0.92) {
    renderBlurred(t);
    const blob = await new Promise(res => out.toBlob(res, 'image/jpeg', quality));
    const u = new Uint8Array(await blob.arrayBuffer()); let s = ''; for (let i = 0; i < u.length; i += 32768) s += String.fromCharCode.apply(null, u.subarray(i, i + 32768));
    return btoa(s);
  }
  let tris = 0; scene.traverse(o => { if (o.isMesh && o.geometry) { const g = o.geometry; const n = (g.index ? g.index.count : g.attributes.position.count) / 3; tris += o.isInstancedMesh ? n * o.count : n; } });
  window.ENGINE = { ready: true, info, grab, renderFrame, setupMs, stats: () => ({ tris: Math.round(tris), calls: renderer.info.render.calls, textures: renderer.info.memory.textures, geometries: renderer.info.memory.geometries }) };
}
main().catch(e => { console.error('ENGINE ERROR', e && e.stack || e); window.ENGINE = { error: String(e && e.stack || e) }; });
