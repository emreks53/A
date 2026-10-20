"""sh14b 99.50-104.20  Shadow sweeps in; in a dark room an old brass oil lamp glows. On "örtmek" a heavy
dark velvet cloth falls and drapes over it - yet the light still leaks through the folds and from beneath the hem.
Cloth is simulated and baked inside the script from the drop frame (deterministic for any render range).
"""
import os, sys, math, random
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import bpy
from mathutils import Vector, Matrix, Euler
import common as C
import lib_s2 as L

TABLE_Z = 0.0


def mat_velvet():
    m, nt, p = C.new_mat("velvet")
    out = nt.nodes["Material Output"]
    p.inputs["Base Color"].default_value = (0.014, 0.003, 0.006, 1)
    p.inputs["Roughness"].default_value = 0.85
    p.inputs["Specular IOR Level"].default_value = 0.25
    p.inputs["Sheen Weight"].default_value = 1.0
    p.inputs["Sheen Roughness"].default_value = 0.32
    p.inputs["Sheen Tint"].default_value = (0.55, 0.22, 0.26, 1)
    # pile direction / crush marks: low-freq noise modulating sheen; fibre noise in the bump
    tc = nt.nodes.new("ShaderNodeTexCoord")
    nz = nt.nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 9; nz.inputs["Detail"].default_value = 3
    nt.links.new(tc.outputs["Object"], nz.inputs["Vector"])
    mr = nt.nodes.new("ShaderNodeMapRange"); mr.inputs[3].default_value = 0.55; mr.inputs[4].default_value = 1.0
    nt.links.new(nz.outputs["Fac"], mr.inputs[0]); nt.links.new(mr.outputs[0], p.inputs["Sheen Weight"])
    fz = nt.nodes.new("ShaderNodeTexNoise"); fz.inputs["Scale"].default_value = 1800; fz.inputs["Detail"].default_value = 2
    nt.links.new(tc.outputs["Object"], fz.inputs["Vector"])
    bm = nt.nodes.new("ShaderNodeBump"); bm.inputs["Strength"].default_value = 0.25; bm.inputs["Distance"].default_value = 0.0003
    nt.links.new(fz.outputs["Fac"], bm.inputs["Height"]); nt.links.new(bm.outputs["Normal"], p.inputs["Normal"])
    # the weave lets a little warm light through where the lamp is close
    tr = nt.nodes.new("ShaderNodeBsdfTranslucent"); tr.inputs["Color"].default_value = (1.0, 0.35, 0.12, 1)
    ms = nt.nodes.new("ShaderNodeMixShader"); ms.inputs[0].default_value = 0.0022
    nt.links.new(p.outputs[0], ms.inputs[1]); nt.links.new(tr.outputs[0], ms.inputs[2])
    nt.links.new(ms.outputs[0], out.inputs["Surface"])
    return m


