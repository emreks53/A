#!/usr/bin/env python3
"""Risale-i Nur Sozler kitabi icin doku ureteci.

Uretir (blender/tex/):
  kapak_maske.png      on kapak altin varak maskesi (beyaz = altin), 163x240 mm
  sirt_maske.png       sirt altin maskesi (yay boyunca u, yukseklik v)
  cilt_sirt_*.png      arka plandaki diger ciltlerin sirt maskeleri
  sayfa81.png          sag sayfa (s. 81) - krem kagit + murekkep
  sayfa80.png          sol sayfa (s. 80) - Onuncu Soz'de s.81'den onceki gercek metin (sayfa80_metin.txt), sonu 'Ucuncu esas:'
  yaprak.png / yaprak_arka.png   ucusan yapraklarin on/arka yuzu - ayni pasajdan gercek harfler
  params.json          kitap.py'nin kullandigi olculer

HTML/SVG -> Chromium (Playwright, cek.mjs) ile PNG; sonra numpy ile islenir.
Calistir:  python3 dokular.py
"""
import json, math, os, random, subprocess, sys
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
TEX = os.path.join(HERE, 'tex')
FONTS = os.path.abspath(os.path.join(HERE, '..', 'fonts'))
WORK = os.path.join(TEX, '_html')
os.makedirs(WORK, exist_ok=True)
PX_MM = 96 / 25.4  # CSS px per mm

# ---------------------------------------------------------------- olculer (mm)
BOARD_W, BOARD_H = 163.0, 240.0          # on kapak karton (oluk haric)
SPINE_ARC = 50.0                          # sirt yay uzunlugu (yaklasik)
PAGE_W, PAGE_H = 163.5, 234.0             # sayfa
BANDS = [24.0, 70.0, 126.0, 178.0, 214.0]  # sirt kabartma bantlari (ustten mm)

FONT_CSS = f"""
@font-face{{font-family:'Corm';font-weight:500;src:url(file://{FONTS}/CormorantGaramond-500.ttf);}}
@font-face{{font-family:'Corm';font-weight:600;src:url(file://{FONTS}/CormorantGaramond-600.ttf);}}
@font-face{{font-family:'Corm';font-weight:700;src:url(file://{FONTS}/CormorantGaramond-700.ttf);}}
@font-face{{font-family:'Corm';font-style:italic;font-weight:600;src:url(file://{FONTS}/CormorantGaramond-600i.ttf);}}
@font-face{{font-family:'Corm';font-style:italic;font-weight:500;src:url(file://{FONTS}/CormorantGaramond-500i.ttf);}}
@font-face{{font-family:'Cinzel';font-weight:600;src:url(file://{FONTS}/Cinzel-600.ttf);}}
@font-face{{font-family:'Cinzel';font-weight:700;src:url(file://{FONTS}/Cinzel-700.ttf);}}
@font-face{{font-family:'Amiri';font-weight:700;src:url(file://{FONTS}/Amiri-700.ttf);}}
@font-face{{font-family:'Amiri';font-weight:400;src:url(file://{FONTS}/Amiri-400.ttf);}}
"""


def P(pts, close=True):
    s = 'M' + ' L'.join(f'{x:.3f},{y:.3f}' for x, y in pts)
    return s + (' Z' if close else '')


def leaf(p0, p1, width, pw=0.85):
    """p0 -> p1 eksenli sivri yaprak (palmet) poligonu."""
    (x0, y0), (x1, y1) = p0, p1
    dx, dy = x1 - x0, y1 - y0
    L = math.hypot(dx, dy)
    ux, uy = dx / L, dy / L
    nx, ny = -uy, ux
    n = 80
    left, right = [], []
    for i in range(n + 1):
        t = i / n
        w = width / 2 * (math.sin(math.pi * t) ** pw) * (1.25 - 0.7 * t)
        cx, cy = x0 + dx * t, y0 + dy * t
        left.append((cx + nx * w, cy + ny * w))
        right.append((cx - nx * w, cy - ny * w))
    return left + right[::-1]


def circle(cx, cy, r, fill):
    return f'<circle cx="{cx:.3f}" cy="{cy:.3f}" r="{r:.3f}" fill="{fill}"/>'


def corner_fan(R0, A, n, steps=500, with_origin=True):
    pts = [(0.0, 0.0)] if with_origin else []
    for i in range(steps + 1):
        phi = (math.pi / 2) * i / steps
        u = (n * phi / (math.pi / 2)) % 1.0
        r = R0 + A * math.sin(math.pi * u) ** 0.7
        pts.append((r * math.cos(phi), r * math.sin(phi)))
    return pts


