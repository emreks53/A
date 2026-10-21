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
A full-quality encode refuses to run unless every UI tick in the mix (mix_report.json next to final_mix.wav) sits on
its graphic within one frame (--allow-cue-mismatch overrides for tests). The output is bounded by the picture (audio
padded/trimmed to the frame range) and verified (frame count, stream durations) after encoding.

Processing per output frame (scene-linear float32 unless noted):
  decode (16-bit) -> per-shot grade trims -> transition mix -> bloom + halation -> vignette -> lateral CA
  -> display encode -> sharpen -> adaptive legibility under key words (+ optional per-keyword scrim floor)
  -> overlay OVER + additive light (screen)
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
        self.proc = subprocess.Popen(self.cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                                     bufsize=self.w * self.h * 6 * 2)
        self.next = self.a

    def read(self, f):
        if self.proc is None or f < self.next:
            self._start()
        n = self.w * self.h * 3 * 2
        while self.next <= f:
            buf = self.proc.stdout.read(n)
            if len(buf) < n:
                print(f"[composite] warning: {os.path.basename(self.path)} ended before frame {f}", file=sys.stderr)
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
        """Linear frame; only the small frame-counter strip is redrawn per frame."""
        from PIL import Image, ImageDraw
        if getattr(self, "base_lin", None) is None:
            self.base_lin = srgb_to_lin(self.base)
        y0, y1, x1 = int(1440 * self.k), int(1480 * self.k), int(600 * self.k)
        im = Image.fromarray((self.base[y0:y1, :x1] * 255).astype(np.uint8))
        ImageDraw.Draw(im).text((int(88 * self.k), int(6 * self.k)), f"{f:05d}  ·  {f / FPS:7.3f} s", font=self.font,
                                fill=(110, 118, 130))
        img = self.base_lin.copy()
        img[y0:y1, :x1] = srgb_to_lin(np.asarray(im).astype(np.float32) / 255)
        return img


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
            if c.b < f and c.proc is not None:
                c.close()                     # sequential conform: never keep a finished chunk's decoder alive
        for c in self.chunks:
            if c.a <= f <= c.b:
                u = c.read(f)
                if u is not None:
                    self.kind[f] = "render"
                    return decode16(u)
        if self.proxy is not None:
            eof = getattr(self, "proxy_eof", None)
            u = self.proxy.read(f) if eof is None or f < eof else None
            if u is None and eof is None:
                self.proxy_eof = f
            if u is not None:
                self.kind[f] = "proxy"
                self.proxy_last = (f, u)
                return decode16(u)
            last = getattr(self, "proxy_last", None)
            if last is not None and 0 < f - last[0] <= 6:
                self.kind[f] = "proxy(held)"          # animatics are often a frame short of the handles
                return decode16(last[1])
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
        rnd = v.get("roundness", 0.5)          # 1 = circular image circle (lens), 0 = follows the frame shape
        r_e = np.sqrt(nx ** 2 + ny ** 2) / math.sqrt(2)
        r_c = np.hypot(xx + 0.5 - w / 2, yy + 0.5 - h / 2) / math.hypot(w / 2, h / 2)
        r = rnd * r_c + (1 - rnd) * r_e
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


def _disp_luma_pct(lin_small, qs):
    """Percentiles (display-referred, 0..1) of a small linear image's luma."""
    y = encode_lin(np.ascontiguousarray(lin_small)) @ LUMA
    return np.percentile(y, qs)


