import sys, cv2, numpy as np, time
from film import Film
only = sys.argv[1].split(',')
ts = [float(x) for x in sys.argv[2].split(',')]
tag = sys.argv[3] if len(sys.argv) > 3 else 'shot'
F = Film(only)
imgs = []
for t in ts:
    a = time.time(); img = F.frame(t); print(t, round(time.time()-a,2), flush=True)
    imgs.append(cv2.resize(img, (360, 640), interpolation=cv2.INTER_AREA))
rows = [np.hstack(imgs[i:i+5] + [np.full((640,360,3),255,np.uint8)]*(5-len(imgs[i:i+5]))) for i in range(0, len(imgs), 5)]
cv2.imwrite(f'out/{tag}.png', np.vstack(rows)[..., ::-1])
