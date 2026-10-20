"""Studio S4 shared set: the morning room of sh02 + sh03 (lime-plaster wall, deep wooden window,
sheer linen curtain, worn wooden table, sofra props), plus the light rig, dust motes, curtain cloth
and the water-pour helpers. Everything is procedural or CC0 Poly Haven; deterministic (seeded).

World layout (metres, Z up):
  * left wall interior face at x = -1.00 (wall 0.45 thick), window opening y -0.05..0.85, z 0.98..2.28
  * back wall at y = +1.25, floor z = 0, ceiling z = 2.85
  * table top surface at z = TABLE_Z, table spans x -0.97..0.58, y -0.12..0.86 (short end under window)
  * sun enters through the window travelling +X / slightly -Y (= from the LEFT of a camera looking +Y)
"""
import bpy, bmesh, math, random
from mathutils import Vector, Euler, Matrix
import common as C

# ----------------------------------------------------------------------------- light rig constants
HDRI = "garden_nook"          # Poly Haven, CC0; morning garden, sun measured at 25.9 deg elevation
HDRI_RES = "2k"
SUN_ELEV = 25.9               # deg, matches the HDRI's sun
SUN_AZIM = -112.0             # deg, C.sun convention (0 = travelling +Y); here travelling +X, -0.37 Y
SUN_KELVIN = 4700
SUN_STRENGTH = 9.0            # W/m^2 (sun lamp, Cycles)
SUN_ANGLE = 0.9               # deg, slightly larger than the real disc: softer mullion shadows
HDRI_STRENGTH = 1.0
SKY_FILL_W = 60.0             # W, window-sized sky fill area light (measured by eye vs the HDRI)
SKY_FILL_K = 7500
HDRI_CLAMP = 60.0             # the HDRI's own sun is clamped (the sun lamp replaces it)
EXPOSURE = 0.0                # set per shot

CLOTH_MASS = 0.004
TABLE_Z = 0.76
WALL_X = -1.0
WALL_T = 0.45
WIN_Y0, WIN_Y1 = -0.05, 0.85
WIN_Z0, WIN_Z1 = 0.98, 2.28
FRAME_X = -1.27               # window frame plane (recessed in the deep reveal)
BACK_Y = 1.25
CEIL_Z = 2.85


def hdri_rotation_deg():
    """Rotate the HDRI so its sun sits exactly where the sun lamp comes from."""
    # garden_nook 2k: brightest pixel u=0.5994 -> blender equirect angle atan2(dy,-dx) = (u-0.5)*360
    a0 = (0.599365 - 0.5) * 360.0                       # angle of the HDRI sun direction (deg)
    az = math.radians(SUN_AZIM)
    travel = Vector((-math.sin(az), math.cos(az)))      # horizontal travel direction
    to_sun = -travel
    a1 = math.degrees(math.atan2(to_sun.y, -to_sun.x))
    return a1 - a0 - 180.0          # Blender's equirect u=0.5 faces -X (verified with a pano render)


def sun_dir():
    """Unit vector the sunlight TRAVELS along."""
    e, az = math.radians(SUN_ELEV), math.radians(SUN_AZIM)
    return Vector((-math.sin(az) * math.cos(e), math.cos(az) * math.cos(e), -math.sin(e)))


def light_rig(exposure=EXPOSURE, sun_strength=SUN_STRENGTH):
    sc = bpy.context.scene
    path = C.ph_hdri(HDRI, HDRI_RES)
    w = sc.world
    nt = w.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputWorld")
    bg = nt.nodes.new("ShaderNodeBackground")
    env = nt.nodes.new("ShaderNodeTexEnvironment")
    env.image = bpy.data.images.load(path, check_existing=True)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Rotation"].default_value[2] = math.radians(hdri_rotation_deg())
    clampn = nt.nodes.new("ShaderNodeVectorMath"); clampn.operation = "MINIMUM"
    clampn.inputs[1].default_value = (HDRI_CLAMP,) * 3
    nt.links.new(tc.outputs["Generated"], mp.inputs["Vector"])
    nt.links.new(mp.outputs["Vector"], env.inputs["Vector"])
    nt.links.new(env.outputs["Color"], clampn.inputs[0])
    nt.links.new(clampn.outputs[0], bg.inputs["Color"])
    bg.inputs["Strength"].default_value = HDRI_STRENGTH
    nt.links.new(bg.outputs[0], out.inputs["Surface"])
    s = C.sun(elev_deg=SUN_ELEV, azim_deg=SUN_AZIM, strength=sun_strength, kelvin_k=SUN_KELVIN,
              angle_deg=SUN_ANGLE, name="Sun")
    # Interior fill: the HDRI is seen directly (window view, reflections, refraction) but does NOT light
    # diffuse bounces - a sky-coloured area light filling the window opening does (same light, ~4x cheaper
    # than world sampling through a portal on CPU).
    w.cycles_visibility.diffuse = False
    w.cycles_visibility.scatter = False
    sk = bpy.data.lights.new("SkyFill", "AREA")
    sk.shape = "RECTANGLE"; sk.size = WIN_Y1 - WIN_Y0; sk.size_y = WIN_Z1 - WIN_Z0
    sk.energy = SKY_FILL_W; sk.color = C.kelvin(SKY_FILL_K)
    sk.spread = math.radians(160)
    so = bpy.data.objects.new("SkyFill", sk); C.link(so)
    so.location = (WALL_X - WALL_T - 0.02, (WIN_Y0 + WIN_Y1) / 2, (WIN_Z0 + WIN_Z1) / 2)
    so.rotation_euler = Euler((0, math.radians(90), 0), "XYZ")     # emits toward +X (into the room)
    so.visible_camera = False; so.visible_glossy = False; so.visible_transmission = False
    # a soft bounce from the sunlit garden/ground outside (warm, lower half of the opening)
    gb = bpy.data.lights.new("GroundBounce", "AREA")
    gb.shape = "RECTANGLE"; gb.size = WIN_Y1 - WIN_Y0; gb.size_y = 0.5
    gb.energy = SKY_FILL_W * 0.35; gb.color = (1.0, 0.86, 0.66)
    go = bpy.data.objects.new("GroundBounce", gb); C.link(go)
    go.location = (WALL_X - WALL_T - 0.03, (WIN_Y0 + WIN_Y1) / 2, WIN_Z0 + 0.25)
    go.rotation_euler = Euler((0, math.radians(75), 0), "XYZ")
    go.visible_camera = False; go.visible_glossy = False; go.visible_transmission = False
    sc.view_settings.exposure = exposure
    return s


# ----------------------------------------------------------------------------- materials

def box_mat(name, tex, scale=1.0, tint=None, rough_mul=1.0, rough_add=0.0, nor_strength=1.0,
            disp=0.0, coords="Object", blend=0.25, sat=1.0):
    """Principled material from a Poly Haven texture dict, BOX-projected (no UVs needed).
    `scale` = texture repeats per metre."""
    m, nt, p = C.new_mat(name)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (scale,) * 3
    nt.links.new(tc.outputs[coords], mp.inputs["Vector"])

    def img(path, noncolor):
        n = nt.nodes.new("ShaderNodeTexImage")
        n.image = bpy.data.images.load(path, check_existing=True)
        n.projection = "BOX"; n.projection_blend = blend
        if noncolor:
            n.image.colorspace_settings.name = "Non-Color"
        nt.links.new(mp.outputs["Vector"], n.inputs["Vector"])
        return n
    col = img(tex["diff"], False).outputs["Color"]
    if sat != 1.0:
        hs = nt.nodes.new("ShaderNodeHueSaturation"); hs.inputs["Saturation"].default_value = sat
        nt.links.new(col, hs.inputs["Color"]); col = hs.outputs["Color"]
    if tint:
        mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.blend_type = "MULTIPLY"
        mix.inputs[0].default_value = 1.0
        nt.links.new(col, mix.inputs[6]); mix.inputs[7].default_value = (*tint, 1)
        col = mix.outputs[2]
    nt.links.new(col, p.inputs["Base Color"])
    if "rough" in tex:
        r = img(tex["rough"], True)
        mm = nt.nodes.new("ShaderNodeMath"); mm.operation = "MULTIPLY_ADD"
        mm.inputs[1].default_value = rough_mul; mm.inputs[2].default_value = rough_add
        mm.use_clamp = True
        nt.links.new(r.outputs["Color"], mm.inputs[0]); nt.links.new(mm.outputs[0], p.inputs["Roughness"])
    nrm = None
    if "nor" in tex and nor_strength > 0:
        n = img(tex["nor"], True)
        nm = nt.nodes.new("ShaderNodeNormalMap"); nm.inputs["Strength"].default_value = nor_strength
        nt.links.new(n.outputs["Color"], nm.inputs["Color"])
        nrm = nm.outputs["Normal"]
        nt.links.new(nrm, p.inputs["Normal"])
    if "disp" in tex and disp > 0:
        dd = img(tex["disp"], True)
        dn = nt.nodes.new("ShaderNodeDisplacement"); dn.inputs["Scale"].default_value = disp
        dn.inputs["Midlevel"].default_value = 0.5
        nt.links.new(dd.outputs["Color"], dn.inputs["Height"])
        nt.links.new(dn.outputs[0], nt.nodes["Material Output"].inputs["Displacement"])
        m.displacement_method = "BUMP"
    return m


def mat_glass_shadowfix(name, tint=(0.97, 0.99, 0.98), rough=0.0, ior=1.5, shadow_pass=0.85, wavy=0.0,
                        smudge=0.0):
    """Glass that lets (most) direct light through for shadow rays: Cycles has no caustics by default,
    so pure glass would cast black shadows. Real glass transmits ~85-90% with a caustic rim."""
    m, nt, p = C.new_mat(name)
    p.inputs["Base Color"].default_value = (*tint, 1)
    p.inputs["Roughness"].default_value = rough
    p.inputs["Transmission Weight"].default_value = 1.0
    p.inputs["IOR"].default_value = ior
    if wavy > 0 or smudge > 0:
        tc = nt.nodes.new("ShaderNodeTexCoord")
        if wavy > 0:
            nz = nt.nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 3.0
            nz.inputs["Detail"].default_value = 2.0
            nt.links.new(tc.outputs["Object"], nz.inputs["Vector"])
            bp = nt.nodes.new("ShaderNodeBump"); bp.inputs["Strength"].default_value = wavy
            bp.inputs["Distance"].default_value = 0.002
            nt.links.new(nz.outputs["Fac"], bp.inputs["Height"])
            nt.links.new(bp.outputs["Normal"], p.inputs["Normal"])
        if smudge > 0:
            sm = nt.nodes.new("ShaderNodeTexNoise"); sm.inputs["Scale"].default_value = 18.0
            sm.inputs["Detail"].default_value = 6.0; sm.inputs["Roughness"].default_value = 0.7
            nt.links.new(tc.outputs["Object"], sm.inputs["Vector"])
            cr = nt.nodes.new("ShaderNodeMapRange")
            cr.inputs["From Min"].default_value = 0.5; cr.inputs["From Max"].default_value = 0.75
            cr.inputs["To Min"].default_value = rough; cr.inputs["To Max"].default_value = rough + smudge
            nt.links.new(sm.outputs["Fac"], cr.inputs["Value"])
            nt.links.new(cr.outputs["Result"], p.inputs["Roughness"])
    lp = nt.nodes.new("ShaderNodeLightPath")
    tr = nt.nodes.new("ShaderNodeBsdfTransparent"); tr.inputs["Color"].default_value = (*tint, 1)
    mixs = nt.nodes.new("ShaderNodeMixShader")
    mul = nt.nodes.new("ShaderNodeMath"); mul.operation = "MULTIPLY"; mul.inputs[1].default_value = shadow_pass
    nt.links.new(lp.outputs["Is Shadow Ray"], mul.inputs[0])
    nt.links.new(mul.outputs[0], mixs.inputs[0])
    nt.links.new(p.outputs[0], mixs.inputs[1]); nt.links.new(tr.outputs[0], mixs.inputs[2])
    nt.links.new(mixs.outputs[0], nt.nodes["Material Output"].inputs["Surface"])
    return m


_TEX = {}


def tex(name, res="2k"):
    if (name, res) not in _TEX:
        _TEX[(name, res)] = C.ph_texture(name, res)
    return _TEX[(name, res)]


