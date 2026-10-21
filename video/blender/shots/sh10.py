"""sh10 - out of the cell into a field of countless cells (52.10-58.00 s).

Scale: 1 m = 100 um (lib_s7). Starts inside a hero cell beside glowing mitochondria (continuing
sh09's look: amber cristae, dense teal cytoplasm haze), pulls back exponentially through the
membrane and up over a sheet of ~60 000 instanced cells (GN instances, per-instance light-on
time). "bildigimiz": nearby cells light warmly one after another; "bilmedigimiz": far more in
shadow light in waves rolling out to the horizon; "hadsiz": uncountable. The upper frame (key-word
band y 520-820) is the dark void above the tissue horizon. Exit: cells shrink to tiny glints.
"""
import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import bpy, bmesh
from mathutils import Vector, Euler, Quaternion, Matrix, noise
import common as C
import lib_s7 as L

R_CELL = 0.8
FOG0 = dict(color=(0.010, 0.032, 0.036), dist=0.11, strength=1.0, power=1.1)


def build(ctx):
    rng = random.Random(1010)
    sc = bpy.context.scene
    t_bil = ctx.word("bildiğimiz")
    t_bilme = ctx.word("bilmediğimiz")
    t_had = ctx.word("hadsiz")
    frames = list(range(ctx.f0 - 3, ctx.f1 + 3))
    times = [f / C.FPS for f in frames]
    C.world_color(FOG0["color"], 1.0)
    fg = L.fog_group(**FOG0)

    # ---------------------------------------------------------------- hero cell at the origin
    hero_c = Vector((0, 0, R_CELL * 0.55))
    m_mem = mat_membrane()
    mem = L.obj_from_mesh("heroCell", L.blob_mesh("heroCellMe", radius=R_CELL, sub=6, seed=5, amp=0.06, freq=1.2,
                                                  ruffle=0.01, ruffle_freq=14, squash=(1, 1, 0.62)), m_mem, loc=hero_c)
    m_nuc = L.mat_wet_tissue("Nucleus", base=(0.10, 0.05, 0.12), sss_radius=(0.6, 0.5, 1.0), sss_scale=0.05,
                             rough=0.4, coat=0.5, coat_rough=0.15)[0]
    L.fog_wrap(m_nuc)
    L.obj_from_mesh("nucleus", L.blob_mesh("nucMe", radius=0.28, sub=4, seed=6, amp=0.08, squash=(1, 1, 0.8)), m_nuc,
                    loc=hero_c + Vector((0.12, 0.05, -0.05)))
    # mitochondria inside (generic) + hero group with cristae where the camera starts
    m_mito = L.mat_mito()
    mm = [L.mito_mesh(f"mito{k}", length=rng.uniform(0.022, 0.034), width=rng.uniform(0.009, 0.012), seed=k) for k in range(6)]
    for me in mm:
        me.materials.append(m_mito)
    for k in range(520):
        while True:
            p = Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-1, 1)))
            if p.length < 1:
                break
        p = Vector((p.x * R_CELL * 0.8, p.y * R_CELL * 0.8, p.z * R_CELL * 0.45)) + hero_c
        if (p - hero_c - Vector((0.12, 0.05, -0.05))).length < 0.33:
            continue
        L.mito_assembly(f"mito_{k:03d}", tuple(p), (rng.uniform(0, 6.3), rng.uniform(0, 6.3), rng.uniform(0, 6.3)),
                        variant=k % 5, length=0.022 + 0.003 * (k % 5), width=0.0095 + 0.0006 * (k % 3))
    # camera starts just above the hero mitochondrion, looking down at it (myofibril-free cell)
    mito_p = hero_c + Vector((-0.35, -0.2, 0.12))
    for i, off in enumerate((Vector((0, 0, 0)), Vector((0.03, 0.016, -0.004)), Vector((-0.028, -0.02, -0.006)))):
        ln, wd = (0.034, 0.0135) if i == 0 else (0.028, 0.011)
        L.mito_assembly(f"heroMito{i}", tuple(mito_p + off), (0, 0, 0.3 * i), variant=10 + i, length=ln, width=wd)
    gl = C.point_light("mitoGlow", loc=tuple(mito_p + Vector((0, 0, -0.012))), power=0.012, radius=0.006, kelvin_k=2600)
    gl.visible_camera = False; gl.visible_glossy = False
    # rough-ER lace around the organelles (kept clear of the probe's straight-up path)
    er = L.er_network("ER", tuple(mito_p + Vector((0, 0, 0.05))), (0.16, 0.16, 0.12), n_walks=420, steps=30,
                      step=0.0028, seed=4, axis_xy=(mito_p.x, mito_p.y), axis_r=0.045)
    L.tubes_from_edges(er, radius=0.00035, mat=L.mat_er())
    # ribosomes / granules near the start
    bmg = bmesh.new()
    for k in range(2500):
        p = mito_p + Vector((rng.uniform(-0.15, 0.15), rng.uniform(-0.15, 0.15), rng.uniform(-0.1, 0.25)))
        if Vector((p.x - mito_p.x, p.y - mito_p.y)).length < 0.02:
            continue
        r = bmesh.ops.create_icosphere(bmg, subdivisions=1, radius=rng.uniform(0.0006, 0.0014))
        bmesh.ops.translate(bmg, vec=p, verts=r["verts"])
    me = bpy.data.meshes.new("granules"); bmg.to_mesh(me); bmg.free()
    m_gr = L.mat_wet_tissue("Granule", base=(0.6, 0.45, 0.35), rough=0.3, coat=0.0, sss_scale=0.001)[0]
    L.fog_wrap(m_gr)
    L.obj_from_mesh("granules", me, m_gr)

    # ---------------------------------------------------------------- the tissue sheet
    # One continuous surface shaded as a confocal-micrograph honeycomb (Voronoi cells), curving away
    # over a 2.5 km radius so it recedes to a hazy horizon. Cheaper and more photographic than
    # instanced spheres: every cell, membrane, nucleus and light-up time comes from the shader.
    sheet_me = sheet_mesh(size=1800.0, n=420, R=2600.0, z0=R_CELL * 0.5, hole=0.0)
    L.obj_from_mesh("tissueSheet", sheet_me, mat_sheet(t_bil, t_bilme))
    # ---------------------------------------------------------------- camera: exponential pull back
    cam = C.camera("cam", lens=35, loc=(0, 0, 1), fstop=60.0, focus=0.05, clip_start=0.002, clip_end=2000)
    cam.data.dof.aperture_blades = 0
    look0 = mito_p
    t_s = ctx.t0 - 0.3
    locs, rots, foc, fst, fdist = [], [], [], [], []
    prev = None
    d0, d1 = 0.062, 130.0

    def dist_at(t):
        u = C.remap(t, t_s, ctx.t1 + 0.25, lambda v: v)
        return d0 * (d1 / d0) ** (C.smoother(u) * 0.75 + u * 0.25)
    # membrane crossing: first time the probe is above the top of the hero cell
    top = hero_c.z + R_CELL * 0.62 - mito_p.z
    t_exit = next(t for t in [t_s + i / 240 for i in range(2400)] if dist_at(t) > top * 1.05)
    print(f"[sh10] membrane crossing at {t_exit:.2f}s")
    for t in times:
        u = C.remap(t, t_s, ctx.t1 + 0.25, lambda v: v)
        # log-distance ease: slow start, accelerating, then a long glide
        w = C.smoother(u) * 0.75 + u * 0.25
        dist = d0 * (d1 / d0) ** w
        # direction from target: start straight above (looking down at the mito), lean back to
        # an oblique view so the tissue horizon settles below the key-word band
        el = C.lerp(89.5, 19.0, C.remap(t, t_exit - 0.4, ctx.t1, C.smooth))
        az = C.lerp(-60.0, -35.0, C.remap(t, t_s, ctx.t1))
        tgt = look0.lerp(hero_c, C.remap(t, t_exit - 0.3, t_exit + 1.2, C.smooth))
        dirv = Vector((math.cos(math.radians(el)) * math.cos(math.radians(az)),
                       math.cos(math.radians(el)) * math.sin(math.radians(az)),
                       math.sin(math.radians(el))))
        p = tgt + dirv * dist
        # aim: look at target but tilt up as we rise so the horizon sits at ~y 900 px
        look = tgt + Vector((0, 0, dist * C.lerp(0.0, 0.16, C.remap(t, t_exit, ctx.t1, C.smooth))))
        # explicit camera frame: up = world +Y while looking straight down at the mitochondrion
        # (so it stands vertical in 9:16 as at the end of sh09), blending to world +Z when oblique
        f = (look - p).normalized()
        k_up = C.remap(t, t_exit - 0.2, t_exit + 1.6, C.smooth)
        uh = Vector((0, 1, 0)).lerp(Vector((0, 0, 1)), k_up).normalized()
        if abs(f.dot(uh)) > 0.98:
            uh = Vector((0, 1, 0))
        rt = f.cross(uh).normalized(); up = rt.cross(f).normalized()
        q = Matrix((rt, up, -f)).transposed().to_quaternion()
        e = q.to_euler("XYZ", prev) if prev else q.to_euler("XYZ")
        prev = e
        locs.append(tuple(p)); rots.append(tuple(e))
        foc.append(max(0.03, (tgt - p).length))
        fst.append(C.lerp(60.0, 8.0, C.remap(t, t_s, t_exit + 0.6)))
        fdist.append(max(0.3, dist * 0.75))
    L.bake(cam, frames, "location", locs)
    L.bake(cam, frames, "rotation_euler", rots)
    L.bake_id(cam.data, frames, "dof.focus_distance", foc)
    L.bake_id(cam.data, frames, "dof.aperture_fstop", fst)
    C.handheld(cam, amp_loc=0.0, amp_rot=0.0015, speed=0.5, seed=10)
    L.bake_id(fg, frames, 'nodes["dist"].outputs[0].default_value', fdist)
    # haze turns from teal cytoplasm to deep blue-black void outside
    cols = [C.lerp(C.lerp((0.010, 0.032, 0.036), (0.004, 0.010, 0.014), C.remap(t, t_exit - 0.2, t_exit + 1.2)),
                   (0.022, 0.011, 0.006), C.remap(t, t_bilme, t_had + 1.0)) for t in times]
    L.bake_id(fg, frames, 'nodes["color"].outputs[0].default_value', [(*c, 1) for c in cols])
    bg = [n for n in sc.world.node_tree.nodes if n.type == "BACKGROUND"][0]
    L.bake_id(sc.world.node_tree, frames, f'nodes["{bg.name}"].inputs[0].default_value', [(*c, 1) for c in cols])

    hero_objs = [o for o in bpy.data.objects if o.type in ("MESH", "LIGHT") and o.name != "tissueSheet"]
    f_hide = C.t2f(t_exit + 0.55)
    for o in hero_objs:
        L.bake(o, [frames[0], f_hide], "hide_render", [0.0, 1.0], interp="CONSTANT")
    C.empty("TRK_cells", tuple(hero_c + Vector((0, 0, R_CELL * 0.4))))

    # ---------------------------------------------------------------- light
    s1 = C.sun(elev_deg=35, azim_deg=130, strength=1.6, kelvin_k=3200, angle_deg=6, name="amberKey")
    # once the field glows, let the cells' own light carry the image (no matte sun-lit look)
    L.bake_id(s1.data, frames, "energy", [C.lerp(1.6, 0.18, C.remap(t, t_bil - 0.2, t_bilme + 0.6)) for t in times])
    s2 = C.sun(elev_deg=60, azim_deg=-40, strength=0.8, kelvin_k=12000, angle_deg=20, name="tealFill")
    s2.data.color = (0.45, 0.85, 1.0)
    il = C.point_light("probe", power=0.03, radius=0.01, kelvin_k=4500)
    il.parent = cam; il.location = (0, 0.01, 0)
    L.bake_id(il.data, frames, "energy", [C.lerp(0.03, 0.0, C.remap(t, t_exit, t_exit + 0.4)) for t in times])
    sc.view_settings.exposure = 0.3
    L.budget_denoise(prefilter="ACCURATE", quality="BALANCED", final_res=80)
    ov = dict(L.LEAN)
    ov.update(transmission_bounces=3, transparent_bounces=8, final_spp=12, preview_spp=12)
    return ov


