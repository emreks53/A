"""sh02 · 5.24-9.64 · morning room: window flare, sunbeams with dust motes, breathing linen curtain.
Exit tilting/booming down toward the table under the window (sh03 continues the move)."""
import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import bpy
import common as C
import lib_s4 as S


def build(ctx):
    sc = bpy.context.scene
    S.light_rig(exposure=1.0)
    room = S.build_room()
    S.build_table()
    S.build_sofra()                                    # the set table sh03 continues onto
    t_ox = ctx.word("oksijen")                         # 8.32
    # breath rhythm: ~2 s in / ~2 s out; biggest inhale peaks just before "oksijen"
    wind = [(ctx.t0 - 2.2, 20), (ctx.t0 - 1.1, 150), (ctx.t0 + 0.1, 20), (t_ox - 2.1, 25),
            (t_ox - 1.0, 180), (t_ox - 0.15, 360), (t_ox + 0.35, 260), (t_ox + 1.1, 40), (ctx.t1 + 0.4, 20)]
    S.build_curtain(ctx, wind, y0=-0.30, y1=0.36, drop=1.40, wall=None)
    S.build_beam_emission((-0.99, -1.3, 0.765), (1.2, 1.24, 2.6), strength=0.009, curtain_y=0.36,
                          time_keys=[(ctx.t0 - 1, 0.0), (ctx.t1 + 1, 0.9)])
    gust = [(t_ox - 0.4, 0.0), (t_ox - 0.1, 0.03), (t_ox + 0.6, 0.30), (t_ox + 1.6, 0.50)]
    S.build_motes("Motes", (-0.97, -0.6, 0.80), (0.12, 1.0, 2.30), count=7000, seed=21, r_min=0.00035, r_max=0.0011,
                  gust_dir=(1.0, -0.35, -0.25), gust_keys=gust)
    # camera: seated eye height at the table's right end, looking up-left into the window;
    # the sun sits in the open casement at the upper right of frame (match to sh01's flare)
    cam = C.camera("cam", lens=28, loc=(0.75, -0.15, 1.12), look_at=(-1.0, 0.05, 1.45), fstop=2.8,
                   focus=(-0.95, 0.1, 1.6))
    foc = C.focus_empty(cam)
    tgt = C.empty("cam_target", (-1.0, 0.12, 1.48))
    C.track_to(cam, tgt)
    # start: on the flare, slow drift; ~7.6 s begin a long eased tilt/boom down toward the table
    C.key(cam, "location", ctx.t0 - 0.3, (0.77, -0.16, 1.13))
    C.key(cam, "location", t_ox - 0.6, (0.70, -0.12, 1.15))
    C.key(cam, "location", ctx.t1 + 0.3, (0.58, -0.22, 1.08))
    C.key(tgt, "location", ctx.t0 - 0.3, (-0.965, 0.20, 1.44))
    C.key(tgt, "location", t_ox - 0.6, (-0.98, 0.16, 1.30))
    C.key(tgt, "location", ctx.t1 + 0.3, (-0.45, 0.32, 0.60))
    C.key(foc, "location", ctx.t0 - 0.3, (-0.95, 0.1, 1.6))
    C.key(foc, "location", t_ox - 0.2, (-0.6, 0.1, 1.5))
    C.key(foc, "location", ctx.t1 + 0.3, (-0.35, 0.32, 0.80))
    C.handheld(cam, amp_loc=0.0012, amp_rot=0.0, speed=0.3, seed=2)
    C.handheld(tgt, amp_loc=0.004, amp_rot=0.0, speed=0.25, seed=3)
    # exposure settling after the flare (eye/auto-iris adapting)
    sc.view_settings.exposure = 2.6
    sc.view_settings.keyframe_insert("exposure", frame=(ctx.t0 - 0.3) * C.FPS)
    sc.view_settings.exposure = 1.9
    sc.view_settings.keyframe_insert("exposure", frame=(ctx.t0 + 1.2) * C.FPS)
    C.empty("TRK_air", (-0.25, 0.25, 1.45))
    S.fast_denoise()
    S.comp_sunbeams(ctx, cam, beams=False)
    return {"final_spp": 32, "max_bounces": 5, "diffuse_bounces": 2, "glossy_bounces": 1,
            "transmission_bounces": 4, "volume_bounces": 0, "clamp_indirect": 4.0, "transparent_bounces": 12,
            "volume_step_rate": 4.0}


C.run("sh02", build)
