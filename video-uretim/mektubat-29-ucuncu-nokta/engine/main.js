import { W, H, TEX, FRAME } from './core.js';
import { Post } from './post.js';
const q = new URLSearchParams(location.search);
const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
async function boot() {
  const [bristle, dabs, paper, noise] = await Promise.all(['tex/bristle.png', 'tex/dabs.png', 'tex/paper.png', 'tex/noise.png'].map(loadImg));
  TEX.bristle = bristle; TEX.dabs = dabs; TEX.paper = paper;
  // fonts
  const fams = ['500 40px "Cormorant Garamond"', 'italic 500 40px "Cormorant Garamond"', 'italic 600 40px "Cormorant Garamond"', '600 40px "Cormorant Garamond"', '400 40px Amiri', '700 40px Amiri', '500 40px "EB Garamond"', 'italic 500 40px "EB Garamond"', '400 40px Marcellus', '500 40px "Cormorant SC"', '600 40px "Cormorant SC"'];
  await Promise.all(fams.map((f) => document.fonts.load(f, 'AaĞğŞşİıÂâÎîÛû اَلْحَمْدُ')));
  const tl = await import(q.get('tl') || './timeline.js');
  const scene = document.getElementById('scene'), overlay = document.getElementById('overlay');
  const ctx = scene.getContext('2d'), octx = overlay.getContext('2d');
  const post = new Post(document.getElementById('gl'), scene, overlay, { noise, paper });
  if (tl.init) await tl.init();
  const render = async (t) => {
    FRAME.t = t;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#EAE0CA'; ctx.fillRect(0, 0, W, H);
    await tl.draw(ctx, t);
    octx.setTransform(1, 0, 0, 1, 0, 0); octx.clearRect(0, 0, W, H);
    tl.drawOverlay && tl.drawOverlay(octx, t);
    post.render(tl.postParams ? tl.postParams(t) : {});
  };
  window.ENGINE = {
    duration: tl.DURATION, fps: 30,
    render,
    async frameToServer(i, url) {
      await render(i / 30);
      const px = post.read();
      const r = await fetch(url, { method: 'POST', body: px });
      if (!r.ok) throw new Error('post failed');
    },
    async framePNG(t) {
      await render(t);
      const px = post.read();
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const g = c.getContext('2d'); g.putImageData(new ImageData(new Uint8ClampedArray(px.buffer), W, H), 0, 0);
      return c.toDataURL('image/png');
    },
    async rawScenePNG(t) { await render(t); return scene.toDataURL('image/png'); },
  };
  window.ENGINE_READY = true;
}
boot().catch((e) => { window.ENGINE_ERROR = String(e && e.stack || e); console.error(e); });
