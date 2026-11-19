"""Kapanis sahnesi: ortak ayarlar, kitap listesi ve cilt kesit geometrisi.

Birimler metre (aksi belirtilmedikce).
"""
import math
import os

KOK = os.path.dirname(os.path.abspath(__file__))
FONT_DIR = os.path.abspath(os.path.join(KOK, "..", "fontlar"))
FONT_600 = os.path.join(FONT_DIR, "eb-garamond-600.ttf")
FONT_500 = os.path.join(FONT_DIR, "eb-garamond-500.ttf")

SCRATCH = "/tmp/claude-0/-home-user-A/85bb5f62-9c14-511e-812b-04cd495560e5/scratchpad/kapanis"
VARLIK = os.path.join(SCRATCH, "varlik")
DOKU = os.path.join(SCRATCH, "doku")
KARELER = os.path.join(SCRATCH, "kareler")
TEST = os.path.join(SCRATCH, "test")

# Risale-i Nur (RNK buyuk boy): sirt yuksekligi 240 mm, kapak eni 170 mm
KITAP_H = 0.240
KITAP_D = 0.170

ORAN = {
    "Sözler": 0.1869,
    "Mektubat": 0.131,
    "Lem’alar": 0.115,
    "Şuâlar": 0.1582,
    "Mesnevî-i Nûriye": 0.0724,
    "İşârâtü’l-İ’câz": 0.0844,
    "Barla Lâhikası": 0.1003,
    "Kastamonu Lâhikası": 0.0751,
    "Emirdağ Lâhikası": 0.1097,
    "Sikke-i Tasdîk-i Gaybî": 0.0644,
    "Tarihçe-i Hayat": 0.1489,
    "Asâ-yı Mûsâ": 0.0878,
    "İman ve Küfür Muvâzeneleri": 0.0692,
    "Muhâkemat": 0.0614,
}

# Kararli piramit: genis 7'li sira (0.194 m) alt/on basamakta, 6'li sira (0.130 m) ust basamakta.
ALT_SIRA = ["Sözler", "Mektubat", "Şuâlar", "Mesnevî-i Nûriye", "İşârâtü’l-İ’câz",
            "Barla Lâhikası", "Kastamonu Lâhikası"]
UST_SIRA = ["Emirdağ Lâhikası", "Sikke-i Tasdîk-i Gaybî", "Tarihçe-i Hayat", "Asâ-yı Mûsâ",
            "İman ve Küfür Muvâzeneleri", "Muhâkemat"]
YATAN = "Lem’alar"

# Kur'an-i Kerim (cami boy): 19 x 27 cm, 4.5 cm kalinlik - rahle sirtligi 6'li siradan genis olmasin
KURAN_H = 0.270
KURAN_D = 0.190
KURAN_T = 0.045
KURAN_BT = 0.0030

# ASCII dosya adlari
DOSYA = {
    "Sözler": "sozler", "Mektubat": "mektubat", "Lem’alar": "lemalar", "Şuâlar": "sualar",
    "Mesnevî-i Nûriye": "mesnevi", "İşârâtü’l-İ’câz": "isarat", "Barla Lâhikası": "barla",
    "Kastamonu Lâhikası": "kastamonu", "Emirdağ Lâhikası": "emirdag",
    "Sikke-i Tasdîk-i Gaybî": "sikke", "Tarihçe-i Hayat": "tarihce", "Asâ-yı Mûsâ": "asa",
    "İman ve Küfür Muvâzeneleri": "iman", "Muhâkemat": "muhakemat",
}


def kalinlik(ad):
    return ORAN[ad] * KITAP_H


# --------------------------------------------------------------------------
# Cilt kesiti (ustten gorunus). Yerel eksenler: x = kalinlik yonu (ortada 0,
# +x on kapak tarafi), y = derinlik (0 = sirt tepe noktasi, +y = on kesim/agiz).
# Dis ve ic yollar ayni nokta sayisina sahiptir; kapaklar dortgen serit olur.
# --------------------------------------------------------------------------

def _smooth(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


def cilt_parametreleri(T, D=KITAP_D, bt=0.0027):
    R = min(max(0.13 * T, 0.0016), 0.0050)      # sirt bombesi
    ys = R + 0.0012                              # sirt - mafsal birlesimi
    e = 0.00035                                  # sirt, kapaktan biraz dar
    gw = 0.0068                                  # mafsal oluk genisligi
    gd = 0.0008                                  # oluk derinligi
    st = 0.0016                                  # sirt kalinligi (deri + mukavva)
    return dict(T=T, D=D, bt=bt, R=R, ys=ys, e=e, gw=gw, gd=gd, st=st)


def _sag_yari(p, n_arc=14, n_g=8):
    """Sag yari (apex -> on kesim) dis ve ic noktalar + segment etiketleri."""
    T, D, bt, ys, e, gw, gd, st = (p[k] for k in ("T", "D", "bt", "ys", "e", "gw", "gd", "st"))
    h = T / 2
    dis, ic, etiket = [], [], []
    # 1) sirt yayi
    for i in range(n_arc + 1):
        th = (math.pi / 2) * i / n_arc
        xo = (h - e) * math.sin(th)
        yo = ys * (1 - math.cos(th))
        xi = (h - e - st) * math.sin(th)
        xi = min(xi, h - bt)
        yi = st + (ys) * (1 - math.cos(th))
        dis.append((xo, yo)); ic.append((xi, yi)); etiket.append("sirt")
    # 2) mafsal olugu
    for i in range(1, n_g + 1):
        t = i / n_g
        y = ys + gw * t
        x = (h - e) + e * _smooth(t) - gd * math.sin(math.pi * t) ** 1.5
        dis.append((x, y))
        ic.append((h - bt, st + ys + gw * t))
        etiket.append("oluk")
    # 3) kapak duz yuzey (destek noktalariyla)
    y0 = ys + gw
    for y in (y0 + 0.0015, y0 + 0.006, D - 0.006, D - 0.0012, D):
        dis.append((h, y)); ic.append((h - bt, y)); etiket.append("kapak")
    return dis, ic, etiket


def cilt_kesiti(p):
    """Tam kesit: sol on kesimden apex'e, apex'ten sag on kesime."""
    dis_r, ic_r, et_r = _sag_yari(p)
    dis_l = [(-x, y) for (x, y) in reversed(dis_r[1:])]
    ic_l = [(-x, y) for (x, y) in reversed(ic_r[1:])]
    et_l = list(reversed(et_r[1:]))
    return dis_l + dis_r, ic_l + ic_r, et_l + et_r


def sirt_yay_uzunlugu(p):
    dis, _, et = cilt_kesiti(p)
    L = 0.0
    for i in range(len(dis) - 1):
        if et[i] == "sirt" and et[i + 1] == "sirt":
            L += math.dist(dis[i], dis[i + 1])
    return L
