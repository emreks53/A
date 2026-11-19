"""yon=-1 (sola bakış), farklı ışık, nefes, sakla_sonra ve belirlenimcilik denetimi."""
import sys; sys.path.insert(0, '/home/user/A/video-uretim/dar-i-hizmet/testler')
from insan_ortak import *
parca, et = [], []
for ad, yon, isik in [('ayakta', -1, (0.6, -0.8)), ('sula', -1, (0.6, -0.8)), ('diz_dua', -1, (-0.6, -0.8)),
                      ('yuru_1', 1, (0.7, -0.7)), ('oturus_dik', 1, (0.2, -1.0))]:
    p = insan.POZLAR[ad]
    img, c, dt = tek(p, 700, x=540, y=1500, yon=yon, isik=isik)
    parca.append(kirp(img, 260, 1500 - 760, 820, 1530))
    et.append(f'{ad} yon={yon} isik={isik}')
pafta(parca, 'insan_yon_isik', et)
# belirlenimcilik
a, _, _ = tek(insan.POZLAR['secde'], 500, battaniye=0.0)
b, _, _ = tek(insan.POZLAR['secde'], 500, battaniye=0.0)
print('ayni mi:', np.array_equal(a, b))
# nefes farkı
sk0 = insan.iskelet(insan.POZLAR['ayakta'], 0.0); sk5 = insan.iskelet(insan.POZLAR['ayakta'], 0.5)
print('nefes omuz dy', sk5['S_on'] - sk0['S_on'], 'bas dy', sk5['Hp'] - sk0['Hp'])
# sakla_sonra=False saklamayı değiştirmemeli
T = Tuval()
insan.ciz_insan(T, M_bilesik(M_oteleme(540, 1500), M_olcek(1)), insan.POZLAR['ayakta'], sakla_sonra=False)
print('sakla_sonra=False ->', T.saklama is None or float(T.saklama.max()))
T = Tuval()
c = insan.ciz_insan(T, M_bilesik(M_oteleme(540, 1500), M_olcek(1)), insan.POZLAR['ayakta'])
print('sakla max', float(T.saklama.max()), {k: np.round(v, 1) for k, v in c.items() if k not in ('yerel', 'iskelet')})
