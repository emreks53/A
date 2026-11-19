import sys; sys.path.insert(0, '/home/user/A/video-uretim/dar-i-hizmet/testler')
from insan_ortak import *
img, c, dt = tek(insan.POZLAR['ayakta'], 1500, x=540, y=1780)
print('sure', dt)
cv2.imwrite(f'{CIKTI}/insan_t1_ayakta_buyuk.png', cv2.cvtColor(kirp(img, 140, 180, 940, 1820), cv2.COLOR_RGB2BGR))
img, c, dt = tek(insan.POZLAR['ayakta'], 500, x=540, y=1500)
print('sure500', dt)
cv2.imwrite(f'{CIKTI}/insan_t1_ayakta_500.png', cv2.cvtColor(kirp(img, 340, 940, 740, 1540), cv2.COLOR_RGB2BGR))