def corner_piece():
    """Bir kose suslemesi (rumi/palmet koseband). Koordinat: kose (0,0), +x,+y icerisi."""
    W, B = '#fff', '#000'
    R0, A, n = 21.0, 2.3, 5
    s = []
    s.append(f'<path d="{P(corner_fan(R0, A, n))}" fill="{W}"/>')
    # ic negatif kontur
    s.append(f'<path d="{P(corner_fan(R0 - 2.5, A * 0.75, n, with_origin=False), close=False)}" '
             f'fill="none" stroke="{B}" stroke-width="0.45"/>')
    d = 1 / math.sqrt(2)
    # ortadaki lale/palmet (negatif) + icinde altin yaprak
    s.append(f'<path d="{P(leaf((3.0*d, 3.0*d), (15.8*d, 15.8*d), 8.4))}" fill="{B}"/>')
    s.append(f'<path d="{P(leaf((5.2*d, 5.2*d), (13.6*d, 13.6*d), 3.4))}" fill="{W}"/>')
    # yan rumi yapraklar (negatif)
    for ang in (17, 73):
        a = math.radians(ang)
        s.append(f'<path d="{P(leaf((4.5*math.cos(a), 4.5*math.sin(a)), (15.5*math.cos(a), 15.5*math.sin(a)), 3.6))}" fill="{B}"/>')
        s.append(circle(17.0 * math.cos(a), 17.0 * math.sin(a), 0.75, B))
    # kosegen ucu palmet
    r1 = R0 + A - 0.6
    s.append(f'<path d="{P(leaf((r1*d, r1*d), ((r1+10.5)*d, (r1+10.5)*d), 6.6))}" fill="{W}"/>')
    s.append(f'<path d="{P(leaf(((r1+2.2)*d, (r1+2.2)*d), ((r1+8.2)*d, (r1+8.2)*d), 1.7))}" fill="{B}"/>')
    s.append(circle((r1 + 12.6) * d, (r1 + 12.6) * d, 1.0, W))
    # cerceve boyunca kucuk tomurcuklar
    for ang in (6.5, 83.5):
        a = math.radians(ang)
        p0 = (R0 * math.cos(a), R0 * math.sin(a))
        p1 = ((R0 + 6.5) * math.cos(a), (R0 + 6.5) * math.sin(a))
        s.append(f'<path d="{P(leaf(p0, p1, 3.0))}" fill="{W}"/>')
    # koseden giden ince cizgiler (zencerek benzeri)
    return '\n'.join(s)


def vesica(a, b, n=1600):
    d = (b * b - a * a) / (2 * a)
    R = a + d
    al = math.atan2(b, d)
    pts = []
    h = n // 2
    for i in range(h + 1):
        t = -al + 2 * al * i / h
        pts.append((-d + R * math.cos(t), R * math.sin(t)))
    for i in range(1, h):
        t = math.pi - al + 2 * al * i / h
        pts.append((d + R * math.cos(t), R * math.sin(t)))
    return pts


def lobed(pts, A, nlobe):
    """Kapali egriyi disari dogru dilimli (scallop) yap; uclar (index 0 ve n/2) cusp kalir."""
    P_ = np.array(pts)
    seg = np.linalg.norm(np.roll(P_, -1, 0) - P_, axis=1)
    s = np.concatenate([[0], np.cumsum(seg)[:-1]])
    L = seg.sum()
    tang = np.roll(P_, -1, 0) - np.roll(P_, 1, 0)
    tang /= np.linalg.norm(tang, axis=1, keepdims=True) + 1e-9
    nrm = np.stack([tang[:, 1], -tang[:, 0]], 1)  # disa dogru (saat yonu tersi icin kontrol)
    c = P_.mean(0)
    if np.mean(np.sum((P_ - c) * nrm, 1)) < 0:
        nrm = -nrm
    u = (nlobe * s / L) % 1.0
    off = A * np.sin(np.pi * u) ** 0.7
    Q = P_ + nrm * off[:, None]
    return [tuple(q) for q in Q]