def build(ctx):
    sc = bpy.context.scene
    rng = random.Random(41)
    t_cover = ctx.word("örtmek")
    t_drop = t_cover - 0.40
    f_drop = C.t2f(t_drop)

    C.world_color((0.0015, 0.0012, 0.001), 1.0)

    # ------------------------------------------------------------ table + wall
    tex = C.ph_texture("dark_wood", "2k")
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0.1, TABLE_Z - 0.03))
    table = bpy.context.object; table.name = "table"
    table.scale = (1.8, 1.1, 0.06)
    bpy.ops.object.transform_apply(scale=True)
    bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.uv.cube_project(cube_size=1.0); bpy.ops.object.mode_set(mode="OBJECT")
    C.bevel(table, 0.006, 3)
    C.assign(table, C.mat_from_textures("table_wood", tex, scale=1.0, rough_mul=0.9))
    wt = C.ph_texture("plastered_wall_04", "2k")
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 1.15, 0.6), rotation=(math.radians(90), 0, 0))
    wall = bpy.context.object; wall.name = "wall"; wall.scale = (5, 3, 1)
    bpy.ops.object.transform_apply(scale=True)
    bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.uv.cube_project(cube_size=1.5); bpy.ops.object.mode_set(mode="OBJECT")
    C.assign(wall, C.mat_from_textures("wall", wt, scale=1.0, base_tint=(0.45, 0.38, 0.32)))

    # ------------------------------------------------------------ lamp
    objs = C.ph_model("vintage_oil_lamp", "2k")
    lamp = [o for o in objs if o.name == "vintage_oil_lamp"][0]
    flame = [o for o in objs if "flame" in o.name][0]
    glass = [o for o in objs if "glass" in o.name][0]
    for o in objs:
        o.location = (0, 0, TABLE_Z)
        o.rotation_euler = (0, 0, math.radians(-25))
    # natural proportions: the model's chimney is a 0.38 m stick; shorten it to a real ~0.22 m glass chimney
    gz0 = 0.426
    glass.data.transform(Matrix.Translation((0, 0, gz0)) @ Matrix.Diagonal((1.0, 1.0, 0.6, 1.0)) @ Matrix.Translation((0, 0, -gz0)))
    CH_TOP = gz0 + 0.376 * 0.6
    # chimney: replace the alpha-card material with real thin clear glass (soot film near the top);
    # shadow rays pass straight through so the flame light reaches the room without caustics
    gm, gnt, gp = C.new_mat("chimney_glass")
    gp.inputs["Transmission Weight"].default_value = 1.0
    gp.inputs["IOR"].default_value = 1.12
    gp.inputs["Roughness"].default_value = 0.02
    gp.inputs["Base Color"].default_value = (1.0, 0.97, 0.92, 1)
    gtc = gnt.nodes.new("ShaderNodeTexCoord"); gsz = gnt.nodes.new("ShaderNodeSeparateXYZ")
    gnt.links.new(gtc.outputs["Object"], gsz.inputs[0])
    soot = gnt.nodes.new("ShaderNodeMapRange"); soot.inputs[1].default_value = 0.62; soot.inputs[2].default_value = 0.80
    soot.inputs[3].default_value = 0.0; soot.inputs[4].default_value = 0.55
    gnt.links.new(gsz.outputs["Z"], soot.inputs[0])
    gnz = gnt.nodes.new("ShaderNodeTexNoise"); gnz.inputs["Scale"].default_value = 40
    gnt.links.new(gtc.outputs["Object"], gnz.inputs["Vector"])
    smul = gnt.nodes.new("ShaderNodeMath"); smul.operation = "MULTIPLY"
    gnt.links.new(soot.outputs[0], smul.inputs[0]); gnt.links.new(gnz.outputs["Fac"], smul.inputs[1])
    gdf = gnt.nodes.new("ShaderNodeBsdfDiffuse"); gdf.inputs["Color"].default_value = (0.02, 0.015, 0.01, 1)
    gmix = gnt.nodes.new("ShaderNodeMixShader")
    gnt.links.new(smul.outputs[0], gmix.inputs[0]); gnt.links.new(gp.outputs[0], gmix.inputs[1]); gnt.links.new(gdf.outputs[0], gmix.inputs[2])
    glp = gnt.nodes.new("ShaderNodeLightPath"); gtp = gnt.nodes.new("ShaderNodeBsdfTransparent")
    gtp.inputs[0].default_value = (1.0, 0.96, 0.9, 1)
    gms = gnt.nodes.new("ShaderNodeMixShader")
    gnt.links.new(glp.outputs["Is Shadow Ray"], gms.inputs[0]); gnt.links.new(gmix.outputs[0], gms.inputs[1]); gnt.links.new(gtp.outputs[0], gms.inputs[2])
    gnt.links.new(gms.outputs[0], gnt.nodes["Material Output"].inputs["Surface"])
    glass.data.materials[0] = gm
    # flame: emissive, hot core
    for m in flame.data.materials:
        nt = m.node_tree
        p = nt.nodes["Principled BSDF"]
        img = [n for n in nt.nodes if n.bl_idname == "ShaderNodeTexImage"]
        col_img = [n for n in img if "diff" in n.image.name.lower()] or img
        nt.links.new(col_img[0].outputs["Color"], p.inputs["Emission Color"])
        p.inputs["Emission Strength"].default_value = 45.0
        p.inputs["Base Color"].default_value = (0, 0, 0, 1)
    fz = flame.matrix_world @ Vector((0, 0, 0))
    bb = [flame.matrix_world @ Vector(c) for c in flame.bound_box]
    fc = sum(bb, Vector()) / 8
    print("[sh14b] flame centre", tuple(round(x, 3) for x in fc), flush=True)
    fl = C.point_light("flame_light", loc=fc, power=95, radius=0.009, kelvin_k=1850)
    # once covered, light bounces around inside the tent and escapes at the hem: a low warm source on the open side
    tent = C.point_light("tent_bounce", loc=(0.16, -0.06, 0.07), power=0.0, radius=0.06, kelvin_k=1900)
    for t, pw in ((t_cover - 0.1, 0.0), (t_cover + 0.4, 6.0), (ctx.t1 + 0.3, 7.0)):
        tent.data.energy = pw
        C.key(tent.data, "energy", t, None)
    # glow halo inside the glass (camera-only soft emitter: light scattering in the hot glass/air)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=0.034, location=fc + Vector((0, 0, 0.006)))
    halo = bpy.context.object; halo.name = "flame_halo"
    halo.scale.z = 1.35
    hm, hnt, hp = C.new_mat("flame_halo")
    hnt.nodes.remove(hp)
    lw = hnt.nodes.new("ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.5
    pw = hnt.nodes.new("ShaderNodeMath"); pw.operation = "POWER"; pw.inputs[1].default_value = 5.0
    iv = hnt.nodes.new("ShaderNodeMath"); iv.operation = "SUBTRACT"; iv.inputs[0].default_value = 1.0
    hnt.links.new(lw.outputs["Facing"], iv.inputs[1]); hnt.links.new(iv.outputs[0], pw.inputs[0])
    em = hnt.nodes.new("ShaderNodeEmission"); em.inputs["Color"].default_value = (1.0, 0.42, 0.10, 1); em.inputs["Strength"].default_value = 0.9
    tp = hnt.nodes.new("ShaderNodeBsdfTransparent")
    ad = hnt.nodes.new("ShaderNodeAddShader")
    mx = hnt.nodes.new("ShaderNodeMixShader")
    hnt.links.new(pw.outputs[0], mx.inputs[0]); hnt.links.new(tp.outputs[0], mx.inputs[1]); hnt.links.new(em.outputs[0], mx.inputs[2])
    ad2 = hnt.nodes.new("ShaderNodeAddShader")
    hnt.links.new(mx.outputs[0], hnt.nodes["Material Output"].inputs["Surface"])
    hm.cycles.emission_sampling = "NONE"
    halo.data.materials.append(hm)
    halo.visible_diffuse = halo.visible_glossy = halo.visible_shadow = halo.visible_transmission = False
    fl2 = C.point_light("flame_fill", loc=fc + Vector((0, 0, 0.015)), power=15, radius=0.03, kelvin_k=1700)
    # flicker
    for f in range(ctx.f0 - 4, ctx.f1 + 5):
        t = f / C.FPS
        fk = 1 + 0.06 * math.sin(t * 23.0) + 0.04 * math.sin(t * 37.3 + 1) + 0.03 * math.sin(t * 61.7 + 2)
        fl.data.energy = 95 * fk; fl.data.keyframe_insert("energy", frame=f)
        flame.scale = (1, 1, 0.96 + 0.05 * (fk - 1) / 0.13)
        flame.keyframe_insert("scale", frame=f)

    # ------------------------------------------------------------ "shadow sweeps in": daylight from the right is cut off
    win = C.area("daylight", loc=(1.6, -0.6, 1.4), look_at=(0, 0.6, 0.3), size=0.9, size_y=1.4, power=900, kelvin_k=3600)
    bpy.ops.mesh.primitive_plane_add(size=1)
    occ = bpy.context.object; occ.name = "occluder"; occ.scale = (0.7, 2.5, 1)
    occ.visible_camera = False; occ.visible_glossy = False; occ.visible_diffuse = False
    occ.rotation_euler = (0, math.radians(-60), math.radians(-20))
    C.assign(occ, C.principled("occ", base=(0, 0, 0)))
    for t, x, pw in ((ctx.t0 - 0.3, 2.4, 900), (99.45, 2.4, 900), (100.25, 0.65, 160), (100.6, 0.45, 0.0)):
        occ.location = (x, -0.1, 1.35)
        C.key(occ, "location", t, None)
        win.data.energy = pw
        C.key(win.data, "energy", t, None)

    # faint motivated bounce from the room (left, behind camera): just enough to draw the velvet sheen on the folds
    rim = C.area("room_bounce", loc=(-1.6, -1.2, 1.1), look_at=(0, 0, 0.45), size=1.2, power=4, kelvin_k=2600)

    # ------------------------------------------------------------ velvet cloth (sim baked here)
    nx = 96
    size = 1.9
    verts, faces = [], []
    for j in range(nx + 1):
        for i in range(nx + 1):
            x = (i / nx - 0.5) * size; y = (j / nx - 0.5) * size
            verts.append((x + rng.gauss(0, 0.0015), y + rng.gauss(0, 0.0015), 0.0))
    for j in range(nx):
        for i in range(nx):
            a = j * (nx + 1) + i
            faces.append((a, a + 1, a + nx + 2, a + nx + 1))
    cloth = C.mesh_obj("velvet", verts, faces)
    C.smooth_shade(cloth)
    # starts above the frame, slightly tilted and pre-sagged (as if just let go of)
    cloth.location = (-0.36, 0.05, 1.15)
    cloth.rotation_euler = (math.radians(4), math.radians(-16), math.radians(17))
    bpy.context.view_layer.update()
    me = cloth.data
    mw = cloth.matrix_world.copy()
    for v in me.vertices:
        w = mw @ v.co
        r = math.hypot(w.x, w.y)
        v.co.z += -0.10 * math.exp(-(r / 0.35) ** 2) + 0.04 * (r / 0.6) ** 2
    cmod = cloth.modifiers.new("cloth", "CLOTH")
    cs = cmod.settings
    cs.quality = 10
    cs.mass = 0.9
    cs.air_damping = 4.0
    cs.tension_stiffness = 40; cs.compression_stiffness = 40; cs.shear_stiffness = 20; cs.bending_stiffness = 1.6
    cs.tension_damping = 8; cs.compression_damping = 8; cs.shear_damping = 8; cs.bending_damping = 0.8
    cc = cmod.collision_settings
    cc.distance_min = 0.004
    cc.friction = 20
    cc.self_friction = 10
    cc.use_self_collision = True
    cc.self_distance_min = 0.003
    cc.collision_quality = 6
    pc = cmod.point_cache
    pc.frame_start = f_drop
    pc.frame_end = ctx.f1 + 4
    C.subsurf(cloth, 1, 2)
    C.assign(cloth, mat_velvet())
    # collision proxies: a render-invisible capped cylinder around the thin chimney so the cloth cannot slip through it
    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.032, depth=CH_TOP - gz0, location=(0, 0, (CH_TOP + gz0) / 2))
    prox = bpy.context.object; prox.name = "chimney_proxy"
    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.085, depth=0.03, location=(0, 0, CH_TOP))
    cap = bpy.context.object
    C.bevel(cap, 0.01, 3); C.apply_modifiers(cap)
    prox = L.join([prox, cap], "chimney_proxy")
    prox.hide_render = True
    for o in (lamp, prox, table):
        cm = o.modifiers.new("collision", "COLLISION")
        o.collision.thickness_outer = 0.008
        o.collision.cloth_friction = 80
    with bpy.context.temp_override(scene=sc, active_object=cloth, object=cloth, point_cache=pc):
        r = bpy.ops.ptcache.bake(bake=True)
    print("[sh14b] cloth bake", r, flush=True)

    # ------------------------------------------------------------ camera
    look = Vector((0, 0, 0.36))
    cam = C.camera("cam", lens=85, loc=(0.3, -3.2, 0.5), look_at=look, fstop=2.8, focus=Vector((0, 0, 0.36)))
    for t, loc, tgt in ((ctx.t0 - 0.3, (0.42, -3.25, 0.52), (0, 0, 0.37)), (102.2, (0.22, -2.95, 0.48), (0, 0, 0.36)),
                        (ctx.t1 + 0.3, (0.10, -2.70, 0.44), (0, 0, 0.33))):
        cam.location = loc
        C.point_at(cam, tgt)
        C.key(cam, "location", t, None)
        C.key(cam, "rotation_euler", t, None)
    C.handheld(cam, amp_loc=0.0012, amp_rot=0.001, speed=0.35, seed=21)
    for t, ev in ((ctx.t0, 0.0), (101.0, 0.35), (102.6, 0.35), (103.6, 0.85), (ctx.t1 + 0.3, 0.95)):
        sc.view_settings.exposure = ev
        C.key(sc.view_settings, "exposure", t, None)
    ov = {"final_spp": 12, "final_threshold": 0.03, "preview_spp": 32, "clamp_indirect": 4.0}
    L.fast_denoise_handler("FAST", "BALANCED")
    import json as _j
    ov.update(_j.loads(os.environ.get("S2_OV", "{}")))
    return ov


C.run("sh14b", build)
