"""Render one shot's background plate (1080x1920) from a stock clip with smooth
sub-pixel Ken Burns motion, speed control and optional flip."""
import subprocess, json, sys, math
import numpy as np, cv2
from common import *


def probe(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries',
                          'stream=width,height,r_frame_rate,nb_frames,duration', '-of', 'json', path],
                         capture_output=True, text=True).stdout
    s = json.loads(out)['streams'][0]
    n, d = s['r_frame_rate'].split('/')
    fps = float(n) / float(d)
    dur = float(s.get('duration', 0) or 0)
    return int(s['width']), int(s['height']), fps, dur


class Reader:
    def __init__(self, path, t0, w, h):
        self.w, self.h = w, h
        self.p = subprocess.Popen(['ffmpeg', '-v', 'quiet', '-ss', f'{max(t0,0):.3f}', '-i', path,
                                   '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
                                  stdout=subprocess.PIPE, bufsize=w * h * 3 * 2)
        self.idx = -1
        self.cur = None
        self.prev = None

    def get(self, i):
        while self.idx < i:
            buf = self.p.stdout.read(self.w * self.h * 3)
            if len(buf) < self.w * self.h * 3:
                return self.cur  # hold last frame at clip end
            self.prev = self.cur
            self.cur = np.frombuffer(buf, np.uint8).reshape(self.h, self.w, 3)
            self.idx += 1
        return self.cur

    def close(self):
        try:
            self.p.stdout.close(); self.p.kill()
        except Exception:
            pass


def render_shot(spec, out_path):
    """spec: src, t_in (src seconds), dur (output seconds), speed, cx (0..1), cy (0..1),
    z0, z1 (zoom; 1 = crop just fits height), dx, dy (pan over the shot, in output px),
    rot0, rot1 (degrees), flip, ease, sharpen."""
    src = spec['src']
    sw, sh, sfps, sdur = probe(src)
    dur = spec['dur']
    speed = spec.get('speed', 1.0)
    nout = int(round(dur * FPS))
    rd = Reader(src, spec.get('t_in', 0), sw, sh)
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24',
                            '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-c:v', 'libx264',
                            '-preset', 'fast', '-crf', '11', '-pix_fmt', 'yuv444p', out_path],
                           stdin=subprocess.PIPE)
    vertical_src = sh > sw
    # base scale: output height covers the source crop height
    cx, cy = spec.get('cx', 0.5), spec.get('cy', 0.5)
    z0, z1 = spec.get('z0', 1.0), spec.get('z1', 1.08)
    dx, dy = spec.get('dx', 0.0), spec.get('dy', 0.0)
    r0, r1 = spec.get('rot0', 0.0), spec.get('rot1', 0.0)
    ease = spec.get('ease', 'inout')
    sharpen = spec.get('sharpen', 0.6 if sh < 1000 else 0.15)
    flip = spec.get('flip', False)
    for n in range(nout):
        t = n / FPS
        u = n / max(nout - 1, 1)
        e = ease_in_out_sine(u) if ease == 'inout' else (u if ease == 'lin' else ease_out_cubic(u))
        st = t * speed
        fi = st * sfps
        i0 = int(math.floor(fi))
        frame = rd.get(i0)
        if frame is None:
            break
        # blend for slow motion to avoid judder
        if speed < 0.75 and rd.prev is not None:
            fr = fi - i0
            nxt = rd.get(i0 + 1)
            if nxt is not None and nxt is not frame:
                frame = cv2.addWeighted(frame, 1 - fr, nxt, fr, 0)
        img = frame[:, ::-1] if flip else frame
        z = mix(z0, z1, e)
        # scale so that the source height maps to H*z (or width maps to W*z if src is narrow)
        s = max(H / sh, W / sw) * z
        # centre point in source px
        px = cx * sw
        py = cy * sh
        # pan in output px converted to source px
        px += mix(-dx / 2, dx / 2, e) / s
        py += mix(-dy / 2, dy / 2, e) / s
        # clamp so the window stays inside the source
        half_w = W / 2 / s
        half_h = H / 2 / s
        px = clamp(px, half_w, sw - half_w)
        py = clamp(py, half_h, sh - half_h)
        ang = mix(r0, r1, e)
        M = cv2.getRotationMatrix2D((px, py), ang, s)
        M[0, 2] += W / 2 - px
        M[1, 2] += H / 2 - py
        out = cv2.warpAffine(img, M, (W, H), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REFLECT)
        if sharpen > 0:
            bl = cv2.GaussianBlur(out, (0, 0), 1.6)
            out = cv2.addWeighted(out, 1 + sharpen, bl, -sharpen, 0)
        enc.stdin.write(np.ascontiguousarray(out).tobytes())
    rd.close()
    enc.stdin.close(); enc.wait()
    return nout


if __name__ == '__main__':
    spec = json.loads(sys.argv[1])
    render_shot(spec, sys.argv[2])
