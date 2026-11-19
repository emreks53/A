"""Pafta 5: büyük yakın planlar (~1700 px kırpıntı): battaniyeli oturus_hasta ve yer tutucu ibrikle sula."""
import sys; sys.path.insert(0, '/home/user/A/video-uretim/dar-i-hizmet/testler')
from insan_ortak import *
from motor import yol_egri, yol_elips, yol_dikdortgen, yol_op, M_bilesik


def ibrik(t, M):
    """Yer tutucu ibrik (el çerçevesinde: köken avuç, +x parmak yönü; sap el içinden y boyunca geçer)."""
    govde = yol_egri([(42, -14), (58, -10), (66, 6), (60, 24), (42, 31), (24, 24), (18, 6), (26, -10)], True, 0.5)
    boyun = yol_egri([(35, -12), (36, -36), (32, -46), (52, -46), (48, -36), (49, -12)], True, 0.4)
    ag = yol_egri([(60, 2), (74, -8), (88, -30), (94, -38), (90, -40), (80, -26), (64, -8)], True, 0.4)
    taban = yol_egri([(30, 28), (54, 28), (56, 34), (28, 34)], True, 0.3)
    sap_dis = yol_egri([(34, -38), (14, -42), (0, -26), (0, 6), (14, 20), (24, 20), (24, 14), (12, 12), (6, 2),
                        (6, -22), (16, -34), (34, -31)], True, 0.45)
    for i, y in enumerate([ag, boyun, govde, taban]):
        t.lavi(y, M, '#C9A35C', yog=0.55, kenar=1.0, dalga=0.03, islak=1.0, islak_gen=2.5, gran=0.08, akis=0.08,
               tohum=40 + i)
    t.lavi(yol_egri([(40, -10), (56, -6), (62, 8), (56, 22)], False, 0.5), M, '#9C7434', yog=0.25, cizgi=4)
    t.sakla_ekle([ag, boyun, govde, taban], M)
    t.lavi(sap_dis, M, '#B48A43', yog=0.6, kenar=1.0, dalga=0.03, islak=1.0, islak_gen=2.5, gran=0.08, tohum=47)
    t.sakla_ekle(sap_dis, M)


parca = []
img, c, dt = tek(insan.POZLAR['oturus_hasta'], 2600, x=300, y=1880, battaniye=1.0)
print('oturus_hasta+battaniye', round(dt, 3))
parca.append(kirp(img, 0, 150, 1080, 1900))
img, c, dt = tek(insan.POZLAR['sula'], 1720, x=330, y=1880, elde=ibrik)
print('sula+ibrik', round(dt, 3))
parca.append(kirp(img, 0, 150, 1080, 1900))
pafta(parca, 'insan_pafta5_yakin_plan', ['oturus_hasta, battaniye=1', 'sula + ibrik (elde)'])
img, c, dt = tek(insan.sula_pozu(1.0), 1720, x=330, y=1880, elde=ibrik)
cv2.imwrite(f'{CIKTI}/insan_pafta5_yakin_sula_dok.png', cv2.cvtColor(kirp(img, 0, 150, 1080, 1900), cv2.COLOR_RGB2BGR))

# entegrasyon: esyalar.ciz_ibrik gerçek ibriğiyle sulama (sahnedeki gibi alt_el=ibrik_alt_nokta(egim)); dirsek gövde
# silüetinin içinde, uzak el kaidenin altında olmalı
try:
    import esyalar
except Exception as e:      # esyalar yoksa bu bölüm atlanır
    esyalar = None
    print('esyalar yok, gerçek ibrik atlandı:', e)
if esyalar is not None:
    parca = []
    for egim, dok in ((35.0, 0.0), (42.0, 0.25)):
        def elde_g(t, M, egim=egim):
            esyalar.ciz_ibrik(t, M, egim=egim, tohum=1)
        img, c, dt = tek(insan.sula_pozu(dok, alt_el=esyalar.ibrik_alt_nokta(egim)), 1140, x=330, y=1860,
                         elde=elde_g)
        print('sula+gercek ibrik', egim, round(dt, 3))
        parca.append(kirp(img, 60, 640, 1000, 1900))
    pafta(parca, 'insan_pafta5_gercek_ibrik', ['egim 35', 'egim 42, dok .25'])
