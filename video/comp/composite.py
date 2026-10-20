"""Conform, transitions, finishing, overlays and final encode.

    python video/comp/composite.py                         # full film -> $VIDEO_OUT/final/video.mp4
    python video/comp/composite.py --preview               # half-res, fast settings -> $VIDEO_OUT/final/preview.mp4
    python video/comp/composite.py --from 1500 --to 1700   # a range (inclusive); audio is trimmed to match
    python video/comp/composite.py --stills 215,1640       # full pipeline, write PNG stills only
    python video/comp/composite.py --preview --proxy-dir DIR   # use <shot>_animatic.mp4 found in DIR as stand-ins

Inputs: timing/shots.json (cuts), comp/edit.json (transitions, grades, finishing), video/renders/<shot>/
<shot>_<a>_<b>.mp4 (frames a..b inclusive; absolute frame numbers; 10-bit 4:4:4 from farm/render.sh), overlay frames
from comp/overlays.py (rendered on demand), audio $VIDEO_OUT/audio/final_mix.wav (else audio/narration.m4a).
Missing render frames are replaced by a slate (dark gradient + shot id + description) so the pipeline always runs.

Processing per output frame (scene-linear float32 unless noted):
  decode (16-bit) -> per-shot grade trims -> transition mix -> bloom + halation -> vignette -> lateral CA
  -> display encode -> sharpen -> adaptive legibility under key words -> overlay OVER + additive light (screen)
  -> luminance-dependent animated grain (deterministic per frame) -> 8-bit -> x264 (High, yuv420p, BT.709 tags).
"""
import argparse
import glob
import json
import math
import os
import re
import subprocess
import sys
import textwrap
import time

import cv2
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import overlays as OV  # noqa: E402

VIDEO = OV.VIDEO
OUT = OV.OUT
FPS = 24
cv2.setNumThreads(4)

LUMA = np.array([0.2126, 0.7152, 0.0722], np.float32)


# ============================================================================================ colour helpers
def srgb_to_lin(x):
    return np.where(x <= 0.04045, x / 12.92, ((x + 0.055) / 1.055) ** 2.4).astype(np.float32)


def lin_to_srgb(x):
    x = np.clip(x, 0, None)
    return np.where(x <= 0.0031308, x * 12.92, 1.055 * np.power(x, 1 / 2.4) - 0.055).astype(np.float32)


_LUT16 = srgb_to_lin(np.arange(65536, dtype=np.float32) / 65535.0)
_ENC16 = lin_to_srgb(np.arange(65536, dtype=np.float32) / 65535.0)


def decode16(u16):
    """uint16 sRGB-encoded -> linear float32 via LUT."""
    return _LUT16[u16]


def encode_lin(x):
    """linear float32 -> display float32 [0,1] via a 16-bit LUT (values above 1 clip)."""
    q = np.clip(x * 65535.0 + 0.5, 0, 65535).astype(np.uint16)
    return _ENC16[q]


def soft_shoulder(x, start=0.82):
    """Compress linear values above `start` smoothly toward 1 (only used where light transitions push past 1)."""
    over = x > start
    if not over.any():
        return x
    s = 1 - start
    y = x.copy()
    y[over] = start + s * (1 - np.exp(-(x[over] - start) / s))
    return y


# ============================================================================================ sources
def probe_colour(path):
    try:
        r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                            "stream=color_space,color_range,width,height", "-of", "json", path],
                           capture_output=True, text=True, check=True)
        s = json.loads(r.stdout)["streams"][0]
        return s
    except Exception:
        return {}


