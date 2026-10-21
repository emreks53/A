"""sh10 - out of the fibre into a muscle cross-section of countless cells (52.10-58.00 s).

Scale: 1 m = 100 um (lib_s7). Opens on exactly sh09's last frame: the shared fibre interior
(lib_s7.build_fibre_interior, same seeds/materials/haze/exposure, hero mitochondrion at ~(535, 842)
px). The probe pulls back exponentially along the corridor, through the sarcolemma (bilayer sheen),
and rises over a muscle cross-section: one continuous Voronoi tissue sheet (polygonal fibres,
thin bright membranes, small peripheral nuclei, translucent blue-grey cytoplasm) curving to a hazy
horizon. "bildigimiz": the closest ~10 cells light warmly one after another; "bilmedigimiz": an
amber front rolls out over the dark tissue to the horizon; "hadsiz": uncountable, the camera has
settled and the key-word band (y 520-820) is the dark void above the horizon. Exit: sparse warm
glints receding into a cooling grey haze (-> sh11 rain).
"""
import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import bpy, bmesh
from mathutils import Vector, Euler, Quaternion, Matrix, noise
import common as C
import lib_s7 as L

R_CELL = 0.8
VOID = (0.004, 0.009, 0.013)


def build(ctx):
    sc = bpy.context.scene
    t_bil = ctx.word("bildiğimiz")
    t_bilme = ctx.word("bilmediğimiz")
    t_had = ctx.word("hadsiz")
    frames = list(range(ctx.f0 - 3, ctx.f1 + 3))
    times = [f / C.FPS for f in frames]
    HO = L.INTERIOR_HANDOFF
    C.world_color(HO["fog_color"], 1.0)
    fg = L.fog_group(color=HO["fog_color"], dist=HO["fog_dist"], strength=1.0, power=HO["fog_power"])

    # ---------------------------------------------------------------- the hero fibre (dome) + interior
    hero_c = Vector((0, 0, R_CELL * 0.55))
    m_mem = mat_membrane()
    dome = L.obj_from_mesh("heroCell", L.blob_mesh("heroCellMe", radius=R_CELL, sub=6, seed=5, amp=0.04, freq=1.2,
                                                   ruffle=0.008, ruffle_freq=14, squash=(1, 1, 0.62)), m_mem, loc=hero_c)
    # interior frame: local X -> world +X (view), local Y -> world +Z (myofibrils), local Z -> world -Y
    H = hero_c + Vector((-0.55, 0, 0))
    Mrot = Matrix(((1, 0, 0), (0, 0, -1), (0, 1, 0)))       # columns: X, Y(local)->Z, Z(local)->-Y
    M = Matrix.Translation(H) @ Mrot.to_4x4()
    inter = L.build_fibre_interior("interiorRoot", M, fibre_c=HO["fibre_c"], fibre_r=HO["fibre_r"], seed=909,
                                   y_half=HO["y_half"])
    print(f"[sh10] interior: {inter['fibrils']} myofibrils, {inter['mitos']} mitochondria")
    hero_objs = [dome] + inter["objects"]
    # exit point: ray-cast the dome wall along -X from the hero mitochondrion
    org = H - dome.location
    hit, loc_, _, _ = dome.ray_cast(org, Vector((-1, 0, 0)))
    d_wall = (H - (loc_ + dome.location)).length if hit else 0.25
    print(f"[sh10] sarcolemma {d_wall:.3f} m behind the start")

    # ---------------------------------------------------------------- the tissue sheet
    sheet_me = sheet_mesh(size=1800.0, n=420, R=2600.0, z0=R_CELL * 0.5, hole=R_CELL * 1.1)
    m_sheet = mat_sheet(t_bil, t_bilme)
    L.obj_from_mesh("tissueSheet", sheet_me, m_sheet)
    # a full (unholed) copy replaces it when the dome starts fading, so neither the cyan membranes
    # inside the dome nor a black hole ever show
    sheet_holed = bpy.data.objects["tissueSheet"]
    patch = L.obj_from_mesh("tissueSheetFull", sheet_mesh(size=1800.0, n=420, R=2600.0, z0=R_CELL * 0.5, hole=0.0), m_sheet)

    # ---------------------------------------------------------------- camera: exponential pull back
    cam_start = H + Mrot @ Vector(HO["cam_local"])
    cam = C.camera("cam", lens=35, loc=tuple(cam_start), fstop=HO["fstop"], focus=HO["focus"], clip_start=0.002,
                   clip_end=3000)
    cam.data.dof.aperture_blades = 0
    t_s = 1250 / C.FPS                                   # hand-off frame: d = 0.03 exactly
    d0, d1 = -HO["cam_local"][0], 130.0

    def dist_at(t):
        u = C.remap(t, t_s, ctx.t1 + 0.25, lambda v: max(0.0, min(1.0, v)))
        return d0 * (d1 / d0) ** (C.smoother(u) * 0.45 + u * 0.55)
    t_exit = next(t_s + i / 240 for i in range(2400) if dist_at(t_s + i / 240) > d_wall)
    print(f"[sh10] membrane crossing at {t_exit:.2f}s")
    t_set = t_had - 0.15                                 # framing settled for "HADSIZ"
    locs, rots, foc, fst, fdist, fcol, expo = [], [], [], [], [], [], []
    prev = None
    for t in times:
        dist = dist_at(t)
        # elevation: level inside, rising to look down on the honeycomb, then settling low
        el = C.lerp(0.0, 52.0, C.remap(t, t_exit + 0.05, t_bil + 0.1, C.smooth))
        el = C.lerp(el, 17.0, C.remap(t, t_bil + 0.4, t_set, C.smooth))
        az = C.lerp(180.0, 205.0, C.remap(t, t_exit, t_set, C.smooth))
        tgt = H.lerp(hero_c, C.remap(t, t_exit, t_exit + 1.0, C.smooth))
        dirv = Vector((math.cos(math.radians(el)) * math.cos(math.radians(az)),
                       math.cos(math.radians(el)) * math.sin(math.radians(az)),
                       math.sin(math.radians(el))))
        k_off = 1.0 - C.remap(t, t_exit - 0.2, t_exit + 0.4, C.smooth)
        off = Mrot @ Vector((0, HO["cam_local"][1], 0)) * k_off      # hand-off framing offset (mito at y~842)
        p = tgt + dirv * dist + off
        if t > t_exit:                                       # keep >= 2 cm clear of the dome surface
            rel = p - hero_c
            ax = Vector((R_CELL + 0.02, R_CELL + 0.02, R_CELL * 0.62 + 0.02))
            e = math.sqrt((rel.x / ax.x) ** 2 + (rel.y / ax.y) ** 2 + (rel.z / ax.z) ** 2)
            if e < 1.0:
                p = hero_c + rel / e
        look = tgt + off + Vector((0, 0, dist * C.lerp(0.0, 0.13, C.remap(t, t_bil + 0.4, t_set, C.smooth))))
        f = (look - p).normalized()
        rt = f.cross(Vector((0, 0, 1)))
        rt = rt.normalized() if rt.length > 1e-6 else Vector((0, -1, 0))
        up = rt.cross(f).normalized()
        q = Matrix((rt, up, -f)).transposed().to_quaternion()
        e = q.to_euler("XYZ", prev) if prev else q.to_euler("XYZ")
        prev = e
        locs.append(tuple(p)); rots.append(tuple(e))
        # focus: the hero mito, then the membrane film for a few frames as we cross, then the sheet
        if t < t_exit:
            fd = dist - 0.0035
        elif t < t_exit + 0.25:
            fd = max(0.004, dist - d_wall)                  # the sarcolemma film just in front of the lens
        else:
            fd = max(0.05, (tgt - p).length)
        foc.append(fd)
        fst.append(C.lerp(HO["fstop"], 8.0, C.remap(t, t_exit - 0.1, t_exit + 0.6)))
        # haze: interior hand-off -> blue-black void, longer and cooling to sh11 grey at the end
        k_out = C.remap(t, t_exit - 0.1, t_exit + 0.5, C.smooth)
        k_end = C.remap(t, t_had + 0.6, ctx.t1 + 0.1, C.smooth)
        fdist.append(C.lerp(HO["fog_dist"], max(0.3, dist * 0.75), k_out) * C.lerp(1.0, 3.0, k_end))
        col = C.lerp(HO["fog_color"], VOID, k_out)
        fcol.append(C.lerp(col, (0.022, 0.024, 0.027), k_end))
        expo.append(C.lerp(HO["exposure"], 0.3, k_out))
    L.bake(cam, frames, "location", locs)
    L.bake(cam, frames, "rotation_euler", rots)
    L.bake_id(cam.data, frames, "dof.focus_distance", foc)
    L.bake_id(cam.data, frames, "dof.aperture_fstop", fst)
    C.handheld(cam, **HO["handheld"])          # same noise as sh09 -> identical f1250 camera matrix
    L.bake_id(fg, frames, 'nodes["dist"].outputs[0].default_value', fdist)
    L.bake_id(fg, frames, 'nodes["color"].outputs[0].default_value', [(*c, 1) for c in fcol])
    bg = [n for n in sc.world.node_tree.nodes if n.type == "BACKGROUND"][0]
    L.bake_id(sc.world.node_tree, frames, f'nodes["{bg.name}"].inputs[0].default_value', [(*c, 1) for c in fcol])
    L.bake_id(sc, frames, "view_settings.exposure", expo)

    # the dome + interior fade to transparent over 12 frames once we are clear, then stop rendering
    # interior: hidden in one frame at t_exit+0.25, behind the dome film (alpha ~0.8 seen from outside)
    f_in0 = C.t2f(t_exit + 0.25)
    for o in inter["objects"]:
        L.bake(o, [frames[0], f_in0], "hide_render", [0.0, 1.0], interp="CONSTANT")
    f_fade0 = C.t2f(t_exit + 0.45)
    fade_group_animate([dome], frames, f_fade0, 12, "S7_FadeDome")
    L.bake(dome, [frames[0], f_fade0 + 13], "hide_render", [0.0, 1.0], interp="CONSTANT")
    # swap the holed sheet for the full one while the dome is still opaque over the hole
    L.bake(patch, [frames[0], f_fade0], "hide_render", [1.0, 0.0], interp="CONSTANT")
    L.bake(sheet_holed, [frames[0], f_fade0], "hide_render", [0.0, 1.0], interp="CONSTANT")

    # counter tracker: on screen from frame 1306; parked 10 m behind the lens before
    trk = C.empty("TRK_cells", tuple(hero_c + Vector((0, 0, R_CELL * 0.4))))
    base = Vector(trk.location)
    tl = []
    for f, lc, rt_ in zip(frames, locs, rots):
        if f >= 1306:
            tl.append(tuple(base))
        else:
            back = Euler(rt_).to_matrix() @ Vector((0, 0, 1))
            tl.append(tuple(Vector(lc) + back * 10.0))
    L.bake(trk, frames, "location", tl, interp="CONSTANT")

    # ---------------------------------------------------------------- light
    s1 = C.sun(elev_deg=35, azim_deg=130, strength=1.6, kelvin_k=3200, angle_deg=6, name="amberKey")
    L.bake_id(s1.data, frames, "energy", [C.lerp(1.6, 0.0, C.remap(t, t_bil - 0.3, 54.6)) for t in times])
    s2 = C.sun(elev_deg=60, azim_deg=-40, strength=0.8, kelvin_k=12000, angle_deg=20, name="tealFill")
    s2.data.color = (0.45, 0.85, 1.0)
    PR = HO["probe"]
    il = C.point_light("probe", power=PR["energy"], radius=PR["radius"], kelvin_k=4500)
    il.parent = cam; il.location = PR["offset"]
    il.data.specular_factor = 0.0; il.data.color = PR["color"]
    L.bake_id(il.data, frames, "energy", [C.lerp(PR["energy"], 0.0, C.remap(t, t_exit - 0.35, t_exit - 0.05)) for t in times])

    add_fog_glow(sc)
    L.budget_denoise(prefilter="ACCURATE", quality="BALANCED", final_res=80)

    # interior frames (to 1310) at 8 spp like sh09, the field at 16 spp
    def _spp(scene, *_):
        scene.render.use_compositing = scene.frame_current > 1290        # no glare on the interior (f1250 match)
        if scene.render.image_settings.color_depth == "16":
            scene.cycles.samples = 8 if scene.frame_current <= 1310 else 16
    bpy.app.handlers.frame_change_pre.append(_spp)
    ov = dict(L.LEAN)
    ov.update(transmission_bounces=3, transparent_bounces=3, final_spp=8, preview_spp=12)
    return ov


