import math, os, functools
import numpy as np
import skia

# Working folder for heavy files (clips, plates, renders). Set VIDEO_ROOT to change it.
ROOT = os.environ.get('VIDEO_ROOT', os.path.expanduser('~/video-calisma'))
FONTS = ROOT + '/fonts'
W, H, FPS = 1080, 1920, 30

GOLD = (233, 199, 123)
GOLD_HI = (255, 236, 196)
GOLD_DEEP = (185, 138, 62)
IVORY = (251, 245, 233)


def clamp(x, a=0.0, b=1.0):
    return a if x < a else b if x > b else x


def mix(a, b, t):
    return a + (b - a) * t


def lin(t0, t1, t):
    if t1 == t0:
        return 1.0 if t >= t1 else 0.0
    return clamp((t - t0) / (t1 - t0))


def smooth(t):
    t = clamp(t)
    return t * t * (3 - 2 * t)


def ease_out_cubic(t):
    t = clamp(t)
    return 1 - (1 - t) ** 3


def ease_in_cubic(t):
    t = clamp(t)
    return t ** 3


def ease_in_out_cubic(t):
    t = clamp(t)
    return 4 * t ** 3 if t < 0.5 else 1 - (-2 * t + 2) ** 3 / 2


def ease_out_expo(t):
    t = clamp(t)
    return 1.0 if t >= 1 else 1 - 2 ** (-10 * t)


def ease_in_out_sine(t):
    t = clamp(t)
    return -(math.cos(math.pi * t) - 1) / 2


def ease_out_back(t, s=1.70158):
    t = clamp(t)
    t -= 1
    return t * t * ((s + 1) * t + s) + 1


def pulse(t0, t_in, t_hold, t_out, t):
    """0->1 over t_in, hold, 1->0 over t_out."""
    if t < t0:
        return 0.0
    a = ease_out_cubic(lin(t0, t0 + t_in, t))
    b = 1 - ease_in_out_sine(lin(t0 + t_in + t_hold, t0 + t_in + t_hold + t_out, t))
    return min(a, b)


@functools.lru_cache(maxsize=None)
def typeface(name):
    return skia.Typeface.MakeFromFile(os.path.join(FONTS, name))


def font(name, size):
    f = skia.Font(typeface(name), size)
    f.setSubpixel(True)
    f.setEdging(skia.Font.Edging.kAntiAlias)
    f.setHinting(skia.FontHinting.kNone)
    return f


def col(rgb, a=1.0):
    return skia.Color4f(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255, clamp(a))


def hash01(*args):
    """Deterministic pseudo random in [0,1)."""
    x = 0
    for a in args:
        x = (x * 1000003) ^ int(a * 9973 + 0.5)
    x = (x ^ (x >> 13)) * 1274126177 & 0xFFFFFFFF
    x ^= x >> 16
    return (x & 0xFFFFFF) / float(0x1000000)
