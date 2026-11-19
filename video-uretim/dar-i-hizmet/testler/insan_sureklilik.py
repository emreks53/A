"""Geçişlerin sürekliliği (titreme / sıçrama denetimi): her geçiş N adımda örneklenir; eklemler, el ve ayak
çerçevesi köşeleri ve baş noktalarının adım başına en büyük yer değişimi, ikinci farkı (ivme) ve uç pozlarla
uyum raporlanır. Ayrıca yere basan noktaların (avuç, ayak, diz) temas boyunca kaymadığı ölçülür.
python3 insan_sureklilik.py [N=400]"""
import sys; sys.path.insert(0, '/home/user/A/video-uretim/dar-i-hizmet')
import numpy as np
import insan

N = int(sys.argv[1]) if len(sys.argv) > 1 else 400


def noktalar(p):
    sk = insan.iskelet(p)
    pts = [sk[k] for k in ('kok', 'N', 'Hp', 'S_on', 'E_on', 'Wr_on', 'S_ar', 'E_ar', 'Wr_ar', 'K_on', 'A_on', 'K_ar',
                           'A_ar', 'avuc_on', 'avuc_ar')]
    for t in ('on', 'ar'):
        pts += list(insan._uygula(sk['M_el_' + t], [(0, -10), (62, 0), (0, 10)]))
        pts += list(insan._uygula(sk['M_ayak_' + t], [(-20, 26), (50, 26), (75, 20)]))
    pts += list(insan._uygula(sk['M_bas'], [(29.4, -33), (-30, -40), (35, 10)]))
    ek = [p['yan_on'] * 20, p['yan_ar'] * 20, p.get('duz_on', 0) * 20, p.get('duz_ar', 0) * 20, p['kivrim_on'] * 20,
          p['kivrim_ar'] * 20]
    return np.array(pts), np.array(ek)


def denetle(ad, fn, a=None, b=None):
    us = np.linspace(0, 1, N + 1)
    P, E = zip(*[noktalar(fn(u)) for u in us])
    P, E = np.array(P), np.array(E)
    v = np.linalg.norm(P[1:] - P[:-1], axis=2).max(1)          # adım başına en büyük yer değişimi
    acc = np.linalg.norm(P[2:] - 2 * P[1:-1] + P[:-2], axis=2).max(1)
    ev = np.abs(E[1:] - E[:-1]).max(1)
    i = int(np.argmax(acc))
    print(f'{ad:14s} adim maks {v.max():6.2f} (ort {v.mean():5.2f})  ivme maks {acc.max():5.2f} @u={us[i + 1]:.3f} '
          f'(ivme/hiz oranı {acc.max() / max(v.max(), 1e-9):.3f})  el-param maks {ev.max():.2f}')
    for ad_u, ref in (('0', a), ('1', b)):
        if ref is not None:
            d = np.abs(noktalar(fn(float(ad_u)))[0] - noktalar(ref)[0]).max()
            print(f'      u={ad_u} uç pozdan sapma {d:.3f}')
    return us, P


def temas(ad, fn, u0, u1, sec):
    us = np.linspace(u0, u1, 120)
    Q = np.array([sec(insan.iskelet(fn(u))) for u in us])
    print(f'      temas {ad:22s} [{u0:.2f},{u1:.2f}] kayma maks {np.abs(Q - Q[0]).max():.3f}')


P = insan.POZLAR
denetle('secdeye', insan.secdeye, P['diz_dua'], P['secde'])
temas('secdeye avuc', insan.secdeye, insan.secdeye_temas_t(), 1.0, lambda sk: np.r_[sk['avuc_on'], sk['avuc_ar']])
temas('secdeye diz+parmak', insan.secdeye, 0.0, 1.0,
      lambda sk: np.r_[sk['K_on'], insan._nokta(sk['M_ayak_on'], (insan.TOP_X, 26.0))])
denetle('secdeden_kalk', insan.secdeden_kalk, P['secde'], P['diz_otur'])
temas('secdeden_kalk avuc', insan.secdeden_kalk, 0.0, insan.SECDE_KALK_EL, lambda sk: np.r_[sk['avuc_on'], sk['avuc_ar']])
temas('secdeden_kalk diz', insan.secdeden_kalk, 0.0, 1.0, lambda sk: sk['K_on'])
denetle('dua_kaldir', insan.dua_kaldir, P['diz_otur'], P['diz_sukur'])
temas('dua_kaldir diz', insan.dua_kaldir, 0.0, 1.0, lambda sk: sk['K_on'])
denetle('kalkis', insan.kalkis, P['oturus_dik'], P['kalkis_4'])
tk = insan.kalkis_temas_t()
temas('kalkis ayak', insan.kalkis, tk['ayak'], 1.0,
      lambda sk: np.r_[insan._nokta(sk['M_ayak_on'], (insan.TOP_X, 26.0)), insan._nokta(sk['M_ayak_ar'], (insan.TOP_X, 26.0))])
temas('kalkis yerdeki avuc', insan.kalkis, tk['yer'][0], tk['yer'][1], lambda sk: np.r_[sk['avuc_on'], sk['avuc_ar']])
temas('kalkis kalca (oturuk)', insan.kalkis, 0.0, insan.KALKIS_YUKSELIS - 0.01, lambda sk: sk['kok'])
denetle('sula dok', lambda u: insan.sula_pozu(u))
import esyalar
denetle('sula sahne', lambda u: insan.sula_pozu(0.25 * u, alt_el=esyalar.ibrik_alt_nokta(33.0 + 9.0 * u)))
denetle('yuruyus', insan.yuruyus)
