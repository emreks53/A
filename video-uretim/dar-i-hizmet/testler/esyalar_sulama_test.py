"""Entegrasyon: sola bakan adam (yon=-1) sula pozunda ibriği tutar, su fidanın dibine akar (sahne ölçeği ve yakın)."""
import sys; sys.path.insert(0, '/home/user/A/video-uretim/dar-i-hizmet/testler')
from esyalar_ortak import *
from motor import M_yerlestir
import elemanlar as el
import insan

parca = []
for (olc, egim, dok, ad) in ((0.95, 38.0, 0.0, 'sahne 0.95, egim 38'), (0.95, 20.0, 0.5, 'dok .5 egim 20'),
                             (1.9, 38.0, 0.0, 'yakin 1.9')):
    T = Tuval()
    ax, ay = (660, 1400) if olc < 1.5 else (760, 1800)
    M = M_yerlestir(ax, ay, olc)
    uc_kayit = {}

    def elde(tt, Mel):
        uc_kayit['uc'] = esyalar.ciz_ibrik(tt, Mel, egim=egim, tohum=1)
        uc_kayit['agiz'] = esyalar.ibrik_agzi(Mel, egim)
    alt = esyalar.ibrik_alt_nokta(egim)
    poz = insan.sula_pozu(dok, alt_el=alt)
    with Sure(ad):
        bilgi = insan.ciz_insan(T, M, poz, yon=-1, elde=elde)
    uc, yon = uc_kayit['agiz']
    hedef = (uc[0] - 60 * olc, ay - 5 * olc)
    esyalar.ciz_su_akisi(T, np.eye(3), uc, hedef, zaman=0.37, debi=1.0, yon=yon, kalinlik=6.5 * olc, tohum=3)
    T.lavi(yol_dikdortgen(-20, ay - 8 * olc, 1100, 1940), np.eye(3), '#C9B79C', yog=0.45, kenar=1.4, dalga=0.12,
           islak=0.5, islak_gen=4, gran=0.14, akis=0.12, tohum=3)
    el.gok(T, np.eye(3), bulutlar=[], ufuk=0.62, alt_yog=0.32, yog=0.85)
    img = bitir(T)
    if olc < 1.5:
        parca.append(etiket(kirp(img, 300, 750, 900, 1450), ad))
    else:
        parca.append(etiket(kirp(img, 150, 550, 1080, 1850), ad))
pafta(parca[:2], 'esyalar_sulama_sahne')
cv2.imwrite(f'{CIKTI}/esyalar_sulama_yakin.png', cv2.cvtColor(parca[2], cv2.COLOR_RGB2BGR))
