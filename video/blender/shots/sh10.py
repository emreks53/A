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
    for k in range(260):
        while True:
            p = Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-1, 1)))
            if p.length < 1:
                break
        p = Vector((p.x * R_CELL * 0.8, p.y * R_CELL * 0.8, p.z * R_CELL * 0.45)) + hero_c
        if (p - hero_c - Vector((0.12, 0.05, -0.05))).length < 0.33:
            continue
        o = L.obj_from_mesh(f"mito_{k:03d}", mm[k % 6], loc=p)
        o.rotation_euler = (rng.uniform(0, 6.3), rng.uniform(0, 6.3), rng.uniform(0, 6.3))
    # camera starts just above the hero mitochondrion, looking down at it (myofibril-free cell)
    mito_p = hero_c + Vector((-0.35, -0.2, 0.12))
    m_out = L.mat_mito_outer(); m_cr = L.mat_cristae()
    for i, off in enumerate((Vector((0, 0, 0)), Vector((0.03, 0.016, -0.004)), Vector((-0.028, -0.02, -0.006)))):
        ln, wd = (0.034, 0.0135) if i == 0 else (0.028, 0.011)
        ob = L.obj_from_mesh(f"heroMito{i}", L.mito_mesh(f"hm{i}", length=ln, width=wd, seed=60 + i, bend=0.1), m_out,
                             loc=mito_p + off)
        ob.rotation_euler = (0, 0, 0.3 * i)
        cr = L.obj_from_mesh(f"heroCristae{i}", L.cristae_mesh(f"hc{i}", length=ln, width=wd * 0.9, n=12, seed=i), m_cr)
        cr.parent = ob
        sol = cr.modifiers.new("solid", "SOLIDIFY"); sol.thickness = 0.0009; sol.offset = 0
    # ER-like membrane sheets / granules near the start
    bmg = bmesh.new()
    for k in range(900):
        p = mito_p + Vector((rng.uniform(-0.15, 0.15), rng.uniform(-0.15, 0.15), rng.uniform(-0.1, 0.2)))
        r = bmesh.ops.create_icosphere(bmg, subdivisions=1, radius=rng.uniform(0.0006, 0.0014))
        bmesh.ops.translate(bmg, vec=p, verts=r["verts"])
    me = bpy.data.meshes.new("granules"); bmg.to_mesh(me); bmg.free()
    m_gr = L.mat_wet_tissue("Granule", base=(0.6, 0.45, 0.35), rough=0.3, coat=0.0, sss_scale=0.001)[0]
    L.fog_wrap(m_gr)
    L.obj_from_mesh("granules", me, m_gr)

    # ---------------------------------------------------------------- the field
    m_cell = mat_field_cell(t_bil)
    variants = []
    for k in range(5):
        me = L.blob_mesh(f"cellv{k}", radius=R_CELL, sub=3, seed=300 + k, amp=0.12, freq=1.1, squash=(1, 1, 0.6))
        me.materials.append(m_cell)
        o = L.obj_from_mesh(f"cellv{k}", me, loc=(0, 0, -500))
        o.hide_render = True
        variants.append(o)
    vcol = bpy.data.collections.new("cellVariants")
    for o in variants:
        for c in o.users_collection:
            c.objects.unlink(o)
        vcol.objects.link(o)
    import numpy as np
    rs = np.random.RandomState(11)
    sp = 1.72
    N = 260
    ii, jj = np.mgrid[-N // 2:N // 2, -N // 2:N // 2]
    x = (ii + 0.5 * (jj % 2)) * sp + rs.uniform(-0.18, 0.18, ii.shape)
    y = jj * sp * 0.866 + rs.uniform(-0.18, 0.18, ii.shape)
    x = x.ravel(); y = y.ravel()
    d = np.sqrt(x * x + y * y)
    keep = d > 1.2                                   # hero cell sits at the origin
    x, y, d = x[keep], y[keep], d[keep]
    z = np.array([0.35 * noise.noise(Vector((a * 0.03, b * 0.03, 0.5))) + R_CELL * 0.5 for a, b in zip(x, y)])
    rnd = rs.uniform(0, 1, x.shape)
    # light-on schedule: the "known" ones nearby one after another, then waves to infinity
    near = d < 9.0
    ton = np.where(near, t_bil - 0.06 + (d / 9.0) * 0.55 + rnd * 0.25,
                   t_bilme - 0.04 + 0.42 * np.log1p(d / 9.0) + 0.06 * np.sin(np.arctan2(y, x) * 5 + d * 0.15) + rnd * 0.35)
    pm = bpy.data.meshes.new("fieldPts")
    pm.vertices.add(len(x))
    pm.vertices.foreach_set("co", np.stack([x, y, z], -1).astype(np.float32).ravel())
    for nm, arr in (("ton", ton), ("rnd", rnd)):
        a = pm.attributes.new(nm, "FLOAT", "POINT"); a.data.foreach_set("value", arr.astype(np.float32))
    pts = L.obj_from_mesh("field", pm)
    gn = field_gn(vcol)
    md = pts.modifiers.new("inst", "NODES"); md.node_group = gn
    print(f"[sh10] field cells: {len(x)}")

    # ---------------------------------------------------------------- camera: exponential pull back
    cam = C.camera("cam", lens=35, loc=(0, 0, 1), fstop=60.0, focus=0.05, clip_start=0.002, clip_end=2000)
    cam.data.dof.aperture_blades = 0
    look0 = mito_p
    t_s = ctx.t0 - 0.3
    t_exit = t_s + 1.35                    # membrane crossing
    locs, rots, foc, fst, fdist = [], [], [], [], []
    prev = None
    d0, d1 = 0.055, 260.0
    for t in times:
        u = C.remap(t, t_s, ctx.t1 + 0.25, lambda v: v)
        # log-distance ease: slow start, accelerating, then a long glide
        w = C.smoother(u) * 0.75 + u * 0.25
        dist = d0 * (d1 / d0) ** w
        # direction from target: start straight above (looking down at the mito), lean back to
        # an oblique view so the tissue horizon settles below the key-word band
        el = C.lerp(88.0, 24.0, C.remap(t, t_s + 0.8, ctx.t1, C.smooth))
        az = C.lerp(-60.0, -35.0, C.remap(t, t_s, ctx.t1))
        tgt = look0.lerp(Vector((0, 0, 0)), C.remap(t, t_s, t_exit + 1.0, C.smooth))
        dirv = Vector((math.cos(math.radians(el)) * math.cos(math.radians(az)),
                       math.cos(math.radians(el)) * math.sin(math.radians(az)),
                       math.sin(math.radians(el))))
        p = tgt + dirv * dist
        # aim: look at target but tilt up as we rise so the horizon sits at ~y 900 px
        look = tgt + Vector((0, 0, dist * C.lerp(0.0, 0.42, C.remap(t, t_exit, ctx.t1, C.smooth))))
        q = (look - p).to_track_quat("-Z", "Y")
        e = q.to_euler("XYZ", prev) if prev else q.to_euler("XYZ")
        prev = e
        locs.append(tuple(p)); rots.append(tuple(e))
        foc.append(max(0.03, (tgt - p).length))
        fst.append(C.lerp(60.0, 8.0, C.remap(t, t_s, t_exit + 0.6)))
        fdist.append(max(0.11, dist * 1.1))
    L.bake(cam, frames, "location", locs)
    L.bake(cam, frames, "rotation_euler", rots)
    L.bake_id(cam.data, frames, "dof.focus_distance", foc)
    L.bake_id(cam.data, frames, "dof.aperture_fstop", fst)
    C.handheld(cam, amp_loc=0.0, amp_rot=0.0015, speed=0.5, seed=10)
    L.bake_id(fg, frames, 'nodes["dist"].outputs[0].default_value', fdist)
    # haze turns from teal cytoplasm to deep blue-black void outside
    cols = [C.lerp((0.010, 0.032, 0.036), (0.004, 0.010, 0.014), C.remap(t, t_exit - 0.2, t_exit + 1.2)) for t in times]
    L.bake_id(fg, frames, 'nodes["color"].outputs[0].default_value', [(*c, 1) for c in cols])
    bg = [n for n in sc.world.node_tree.nodes if n.type == "BACKGROUND"][0]
    L.bake_id(sc.world.node_tree, frames, f'nodes["{bg.name}"].inputs[0].default_value', [(*c, 1) for c in cols])

    C.empty("TRK_cells", tuple(hero_c + Vector((0, 0, R_CELL * 0.4))))

    # ---------------------------------------------------------------- light
    s1 = C.sun(elev_deg=35, azim_deg=130, strength=0.9, kelvin_k=3200, angle_deg=6, name="amberKey")
    s2 = C.sun(elev_deg=60, azim_deg=-40, strength=0.35, kelvin_k=12000, angle_deg=20, name="tealFill")
    s2.data.color = (0.45, 0.85, 1.0)
    il = C.point_light("probe", power=0.03, radius=0.01, kelvin_k=4500)
    il.parent = cam; il.location = (0, 0.01, 0)
    L.bake_id(il.data, frames, "energy", [C.lerp(0.03, 0.0, C.remap(t, t_exit, t_exit + 0.4)) for t in times])
    sc.view_settings.exposure = 0.3
    L.budget_denoise()
    ov = dict(L.LEAN)
    ov["transmission_bounces"] = 3
    ov["transparent_bounces"] = 6
    return ov


# --------------------------------------------------------------------------- materials


def mat_membrane():
    """Hero cell plasma membrane: thin translucent glossy film (seen from inside first)."""
    m, nt, p = C.new_mat("Membrane")
    p.inputs["Base Color"].default_value = (0.55, 0.85, 0.85, 1)
    p.inputs["Transmission Weight"].default_value = 0.85
    p.inputs["Roughness"].default_value = 0.2
    p.inputs["IOR"].default_value = 1.1
    p.inputs["Coat Weight"].default_value = 0.5
    p.inputs["Coat Roughness"].default_value = 0.08
    tc = L._n(nt, "ShaderNodeTexCoord")
    nz = L._n(nt, "ShaderNodeTexNoise", **{"Scale": 30.0, "Detail": 4.0})
    nt.links.new(tc.outputs["Object"], nz.inputs["Vector"])
    L._bump_chain(nt, p, [(nz.outputs["Fac"], 0.15)], distance=0.004)
    L.fog_wrap(m)
    return m


def mat_field_cell(t_bil):
    """Instanced tissue cell: dark glossy teal body in shadow; when its 'ton' time passes it glows
    warm amber from within (nucleus-shaped core via facing ratio) and keeps a soft flicker."""
    m, nt, p = C.new_mat("FieldCell")
    p.inputs["Base Color"].default_value = (0.03, 0.07, 0.08, 1)
    p.inputs["Roughness"].default_value = 0.35
    p.inputs["Coat Weight"].default_value = 0.6
    p.inputs["Coat Roughness"].default_value = 0.1
    tv = L.time_value(nt)
    at = L._n(nt, "ShaderNodeAttribute"); at.attribute_type = "INSTANCER"; at.attribute_name = "ton"
    ar = L._n(nt, "ShaderNodeAttribute"); ar.attribute_type = "INSTANCER"; ar.attribute_name = "rnd"
    d = L._n(nt, "ShaderNodeMath"); d.operation = "SUBTRACT"
    nt.links.new(tv.outputs[0], d.inputs[0]); nt.links.new(at.outputs["Fac"], d.inputs[1])
    on = L._n(nt, "ShaderNodeMapRange"); on.interpolation_type = "SMOOTHSTEP"
    on.inputs["From Min"].default_value = 0.0; on.inputs["From Max"].default_value = 0.35
    nt.links.new(d.outputs[0], on.inputs["Value"])
    lw = L._n(nt, "ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.4
    core = L._n(nt, "ShaderNodeMath"); core.operation = "SUBTRACT"; core.inputs[0].default_value = 1.0
    nt.links.new(lw.outputs["Facing"], core.inputs[1])
    core2 = L._n(nt, "ShaderNodeMath"); core2.operation = "POWER"; core2.inputs[1].default_value = 2.5
    nt.links.new(core.outputs[0], core2.inputs[0])
    flick = L._n(nt, "ShaderNodeMath"); flick.operation = "MULTIPLY_ADD"
    flick.inputs[1].default_value = 0.6; flick.inputs[2].default_value = 0.7
    nt.links.new(ar.outputs["Fac"], flick.inputs[0])
    e = L._n(nt, "ShaderNodeMath"); e.operation = "MULTIPLY"
    nt.links.new(on.outputs[0], e.inputs[0]); nt.links.new(core2.outputs[0], e.inputs[1])
    e2 = L._n(nt, "ShaderNodeMath"); e2.operation = "MULTIPLY"
    nt.links.new(e.outputs[0], e2.inputs[0]); nt.links.new(flick.outputs[0], e2.inputs[1])
    e3 = L._n(nt, "ShaderNodeMath"); e3.operation = "MULTIPLY"; e3.inputs[1].default_value = 7.0
    nt.links.new(e2.outputs[0], e3.inputs[0])
    p.inputs["Emission Color"].default_value = (1.0, 0.48, 0.14, 1)
    nt.links.new(e3.outputs[0], p.inputs["Emission Strength"])
    tc = L._n(nt, "ShaderNodeTexCoord")
    nz = L._n(nt, "ShaderNodeTexNoise", **{"Scale": 3.0, "Detail": 2.0})
    nt.links.new(tc.outputs["Object"], nz.inputs["Vector"])
    L._bump_chain(nt, p, [(nz.outputs["Fac"], 0.2)], distance=0.02)
    L.fog_wrap(m)
    return m


def field_gn(vcol):
    g = bpy.data.node_groups.new("S7_Field", "GeometryNodeTree")
    g.is_modifier = True
    g.interface.new_socket("Geometry", in_out="INPUT", socket_type="NodeSocketGeometry")
    g.interface.new_socket("Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
    n, l = g.nodes, g.links
    gi = n.new("NodeGroupInput"); go = n.new("NodeGroupOutput")
    ci = n.new("GeometryNodeCollectionInfo"); ci.inputs["Collection"].default_value = vcol
    ci.inputs["Separate Children"].default_value = True
    ci.inputs["Reset Children"].default_value = True
    ip = n.new("GeometryNodeInstanceOnPoints")
    ip.inputs["Pick Instance"].default_value = True
    l.new(gi.outputs[0], ip.inputs["Points"]); l.new(ci.outputs[0], ip.inputs["Instance"])
    idx = n.new("GeometryNodeInputIndex")
    l.new(idx.outputs[0], ip.inputs["Instance Index"])
    rv = n.new("FunctionNodeRandomValue"); rv.data_type = "FLOAT_VECTOR"
    for sk in rv.inputs:
        if sk.type == "VECTOR" and sk.name == "Min":
            sk.default_value = (-0.15, -0.15, 0)
        if sk.type == "VECTOR" and sk.name == "Max":
            sk.default_value = (0.15, 0.15, 6.28)
    l.new([o for o in rv.outputs if o.type == "VECTOR"][0], ip.inputs["Rotation"])
    rs = n.new("FunctionNodeRandomValue"); rs.data_type = "FLOAT"
    for sk in rs.inputs:
        if sk.type == "VALUE" and sk.name == "Min":
            sk.default_value = 0.8
        if sk.type == "VALUE" and sk.name == "Max":
            sk.default_value = 1.1
    rs.inputs["Seed"].default_value = 3
    l.new([o for o in rs.outputs if o.type == "VALUE"][0], ip.inputs["Scale"])
    l.new(ip.outputs[0], go.inputs[0])
    return g


C.run("sh10", build)
