# Lead's patch: camera-only motion blur ("shutter") for the fast camera moves, in src/scenes/main.js.
# Needs the world's W.camShift hook. Run once:  python3 /home/user/work/tools/apply_shutter.py
p='/home/user/work/video/src/scenes/main.js'
s=open(p).read()
assert 'SHUTTER' not in s, 'already applied'
old="export default {\n  id: 'main',"
assert s.count(old)==1
s=s.replace(old,"""// THE CAMERA'S SHUTTER (lead, after the second film review): the five fast camera glides travel up to 57 px per
// frame over a texture of very high micro-contrast; drawn without any shutter they strobe. While the camera is
// fast, the frame is the average of several sub-samples in which ONLY THE CAMERA is displaced inside a
// 180-degree shutter (world.js: W.camShift) — world states, poses, stepped events and every slot stay at the
// frame's own time, and the glosses / wall grain are added after the average. A slow camera (pushes, drift,
// holds) gives one sample: those frames are untouched.
const SHUTTER = 0.5;        // fraction of the frame interval the shutter is open
const BLUR_STEP = 2.5;      // one sub-sample per this many frame px of camera travel during the exposure
const BLUR_MIN_PX = 3.0;    // below this travel: no blur at all
const BLUR_MAX = 16;

/** Sub-samples needed at time t: the largest travel of four frame corners' world points during the exposure. */
function shutterSamples(W, t) {
  if (!('camShift' in W)) return 1;
  const h = (SHUTTER / FPS) / 2, pts = [[150, 300], [930, 300], [150, 1100], [930, 1100]];
  let d = 0;
  for (const [x, y] of pts) {
    W.camShift = -h; const a = W.toScreen(x, y, t);
    W.camShift = +h; const b = W.toScreen(x, y, t);
    d = Math.max(d, Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  W.camShift = 0;
  return d < BLUR_MIN_PX ? 1 : Math.min(BLUR_MAX, Math.max(2, Math.ceil(d / BLUR_STEP)));
}

export default {
  id: 'main',""")
old="""    W.draw(ctx, t, { pose: mod.pose ? mod.pose(t, W) : null, slots: part.slots });
    E.finish(ctx);
"""
assert s.count(old)==1
s=s.replace(old,"""    const pose = mod.pose ? mod.pose(t, W) : null, n = shutterSamples(W, t);
    if (n <= 1) {
      W.draw(ctx, t, { pose, slots: part.slots });
    } else {
      const acc = E.scratch(1080, 1920, 'main:shutter');      // frame-sized, drawn 1:1
      for (let k = 0; k < n; k++) {
        W.camShift = ((k + 0.5) / n - 0.5) * (SHUTTER / FPS);
        acc.ctx.save();
        W.draw(acc.ctx, t, { pose, slots: part.slots });
        acc.ctx.restore();
        ctx.save();
        ctx.globalAlpha = 1 / (k + 1);                                      // running average
        E.blit(ctx, acc, 0, 0);
        ctx.restore();
      }
      W.camShift = 0;
    }
    E.finish(ctx);
""")
open(p,'w').write(s)
print('shutter applied')
