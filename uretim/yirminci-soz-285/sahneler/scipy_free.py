import numpy as np


def smooth_closed(pts, it=2):
    """Chaikin köşe kesme (kapalı çokgen)."""
    p = np.asarray(pts, np.float64)
    for _ in range(it):
        q = np.roll(p, -1, axis=0)
        a = 0.75 * p + 0.25 * q
        b = 0.25 * p + 0.75 * q
        p = np.empty((2 * len(a), 2))
        p[0::2] = a
        p[1::2] = b
    return p


def smooth_open(pts, it=2):
    p = np.asarray(pts, np.float64)
    for _ in range(it):
        a = 0.75 * p[:-1] + 0.25 * p[1:]
        b = 0.25 * p[:-1] + 0.75 * p[1:]
        q = np.empty((2 * len(a), 2))
        q[0::2] = a
        q[1::2] = b
        p = np.vstack([p[:1], q, p[-1:]])
    return p
