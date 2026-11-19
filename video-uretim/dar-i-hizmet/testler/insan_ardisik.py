"""Ardışık kare (30 fps) denetimi: her geçiş gerçek süresinde kare kare çizilir; ardışık kareler arası piksel farkı
dizisi (sıçrama = komşularından belirgin büyük fark) raporlanır ve en büyük farkın çevresindeki 10 ardışık kare +
fark görüntüsü şerit olarak kaydedilir. python3 insan_ardisik.py [boy=420] [ad1,ad2,...]"""
import sys; sys.path.insert(0, '/home/user/A/video-uretim/dar-i-hizmet/testler')
from insan_ortak import *

SURELER = {'secdeye': 1.0, 'secdeden_kalk': 0.9, 'dua_kaldir': 0.55, 'kalkis': 0.85}


def kare(ad, t, boy, kutu):
    fn = getattr(insan, ad)
    p = fn(t)
    kw = dict(ayakkabi=(ad == 'kalkis'))
    if ad == 'kalkis':
        kw.update(battaniye=1.0, battaniye_alfa=insan.kalkis_battaniye(t))
    s = boy / 600.0
    x0, y0, x1, y1 = kutu
    cx = 540 - (x0 + x1) / 2 * s
    gy = H - 300
    img, c, dt = tek(p, boy, x=cx, y=gy, **kw)
    return kirp(img, int(cx + x0 * s) - 10, int(gy + y0 * s) - 10, int(cx + x1 * s) + 10, int(gy + 20 * s))


if __name__ == '__main__':
    boy = int(sys.argv[1]) if len(sys.argv) > 1 else 420
    adlar = sys.argv[2].split(',') if len(sys.argv) > 2 else list(SURELER)
    for ad in adlar:
        n = int(round(SURELER[ad] * 30))
        ts = np.linspace(0, 1, n + 1)
        fn = getattr(insan, ad)
        kutular = np.array([insan.sinir_kutusu(fn(t)) for t in ts])
        kutu = (kutular[:, 0].min(), kutular[:, 1].min(), kutular[:, 2].max(), 0)
        kareler = [kare(ad, t, boy, kutu).astype(np.float32) for t in ts]
        fark = np.array([np.abs(kareler[i + 1] - kareler[i]).mean() for i in range(n)])
        # sıçrama ölçüsü: farkın komşu farkların ortalamasına oranı
        komsu = np.array([0.5 * (fark[max(0, i - 1)] + fark[min(n - 1, i + 1)]) for i in range(n)])
        oran = fark / np.maximum(komsu, 1e-3)
        i = int(np.argmax(oran))
        print(f'{ad:14s} {n} kare; fark ort {fark.mean():.3f} maks {fark.max():.3f}; komşu oranı maks {oran.max():.2f} '
              f'(kare {i}->{i + 1}, t={ts[i]:.3f})')
        print('   farklar:', ' '.join(f'{f:.2f}' for f in fark))
        j0 = max(0, min(n - 9, int(np.argmax(fark)) - 4))
        parca = [kareler[j].astype(np.uint8) for j in range(j0, j0 + 10)]
        et = [f'{ad} k{j} t={ts[j]:.3f}' for j in range(j0, j0 + 10)]
        pafta(parca, f'insan_ardisik_{ad}', et, sutun=5)
