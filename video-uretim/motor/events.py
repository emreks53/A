"""Motion-graphic event list, timed to narration word onsets."""
from common import W, H


def events():
    E = []
    # ---------------- A: attributes (0 - 11.8)
    E += [
        dict(type='dust', t0=0.0, t1=11.8, n=42, seed=1),
        dict(type='rosette', t0=0.30, t1=1.75, cx=540, cy=640, R=250, draw=1.15, spin=7, inner=12, grow=0.8, fout=0.9),
        dict(type='attr_dots', t0=1.05, t1=11.70, onsets=[1.30, 3.14, 4.84, 6.68, 8.38, 10.06], y=286, gap=118, fout=0.5),
        dict(type='pulses', t0=8.38, t1=9.9, times=[8.40], x=540, y=980, r=1000, n=3, dur=1.3, alpha=0.9, w=3.0),
        dict(type='spiral', t0=10.10, t1=11.70, cx=680, cy=705, size=420, draw=1.3, rot0=0, spin=-6, alpha=0.95),
    ]
    # ---------------- B: small human with senses and instruments (11.8 - 26.2)
    E += [
        dict(type='focus', t0=11.95, t1=13.95, x=551, y=410, r0=640, r1=120, dur=1.1, shot='B01'),
        dict(type='dim', t0=14.0, t1=15.9, amount=0.25),
        dict(type='callouts', t0=14.10, t1=15.95, shot='B01', r=72, items=[
            (14.18, 551, 410, 840, 250, 'aperture'),
            (14.40, 140, 560, 190, 810, 'sound'),
            (14.66, 930, 950, 850, 720, 'scent'),
            (14.90, 450, 900, 300, 1010, 'drop'),
        ]),
        dict(type='blueprint', t0=16.15, t1=18.5, x=540, y=886, shot='B02', pings=[16.60, 17.20],
             rings=[(230, 72, 14, 1.5), (300, 36, -9, 2.0), (380, 120, 5, 1.0)]),
        dict(type='dust', t0=18.6, t1=21.1, n=36, seed=4),
        dict(type='orbs', t0=21.25, t1=23.7, step=0.24, pts=[(300, 520, 34), (720, 430, 28), (540, 760, 40), (240, 980, 26), (820, 900, 30), (560, 1060, 22)]),
        dict(type='rosette', t0=23.80, t1=26.0, cx=540, cy=864, R=300, draw=1.0, spin=-5, n=8, alpha=0.85),
        dict(type='girih', t0=24.42, t1=26.0, x=540, y=864, cell=170, speed=700, dur=1.6, alpha=0.55, shot='B06', spin=4),
    ]
    # ---------------- C: blessings (26.2 - 40)
    E += [
        dict(type='dust', t0=26.2, t1=29.0, n=30, seed=7, speed=-1.5),
        dict(type='burst', t0=29.02, t1=31.0, times=[29.04, 29.58], x=540, y=840, n=90, r0=40, r1=820, dur=1.9),
    ]
    E += [
        dict(type='segments', t0=31.0, t1=32.85, x=540, y=760, R=270, n=7, step=0.1, w=8),
        dict(type='layers', t0=33.0, t1=34.55, x=540, y=1000, n=6, step=0.11, gap=58, w0=440),
        dict(type='attr_dots', t0=35.15, t1=40.1, onsets=[35.30, 36.60, 37.73, 38.59], y=286, gap=118, fout=0.5),
        dict(type='pulses', t0=35.3, t1=40.0, times=[35.32, 36.62, 37.75, 38.61], x=540, y=860, r=760, n=2, dur=1.2, alpha=0.75, w=2.4),
        dict(type='dust', t0=34.6, t1=40.3, n=40, seed=9),
    ]
    # ---------------- D: bin bir esma (40.3 - 49.4)
    E += [
        dict(type='dust', t0=40.3, t1=44.4, n=36, seed=12),
        dict(type='converge', t0=40.98, t1=44.25, x=540, y=780, R=330, dur=1.5, radiate_t=42.92, spin=6, fout=0.6),
        dict(type='scale', t0=45.75, t1=47.62, x=540, y=420, r=118, tilt_t=46.85),
        dict(type='glow', t0=47.7, t1=49.3, x=540, y=820, r=650, color=(255, 196, 170), alpha=0.35),
        dict(type='burst', t0=47.69, t1=49.3, times=[47.72], x=540, y=820, n=50, r0=60, r1=640, dur=1.6, alpha=0.8),
    ]
    # ---------------- E: service / worship / pleasure / pain / duty / reward (49.4 - 62.3)
    E += [
        dict(type='hexgrid', t0=50.55, t1=54.95, x=540, y=900, cell=78, cols=9, rows=11, lit=(52.49, 54.4), alpha=0.9),
        dict(type='dust', t0=55.1, t1=56.9, n=40, seed=15, speed=0.5),
        dict(type='badge', t0=55.15, t1=56.85, x=540, y=430, r=84, icon='mihrab'),
        dict(type='inventory', t0=57.38, t1=62.05, y=420, gap=215, r=78, items=[(57.43, 'drop'), (58.29, 'thorn'), (59.21, 'gear'), (60.09, 'star')]),
        dict(type='rays', t0=60.1, t1=62.2, x=600, y=700, n=16, spread=200, alpha=0.6),
    ]
    # ---------------- F: the eye (62.3 - 78.4)
    E += [
        dict(type='badge', t0=62.30, t1=78.2, x=540, y=300, r=64, icon='aperture', fout=0.6),
        dict(type='viewfinder', t0=63.19, t1=69.95, x=540, y=880, w=700, h=900, snaps=[63.19, 65.39, 66.89, 68.45]),
        dict(type='dust', t0=70.0, t1=73.6, n=36, seed=18),
        dict(type='glow', t0=71.8, t1=73.5, x=540, y=760, r=700, alpha=0.3),
    ]
    # ---------------- G: the ear (78.4 - 92.4)
    E += [
        dict(type='badge', t0=78.45, t1=92.2, x=540, y=300, r=64, icon='sound', fout=0.6),
        dict(type='waveform', t0=78.9, t1=86.95, y=640, amp=150),
        dict(type='inventory', t0=87.5, t1=92.2, y=520, gap=230, r=78, items=[(87.55, 'mihrab'), (88.81, 'drop'), (90.17, 'star')]),
    ]
    # ---------------- H: smell (92.4 - 103.6)
    E += [
        dict(type='badge', t0=92.43, t1=103.4, x=540, y=300, r=64, icon='scent', fout=0.6),
        dict(type='scent', t0=92.6, t1=97.1, x=540, y=1250, h=900, n=5),
        dict(type='inventory', t0=98.1, t1=103.4, y=520, gap=230, r=78, items=[(98.13, 'mihrab'), (99.61, 'drop'), (101.43, 'star')]),
    ]
    # ---------------- I: taste (103.6 - 112.6)
    E += [
        dict(type='badge', t0=103.63, t1=112.4, x=540, y=300, r=64, icon='drop', fout=0.6),
        dict(type='flavor', t0=105.75, t1=108.2, x=540, y=760, R=250, n=12),
        dict(type='dust', t0=108.3, t1=112.5, n=40, seed=22),
    ]
    # ---------------- J: heart, mind, spirit (112.6 - 123.7)
    E += [
        dict(type='trio', t0=114.9, t1=119.05, link=True, r=84, items=[(114.97, 'lamp', 250, 540), (115.73, 'network', 540, 430), (116.38, 'light', 830, 540)]),
        dict(type='glow', t0=117.3, t1=119.1, x=540, y=520, r=760, alpha=0.3),
        dict(type='inventory', t0=119.95, t1=123.55, y=480, gap=230, r=78, items=[(120.03, 'gear'), (120.88, 'drop'), (121.64, 'thorn')]),
        dict(type='dust', t0=119.2, t1=123.6, n=40, seed=25),
    ]
    # ---------------- K: finale (123.7 - 132.8)
    E += [
        dict(type='rays', t0=123.75, t1=126.1, x=540, y=-120, n=18, spread=80, alpha=0.8),
        dict(type='glow', t0=123.8, t1=126.1, x=540, y=200, r=900, alpha=0.25),
        dict(type='finale', t0=126.4, t1=132.2, x=540, y=740, R=310, icons=['aperture', 'sound', 'scent', 'drop', 'lamp', 'network', 'light', 'gear'],
             reward=(129.84, 130.64), glow_t=131.14, fout=0.35),
        dict(type='glow', t0=131.6, t1=132.45, x=540, y=740, r=1300, alpha=0.75, fin=0.9, fout=0.35),
        dict(type='dust', t0=126.3, t1=132.7, n=50, seed=28),
    ]
    # ---------------- L: end card over the books (132.8 - end)
    E += [
        dict(type='dust', t0=133.0, t1=139.0, n=34, seed=31, speed=0.35, region=(0, 300, W, 1500)),
        dict(type='source_card', layer='top', t0=133.45, t1=138.55, y=300, step=0.42, lines=[
            ('Risale-i Nur', 'CormorantGaramond-600-normal.ttf', 112, (251, 245, 233), 132, 2),
            ('Sözler', 'CormorantGaramond-600-italic.ttf', 82, (255, 236, 196), 96, 1),
            ('Otuz İkinci Söz', 'CormorantGaramond-500-normal.ttf', 60, (251, 245, 233), 80, 2),
            ('Sayfa 712', 'CormorantGaramond-500-normal.ttf', 52, (233, 199, 123), 70, 3),
        ]),
    ]
    return E
