import sys; sys.path.insert(0, '/home/user/A/video-uretim/dar-i-hizmet/testler')
from insan_ortak import *
p = insan.POZLAR['ayakta']
img, c, dt = tek(p, 5000, x=420, y=4940, zemin_ciz=False)
cv2.imwrite(f'{CIKTI}/bas_buyuk.png', cv2.cvtColor(kirp(img, 0, 0, 1080, 760), cv2.COLOR_RGB2BGR))
