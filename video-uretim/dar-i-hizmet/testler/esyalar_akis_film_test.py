"""Su akışı ve diğer zamanlı öğeler: ardışık kareler (1/30 sn) — titreme/sıçrama denetimi + determinizm."""
import sys; sys.path.insert(0, '/home/user/A/video-uretim/dar-i-hizmet/testler')
from esyalar_ortak import *
from motor import M_yerlestir


def kare(z, egim=48):
    T = Tuval()
    M = M_bilesik(M_oteleme(250, 600), M_olcek(2.0))
    uc = esyalar.ciz_ibrik(T, M, egim=egim, tohum=1)
    _, yon = esyalar.ibrik_agzi(M, egim)
    esyalar.ciz_su_akisi(T, np.eye(3), uc, (uc[0] + 260, 1250), zaman=z, debi=1.0, yon=yon, kalinlik=13, tohum=2)
    return bitir(T)


ims = [kare(i / 30.0) for i in range(8)]
a = kare(0.2)
b = kare(0.2)
print('determinizm farkı:', int(np.abs(a.astype(int) - b.astype(int)).max()))
d = [float(np.abs(ims[i + 1].astype(int) - ims[i].astype(int)).mean()) for i in range(7)]
print('ardışık ortalama fark:', [round(x, 3) for x in d])
parca = [etiket(kirp(im, 480, 700, 760, 1280), f'{i}/30') for i, im in enumerate(ims)]
pafta(parca, 'esyalar_akis_film')