def mix(t, A, B, p, w, h):
    ty = t["type"]
    m = smoothstep(p)
    if ty == "dissolve":
        return A * (1 - m) + B * m
    if ty == "light":
        # additive bloom-flash crossfade, scaled to the plates: the flash may lift the frame but never turns it
        # into a featureless white card (display p1 <= ~200/255, median <= ~225/255)
        fl = t.get("flash", 1.0)
        bump = math.sin(math.pi * p) ** 1.4 * fl
        base = A * (1 - m) + B * m
        if bump < 1e-4:
            return base
        sw, shh = max(8, w // 8), max(8, h // 8)
        small = cv2.resize(base, (sw, shh), interpolation=cv2.INTER_AREA)

        def flash(img, g, ww, hh):
            out = img * (1 + 1.25 * bump * g)
            glow = down_blur_up(np.clip(out - 0.6, 0, None), 40 * ww / 1080, ww, hh)
            return soft_shoulder(out + glow * 1.1 * bump * g, 0.80)

        p1_cap, p50_cap = t.get("p1_cap", 0.78), t.get("p50_cap", 0.88)
        g_ok = 0.0
        for g in (1.0, 0.75, 0.55, 0.4, 0.28, 0.18, 0.1, 0.05):
            p1, p50 = _disp_luma_pct(flash(small, g, sw, shh), [1, 50])
            if p1 <= p1_cap and p50 <= p50_cap:
                g_ok = g
                break
        return flash(base, g_ok, w, h) if g_ok > 0 else base
    if ty in ("colormatch", "luma"):
        lb = (B @ LUMA)
        ref = float(np.median(lb)) + 1e-4
        lead = np.clip(np.log2((lb + 1e-4) / ref) * 0.18, -0.35, 0.35)
        lead = cv2.GaussianBlur(lead.astype(np.float32), (0, 0), 6 * w / 1080)
        amt = 1.0 if ty == "luma" else 0.6
        wgt = np.clip(m + lead * amt * math.sin(math.pi * p), 0, 1)[..., None]
        return A * (1 - wgt) + B * wgt
    if ty == "zoom":
        # photographic push through the skin - no matte, no geometric edge anywhere. A keeps pushing in (scale +
        # radial blur) while the skin goes out of focus and turns into the warm red glow of light scattered in
        # tissue; B starts as the same red glow at the same exposure (heavy defocus, still moving forward) and
        # resolves into focus while its exposure settles to its own level. The full-frame crossfade happens where
        # both are featureless, so there is nothing to see but the camera entering the arm.
        k = w / 1080
        pa = smoothstep(p)
        u = smoothstep(p / 0.55)                     # A: defocus + redden
        v = smoothstep((p - 0.35) / 0.65)            # B: focus + exposure settle
        sss = np.array([1.0, 0.42, 0.30], np.float32)
        Az = radial_blur(A, 1 + 0.5 * p ** 1.4, 0.05 + 0.2 * pa)
        if u > 0.01:
            Az = down_blur_up(Az, 1.5 + 46 * k * u, w, h)
        Az = Az * ((1 - 0.8 * u) + 0.8 * u * sss)
        Bz = disk_defocus(scale_about_centre(B, 0.9 + 0.1 * pa), 46 * k * (1 - v) ** 1.2, w, h)
        if v < 0.99:
            Bz = down_blur_up(Bz, 1.0 + 30 * k * (1 - v) ** 1.5, w, h)
        Bz = Bz * ((1 - 0.6 * (1 - v)) + 0.6 * (1 - v) * sss)
        sa = cv2.resize(Az, (max(4, w // 16), max(4, h // 16)), interpolation=cv2.INTER_AREA) @ LUMA
        sb = cv2.resize(Bz, (max(4, w // 16), max(4, h // 16)), interpolation=cv2.INTER_AREA) @ LUMA
        g = float(np.clip((float(sa.mean()) + 1e-4) / (float(sb.mean()) + 1e-4), 1 / 8, 8)) ** (1 - v)
        Bz = Bz * np.float32(g)
        wgt = smoothstep((p - 0.25) / 0.5)
        lift = 1 + 0.3 * math.sin(math.pi * p)       # a gentle exposure breath as the lens enters the skin
        return soft_shoulder((Az * (1 - wgt) + Bz * wgt) * np.float32(lift), 0.85)
    if ty == "defocus":
        r = t.get("radius", 18)
        ra = r * (w / 1080) * smoothstep(min(1, p * 1.3))
        rb = r * (w / 1080) * smoothstep(min(1, (1 - p) * 1.3))
        return disk_defocus(A, ra, w, h) * (1 - m) + disk_defocus(B, rb, w, h) * m
    if ty == "dip":
        # through black (no lifted floor): A is gone by p ~ 0.4, a beat of black, then B rises like an exposure
        ga = (1 - smoothstep(p / 0.4)) ** 2
        gb = smoothstep((p - 0.5) / 0.5) ** 2
        return A * np.float32(ga) + B * np.float32(gb)
    return A * (1 - m) + B * m


# ============================================================================================ legibility
def legibility(disp, boxes, cfg, scale, w, h):
    """Soft, content-aware darkening behind text where the plate is bright. Each pixel is darkened in proportion
    to its own brightness (k * smoothstep(lo, hi, luma)): dark areas are left alone, so it reads as a natural
    local exposure falloff rather than a grey band. The region is the text's extent plus ~150 px, feathered;
    the glyph shadows do the rest.
    Scrim: a key-word box [x0, y0, x1, y1, w, 0, s] (overlays.json keyword "scrim") adds a soft elliptical
    vignette of strength s behind the line that is NOT luma-gated (it steadies a strobing or mid-tone background)
    and acts as a floor on the darkening: each pixel gets max(legibility darkening, scrim)."""
    if not boxes:
        return disp
    lc = cfg
    mask = None
    scrim = None
    sw, shh = max(8, w // 8), max(8, h // 8)
    yy = (np.arange(shh, dtype=np.float32) + 0.5) / shh * h
    xx = (np.arange(sw, dtype=np.float32) + 0.5) / sw * w
    for b in boxes:
        x0, y0, x1, y1, wt = b[:5]
        local = len(b) > 5 and b[5] == 1
        ks = float(b[6]) if len(b) > 6 and not local else 0.0
        if ks > 0.003:
            sc = {"extent": 130, "pad": 150, "softness": 0.32, **lc.get("scrim", {})}
            cxs, cys = (x0 + x1) / 2 * scale, (y0 + y1) / 2 * scale
            rxs = ((x1 - x0) / 2 + sc["extent"]) * scale
            rys = ((y1 - y0) / 2 + sc["pad"]) * scale
            r = np.sqrt(((xx[None, :] - cxs) / rxs) ** 2 + ((yy[:, None] - cys) / rys) ** 2)
            # logistic falloff normalised to exactly ks at the centre: no edge, no plateau corners
            sm = (ks * (1 + math.exp(-1 / sc["softness"])) / (1 + np.exp((r - 1) / sc["softness"]))).astype(np.float32)
            scrim = sm if scrim is None else np.maximum(scrim, sm)
        if wt < 0.02:
            continue
        x0s, y0s, x1s, y1s = [v * scale for v in (x0, y0, x1, y1)]
        pad = 30 * scale
        xa, ya = max(0, int(x0s - pad)), max(0, int(y0s - pad))
        xb, yb = min(w, int(x1s + pad)), min(h, int(y1s + pad))
        if xb <= xa or yb <= ya:
            continue
        lum = disp[ya:yb:3, xa:xb:3] @ LUMA
        l85 = float(np.percentile(lum, 85))
        k = max(0.0, (l85 - lc["threshold"]) * lc["gain"]) * min(1.0, wt)
        k = min(k, lc["max_local"] if local else lc["max"])
        # a flat, featureless background (overcast sky, plain wall) barely hurts legibility - the glyph shadow is
        # enough - while any darkening on it would read as a smudge: scale down with the local texture
        k *= float(np.clip(float(np.std(lum)) / lc["texture"], lc["flat_floor"], 1.0))
        if k <= 0.003:
            continue
        if local:
            k = min(k, lc["max_local"])
        # elliptical, very soft (no corners, no straight edges): 50 % at text half-size + extent/pad,
        # transition ~ +-35 % of that radius
        ext = (lc["extent_local"] if local else lc["extent"]) * scale
        cy, ry = (y0s + y1s) / 2, (y1s - y0s) / 2 + lc["pad"] * scale * (0.6 if local else 1.0)
        cx, rx = (x0s + x1s) / 2, (x1s - x0s) / 2 + ext
        r = np.sqrt(((xx[None, :] - cx) / rx) ** 2 + ((yy[:, None] - cy) / ry) ** 2)
        m = k / (1 + np.exp((r - 1) / lc["softness"]))
        mask = m if mask is None else np.maximum(mask, m)
    if mask is None and scrim is None:
        return disp
    big = cv2.resize(mask, (w, h), interpolation=cv2.INTER_CUBIC) if mask is not None else None
    sbig = cv2.resize(scrim, (w, h), interpolation=cv2.INTER_CUBIC) if scrim is not None else None
    rows = np.zeros(h, bool)
    for m_ in (big, sbig):
        if m_ is not None:
            rows |= m_.max(1) > 1e-3
    if not rows.any():
        return disp
    ys, ye = np.where(rows)[0][[0, -1]]
    reg = disp[ys:ye + 1]
    dk = 0.0
    if big is not None:
        lum = cv2.GaussianBlur(reg @ LUMA, (0, 0), 1.5 * scale + 0.3)
        lo, hi = lc["luma"]
        u = np.clip((lum - lo) / (hi - lo), 0, 1)
        dk = big[ys:ye + 1] * (u * u * (3 - 2 * u))
    if sbig is not None:
        dk = np.maximum(dk, np.clip(sbig[ys:ye + 1], 0, 1))
    f = 1 - dk
    disp[ys:ye + 1] = reg * f[..., None]
    return disp


# ============================================================================================ main loop
def _read_rgba(path, xywh, w, h):
    """Cropped overlay PNG -> ((x, y, bw, bh) in the output frame, RGBA uint8 trimmed to alpha > 0)."""
    im = cv2.imread(path, cv2.IMREAD_UNCHANGED)
    if im is None:
        return None
    ox, oy = (xywh[0], xywh[1]) if xywh else (0, 0)
    x, y, bw, bh = cv2.boundingRect((im[..., 3] > 0).astype(np.uint8))
    if bw == 0 or bh == 0:
        return None
    im = im[y:y + bh, x:x + bw]
    x, y = x + ox, y + oy
    # clip to the frame (defensive)
    x0, y0, x1, y1 = max(0, x), max(0, y), min(w, x + bw), min(h, y + bh)
    if x1 <= x0 or y1 <= y0:
        return None
    return (x0, y0, x1 - x0, y1 - y0), im[y0 - y:y1 - y, x0 - x:x1 - x]


def apply_overlay(disp, paths, w, h, leg_cfg, scale, glow_cfg=None):
    """Legibility darkening, then OVER layer and additive (screen) layer, processed inside their bounding boxes.
    Returns (disp, graphics alpha map or None)."""
    over_p, over_box, add_p, add_box, boxes = paths
    for q in (over_p, add_p):
        if q and not os.path.exists(q):
            raise FileNotFoundError(f"overlay frame listed in the manifest is missing: {q}")
    if boxes:
        disp = legibility(disp, boxes, leg_cfg, scale, w, h)
    gfx = None
    if over_p:
        r = _read_rgba(over_p, over_box, w, h)
        if r:
            (x, y, bw, bh), im = r
            o = im.astype(np.float32) * (1 / 255.0)
            al = o[..., 3:4]
            reg = disp[y:y + bh, x:x + bw]
            disp[y:y + bh, x:x + bw] = o[..., 2::-1] * al + reg * (1 - al)
            gfx = np.zeros((h, w), np.float32)
            gfx[y:y + bh, x:x + bw] = al[..., 0]
    if add_p:
        r = _read_rgba(add_p, add_box, w, h)
        if r:
            (x, y, bw, bh), im = r
            a = im.astype(np.float32) * (1 / 255.0)
            L = a[..., 2::-1] * a[..., 3:4]                      # emitted light (premultiplied)
            g = glow_cfg or {"sigmas": [2.5, 8, 22], "weights": [0.5, 0.42, 0.3], "core": 0.45}
            m = int(3 * max(g["sigmas"]) * scale) + 2
            X0, Y0, X1, Y1 = max(0, x - m), max(0, y - m), min(w, x + bw + m), min(h, y + bh + m)
            pad = np.zeros((Y1 - Y0, X1 - X0, 3), np.float32)
            pad[y - Y0:y - Y0 + bh, x - X0:x - X0 + bw] = L
            acc = pad * g["core"]
            for sg, wt in zip(g["sigmas"], g["weights"]):
                sg *= scale
                if sg >= 5:
                    acc += wt * down_blur_up(pad, sg, pad.shape[1], pad.shape[0])
                else:
                    acc += wt * cv2.GaussianBlur(pad, (0, 0), sg)
            reg = np.clip(disp[Y0:Y1, X0:X1], 0, 1)
            disp[Y0:Y1, X0:X1] = 1 - (1 - reg) * (1 - np.clip(acc, 0, 1))
    return disp, gfx


def audio_source():
    p = os.path.join(OUT, "audio", "final_mix.wav")
    return p if os.path.exists(p) else os.path.join(VIDEO, "audio", "narration.m4a")


TICK_KINDS = {"callout", "widget", "counter_land", "ring", "network_node", "spiral"}


def check_ticks(audio_path, sync_points):
    """UI ticks actually rendered into the mix (mix_report.json written by audio/mix.py next to final_mix.wav)
    vs the moments the graphics land (overlays.resolve sync points). Every tick must sit on its graphic within
    one frame and every landing graphic must have its tick. -> list of problems (empty = in sync)."""
    if os.path.basename(audio_path) != "final_mix.wav":
        return [f"audio is {os.path.basename(audio_path)} (narration only, no sound-design mix): no UI ticks at all"]
    rp = os.path.join(os.path.dirname(audio_path), "mix_report.json")
    if not os.path.exists(rp):
        return [f"{rp} missing: cannot verify that the mix's UI ticks match the graphics"]
    probs = []
    if os.path.getmtime(rp) < os.path.getmtime(audio_path) - 60:
        probs.append("mix_report.json is older than final_mix.wav (the report may not describe this mix)")
    rep = OV.load_json(rp)
    ticks = {c["id"]: float(c["t"]) for c in rep.get("cues", []) if c.get("cls") == "ui"}
    sp = {p["id"]: float(p["t"]) for p in sync_points if p.get("kind") in TICK_KINDS and not isinstance(p["t"], list)}
    for cid, t in sorted(ticks.items(), key=lambda x: x[1]):
        if cid not in sp:
            probs.append(f"tick {cid} at {t:.3f} s has no graphic")
        elif abs(t - sp[cid]) > 1.0 / FPS + 1e-3:
            probs.append(f"tick {cid} at {t:.3f} s, graphic lands at {sp[cid]:.3f} s ({t - sp[cid]:+.3f} s)")
    for gid, t in sorted(sp.items(), key=lambda x: x[1]):
        if gid not in ticks:
            probs.append(f"graphic {gid} lands at {t:.3f} s without a tick")
    cj = os.path.join(VIDEO, "audio", "cues.json")
    if os.path.exists(cj) and os.path.getmtime(cj) > os.path.getmtime(audio_path) + 1:
        probs.append("audio/cues.json is newer than final_mix.wav (the mix has not been re-rendered)")
    return probs


def verify_output(path, n_frames):
    """Frame count (packets, no decode) and stream durations of an encoded file."""
    r = subprocess.run(["ffprobe", "-v", "error", "-count_packets", "-show_entries",
                        "stream=codec_type,nb_read_packets,duration", "-of", "json", path],
                       capture_output=True, text=True, check=True)
    st = json.loads(r.stdout)["streams"]
    v = [x for x in st if x["codec_type"] == "video"][0]
    a = [x for x in st if x["codec_type"] == "audio"]
    nv = int(v["nb_read_packets"])
    da = float(a[0]["duration"]) if a else 0.0
    ok = nv == n_frames and abs(da - n_frames / FPS) < 0.05
    return ok, nv, float(v.get("duration", 0)), da


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
    ap.add_argument("--allow-cue-mismatch", action="store_true",
                    help="encode a full-quality file even if the mix's UI ticks do not match the graphics")
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

    tl = OV.resolve(verbose=True)
    # the mix's UI ticks must sit on the graphics: a full-quality encode refuses to run otherwise
    if not a.stills:
        aud = a.audio or audio_source()
        probs = check_ticks(aud, tl["sync_points"])
        if probs:
            msg = "[composite] UI tick sync problems (audio vs graphics):\n  " + "\n  ".join(probs)
            if not a.preview and not a.allow_cue_mismatch:
                print(msg + "\n[composite] refusing to encode the final: rebuild audio/cues.json + final_mix.wav "
                      "from comp/sync_points.json (or pass --allow-cue-mismatch for a test encode)", file=sys.stderr)
                sys.exit(3)
            print(msg, file=sys.stderr)
        else:
            print(f"[composite] UI ticks: all in sync with the graphics (±1 frame)", file=sys.stderr)

    # overlays (rendered on demand, cached by content hash)
    man = None
    if not a.no_overlays:
        t0 = time.time()
        man = OV.ensure(min(frames), max(frames), scale, pages=2, frames=frames if a.stills else None, tl=tl,
                        quiet=False)
        print(f"[composite] overlays ready ({time.time() - t0:.1f}s)", file=sys.stderr)

    fin = Finisher(edit["finish"], w, h, a.preview)
    sources = {}
    done_sources = {}

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
        dur = len(frames) / FPS
        # the output is bounded by the picture: audio shorter than the range (narration.m4a is 124.27 s) is padded
        # with silence, longer audio is cut; never -shortest (it would truncate the film and break the pipe)
        cmd = ["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{w}x{h}", "-r", str(FPS),
               "-i", "-", "-ss", f"{f_from / FPS:.6f}", "-t", f"{dur:.6f}", "-i", aud,
               "-map", "0:v", "-map", "1:a",
               "-vf", "scale=out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int,format=yuv420p",
               "-af", f"apad=whole_dur={dur:.6f},atrim=0:{dur:.6f}",
               "-c:v", "libx264", "-preset", preset, "-crf", f"{crf:g}", "-profile:v", "high", "-tune", "film",
               "-g", "48", "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv",
               "-c:a", "aac", "-b:a", "320k", "-ar", "48000", "-frames:v", str(len(frames)), "-t", f"{dur:.6f}",
               "-movflags", "+faststart", out_path]
        enc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    stills_dir = a.stills_dir or os.path.join(OUT, "final", "stills")
    if a.stills:
        os.makedirs(stills_dir, exist_ok=True)

    t_start = time.time()
    tim = {"src": 0.0, "fx": 0.0, "ov": 0.0, "out": 0.0}
    kinds = {}
    for i, f in enumerate(frames):
        t0 = time.time()
        if not a.stills:
            for sid in [k for k, v in sources.items() if v.shot["render_f1"] <= f]:
                sources[sid].close()
                done_sources[sid] = sources.pop(sid)
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
            disp, gfx = apply_overlay(disp, OV.frame_paths(man, f), w, h, edit["finish"]["legibility"], scale,
                                      edit["finish"].get("overlay_glow"))
        t3 = time.time()
        tim["ov"] += t3 - t2
        if not a.no_finish:
            disp = fin.grain(disp, f, gfx)
        # 8-bit with a touch of TPDF dither (the grain already decorrelates banding)
        q = np.clip(disp * 255 + (np.random.default_rng(f).random(disp.shape[:2], dtype=np.float32)[..., None] - 0.5) * 0.5
                    + 0.5, 0, 255).astype(np.uint8)
        if enc:
            try:
                enc.stdin.write(q.tobytes())
            except BrokenPipeError:
                raise RuntimeError(f"[composite] the encoder exited early (code {enc.poll()}) at frame {f} "
                                   f"({i}/{len(frames)} frames written)")
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
    sources.update(done_sources)
    if enc:
        enc.stdin.close()
        rc = enc.wait()
        if rc != 0:
            raise RuntimeError(f"[composite] ffmpeg failed with code {rc}: {out_path} is not valid")
        ok, nv, dv, da = verify_output(out_path, len(frames))
        print(f"[composite] -> {out_path}  ({nv} video frames, video {dv:.3f} s, audio {da:.3f} s)", file=sys.stderr)
        if not ok:
            raise RuntimeError(f"[composite] output check failed: {nv} frames (want {len(frames)}), "
                               f"audio {da:.3f} s (want {len(frames) / FPS:.3f} s)")
    used = {}
    for s in sources.values():
        for f, k in s.kind.items():
            used.setdefault(s.shot["id"], set()).add(k)
    print("[composite] sources:", {k: sorted(v) for k, v in used.items()}, file=sys.stderr)
    print(f"[composite] total {time.time() - t_start:.1f}s for {len(frames)} frames "
          f"({(time.time() - t_start) / max(1, len(frames)):.3f} s/frame)", file=sys.stderr)


if __name__ == "__main__":
    main()