# ----------------------------------------------------------------------------- geometry

def box(name, x0, x1, y0, y1, z0, z1, mat=None, bevel=0.0, seg=2):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co.x = x0 if v.co.x < 0 else x1
        v.co.y = y0 if v.co.y < 0 else y1
        v.co.z = z0 if v.co.z < 0 else z1
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = C.link(bpy.data.objects.new(name, me))
    if bevel > 0:
        b = C.bevel(o, bevel, seg); b.limit_method = "NONE"
        C.smooth_shade(o)
        o.modifiers.new("WN", "WEIGHTED_NORMAL")
    if mat:
        C.assign(o, mat)
    return o


def lathe(name, profile, segs=64, mat=None, close_bottom=False):
    """Revolve a list of (r, z) points around Z. Returns smooth-shaded object."""
    bm = bmesh.new()
    rings = []
    for i in range(segs):
        a = 2 * math.pi * i / segs
        ring = [bm.verts.new((r * math.cos(a), r * math.sin(a), z)) for r, z in profile]
        rings.append(ring)
    for i in range(segs):
        r0, r1 = rings[i], rings[(i + 1) % segs]
        for j in range(len(profile) - 1):
            bm.faces.new((r0[j], r1[j], r1[j + 1], r0[j + 1]))
    if close_bottom:
        bm.faces.new([rings[i][0] for i in range(segs)][::-1])
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = C.link(bpy.data.objects.new(name, me))
    C.smooth_shade(o)
    if mat:
        C.assign(o, mat)
    return o


# ----------------------------------------------------------------------------- the room

def build_room(detail=True):
    plaster = box_mat("LimePlaster", tex("white_plaster_rough_01"), scale=1.3, tint=(1.0, 0.94, 0.84),
                      rough_mul=0.3, rough_add=0.65, nor_strength=0.7, sat=0.6)
    # very soft large-scale tonal mottling of lime wash
    nt = plaster.node_tree; p = nt.nodes["Principled BSDF"]
    base_link = p.inputs["Base Color"].links[0].from_socket
    tc = nt.nodes.new("ShaderNodeTexCoord")
    nz = nt.nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 1.6; nz.inputs["Detail"].default_value = 4
    nt.links.new(tc.outputs["Object"], nz.inputs["Vector"])
    mr = nt.nodes.new("ShaderNodeMapRange"); mr.inputs["To Min"].default_value = 0.86; mr.inputs["To Max"].default_value = 1.04
    nt.links.new(nz.outputs["Fac"], mr.inputs["Value"])
    mx = nt.nodes.new("ShaderNodeMix"); mx.data_type = "RGBA"; mx.blend_type = "MULTIPLY"; mx.inputs[0].default_value = 1
    nt.links.new(base_link, mx.inputs[6]); nt.links.new(mr.outputs["Result"], mx.inputs[7])
    nt.links.new(mx.outputs[2], p.inputs["Base Color"])

    # left wall with the deep window opening (boolean), soft lime-plaster edges
    wall = box("WallLeft", WALL_X - WALL_T, WALL_X, -3.6, BACK_Y + 0.2, 0.0, CEIL_Z, plaster)
    cut = box("WinCut", WALL_X - WALL_T - 0.1, WALL_X + 0.1, WIN_Y0, WIN_Y1, WIN_Z0, WIN_Z1)
    b = wall.modifiers.new("Hole", "BOOLEAN"); b.object = cut; b.solver = "EXACT"; b.operation = "DIFFERENCE"
    bpy.context.view_layer.update()
    C.apply_modifiers(wall)
    cut.hide_render = True; cut.hide_viewport = True
    bv = C.bevel(wall, 0.018, 4); bv.limit_method = "ANGLE"
    C.smooth_shade(wall); wall.modifiers.new("WN", "WEIGHTED_NORMAL")
    # back / right / front walls, ceiling
    box("WallBack", -1.5, 3.2, BACK_Y, BACK_Y + 0.2, 0, CEIL_Z, plaster)
    box("WallRight", 3.0, 3.2, -3.6, BACK_Y, 0, CEIL_Z, plaster)
    box("WallFront", -1.5, 3.2, -3.8, -3.6, 0, CEIL_Z, plaster)
    ceil_m = C.principled("Ceiling", base=(0.75, 0.70, 0.62), rough=0.9)
    box("Ceiling", -1.5, 3.2, -3.8, BACK_Y + 0.2, CEIL_Z, CEIL_Z + 0.1, ceil_m)
    floor_m = box_mat("Floor", tex("old_wood_floor"), scale=0.45, tint=(0.75, 0.6, 0.48), rough_mul=0.8, rough_add=0.1)
    box("Floor", -1.5, 3.2, -3.8, BACK_Y + 0.2, -0.05, 0.0, floor_m)

    # window: interior sill board, old frame, two casements (left closed, right ajar), muntins, glass
    paint = mat_old_paint()
    sill_m = box_mat("SillWood", tex("wood_table_worn"), scale=1.2, tint=(0.85, 0.75, 0.65))
    box("Sill", FRAME_X, WALL_X + 0.035, WIN_Y0 - 0.06, WIN_Y1 + 0.06, WIN_Z0 - 0.035, WIN_Z0 + 0.0, sill_m, bevel=0.006)
    fw, fd = 0.065, 0.075          # frame member width / depth
    x0, x1 = FRAME_X - fd / 2, FRAME_X + fd / 2
    box("FrameL", x0, x1, WIN_Y0, WIN_Y0 + fw, WIN_Z0, WIN_Z1, paint, bevel=0.006)
    box("FrameR", x0, x1, WIN_Y1 - fw, WIN_Y1, WIN_Z0, WIN_Z1, paint, bevel=0.006)
    box("FrameB", x0, x1, WIN_Y0, WIN_Y1, WIN_Z0, WIN_Z0 + fw, paint, bevel=0.006)
    box("FrameT", x0, x1, WIN_Y0, WIN_Y1, WIN_Z1 - fw, WIN_Z1, paint, bevel=0.006)
    # transom bar
    tz = WIN_Z1 - 0.36
    box("Transom", x0, x1, WIN_Y0, WIN_Y1, tz - 0.03, tz + 0.03, paint, bevel=0.006)
    glass = mat_glass_shadowfix("WinGlass", tint=(0.96, 0.98, 0.96), wavy=0.4, smudge=0.12)
    sash_objs = []

    def sash(name, ya, yb, za, zb, rows, cols, hinge_y, open_deg):
        parts = []
        sw, sd = 0.045, 0.045
        cx0, cx1 = FRAME_X + fd / 2 - sd, FRAME_X + fd / 2
        parts.append(box(name + "_l", cx0, cx1, ya, ya + sw, za, zb, paint, bevel=0.004))
        parts.append(box(name + "_r", cx0, cx1, yb - sw, yb, za, zb, paint, bevel=0.004))
        parts.append(box(name + "_b", cx0, cx1, ya, yb, za, za + sw * 1.4, paint, bevel=0.004))
        parts.append(box(name + "_t", cx0, cx1, ya, yb, zb - sw, zb, paint, bevel=0.004))
        mw = 0.022
        for i in range(1, rows):
            z = za + sw * 1.4 + (zb - sw - za - sw * 1.4) * i / rows
            parts.append(box(name + f"_mr{i}", cx0 + 0.008, cx1 - 0.008, ya, yb, z - mw / 2, z + mw / 2, paint, bevel=0.003))
        for j in range(1, cols):
            y = ya + sw + (yb - sw - ya - sw) * j / cols
            parts.append(box(name + f"_mc{j}", cx0 + 0.008, cx1 - 0.008, y - mw / 2, y + mw / 2, za, zb, paint, bevel=0.003))
        g = box(name + "_glass", cx0 + 0.02, cx0 + 0.023, ya + 0.01, yb - 0.01, za + 0.01, zb - 0.01, glass)
        parts.append(g)
        piv = C.empty(name + "_hinge", (cx1, hinge_y, za))
        for o in parts:
            o.parent = piv
            o.matrix_parent_inverse = Matrix.Translation(-Vector(piv.location))
        piv.rotation_euler.z = math.radians(open_deg)
        return piv
    ym = (WIN_Y0 + WIN_Y1) / 2
    sash_objs.append(sash("SashA", WIN_Y0 + fw, ym, WIN_Z0 + fw, tz - 0.03, 3, 1, WIN_Y0 + fw, 0))
    sash_objs.append(sash("SashB", ym, WIN_Y1 - fw, WIN_Z0 + fw, tz - 0.03, 3, 1, WIN_Y1 - fw, -62))
    # fixed transom light (2 panes)
    box("TransomMull", x0 + 0.01, x1 - 0.01, ym - 0.012, ym + 0.012, tz, WIN_Z1, paint, bevel=0.003)
    box("TransomGlass", FRAME_X - 0.002, FRAME_X + 0.001, WIN_Y0 + fw, WIN_Y1 - fw, tz + 0.03, WIN_Z1 - fw, glass)
    # outside: a plastered exterior jamb so the deep reveal reads outside too
    # curtain rod (dark iron) + brackets
    iron = C.principled("Iron", base=(0.035, 0.03, 0.028), rough=0.45, metal=0.9)
    rod = lathe("Rod", [(0.0, -0.001), (0.009, 0.0), (0.009, 1.0), (0.0, 1.001)], 24, iron)
    rod.rotation_euler = (math.radians(-90), 0, 0)
    rod.scale = (1, 1, (WIN_Y1 - WIN_Y0) + 0.5)
    rod.location = (WALL_X + 0.07, WIN_Y0 - 0.25, WIN_Z1 + 0.14)
    rod.rotation_euler = (math.radians(-90), 0, 0)
    for yy in (WIN_Y0 - 0.18, WIN_Y1 + 0.18):
        box("RodBracket", WALL_X, WALL_X + 0.08, yy - 0.008, yy + 0.008, WIN_Z1 + 0.13, WIN_Z1 + 0.15, iron)
    for yy in (WIN_Y0 - 0.25, WIN_Y1 + 0.25):
        f = C.link(bpy.data.objects.new("Finial", bpy.data.meshes.new("fin")))
        bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=10, radius=0.017); bm.to_mesh(f.data); bm.free()
        f.location = (WALL_X + 0.07, yy, WIN_Z1 + 0.14); C.smooth_shade(f); C.assign(f, iron)
    return {"wall": wall, "plaster": plaster}


# ----------------------------------------------------------------------------- the table

TABLE_X0, TABLE_X1 = -0.97, 0.58
TABLE_Y0, TABLE_Y1 = -0.12, 0.86


def build_table():
    wood = box_mat("TableWood", tex("wood_table_worn"), scale=0.62, rough_mul=0.85, rough_add=0.05,
                   nor_strength=1.0, coords="Object", blend=0.05)
    # the texture's planks run along X when mapped on the XY plane at this scale
    top = box("TableTop", TABLE_X0, TABLE_X1, TABLE_Y0, TABLE_Y1, TABLE_Z - 0.045, TABLE_Z, wood, bevel=0.007, seg=3)
    # subtle warp / uneven boards: a few loops + noise displacement
    sub = top.modifiers.new("Sub", "SUBSURF"); sub.subdivision_type = "SIMPLE"; sub.levels = 0; sub.render_levels = 0
    legs = []
    for (lx, ly) in ((TABLE_X0 + 0.07, TABLE_Y0 + 0.07), (TABLE_X1 - 0.07, TABLE_Y0 + 0.07),
                     (TABLE_X0 + 0.07, TABLE_Y1 - 0.07), (TABLE_X1 - 0.07, TABLE_Y1 - 0.07)):
        legs.append(box("Leg", lx - 0.035, lx + 0.035, ly - 0.035, ly + 0.035, 0, TABLE_Z - 0.045, wood, bevel=0.004))
    box("Apron", TABLE_X0 + 0.04, TABLE_X1 - 0.04, TABLE_Y0 + 0.04, TABLE_Y0 + 0.06, TABLE_Z - 0.14, TABLE_Z - 0.045, wood, bevel=0.003)
    box("Apron", TABLE_X0 + 0.04, TABLE_X1 - 0.04, TABLE_Y1 - 0.06, TABLE_Y1 - 0.04, TABLE_Z - 0.14, TABLE_Z - 0.045, wood, bevel=0.003)
    return top


