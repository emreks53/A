"""Shared helpers for studio S8 shots (sh12, sh14c).

Numpy terrain synthesis (gradient noise, fBm, ridged and erosion-like noise), node-building
shortcuts and a cheap physically-motivated aerial-perspective shader group.
"""
import math, random
import numpy as np
import bpy


# --------------------------------------------------------------------------- numpy noise

class Noise2:
    """Seeded 2D gradient (Perlin) noise with analytic derivatives, vectorised over numpy arrays."""

    def __init__(self, seed=0):
        rs = np.random.RandomState(seed)
        p = rs.permutation(256)
        self.perm = np.concatenate([p, p]).astype(np.int64)
        ang = rs.uniform(0, 2 * np.pi, 256)
        self.gx = np.cos(ang)
        self.gy = np.sin(ang)

    def __call__(self, x, y, deriv=False):
        xi = np.floor(x).astype(np.int64)
        yi = np.floor(y).astype(np.int64)
        xf = x - xi
        yf = y - yi
        xi &= 255
        yi &= 255
        P = self.perm

        def g(ix, iy, dx, dy):
            h = P[P[ix] + iy]
            gx, gy = self.gx[h], self.gy[h]
            return gx * dx + gy * dy, gx, gy

        n00, gx00, gy00 = g(xi, yi, xf, yf)
        n10, gx10, gy10 = g(xi + 1, yi, xf - 1, yf)
        n01, gx01, gy01 = g(xi, yi + 1, xf, yf - 1)
        n11, gx11, gy11 = g(xi + 1, yi + 1, xf - 1, yf - 1)
        u = xf * xf * xf * (xf * (xf * 6 - 15) + 10)
        v = yf * yf * yf * (yf * (yf * 6 - 15) + 10)
        a = n00
        b = n10 - n00
        c = n01 - n00
        d = n00 - n10 - n01 + n11
        val = a + b * u + c * v + d * u * v
        if not deriv:
            return val * 1.4
        du = 30 * xf * xf * (xf * (xf - 2) + 1)
        dv = 30 * yf * yf * (yf * (yf - 2) + 1)
        # gradient of the interpolated value (ignoring gradient-vector interpolation terms is fine here)
        ga = gx00 + (gx10 - gx00) * u + (gx01 - gx00) * v + (gx00 - gx10 - gx01 + gx11) * u * v
        gb = gy00 + (gy10 - gy00) * u + (gy01 - gy00) * v + (gy00 - gy10 - gy01 + gy11) * u * v
        dx = ga + (b + d * v) * du
        dy = gb + (c + d * u) * dv
        return val * 1.4, dx * 1.4, dy * 1.4


def fbm(n, x, y, octaves=6, lac=2.0, gain=0.5, freq=1.0):
    amp, f, s, norm = 1.0, freq, 0.0, 0.0
    for i in range(octaves):
        s = s + amp * n(x * f + i * 17.13, y * f - i * 9.71)
        norm += amp
        amp *= gain
        f *= lac
    return s / norm


def ridged(n, x, y, octaves=6, lac=2.0, gain=0.5, freq=1.0, sharp=2.0):
    """Ridged multifractal: sharp crests, each octave weighted by the previous one."""
    amp, f, s, w, norm = 1.0, freq, 0.0, 1.0, 0.0
    for i in range(octaves):
        r = 1.0 - np.abs(n(x * f + i * 31.7, y * f + i * 11.3))
        r = r ** sharp
        r = r * w
        w = np.clip(r * 1.6, 0, 1)
        s = s + r * amp
        norm += amp
        amp *= gain
        f *= lac
    return s / norm


