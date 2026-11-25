/* Shot scheduler + frame renderer. window.E.renderFrame(t) draws the frame at time t (seconds).
   Scenes register with E.scene(id, def):
     def.draw(L, lt, t, shot)   required. L = {paint, ink, light}; lt = seconds since shot start (may exceed
                                shot.dur by shot.tail while the next shot transitions in, and may be called
                                for any lt in that range, in any order — keep it a pure function of time).
     def.overlay(ctx, lt, t)    optional crisp drawing on the overlay canvas (above watercolour; e.g. titles)
     def.wc = [edge, granulation, wobblePx, mottling]   optional watercolour parameters (default [1,1,3,0.55])
     def.raw = true              layer is a photograph (no watercolour)
     def.prepare(lt, t)          optional async: preload images needed for this time
     def.sfx()                   optional: returns [{t (global s), type, gain, dur?}] sound cues */
(function () {
  const E = window.E;
  const W = E.W, H = E.H;
  E.SCENES = {};
  E.scene = (id, def) => { E.SCENES[id] = def; };

  const mk = () => {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    return c;
  };
  const slots = [0, 1].map(() => {
    const paint = mk(), ink = mk(), light = mk();
    return {
      canvases: { paint, ink, light },
      L: { paint: paint.getContext('2d'), ink: ink.getContext('2d'), light: light.getContext('2d') },
    };
  });

  const imgCache = new Map();
  E.loadImage = (src) => {
    if (!imgCache.has(src)) {
      imgCache.set(src, new Promise((res, rej) => {
        const im = new Image();
        im.onload = () => (im.decode ? im.decode().then(() => res(im), () => res(im)) : res(im));
        im.onerror = () => rej(new Error('image failed: ' + src));
        im.src = src;
      }));
    }
    return imgCache.get(src);
  };
  E.imageSync = {}; // src -> HTMLImageElement once loaded (for synchronous draw)

  function clearSlot(s) {
    const { paint, ink, light } = s.L;
    for (const c of [paint, ink, light]) {
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.globalAlpha = 1;
      c.globalCompositeOperation = 'source-over';
      c.filter = 'none';
    }
    paint.fillStyle = '#ffffff';
    paint.fillRect(0, 0, W, H);
    ink.clearRect(0, 0, W, H);
    light.clearRect(0, 0, W, H);
  }

  function renderShot(shot, slotIdx, t) {
    const s = slots[slotIdx];
    clearSlot(s);
    const def = E.SCENES[shot.id];
    const lt = t - shot.start;
    if (def && def.draw) {
      for (const c of Object.values(s.L)) c.save();
      def.draw(s.L, lt, t, shot);
      for (const c of Object.values(s.L)) c.restore();
    } else {
      // placeholder for scenes not yet implemented
      const p = s.L.paint;
      p.fillStyle = '#E9E4F0'; p.fillRect(0, 0, W, H);
      p.fillStyle = '#555'; p.font = '600 64px "EB Garamond"'; p.textAlign = 'center';
      p.fillText(shot.id + '  ' + lt.toFixed(2), W / 2, H / 2);
    }
    post.upload(slotIdx, s.canvases);
    return def || {};
  }

  const zoomXf = (cx, cy, s) => {
    const k = 1 / s;
    return [k, 0, 0, 0, k, 0, cx * (1 - k), cy * (1 - k), 1];
  };

  let post, overlay, octx;
  E.init = async () => {
    const gl = document.getElementById('gl');
    gl.width = W; gl.height = H;
    post = new E.Post(gl);
    overlay = document.getElementById('ov');
    overlay.width = W; overlay.height = H;
    octx = overlay.getContext('2d');
    await document.fonts.ready;
    // make sure every face is actually loaded (canvas text does not trigger loading reliably)
    const faces = ['600 italic 40px "Cormorant Garamond"', '500 italic 40px "Cormorant Garamond"', '600 40px "Cormorant Garamond"',
      '600 40px "EB Garamond"', '500 40px "EB Garamond"', '500 italic 40px "EB Garamond"', '400 40px "EB Garamond"',
      '600 40px "Caveat"', '500 40px "Caveat"', '400 40px "Amiri Quran"', '400 40px "Amiri"', '700 40px "Amiri"', '400 40px "Kalam"', '400 40px "Scheherazade New"', '700 40px "Scheherazade New"'];
    await Promise.all(faces.map((f) => document.fonts.load(f, 'AaŞşĞğİıÇçÖöÜüâ نَسُوا')));
    E.readyFlag = true;
    return true;
  };

  E.shotAt = (t) => {
    let i = E.SHOTS.length - 1;
    for (let k = 0; k < E.SHOTS.length; k++) if (t < E.SHOTS[k].end) { i = k; break; }
    return i;
  };

  E.renderFrame = async (t) => {
    const i = E.shotAt(t);
    const cur = E.SHOTS[i];
    let prev = null, mix = 0;
    const tr = cur.trans;
    if (i > 0 && tr && tr.type !== 'cut' && t < cur.start + tr.dur) {
      prev = E.SHOTS[i - 1];
      mix = E.clamp((t - cur.start) / tr.dur);
    }
    const shots = prev ? [prev, cur] : [cur];
    for (const s of shots) {
      const d = E.SCENES[s.id];
      if (d && d.prepare) await d.prepare(t - s.start, t);
    }
    let o = { time: t, grade: [0.16, 0.35, 1.0, 0] };
    if (prev) {
      const dA = renderShot(prev, 0, t);
      const dB = renderShot(cur, 1, t);
      const types = { fade: 1, bleed: 2, zoom: 3 };
      o.type = types[tr.type] || 1;
      o.mix = mix;
      o.center = [tr.cx ?? W / 2, tr.cy ?? H / 2];
      if (tr.type === 'zoom') {
        const cx = (tr.cx ?? W / 2) / W, cy = (tr.cy ?? H / 2) / H;
        const e = E.ease.inOutCubic(mix);
        o.xfA = zoomXf(cx, cy, 1 + 2.4 * e);
        o.xfB = zoomXf(cx, cy, 0.8 + 0.2 * E.ease.outCubic(mix));
      }
      o.wcA = dA.wc || [1, 1, 3, 0.55];
      o.wcB = dB.wc || [1, 1, 3, 0.55];
      o.raw = [dA.raw ? 1 : 0, dB.raw ? 1 : 0];
      o.grade = E.lerp ? [0.16, 0.35, 1.0, 0] : o.grade;
    } else {
      const d = renderShot(cur, 0, t);
      o.type = 0;
      o.wcA = d.wc || [1, 1, 3, 0.55];
      o.raw = [d.raw ? 1 : 0, 0];
    }
    post.draw(o);
    // overlay: scene overlays, then glosses
    octx.setTransform(1, 0, 0, 1, 0, 0);
    octx.clearRect(0, 0, W, H);
    for (const s of shots) {
      const d = E.SCENES[s.id];
      if (d && d.overlay) {
        octx.save();
        if (prev && s === prev) octx.globalAlpha = 1 - mix;
        if (prev && s === cur) octx.globalAlpha = mix;
        d.overlay(octx, t - s.start, t);
        octx.restore();
      }
    }
    E.drawGlosses(octx, t);
    return true;
  };

  E.collectSfx = () => {
    const cues = [];
    for (const shot of E.SHOTS) {
      const d = E.SCENES[shot.id];
      if (d && d.sfx) for (const c of d.sfx(shot)) cues.push({ ...c, shot: shot.id });
    }
    return cues.sort((a, b) => a.t - b.t);
  };
})();