# --------------------------------------------------------------------------- helpers


def fade_group_animate(objs, frames, f0, n, name="S7_Fade"):
    """Insert a shared fade group (mix-to-transparent) into every material of `objs`; animate 1 -> 0."""
    g = bpy.data.node_groups.new(name, "ShaderNodeTree")
    g.interface.new_socket("Shader", in_out="INPUT", socket_type="NodeSocketShader")
    g.interface.new_socket("Shader", in_out="OUTPUT", socket_type="NodeSocketShader")
    gi = g.nodes.new("NodeGroupInput"); go = g.nodes.new("NodeGroupOutput")
    v = g.nodes.new("ShaderNodeValue"); v.name = "fade"; v.outputs[0].default_value = 1.0
    tr = g.nodes.new("ShaderNodeBsdfTransparent")
    mx = g.nodes.new("ShaderNodeMixShader")
    g.links.new(v.outputs[0], mx.inputs[0]); g.links.new(tr.outputs[0], mx.inputs[1]); g.links.new(gi.outputs[0], mx.inputs[2])
    g.links.new(mx.outputs[0], go.inputs[0])
    mats = set()
    for o in objs:
        if o.type == "MESH":
            for m in o.data.materials:
                if m:
                    mats.add(m)
            for c in o.children:
                if c.type == "MESH":
                    for m in c.data.materials:
                        if m:
                            mats.add(m)
    for m in mats:
        nt = m.node_tree
        out = [x for x in nt.nodes if x.type == "OUTPUT_MATERIAL"][0]
        src = out.inputs["Surface"].links[0].from_socket
        gn = nt.nodes.new("ShaderNodeGroup"); gn.node_tree = g
        nt.links.new(src, gn.inputs[0]); nt.links.new(gn.outputs[0], out.inputs["Surface"])
    vals = [C.smooth(1 - (f - f0) / n) if f >= f0 else 1.0 for f in frames]
    L.bake_id(g, frames, 'nodes["fade"].outputs[0].default_value', vals)