class ChunkReader:
    """Sequential 16-bit RGB reader for one mp4 chunk (ffmpeg pipe). Restarts when asked to go backwards."""

    def __init__(self, path, a, b, w, h):
        self.path, self.a, self.b, self.w, self.h = path, a, b, w, h
        self.proc = None
        self.next = None
        info = probe_colour(path)
        cs = info.get("color_space", "unknown")
        cr = info.get("color_range", "unknown")
        mat = "bt709" if cs in ("bt709",) else "bt601"
        rng = "pc" if cr == "pc" else "tv"
        sw, sh = info.get("width", w), info.get("height", h)
        flags = "area" if sw >= w else "bicubic"
        vf = f"scale={w}:{h}:flags={flags}:in_color_matrix={mat}:in_range={rng}" if (sw, sh) != (w, h) else \
             f"scale=in_color_matrix={mat}:in_range={rng}"
        self.cmd = ["ffmpeg", "-v", "error", "-nostdin", "-i", path, "-vf", vf, "-f", "rawvideo",
                    "-pix_fmt", "rgb48le", "-"]

    def _start(self):
        self.close()
        self.proc = subprocess.Popen(self.cmd, stdout=subprocess.PIPE, bufsize=self.w * self.h * 6 * 2)
        self.next = self.a

    def read(self, f):
        if self.proc is None or f < self.next:
            self._start()
        n = self.w * self.h * 3 * 2
        while self.next <= f:
            buf = self.proc.stdout.read(n)
            if len(buf) < n:
                self.close()
                return None
            self.next += 1
            if self.next - 1 == f:
                return np.frombuffer(buf, np.uint16).reshape(self.h, self.w, 3)
        return None

    def close(self):
        if self.proc is not None:
            try:
                self.proc.stdout.close()
                self.proc.kill()
                self.proc.wait(timeout=5)
            except Exception:
                pass
        self.proc = None


class Slate:
    """Placeholder for frames without a render: calm dark gradient, shot id, description, live frame counter."""

    def __init__(self, shot, w, h, tag="SLATE"):
        from PIL import Image, ImageDraw, ImageFont
        self.w, self.h, self.shot = w, h, shot
        k = w / 1080
        y = np.linspace(0, 1, h, dtype=np.float32)[:, None]
        x = np.linspace(-1, 1, w, dtype=np.float32)[None, :]
        base = np.stack([0.085 + 0.06 * (1 - y) + 0 * x, 0.095 + 0.065 * (1 - y) + 0 * x, 0.115 + 0.075 * (1 - y) + 0 * x], -1)
        base *= (1 - 0.35 * (x ** 2))[..., None]
        img = (np.clip(base, 0, 1) * 255).astype(np.uint8)
        im = Image.fromarray(img)
        d = ImageDraw.Draw(im)
        fd = "/usr/share/fonts/opentype/inter/"
        f_big = ImageFont.truetype(fd + "InterDisplay-Light.otf", int(110 * k))
        f_mid = ImageFont.truetype(fd + "Inter-Regular.otf", int(30 * k))
        f_sm = ImageFont.truetype(fd + "Inter-Medium.otf", int(24 * k))
        y0 = int(1060 * k)
        d.text((int(84 * k), y0), shot["id"].upper(), font=f_big, fill=(150, 160, 172))
        d.text((int(88 * k), y0 + int(140 * k)), f"{tag} · {shot['start_s']:.2f}–{shot['end_s']:.2f} s · "
               f"f{shot['cut_f0']}–{shot['cut_f1'] - 1}", font=f_sm, fill=(120, 130, 142))
        yy = y0 + int(190 * k)
        for line in textwrap.wrap(shot["desc"], 46):
            d.text((int(88 * k), yy), line, font=f_mid, fill=(132, 141, 152)); yy += int(42 * k)
        yy += int(16 * k)
        for line in textwrap.wrap("“" + shot["narration"] + "”", 52)[:5]:
            d.text((int(88 * k), yy), line, font=f_sm, fill=(98, 106, 118)); yy += int(34 * k)
        self.base = np.asarray(im).astype(np.float32) / 255
        self.font = f_sm
        self.k = k

    def get(self, f):
        from PIL import Image, ImageDraw
        img = self.base.copy()
        # tiny frame counter strip (proves the timeline is running)
        im = Image.fromarray((img[int(1440 * self.k):int(1480 * self.k), :int(600 * self.k)] * 255).astype(np.uint8))
        ImageDraw.Draw(im).text((int(88 * self.k), int(6 * self.k)), f"{f:05d}  ·  {f / FPS:7.3f} s", font=self.font,
                                fill=(110, 118, 130))
        img[int(1440 * self.k):int(1480 * self.k), :int(600 * self.k)] = np.asarray(im).astype(np.float32) / 255
        return srgb_to_lin(img)