# ----------------------------------------------------------------------------- curtain (cloth sim)

def build_curtain(ctx, wind_keys, y0=0.30, y1=1.08, drop=1.42, preroll=48, res=(44, 64), seed=3, wall=None):
    """Sheer linen panel on the rod, gathered in soft pleats, cloth-simulated with a wind field whose
    strength follows `wind_keys` [(abs_time, strength)]. Baked inside the script from
    ctx.f0 - preroll to ctx.f1 + 2 so any render range gives identical frames."""
    rng = random.Random(seed)
    nx, nz = res
    width = y1 - y0
    top_z = WIN_Z1 + 0.11
    xw = WALL_X + 0.07
    verts, faces = [], []
    for j in range(nz):
        for i in range(nx):
            u = i / (nx - 1)
            v = j / (nz - 1)
            y = y0 + u * width
            # gathered pleats: 9 pleats, deeper at the top (rings bunch the fabric)
            pleat = math.sin(u * math.pi * 18) * (0.028 - 0.012 * v)
            verts.append((xw + pleat, y, top_z - v * drop))
    for j in range(nz - 1):
        for i in range(nx - 1):
            a = j * nx + i
            faces.append((a, a + 1, a + nx + 1, a + nx))
    me = bpy.data.meshes.new("Curtain"); me.from_pydata(verts, [], faces); me.update()
    cur = C.link(bpy.data.objects.new("Curtain", me))
    C.smooth_shade(cur)
    # uv for the weave
    uvl = me.uv_layers.new(name="UVMap")
    for poly in me.polygons:
        for li in poly.loop_indices:
            vi = me.loops[li].vertex_index
            uvl.data[li].uv = ((vi % nx) / (nx - 1) * width, 1 - (vi // nx) / (nz - 1) * drop)
    pin = cur.vertex_groups.new(name="pin")
    pin.add([i for i in range(nx) if i % 2 == 0], 1.0, "REPLACE")      # rings every 2nd column
    pin.add([i for i in range(nx) if i % 2 == 1], 0.6, "REPLACE")
    cl = cur.modifiers.new("Cloth", "CLOTH")
    st = cl.settings
    st.quality = 7
    st.mass = CLOTH_MASS
    st.air_damping = 1.6
    st.tension_stiffness = 12; st.compression_stiffness = 12; st.shear_stiffness = 4
    st.bending_stiffness = 0.02
    st.tension_damping = 4; st.compression_damping = 4; st.bending_damping = 0.4
    st.vertex_group_mass = "pin"
    st.pin_stiffness = 2.0
    cs = cl.collision_settings
    cs.use_collision = True; cs.distance_min = 0.004; cs.use_self_collision = False
    pc = cl.point_cache
    pc.frame_start = ctx.f0 - preroll
    pc.frame_end = ctx.f1 + 2
    # thickness + soft shading
    sub = cur.modifiers.new("Sub", "SUBSURF"); sub.levels = 1; sub.render_levels = 1
    if wall is not None:
        wall.modifiers.new("Coll", "COLLISION")
        wall.collision.thickness_outer = 0.005
    # wind: blows into the room through the open sash (+X), a little toward -Y and up
    bpy.ops.object.effector_add(type="WIND", location=(WALL_X - 0.6, (y0 + y1) / 2, WIN_Z0 + 0.6))
    wd = bpy.context.object; wd.name = "Wind"
    wd.field.shape = "PLANE"
    wd.field.flow = 0.6
    wd.field.noise = 0.9
    wd.field.seed = seed
    wd.rotation_euler = Euler((0, math.radians(84), math.radians(-12)), "XYZ")
    for t, s in wind_keys:
        wd.field.strength = s
        wd.field.keyframe_insert("strength", frame=t * C.FPS)
    bpy.ops.object.effector_add(type="TURBULENCE", location=(WALL_X + 0.2, (y0 + y1) / 2, WIN_Z0 + 0.5))
    tb = bpy.context.object; tb.name = "Turb"
    tb.field.strength = 0.25; tb.field.size = 0.35; tb.field.flow = 0.5
    tb.field.seed = seed + 1
    cur.data.materials.append(mat_sheer_linen())
    # bake (deterministic, independent of the requested render range)
    sc = bpy.context.scene
    fs, fe = sc.frame_start, sc.frame_end
    sc.frame_start, sc.frame_end = pc.frame_start, pc.frame_end
    with bpy.context.temp_override(scene=sc, active_object=cur, object=cur, point_cache=pc):
        bpy.ops.ptcache.bake(bake=True)
    sc.frame_start, sc.frame_end = fs, fe
    return cur


def mat_sheer_linen():
    """Sheer off-white linen voile: open weave (alpha from a weave pattern), translucent, sheen,
    slub irregularity. Lets dappled sunlight through."""
    m, nt, p = C.new_mat("SheerLinen")
    tcx = tex("rough_linen", "1k")
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (5.0, 5.0, 5.0)
    nt.links.new(tc.outputs["UV"], mp.inputs["Vector"])
    im = nt.nodes.new("ShaderNodeTexImage"); im.image = bpy.data.images.load(tcx["diff"], check_existing=True)
    nt.links.new(mp.outputs["Vector"], im.inputs["Vector"])
    bw = nt.nodes.new("ShaderNodeRGBToBW"); nt.links.new(im.outputs["Color"], bw.inputs["Color"])
    # weave openness -> alpha (0.35..0.75 coverage)
    mr = nt.nodes.new("ShaderNodeMapRange")
    mr.inputs["From Min"].default_value = 0.15; mr.inputs["From Max"].default_value = 0.65
    mr.inputs["To Min"].default_value = 0.30; mr.inputs["To Max"].default_value = 0.70
    nt.links.new(bw.outputs["Val"], mr.inputs["Value"])
    # slubs: long thin noise along the warp
    nz = nt.nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 40.0; nz.inputs["Detail"].default_value = 3
    sep = nt.nodes.new("ShaderNodeMapping"); sep.inputs["Scale"].default_value = (1.0, 0.04, 1.0)
    nt.links.new(tc.outputs["UV"], sep.inputs["Vector"]); nt.links.new(sep.outputs["Vector"], nz.inputs["Vector"])
    add = nt.nodes.new("ShaderNodeMath"); add.operation = "MULTIPLY_ADD"
    add.inputs[1].default_value = 0.25; add.use_clamp = True
    nt.links.new(nz.outputs["Fac"], add.inputs[0]); nt.links.new(mr.outputs["Result"], add.inputs[2])
    p.inputs["Base Color"].default_value = (0.93, 0.89, 0.80, 1)
    p.inputs["Roughness"].default_value = 0.75
    p.inputs["Sheen Weight"].default_value = 0.6
    p.inputs["Sheen Roughness"].default_value = 0.4
    p.inputs["Sheen Tint"].default_value = (1.0, 0.96, 0.9, 1)
    p.inputs["Transmission Weight"].default_value = 0.0
    # translucency: mix in a translucent BSDF
    trl = nt.nodes.new("ShaderNodeBsdfTranslucent"); trl.inputs["Color"].default_value = (0.95, 0.88, 0.74, 1)
    mixa = nt.nodes.new("ShaderNodeMixShader"); mixa.inputs[0].default_value = 0.45
    nt.links.new(p.outputs[0], mixa.inputs[1]); nt.links.new(trl.outputs[0], mixa.inputs[2])
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    mixb = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(add.outputs[0], mixb.inputs[0])
    nt.links.new(tr.outputs[0], mixb.inputs[1]); nt.links.new(mixa.outputs[0], mixb.inputs[2])
    nt.links.new(mixb.outputs[0], nt.nodes["Material Output"].inputs["Surface"])
    return m


# ----------------------------------------------------------------------------- dust motes (geometry nodes)

def _gn(ng, t, **kw):
    n = ng.nodes.new(t)
    for k, v in kw.items():
        setattr(n, k, v)
    return n


def build_motes(name, bmin, bmax, count=5000, seed=11, r_min=0.00018, r_max=0.0006, drift=(0.0, 0.0, 0.004),
                turb_amp=0.06, turb_freq=1.4, turb_speed=0.18, gust_dir=(1, 0, 0), gust_keys=(), flake_frac=0.3,
                fade=0.08):
    """Real dust motes: tiny lit particles drifting & swirling in a box (wrapped, faded at the box faces so
    wrapping is invisible). Positions are a pure function of scene time -> deterministic, motion blur ok.
    `gust_keys` [(abs_time, offset_m)] = accumulated displacement along gust_dir (per-mote random gain)."""
    me = bpy.data.meshes.new(name)
    obj = C.link(bpy.data.objects.new(name, me))
    ng = bpy.data.node_groups.new(name + "_GN", "GeometryNodeTree")
    ng.interface.new_socket("Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
    out = _gn(ng, "NodeGroupOutput")
    L = ng.links.new
    pts = _gn(ng, "GeometryNodePoints"); pts.inputs["Count"].default_value = count
    size = Vector(bmax) - Vector(bmin)
    rp = _gn(ng, "FunctionNodeRandomValue", data_type="FLOAT_VECTOR")
    rp.inputs["Min"].default_value = (0, 0, 0); rp.inputs["Max"].default_value = (1, 1, 1)
    rp.inputs["Seed"].default_value = seed
    st = _gn(ng, "GeometryNodeInputSceneTime")
    # p0 = rand * size
    p0 = _gn(ng, "ShaderNodeVectorMath", operation="MULTIPLY"); p0.inputs[1].default_value = size
    L(rp.outputs["Value"], p0.inputs[0])
    # per-mote drift velocity
    rv = _gn(ng, "FunctionNodeRandomValue", data_type="FLOAT_VECTOR")
    rv.inputs["Min"].default_value = (-0.006, -0.006, -0.004); rv.inputs["Max"].default_value = (0.006, 0.006, 0.006)
    rv.inputs["Seed"].default_value = seed + 1
    vadd = _gn(ng, "ShaderNodeVectorMath", operation="ADD"); vadd.inputs[1].default_value = drift
    L(rv.outputs["Value"], vadd.inputs[0])
    vt = _gn(ng, "ShaderNodeVectorMath", operation="SCALE")
    L(vadd.outputs[0], vt.inputs[0]); L(st.outputs["Seconds"], vt.inputs["Scale"])
    # turbulence: 4D noise sampled at the rest position, w = time
    wt = _gn(ng, "ShaderNodeMath", operation="MULTIPLY"); wt.inputs[1].default_value = turb_speed
    L(st.outputs["Seconds"], wt.inputs[0])
    nz = _gn(ng, "ShaderNodeTexNoise", noise_dimensions="4D")
    nz.inputs["Scale"].default_value = turb_freq; nz.inputs["Detail"].default_value = 1.5
    L(p0.outputs[0], nz.inputs["Vector"]); L(wt.outputs[0], nz.inputs["W"])
    nc = _gn(ng, "ShaderNodeVectorMath", operation="SUBTRACT"); nc.inputs[1].default_value = (0.5, 0.5, 0.5)
    L(nz.outputs["Color"], nc.inputs[0])
    na = _gn(ng, "ShaderNodeVectorMath", operation="SCALE"); na.inputs["Scale"].default_value = turb_amp
    L(nc.outputs[0], na.inputs[0])
    # gust: keyed scalar * (gust_dir * random gain + random spread)
    gv = _gn(ng, "ShaderNodeValue"); gv.name = "GUST"; gv.outputs[0].default_value = 0.0
    rg = _gn(ng, "FunctionNodeRandomValue", data_type="FLOAT_VECTOR")
    gd = Vector(gust_dir).normalized()
    rg.inputs["Min"].default_value = gd * 0.5 + Vector((-0.35, -0.35, -0.2))
    rg.inputs["Max"].default_value = gd * 1.4 + Vector((0.35, 0.35, 0.3))
    rg.inputs["Seed"].default_value = seed + 2
    gs = _gn(ng, "ShaderNodeVectorMath", operation="SCALE")
    L(rg.outputs["Value"], gs.inputs[0]); L(gv.outputs[0], gs.inputs["Scale"])
    s1 = _gn(ng, "ShaderNodeVectorMath", operation="ADD"); L(p0.outputs[0], s1.inputs[0]); L(vt.outputs[0], s1.inputs[1])
    s2 = _gn(ng, "ShaderNodeVectorMath", operation="ADD"); L(s1.outputs[0], s2.inputs[0]); L(na.outputs[0], s2.inputs[1])
    s3 = _gn(ng, "ShaderNodeVectorMath", operation="ADD"); L(s2.outputs[0], s3.inputs[0]); L(gs.outputs[0], s3.inputs[1])
    wr = _gn(ng, "ShaderNodeVectorMath", operation="WRAP")
    L(s3.outputs[0], wr.inputs[0]); wr.inputs[1].default_value = size; wr.inputs[2].default_value = (0, 0, 0)
    # edge fade
    inv = _gn(ng, "ShaderNodeVectorMath", operation="SUBTRACT"); inv.inputs[0].default_value = size
    L(wr.outputs[0], inv.inputs[1])
    vmin = _gn(ng, "ShaderNodeVectorMath", operation="MINIMUM"); L(wr.outputs[0], vmin.inputs[0]); L(inv.outputs[0], vmin.inputs[1])
    sep = _gn(ng, "ShaderNodeSeparateXYZ"); L(vmin.outputs[0], sep.inputs[0])
    m1 = _gn(ng, "ShaderNodeMath", operation="MINIMUM"); L(sep.outputs[0], m1.inputs[0]); L(sep.outputs[1], m1.inputs[1])
    m2 = _gn(ng, "ShaderNodeMath", operation="MINIMUM"); L(m1.outputs[0], m2.inputs[0]); L(sep.outputs[2], m2.inputs[1])
    fr = _gn(ng, "ShaderNodeMapRange"); fr.inputs["From Min"].default_value = 0.0; fr.inputs["From Max"].default_value = fade
    L(m2.outputs[0], fr.inputs["Value"])
    # final position
    fin = _gn(ng, "ShaderNodeVectorMath", operation="ADD"); fin.inputs[1].default_value = Vector(bmin)
    L(wr.outputs[0], fin.inputs[0])
    sp = _gn(ng, "GeometryNodeSetPosition")
    L(pts.outputs[0], sp.inputs["Geometry"]); L(fin.outputs[0], sp.inputs["Position"])
    # size: log-ish distribution
    rr = _gn(ng, "FunctionNodeRandomValue", data_type="FLOAT"); rr.inputs["Min"].default_value = 0.0; rr.inputs["Max"].default_value = 1.0
    rr.inputs["Seed"].default_value = seed + 3
    pw = _gn(ng, "ShaderNodeMath", operation="POWER"); pw.inputs[1].default_value = 2.5
    L(rr.outputs[0], pw.inputs[0])
    sz = _gn(ng, "ShaderNodeMapRange"); sz.inputs["To Min"].default_value = r_min; sz.inputs["To Max"].default_value = r_max
    L(pw.outputs[0], sz.inputs["Value"])
    szf = _gn(ng, "ShaderNodeMath", operation="MULTIPLY"); L(sz.outputs["Result"], szf.inputs[0]); L(fr.outputs["Result"], szf.inputs[1])
    # Cycles point-cloud spheres (much cheaper than instanced meshes); radius per point
    srad = _gn(ng, "GeometryNodeSetPointRadius")
    L(sp.outputs[0], srad.inputs["Points"]); L(szf.outputs[0], srad.inputs["Radius"])
    smat = _gn(ng, "GeometryNodeSetMaterial"); smat.inputs["Material"].default_value = mat_mote()
    L(srad.outputs[0], smat.inputs["Geometry"])
    L(smat.outputs[0], out.inputs[0])
    mod = obj.modifiers.new("GN", "NODES"); mod.node_group = ng
    for t, v in gust_keys:
        gv.outputs[0].default_value = v
        gv.outputs[0].keyframe_insert("default_value", frame=t * C.FPS)
    if gust_keys:
        ad = ng.animation_data
        for fc in C._fcurves(ad.action):
            for kp in fc.keyframe_points:
                kp.interpolation = "BEZIER"; kp.handle_left_type = kp.handle_right_type = "AUTO_CLAMPED"
    obj.visible_shadow = False
    return obj


def mat_mote():
    m, nt, p = C.new_mat("Mote")
    p.inputs["Base Color"].default_value = (0.8, 0.76, 0.7, 1)
    p.inputs["Roughness"].default_value = 0.4
    p.inputs["Sheen Weight"].default_value = 1.0
    p.inputs["Subsurface Weight"].default_value = 0.0
    trl = nt.nodes.new("ShaderNodeBsdfTranslucent"); trl.inputs["Color"].default_value = (1.0, 0.96, 0.9, 1)
    mx = nt.nodes.new("ShaderNodeMixShader"); mx.inputs[0].default_value = 0.75
    nt.links.new(p.outputs[0], mx.inputs[1]); nt.links.new(trl.outputs[0], mx.inputs[2])
    nt.links.new(mx.outputs[0], nt.nodes["Material Output"].inputs["Surface"])
    return m


def mat_flake():
    return C.principled("Flake", base=(0.9, 0.86, 0.78), rough=0.12, metal=0.0, spec=1.0, coat=0.0)


def build_beam_volume(bmin, bmax, density=0.03, anisotropy=0.55, color=(1.0, 0.97, 0.92)):
    """Homogeneous participating medium (analytic in Cycles: no ray marching). Only the sun-lit part
    (through the window) scatters noticeably -> real light shafts with mullion/curtain shadows."""
    o = box("BeamVolume", bmin[0], bmax[0], bmin[1], bmax[1], bmin[2], bmax[2])
    m = bpy.data.materials.new("Haze"); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    v = nt.nodes.new("ShaderNodeVolumePrincipled")
    v.inputs["Density"].default_value = density
    v.inputs["Anisotropy"].default_value = anisotropy
    v.inputs["Color"].default_value = (*color, 1)
    nt.links.new(v.outputs[0], out.inputs["Volume"])
    C.assign(o, m)
    o.visible_shadow = True
    return o


# ----------------------------------------------------------------------------- sofra props

def place(objs, loc, rot_z=0.0, scale=1.0, name=None):
    """Parent imported Poly Haven objects to an empty, move it so the set's lowest point sits at loc.z."""
    meshes = [o for o in objs if o.type == "MESH"]
    bpy.context.view_layer.update()
    zmin = min((o.matrix_world @ Vector(c)).z for o in meshes for c in o.bound_box)
    root = C.empty(name or (meshes[0].name + "_root"), (0, 0, 0))
    for o in objs:
        if o.parent is None:
            o.parent = root
    root.location = (loc[0], loc[1], loc[2] - zmin * scale)
    root.rotation_euler.z = rot_z
    root.scale = (scale,) * 3
    return root


def mat_bread():
    """Rustic Turkish village loaf: deep-baked crackled crust, paler fissures, flour dust on top."""
    m, nt, p = C.new_mat("BreadCrust")
    tc = nt.nodes.new("ShaderNodeTexCoord")
    L = nt.links.new
    vor = nt.nodes.new("ShaderNodeTexVoronoi"); vor.feature = "DISTANCE_TO_EDGE"; vor.inputs["Scale"].default_value = 22
    vor.inputs["Randomness"].default_value = 1.0
    nzw = nt.nodes.new("ShaderNodeTexNoise"); nzw.inputs["Scale"].default_value = 30; nzw.inputs["Detail"].default_value = 8
    warp = nt.nodes.new("ShaderNodeVectorMath"); warp.operation = "MULTIPLY_ADD"; warp.inputs[1].default_value = (0.02,) * 3
    L(nzw.outputs["Color"], warp.inputs[0]); L(tc.outputs["Object"], warp.inputs[2]); L(warp.outputs[0], vor.inputs["Vector"])
    crack = nt.nodes.new("ShaderNodeMapRange"); crack.inputs["From Min"].default_value = 0.0; crack.inputs["From Max"].default_value = 0.06
    L(vor.outputs["Distance"], crack.inputs["Value"])          # 0 in the fissure -> 1 on the crust
    # height-based browning: top of the dome darker, sides golden, near the base pale
    sep = nt.nodes.new("ShaderNodeSeparateXYZ"); L(tc.outputs["Object"], sep.inputs[0])
    hz = nt.nodes.new("ShaderNodeMapRange"); hz.inputs["From Min"].default_value = 0.0; hz.inputs["From Max"].default_value = 0.075
    L(sep.outputs["Z"], hz.inputs["Value"])
    nz = nt.nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 9; nz.inputs["Detail"].default_value = 6
    L(tc.outputs["Object"], nz.inputs["Vector"])
    mixf = nt.nodes.new("ShaderNodeMath"); mixf.operation = "MULTIPLY_ADD"; mixf.inputs[1].default_value = 0.55
    L(nz.outputs["Fac"], mixf.inputs[0]); L(hz.outputs["Result"], mixf.inputs[2])
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    cr = ramp.color_ramp
    cr.elements[0].position = 0.15; cr.elements[0].color = (0.62, 0.40, 0.17, 1)
    cr.elements[1].position = 0.95; cr.elements[1].color = (0.20, 0.085, 0.03, 1)
    e = cr.elements.new(0.55); e.color = (0.42, 0.21, 0.07, 1)
    L(mixf.outputs[0], ramp.inputs["Fac"])
    inner = nt.nodes.new("ShaderNodeMix"); inner.data_type = "RGBA"
    inner.inputs[7].default_value = (0.80, 0.62, 0.36, 1)     # fissure: paler, less baked
    L(crack.outputs["Result"], inner.inputs[0]); L(ramp.outputs["Color"], inner.inputs[7]); inner.inputs[6].default_value = (0.82, 0.64, 0.38, 1)
    # flour dust patches on the top
    fl = nt.nodes.new("ShaderNodeTexNoise"); fl.inputs["Scale"].default_value = 14; fl.inputs["Detail"].default_value = 10
    fl.inputs["Roughness"].default_value = 0.75
    L(tc.outputs["Object"], fl.inputs["Vector"])
    flm = nt.nodes.new("ShaderNodeMapRange"); flm.inputs["From Min"].default_value = 0.56; flm.inputs["From Max"].default_value = 0.70
    L(fl.outputs["Fac"], flm.inputs["Value"])
    flh = nt.nodes.new("ShaderNodeMath"); flh.operation = "MULTIPLY"; L(flm.outputs["Result"], flh.inputs[0]); L(hz.outputs["Result"], flh.inputs[1])
    flour = nt.nodes.new("ShaderNodeMix"); flour.data_type = "RGBA"
    L(flh.outputs[0], flour.inputs[0]); L(inner.outputs[2], flour.inputs[6]); flour.inputs[7].default_value = (0.86, 0.80, 0.70, 1)
    L(flour.outputs[2], p.inputs["Base Color"])
    p.inputs["Roughness"].default_value = 0.62
    p.inputs["Subsurface Weight"].default_value = 0.15
    p.inputs["Subsurface Radius"].default_value = (1.0, 0.6, 0.3)
    p.inputs["Subsurface Scale"].default_value = 0.004
    p.inputs["Sheen Weight"].default_value = 0.3
    # bump: fissures + fine blistered crust
    fine = nt.nodes.new("ShaderNodeTexNoise"); fine.inputs["Scale"].default_value = 260; fine.inputs["Detail"].default_value = 4
    L(tc.outputs["Object"], fine.inputs["Vector"])
    h = nt.nodes.new("ShaderNodeMath"); h.operation = "MULTIPLY_ADD"; h.inputs[1].default_value = 0.25
    L(fine.outputs["Fac"], h.inputs[0]); L(crack.outputs["Result"], h.inputs[2])
    bp = nt.nodes.new("ShaderNodeBump"); bp.inputs["Distance"].default_value = 0.0025; bp.inputs["Strength"].default_value = 1.0
    L(h.outputs[0], bp.inputs["Height"]); L(bp.outputs["Normal"], p.inputs["Normal"])
    return m


def build_bread(loc, radius=0.115, height=0.095, seed=5, rot=0.0):
    """Round crusty village loaf (köy ekmeği) with four deep slashes that burst open in the oven."""
    rng = random.Random(seed)
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=96, v_segments=48, radius=1.0)
    slashes = [(rng.uniform(-0.15, 0.15) + k * math.pi / 2 + 0.4, rng.uniform(0.25, 0.4)) for k in range(4)]
    for v in bm.verts:
        x, y, z = v.co
        if z < -0.05:
            z = -0.05 - (z + 0.05) * 0.08                    # flat base, slight belly
        r = math.sqrt(x * x + y * y)
        a = math.atan2(y, x)
        # lumpy hand-shaped dome
        lump = 1 + 0.035 * math.sin(3 * a + seed) + 0.02 * math.sin(5 * a + 1.3 * seed)
        x *= lump; y *= lump
        # slashes: radial grooves at angles, opened into ridges ("ears")
        d = 0.0
        for sa, sr in slashes:
            # distance to the slash line (a chord at radius ~sr across the top)
            px, py = math.cos(sa), math.sin(sa)
            along = x * px + y * py
            perp = -x * py + y * px
            if z > 0.15 and abs(along - sr) < 0.5:
                g = math.exp(-((perp) / 0.07) ** 2) * math.exp(-((along - sr) / 0.35) ** 2)
                d += g
        z = z - 0.12 * d * max(0, z)
        v.co = (x * radius, y * radius, (z + 0.05) * height / 1.05)
    me = bpy.data.meshes.new("Bread"); bm.to_mesh(me); bm.free()
    o = C.link(bpy.data.objects.new("Bread", me))
    C.smooth_shade(o)
    # big soft lumps
    tx = bpy.data.textures.new("BreadLump", "CLOUDS"); tx.noise_scale = 0.05
    dm = o.modifiers.new("Lump", "DISPLACE"); dm.texture = tx; dm.strength = 0.006; dm.mid_level = 0.5
    dm.texture_coords = "OBJECT"
    o.location = loc; o.rotation_euler.z = rot
    C.assign(o, mat_bread())
    return o


def glass_profile(r_bot=0.031, r_top=0.037, h=0.115, wall=0.0022, base=0.009, rim=0.0012):
    """Closed outline (r, z) of a heavy-bottom tumbler, outer bottom -> rim -> inner bottom."""
    pts = [(0.0, 0.0), (r_bot - 0.004, 0.0), (r_bot - 0.001, 0.0008), (r_bot, 0.003)]
    for k in range(1, 12):
        z = 0.003 + (h - 0.003) * k / 11
        pts.append((r_bot + (r_top - r_bot) * (z / h), z))
    pts += [(r_top - rim * 0.3, h + rim * 0.5), (r_top - wall + rim * 0.3, h + rim * 0.5)]
    for k in range(11, 0, -1):
        z = base + (h - base) * k / 11
        pts.append((r_bot - wall + (r_top - r_bot) * (z / h), z))
    pts += [(r_bot - wall - 0.002, base + 0.0004), (r_bot - wall - 0.006, base - 0.0006), (0.0, base - 0.0012)]
    return pts


def inner_radius(z, r_bot=0.031, r_top=0.037, h=0.115, wall=0.0022):
    return r_bot - wall + (r_top - r_bot) * (z / h)


def mat_water_s4(name="Water", absorb=(0.96, 0.985, 0.98)):
    m = mat_glass_shadowfix(name, tint=absorb, ior=1.333, shadow_pass=0.8)
    return m


def build_tumbler(loc, name="Glass"):
    g = lathe(name, glass_profile(), 96, mat_glass_shadowfix(name + "Mat", tint=(0.97, 0.99, 0.985), smudge=0.10))
    g.location = loc
    return g


def build_tea_glass(loc, fill=0.8):
    """Turkish tulip tea glass (ince belli) with amber tea, on a small saucer."""
    prof_o = [(0.0, 0.0), (0.020, 0.0), (0.022, 0.004), (0.026, 0.02), (0.027, 0.035), (0.0215, 0.052),
              (0.0195, 0.06), (0.022, 0.075), (0.029, 0.096), (0.031, 0.103)]
    prof_i = [(r - 0.0013, z) for r, z in prof_o[::-1] if z > 0.006]
    pts = prof_o + [(0.0306, 0.1036)] + prof_i[1:] + [(0.0, 0.0055)]
    gl = lathe("TeaGlass", pts, 64, mat_glass_shadowfix("TeaGlassMat", tint=(0.97, 0.99, 0.985), smudge=0.08))
    # tea body
    top = 0.006 + (0.096 - 0.006) * fill
    tp = [(0.0, 0.0058)] + [(r - 0.0010, z) for r, z in prof_o if 0.006 < z < top] + [(0.0, top)]
    tp.insert(len(tp) - 1, (inner_radius_tulip(top, prof_o) - 0.001, top))
    tm = C.principled("Tea", base=(0.55, 0.12, 0.02), rough=0.02, transmission=1.0, ior=1.34)
    # dense amber absorption via volume
    v = tm.node_tree.nodes.new("ShaderNodeVolumeAbsorption")
    v.inputs["Color"].default_value = (0.75, 0.22, 0.03, 1); v.inputs["Density"].default_value = 60
    tm.node_tree.links.new(v.outputs[0], tm.node_tree.nodes["Material Output"].inputs["Volume"])
    tea = lathe("Tea", tp, 64, tm)
    saucer = lathe("Saucer", [(0.0, 0.0), (0.025, 0.0), (0.03, 0.003), (0.05, 0.006), (0.058, 0.013), (0.060, 0.0135),
                              (0.057, 0.009), (0.045, 0.0055), (0.028, 0.0045), (0.0, 0.0045)], 64,
                   C.principled("SaucerGlass", base=(0.97, 0.99, 0.985), transmission=1.0, rough=0.02))
    for o in (gl, tea):
        o.location = (loc[0], loc[1], loc[2] + 0.0045)
    saucer.location = loc
    return gl, tea, saucer


def inner_radius_tulip(z, prof):
    for (r0, z0), (r1, z1) in zip(prof, prof[1:]):
        if z0 <= z <= z1:
            return r0 + (r1 - r0) * (z - z0) / max(1e-6, z1 - z0) - 0.0013
    return prof[-1][0]


def build_glass_jug(loc, rot_z=0.0, fill=0.6, name="Jug"):
    """Hand-blown glass water jug with a pulled spout and an applied handle. Origin at the base centre."""
    prof = [(0.0, 0.0), (0.045, 0.0), (0.050, 0.004), (0.056, 0.03), (0.058, 0.07), (0.054, 0.12), (0.044, 0.165),
            (0.040, 0.19), (0.043, 0.215), (0.047, 0.228), (0.0485, 0.231)]
    wall = 0.0028
    inner = [(max(0.0, r - wall), z) for r, z in prof[::-1] if z > 0.007]
    pts = prof + [(0.0475, 0.2325)] + inner[1:] + [(0.0, 0.0065)]
    jm = mat_glass_shadowfix(name + "Mat", tint=(0.95, 0.985, 0.975), wavy=0.25, smudge=0.06)
    o = lathe(name, pts, 96, jm)
    # pull the spout: verts near angle 0 at the top flare outward and up
    for v in o.data.vertices:
        a = math.atan2(v.co.y, v.co.x)
        w = math.exp(-(a / 0.35) ** 2) * C.smooth((v.co.z - 0.17) / 0.06)
        k = 1 + 0.55 * w
        v.co.x *= k; v.co.y *= (1 - 0.25 * w)
        v.co.z += 0.012 * w
    # handle: a bent tube on the opposite side
    pts_h = []
    for i in range(24):
        s = i / 23
        a = math.pi * s
        pts_h.append(Vector((-0.050 - 0.045 * math.sin(a), 0.0, 0.19 - 0.13 * s + 0.015 * math.sin(a))))
    hb = bmesh.new()
    rings = []
    for i, c in enumerate(pts_h):
        t = (pts_h[min(i + 1, 23)] - pts_h[max(i - 1, 0)]).normalized()
        n1 = t.cross(Vector((0, 1, 0))).normalized(); n2 = t.cross(n1).normalized()
        ring = [hb.verts.new(c + 0.0075 * (math.cos(2 * math.pi * k / 12) * n1 + math.sin(2 * math.pi * k / 12) * n2)) for k in range(12)]
        rings.append(ring)
    for i in range(23):
        for k in range(12):
            hb.faces.new((rings[i][k], rings[i][(k + 1) % 12], rings[i + 1][(k + 1) % 12], rings[i + 1][k]))
    me = bpy.data.meshes.new(name + "Handle"); hb.to_mesh(me); hb.free()
    h = C.link(bpy.data.objects.new(name + "Handle", me)); C.smooth_shade(h); C.assign(h, jm)
    h.parent = o
    # water inside
    ztop = 0.008 + (0.16 - 0.008) * fill
    wp = [(0.0, 0.0072)] + [(r - 0.0003, z) for r, z in inner[::-1] if 0.0072 < z < ztop] + [(0.0, ztop)]
    # add last ring at ztop
    rl = [r for r, z in inner if z <= ztop]
    wp.insert(len(wp) - 1, (prof_r(prof, ztop) - wall - 0.0003, ztop))
    w = lathe(name + "Water", wp, 96, mat_water_s4(name + "WaterMat"))
    w.parent = o
    o.location = loc; o.rotation_euler.z = rot_z
    return o, w


def prof_r(prof, z):
    for (r0, z0), (r1, z1) in zip(prof, prof[1:]):
        if z0 <= z <= z1:
            return r0 + (r1 - r0) * (z - z0) / max(1e-6, z1 - z0)
    return prof[-1][0]


# ----------------------------------------------------------------------------- fruit

def mat_aril():
    """Pomegranate aril: juicy ruby flesh, translucent with a glossy wet skin."""
    m, nt, p = C.new_mat("Aril")
    p.inputs["Base Color"].default_value = (0.55, 0.02, 0.05, 1)
    p.inputs["Roughness"].default_value = 0.08
    p.inputs["Transmission Weight"].default_value = 0.85
    p.inputs["IOR"].default_value = 1.36
    p.inputs["Coat Weight"].default_value = 0.6
    p.inputs["Coat Roughness"].default_value = 0.04
    p.inputs["Subsurface Weight"].default_value = 0.15
    p.inputs["Subsurface Radius"].default_value = (1.0, 0.1, 0.1)
    p.inputs["Subsurface Scale"].default_value = 0.003
    v = nt.nodes.new("ShaderNodeVolumeAbsorption")
    v.inputs["Color"].default_value = (0.85, 0.04, 0.10, 1); v.inputs["Density"].default_value = 260
    nt.links.new(v.outputs[0], nt.nodes["Material Output"].inputs["Volume"])
    # per-aril colour variation (object random is shared -> use instance random via geometry)
    oi = nt.nodes.new("ShaderNodeObjectInfo")
    hs = nt.nodes.new("ShaderNodeHueSaturation")
    mr = nt.nodes.new("ShaderNodeMapRange"); mr.inputs["To Min"].default_value = 0.55; mr.inputs["To Max"].default_value = 1.25
    nt.links.new(oi.outputs["Random"], mr.inputs["Value"])
    nt.links.new(mr.outputs["Result"], hs.inputs["Value"])
    hs.inputs["Color"].default_value = (0.55, 0.02, 0.05, 1)
    nt.links.new(hs.outputs["Color"], p.inputs["Base Color"])
    return m


def mat_pith():
    m, nt, p = C.new_mat("Pith")
    tc = nt.nodes.new("ShaderNodeTexCoord")
    nz = nt.nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 160; nz.inputs["Detail"].default_value = 6
    nt.links.new(tc.outputs["Object"], nz.inputs["Vector"])
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (0.80, 0.64, 0.42, 1); ramp.color_ramp.elements[1].color = (0.95, 0.86, 0.66, 1)
    nt.links.new(nz.outputs["Fac"], ramp.inputs["Fac"]); nt.links.new(ramp.outputs["Color"], p.inputs["Base Color"])
    p.inputs["Roughness"].default_value = 0.45
    p.inputs["Subsurface Weight"].default_value = 0.5
    p.inputs["Subsurface Radius"].default_value = (1.0, 0.7, 0.4)
    p.inputs["Subsurface Scale"].default_value = 0.004
    bp = nt.nodes.new("ShaderNodeBump"); bp.inputs["Distance"].default_value = 0.0008
    nt.links.new(nz.outputs["Fac"], bp.inputs["Height"]); nt.links.new(bp.outputs["Normal"], p.inputs["Normal"])
    return m


def build_open_pomegranate(name="PomOpen", seed=9, n_arils=420):
    """Half a pomegranate (cut across), its face packed with ruby arils in chambers separated by
    cream pith membranes. Built from the scanned Poly Haven food_pomegranate_01 skin."""
    rng = random.Random(seed)
    src = [o for o in C.ph_model("food_pomegranate_01", "1k") if o.type == "MESH"][0]
    src.name = name
    me = src.data
    bm = bmesh.new(); bm.from_mesh(me)
    zs = [v.co.z for v in bm.verts]
    zc = (min(zs) + max(zs)) * 0.5 - 0.004
    res = bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=(0, 0, zc),
                                 plane_no=(0, 0, 1), clear_outer=True)
    edges = [e for e in bm.edges if e.is_boundary]
    bmesh.ops.holes_fill(bm, edges=edges, sides=0)
    capf = [f for f in bm.faces if abs(f.normal.z - 1) < 1e-3 and all(abs(v.co.z - zc) < 1e-4 for v in f.verts)]
    # cap gets the pith material (slot 1)
    me.materials.append(mat_pith())
    for f in capf:
        f.material_index = 1
    # rind thickness rim: inset the cap a little so the rind wall shows
    if capf:
        bmesh.ops.inset_region(bm, faces=capf, thickness=0.0045, depth=0.0)
        for f in bm.faces:
            if f.material_index == 1:
                pass
    bm.to_mesh(me); bm.free()
    # radius of the cut
    rmax = max(math.hypot(v.co.x, v.co.y) for v in me.vertices if abs(v.co.z - zc) < 1e-4)
    # arils
    am = mat_aril()
    ab = bmesh.new()
    bmesh.ops.create_icosphere(ab, subdivisions=2, radius=1.0)
    for v in ab.verts:       # faceted kernel: squash + random facet
        v.co.x *= 0.62; v.co.y *= 0.55
        v.co += Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-1, 1))) * 0.06
    ame = bpy.data.meshes.new("aril"); ab.to_mesh(ame); ab.free()
    for poly in ame.polygons:
        poly.use_smooth = True
    n_ch = 7
    ch_off = rng.uniform(0, 2 * math.pi)
    arils = []
    tries = 0
    pts = []
    while len(pts) < n_arils and tries < 20000:
        tries += 1
        r = math.sqrt(rng.uniform(0.02, 1.0)) * (rmax - 0.006)
        a = rng.uniform(0, 2 * math.pi)
        # keep clear of the radial membranes and the central core
        rel = ((a - ch_off) % (2 * math.pi / n_ch)) / (2 * math.pi / n_ch)
        if min(rel, 1 - rel) * 2 * math.pi / n_ch * r < 0.0018 or r < 0.006:
            continue
        p = Vector((r * math.cos(a), r * math.sin(a)))
        if any((p - q).length < 0.0052 for q in pts):
            continue
        pts.append(p)
    for i, p in enumerate(pts):
        o = bpy.data.objects.new(f"{name}_aril", ame)
        C.link(o)
        s = rng.uniform(0.0036, 0.0048)
        o.scale = (s, s * rng.uniform(0.9, 1.1), s * rng.uniform(1.15, 1.45))
        # arils point outward-ish, tilted
        ang = math.atan2(p.y, p.x)
        o.rotation_euler = Euler((rng.uniform(-0.5, 0.5) + 1.2 * (p.length / rmax), rng.uniform(-0.4, 0.4), ang + math.pi / 2), "XYZ")
        o.location = (p.x, p.y, zc + rng.uniform(-0.0012, 0.0016))
        o.data.materials.append(am) if not o.data.materials else None
        o.parent = src
        arils.append(o)
    return src, arils, zc


