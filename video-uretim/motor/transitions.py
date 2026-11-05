"""Transitions between two graded RGB uint8 frames. u in [0,1]."""
import math
import numpy as np, cv2
from common import *

_yy, _xx = np.mgrid[0:H, 0:W].astype(np.float32)


def _zoom(img, s, cx=W / 2, cy=H / 2):
    M = np.float32([[s, 0, cx - s * cx], [0, s, cy - s * cy]])
    return cv2.warpAffine(img, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)


def dissolve(a, b, u, p=None):
    k = ease_in_out_sine(u)
    return cv2.addWeighted(a, 1 - k, b, k, 0)


def blur_dissolve(a, b, u, p=None):
    k = ease_in_out_sine(u)
    sa = 1 + 14 * ease_in_cubic(min(1, u * 1.3))
    sb = 1 + 14 * ease_in_cubic(min(1, (1 - u) * 1.3))
    A = cv2.GaussianBlur(a, (0, 0), sa) if sa > 1.3 else a
    B = cv2.GaussianBlur(b, (0, 0), sb) if sb > 1.3 else b
    return cv2.addWeighted(A, 1 - k, B, k, 0)


def zoom_through(a, b, u, p=None):
    """Outgoing pushes in and blurs, incoming settles from slightly scaled-down."""
    k = ease_in_out_cubic(u)
    A = _zoom(a, 1 + 0.35 * ease_in_cubic(u))
    B = _zoom(b, 1.25 - 0.25 * ease_out_cubic(u))
    sA = 0.5 + 10 * ease_in_cubic(u)
    sB = 0.5 + 10 * ease_in_cubic(1 - u)
    A = cv2.GaussianBlur(A, (0, 0), sA)
    B = cv2.GaussianBlur(B, (0, 0), sB)
    out = cv2.addWeighted(A, 1 - k, B, k, 0)
    return out


def light_flash(a, b, u, p=None):
    k = smooth(lin(0.35, 0.65, u))
    base = cv2.addWeighted(a, 1 - k, b, k, 0).astype(np.float32)
    fl = math.sin(math.pi * u) ** 2
    warm = np.array([255, 236, 205], np.float32)
    base = base + (warm - base) * (0.72 * fl)
    return np.clip(base, 0, 255).astype(np.uint8)


def iris(a, b, u, p=None):
    """Aperture-like reveal of b from the centre (used for the 'göz' section)."""
    cx, cy = (p or {}).get('cx', W / 2), (p or {}).get('cy', H * 0.45)
    blades = 6
    r_max = math.hypot(W, H) * 0.62
    r = r_max * ease_in_out_cubic(u)
    ang = np.arctan2(_yy - cy, _xx - cx) + u * 1.2
    d = np.sqrt((_xx - cx) ** 2 + (_yy - cy) ** 2)
    # hexagonal (polygonal) radius
    sector = (ang % (2 * math.pi / blades)) - math.pi / blades
    poly_d = d * np.cos(sector) / math.cos(math.pi / blades)
    m = np.clip((r - poly_d) / 6.0, 0, 1)[..., None]
    A = _zoom(a, 1 + 0.12 * u)
    return (A * (1 - m) + b * m).astype(np.uint8)


def ripple(a, b, u, p=None):
    """Circular ring reveal with refraction wobble (used for the 'kulak' section)."""
    cx, cy = (p or {}).get('cx', W / 2), (p or {}).get('cy', H * 0.5)
    d = np.sqrt((_xx - cx) ** 2 + (_yy - cy) ** 2)
    r = math.hypot(W, H) * 0.62 * ease_in_out_cubic(u)
    band = np.exp(-((d - r) / 70.0) ** 2)
    disp = band * 22 * math.sin(math.pi * u)
    nx = (_xx - cx) / (d + 1e-3); ny = (_yy - cy) / (d + 1e-3)
    mapx = (_xx + nx * disp).astype(np.float32); mapy = (_yy + ny * disp).astype(np.float32)
    A = cv2.remap(a, mapx, mapy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    B = cv2.remap(b, mapx, mapy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    m = np.clip((r - d) / 40.0, 0, 1)[..., None]
    out = A * (1 - m) + B * m
    out = out + band[..., None] * np.array([40, 34, 22], np.float32) * math.sin(math.pi * u)
    return np.clip(out, 0, 255).astype(np.uint8)


def smoke(a, b, u, p=None):
    """Organic noise-driven dissolve rising upward (used for 'koku')."""
    if not hasattr(smoke, 'noise'):
        rng = np.random.default_rng(11)
        n = rng.random((H // 32, W // 32)).astype(np.float32)
        n = cv2.resize(n, (W, H), interpolation=cv2.INTER_CUBIC)
        n2 = cv2.resize(rng.random((H // 8, W // 8)).astype(np.float32), (W, H), interpolation=cv2.INTER_CUBIC)
        smoke.noise = cv2.GaussianBlur(n * 0.75 + n2 * 0.25, (0, 0), 6)
    grad = (_yy / H) * 0.9  # bottom first
    field = smoke.noise * 0.6 + grad * 0.7
    thr = mix(1.35, -0.1, ease_in_out_cubic(u))
    m = np.clip((field - thr) / 0.12, 0, 1)[..., None]
    return (a * (1 - m) + b * m).astype(np.uint8)


def splash(a, b, u, p=None):
    """Drop-like circular reveal with a bright rim (used for 'tat')."""
    cx, cy = (p or {}).get('cx', W / 2), (p or {}).get('cy', H * 0.42)
    d = np.sqrt((_xx - cx) ** 2 + (_yy - cy) ** 2)
    r = math.hypot(W, H) * 0.62 * ease_out_cubic(u) ** 1.2
    m = np.clip((r - d) / 25.0, 0, 1)[..., None]
    rim = np.exp(-((d - r) / 18.0) ** 2)[..., None] * (1 - u)
    out = a * (1 - m) + b * m + rim * np.array([255, 230, 190], np.float32) * 0.45
    return np.clip(out, 0, 255).astype(np.uint8)


def wipe_light(a, b, u, p=None):
    """Diagonal golden light sweep revealing b."""
    k = ease_in_out_cubic(u)
    pos = (_xx * 0.5 + _yy) / (W * 0.5 + H)
    edge = mix(-0.15, 1.15, k)
    m = np.clip((edge - pos) / 0.08, 0, 1)[..., None]
    glow = np.exp(-((pos - edge) / 0.05) ** 2)[..., None]
    out = a * (1 - m) + b * m + glow * np.array([255, 225, 170], np.float32) * 0.55
    return np.clip(out, 0, 255).astype(np.uint8)


def cut(a, b, u, p=None):
    return b if u >= 0.5 else a


TRANSITIONS = dict(dissolve=dissolve, blur=blur_dissolve, zoom=zoom_through, flash=light_flash,
                   iris=iris, ripple=ripple, smoke=smoke, splash=splash, wipe=wipe_light, cut=cut)
