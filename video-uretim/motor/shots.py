"""Shot table. Times are output-timeline seconds; cuts sit ~2 frames before the
narrated word onset so the picture leads the voice."""
from common import ROOT

C = ROOT + '/clips'
L = 0.067  # lead before word onset


def cut(t):
    return round(t - L, 3)


def S(id, src, start, end, **kw):
    import os
    path = src if src.startswith('/') else f'{C}/{src}'
    lic = f"{ROOT}/licensed/{os.path.basename(path)}"
    off = 0.0
    if os.path.exists(lic) and os.path.exists(lic[:-4] + '.json'):   # licensed 4K segment replaces the preview
        import json
        path = lic
        off = json.load(open(lic[:-4] + '.json'))['offset']
    d = dict(id=id, src=path, start=start, end=end)
    d.update(kw)
    if off:
        d['t_in'] = d.get('t_in', 0.0) - off
        d['_lic_offset'] = off
    return d


def shot_table():
    T = []
    # ---- A: Divine attributes
    T += [
        S('A01', 's01/4201713387.mp4', 0.0, cut(1.30), t_in=2.4, cx=0.58, z0=1.0, z1=1.10, look=dict(exposure=0.1, sat=0.98)),
        S('A02', 's02/4213913199.mp4', cut(1.30), cut(3.14), t_in=4.3, cx=0.50, z0=1.04, z1=1.12, trans=dict(type='zoom', dur=0.40), look=dict(exposure=0.0, sat=0.92)),
        S('A03', 's03/1110312621.mp4', cut(3.14), cut(4.84), t_in=3.0, cx=0.55, z0=1.0, z1=1.07, trans=dict(type='blur', dur=0.32)),
        S('A04', 's04/1096301925.mp4', cut(4.84), cut(6.68), t_in=2.0, speed=1.6, cx=0.47, z0=1.0, z1=1.06, trans=dict(type='blur', dur=0.32), look=dict(exposure=0.15)),
        S('A05', 's05/3644393409.mp4', cut(6.68), cut(8.38), t_in=2.6, cx=0.42, z0=1.02, z1=1.08, trans=dict(type='blur', dur=0.32), look=dict(exposure=0.2)),
        S('A06', 's06/3995427227.mp4', cut(8.38), cut(10.06), t_in=2.0, cx=0.42, z0=1.0, z1=1.12, trans=dict(type='zoom', dur=0.32), look=dict(exposure=-0.1, sat=0.9)),
        S('A07', 's07/1059709991.mp4', cut(10.06), cut(11.82), t_in=0.5, cx=0.49, z0=1.0, z1=1.06, trans=dict(type='blur', dur=0.36), look=dict(exposure=-0.55, contrast=1.12, sat=1.05)),
    ]
    # ---- B: the small human, equipped with senses and instruments
    T += [
        S('B01', 's08/3930208807.mp4', cut(11.82), cut(16.08), t_in=3.6, cx=0.42, z0=1.0, z1=1.16, trans=dict(type='dissolve', dur=0.45), look=dict(exposure=-0.15, wb=(1.03, 1.0, 0.95))),
        S('B02', 's08/4209529677.mp4', cut(16.08), cut(18.64), t_in=2.0, cx=0.47, z0=1.0, z1=1.08, trans=dict(type='dissolve', dur=0.35), look=dict(exposure=0.15)),
        S('B03', 's09/4070863503.mp4', cut(18.64), cut(19.86), t_in=13.6, cx=0.54, z0=1.0, z1=1.05, trans=dict(type='blur', dur=0.28), look=dict(wb=(1.04, 1.0, 0.92))),
        S('B04', 's09/3849183343.mp4', cut(19.86), cut(21.12), t_in=2.0, cx=0.62, z0=1.0, z1=1.06, trans=dict(type='blur', dur=0.28), look=dict(exposure=0.2)),
        S('B05', 's10/4194474207.mp4', cut(21.12), cut(23.80), t_in=2.0, cx=0.5, z0=1.0, z1=1.1, trans=dict(type='dissolve', dur=0.5)),
        S('B06', 's11/4050052691.mp4', cut(23.80), cut(26.20), t_in=2.0, cx=0.5, z0=1.0, z1=1.1, trans=dict(type='zoom', dur=0.40)),
    ]
    # ---- C: blessings
    T += [
        S('C01', 's12/1065540961.mp4', cut(26.20), cut(29.02), t_in=1.0, cx=0.5, z0=1.0, z1=1.06, trans=dict(type='flash', dur=0.40)),
        S('C02', 's12/4214296063.mp4', cut(29.02), cut(31.00), t_in=4.0, cx=0.5, z0=1.0, z1=1.06, rot0=0, rot1=6, trans=dict(type='blur', dur=0.32)),
    ]
    T += [
        S('C03', 's13/4175843461.mp4', cut(31.00), cut(32.98), t_in=2.0, cx=0.5, z0=1.0, z1=1.07, trans=dict(type='blur', dur=0.32)),
        S('C04', 's14/3930146439.mp4', cut(32.98), cut(34.66), t_in=1.0, cx=0.47, z0=1.0, z1=1.06, trans=dict(type='blur', dur=0.32)),
        S('C05', 'verify/4213787031.mp4', cut(34.66), cut(36.60), t_in=2.0, cx=0.75, z0=1.0, z1=1.06, trans=dict(type='dissolve', dur=0.35), look=dict(wb=(1.06, 1.0, 0.9), exposure=0.1)),
        S('C06', 's10/1095852749.mp4', cut(36.60), cut(37.73), t_in=6.0, cx=0.40, z0=1.0, z1=1.08, trans=dict(type='blur', dur=0.26), look=dict(exposure=0.2)),
        S('C07', 's15/4192517795.mp4', cut(37.73), cut(38.59), t_in=1.0, cx=0.5, z0=1.0, z1=1.06, trans=dict(type='blur', dur=0.24)),
        S('C08', 's15/4187296259.mp4', cut(38.59), cut(40.37), t_in=3.0, cx=0.5, z0=1.0, z1=1.08, trans=dict(type='flash', dur=0.36)),
    ]
    # ---- D: the thousand-and-one Names
    T += [
        S('D01', 's16/4012799513.mp4', cut(40.37), cut(42.55), t_in=0.2, cx=0.66, z0=1.0, z1=1.08, trans=dict(type='dissolve', dur=0.5)),
        S('D02', 's16/1499930.mp4', cut(42.55), cut(44.43), t_in=15.5, cx=0.6, z0=1.0, z1=1.06, trans=dict(type='flash', dur=0.4)),
        S('D03', 's17/1049175481.mp4', cut(44.43), cut(47.69), t_in=10.0, cx=0.44, z0=1.0, z1=1.08, trans=dict(type='blur', dur=0.4)),
        S('D04', 's17/3646755937.mp4', cut(47.69), cut(49.43), t_in=4.0, speed=2.2, cx=0.5, z0=1.0, z1=1.05, trans=dict(type='blur', dur=0.32)),
    ]
    # ---- E: each faculty has its own service, pleasure, pain, duty, reward
    T += [
        S('E01', 's18/4036510445.mp4', cut(49.43), cut(52.49), t_in=2.0, cx=0.62, z0=1.0, z1=1.08, trans=dict(type='zoom', dur=0.4)),
        S('E02', 's18/3857221679.mp4', cut(52.49), cut(55.13), t_in=3.0, cx=0.5, z0=1.0, z1=1.08, trans=dict(type='blur', dur=0.32)),
        S('E03', 's18/1103127997.mp4', cut(55.13), cut(56.93), t_in=0.0, cx=0.5, z0=1.0, z1=1.05, trans=dict(type='dissolve', dur=0.4), look=dict(exposure=0.1)),
        S('E04', 's19/4132109185.mp4', cut(56.93), cut(58.29), t_in=2.0, cx=0.5, z0=1.0, z1=1.06, trans=dict(type='blur', dur=0.28)),
        S('E05', 's19/1026828548.mp4', cut(58.29), cut(59.21), t_in=1.0, cx=0.27, z0=1.0, z1=1.06, trans=dict(type='blur', dur=0.24)),
        S('E06', 's08/3820628737.mp4', cut(59.21), cut(60.09), t_in=4.0, cx=0.5, z0=1.0, z1=1.08, trans=dict(type='blur', dur=0.24), look=dict(exposure=0.25)),
        S('E07', 's32/4151148505.mp4', cut(60.09), cut(62.29), t_in=4.0, cx=0.55, z0=1.0, z1=1.08, trans=dict(type='flash', dur=0.32)),
    ]
    # ---- F: the eye
    T += [
        S('F01', 's20/1102376593.mp4', cut(62.29), cut(65.39), t_in=0.3, cx=0.465, cy=0.42, z0=1.18, z1=1.32, trans=dict(type='iris', dur=0.7, cy=880)),
        S('F02', 's21/3987163217.mp4', cut(65.39), cut(66.89), t_in=12.0, cx=0.5, z0=1.0, z1=1.06, trans=dict(type='blur', dur=0.3)),
        S('F03', 's21/3828180025.mp4', cut(66.89), cut(68.45), t_in=0.5, cx=0.45, z0=1.0, z1=1.06, trans=dict(type='blur', dur=0.3)),
        S('F04', 's21/4064709237.mp4', cut(68.45), cut(70.05), t_in=3.2, cx=0.42, z0=1.0, z1=1.06, trans=dict(type='blur', dur=0.3)),
        S('F05', 's22/4033826643.mp4', cut(70.05), cut(73.63), t_in=0.5, cx=0.5, z0=1.0, z1=1.08, trans=dict(type='dissolve', dur=0.5)),
        S('F06', 's23/1091136411.mp4', cut(73.63), cut(76.03), t_in=4.0, cx=0.55, z0=1.0, z1=1.06, trans=dict(type='dissolve', dur=0.45)),
        S('F07', 's23/3883358881.mp4', cut(76.03), cut(78.45), t_in=4.0, cx=0.5, z0=1.0, z1=1.08, trans=dict(type='blur', dur=0.35)),
    ]
    # ---- G: the ear
    T += [
        S('G01', 's24/4127991697.mp4', cut(78.45), cut(81.17), t_in=1.5, cx=0.42, z0=1.0, z1=1.08, trans=dict(type='ripple', dur=0.8, cy=900)),
        S('G02', 's24/3953847093.mp4', cut(81.17), cut(82.77), t_in=1.2, cx=0.5, z0=1.0, z1=1.05, trans=dict(type='blur', dur=0.3)),
        S('G03', 's25/3483053645.mp4', cut(82.77), cut(85.65), t_in=1.0, cx=0.40, z0=1.0, z1=1.07, trans=dict(type='dissolve', dur=0.4)),
        S('G04', 's25/4189828779.mp4', cut(85.65), cut(87.13), t_in=1.0, cx=0.5, z0=1.0, z1=1.05, trans=dict(type='blur', dur=0.32)),
        S('G05', 's22/4032537937.mp4', cut(87.13), cut(89.67), t_in=16.2, cx=0.5, z0=1.0, z1=1.06, trans=dict(type='dissolve', dur=0.45)),
        S('G06', 's26/3957865867.mp4', cut(89.67), cut(92.43), t_in=6.0, cx=0.47, z0=1.0, z1=1.08, trans=dict(type='blur', dur=0.4)),
    ]
    # ---- H: smell
    T += [
        S('H01', 's27/3720300397.mp4', cut(92.43), cut(93.99), t_in=8.0, cx=0.47, z0=1.0, z1=1.06, trans=dict(type='smoke', dur=0.8)),
        S('H02', 's27/3834834439.mp4', cut(93.99), cut(95.19), t_in=3.0, cx=0.55, z0=1.0, z1=1.05, trans=dict(type='blur', dur=0.3)),
        S('H03', 's27/4096278421.mp4', cut(95.19), cut(97.19), t_in=1.0, cx=0.5, z0=1.0, z1=1.06, trans=dict(type='blur', dur=0.32)),
        S('H04', 's28/3790543175.mp4', cut(97.19), cut(101.05), t_in=1.0, speed=1.6, cx=0.52, z0=1.0, z1=1.06, trans=dict(type='dissolve', dur=0.45)),
        S('H05', 's27/3905597091.mp4', cut(101.05), cut(103.63), t_in=1.0, cx=0.5, z0=1.0, z1=1.06, trans=dict(type='blur', dur=0.36)),
    ]
    # ---- I: taste
    T += [
        S('I01', 's29/3926264613.mp4', cut(103.63), cut(105.73), t_in=3.0, cx=0.5, z0=1.0, z1=1.06, trans=dict(type='splash', dur=0.7, cy=820)),
        S('I02', 's30/3907153569.mp4', cut(105.73), cut(107.25), t_in=6.0, cx=0.5, z0=1.0, z1=1.05, trans=dict(type='blur', dur=0.3)),
        S('I03', 's30/1110350401.mp4', cut(107.25), cut(108.27), t_in=15.0, cx=0.48, z0=1.0, z1=1.05, trans=dict(type='blur', dur=0.28)),
        S('I04', 's31/1057488253.mp4', cut(108.27), cut(111.23), t_in=1.5, cx=0.60, z0=1.0, z1=1.06, trans=dict(type='blur', dur=0.32)),
        S('I05', 's29/1086376316.mp4', cut(111.23), cut(112.61), t_in=2.0, cx=0.38, z0=1.0, z1=1.05, trans=dict(type='blur', dur=0.3)),
    ]
    # ---- J: heart, mind, spirit
    T += [
        S('J01', 's08/4209530287.mp4', cut(112.61), cut(114.97), t_in=4.0, cx=0.45, z0=1.0, z1=1.1, trans=dict(type='zoom', dur=0.4)),
        S('J02', 's32/4217145237.mp4', cut(114.97), cut(115.73), t_in=5.0, cx=0.5, z0=1.0, z1=1.05, trans=dict(type='blur', dur=0.24)),
        S('J03', 's09/4070863503.mp4', cut(115.73), cut(116.38), t_in=4.0, cx=0.5, z0=1.0, z1=1.05, trans=dict(type='blur', dur=0.22), look=dict(wb=(1.04, 1.0, 0.92))),
        S('J04', 's01/4201713387.mp4', cut(116.38), cut(119.19), t_in=5.5, cx=0.45, z0=1.0, z1=1.1, trans=dict(type='flash', dur=0.32)),
        S('J05', 's33/1031903366.mp4', cut(119.19), cut(121.52), t_in=1.0, cx=0.45, z0=1.0, z1=1.06, trans=dict(type='dissolve', dur=0.4)),
        S('J06', 's33/1070761945.mp4', cut(121.52), cut(123.70), t_in=12.0, cx=0.5, z0=1.0, z1=1.1, trans=dict(type='blur', dur=0.36)),
    ]
    # ---- K: finale
    T += [
        S('K01', 's34/1020379240.mp4', cut(123.70), cut(126.26), t_in=0.5, cx=0.45, z0=1.0, z1=1.08, trans=dict(type='flash', dur=0.5)),
        S('K02', 'verify/1054723793.mp4', cut(126.26), cut(129.38), t_in=2.5, cx=0.46, z0=1.0, z1=1.07, trans=dict(type='dissolve', dur=0.5)),
        S('K03', 's35/3626567993.mp4', cut(129.38), 132.80, t_in=0.0, cx=0.5, z0=1.0, z1=1.08, trans=dict(type='blur', dur=0.45)),
    ]
    # ---- L: the books (rendered still with a camera-like move)
    import os
    bk = ROOT + '/ending/books_full.png'
    if os.path.exists(bk):
        T += [S('L01', bk, 132.80, 139.30, cx=0.5, cy=0.5, z0=1.0, z1=1.09, trans=dict(type='flash', dur=0.7),
                look=dict(raw=True, exposure=0.0, wb=(1.0, 0.985, 0.975), sat=0.93))]
    return T