def semse(cx, cy, a, b):
    W, B = '#fff', '#000'
    s = []
    outer = lobed(vesica(a, b), 2.1, 22)
    tr = lambda pts: [(x + cx, y + cy) for x, y in pts]
    s.append(f'<path d="{P(tr(outer))}" fill="{W}"/>')
    s.append(f'<path d="{P(tr(vesica(a - 2.5, b - 3.6)))}" fill="{B}"/>')
    s.append(f'<path d="{P(tr(vesica(a - 3.6, b - 5.2)))}" fill="none" stroke="{W}" stroke-width="0.38"/>')
    # uc ic palmetleri
    for sg in (-1, 1):
        y0 = cy + sg * (b - 6.6)
        y1 = cy + sg * (b - 19.0)
        s.append(f'<path d="{P(leaf((cx, y0), (cx, y1), 7.2))}" fill="{W}"/>')
        s.append(f'<path d="{P(leaf((cx, y0 - sg*2.0), (cx, y1 + sg*2.4), 2.0))}" fill="{B}"/>')
        for side in (-1, 1):
            s.append(f'<path d="{P(leaf((cx + side*1.2, y1 + sg*1.5), (cx + side*7.5, y1 - sg*4.5), 2.6))}" fill="{W}"/>')
        s.append(circle(cx, y1 - sg * 2.2, 0.8, W))
        # dis salbek (finial)
        tip = cy + sg * b
        s.append(f'<rect x="{cx-0.45:.3f}" y="{min(tip, tip+sg*3.4):.3f}" width="0.9" height="3.4" fill="{W}"/>')
        s.append(f'<path d="{P(leaf((cx, tip + sg*2.6), (cx, tip + sg*13.2), 6.6))}" fill="{W}"/>')
        s.append(f'<path d="{P(leaf((cx, tip + sg*4.6), (cx, tip + sg*10.8), 1.9))}" fill="{B}"/>')
        for side in (-1, 1):
            s.append(f'<path d="{P(leaf((cx + side*0.8, tip + sg*3.2), (cx + side*6.0, tip + sg*6.6), 2.2))}" fill="{W}"/>')
        s.append(circle(cx, tip + sg * 15.4, 1.1, W))
    return '\n'.join(s)