def add_fog_glow(sc):
    """Soft 'Fog Glow' bloom on the glowing cells (compositor). Silently skipped if unavailable."""
    try:
        tree = bpy.data.node_groups.new("S7_Comp", "CompositorNodeTree")
        tree.interface.new_socket("Image", in_out="OUTPUT", socket_type="NodeSocketColor")
        rl = tree.nodes.new("CompositorNodeRLayers")
        gl = tree.nodes.new("CompositorNodeGlare")
        try:
            gl.glare_type = "FOG_GLOW"
            gl.quality = "MEDIUM"
            gl.threshold = 1.0
            gl.size = 7
            gl.mix = -0.6
        except Exception:
            for k_, v_ in (("Type", "Fog Glow"), ("Threshold", 1.0), ("Strength", 0.4), ("Size", 0.6)):
                if k_ in gl.inputs:
                    try:
                        gl.inputs[k_].default_value = v_
                    except Exception:
                        pass
        go = tree.nodes.new("NodeGroupOutput")
        tree.links.new(rl.outputs["Image"], gl.inputs["Image"])
        tree.links.new(gl.outputs["Image"], go.inputs[0])
        sc.render.compositor_device = "CPU"
        sc.compositing_node_group = tree
        sc.render.use_compositing = True
        print("[sh10] fog glow on")
    except Exception as e:
        print(f"[sh10] fog glow unavailable: {e}")