# --------------------------------------------------------------------------- materials


def mat_membrane():
    """Hero cell plasma membrane: thin translucent glossy film; alpha (not transmission) so light
    reaches the interior and the probe sees the organelles through it from outside."""
    m, nt, p = C.new_mat("Membrane")
    p.inputs["Base Color"].default_value = (0.35, 0.6, 0.62, 1)
    p.inputs["Roughness"].default_value = 0.25
    p.inputs["Coat Weight"].default_value = 0.6
    p.inputs["Coat Roughness"].default_value = 0.08
    p.inputs["Thin Film Thickness"].default_value = 420.0      # lipid-bilayer interference sheen
    p.inputs["Thin Film IOR"].default_value = 1.45
    p.inputs["Sheen Weight"].default_value = 0.4
    tc = L._n(nt, "ShaderNodeTexCoord")
    nz = L._n(nt, "ShaderNodeTexNoise", **{"Scale": 30.0, "Detail": 4.0})
    nt.links.new(tc.outputs["Object"], nz.inputs["Vector"])
    nf = L._n(nt, "ShaderNodeTexNoise", **{"Scale": 600.0, "Detail": 3.0})
    nt.links.new(tc.outputs["Object"], nf.inputs["Vector"])
    L._bump_chain(nt, p, [(nz.outputs["Fac"], 0.2), (nf.outputs["Fac"], 0.12)], distance=0.004)
    lw = L._n(nt, "ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.3
    al = L._n(nt, "ShaderNodeMapRange"); al.inputs["To Min"].default_value = 0.22; al.inputs["To Max"].default_value = 0.8
    nt.links.new(lw.outputs["Facing"], al.inputs["Value"])
    nt.links.new(al.outputs[0], p.inputs["Alpha"])
    L.fog_wrap(m)
    return m


def sheet_mesh(size, n, R, z0, hole):
    """Square grid, denser near the origin (quadratic spacing), bent down as a sphere cap."""
    import numpy as np
    u = np.linspace(-1, 1, n)
    g = np.sign(u) * (u ** 2) * size / 2
    xs, ys = np.meshgrid(g, g)
    zs = z0 - (xs ** 2 + ys ** 2) / (2 * R)
    verts = np.stack([xs, ys, zs], -1).reshape(-1, 3)
    faces = []
    for j in range(n - 1):
        for i in range(n - 1):
            a = j * n + i
            cx, cy = xs[j, i], ys[j, i]
            if hole and abs(cx) < hole and abs(cy) < hole:
                continue
            faces.append((a, a + 1, a + n + 1, a + n))
    me = bpy.data.meshes.new("sheet")
    me.from_pydata(verts.tolist(), [], faces)
    me.update()
    for p in me.polygons:
        p.use_smooth = True
    return me


def mat_sheet(t_bil, t_bilme, cell=1.7):
    """Tissue honeycomb: tightly packed polygonal cells (2-D Voronoi in the sheet plane, varied
    size), thin bright membranes, darker nucleus, translucent dim blue-grey cytoplasm; cells light
    from within (warm amber fluorescence) at a per-cell time: near cells one after another from
    "bildigimiz", the rest in log-distance waves from "bilmedigimiz"."""
    m, nt, p = C.new_mat("TissueSheet")
    n_ = lambda k, **kw: L._n(nt, k, **kw)
    tc = n_("ShaderNodeTexCoord")
    sc_ = n_("ShaderNodeVectorMath"); sc_.operation = "SCALE"; sc_.inputs[3].default_value = 1.0 / cell
    nt.links.new(tc.outputs["Object"], sc_.inputs[0])
    vf = n_("ShaderNodeTexVoronoi"); vf.voronoi_dimensions = "2D"; vf.feature = "F1"
    vf.inputs["Randomness"].default_value = 0.85
    nt.links.new(sc_.outputs[0], vf.inputs["Vector"])
    ve = n_("ShaderNodeTexVoronoi"); ve.voronoi_dimensions = "2D"; ve.feature = "DISTANCE_TO_EDGE"
    ve.inputs["Randomness"].default_value = 0.85
    nt.links.new(sc_.outputs[0], ve.inputs["Vector"])
    # membrane line, nucleus, cell dome
    mem = n_("ShaderNodeMapRange"); mem.interpolation_type = "SMOOTHSTEP"
    mem.inputs["From Min"].default_value = 0.0; mem.inputs["From Max"].default_value = 0.05
    mem.inputs["To Min"].default_value = 1.0; mem.inputs["To Max"].default_value = 0.0
    nt.links.new(ve.outputs["Distance"], mem.inputs["Value"])
    nuc = n_("ShaderNodeMapRange"); nuc.interpolation_type = "SMOOTHSTEP"
    nuc.inputs["From Min"].default_value = 0.13; nuc.inputs["From Max"].default_value = 0.2
    nuc.inputs["To Min"].default_value = 1.0; nuc.inputs["To Max"].default_value = 0.0
    nt.links.new(vf.outputs["Distance"], nuc.inputs["Value"])
    dome = n_("ShaderNodeMapRange"); dome.interpolation_type = "SMOOTHSTEP"
    dome.inputs["From Min"].default_value = 0.0; dome.inputs["From Max"].default_value = 0.22
    nt.links.new(ve.outputs["Distance"], dome.inputs["Value"])
    fine = n_("ShaderNodeTexNoise", **{"Scale": 25.0, "Detail": 4.0})
    nt.links.new(tc.outputs["Object"], fine.inputs["Vector"])
    b = L._bump_chain(nt, p, [(dome.outputs[0], 0.6), (nuc.outputs[0], 0.15), (fine.outputs["Fac"], 0.08)], distance=0.12)
    # base: translucent blue-grey cytoplasm, darker nucleus
    mx = n_("ShaderNodeMix"); mx.data_type = "RGBA"
    nt.links.new(nuc.outputs[0], mx.inputs[0])
    mx.inputs[6].default_value = (0.10, 0.14, 0.17, 1); mx.inputs[7].default_value = (0.035, 0.045, 0.06, 1)
    nt.links.new(mx.outputs[2], p.inputs["Base Color"])
    p.subsurface_method = L.SSS_METHOD
    p.inputs["Subsurface Weight"].default_value = 1.0
    p.inputs["Subsurface Radius"].default_value = (0.8, 0.9, 1.0)
    p.inputs["Subsurface Scale"].default_value = 0.3
    p.inputs["Roughness"].default_value = 0.35
    p.inputs["Coat Weight"].default_value = 0.7
    p.inputs["Coat Roughness"].default_value = 0.1
    # per-cell light-on time from the Voronoi cell centre (texture space -> metres)
    cpos = n_("ShaderNodeVectorMath"); cpos.operation = "LENGTH"
    nt.links.new(vf.outputs["Position"], cpos.inputs[0])
    d = n_("ShaderNodeMath"); d.operation = "MULTIPLY"; d.inputs[1].default_value = cell
    nt.links.new(cpos.outputs["Value"], d.inputs[0])
    rnd = n_("ShaderNodeSeparateColor"); nt.links.new(vf.outputs["Color"], rnd.inputs[0])
    r = rnd.outputs[0]
    # near: t_bil - 0.06 + d/9*0.55 + r*0.25
    nA = n_("ShaderNodeMath"); nA.operation = "MULTIPLY_ADD"; nA.inputs[1].default_value = 0.55 / 9.0
    nA.inputs[2].default_value = t_bil - 0.06; nt.links.new(d.outputs[0], nA.inputs[0])
    nB = n_("ShaderNodeMath"); nB.operation = "MULTIPLY_ADD"; nB.inputs[1].default_value = 0.25
    nt.links.new(r, nB.inputs[0]); nt.links.new(nA.outputs[0], nB.inputs[2])
    # far: t_bilme - 0.04 + 0.42*ln(1 + d/9) + r*0.35
    f1 = n_("ShaderNodeMath"); f1.operation = "MULTIPLY_ADD"; f1.inputs[1].default_value = 1.0 / 9.0
    f1.inputs[2].default_value = 1.0; nt.links.new(d.outputs[0], f1.inputs[0])
    f2 = n_("ShaderNodeMath"); f2.operation = "LOGARITHM"; f2.inputs[1].default_value = math.e
    nt.links.new(f1.outputs[0], f2.inputs[0])
    f3 = n_("ShaderNodeMath"); f3.operation = "MULTIPLY_ADD"; f3.inputs[1].default_value = 0.42
    f3.inputs[2].default_value = t_bilme - 0.04; nt.links.new(f2.outputs[0], f3.inputs[0])
    f4 = n_("ShaderNodeMath"); f4.operation = "MULTIPLY_ADD"; f4.inputs[1].default_value = 0.35
    nt.links.new(r, f4.inputs[0]); nt.links.new(f3.outputs[0], f4.inputs[2])
    isnear = n_("ShaderNodeMath"); isnear.operation = "LESS_THAN"; isnear.inputs[1].default_value = 9.0
    nt.links.new(d.outputs[0], isnear.inputs[0])
    ton = n_("ShaderNodeMix"); ton.data_type = "FLOAT"
    nt.links.new(isnear.outputs[0], ton.inputs[0]); nt.links.new(f4.outputs[0], ton.inputs[2]); nt.links.new(nB.outputs[0], ton.inputs[3])
    tv = L.time_value(nt)
    dt_ = n_("ShaderNodeMath"); dt_.operation = "SUBTRACT"
    nt.links.new(tv.outputs[0], dt_.inputs[0]); nt.links.new(ton.outputs[0], dt_.inputs[1])
    on = n_("ShaderNodeMapRange"); on.interpolation_type = "SMOOTHSTEP"
    on.inputs["From Min"].default_value = 0.0; on.inputs["From Max"].default_value = 0.35
    nt.links.new(dt_.outputs[0], on.inputs["Value"])
    # glow: cytoplasm (not nucleus, not membrane), brightness varies per cell
    r3 = n_("ShaderNodeMath"); r3.operation = "POWER"; r3.inputs[1].default_value = 4.0
    nt.links.new(rnd.outputs[1], r3.inputs[0])
    br = n_("ShaderNodeMath"); br.operation = "MULTIPLY_ADD"; br.inputs[1].default_value = 3.0; br.inputs[2].default_value = 0.12
    nt.links.new(r3.outputs[0], br.inputs[0])
    cyt = n_("ShaderNodeMath"); cyt.operation = "MULTIPLY_ADD"; cyt.inputs[1].default_value = -0.75; cyt.inputs[2].default_value = 1.0
    nt.links.new(nuc.outputs[0], cyt.inputs[0])
    cyt2 = n_("ShaderNodeMath"); cyt2.operation = "MULTIPLY"
    nt.links.new(cyt.outputs[0], cyt2.inputs[0]); nt.links.new(dome.outputs[0], cyt2.inputs[1])
    e1 = n_("ShaderNodeMath"); e1.operation = "MULTIPLY"
    nt.links.new(on.outputs[0], e1.inputs[0]); nt.links.new(cyt2.outputs[0], e1.inputs[1])
    e2 = n_("ShaderNodeMath"); e2.operation = "MULTIPLY"
    nt.links.new(e1.outputs[0], e2.inputs[0]); nt.links.new(br.outputs[0], e2.inputs[1])
    e3 = n_("ShaderNodeMath"); e3.operation = "MULTIPLY"; e3.inputs[1].default_value = 3.2
    nt.links.new(e2.outputs[0], e3.inputs[0])
    # membranes: thin, faintly bright (backlit look), warmer once the cell is lit
    m1 = n_("ShaderNodeMath"); m1.operation = "MULTIPLY_ADD"; m1.inputs[1].default_value = 0.8; m1.inputs[2].default_value = 0.25
    nt.links.new(on.outputs[0], m1.inputs[0])
    m2 = n_("ShaderNodeMath"); m2.operation = "MULTIPLY"
    nt.links.new(mem.outputs[0], m2.inputs[0]); nt.links.new(m1.outputs[0], m2.inputs[1])
    ecol = n_("ShaderNodeMix"); ecol.data_type = "RGBA"
    nt.links.new(on.outputs[0], ecol.inputs[0])
    ecol.inputs[6].default_value = (0.55, 0.75, 0.85, 1); ecol.inputs[7].default_value = (1.0, 0.62, 0.3, 1)
    em_c = n_("ShaderNodeEmission"); nt.links.new(ecol.outputs[2], em_c.inputs["Color"]); nt.links.new(m2.outputs[0], em_c.inputs["Strength"])
    em_a = n_("ShaderNodeEmission"); em_a.inputs["Color"].default_value = (1.0, 0.36, 0.07, 1)
    nt.links.new(e3.outputs[0], em_a.inputs["Strength"])
    add1 = n_("ShaderNodeAddShader"); nt.links.new(p.outputs[0], add1.inputs[0]); nt.links.new(em_a.outputs[0], add1.inputs[1])
    add2 = n_("ShaderNodeAddShader"); nt.links.new(add1.outputs[0], add2.inputs[0]); nt.links.new(em_c.outputs[0], add2.inputs[1])
    out = [x for x in nt.nodes if x.type == "OUTPUT_MATERIAL"][0]
    nt.links.new(add2.outputs[0], out.inputs["Surface"])
    m.cycles.emission_sampling = "NONE"
    L.fog_wrap(m)
    return m


C.run("sh10", build)