def settle_fruit(bowl, fruit, frames=110):
    """Drop fruit into the bowl with a rigid-body sim, then freeze the final transforms (deterministic)."""
    sc = bpy.context.scene
    fs, fe, fc = sc.frame_start, sc.frame_end, sc.frame_current
    bpy.ops.rigidbody.world_add()
    rw = sc.rigidbody_world
    rw.point_cache.frame_start = 1; rw.point_cache.frame_end = frames + 1
    rw.substeps_per_frame = 20; rw.solver_iterations = 20
    sc.frame_start, sc.frame_end = 1, frames + 1

    def add(o, typ, shape, mass=0.15):
        bpy.context.view_layer.objects.active = o
        for s in bpy.context.selected_objects:
            s.select_set(False)
        o.select_set(True)
        with bpy.context.temp_override(object=o, active_object=o, selected_objects=[o]):
            bpy.ops.rigidbody.object_add(type=typ)
        o.rigid_body.collision_shape = shape
        o.rigid_body.mass = mass
        o.rigid_body.friction = 0.9
        o.rigid_body.restitution = 0.05
        o.rigid_body.linear_damping = 0.4; o.rigid_body.angular_damping = 0.6
        o.rigid_body.collision_margin = 0.0005
    add(bowl, "PASSIVE", "MESH")
    for o in fruit:
        add(o, "ACTIVE", "CONVEX_HULL", 0.12)
    for f in range(1, frames + 2):
        sc.frame_set(f)
    mats = {o.name: o.matrix_world.copy() for o in fruit}
    for o in [bowl] + fruit:
        with bpy.context.temp_override(object=o, active_object=o, selected_objects=[o]):
            bpy.ops.rigidbody.object_remove()
    bpy.ops.rigidbody.world_remove()
    for o in fruit:
        o.matrix_world = mats[o.name]
    sc.frame_start, sc.frame_end = fs, fe
    sc.frame_set(fc)