def svg_doc(w_mm, h_mm, inner, extra_css=''):
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>{FONT_CSS}
html,body{{margin:0;padding:0;background:#000;}}
svg{{display:block;width:{w_mm*PX_MM:.3f}px;height:{h_mm*PX_MM:.3f}px;}}
text{{fill:#fff;}}
{extra_css}
</style></head><body>
<svg viewBox="0 0 {w_mm} {h_mm}" xmlns="http://www.w3.org/2000/svg">
{inner}
</svg></body></html>"""


def cover_svg():
    W, H = BOARD_W, BOARD_H
    s = []
    # cift cizgili cerceve
    o, i_ = 8.0, 10.6
    s.append(f'<rect x="{o}" y="{o}" width="{W-2*o}" height="{H-2*o}" fill="none" stroke="#fff" stroke-width="1.0"/>')
    s.append(f'<rect x="{i_}" y="{i_}" width="{W-2*i_}" height="{H-2*i_}" fill="none" stroke="#fff" stroke-width="0.36"/>')
    # cerceve arasi nokta dizisi (zencerek)
    mid = (o + i_) / 2 + 0.05
    step = 3.2
    for x in np.arange(o + 6, W - o - 5, step):
        s.append(f'<rect x="{x-0.42:.3f}" y="{mid-0.42:.3f}" width="0.84" height="0.84" transform="rotate(45 {x:.3f} {mid:.3f})" fill="#fff"/>')
        s.append(f'<rect x="{x-0.42:.3f}" y="{H-mid-0.42:.3f}" width="0.84" height="0.84" transform="rotate(45 {x:.3f} {H-mid:.3f})" fill="#fff"/>')
    for y in np.arange(o + 6, H - o - 5, step):
        s.append(f'<rect x="{mid-0.42:.3f}" y="{y-0.42:.3f}" width="0.84" height="0.84" transform="rotate(45 {mid:.3f} {y:.3f})" fill="#fff"/>')
        s.append(f'<rect x="{W-mid-0.42:.3f}" y="{y-0.42:.3f}" width="0.84" height="0.84" transform="rotate(45 {W-mid:.3f} {y:.3f})" fill="#fff"/>')
    # koseler
    cp = corner_piece()
    c0 = i_ + 0.0
    for (tx, ty, sx, sy) in [(c0, c0, 1, 1), (W - c0, c0, -1, 1), (c0, H - c0, 1, -1), (W - c0, H - c0, -1, -1)]:
        s.append(f'<g transform="translate({tx},{ty}) scale({sx},{sy})">{cp}</g>')
    # semse
    cx, cy, a, b = W / 2, 111.0, 39.0, 63.0
    s.append(semse(cx, cy, a, b))
    # Osmanlica baslik  (Amiri Bold, RTL) - HarfBuzz ile sekillenir
    s.append(f'<text x="{cx}" y="{cy+3.5}" font-family="Amiri" font-weight="700" font-size="27" '
             f'text-anchor="middle" direction="rtl" xml:lang="ar">سوزلر</text>')
    # ayirici
    yy = cy + 15.5
    s.append(f'<rect x="{cx-15}" y="{yy-0.2}" width="30" height="0.4" fill="#fff"/>')
    s.append(f'<rect x="{cx-1.5}" y="{yy-1.5}" width="3" height="3" transform="rotate(45 {cx} {yy})" fill="#fff"/>')
    s.append(circle(cx - 17, yy, 0.6, '#fff'))
    s.append(circle(cx + 17, yy, 0.6, '#fff'))
    # Latin baslik
    s.append(f'<text x="{cx + 0.9}" y="{cy+31.0}" font-family="Cinzel" font-weight="700" font-size="8.6" '
             f'text-anchor="middle" letter-spacing="1.8">SÖZLER</text>')
    # yazar
    s.append(f'<text x="{cx}" y="{H-24.5}" font-family="Corm" font-weight="700" font-size="8.0" '
             f'text-anchor="middle" letter-spacing="0.25">Bediüzzaman Said Nursî</text>')
    return svg_doc(W, H, '\n'.join(s))


def fleuron(cx, cy, s=1.0):
    W, B = '#fff', '#000'
    out = []
    out.append(f'<path d="{P(leaf((cx, cy - 0.8*s), (cx, cy - 6.0*s), 3.0*s))}" fill="{W}"/>')
    out.append(f'<path d="{P(leaf((cx, cy + 0.8*s), (cx, cy + 6.0*s), 3.0*s))}" fill="{W}"/>')
    out.append(f'<path d="{P(leaf((cx - 0.8*s, cy), (cx - 6.0*s, cy), 3.0*s))}" fill="{W}"/>')
    out.append(f'<path d="{P(leaf((cx + 0.8*s, cy), (cx + 6.0*s, cy), 3.0*s))}" fill="{W}"/>')
    out.append(circle(cx, cy, 1.0 * s, W))
    for dx, dy in ((1, 1), (1, -1), (-1, 1), (-1, -1)):
        out.append(circle(cx + dx * 3.3 * s, cy + dy * 3.3 * s, 0.55 * s, W))
    return '\n'.join(out)


def spine_svg(width_mm, title_lines, sub_lines=None, auth_lines=None, title_size=6.4, bands=BANDS):
    W, H = width_mm, BOARD_H
    s = []
    x0, x1 = 0.6, W - 0.6
    cx = W / 2
    def hline(y, t):
        s.append(f'<rect x="{x0}" y="{y - t/2:.3f}" width="{x1-x0:.3f}" height="{t}" fill="#fff"/>')
    for y in (5.0, H - 5.0):
        hline(y, 0.7)
    for y in (6.6, H - 6.6):
        hline(y, 0.3)
    for b in bands:
        hline(b - 3.4, 0.45)
        hline(b + 3.4, 0.45)
        hline(b - 4.4, 0.22)
        hline(b + 4.4, 0.22)
    # baslik paneli (band0..band1)
    py0, py1 = bands[0] + 4.4, bands[1] - 4.4
    n = len(title_lines)
    lh = title_size * 1.15
    ystart = (py0 + py1) / 2 - (n - 1) * lh / 2 + title_size * 0.36
    for k, t in enumerate(title_lines):
        s.append(f'<text x="{cx + 0.3}" y="{ystart + k*lh:.3f}" font-family="Cinzel" font-weight="700" '
                 f'font-size="{title_size}" text-anchor="middle" letter-spacing="0.55">{t}</text>')
    # ince susleme cizgileri baslik panelinde
    s.append(f'<rect x="{cx-8}" y="{py0+3.0:.3f}" width="16" height="0.3" fill="#fff"/>')
    s.append(f'<rect x="{cx-8}" y="{py1-3.3:.3f}" width="16" height="0.3" fill="#fff"/>')
    if sub_lines:
        qy0, qy1 = bands[1] + 4.4, bands[2] - 4.4
        cyq = (qy0 + qy1) / 2 - 7
        for k, t in enumerate(sub_lines):
            s.append(f'<text x="{cx}" y="{cyq + k*5.0:.3f}" font-family="Corm" font-style="italic" font-weight="600" '
                     f'font-size="4.5" text-anchor="middle">{t}</text>')
        s.append(fleuron(cx, cyq + 15.5, 0.9))
    else:
        s.append(fleuron(cx, (bands[1] + bands[2]) / 2, 1.0))
    if auth_lines:
        ry0, ry1 = bands[2] + 4.4, bands[3] - 4.4
        cyr = (ry0 + ry1) / 2 - 1.2
        for k, t in enumerate(auth_lines):
            s.append(f'<text x="{cx}" y="{cyr + k*5.6:.3f}" font-family="Corm" font-weight="700" '
                     f'font-size="5.0" text-anchor="middle">{t}</text>')
    else:
        s.append(fleuron(cx, (bands[2] + bands[3]) / 2, 0.8))
    s.append(fleuron(cx, (bands[3] + bands[4]) / 2, 0.75))
    s.append(fleuron(cx, (5.0 + bands[0]) / 2 + 0.6, 0.6))
    return svg_doc(W, H, '\n'.join(s))


BODY = ("Hem anlarsın ki şu dünyadaki tezyinat, yalnız telezzüz veya tenezzüh için değil. "
        "Çünkü bir zaman lezzet verse, firakıyla birçok zaman elem verir. Sana tattırır, iştihanı "
        "açar fakat doyurmaz. Çünkü ya onun ömrü kısa, ya senin ömrün kısadır. Doymaya kâfi değil. "
        "Demek kıymeti yüksek, müddeti kısa olan şu tezyinat; ibret içindir, (Hâşiye) şükür içindir, "
        "usûl-ü daimîsine teşvik içindir. Başka gayet ulvi gayeler içindir.")
FOOT_HEAD = "Hâşiye:"
FOOT = ("Evet, madem her şeyin kıymeti ve dekaik-ı sanatı gayet yüksek ve güzel olduğu halde "
        "müddeti kısa, ömrü azdır. Demek, o şeyler numunelerdir, başka şeylerin suretleri "
        "hükmündedirler. Ve madem müşterilerin nazarlarını, asıllarına çeviriyorlar gibi bir "
        "vaziyet vardır. Öyle ise elbette şu dünyadaki o çeşit tezyinat, bir Rahman-ı Rahîm'in "
        "rahmetiyle, sevdiği ibadına hazırladığı niam-ı cennetin numuneleridir, denilebilir ve "
        "denilir ve öyledir.")

# sag sayfa (recto): ic kenar (cilt tarafi) solda
M_IN, M_OUT, M_TOP, M_BOT = 19.0, 21.0, 31.0, 24.0


def page_css(inner_left):
    l = M_IN if inner_left else M_OUT
    r = M_OUT if inner_left else M_IN
    return f"""{FONT_CSS}
html,body{{margin:0;padding:0;background:transparent;}}
#pg{{position:relative;width:{PAGE_W}mm;height:{PAGE_H}mm;color:#000;}}
.hdr{{position:absolute;top:13.2mm;left:{l}mm;right:{r}mm;font-family:'Corm';font-weight:600;
  font-size:10.5pt;letter-spacing:0.22em;text-align:center;line-height:1;}}
.pno{{position:absolute;top:12.6mm;font-family:'Corm';font-weight:600;font-size:12pt;line-height:1;}}
.hrule{{position:absolute;top:20.0mm;left:{l}mm;right:{r}mm;height:0.22mm;background:#000;opacity:0.55;}}
#body{{position:absolute;top:{M_TOP}mm;left:{l}mm;right:{r}mm;font-family:'Corm';font-weight:500;
  text-align:justify;hyphens:none;text-indent:7mm;line-height:1.64;font-kerning:normal;
  font-variant-ligatures:common-ligatures;}}
#foot{{position:absolute;left:{l}mm;right:{r}mm;font-family:'Corm';font-weight:500;
  text-align:justify;hyphens:none;line-height:1.46;text-indent:5mm;}}
#frule{{position:absolute;left:{l}mm;width:34mm;height:0.25mm;background:#000;opacity:0.7;}}
b{{font-weight:700;}}
.g{{display:inline-block;height:0.46em;background:#000;border-radius:0.08em;vertical-align:0.05em;}}
"""


FIT_JS = f"""
<script>
const MM = 96/25.4;
window.fitLayout = function(){{
  const body=document.getElementById('body'), foot=document.getElementById('foot'), fr=document.getElementById('frule');
  const top={M_TOP}, bottom={PAGE_H - M_BOT}, gapMin=11.0;
  function set(b){{ body.style.fontSize=b+'pt'; foot.style.fontSize=(b*0.84)+'pt'; }}
  let lo=12, hi=18.5;
  for(let i=0;i<24;i++){{ const m=(lo+hi)/2; set(m);
    const bh=body.getBoundingClientRect().height/MM, fh=foot.getBoundingClientRect().height/MM;
    if(top+bh+gapMin+fh<=bottom) lo=m; else hi=m; }}
  set(lo);
  const fh=foot.getBoundingClientRect().height/MM;
  foot.style.top=(bottom-fh)+'mm'; fr.style.top=(bottom-fh-4.2)+'mm';
  const bh=body.getBoundingClientRect().height/MM;
  console.log('FIT body_pt='+lo.toFixed(3)+' body_end_mm='+(top+bh).toFixed(2)+' foot_top_mm='+(bottom-fh).toFixed(2));
}};
</script>"""


def page81_html():
    css = page_css(inner_left=True)
    return f"""<!doctype html><html lang="tr"><head><meta charset="utf-8"><style>{css}</style>{FIT_JS}</head>
<body><div id="pg">
<div class="hdr">ONUNCU SÖZ</div>
<div class="pno" style="right:{M_OUT}mm">81</div>
<div class="hrule"></div>
<div id="body">{BODY}</div>
<div id="frule"></div>
<div id="foot"><b>{FOOT_HEAD}</b> {FOOT}</div>
</div></body></html>"""


def greek_par(rng, nwords):
    ws = []
    for _ in range(nwords):
        L = rng.choice([1.2, 1.6, 2.0, 2.4, 2.8, 3.2, 3.6, 4.2, 4.8, 5.5]) * rng.uniform(0.85, 1.15)
        op = rng.uniform(0.75, 1.0)
        ws.append(f'<span class="g" style="width:{L*0.42:.2f}em;opacity:{op:.2f}"></span>')
    return ' '.join(ws)


def passage_paras(start):
    """Sayfa doldurma metni: YALNIZ musterinin verdigi pasaj (s.81 govdesi + Hasiye metni), farkli bir
    noktadan baslayip tekrar eder; boylece satir kirilimlari s.81 ile ayni gorunmez."""
    seq = [BODY, FOOT, BODY, FOOT, BODY]
    full = '\n'.join(seq)
    i = full.find(start)
    text = full[i:] if i >= 0 else full
    return [p for p in text.split('\n') if p.strip()]


def greek_html(body_pt, inner_left, pno, header, start):
    css = page_css(inner_left=inner_left)
    pno_side = (f'right:{M_OUT}mm' if inner_left else f'left:{M_OUT}mm')
    lh = 1.64 * body_pt * 0.3528  # mm
    nlines = int((PAGE_H - M_BOT - M_TOP) / lh)
    avail = nlines * lh  # tam satir sayisi: alt satir yarim kesilmesin
    paras = passage_paras(start)
    body = ''.join(f'<p style="margin:0;text-indent:{0 if k == 0 else 7}mm">{p}</p>' for k, p in enumerate(paras))
    return f"""<!doctype html><html lang="tr"><head><meta charset="utf-8"><style>{css}
#body{{font-size:{body_pt}pt;height:{avail}mm;overflow:hidden;}}</style></head>
<body><div id="pg">
<div class="hdr">{header}</div>
<div class="pno" style="{pno_side}">{pno}</div>
<div class="hrule"></div>
<div id="body">{body}</div>
</div></body></html>"""


def page80_html(body_pt):
    """s.80: Onuncu Soz'de s.81'den hemen onceki GERCEK metin (sayfa80_metin.txt, Yeni Asya nesri; uydurma yok).
    Sayfa bu metinle BITER (son satir 'Ucuncu esas:'); geriye dogru doldurulur: alta hizali, bastan butun
    kelimeler atilarak sigdirilir; ilk satir tam satir (cumle ortasindan baslayabilir)."""
    import re
    src = os.path.join(HERE, 'sayfa80_metin.txt')
    paras = [l.strip() for l in open(src, encoding='utf-8') if l.strip()]
    toks = []   # paragraf basina kelime listesi; <b> etiketleri kelime kelime
    for p in paras:
        out = []
        for seg in re.split(r'(<b>.*?</b>)', p):
            if not seg:
                continue
            if seg.startswith('<b>'):
                out += ['<b>' + w + '</b>' for w in seg[3:-4].split()]
            else:
                out += seg.split()
        toks.append(out)
    css = page_css(inner_left=False)
    lh = 1.64 * body_pt * 0.3528
    nlines = int((PAGE_H - M_BOT - M_TOP) / lh)
    bottom = PAGE_H - M_BOT
    return f"""<!doctype html><html lang="tr"><head><meta charset="utf-8"><style>{css}
#body{{font-size:{body_pt}pt;}} #body p{{margin:0;text-indent:7mm;}} #body p.cont{{text-indent:0;}} #body b{{line-height:1;}}</style>
<script>
const TOKS = {json.dumps(toks, ensure_ascii=False)};
const MM = 96/25.4, LH = {lh:.5f}, NL = {nlines}, BOTTOM = {bottom:.3f};
window.fitLayout = async function(){{
  await document.fonts.load('700 18pt Corm'); await document.fonts.load('500 18pt Corm');
  await document.fonts.ready;
  const body = document.getElementById('body');
  const flat = []; TOKS.forEach((p,i)=>p.forEach((w,j)=>flat.push([i,j])));
  function render(k){{
    let html = '', pi = flat[k][0], wj = flat[k][1];
    for (let i = pi; i < TOKS.length; i++) {{
      const ws = (i === pi) ? TOKS[i].slice(wj) : TOKS[i];
      const cls = (i === pi && wj > 0) ? ' class="cont"' : '';
      html += '<p' + cls + '>' + ws.join(' ') + '</p>';
    }}
    body.innerHTML = html;
    return Math.round(body.getBoundingClientRect().height / MM / LH);
  }}
  let lo = 0, hi = flat.length - 1;            // en kucuk k: satir <= NL (en cok metin)
  while (lo < hi) {{ const m = (lo + hi) >> 1; if (render(m) <= NL) hi = m; else lo = m + 1; }}
  let k = lo, n = render(k);
  // ilk satir tam olmali: ilk (devam) paragrafi tek satirsa onu atla
  const first = body.querySelector('p');
  if (first && first.classList.contains('cont') && Math.round(first.getBoundingClientRect().height / MM / LH) < 2) {{
    const pi = flat[k][0]; while (k < flat.length && flat[k][0] === pi) k++; n = render(k);
  }}
  body.style.top = (BOTTOM - n * LH) + 'mm';
  console.log('S80 lines=' + n + '/' + NL + ' basla="' + body.innerText.slice(0, 60).replace(/\\n/g,' ') + '"');
}};
</script></head>
<body><div id="pg">
<div class="hdr">SÖZLER</div>
<div class="pno" style="left:{M_OUT}mm">80</div>
<div class="hrule"></div>
<div id="body"></div>
</div></body></html>"""


def run_jobs(jobs):
    jp = os.path.join(WORK, 'jobs.json')
    with open(jp, 'w') as f:
        json.dump(jobs, f)
    r = subprocess.run(['node', os.path.join(HERE, 'cek.mjs'), jp], capture_output=True, text=True)
    print(r.stdout)
    if r.returncode != 0:
        print(r.stderr)
        sys.exit(1)
    return r.stdout


def write(name, html):
    p = os.path.join(WORK, name)
    with open(p, 'w') as f:
        f.write(html)
    return p


def paper(h, w, seed, base=(228, 213, 183)):
    rng = np.random.default_rng(seed)
    def blurred(sig, amp):
        n = rng.standard_normal((h // 4 + 1, w // 4 + 1)).astype(np.float32)
        im = Image.fromarray(((n * 40) + 128).clip(0, 255).astype(np.uint8))
        im = im.filter(ImageFilter.GaussianBlur(sig / 4)).resize((w, h), Image.BICUBIC)
        a = np.asarray(im).astype(np.float32) - 128
        a /= (a.std() + 1e-6)
        return a * amp
    low = blurred(120, 0.018) + blurred(30, 0.008)
    fine = rng.standard_normal((h, w)).astype(np.float32) * 0.010
    # lif benzeri ince cizgiler
    fib = Image.fromarray((rng.random((h // 2, w // 2)) * 255).astype(np.uint8)).filter(
        ImageFilter.GaussianBlur(0.6)).resize((w, h), Image.BILINEAR)
    fib = (np.asarray(fib).astype(np.float32) / 255 - 0.5) * 0.02
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    ex = np.minimum(xx, w - 1 - xx) / w
    ey = np.minimum(yy, h - 1 - yy) / h
    edge = 1 - 0.035 * np.exp(-np.minimum(ex, ey) * 60)
    f = (1 + low + fine + fib) * edge
    img = np.empty((h, w, 3), np.float32)
    for c in range(3):
        img[..., c] = base[c] / 255.0 * f
    return img


def compose_ink(paper_img, ink_rgba_path, ink=(33, 29, 26), seed=3, strength=1.0):
    im = Image.open(ink_rgba_path).convert('RGBA')
    a = np.asarray(im).astype(np.float32)[..., 3] / 255.0
    h, w = a.shape
    if paper_img.shape[:2] != (h, w):
        paper_img = paper_img[:h, :w]
    rng = np.random.default_rng(seed)
    n = Image.fromarray((rng.random((h // 8 + 1, w // 8 + 1)) * 255).astype(np.uint8)).filter(
        ImageFilter.GaussianBlur(1.2)).resize((w, h), Image.BICUBIC)
    dens = 0.90 + 0.10 * (np.asarray(n).astype(np.float32) / 255.0)
    a = (a * dens * strength).clip(0, 1)
    out = paper_img.copy()
    for c in range(3):
        out[..., c] = out[..., c] * (1 - a) + (ink[c] / 255.0) * a * (0.92 + 0.08 * paper_img[..., c])
    return out


def save_rgb(arr, path):
    Image.fromarray((arr.clip(0, 1) * 255 + 0.5).astype(np.uint8)).save(path, optimize=True)


def mask_from_shot(png, out, blur_out=None, blur_px=6):
    im = Image.open(png).convert('L')
    im.save(out, optimize=True)
    if blur_out:
        im.filter(ImageFilter.GaussianBlur(blur_px)).save(blur_out, optimize=True)
    return im.size


VOLUMES = [  # (baslik satirlari, kalinlik mm)
    (['MEKTUBAT'], 41.0),
    (["LEM'ALAR"], 35.0),
    (['ŞUÂLAR'], 38.0),
    (['ASÂ-YI', 'MUSA'], 25.0),
]


def main():
    jobs = []
    # --- kapak
    jobs.append(dict(html=write('kapak.html', cover_svg()), out=os.path.join(WORK, 'kapak.png'),
                     w=BOARD_W * PX_MM, h=BOARD_H * PX_MM, dsf=3.3))
    # --- sirt
    jobs.append(dict(html=write('sirt.html', spine_svg(SPINE_ARC, ['SÖZLER'],
                     ['Risale-i Nur', 'Külliyatından'], ['Bediüzzaman', 'Said Nursî'], title_size=7.0)),
                     out=os.path.join(WORK, 'sirt.png'), w=SPINE_ARC * PX_MM, h=BOARD_H * PX_MM, dsf=3.3))
    for k, (lines, th) in enumerate(VOLUMES):
        arc = th + 5.0
        ts = 6.0 if len(lines) == 1 else 5.4
        if len(max(lines, key=len)) * ts * 0.78 > arc - 6:
            ts = (arc - 6) / (len(max(lines, key=len)) * 0.78)
        jobs.append(dict(html=write(f'cilt{k}.html', spine_svg(arc, lines, None, None, title_size=ts)),
                         out=os.path.join(WORK, f'cilt{k}.png'), w=arc * PX_MM, h=BOARD_H * PX_MM, dsf=1.6))
    # --- sayfa 81 (oto-sigdirma)
    jobs.append(dict(html=write('sayfa81.html', page81_html()), out=os.path.join(WORK, 'sayfa81.png'),
                     w=PAGE_W * PX_MM, h=PAGE_H * PX_MM, dsf=3.7, transparent=True, fit=True))
    log = run_jobs(jobs)
    body_pt = 15.0
    for line in log.splitlines():
        if 'FIT body_pt=' in line:
            body_pt = float(line.split('body_pt=')[1].split()[0])
    print('body_pt', body_pt)
    jobs2 = [
        dict(html=write('sayfa80.html', page80_html(body_pt)),
             out=os.path.join(WORK, 'sayfa80.png'), w=PAGE_W * PX_MM, h=PAGE_H * PX_MM, dsf=2.2, transparent=True,
             fit=True),
        dict(html=write('yaprak.html', greek_html(body_pt, True, '79', 'ONUNCU SÖZ', 'Çünkü ya onun ömrü')),
             out=os.path.join(WORK, 'yaprak.png'), w=PAGE_W * PX_MM, h=PAGE_H * PX_MM, dsf=1.6, transparent=True),
        dict(html=write('yaprak_arka.html', greek_html(body_pt, False, '78', 'SÖZLER', 'başka şeylerin suretleri')),
             out=os.path.join(WORK, 'yaprak_arka.png'), w=PAGE_W * PX_MM, h=PAGE_H * PX_MM, dsf=1.6, transparent=True),
    ]
    run_jobs(jobs2)

    # --- son islem
    mask_from_shot(os.path.join(WORK, 'kapak.png'), os.path.join(TEX, 'kapak_maske.png'),
                   os.path.join(TEX, 'kapak_maske_blur.png'), 5)
    mask_from_shot(os.path.join(WORK, 'sirt.png'), os.path.join(TEX, 'sirt_maske.png'),
                   os.path.join(TEX, 'sirt_maske_blur.png'), 5)
    for k in range(len(VOLUMES)):
        mask_from_shot(os.path.join(WORK, f'cilt{k}.png'), os.path.join(TEX, f'cilt{k}_maske.png'))

    ink81 = Image.open(os.path.join(WORK, 'sayfa81.png'))
    w, h = ink81.size
    pap = paper(h, w, 7)
    save_rgb(compose_ink(pap, os.path.join(WORK, 'sayfa81.png'), seed=5), os.path.join(TEX, 'sayfa81.png'))
    for nm, sd in (('sayfa80', 9), ('yaprak', 13), ('yaprak_arka', 17)):
        im = Image.open(os.path.join(WORK, nm + '.png'))
        w2, h2 = im.size
        pap2 = paper(h2, w2, sd)
        save_rgb(compose_ink(pap2, os.path.join(WORK, nm + '.png'), seed=sd),
                 os.path.join(TEX, nm + '.png'))
    params = dict(board_w=BOARD_W, board_h=BOARD_H, spine_arc=SPINE_ARC, page_w=PAGE_W, page_h=PAGE_H,
                  bands=BANDS, body_pt=body_pt,
                  text_block_mm=dict(left=M_IN, right=M_OUT, top=M_TOP, bottom=M_BOT),
                  volumes=[dict(title=l, thick=t) for l, t in VOLUMES])
    with open(os.path.join(TEX, 'params.json'), 'w') as f:
        json.dump(params, f, indent=1, ensure_ascii=False)
    print('ok')


if __name__ == '__main__':
    main()
