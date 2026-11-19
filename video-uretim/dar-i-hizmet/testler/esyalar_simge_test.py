"""Simgeler: her biri büyük (~600 px) + kullanım ölçeğinde halkaları içinde üçlü sıra (sahnedeki gibi)."""
import sys; sys.path.insert(0, '/home/user/A/video-uretim/dar-i-hizmet/testler')
from esyalar_ortak import *
from motor import M_yerlestir
import elemanlar as el

fonk = [('meyve', esyalar.ciz_meyve_tabagi), ('kese', esyalar.ciz_kese), ('madalya', esyalar.ciz_madalya)]
parca = []
for ad, f in fonk:
    T = Tuval()
    M = M_yerlestir(540, 960, 2.6)
    with Sure(f'{ad} buyuk'):
        f(T, M, olcek=1.0, tohum=1)
    img = bitir(T)
    parca.append(etiket(kirp(img, 220, 620, 860, 1300), ad))
pafta(parca, 'esyalar_simge_buyuk')

# kullanım ölçeği: halkalar içinde, gök önünde (sahne gibi)
T = Tuval()
xs = [250, 540, 830]
for i, (ad, f) in enumerate(fonk):
    Ms = M_yerlestir(xs[i], 520, 0.9)
    with Sure(f'{ad} kucuk'):
        f(T, Ms, olcek=1.0, tohum=i + 1)
    with Sure('halka'):
        esyalar.ciz_simge_halkasi(T, Ms, 150, '#F1E3D3', ilerleme=1.0, tohum=i + 5)
el.gok(T, np.eye(3), bulutlar=[(200, 300, 300, 100, 41), (850, 470, 240, 85, 42)], ufuk=0.62, alt_yog=0.32, yog=0.85)
img = bitir(T)
sira = kirp(img, 0, 300, 1080, 760)
cv2.imwrite(f'{CIKTI}/esyalar_simge_sira.png', cv2.cvtColor(sira, cv2.COLOR_RGB2BGR))

# halka açılması
parca = []
for p in (0.15, 0.35, 0.6, 0.85, 1.0):
    T = Tuval()
    Ms = M_yerlestir(540, 960, 1.2)
    esyalar.ciz_kese(T, Ms, olcek=min(1.0, 0.6 + 0.4 * p), tohum=2)
    esyalar.ciz_simge_halkasi(T, Ms, 150, '#F1E3D3', ilerleme=p, tohum=6)
    img = bitir(T)
    parca.append(etiket(kirp(img, 340, 760, 740, 1160), f'halka {p}'))
pafta(parca, 'esyalar_halka_acilma')