# ----------------------------------------------------------------------------- the water pour

def _val(ng, name, v=0.0):
    n = ng.nodes.new("ShaderNodeValue"); n.name = name; n.label = name; n.outputs[0].default_value = v
    return n


def key_node_value(ng, name, keys, interp="BEZIER"):
    n = ng.nodes[name]
    for t, v in keys:
        n.outputs[0].default_value = v
        n.outputs[0].keyframe_insert("default_value", frame=t * C.FPS)
    for fc in C._fcurves(ng.animation_data.action):
        if name in fc.data_path:
            for kp in fc.keyframe_points:
                kp.interpolation = interp
                if interp == "BEZIER":
                    kp.handle_left_type = kp.handle_right_type = "AUTO_CLAMPED"


def build_stream(name, spout, v0=(0.32, 0.0, 0.0), r0=0.0042, n=96):
    """Free-falling water jet from `spout`: ballistic centre line x = v0*tau, z = -g tau^2/2 down to the
    keyed HEIGHT (spout - water surface); radius thins with speed (continuity), grows a varicose
    (Plateau-Rayleigh) undulation and wobble with distance; FRONT/TAIL trim the jet (0..1)."""
    me = bpy.data.meshes.new(name)
    obj = C.link(bpy.data.objects.new(name, me))
    obj.location = spout
    ng = bpy.data.node_groups.new(name + "_GN", "GeometryNodeTree")
    ng.interface.new_socket("Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
    out = _gn(ng, "NodeGroupOutput"); L = ng.links.new
    H = _val(ng, "HEIGHT", 0.15); FRONT = _val(ng, "FRONT", 1.0); TAIL = _val(ng, "TAIL", 0.0); FLOW = _val(ng, "FLOW", 1.0)
    st = _gn(ng, "GeometryNodeInputSceneTime")
    line = _gn(ng, "GeometryNodeCurvePrimitiveLine")
    line.inputs["Start"].default_value = (0, 0, 0); line.inputs["End"].default_value = (0, 0, -1)
    rs = _gn(ng, "GeometryNodeResampleCurve"); rs.inputs["Count"].default_value = n
    L(line.outputs[0], rs.inputs["Curve"])
    sp = _gn(ng, "GeometryNodeSplineParameter")
    # T = sqrt(2H/g); tau = s*T
    m2 = _gn(ng, "ShaderNodeMath", operation="MULTIPLY"); m2.inputs[1].default_value = 2 / 9.81
    L(H.outputs[0], m2.inputs[0])
    T = _gn(ng, "ShaderNodeMath", operation="SQRT"); L(m2.outputs[0], T.inputs[0])
    tau = _gn(ng, "ShaderNodeMath", operation="MULTIPLY"); L(sp.outputs["Factor"], tau.inputs[0]); L(T.outputs[0], tau.inputs[1])
    # x = v0x*tau ; z = -4.905 tau^2
    xx = _gn(ng, "ShaderNodeMath", operation="MULTIPLY"); xx.inputs[1].default_value = v0[0]; L(tau.outputs[0], xx.inputs[0])
    t2 = _gn(ng, "ShaderNodeMath", operation="POWER"); t2.inputs[1].default_value = 2.0; L(tau.outputs[0], t2.inputs[0])
    zz = _gn(ng, "ShaderNodeMath", operation="MULTIPLY"); zz.inputs[1].default_value = -4.905; L(t2.outputs[0], zz.inputs[0])
    # wobble grows with fall distance: noise(s*k - time*w)
    wob_in = _gn(ng, "ShaderNodeMath", operation="MULTIPLY_ADD"); wob_in.inputs[1].default_value = 9.0
    L(sp.outputs["Length"] if False else tau.outputs[0], wob_in.inputs[0])
    tneg = _gn(ng, "ShaderNodeMath", operation="MULTIPLY"); tneg.inputs[1].default_value = -3.0; L(st.outputs["Seconds"], tneg.inputs[0])
    L(tneg.outputs[0], wob_in.inputs[2])
    nz = _gn(ng, "ShaderNodeTexNoise", noise_dimensions="1D"); nz.inputs["Scale"].default_value = 6.0; nz.inputs["Detail"].default_value = 2
    L(wob_in.outputs[0], nz.inputs["W"])
    nzc = _gn(ng, "ShaderNodeVectorMath", operation="SUBTRACT"); nzc.inputs[1].default_value = (0.5, 0.5, 0.5)
    L(nz.outputs["Color"], nzc.inputs[0])
    gain = _gn(ng, "ShaderNodeMath", operation="MULTIPLY"); gain.inputs[1].default_value = 0.010
    L(sp.outputs["Factor"], gain.inputs[0])
    wob = _gn(ng, "ShaderNodeVectorMath", operation="SCALE"); L(nzc.outputs[0], wob.inputs[0]); L(gain.outputs[0], wob.inputs["Scale"])
    cmb = _gn(ng, "ShaderNodeCombineXYZ"); L(xx.outputs[0], cmb.inputs[0]); L(zz.outputs[0], cmb.inputs[2])
    pos = _gn(ng, "ShaderNodeVectorMath", operation="ADD"); L(cmb.outputs[0], pos.inputs[0]); L(wob.outputs[0], pos.inputs[1])
    setp = _gn(ng, "GeometryNodeSetPosition"); L(rs.outputs[0], setp.inputs["Geometry"]); L(pos.outputs[0], setp.inputs["Position"])
    # radius: r0 * (v0/v)^0.5 ; v = sqrt(v0^2 + (g tau)^2)
    gt = _gn(ng, "ShaderNodeMath", operation="MULTIPLY"); gt.inputs[1].default_value = 9.81; L(tau.outputs[0], gt.inputs[0])
    gt2 = _gn(ng, "ShaderNodeMath", operation="POWER"); gt2.inputs[1].default_value = 2.0; L(gt.outputs[0], gt2.inputs[0])
    vv = _gn(ng, "ShaderNodeMath", operation="ADD"); vv.inputs[1].default_value = v0[0] ** 2 + 0.6 ** 2; L(gt2.outputs[0], vv.inputs[0])
    vs = _gn(ng, "ShaderNodeMath", operation="POWER"); vs.inputs[1].default_value = -0.25; L(vv.outputs[0], vs.inputs[0])
    rr = _gn(ng, "ShaderNodeMath", operation="MULTIPLY"); rr.inputs[1].default_value = r0 * math.sqrt(math.sqrt(v0[0] ** 2 + 0.36))
    L(vs.outputs[0], rr.inputs[0])
    # varicose undulation: 1 + a*s*sin(k*tau - w*t)
    ph = _gn(ng, "ShaderNodeMath", operation="MULTIPLY_ADD"); ph.inputs[1].default_value = 260.0
    L(tau.outputs[0], ph.inputs[0])
    tw = _gn(ng, "ShaderNodeMath", operation="MULTIPLY"); tw.inputs[1].default_value = -70.0; L(st.outputs["Seconds"], tw.inputs[0])
    L(tw.outputs[0], ph.inputs[2])
    sn = _gn(ng, "ShaderNodeMath", operation="SINE"); L(ph.outputs[0], sn.inputs[0])
    am = _gn(ng, "ShaderNodeMath", operation="MULTIPLY"); am.inputs[1].default_value = 0.22; L(sp.outputs["Factor"], am.inputs[0])
    va = _gn(ng, "ShaderNodeMath", operation="MULTIPLY_ADD"); L(sn.outputs[0], va.inputs[0]); L(am.outputs[0], va.inputs[1]); va.inputs[2].default_value = 1.0
    r1 = _gn(ng, "ShaderNodeMath", operation="MULTIPLY"); L(rr.outputs[0], r1.inputs[0]); L(va.outputs[0], r1.inputs[1])
    r2 = _gn(ng, "ShaderNodeMath", operation="MULTIPLY"); L(r1.outputs[0], r2.inputs[0]); L(FLOW.outputs[0], r2.inputs[1])
    srad = _gn(ng, "GeometryNodeSetCurveRadius"); L(setp.outputs[0], srad.inputs["Curve"]); L(r2.outputs[0], srad.inputs["Radius"])
    trim = _gn(ng, "GeometryNodeTrimCurve"); L(srad.outputs[0], trim.inputs["Curve"])
    L(TAIL.outputs[0], trim.inputs[2]); L(FRONT.outputs[0], trim.inputs[3])
    circ = _gn(ng, "GeometryNodeCurvePrimitiveCircle"); circ.inputs["Resolution"].default_value = 16; circ.inputs["Radius"].default_value = 1.0
    c2m = _gn(ng, "GeometryNodeCurveToMesh"); L(trim.outputs[0], c2m.inputs["Curve"]); L(circ.outputs[0], c2m.inputs["Profile Curve"])
    c2m.inputs["Fill Caps"].default_value = True
    shs = _gn(ng, "GeometryNodeSetShadeSmooth"); L(c2m.outputs[0], shs.inputs["Geometry"])
    L(shs.outputs[0], out.inputs[0])
    obj.modifiers.new("GN", "NODES").node_group = ng
    C.assign(obj, mat_water_s4(name + "Mat", absorb=(0.97, 0.99, 0.985)))
    return obj, ng


def build_bubbles(name, centre, r_in, count=260, seed=31):
    """Entrained air bubbles under the impact point: each loops down then rises; LEVEL (abs z of the
    water surface, object space of the glass base) clips them; FLOW scales the cloud."""
    me = bpy.data.meshes.new(name)
    obj = C.link(bpy.data.objects.new(name, me)); obj.location = centre
    ng = bpy.data.node_groups.new(name + "_GN", "GeometryNodeTree")
    ng.interface.new_socket("Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
    out = _gn(ng, "NodeGroupOutput"); L = ng.links.new
    LEVEL = _val(ng, "LEVEL", 0.05); FLOW = _val(ng, "FLOW", 1.0)
    st = _gn(ng, "GeometryNodeInputSceneTime")
    pts = _gn(ng, "GeometryNodePoints"); pts.inputs["Count"].default_value = count
    rate = _gn(ng, "FunctionNodeRandomValue", data_type="FLOAT"); rate.inputs["Min"].default_value = 0.9; rate.inputs["Max"].default_value = 2.2
    rate.inputs["Seed"].default_value = seed
    phs = _gn(ng, "FunctionNodeRandomValue", data_type="FLOAT"); phs.inputs["Seed"].default_value = seed + 1
    u0 = _gn(ng, "ShaderNodeMath", operation="MULTIPLY_ADD"); L(st.outputs["Seconds"], u0.inputs[0]); L(rate.outputs[0], u0.inputs[1]); L(phs.outputs[0], u0.inputs[2])
    u = _gn(ng, "ShaderNodeMath", operation="FRACT"); L(u0.outputs[0], u.inputs[0])
    # depth profile: plunge to depth D at u=0.25, rise back to surface by u=1
    dep = _gn(ng, "FunctionNodeRandomValue", data_type="FLOAT"); dep.inputs["Min"].default_value = 0.25; dep.inputs["Max"].default_value = 0.95
    dep.inputs["Seed"].default_value = seed + 2
    sinu = _gn(ng, "ShaderNodeMath", operation="POWER"); sinu.inputs[1].default_value = 0.35; L(u.outputs[0], sinu.inputs[0])
    one = _gn(ng, "ShaderNodeMath", operation="SUBTRACT"); one.inputs[0].default_value = 1.0; L(u.outputs[0], one.inputs[1])
    prof = _gn(ng, "ShaderNodeMath", operation="MULTIPLY"); L(sinu.outputs[0], prof.inputs[0]); L(one.outputs[0], prof.inputs[1])
    prof2 = _gn(ng, "ShaderNodeMath", operation="MULTIPLY"); prof2.inputs[1].default_value = 1.9; L(prof.outputs[0], prof2.inputs[0])
    dd = _gn(ng, "ShaderNodeMath", operation="MULTIPLY"); L(prof2.outputs[0], dd.inputs[0]); L(dep.outputs[0], dd.inputs[1])
    # depth scales with the current water depth (LEVEL - base)
    dlev = _gn(ng, "ShaderNodeMath", operation="MULTIPLY"); L(dd.outputs[0], dlev.inputs[0]); L(LEVEL.outputs[0], dlev.inputs[1])
    zz = _gn(ng, "ShaderNodeMath", operation="SUBTRACT"); L(LEVEL.outputs[0], zz.inputs[0]); L(dlev.outputs[0], zz.inputs[1])
    # lateral spread grows with depth + swirl
    ang = _gn(ng, "FunctionNodeRandomValue", data_type="FLOAT"); ang.inputs["Max"].default_value = 6.283; ang.inputs["Seed"].default_value = seed + 3
    sw = _gn(ng, "ShaderNodeMath", operation="MULTIPLY_ADD"); L(u.outputs[0], sw.inputs[0]); sw.inputs[1].default_value = 3.0; L(ang.outputs[0], sw.inputs[2])
    rad = _gn(ng, "FunctionNodeRandomValue", data_type="FLOAT"); rad.inputs["Min"].default_value = 0.1; rad.inputs["Max"].default_value = 1.0
    rad.inputs["Seed"].default_value = seed + 4
    rspread = _gn(ng, "ShaderNodeMath", operation="MULTIPLY"); L(rad.outputs[0], rspread.inputs[0]); L(prof2.outputs[0], rspread.inputs[1])
    rsc = _gn(ng, "ShaderNodeMath", operation="MULTIPLY"); rsc.inputs[1].default_value = r_in * 0.75; L(rspread.outputs[0], rsc.inputs[0])
    cx = _gn(ng, "ShaderNodeMath", operation="COSINE"); L(sw.outputs[0], cx.inputs[0])
    sy = _gn(ng, "ShaderNodeMath", operation="SINE"); L(sw.outputs[0], sy.inputs[0])
    px = _gn(ng, "ShaderNodeMath", operation="MULTIPLY"); L(cx.outputs[0], px.inputs[0]); L(rsc.outputs[0], px.inputs[1])
    py = _gn(ng, "ShaderNodeMath", operation="MULTIPLY"); L(sy.outputs[0], py.inputs[0]); L(rsc.outputs[0], py.inputs[1])
    cmb = _gn(ng, "ShaderNodeCombineXYZ"); L(px.outputs[0], cmb.inputs[0]); L(py.outputs[0], cmb.inputs[1]); L(zz.outputs[0], cmb.inputs[2])
    setp = _gn(ng, "GeometryNodeSetPosition"); L(pts.outputs[0], setp.inputs["Geometry"]); L(cmb.outputs[0], setp.inputs["Position"])
    # size: small, shrinks near the end of life; times FLOW (no bubbles when not pouring)
    bs = _gn(ng, "FunctionNodeRandomValue", data_type="FLOAT"); bs.inputs["Min"].default_value = 0.0003; bs.inputs["Max"].default_value = 0.0014
    bs.inputs["Seed"].default_value = seed + 5
    life = _gn(ng, "ShaderNodeMath", operation="MULTIPLY"); life.inputs[1].default_value = 6.0; L(one.outputs[0], life.inputs[0])
    lifec = _gn(ng, "ShaderNodeMath", operation="MINIMUM"); lifec.inputs[1].default_value = 1.0; L(life.outputs[0], lifec.inputs[0])
    s1 = _gn(ng, "ShaderNodeMath", operation="MULTIPLY"); L(bs.outputs[0], s1.inputs[0]); L(lifec.outputs[0], s1.inputs[1])
    s2 = _gn(ng, "ShaderNodeMath", operation="MULTIPLY"); L(s1.outputs[0], s2.inputs[0]); L(FLOW.outputs[0], s2.inputs[1])
    ico = _gn(ng, "GeometryNodeMeshIcoSphere"); ico.inputs["Radius"].default_value = 1.0; ico.inputs["Subdivisions"].default_value = 2
    iop = _gn(ng, "GeometryNodeInstanceOnPoints"); L(setp.outputs[0], iop.inputs["Points"]); L(ico.outputs["Mesh"], iop.inputs["Instance"])
    L(s2.outputs[0], iop.inputs["Scale"])
    ri = _gn(ng, "GeometryNodeRealizeInstances"); L(iop.outputs[0], ri.inputs[0])
    shs = _gn(ng, "GeometryNodeSetShadeSmooth"); L(ri.outputs[0], shs.inputs["Geometry"])
    L(shs.outputs[0], out.inputs[0])
    obj.modifiers.new("GN", "NODES").node_group = ng
    # air in water: an IOR 1/1.333 dielectric
    C.assign(obj, C.principled(name + "Mat", base=(1, 1, 1), rough=0.0, transmission=1.0, ior=0.75))
    return obj, ng


def mat_old_paint():
    """Many coats of chalky off-white paint on an old window: soft brush texture, chipped edges and
    worn spots showing grey weathered wood, grime in the corners."""
    m, nt, p = C.new_mat("OldPaint")
    L = nt.links.new
    tc = nt.nodes.new("ShaderNodeTexCoord")
    nz = nt.nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 28; nz.inputs["Detail"].default_value = 9
    nz.inputs["Roughness"].default_value = 0.65
    L(tc.outputs["Object"], nz.inputs["Vector"])
    wear = nt.nodes.new("ShaderNodeMapRange"); wear.inputs["From Min"].default_value = 0.62; wear.inputs["From Max"].default_value = 0.66
    L(nz.outputs["Fac"], wear.inputs["Value"])
    brush = nt.nodes.new("ShaderNodeTexNoise"); brush.inputs["Scale"].default_value = 3.0; brush.inputs["Detail"].default_value = 3
    sc = nt.nodes.new("ShaderNodeMapping"); sc.inputs["Scale"].default_value = (1, 1, 60)
    L(tc.outputs["Object"], sc.inputs["Vector"]); L(sc.outputs["Vector"], brush.inputs["Vector"])
    pc = nt.nodes.new("ShaderNodeMix"); pc.data_type = "RGBA"
    pc.inputs[6].default_value = (0.80, 0.77, 0.69, 1); pc.inputs[7].default_value = (0.88, 0.85, 0.77, 1)
    L(brush.outputs["Fac"], pc.inputs[0])
    col = nt.nodes.new("ShaderNodeMix"); col.data_type = "RGBA"
    L(wear.outputs["Result"], col.inputs[0]); L(pc.outputs[2], col.inputs[6]); col.inputs[7].default_value = (0.25, 0.21, 0.17, 1)
    L(col.outputs[2], p.inputs["Base Color"])
    rr = nt.nodes.new("ShaderNodeMapRange"); rr.inputs["To Min"].default_value = 0.45; rr.inputs["To Max"].default_value = 0.8
    L(wear.outputs["Result"], rr.inputs["Value"]); L(rr.outputs["Result"], p.inputs["Roughness"])
    bh = nt.nodes.new("ShaderNodeMath"); bh.operation = "MULTIPLY_ADD"; bh.inputs[1].default_value = 0.15
    L(brush.outputs["Fac"], bh.inputs[0]); L(wear.outputs["Result"], bh.inputs[2])
    bp = nt.nodes.new("ShaderNodeBump"); bp.inputs["Distance"].default_value = 0.0006; bp.invert = True
    L(bh.outputs[0], bp.inputs["Height"]); L(bp.outputs["Normal"], p.inputs["Normal"])
    return m


def build_beam_slices(x0, x1, y0, y1, z0, z1, n=30, weight=0.008, color=(1.0, 0.95, 0.86), axis="X"):
    """Fake-but-physically-lit light shafts: a stack of camera-only planes that receive the real sun
    (with the real shadows of mullions, curtain and frame) through a faint translucent layer. Noise-free
    and cheap compared with a participating medium."""
    m, nt, p = C.new_mat("ShaftSlice")
    nt.nodes.remove(p)
    out = nt.nodes["Material Output"]
    tr = nt.nodes.new("ShaderNodeBsdfTransparent")
    tl = nt.nodes.new("ShaderNodeBsdfTranslucent"); tl.inputs["Color"].default_value = (*color, 1)
    df = nt.nodes.new("ShaderNodeBsdfDiffuse"); df.inputs["Color"].default_value = (*color, 1)
    both = nt.nodes.new("ShaderNodeAddShader")
    nt.links.new(tl.outputs[0], both.inputs[0]); nt.links.new(df.outputs[0], both.inputs[1])
    mx = nt.nodes.new("ShaderNodeMixShader"); mx.inputs[0].default_value = weight
    nt.links.new(tr.outputs[0], mx.inputs[1]); nt.links.new(both.outputs[0], mx.inputs[2])
    nt.links.new(mx.outputs[0], out.inputs["Surface"])
    verts, faces = [], []
    for i in range(n):
        if axis == "X":
            x = x0 + (x1 - x0) * (i + 0.5) / n
            q = [(x, y0, z0), (x, y1, z0), (x, y1, z1), (x, y0, z1)]
        else:
            y = y0 + (y1 - y0) * (i + 0.5) / n
            q = [(x0, y, z0), (x1, y, z0), (x1, y, z1), (x0, y, z1)]
        b = len(verts); verts += q; faces.append((b, b + 1, b + 2, b + 3))
    o = C.mesh_obj("ShaftSlices", verts, faces)
    C.assign(o, m)
    o.visible_shadow = False; o.visible_diffuse = False; o.visible_glossy = False
    o.visible_transmission = False; o.visible_volume_scatter = False
    # light linking: the slices see ONLY the sun (one cheap shadow ray per layer); fills exclude them
    col = bpy.data.collections.new("ShaftOnlySun")
    col.objects.link(o)
    for ln in ("SkyFill", "GroundBounce"):
        lo = bpy.data.objects.get(ln)
        if lo:
            lo.light_linking.receiver_collection = col
            for co in col.collection_objects:
                co.light_linking.link_state = "EXCLUDE"
    return o


# ----------------------------------------------------------------------------- compositor: sun shafts + bloom

def comp_sunbeams(ctx, cam, strength=0.07, threshold=0.9, size=0.9, bloom=0.05, bloom_threshold=3.0, beams=True):
    """Light shafts as the camera sees them: parallel sunbeams converge on the sun's screen position, so a
    radial 'sun beams' pass seeded ONLY from the over-bright window/sky highlights, centred on the projected
    sun (keyed per frame), reproduces them noise-free. Plus a whisper of lens bloom on clipped highlights."""
    from bpy_extras.object_utils import world_to_camera_view
    sc = bpy.context.scene
    ng = bpy.data.node_groups.new("S4_Comp", "CompositorNodeTree")
    ng.interface.new_socket("Image", in_out="OUTPUT", socket_type="NodeSocketColor")
    rl = ng.nodes.new("CompositorNodeRLayers")
    out = ng.nodes.new("NodeGroupOutput")
    gl = ng.nodes.new("CompositorNodeGlare")
    gl.inputs["Type"].default_value = "Sun Beams"
    gl.inputs["Quality"].default_value = "Medium"
    gl.inputs["Highlights Threshold"].default_value = threshold
    gl.inputs["Highlights Smoothness"].default_value = 0.6
    gl.inputs["Strength"].default_value = strength
    gl.inputs["Size"].default_value = size
    gl.inputs["Tint"].default_value = (1.0, 0.93, 0.82, 1)
    ng.links.new(rl.outputs["Image"], gl.inputs["Image"])
    last = gl.outputs["Image"] if beams else rl.outputs["Image"]
    if bloom > 0:
        bl = ng.nodes.new("CompositorNodeGlare")
        bl.inputs["Type"].default_value = "Bloom"
        bl.inputs["Quality"].default_value = "Medium"
        bl.inputs["Highlights Threshold"].default_value = bloom_threshold
        bl.inputs["Strength"].default_value = bloom
        bl.inputs["Size"].default_value = 0.8
        ng.links.new(last, bl.inputs["Image"])
        last = bl.outputs["Image"]
    ng.links.new(last, out.inputs[0])
    sc.compositing_node_group = ng
    sc.render.use_compositing = True
    try:
        sc.render.compositor_device = "CPU"
    except Exception:
        pass
    d = -sun_dir()
    sock = gl.inputs["Sun Position"]
    for f in range(ctx.f0 - 2, ctx.f1 + 3):
        sc.frame_set(f)
        p = cam.matrix_world.translation + d * 50.0
        co = world_to_camera_view(sc, cam, p)
        sock.default_value = (co.x, co.y)
        sock.keyframe_insert("default_value", frame=f)
    sc.frame_set(ctx.f0)
    return ng


def fast_denoise():
    """common.configure_render() runs after build(); patch the denoiser at render init for speed
    (prefilter FAST, quality BALANCED: ~2x faster OIDN at 1080x1920, visually identical at our spp)."""
    def _h(*_):
        c = bpy.context.scene.cycles
        c.denoising_prefilter = "FAST"
        c.denoising_quality = "BALANCED"
    bpy.app.handlers.render_init.append(_h)


# ----------------------------------------------------------------------------- analytic light shafts

def build_beam_emission(bmin, bmax, strength=0.03, noise_amp=0.55, curtain_y=None, curtain_trans=0.55,
                        time_keys=None, color=(1.0, 0.93, 0.80)):
    """Volumetric sun shafts without light sampling: each point p is traced back along the sun ray to
    the window plane; if it lands in a glazed opening (minus frame, transom, sash bars - i.e. exactly where
    the real sun gets in) it emits. Drifting 4D noise = moving air/dust density. Noise-free and cheap
    (emission-only volume), with the real window's shadow pattern."""
    o = box("ShaftVolume", bmin[0], bmax[0], bmin[1], bmax[1], bmin[2], bmax[2])
    m = bpy.data.materials.new("ShaftEmission"); m.use_nodes = True
    nt = m.node_tree; nt.nodes.clear(); L = nt.links.new
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sd = sun_dir()
    # t = (FRAME_X - p.x) / sd.x  ;  q = p + sd * t
    sep = nt.nodes.new("ShaderNodeSeparateXYZ"); L(tc.outputs["Object"], sep.inputs[0])
    tt = nt.nodes.new("ShaderNodeMath"); tt.operation = "MULTIPLY_ADD"
    tt.inputs[1].default_value = -1.0 / sd.x; tt.inputs[2].default_value = FRAME_X / sd.x
    L(sep.outputs["X"], tt.inputs[0])
    qy = nt.nodes.new("ShaderNodeMath"); qy.operation = "MULTIPLY_ADD"; qy.inputs[1].default_value = sd.y
    L(tt.outputs[0], qy.inputs[0]); L(sep.outputs["Y"], qy.inputs[2])
    qz = nt.nodes.new("ShaderNodeMath"); qz.operation = "MULTIPLY_ADD"; qz.inputs[1].default_value = sd.z
    L(tt.outputs[0], qz.inputs[0]); L(sep.outputs["Z"], qz.inputs[2])

    def band(src, lo, hi, soft=0.012):
        """1 inside [lo,hi] with soft edges."""
        a = nt.nodes.new("ShaderNodeMapRange"); a.interpolation_type = "SMOOTHSTEP"
        a.inputs["From Min"].default_value = lo - soft; a.inputs["From Max"].default_value = lo + soft
        L(src, a.inputs["Value"])
        b = nt.nodes.new("ShaderNodeMapRange"); b.interpolation_type = "SMOOTHSTEP"
        b.inputs["From Min"].default_value = hi + soft; b.inputs["From Max"].default_value = hi - soft
        L(src, b.inputs["Value"])
        mlt = nt.nodes.new("ShaderNodeMath"); mlt.operation = "MULTIPLY"
        L(a.outputs["Result"], mlt.inputs[0]); L(b.outputs["Result"], mlt.inputs[1])
        return mlt.outputs[0]

    def mul(a, b):
        n = nt.nodes.new("ShaderNodeMath"); n.operation = "MULTIPLY"; L(a, n.inputs[0]); L(b, n.inputs[1]); return n.outputs[0]

    def inv(a):
        n = nt.nodes.new("ShaderNodeMath"); n.operation = "SUBTRACT"; n.inputs[0].default_value = 1.0; L(a, n.inputs[1]); return n.outputs[0]
    fw = 0.065
    ym = (WIN_Y0 + WIN_Y1) / 2
    tz = WIN_Z1 - 0.36
    inside = mul(band(qy.outputs[0], WIN_Y0 + fw, WIN_Y1 - fw), band(qz.outputs[0], WIN_Z0 + fw, WIN_Z1 - fw))
    # transom bar, central meeting stiles, sash bars (3 rows each sash)
    inside = mul(inside, inv(band(qz.outputs[0], tz - 0.03, tz + 0.03, 0.008)))
    inside = mul(inside, inv(band(qy.outputs[0], ym - 0.045, ym + 0.045, 0.008)))
    za, zb = WIN_Z0 + fw + 0.045 * 1.4, tz - 0.03 - 0.045
    for i in (1, 2):
        z = za + (zb - za) * i / 3
        inside = mul(inside, inv(band(qz.outputs[0], z - 0.011, z + 0.011, 0.006)))
    # the curtain half lets ~55 % through
    if curtain_y is not None:
        cu = band(qy.outputs[0], -10.0, curtain_y, 0.04)
        f = nt.nodes.new("ShaderNodeMath"); f.operation = "MULTIPLY_ADD"
        f.inputs[1].default_value = -(1 - curtain_trans); f.inputs[2].default_value = 1.0
        L(cu, f.inputs[0]); inside = mul(inside, f.outputs[0])
    # drifting air density
    nz = nt.nodes.new("ShaderNodeTexNoise"); nz.noise_dimensions = "4D"
    nz.inputs["Scale"].default_value = 2.2; nz.inputs["Detail"].default_value = 3.0; nz.inputs["Roughness"].default_value = 0.55
    L(tc.outputs["Object"], nz.inputs["Vector"])
    wv = nt.nodes.new("ShaderNodeValue"); wv.name = "TIME"
    L(wv.outputs[0], nz.inputs["W"])
    nm = nt.nodes.new("ShaderNodeMapRange")
    nm.inputs["To Min"].default_value = 1 - noise_amp; nm.inputs["To Max"].default_value = 1 + noise_amp
    L(nz.outputs["Fac"], nm.inputs["Value"])
    dens = mul(inside, nm.outputs["Result"])
    st = nt.nodes.new("ShaderNodeMath"); st.operation = "MULTIPLY"; st.inputs[1].default_value = strength
    L(dens, st.inputs[0])
    em = nt.nodes.new("ShaderNodeEmission"); em.inputs["Color"].default_value = (*color, 1)
    L(st.outputs[0], em.inputs["Strength"])
    L(em.outputs[0], out.inputs["Volume"])
    C.assign(o, m)
    o.visible_shadow = False; o.visible_diffuse = False; o.visible_glossy = False
    o.visible_transmission = False; o.visible_volume_scatter = False
    if time_keys:
        for t, w in time_keys:
            wv.outputs[0].default_value = w
            wv.outputs[0].keyframe_insert("default_value", frame=t * C.FPS)
        for fc in C._fcurves(m.node_tree.animation_data.action):
            for kp in fc.keyframe_points:
                kp.interpolation = "LINEAR"
            fc.extrapolation = "LINEAR"
    return o