def erosion_fbm(n, x, y, octaves=8, lac=2.0, gain=0.5, freq=1.0, k=1.2):
    """Derivative-damped fBm (I. Quilez): slopes suppress finer octaves -> smooth valleys,
    gullied flanks, an eroded look without simulation."""
    amp, f, s, norm = 1.0, freq, 0.0, 0.0
    dxs = np.zeros_like(x)
    dys = np.zeros_like(x)
    for i in range(octaves):
        v, dx, dy = n(x * f + i * 13.1, y * f - i * 7.7, deriv=True)
        dxs = dxs + dx * amp * f
        dys = dys + dy * amp * f
        s = s + amp * v / (1.0 + k * (dxs * dxs + dys * dys))
        norm += amp
        amp *= gain
        f *= lac
    return s / norm


# --------------------------------------------------------------------------- polylines

def catmull(points, samples_per_seg=24):
    pts = [np.array(p, float) for p in points]
    pts = [pts[0]] + pts + [pts[-1]]
    out = []
    for i in range(1, len(pts) - 2):
        p0, p1, p2, p3 = pts[i - 1], pts[i], pts[i + 1], pts[i + 2]
        for t in np.linspace(0, 1, samples_per_seg, endpoint=False):
            t2, t3 = t * t, t * t * t
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
                              (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    out.append(pts[-2])
    return np.array(out)


def dist_to_polyline(px, py, poly, chunk=200000):
    """Distance from each point to polyline + the polyline parameter (0..1) of the closest point."""
    a = poly[:-1]
    b = poly[1:]
    ab = b - a
    seglen = np.linalg.norm(ab, axis=1)
    cum = np.concatenate([[0], np.cumsum(seglen)])
    total = cum[-1]
    ab2 = (ab ** 2).sum(1) + 1e-9
    flat_x = px.ravel()
    flat_y = py.ravel()
    D = np.empty_like(flat_x)
    T = np.empty_like(flat_x)
    for s in range(0, flat_x.size, chunk):
        X = flat_x[s:s + chunk, None]
        Y = flat_y[s:s + chunk, None]
        t = ((X - a[None, :, 0]) * ab[None, :, 0] + (Y - a[None, :, 1]) * ab[None, :, 1]) / ab2[None]
        t = np.clip(t, 0, 1)
        cx = a[None, :, 0] + t * ab[None, :, 0]
        cy = a[None, :, 1] + t * ab[None, :, 1]
        d2 = (X - cx) ** 2 + (Y - cy) ** 2
        j = np.argmin(d2, axis=1)
        D[s:s + chunk] = np.sqrt(d2[np.arange(len(j)), j])
        T[s:s + chunk] = (cum[j] + t[np.arange(len(j)), j] * seglen[j]) / total
    return D.reshape(px.shape), T.reshape(px.shape)


# --------------------------------------------------------------------------- mesh from grid

def grid_mesh(name, X, Y, Z, attrs=None):
    """Build a quad-grid mesh from 2D arrays (rows x cols) using foreach_set (fast).
    attrs: {name: 2D float array} stored as POINT float attributes."""
    rows, cols = X.shape
    me = bpy.data.meshes.new(name)
    nv = rows * cols
    co = np.stack([X.ravel(), Y.ravel(), Z.ravel()], 1).astype(np.float32)
    r = np.arange(rows - 1)[:, None]
    c = np.arange(cols - 1)[None, :]
    v0 = (r * cols + c).ravel()
    quads = np.stack([v0, v0 + 1, v0 + cols + 1, v0 + cols], 1).astype(np.int32)
    nf = len(quads)
    me.vertices.add(nv)
    me.vertices.foreach_set("co", co.ravel())
    me.loops.add(nf * 4)
    me.loops.foreach_set("vertex_index", quads.ravel())
    me.polygons.add(nf)
    me.polygons.foreach_set("loop_start", (np.arange(nf) * 4).astype(np.int32))
    me.update(calc_edges=True)
    me.polygons.foreach_set("use_smooth", np.ones(nf, dtype=bool))
    for k, arr in (attrs or {}).items():
        a = me.attributes.new(k, "FLOAT", "POINT")
        a.data.foreach_set("value", np.asarray(arr, np.float32).ravel())
    me.update()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    return ob


# --------------------------------------------------------------------------- node helpers

class NB:
    """Tiny node-tree builder: nb.n('ShaderNodeMath', operation='MULTIPLY', inputs={1: 2.0})."""

    def __init__(self, nt):
        self.nt = nt

    def n(self, typ, inputs=None, **props):
        node = self.nt.nodes.new(typ)
        for k, v in props.items():
            setattr(node, k, v)
        for k, v in (inputs or {}).items():
            node.inputs[k].default_value = v
        return node

    def l(self, a, b):
        self.nt.links.new(a, b)

    def math(self, op, a, b=None, clamp=False):
        m = self.n("ShaderNodeMath", operation=op, use_clamp=clamp)
        for i, v in enumerate((a, b)):
            if v is None:
                continue
            if isinstance(v, (int, float)):
                m.inputs[i].default_value = v
            else:
                self.l(v, m.inputs[i])
        return m.outputs[0]

    def mixc(self, fac, a, b, blend="MIX"):
        m = self.n("ShaderNodeMix", data_type="RGBA", blend_type=blend)
        for sock, v in ((m.inputs[0], fac), (m.inputs[6], a), (m.inputs[7], b)):
            if isinstance(v, (int, float)):
                sock.default_value = v
            elif isinstance(v, tuple):
                sock.default_value = (*v[:3], 1) if len(v) == 3 else v
            else:
                self.l(v, sock)
        return m.outputs[2]

    def mapr(self, v, a, b, c=0.0, d=1.0, interp="SMOOTHSTEP", clamp=True):
        m = self.n("ShaderNodeMapRange", interpolation_type=interp, clamp=clamp)
        if isinstance(v, (int, float)):
            m.inputs[0].default_value = v
        else:
            self.l(v, m.inputs[0])
        m.inputs[1].default_value = a
        m.inputs[2].default_value = b
        m.inputs[3].default_value = c
        m.inputs[4].default_value = d
        return m.outputs[0]

    def attr(self, name):
        a = self.n("ShaderNodeAttribute", attribute_name=name)
        return a.outputs["Fac"]

    def noise(self, vec, scale, detail=4.0, rough=0.5, dims="3D", lac=2.0):
        nz = self.n("ShaderNodeTexNoise", noise_dimensions=dims)
        nz.inputs["Scale"].default_value = scale
        nz.inputs["Detail"].default_value = detail
        nz.inputs["Roughness"].default_value = rough
        nz.inputs["Lacunarity"].default_value = lac
        if vec is not None:
            self.l(vec, nz.inputs["Vector"])
        return nz.outputs["Fac"]


def rng(seed):
    return random.Random(seed)


def smoother_np(x):
    x = np.clip(x, 0, 1)
    return x * x * x * (x * (x * 6 - 15) + 10)


def interp_grid(F, X, Y, px, py, y0, y1, pw, rows, cols, half0, spread_deg, upow=1.25):
    """Bilinear sample of a wedge_grid field F at world points (px, py)."""
    v = np.clip((py - y0) / (y1 - y0), 0, 1) ** (1.0 / pw) * (rows - 1)
    half = half0 + (py - y0) * math.tan(math.radians(spread_deg))
    ul = np.clip(px / half, -1, 1)
    u = np.sign(ul) * np.abs(ul) ** (1.0 / upow)
    c = (u + 1) * 0.5 * (cols - 1)
    r0 = np.clip(np.floor(v).astype(int), 0, rows - 2)
    c0 = np.clip(np.floor(c).astype(int), 0, cols - 2)
    fr = v - r0
    fc = c - c0
    return (F[r0, c0] * (1 - fr) * (1 - fc) + F[r0 + 1, c0] * fr * (1 - fc) +
            F[r0, c0 + 1] * (1 - fr) * fc + F[r0 + 1, c0 + 1] * fr * fc)
