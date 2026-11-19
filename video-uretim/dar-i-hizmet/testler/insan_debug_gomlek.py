import sys; sys.path.insert(0, '/home/user/A/video-uretim/dar-i-hizmet')
import numpy as np, cv2, insan
CIKTI = '/tmp/claude-0/-home-user-A/85bb5f62-9c14-511e-812b-04cd495560e5/scratchpad/testler'
out = []
for ad in sys.argv[1].split(','):
    p = insan.POZLAR[ad]
    sk = insan.iskelet(p)
    yol, e = insan._gomlek_yolu(sk, p)
    img = np.full((700, 700, 3), 255, np.uint8)
    o = np.array([250, 600]); s = 1.6
    P = lambda q: tuple(int(v) for v in (o + np.asarray(q) * s))
    # outline of shirt
    pts = []
    it = skia_iter = None
    import skia
    path = yol
    for i in range(0, 400):
        r = skia.PathMeasure(path, False)
        break
    pm = skia.PathMeasure(path, True)
    L = pm.getLength()
    poly = [pm.getPosTan(L * i / 600)[0] for i in range(600)]
    poly = np.array([[q.x(), q.y()] for q in poly])
    cv2.polylines(img, [np.int32(o + poly * s)], True, (200, 120, 60), 1, cv2.LINE_AA)
    for k, c in (('F0', (0, 0, 255)), ('F1', (0, 128, 255)), ('B0', (0, 160, 0)), ('B1', (160, 160, 0))):
        cv2.circle(img, P(e[k]), 4, c, -1)
        cv2.putText(img, k, P(e[k]), cv2.FONT_HERSHEY_SIMPLEX, 0.5, c, 1)
    for k in ('kok', 'K_on', 'A_on', 'N', 'S_on'):
        cv2.circle(img, P(sk[k]), 3, (0, 0, 0), -1)
        cv2.putText(img, k, P(sk[k]), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 0), 1)
    cv2.line(img, P((-200, 0)), P((300, 0)), (150, 150, 150), 1)
    cv2.putText(img, ad, (10, 20), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 1)
    out.append(img)
cv2.imwrite(f'{CIKTI}/insan_debug_gomlek.png', np.hstack(out))