class ShotSource:
    def __init__(self, shot, w, h, proxy_dir=None, renders_dir=None):
        self.shot, self.w, self.h = shot, w, h
        self.chunks = []
        d = os.path.join(renders_dir or os.path.join(VIDEO, "renders"), shot["id"])
        for p in sorted(glob.glob(os.path.join(d, f"{shot['id']}_*.mp4"))):
            m = re.match(rf"{shot['id']}_(\d+)_(\d+)\.mp4$", os.path.basename(p))
            if m and os.path.getsize(p) > 0:
                self.chunks.append(ChunkReader(p, int(m.group(1)), int(m.group(2)), w, h))
        self.proxy = None
        if proxy_dir:
            hits = glob.glob(os.path.join(proxy_dir, "**", f"{shot['id']}_animatic.mp4"), recursive=True)
            if hits:
                self.proxy = ChunkReader(hits[0], shot["render_f0"], shot["render_f1"] + 400, w, h)
        self.slate = None
        self.kind = {}

    def get(self, f):
        """Linear float32 frame f (absolute) of this shot."""
        for c in self.chunks:
            if c.a <= f <= c.b:
                u = c.read(f)
                if u is not None:
                    self.kind[f] = "render"
                    return decode16(u)
        if self.proxy is not None:
            u = self.proxy.read(f)
            if u is not None:
                self.kind[f] = "proxy"
                return decode16(u)
        if self.slate is None:
            self.slate = Slate(self.shot, self.w, self.h, "ANIMATIC MISSING" if self.proxy else "SLATE")
        self.kind[f] = "slate"
        return self.slate.get(f)

    def close(self):
        for c in self.chunks:
            c.close()
        if self.proxy:
            self.proxy.close()


# ============================================================================================ grading / FX
def grade(img, g):
    if not g:
        return img
    out = img
    if g.get("exposure"):
        out = out * np.float32(2 ** g["exposure"])
    if g.get("temp") or g.get("tint"):
        t, ti = g.get("temp", 0) / 100.0, g.get("tint", 0) / 100.0
        gains = np.array([1 + 0.5 * t + 0.25 * ti, 1 - 0.5 * ti, 1 - 0.5 * t + 0.25 * ti], np.float32)
        out = out * gains
    if g.get("contrast", 1) != 1:
        c = g["contrast"]
        out = 0.18 * np.power(np.clip(out, 1e-6, None) / 0.18, c)
    if g.get("sat", 1) != 1:
        y = (out @ LUMA)[..., None]
        out = y + (out - y) * np.float32(g["sat"])
    return out.astype(np.float32)


def blur(img, sigma):
    if sigma <= 0.05:
        return img
    return cv2.GaussianBlur(img, (0, 0), sigma, borderType=cv2.BORDER_REFLECT)