def mat_membrane():
    """Hero fibre sarcolemma: thin translucent film with lipid-bilayer thin-film sheen and fine
    texture; alpha fades out when the film is closer than ~3 mm to the lens (no flash/fog wall)."""
    m, nt, p = C.new_mat("Membrane")
    p.inputs["Base Color"].default_value = (0.55, 0.42, 0.42, 1)
    p.inputs["Roughness"].default_value = 0.25
    p.inputs["Coat Weight"].default_value = 0.3
    p.inputs["Coat Roughness"].default_value = 0.08
    p.inputs["Thin Film Thickness"].default_value = 420.0
    p.inputs["Thin Film IOR"].default_value = 1.45
    p.inputs["Sheen Weight"].default_value = 0.15
    tc = L._n(nt, "ShaderNodeTexCoord")
    nz = L._n(nt, "ShaderNodeTexNoise", **{"Scale": 30.0, "Detail": 4.0})
    nt.links.new(tc.outputs["Object"], nz.inputs["Vector"])
    nf = L._n(nt, "ShaderNodeTexNoise", **{"Scale": 600.0, "Detail": 3.0})
    nt.links.new(tc.outputs["Object"], nf.inputs["Vector"])
    L._bump_chain(nt, p, [(nz.outputs["Fac"], 0.2), (nf.outputs["Fac"], 0.12)], distance=0.004)
    lw = L._n(nt, "ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.3
    al = L._n(nt, "ShaderNodeMapRange"); al.inputs["To Min"].default_value = 0.22; al.inputs["To Max"].default_value = 0.8
    nt.links.new(lw.outputs["Facing"], al.inputs["Value"])
    cd = L._n(nt, "ShaderNodeCameraData")
    near = L._n(nt, "ShaderNodeMapRange"); near.interpolation_type = "SMOOTHSTEP"
    near.inputs["From Min"].default_value = 0.002; near.inputs["From Max"].default_value = 0.010
    nt.links.new(cd.outputs["View Distance"], near.inputs["Value"])
    a2 = L._n(nt, "ShaderNodeMath"); a2.operation = "MULTIPLY"
    nt.links.new(al.outputs[0], a2.inputs[0]); nt.links.new(near.outputs[0], a2.inputs[1])
    nt.links.new(a2.outputs[0], p.inputs["Alpha"])
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
    """Muscle cross-section honeycomb (like a fluorescence micrograph): polygonal fibres (2-D
    Voronoi, varied size), thin bright membranes (emission only), 1-3 small oval peripheral nuclei
    per polygon, translucent dim blue-grey cytoplasm. ~35 % of the cells light from within (warm
    amber, granular) at a per-cell time: the ~10 nearest one after another from "bildigimiz", then
    an amber front rolling out over the dark tissue from "bilmedigimiz". Rise 0.15 s, decay to ~30 %."""
    m, nt, p = C.new_mat("TissueSheet")
    n_ = lambda k, **kw: L._n(nt, k, **kw)
    lnk = nt.links.new

    def math_(op, a, b=None, c=None):
        nd = n_("ShaderNodeMath"); nd.operation = op
        for i, v in enumerate((a, b, c)):
            if v is None:
                continue
            if hasattr(v, "is_output"):
                lnk(v, nd.inputs[i])
            else:
                nd.inputs[i].default_value = v
        return nd.outputs[0]

    def mapr(v, a0, a1, b0=0.0, b1=1.0, smooth=True):
        nd = n_("ShaderNodeMapRange")
        if smooth:
            nd.interpolation_type = "SMOOTHSTEP"
        nd.inputs["From Min"].default_value = a0; nd.inputs["From Max"].default_value = a1
        nd.inputs["To Min"].default_value = b0; nd.inputs["To Max"].default_value = b1
        lnk(v, nd.inputs["Value"])
        return nd.outputs[0]
    tc = n_("ShaderNodeTexCoord")
    sc_ = n_("ShaderNodeVectorMath"); sc_.operation = "SCALE"; sc_.inputs[3].default_value = 1.0 / cell
    lnk(tc.outputs["Object"], sc_.inputs[0])
    vf = n_("ShaderNodeTexVoronoi"); vf.voronoi_dimensions = "2D"; vf.feature = "F1"
    vf.inputs["Randomness"].default_value = 0.85; lnk(sc_.outputs[0], vf.inputs["Vector"])
    ve = n_("ShaderNodeTexVoronoi"); ve.voronoi_dimensions = "2D"; ve.feature = "DISTANCE_TO_EDGE"
    ve.inputs["Randomness"].default_value = 0.85; lnk(sc_.outputs[0], ve.inputs["Vector"])
    mem = mapr(ve.outputs["Distance"], 0.0, 0.06, 1.0, 0.0)
    dome = mapr(ve.outputs["Distance"], 0.0, 0.25)
    # peripheral oval nuclei: a finer, stretched Voronoi, kept only in a band just inside the membrane
    mp = n_("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (3.4 / cell, 2.2 / cell, 1.0)
    mp.inputs["Rotation"].default_value = (0, 0, 0.6)
    lnk(tc.outputs["Object"], mp.inputs["Vector"])
    vn = n_("ShaderNodeTexVoronoi"); vn.voronoi_dimensions = "2D"; vn.feature = "F1"
    lnk(mp.outputs[0], vn.inputs["Vector"])
    nd = mapr(vn.outputs["Distance"], 0.18, 0.30, 1.0, 0.0)
    band = math_("MULTIPLY", mapr(ve.outputs["Distance"], 0.025, 0.05), mapr(ve.outputs["Distance"], 0.1, 0.16, 1.0, 0.0))
    nsep = n_("ShaderNodeSeparateColor"); lnk(vn.outputs["Color"], nsep.inputs[0])
    ngate = math_("GREATER_THAN", nsep.outputs[0], 0.45)
    nuc = math_("MULTIPLY", math_("MULTIPLY", nd, band), ngate)
    fine = n_("ShaderNodeTexNoise", **{"Scale": 25.0, "Detail": 4.0})
    lnk(tc.outputs["Object"], fine.inputs["Vector"])
    L._bump_chain(nt, p, [(dome, 0.05), (nuc, 0.06), (fine.outputs["Fac"], 0.02)], distance=0.12)
    mx = n_("ShaderNodeMix"); mx.data_type = "RGBA"; lnk(nuc, mx.inputs[0])
    mx.inputs[6].default_value = (0.15, 0.19, 0.23, 1); mx.inputs[7].default_value = (0.07, 0.08, 0.10, 1)
    lnk(mx.outputs[2], p.inputs["Base Color"])
    p.subsurface_method = L.SSS_METHOD
    p.inputs["Subsurface Weight"].default_value = 1.0
    p.inputs["Subsurface Radius"].default_value = (0.8, 0.9, 1.0)
    p.inputs["Subsurface Scale"].default_value = 0.3
    p.inputs["Roughness"].default_value = 0.35
    p.inputs["Coat Weight"].default_value = 0.3
    p.inputs["Coat Roughness"].default_value = 0.25
    # per-cell timing from the Voronoi cell centre (texture space -> metres)
    cpos = n_("ShaderNodeVectorMath"); cpos.operation = "LENGTH"; lnk(vf.outputs["Position"], cpos.inputs[0])
    d = math_("MULTIPLY", cpos.outputs["Value"], cell)
    rnd = n_("ShaderNodeSeparateColor"); lnk(vf.outputs["Color"], rnd.inputs[0])
    r, g_, b_ = rnd.outputs[0], rnd.outputs[1], rnd.outputs[2]
    near_t = math_("MULTIPLY_ADD", r, 0.15, math_("MULTIPLY_ADD", d, 0.5 / 0.6, t_bil - 0.06))
    far_t = math_("MULTIPLY_ADD", r, 0.10, math_("MULTIPLY_ADD", math_("LOGARITHM", math_("MULTIPLY_ADD", d, 1.0 / 6.0, 1.0), math.e),
                                                  0.30, t_bilme - 0.04))
    isnear = math_("LESS_THAN", d, 0.6)
    ton = n_("ShaderNodeMix"); ton.data_type = "FLOAT"
    lnk(isnear, ton.inputs[0]); lnk(far_t, ton.inputs[2]); lnk(near_t, ton.inputs[3])
    tv = L.time_value(nt)
    dt_ = math_("SUBTRACT", tv.outputs[0], ton.outputs[0])
    rise = mapr(dt_, 0.0, 0.15)
    # persistent glints (b < 0.12) and the near set keep a 30 % floor; all others decay to 0 (tau 0.35 s)
    keep = math_("MAXIMUM", math_("LESS_THAN", b_, 0.12), isnear)
    ex_ = math_("EXPONENT", math_("DIVIDE", math_("MAXIMUM", dt_, 0.0), -0.35))
    floor_ = math_("MULTIPLY", keep, 0.3)
    decay = math_("MULTIPLY_ADD", ex_, math_("SUBTRACT", 1.0, floor_), floor_)
    gate = math_("MAXIMUM", math_("LESS_THAN", b_, 0.35), isnear)          # ~35 % of cells (all near ones)
    on = math_("MULTIPLY", math_("MULTIPLY", rise, decay), gate)
    br = math_("MULTIPLY", math_("MULTIPLY_ADD", math_("POWER", g_, 2.0), 1.0, 0.6),          # 0.6 .. 1.6
               math_("MULTIPLY_ADD", math_("LESS_THAN", b_, 0.12), 1.0, 1.0))                    # glints x2
    gran = n_("ShaderNodeTexNoise", **{"Scale": 40.0, "Detail": 2.0}); lnk(tc.outputs["Object"], gran.inputs["Vector"])
    granular = math_("MULTIPLY_ADD", gran.outputs["Fac"], 0.6, 0.7)
    cyt = math_("MULTIPLY", math_("MULTIPLY_ADD", nuc, -0.85, 1.0), dome)
    e = math_("MULTIPLY", math_("MULTIPLY", math_("MULTIPLY", on, cyt), br), granular)
    e3 = math_("MULTIPLY", e, 2.2)
    # membranes: thin, emission only, cool when dark, warm once the cell is lit
    m1 = math_("MULTIPLY_ADD", on, 0.7, 0.18)
    m2 = math_("MULTIPLY", mem, m1)
    ecol = n_("ShaderNodeMix"); ecol.data_type = "RGBA"; lnk(on, ecol.inputs[0])
    ecol.inputs[6].default_value = (0.55, 0.75, 0.85, 1); ecol.inputs[7].default_value = (1.0, 0.62, 0.3, 1)
    em_c = n_("ShaderNodeEmission"); lnk(ecol.outputs[2], em_c.inputs["Color"]); lnk(m2, em_c.inputs["Strength"])
    em_a = n_("ShaderNodeEmission"); em_a.inputs["Color"].default_value = (1.0, 0.40, 0.06, 1)
    lnk(e3, em_a.inputs["Strength"])
    add1 = n_("ShaderNodeAddShader"); lnk(p.outputs[0], add1.inputs[0]); lnk(em_a.outputs[0], add1.inputs[1])
    add2 = n_("ShaderNodeAddShader"); lnk(add1.outputs[0], add2.inputs[0]); lnk(em_c.outputs[0], add2.inputs[1])
    out = [x for x in nt.nodes if x.type == "OUTPUT_MATERIAL"][0]
    lnk(add2.outputs[0], out.inputs["Surface"])
    m.cycles.emission_sampling = "NONE"
    L.fog_wrap(m)
    return m


C.run("sh10", build)
