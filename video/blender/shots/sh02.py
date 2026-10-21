"""sh02 · 5.24-9.64 · morning room: window flare, sunbeams with dust motes, breathing linen curtain.
Exit booming down toward the set table under the window on the boom path shared with sh03 (lib_s4.BOOM_*)."""
import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import bpy
from mathutils import Vector
import common as C
import lib_s4 as S

P2, T2, U2 = S.SH02_P, S.SH02_T, S.SH02_U


def build(ctx):
    S.light_rig(exposure=1.9)
    S.build_room()
    S.build_table()
    S.build_sofra()                                    # the set table sh03 continues onto
    t_ox = ctx.word("oksijen")                         # 8.32
    # breath rhythm: a small breath 5.6-6.9 s, then the big inhale peaking 8.25-8.35 ("oksijen")
    wind = [(ctx.t0 - 2.2, 20), (ctx.t0 - 1.1, 260), (ctx.t0 + 0.1, 15), (5.75, 30), (6.25, 210), (6.9, 25),
            (t_ox - 1.3, 300), (t_ox - 0.45, 620), (t_ox + 0.05, 420), (t_ox + 0.8, 40), (ctx.t1 + 0.4, 20)]
    S.build_curtain(ctx, wind, y0=-0.30, y1=0.36, drop=1.40, wall=None)
    S.build_beam_emission((-0.99, -0.75, 0.765), (0.45, 0.92, 2.42), strength=0.012, curtain_y=0.36,
                          time_keys=[(ctx.t0 - 1, 0.0), (ctx.t1 + 1, 0.9)])
    S.build_motes("Motes", (-0.97, -0.6, 0.80), (0.12, 1.0, 2.30), count=5000, seed=21, r_min=0.0005,
                  r_max=0.0011, material=S.mat_mote_beamlit())
    cam = C.camera("cam", lens=28, loc=(0.77, -0.16, 1.07), fstop=2.8)
    S.key_camera(cam, ctx, P2, T2, U2)
    C.handheld(cam, amp_loc=0.0008, amp_rot=0.0, speed=0.3, seed=5)

    cam_at = S.sh02_cam_at
    S.build_gust_motes("GustMotes", 8.10, 8.50, 9.90, cam_at)
    # exposure: hot on the flare (light dissolve from sh01), settling by 6.2 s; sh03 starts at the same value
    S.exposure_keys([(ctx.t0 - 0.3, S.ROOM_EXPOSURE + 1.5), (ctx.t0 + 0.4, S.ROOM_EXPOSURE + 0.7), (6.2, S.ROOM_EXPOSURE)])
    # TRK_air rides with the gust: fixed screen spot (x 700, y 380) at a depth easing 1.6 m -> 0.9 m
    trk = C.empty("TRK_air", (0, 0, 0))
    for f in range(ctx.f0 - 2, ctx.f1 + 3):
        t = f / C.FPS
        e, fw, rt, up = cam_at(t)
        k = 36.0 / 1920
        d = (fw * 28.0 + rt * ((700 - 540) * k) + up * ((960 - 380) * k)).normalized()
        trk.location = e + d * (1.6 - 0.7 * C.remap(t, 7.6, 8.5))
        trk.keyframe_insert("location", frame=f)
    S.comp_sunbeams(ctx, cam, beams=False, bloom=0.05, bloom_threshold=3.0)
    S.perf_settings(light_tree=False, fast_gi=False, final_res_pct=80)   # haze/defocus shot: 80 % (post upscales)
    return S.RENDER_OV


C.run("sh02", build)