def down_blur_up(img, sigma, w, h):
    """Large Gaussian blur done at reduced resolution (fast), returned at (w, h)."""
    f = max(1, int(sigma // 6))
    if f > 1:
        small = cv2.resize(img, (max(1, w // f), max(1, h // f)), interpolation=cv2.INTER_AREA)
        small = cv2.GaussianBlur(small, (0, 0), sigma / f, borderType=cv2.BORDER_REFLECT)
        return cv2.resize(small, (w, h), interpolation=cv2.INTER_LINEAR)
    return blur(img, sigma)


def scale_about_centre(img, s, border=cv2.BORDER_REFLECT101):
    h, w = img.shape[:2]
    M = np.float32([[s, 0, (1 - s) * w / 2], [0, s, (1 - s) * h / 2]])
    return cv2.warpAffine(img, M, (w, h), flags=cv2.INTER_LINEAR, borderMode=border)


def radial_blur(img, s, amount, k=6):
    """Zoom blur: average of k copies scaled from s to s*(1+amount)."""
    if amount < 1e-3:
        return scale_about_centre(img, s)
    acc = np.zeros_like(img)
    for i in range(k):
        acc += scale_about_centre(img, s * (1 + amount * i / (k - 1)))
    return acc / k


def disk_defocus(img, radius, w, h):
    """Lens-like defocus: disk kernel at 1/4 resolution (highlights bloom into discs)."""
    if radius < 0.5:
        return img
    f = 4
    sw, shh = w // f, h // f
    small = cv2.resize(img, (sw, shh), interpolation=cv2.INTER_AREA)
    r = max(1.0, radius / f)
    n = int(math.ceil(r)) * 2 + 1
    yy, xx = np.mgrid[:n, :n] - n // 2
    k = np.clip(r + 0.5 - np.sqrt(xx ** 2 + yy ** 2), 0, 1).astype(np.float32)
    k /= k.sum()
    small = cv2.filter2D(small, -1, k, borderType=cv2.BORDER_REFLECT)
    big = cv2.resize(small, (w, h), interpolation=cv2.INTER_CUBIC)
    a = clamp01((radius - 0.5) / 3.0)
    return img * (1 - a) + big * a if a < 1 else big


def clamp01(x):
    return max(0.0, min(1.0, x))


def smoothstep(x):
    x = clamp01(x)
    return x * x * (3 - 2 * x)


class Finisher:
    def __init__(self, cfg, w, h, preview):
        self.c, self.w, self.h, self.preview = cfg, w, h, preview
        k = w / 1080.0
        self.k = k
        yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
        nx, ny = (xx + 0.5) / w * 2 - 1, (yy + 0.5) / h * 2 - 1
        v = cfg["vignette"]
        rnd = v.get("roundness", 0.8)
        ax = 1.0
        ay = 1.0 * rnd + (h / w) * (1 - rnd) * 0 + (1 - rnd) * 1.0
        r = np.sqrt((nx / ax) ** 2 + (ny / ay) ** 2) / math.sqrt(2)
        self.vig = (1 - v["strength"] * np.power(np.clip(r, 0, 1), v["power"]))[..., None].astype(np.float32)
        self.vig3 = np.repeat(self.vig, 3, axis=2)
        ca = cfg["chromatic_aberration"]["pixels_at_corner"] * k
        half_diag = math.hypot(w / 2, h / 2)
        self.ca_s = ca / half_diag
        self.grain_cfg = cfg["grain"]

    def bloom_halation(self, lin):
        """Bloom (soft-knee highlights, three radii) + halation (red-orange skirt around the hottest
        highlights), both extracted and blurred at 1/4 resolution and added back once."""
        c = self.c
        w, h = self.w, self.h
        sw, shh = max(4, w // 4), max(4, h // 4)
        small = cv2.resize(lin, (sw, shh), interpolation=cv2.INTER_AREA)
        y = small @ LUMA
        b = c["bloom"]
        thr, knee = b["threshold"], b["knee"]
        x = np.clip((y - thr + knee) / (2 * knee), 0, 1)
        soft = np.where(y > thr + knee, y - thr, knee * x * x)
        hi = small * (soft / np.maximum(y, 1e-4))[..., None]
        acc = np.zeros_like(small)
        for r, wt in zip(b["radii"], b["weights"]):
            acc += wt * cv2.GaussianBlur(hi, (0, 0), r * self.k / 4, borderType=cv2.BORDER_REFLECT)
        acc *= b["strength"]
        ha = c["halation"]
        hl = np.clip(y - ha["threshold"], 0, None)
        if hl.max() > 0:
            hb = cv2.GaussianBlur(hl, (0, 0), max(0.6, ha["radius"] * self.k / 4))
            acc += (ha["strength"] * hb)[..., None] * np.array(ha["tint"], np.float32)
        if acc.max() <= 1e-5:
            return lin
        return cv2.add(lin, cv2.resize(acc, (w, h), interpolation=cv2.INTER_LINEAR))

    def lens(self, lin):
        out = cv2.multiply(lin, self.vig3)
        if not self.preview and self.ca_s > 0:
            r = scale_about_centre(np.ascontiguousarray(out[..., 0]), 1 + self.ca_s, cv2.BORDER_REPLICATE)
            b = scale_about_centre(np.ascontiguousarray(out[..., 2]), 1 - self.ca_s, cv2.BORDER_REPLICATE)
            out = np.stack([r, out[..., 1], b], -1)
        return out

    def sharpen(self, disp):
        s = self.c["sharpen"]
        if s["amount"] <= 0:
            return disp
        bl = cv2.GaussianBlur(disp, (0, 0), s["radius"] * self.k)
        return cv2.addWeighted(disp, 1 + s["amount"], bl, -s["amount"], 0)

    def _banks(self):
        if getattr(self, "_mono", None) is not None:
            return
        g = self.grain_cfg
        h, w = self.h, self.w
        rng = np.random.default_rng(20261020)
        size = g["size"] * self.k
        nb = 12
        self._mono, self._chroma = [], []
        for _ in range(nb):
            n = rng.standard_normal((h, w), dtype=np.float32)
            n = cv2.GaussianBlur(n, (0, 0), max(0.35, size))
            if g["coarse"] > 0:
                nc = rng.standard_normal((h // 2, w // 2), dtype=np.float32)
                nc = cv2.resize(cv2.GaussianBlur(nc, (0, 0), 0.9), (w, h), interpolation=cv2.INTER_LINEAR)
                n = n / (n.std() + 1e-6) + g["coarse"] * nc / (nc.std() + 1e-6)
            n = n / (n.std() + 1e-6)
            self._mono.append(n.astype(np.float16))
            self._chroma.append(None)

    def grain(self, disp, f, gfx_alpha=None):
        """Fine, animated, luminance-dependent grain. Deterministic per frame: a seeded pick + offset + sign
        from a bank of pre-filtered fields (strongest in the mid-tones, lighter on graphics)."""
        g = self.grain_cfg
        self._banks()
        h, w = disp.shape[:2]
        r = np.random.default_rng(7919 * (f + 11))
        i, j = int(r.integers(len(self._mono))), int(r.integers(len(self._chroma)))
        dy, dx = int(r.integers(h)), int(r.integers(w))
        sg = 1.0 if r.random() < 0.5 else -1.0
        n = np.roll(self._mono[i], (dy, dx), axis=(0, 1)).astype(np.float32)
        ys = cv2.resize(disp, (w // 2, h // 2), interpolation=cv2.INTER_AREA) @ LUMA
        amp_s = (g["amount"] * sg) * (0.35 + 2.6 * ys * (1 - ys) + 0.25 * (1 - ys))
        amp = cv2.resize(amp_s.astype(np.float32), (w, h), interpolation=cv2.INTER_LINEAR)
        if gfx_alpha is not None:
            amp *= 1 - (1 - g["on_graphics"]) * gfx_alpha
        if g["chroma"] > 0:
            n2 = np.roll(self._mono[j], (dx % h, dy % w), axis=(0, 1)).astype(np.float32)
            noise = cv2.merge([cv2.scaleAdd(n2, g["chroma"], n), n, cv2.scaleAdd(n2, -g["chroma"], n)])
        else:
            noise = cv2.merge([n, n, n])
        return cv2.add(disp, cv2.multiply(noise, cv2.merge([amp, amp, amp])))


# ============================================================================================ edit model
class Edit:
    def __init__(self, shots, edit):
        self.shots = shots["shots"]
        self.by = {s["id"]: s for s in self.shots}
        self.total = shots["total_frames"]
        self.e = edit
        self.trans = []
        for c in edit["cuts"]:
            A, B = self.by[c["a"]], self.by[c["b"]]
            cut = B["cut_f0"]
            n = int(c.get("frames", 0))
            if c["type"] == "cut" or n <= 0:
                continue
            s = cut - n // 2 + int(c.get("offset", 0))
            e = s + n
            s = max(s, B["render_f0"]); e = min(e, A["render_f1"])        # stay inside the handles
            if e - s != n:
                print(f"[composite] note: {c['a']}->{c['b']} transition clamped to {e - s} frames", file=sys.stderr)
            if e > s:
                self.trans.append({**c, "s": s, "e": e, "cut": cut})

    def owner(self, f):
        for s in self.shots:
            if s["cut_f0"] <= f < s["cut_f1"]:
                return s
        return self.shots[-1]

    def plan(self, f):
        """-> ('single', shot) or ('mix', A, B, p, trans)."""
        for t in self.trans:
            if t["s"] <= f < t["e"]:
                p = (f - t["s"] + 0.5) / (t["e"] - t["s"])
                return ("mix", self.by[t["a"]], self.by[t["b"]], p, t)
        return ("single", self.owner(f))


def mix(t, A, B, p, w, h):
    ty = t["type"]
    m = smoothstep(p)
    if ty == "dissolve":
        return A * (1 - m) + B * m
    if ty == "light":
        fl = t.get("flash", 1.0)
        bump = math.sin(math.pi * p) ** 1.4 * fl
        out = A * (1 - m) + B * m
        out = out * (1 + 1.6 * bump)
        glow = down_blur_up(np.clip(out - 0.6, 0, None), 40 * w / 1080, w, h)
        out = out + glow * 1.4 * bump
        return soft_shoulder(out, 0.80)
    if ty in ("colormatch", "luma"):
        lb = (B @ LUMA)
        ref = float(np.median(lb)) + 1e-4
        lead = np.clip(np.log2((lb + 1e-4) / ref) * 0.18, -0.35, 0.35)
        lead = cv2.GaussianBlur(lead.astype(np.float32), (0, 0), 6 * w / 1080)
        amt = 1.0 if ty == "luma" else 0.6
        wgt = np.clip(m + lead * amt * math.sin(math.pi * p), 0, 1)[..., None]
        return A * (1 - wgt) + B * wgt
    if ty == "zoom":
        pa = smoothstep(p)
        Az = radial_blur(A, 1 + 0.55 * p ** 1.7, 0.10 + 0.25 * pa)
        Bz = radial_blur(B, 0.86 + 0.14 * smoothstep(p), 0.28 * (1 - pa))
        yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
        r = np.hypot((xx - w / 2) / (w / 2), (yy - h / 2) / (h / 2)) / math.sqrt(2)
        rad = 1.25 * pa
        mk = np.clip((rad - r) / 0.25 + 0.5, 0, 1)[..., None] * clamp01(p * 1.6)
        mk = np.maximum(mk, smoothstep((p - 0.55) / 0.45))
        return Az * (1 - mk) + Bz * mk
    if ty == "defocus":
        ra = 18 * (w / 1080) * smoothstep(min(1, p * 1.3))
        rb = 18 * (w / 1080) * smoothstep(min(1, (1 - p) * 1.3))
        return disk_defocus(A, ra, w, h) * (1 - m) + disk_defocus(B, rb, w, h) * m
    if ty == "dip":
        ga = 1 - smoothstep(p / 0.55)
        gb = smoothstep((p - 0.45) / 0.55)
        return A * ga + B * gb + 0.004 * (1 - ga - gb if ga + gb < 1 else 0)
    return A * (1 - m) + B * m


# ============================================================================================ legibility
def legibility(disp, boxes, cfg, scale, w, h):
    """Soft local darkening under key words where the plate is bright (measured per frame)."""
    if not boxes:
        return disp
    lc = cfg
    mask = None
    sw, shh = max(8, w // 8), max(8, h // 8)
    for b in boxes:
        x0, y0, x1, y1, wt = b
        if wt < 0.02:
            continue
        x0s, y0s, x1s, y1s = [int(v * scale) for v in (x0, y0, x1, y1)]
        pad = int(30 * scale)
        xa, ya = max(0, x0s - pad), max(0, y0s - pad)
        xb, yb = min(w, x1s + pad), min(h, y1s + pad)
        if xb <= xa or yb <= ya:
            continue
        reg = disp[ya:yb:3, xa:xb:3]
        lum = reg @ LUMA
        l85 = float(np.percentile(lum, 85))
        k = min(lc["max"], max(0.0, (l85 - lc["threshold"]) * lc["gain"])) * min(1.0, wt)
        if k <= 0.003:
            continue
        if mask is None:
            mask = np.zeros((shh, sw), np.float32)
        m = np.zeros((shh, sw), np.float32)
        pp = lc["pad"] * scale
        cx, cy = (x0s + x1s) / 2 / w * sw, (y0s + y1s) / 2 / h * shh
        ax = ((x1s - x0s) / 2 + pp) / w * sw * 1.08
        ay = ((y1s - y0s) / 2 + pp * 0.75) / h * shh * 1.08
        cv2.ellipse(m, (int(round(cx)), int(round(cy))), (max(1, int(ax)), max(1, int(ay))), 0, 0, 360, 1.0, -1)
        m = cv2.GaussianBlur(m, (0, 0), lc["feather"] * scale / 8)
        mask = np.maximum(mask, m * k)
    if mask is None:
        return disp
    big = cv2.resize(mask, (w, h), interpolation=cv2.INTER_CUBIC)
    # darken in linear-ish terms: scale display values (keeps colour)
    return disp * (1 - big)[..., None]


# ============================================================================================ main loop
def load_overlay(paths, w, h):
    over_p, add_p, boxes = paths
    ov = add = None
    if over_p and os.path.exists(over_p):
        im = cv2.imread(over_p, cv2.IMREAD_UNCHANGED)
        if im.shape[1] != w:
            im = cv2.resize(im, (w, h), interpolation=cv2.INTER_AREA)
        ov = im.astype(np.float32) / 255.0
        ov = np.concatenate([ov[..., 2::-1], ov[..., 3:4]], -1)
    if add_p and os.path.exists(add_p):
        im = cv2.imread(add_p, cv2.IMREAD_UNCHANGED)
        if im.shape[1] != w:
            im = cv2.resize(im, (w, h), interpolation=cv2.INTER_AREA)
        a = im.astype(np.float32) / 255.0
        add = a[..., 2::-1] * a[..., 3:4]
    return ov, add, boxes


def audio_source():
    p = os.path.join(OUT, "audio", "final_mix.wav")
    return p if os.path.exists(p) else os.path.join(VIDEO, "audio", "narration.m4a")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--from", dest="ffrom", type=int, default=0)
    ap.add_argument("--to", dest="fto", type=int, default=None, help="inclusive")
    ap.add_argument("--preview", action="store_true", help="half resolution, fast encode")
    ap.add_argument("--out", default=None)
    ap.add_argument("--stills", default=None, help="comma list of frames -> PNGs only")
    ap.add_argument("--stills-dir", default=None)
    ap.add_argument("--no-overlays", action="store_true")
    ap.add_argument("--no-finish", action="store_true")
    ap.add_argument("--proxy-dir", default=None, help="use <shot>_animatic.mp4 found here for missing renders")
    ap.add_argument("--renders-dir", default=None, help="default video/renders")
    ap.add_argument("--audio", default=None)
    ap.add_argument("--crf", type=float, default=None)
    ap.add_argument("--edit", default=os.path.join(HERE, "edit.json"))
    a = ap.parse_args()

    shots = OV.shots_table()
    edit = OV.load_json(a.edit)
    ed = Edit(shots, edit)
    total = shots["total_frames"]
    f_from = max(0, a.ffrom)
    f_to = total - 1 if a.fto is None else min(total - 1, a.fto)
    scale = 0.5 if a.preview else 1.0
    w, h = int(1080 * scale), int(1920 * scale)
    frames = [int(x) for x in a.stills.split(",")] if a.stills else list(range(f_from, f_to + 1))

    # overlays (rendered on demand, cached by content hash)
    man = None
    if not a.no_overlays:
        t0 = time.time()
        man = OV.ensure(min(frames), max(frames), scale, pages=2, frames=frames if a.stills else None, quiet=False)
        print(f"[composite] overlays ready ({time.time() - t0:.1f}s)", file=sys.stderr)

    fin = Finisher(edit["finish"], w, h, a.preview)
    sources = {}

    def src(shot):
        if shot["id"] not in sources:
            sources[shot["id"]] = ShotSource(shot, w, h, a.proxy_dir, a.renders_dir)
        return sources[shot["id"]]

    grades = edit.get("grade", {})
    head = edit.get("head_fade", {}).get("frames", 0)
    tail = edit.get("tail_fade", {}).get("frames", 0)

    enc = None
    out_path = None
    if not a.stills:
        out_path = a.out or os.path.join(OUT, "final", "preview.mp4" if a.preview else "video.mp4")
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        aud = a.audio or audio_source()
        crf = a.crf if a.crf is not None else (21 if a.preview else 16)
        preset = "veryfast" if a.preview else "slow"
        cmd = ["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{w}x{h}", "-r", str(FPS),
               "-i", "-", "-ss", f"{f_from / FPS:.6f}", "-t", f"{len(frames) / FPS:.6f}", "-i", aud,
               "-map", "0:v", "-map", "1:a",
               "-vf", "scale=out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int,format=yuv420p",
               "-c:v", "libx264", "-preset", preset, "-crf", f"{crf:g}", "-profile:v", "high", "-tune", "film",
               "-g", "48", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv",
               "-c:a", "aac", "-b:a", "320k", "-ar", "48000", "-movflags", "+faststart", "-shortest", out_path]
        enc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    stills_dir = a.stills_dir or os.path.join(OUT, "final", "stills")
    if a.stills:
        os.makedirs(stills_dir, exist_ok=True)

    t_start = time.time()
    tim = {"src": 0.0, "fx": 0.0, "ov": 0.0, "out": 0.0}
    kinds = {}
    for i, f in enumerate(frames):
        t0 = time.time()
        pl = ed.plan(f)
        if pl[0] == "single":
            sh = pl[1]
            img = grade(src(sh).get(f), grades.get(sh["id"]))
            kinds[sh["id"]] = src(sh).kind.get(f)
            t1 = time.time()
        else:
            _, A, B, p, tr = pl
            ia = grade(src(A).get(f), grades.get(A["id"]))
            ib = grade(src(B).get(f), grades.get(B["id"]))
            t1 = time.time()
            img = mix(tr, ia, ib, p, w, h)
        tim["src"] += t1 - t0
        # finishing (scene-linear)
        if not a.no_finish:
            img = fin.bloom_halation(img)
            img = fin.lens(img)
        if f < head:
            img = img * smoothstep((f + 0.5) / head) ** 1.0
        if f >= total - tail:
            img = img * (1 - smoothstep((f - (total - tail) + 0.5) / tail))
        disp = encode_lin(img)
        if not a.no_finish:
            disp = fin.sharpen(disp)
        t2 = time.time()
        tim["fx"] += t2 - t1
        gfx = None
        if man is not None:
            ov, add, boxes = load_overlay(OV.frame_paths(man, f), w, h)
            if boxes:
                disp = legibility(disp, boxes, edit["finish"]["legibility"], scale, w, h)
            if ov is not None:
                al = ov[..., 3:4]
                disp = ov[..., :3] * al + disp * (1 - al)
                gfx = al[..., 0]
            if add is not None:
                disp = 1 - (1 - np.clip(disp, 0, 1)) * (1 - np.clip(add, 0, 1))
        t3 = time.time()
        tim["ov"] += t3 - t2
        if not a.no_finish:
            disp = fin.grain(disp, f, gfx)
        # 8-bit with a touch of TPDF dither (the grain already decorrelates banding)
        q = np.clip(disp * 255 + (np.random.default_rng(f).random(disp.shape[:2], dtype=np.float32)[..., None] - 0.5) * 0.5
                    + 0.5, 0, 255).astype(np.uint8)
        if enc:
            enc.stdin.write(q.tobytes())
        else:
            cv2.imwrite(os.path.join(stills_dir, f"frame_{f:05d}.png"), q[..., ::-1])
        tim["out"] += time.time() - t3
        if (i + 1) % 48 == 0 or i == len(frames) - 1:
            el = time.time() - t_start
            print(f"[composite] {i + 1}/{len(frames)} f{f}  {el / (i + 1):.3f} s/frame  "
                  f"(src {tim['src'] / (i + 1):.3f}, fx {tim['fx'] / (i + 1):.3f}, ov {tim['ov'] / (i + 1):.3f}, "
                  f"out {tim['out'] / (i + 1):.3f})", file=sys.stderr, flush=True)
    for s in sources.values():
        s.close()
    if enc:
        enc.stdin.close()
        enc.wait()
        print(f"[composite] -> {out_path}", file=sys.stderr)
    used = {}
    for s in sources.values():
        for f, k in s.kind.items():
            used.setdefault(s.shot["id"], set()).add(k)
    print("[composite] sources:", {k: sorted(v) for k, v in used.items()}, file=sys.stderr)
    print(f"[composite] total {time.time() - t_start:.1f}s for {len(frames)} frames "
          f"({(time.time() - t_start) / max(1, len(frames)):.3f} s/frame)", file=sys.stderr)


if __name__ == "__main__":
    main()
