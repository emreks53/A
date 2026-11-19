import sys, time; sys.path.insert(0,'/home/user/A/video-uretim/dar-i-hizmet')
import numpy as np, cv2
from motor import *
from elemanlar import *
t0=time.time()
T=Tuval()
M=np.eye(3)
cic=[(560,1700,175,'allik'),(210,1640,150,'beyaz'),(900,1620,145,'seftali'),(380,1870,160,'gul'),(780,1890,165,'beyaz'),(60,1890,120,'seftali'),(1040,1820,130,'allik')]
# önden arkaya: çiçekler
for i,(x,y,r,c) in enumerate(sorted(cic,key=lambda q:-q[1])):
    sakayik(T, M, x, y, r, c, tohum=i)
for i,(x,y,r,c) in enumerate(cic):
    yaprak_kumesi(T, M, x, y+30, 1.25, tohum=i, renk_='#6E9A78', yog=0.42)
for i,(x,y,r,c) in enumerate(cic):
    okaliptus_dali(T, M, x-120+i*15, y+80, 380, aci=-98+i*5, tohum=i+3)
T.lavi(yol_dikdortgen(-20, 1250, 1100, 1940), M, '#E6D6BE', yog=0.5, kenar=2, dalga=0.15, islak=0.35, islak_gen=8, gran=0.14, akis=0.12, tohum=7)
uzak_agac_sirasi(T, M, -20, 1100, 1255, yuk=55, renk_='#A5B8B0', yog=0.45)
tepe_sirasi(T, M, -50, 1130, 1230, 90, '#B9C8CB', yog=0.32, tohum=4)
gok(T, M, bulutlar=[(250,420,330,120,1),(800,300,260,95,2),(640,760,300,100,3)])
out=son_islem(T.R)
cv2.imwrite('' + __import__('motor').ONBELLEK + '/../deneme_stil.png', cv2.cvtColor(rgb8(out), cv2.COLOR_RGB2BGR))
print('s', time.time()-t0)
