import numpy as np
from PIL import Image
rng = np.random.default_rng(7)
def spectral(n, sx, sy, seed, power=None):
    r = np.random.default_rng(seed)
    w = r.standard_normal((n, n))
    F = np.fft.fft2(w)
    ky = np.fft.fftfreq(n)[:, None]; kx = np.fft.fftfreq(n)[None, :]
    G = np.exp(-((kx/sx)**2 + (ky/sy)**2))
    out = np.real(np.fft.ifft2(F*G))
    out = (out - out.mean())/ (out.std()+1e-9)
    return out
N=1024
# bristle striation texture: horizontal streaks (elongated along x => low kx bandwidth, high ky bandwidth)
b = 0.55*spectral(N, 0.004, 0.09, 1) + 0.30*spectral(N, 0.010, 0.25, 2) + 0.35*spectral(N, 0.003, 0.012, 3)
# low-frequency unevenness of coverage
b += 0.35*spectral(N, 0.006, 0.006, 4)
b = np.tanh(b*0.55)
img = np.clip(128 + b*70, 0, 255).astype(np.uint8)
Image.fromarray(img, 'L').save('../engine/tex/bristle.png')
# shader noise RGBA: R low-freq value, G mid isotropic, B fine isotropic (edge wobble), A bristle fine anisotropic
R = spectral(N, 0.01, 0.01, 11); G = spectral(N, 0.04, 0.04, 12); B = spectral(N, 0.12, 0.12, 13); A = spectral(N, 0.02, 0.30, 14)
def u8(x, s=0.2): return np.clip(127.5 + x*127.5*s/0.2*0.6, 0, 255).astype(np.uint8)
rgba = np.stack([u8(R), u8(G), u8(B), u8(A)], -1)
Image.fromarray(rgba, 'RGBA').save('../engine/tex/noise.png')
# paper: cold press grain heightfield (tileable 1024), cream color applied in shader
P = 0.6*spectral(N, 0.05, 0.05, 21) + 0.5*spectral(N, 0.15, 0.15, 22) + 0.35*spectral(N, 0.012, 0.012, 23)
# fibers: thin long random lines
fib = np.zeros((N,N))
for i in range(1400):
    x0, y0 = rng.uniform(0,N,2); ang = rng.uniform(0, np.pi); L = rng.uniform(10, 60)
    t = np.linspace(0,1,int(L*2))
    xs = (x0 + np.cos(ang)*L*t + 3*np.sin(t*6+rng.uniform(0,6))).astype(int)%N
    ys = (y0 + np.sin(ang)*L*t + 3*np.cos(t*5+rng.uniform(0,6))).astype(int)%N
    fib[ys, xs] += rng.uniform(0.3,1.0)
from numpy.fft import fft2, ifft2
ky = np.fft.fftfreq(N)[:, None]; kx = np.fft.fftfreq(N)[None, :]
fib = np.real(ifft2(fft2(fib)*np.exp(-((kx**2+ky**2)/(0.25**2)))))
P = P/P.std()*0.5 + fib/ (fib.std()+1e-9)*0.12
P = np.tanh(P)
Image.fromarray(np.clip(128+P*90,0,255).astype(np.uint8),'L').save('../engine/tex/paper.png')
print('ok', img.std(), P.std())

# ---- dab texture: overlapping horizontal gouache dabs (tileable), mid-gray centered
from PIL import ImageDraw, ImageFilter
M = 1024
r2 = np.random.default_rng(99)
acc = np.zeros((M, M), np.float32) + 0.5
yy, xx = np.mgrid[0:M, 0:M]
bristle_fine = spectral(M, 0.002, 0.35, 31)  # very fine horizontal lines
for k in range(2600):
    L = r2.uniform(50, 190); H = r2.uniform(7, 20)
    cx, cy = r2.uniform(0, M), r2.uniform(0, M)
    ang = r2.normal(0, 0.05)
    val = 0.5 + r2.normal(0, 0.13)
    x0, x1 = int(cx - L/2 - 4), int(cx + L/2 + 4); y0, y1 = int(cy - H/2 - 6), int(cy + H/2 + 6)
    xs = np.arange(x0, x1); ys = np.arange(y0, y1)
    X, Y = np.meshgrid(xs, ys)
    lx = (X - cx)*np.cos(ang) + (Y - cy)*np.sin(ang)
    ly = -(X - cx)*np.sin(ang) + (Y - cy)*np.cos(ang)
    # ragged ends + bristle gaps
    bx = bristle_fine[Y % M, X % M]
    endn = (L/2) * (1 - 0.18*np.abs(np.sin(ly*0.9 + k)) ) - 6*np.clip(bx, -1, 1)
    inside = (np.abs(lx) < endn) & (np.abs(ly) < H/2*(1 - 0.25*(lx/endn)**6))
    alpha = inside * np.clip(0.75 + 0.25*bx, 0, 1)
    # bristle streak value inside stroke
    v = val + 0.06*bx
    sl = (Y % M, X % M)
    acc[sl] = acc[sl]*(1-alpha) + v*alpha
acc = np.clip(acc, 0, 1)
Image.fromarray((acc*255).astype(np.uint8), 'L').save('../engine/tex/dabs.png')
print('dabs', acc.std())
