"""Frame compositor: plates -> per-shot look -> transitions -> post (bloom,
vignette, grain) -> background ops -> motion graphics -> gloss subtitles."""
import json, sys, os, subprocess, math, time
import numpy as np, cv2, skia
from common import *
from grade import Grader
from gloss import GlossTrack
from transitions import TRANSITIONS
import scenes_gfx


class PlateReader:
    def __init__(self, path):
        self.path = path
        self.p = None
        self.idx = -1
        self.cur = None

    def _open(self, i):
        self.close()
        t = i / FPS
        self.p = subprocess.Popen(['ffmpeg', '-v', 'quiet', '-ss', f'{t:.4f}', '-i', self.path,
                                   '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
                                  stdout=subprocess.PIPE, bufsize=W * H * 3 * 2)
        self.idx = i - 1

    def get(self, i):
        i = max(i, 0)
        if self.p is None or i < self.idx or i > self.idx + 45:
            self._open(i)
        while self.idx < i:
            buf = self.p.stdout.read(W * H * 3)
            if len(buf) < W * H * 3:
                self.idx = i
                break
            self.cur = np.frombuffer(buf, np.uint8).reshape(H, W, 3)
            self.idx += 1
        return self.cur

    def close(self):
        if self.p is not None:
            try:
                self.p.stdout.close(); self.p.kill(); self.p.wait()
            except Exception:
                pass
        self.p = None


class Compositor:
    def __init__(self, tl):
        self.tl = tl
        self.shots = tl['shots']
        for k, s in enumerate(self.shots):
            d_in = s.get('trans', {}).get('dur', 0) if k > 0 else 0
            d_out = self.shots[k + 1].get('trans', {}).get('dur', 0) if k + 1 < len(self.shots) else 0
            s['_pre'] = d_in / 2
            s['_post'] = d_out / 2
            s['_t0'] = s['start'] - s['_pre']
        self.grader = Grader()
        self.gloss = GlossTrack(tl['glosses'], end_time=tl.get('gloss_end'))
        self.readers = {}
        self.ctx = dict(tl=tl, env=np.load(tl['env']) if tl.get('env') else None)

    def plate(self, k, T):
        s = self.shots[k]
        r = self.readers.get(k)
        if r is None:
            r = self.readers[k] = PlateReader(s['plate'])
        fi = int(round((T - s['_t0']) * FPS))
        img = r.get(fi)
        if img is None:
            img = np.zeros((H, W, 3), np.uint8)
        return self.grader.look(img, s.get('look', {}))

    def shot_at(self, T):
        k = 0
        for i, s in enumerate(self.shots):
            if s['start'] <= T:
                k = i
        return k

    def background(self, T):
        k = self.shot_at(T)
        s = self.shots[k]
        img = None
        if k + 1 < len(self.shots):
            n = self.shots[k + 1]
            d = n.get('trans', {}).get('dur', 0)
            # (only reached if T < n.start)
        if k > 0:
            d = s.get('trans', {}).get('dur', 0)
            if d > 0 and T < s['start'] + d / 2:
                u = (T - (s['start'] - d / 2)) / d
                a = self.plate(k - 1, T)
                b = self.plate(k, T)
                img = TRANSITIONS[s['trans']['type']](a, b, clamp(u), s['trans'])
        if img is None and k + 1 < len(self.shots):
            n = self.shots[k + 1]
            d = n.get('trans', {}).get('dur', 0)
            if d > 0 and T >= n['start'] - d / 2:
                u = (T - (n['start'] - d / 2)) / d
                a = self.plate(k, T)
                b = self.plate(k + 1, T)
                img = TRANSITIONS[n['trans']['type']](a, b, clamp(u), n['trans'])
        if img is None:
            img = self.plate(k, T)
        # release readers of finished shots
        for j in list(self.readers):
            if j < k - 1:
                self.readers.pop(j).close()
        return img

    def adaptive_scrim(self, img, T):
        # darken the subtitle band a little more when the footage is bright there (no box)
        if not self.gloss.active(T):
            return img
        band = img[1150:1460:6, 60:1020:6].astype(np.float32)
        lum = (band[..., 0] * 0.2126 + band[..., 1] * 0.7152 + band[..., 2] * 0.0722).mean() / 255
        k = clamp((lum - 0.38) / 0.4) * 0.34
        if k <= 0.01:
            return img
        if not hasattr(self, '_band'):
            yy = np.arange(H, dtype=np.float32)
            self._band = np.exp(-((yy - 1290) / 190) ** 2)[:, None, None]
        f = img.astype(np.float32) * (1 - k * self._band)
        return f.astype(np.uint8)

    def frame(self, f):
        T = f / FPS
        img = self.background(T)
        img = scenes_gfx.bg_ops(img, T, self.tl['gfx'], self.ctx)
        img = self.grader.post(img, f)
        img = self.adaptive_scrim(img, T)
        arr = np.dstack([img, np.full((H, W), 255, np.uint8)])
        arr = np.ascontiguousarray(arr)
        surf = skia.Surface(arr)
        c = surf.getCanvas()
        scenes_gfx.draw(c, T, self.tl['gfx'], self.ctx)
        self.gloss.draw(c, T)
        scenes_gfx.draw_top(c, T, self.tl['gfx'], self.ctx)
        out = arr[..., :3]
        # global fades
        fi = self.tl.get('fade_in', 0.0)
        if T < fi:
            out = (out.astype(np.float32) * ease_in_out_sine(T / fi)).astype(np.uint8)
        fo0 = self.tl.get('fade_out_start')
        if fo0 is not None and T > fo0:
            k = 1 - ease_in_out_sine(lin(fo0, self.tl['duration'], T))
            out = (out.astype(np.float32) * k).astype(np.uint8)
        return out


def render_range(tl_path, f0, f1, out_path, crf=14, preset='medium'):
    tl = json.load(open(tl_path))
    comp = Compositor(tl)
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24',
                            '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-c:v', 'libx264',
                            '-preset', preset, '-crf', str(crf), '-pix_fmt', 'yuv420p',
                            '-x264-params', 'aq-mode=3:deblock=-1,-1', out_path],
                           stdin=subprocess.PIPE)
    t0 = time.time()
    for f in range(f0, f1):
        out = comp.frame(f)
        enc.stdin.write(np.ascontiguousarray(out).tobytes())
        if (f - f0) % 60 == 0:
            el = time.time() - t0
            print(f'[{os.path.basename(out_path)}] frame {f} ({f - f0}/{f1 - f0}) {el:.0f}s', flush=True)
    enc.stdin.close(); enc.wait()
    for r in comp.readers.values():
        r.close()


def still(tl_path, T, out_png):
    tl = json.load(open(tl_path))
    comp = Compositor(tl)
    f = int(round(T * FPS))
    out = comp.frame(f)
    cv2.imwrite(out_png, out[:, :, ::-1])


if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'range':
        render_range(sys.argv[2], int(sys.argv[3]), int(sys.argv[4]), sys.argv[5],
                     crf=int(sys.argv[6]) if len(sys.argv) > 6 else 14)
    elif cmd == 'still':
        still(sys.argv[2], float(sys.argv[3]), sys.argv[4])
