"""Studio S7 shared helpers for the microscopic world (sh06 blood vessel, sh09 muscle/nerve/cell,
sh10 cell field). Everything here is procedural and seeded.

Scale convention for all three shots: 1 Blender metre = 100 micrometres (x 10 000). A red blood
cell (7.8 um) is 0.078 m, a mitochondrion (~1 um x 2-3 um) is 0.01 x 0.025 m. At this scale the
physical camera (35-60 mm, f/2-f/4, focus 0.15-0.5 m) gives the shallow macro depth of field of a
microscope probe while keeping Cycles' numeric precision comfortable.

Haze: real volumes are too slow for the budget, so every material is wrapped by `fog_wrap`, which
blends the surface shader toward an emissive haze colour by camera distance (exp falloff). This
reads as plasma/cytoplasm haze and depth falloff at zero extra sampling cost.
"""
import bpy, bmesh, math, random
from mathutils import Vector, Euler, Matrix, noise
import common as C
import os

SSS_METHOD = os.environ.get("S7_SSS", "BURLEY")


def sss_method(mat):
    for n in mat.node_tree.nodes:
        if n.type == "BSDF_PRINCIPLED":
            n.subsurface_method = SSS_METHOD

UM = 0.01            # one micrometre in Blender units

# --------------------------------------------------------------------------- fast baked animation


def bake(obj, frames, path, values, interp="LINEAR"):
    """Write per-frame keys quickly. `values` = list of tuples (one per frame) for a vector property
    (location / rotation_euler / scale) or floats for a scalar path on obj (e.g. 'data.energy' not
    supported - use bake_id for other ID blocks)."""
    _bake_id(obj, frames, path, values, interp)


def _bake_id(idb, frames, path, values, interp="LINEAR"):
    if idb.animation_data is None:
        idb.animation_data_create()
    act = idb.animation_data.action
    if act is None:
        act = bpy.data.actions.new(idb.name + "_act")
        idb.animation_data.action = act
    n = len(frames)
    dim = len(values[0]) if hasattr(values[0], "__len__") else 1
    for i in range(dim):
        fc = act.fcurve_ensure_for_datablock(idb, path, index=i if dim > 1 else 0)
        fc.keyframe_points.clear()
        fc.keyframe_points.add(n)
        co = []
        for f, v in zip(frames, values):
            co += [f, v[i] if dim > 1 else v]
        fc.keyframe_points.foreach_set("co", co)
        ip = {"LINEAR": 1, "BEZIER": 2, "CONSTANT": 0}[interp]
        fc.keyframe_points.foreach_set("interpolation", [ip] * n)
        fc.update()


def bake_id(idb, frames, path, values, interp="LINEAR"):
    _bake_id(idb, frames, path, values, interp)


def bake_socket(node_tree, node, input_name, frames, values):
    """Animate a node input default_value (scalar) in a material/world node tree."""
    sock = node.inputs[input_name]
    path = f'nodes["{node.name}"].inputs[{list(node.inputs).index(sock)}].default_value'
    _bake_id(node_tree, frames, path, values)


# --------------------------------------------------------------------------- heartbeat


def heartbeat(t, beat0, period=60.0 / 72.0, big=None, big_gain=1.8):
    """Arterial pulse waveform in [0, ~1.x]: sharp systolic upstroke, slower decay, small dicrotic
    bump. `beat0` = time of one systolic peak. `big` = time of the strongest beat."""
    v = 0.0
    k0 = math.floor((t - beat0) / period) - 1
    for k in range(k0, k0 + 3):
        tb = beat0 + k * period
        x = t - tb
        g = big_gain if (big is not None and abs(tb - big) < period * 0.5) else 1.0
        if x < 0:
            s = math.exp(-(x / 0.045) ** 2)                   # fast upstroke
        else:
            s = math.exp(-x / 0.16)                           # run-off
            s += 0.22 * math.exp(-((x - 0.30) / 0.05) ** 2)   # dicrotic wave
        v += g * s
    return v


# --------------------------------------------------------------------------- materials


def _n(nt, kind, loc=(0, 0), **inputs):
    n = nt.nodes.new(kind)
    n.location = loc
    for k, v in inputs.items():
        n.inputs[k].default_value = v
    return n


FOG_GROUP = "S7_Fog"


def fog_group(color=(0.30, 0.025, 0.02), dist=2.5, strength=1.0, power=1.0):
    """Shared haze node group (one per scene) so the haze colour/distance can be animated globally:
    animate `fog_group().nodes['dist'].outputs[0].default_value` etc. via bake_id on the group."""
    g = bpy.data.node_groups.get(FOG_GROUP)
    if g is None:
        g = bpy.data.node_groups.new(FOG_GROUP, "ShaderNodeTree")
        g.interface.new_socket("Shader", in_out="INPUT", socket_type="NodeSocketShader")
        g.interface.new_socket("Shader", in_out="OUTPUT", socket_type="NodeSocketShader")
        nt = g
        gi = nt.nodes.new("NodeGroupInput"); go = nt.nodes.new("NodeGroupOutput")
        cam = nt.nodes.new("ShaderNodeCameraData")
        dv = nt.nodes.new("ShaderNodeValue"); dv.name = "dist"
        pv = nt.nodes.new("ShaderNodeValue"); pv.name = "power"
        sv = nt.nodes.new("ShaderNodeValue"); sv.name = "strength"
        cv = nt.nodes.new("ShaderNodeRGB"); cv.name = "color"
        d = nt.nodes.new("ShaderNodeMath"); d.operation = "DIVIDE"
        nt.links.new(cam.outputs["View Distance"], d.inputs[0]); nt.links.new(dv.outputs[0], d.inputs[1])
        pw = nt.nodes.new("ShaderNodeMath"); pw.operation = "POWER"
        nt.links.new(d.outputs[0], pw.inputs[0]); nt.links.new(pv.outputs[0], pw.inputs[1])
        ex = nt.nodes.new("ShaderNodeMath"); ex.operation = "MULTIPLY"; ex.inputs[1].default_value = -1.0
        nt.links.new(pw.outputs[0], ex.inputs[0])
        e2 = nt.nodes.new("ShaderNodeMath"); e2.operation = "EXPONENT"
        nt.links.new(ex.outputs[0], e2.inputs[0])
        fac = nt.nodes.new("ShaderNodeMath"); fac.operation = "SUBTRACT"; fac.inputs[0].default_value = 1.0
        nt.links.new(e2.outputs[0], fac.inputs[1])
        em = nt.nodes.new("ShaderNodeEmission")
        nt.links.new(cv.outputs[0], em.inputs["Color"]); nt.links.new(sv.outputs[0], em.inputs["Strength"])
        mix = nt.nodes.new("ShaderNodeMixShader")
        nt.links.new(fac.outputs[0], mix.inputs[0])
        nt.links.new(gi.outputs[0], mix.inputs[1]); nt.links.new(em.outputs[0], mix.inputs[2])
        nt.links.new(mix.outputs[0], go.inputs[0])
    g.nodes["dist"].outputs[0].default_value = dist
    g.nodes["power"].outputs[0].default_value = power
    g.nodes["strength"].outputs[0].default_value = strength
    g.nodes["color"].outputs[0].default_value = (*color, 1)
    return g


def fog_wrap(mat, **fog):
    """Blend the material's surface shader toward an emissive haze by view distance:
    fac = 1 - exp(-(d / dist) ** power). Uses the shared S7_Fog group (configure with fog_group)."""
    g = bpy.data.node_groups.get(FOG_GROUP) or fog_group(**fog)
    nt = mat.node_tree
    out = [n for n in nt.nodes if n.type == "OUTPUT_MATERIAL"][0]
    src = out.inputs["Surface"].links[0].from_socket
    gn = nt.nodes.new("ShaderNodeGroup"); gn.node_tree = g
    gn.location = (out.location.x - 150, out.location.y)
    nt.links.new(src, gn.inputs[0])
    nt.links.new(gn.outputs[0], out.inputs["Surface"])
    # the haze is not a light source: keep it out of the light tree (huge speed-up)
    mat.cycles.emission_sampling = "NONE"
    return gn


def _bump_chain(nt, p, heights, distance=0.002):
    """heights: list of (socket, strength). Chains Bump nodes into the Principled normal (and coat)."""
    prev = None
    for sock, s in heights:
        b = _n(nt, "ShaderNodeBump"); b.inputs["Strength"].default_value = s
        b.inputs["Distance"].default_value = distance
        nt.links.new(sock, b.inputs["Height"])
        if prev is not None:
            nt.links.new(prev.outputs[0], b.inputs["Normal"])
        prev = b
    if prev is not None:
        nt.links.new(prev.outputs[0], p.inputs["Normal"])
    return prev


def mat_rbc(name="RBC", fog=None, D=0.078):
    """Erythrocyte, subsurface-dominant: deep crimson body with red-weighted SSS so thin centre and
    rims glow when backlit, darker central dimple, broad soft specular (rough ~0.4) with a faint wet
    sheen, tiny membrane irregularities, per-cell colour variation. No lacquer."""
    m, nt, p = C.new_mat(name)
    p.subsurface_method = SSS_METHOD
    oi = _n(nt, "ShaderNodeObjectInfo")
    ramp = _n(nt, "ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (0.20, 0.010, 0.012, 1)
    ramp.color_ramp.elements[1].color = (0.30, 0.018, 0.016, 1)
    nt.links.new(oi.outputs["Random"], ramp.inputs[0])
    # darker dimple: radial distance in the disc plane (object XY), 0 at the centre
    tc = _n(nt, "ShaderNodeTexCoord")
    sep = _n(nt, "ShaderNodeSeparateXYZ"); nt.links.new(tc.outputs["Object"], sep.inputs[0])
    cxy = _n(nt, "ShaderNodeCombineXYZ")
    nt.links.new(sep.outputs["X"], cxy.inputs["X"]); nt.links.new(sep.outputs["Y"], cxy.inputs["Y"])
    ln = _n(nt, "ShaderNodeVectorMath"); ln.operation = "LENGTH"; nt.links.new(cxy.outputs[0], ln.inputs[0])
    dm = _n(nt, "ShaderNodeMapRange"); dm.interpolation_type = "SMOOTHSTEP"
    dm.inputs["From Min"].default_value = D * 0.08; dm.inputs["From Max"].default_value = D * 0.30
    dm.inputs["To Min"].default_value = 0.55; dm.inputs["To Max"].default_value = 1.0
    nt.links.new(ln.outputs["Value"], dm.inputs["Value"])
    mul = _n(nt, "ShaderNodeMix"); mul.data_type = "RGBA"; mul.blend_type = "MULTIPLY"; mul.inputs[0].default_value = 1.0
    nt.links.new(ramp.outputs[0], mul.inputs[6])
    cc = _n(nt, "ShaderNodeCombineColor")
    for s_ in ("Red", "Green", "Blue"):
        nt.links.new(dm.outputs[0], cc.inputs[s_])
    nt.links.new(cc.outputs[0], mul.inputs[7])
    nt.links.new(mul.outputs[2], p.inputs["Base Color"])
    p.inputs["Roughness"].default_value = 0.42
    p.inputs["Specular IOR Level"].default_value = 0.35
    p.inputs["Subsurface Weight"].default_value = 1.0
    p.inputs["Subsurface Radius"].default_value = (1.0, 0.07, 0.045)
    p.inputs["Subsurface Scale"].default_value = 0.022
    p.inputs["Subsurface Anisotropy"].default_value = 0.7
    p.inputs["Coat Weight"].default_value = 0.18
    p.inputs["Coat Roughness"].default_value = 0.3
    p.inputs["Coat IOR"].default_value = 1.36
    p.inputs["Sheen Weight"].default_value = 0.12
    p.inputs["Sheen Tint"].default_value = (1.0, 0.45, 0.4, 1)
    p.inputs["Sheen Roughness"].default_value = 0.5
    nz = _n(nt, "ShaderNodeTexNoise", **{"Scale": 38.0, "Detail": 2.0, "Roughness": 0.6})
    nt.links.new(tc.outputs["Object"], nz.inputs["Vector"])
    _bump_chain(nt, p, [(nz.outputs["Fac"], 0.22)], distance=0.004)
    # seen from inside (the lens passing through a cell): glowing haemoglobin red, never black
    out = [n for n in nt.nodes if n.type == "OUTPUT_MATERIAL"][0]
    geo = _n(nt, "ShaderNodeNewGeometry")
    em = _n(nt, "ShaderNodeEmission"); em.inputs["Color"].default_value = (0.55, 0.03, 0.02, 1)
    em.inputs["Strength"].default_value = 0.35
    mx = _n(nt, "ShaderNodeMixShader")
    nt.links.new(geo.outputs["Backfacing"], mx.inputs[0])
    nt.links.new(p.outputs[0], mx.inputs[1]); nt.links.new(em.outputs[0], mx.inputs[2])
    nt.links.new(mx.outputs[0], out.inputs["Surface"])
    m.cycles.emission_sampling = "NONE"
    if fog:
        fog_wrap(m, **fog)
    return m


def mat_wet_tissue(name, base=(0.42, 0.06, 0.05), base2=None, sss_radius=(1.0, 0.25, 0.15), sss_scale=0.05,
                   rough=0.45, coat=0.9, coat_rough=0.07, fog=None):
    """Generic glistening living tissue: SSS body, clear wet coat, roughness breakup."""
    m, nt, p = C.new_mat(name)
    p.subsurface_method = SSS_METHOD
    p.inputs["Base Color"].default_value = (*base, 1)
    p.inputs["Roughness"].default_value = rough
    p.inputs["Subsurface Weight"].default_value = 1.0
    p.inputs["Subsurface Radius"].default_value = sss_radius
    p.inputs["Subsurface Scale"].default_value = sss_scale
    p.inputs["Coat Weight"].default_value = coat
    p.inputs["Coat Roughness"].default_value = coat_rough
    p.inputs["Coat IOR"].default_value = 1.36
    p["principled"] = True
    return m, nt, p


def mat_endothelium(name="Endothelium", fog=None, scale=9.0, stretch=3.2):
    """Vessel lumen wall: mosaic of elongated endothelial cells (aligned with flow = Y), cell borders as
    shallow grooves, nuclei as soft bulges, wet glistening coat with patchy roughness."""
    m, nt, p = mat_wet_tissue(name, base=(0.36, 0.05, 0.045), sss_radius=(1.0, 0.2, 0.12), sss_scale=0.06,
                              rough=0.5, coat=1.0, coat_rough=0.06)
    tc = _n(nt, "ShaderNodeTexCoord")
    mp = _n(nt, "ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (scale, scale / stretch, scale)
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
    # warp the mosaic a little so the cells are not perfectly regular
    wn = _n(nt, "ShaderNodeTexNoise", **{"Scale": 1.5, "Detail": 2.0})
    nt.links.new(mp.outputs[0], wn.inputs["Vector"])
    wmix = _n(nt, "ShaderNodeMix"); wmix.data_type = "VECTOR"; wmix.inputs[0].default_value = 0.35
    nt.links.new(mp.outputs[0], wmix.inputs[4]); nt.links.new(wn.outputs["Color"], wmix.inputs[5])
    ve = _n(nt, "ShaderNodeTexVoronoi"); ve.feature = "DISTANCE_TO_EDGE"
    nt.links.new(wmix.outputs[1], ve.inputs["Vector"])
    vf = _n(nt, "ShaderNodeTexVoronoi"); vf.feature = "F1"
    nt.links.new(wmix.outputs[1], vf.inputs["Vector"])
    # groove: smoothstep(0, 0.08, edge distance)
    gr = _n(nt, "ShaderNodeMapRange"); gr.interpolation_type = "SMOOTHSTEP"
    gr.inputs["From Min"].default_value = 0.0; gr.inputs["From Max"].default_value = 0.09
    nt.links.new(ve.outputs["Distance"], gr.inputs["Value"])
    # nucleus bulge: 1 - smoothstep(0.05, 0.32, F1 distance)
    nu = _n(nt, "ShaderNodeMapRange"); nu.interpolation_type = "SMOOTHSTEP"
    nu.inputs["From Min"].default_value = 0.08; nu.inputs["From Max"].default_value = 0.34
    nu.inputs["To Min"].default_value = 1.0; nu.inputs["To Max"].default_value = 0.0
    nt.links.new(vf.outputs["Distance"], nu.inputs["Value"])
    fine = _n(nt, "ShaderNodeTexNoise", **{"Scale": 140.0, "Detail": 8.0, "Roughness": 0.6})
    nt.links.new(tc.outputs["Object"], fine.inputs["Vector"])
    b = _bump_chain(nt, p, [(gr.outputs[0], 0.35), (nu.outputs[0], 0.45), (fine.outputs["Fac"], 0.12)],
                    distance=0.006)
    # colour: per-cell variation + slightly darker borders, purplish nuclei
    cr = _n(nt, "ShaderNodeValToRGB")
    cr.color_ramp.elements[0].color = (0.26, 0.035, 0.035, 1)
    cr.color_ramp.elements[1].color = (0.44, 0.075, 0.06, 1)
    nt.links.new(vf.outputs["Color"], cr.inputs[0])
    mb = _n(nt, "ShaderNodeMix"); mb.data_type = "RGBA"; mb.blend_type = "MULTIPLY"
    nt.links.new(gr.outputs[0], mb.inputs[0]); mb.inputs[0].default_value = 1
    inv = _n(nt, "ShaderNodeMapRange"); inv.inputs["To Min"].default_value = 0.55
    nt.links.new(gr.outputs[0], inv.inputs["Value"])
    nt.links.new(cr.outputs[0], mb.inputs[6])
    comb = _n(nt, "ShaderNodeCombineColor")
    for s in ("Red", "Green", "Blue"):
        nt.links.new(inv.outputs[0], comb.inputs[s])
    nt.links.new(comb.outputs[0], mb.inputs[7])
    mn = _n(nt, "ShaderNodeMix"); mn.data_type = "RGBA"; mn.blend_type = "MIX"
    nm = _n(nt, "ShaderNodeMath"); nm.operation = "MULTIPLY"; nm.inputs[1].default_value = 0.45
    nt.links.new(nu.outputs[0], nm.inputs[0]); nt.links.new(nm.outputs[0], mn.inputs[0])
    nt.links.new(mb.outputs[2], mn.inputs[6]); mn.inputs[7].default_value = (0.22, 0.03, 0.06, 1)
    nt.links.new(mn.outputs[2], p.inputs["Base Color"])
    # roughness breakup of the wet film
    rn = _n(nt, "ShaderNodeTexNoise", **{"Scale": 6.0, "Detail": 4.0})
    nt.links.new(tc.outputs["Object"], rn.inputs["Vector"])
    rr = _n(nt, "ShaderNodeMapRange"); rr.inputs["To Min"].default_value = 0.03; rr.inputs["To Max"].default_value = 0.16
    nt.links.new(rn.outputs["Fac"], rr.inputs["Value"])
    nt.links.new(rr.outputs[0], p.inputs["Coat Roughness"])
    if fog:
        fog_wrap(m, **fog)
    return m


# --------------------------------------------------------------------------- geometry


def rbc_mesh(name="rbc", D=0.078, seg=56, nprof=22, seed=0, cup=0.0, wobble=0.04):
    """Biconcave erythrocyte from the Evans-Fung profile:
    z(r) = +-0.5*sqrt(1-x^2)*(C0 + C2 x^2 + C4 x^4),  x = 2r/D,  C0=0.81 C2=7.83 C4=-4.39 um (D=7.82 um).
    `cup` bends it toward a stomatocyte/cup (tumbling cells in shear flow deform), `wobble` adds
    low-frequency membrane irregularity so no two cells are identical."""
    C0, C2, C4 = 0.81, 7.83, -4.39
    R = D / 2
    k_um = UM * D / 0.0782
    rng = random.Random(seed)
    off = Vector((rng.uniform(-50, 50), rng.uniform(-50, 50), rng.uniform(-50, 50)))
    prof = []                                        # (r, z) from top centre -> rim -> bottom centre
    for i in range(nprof + 1):                       # top: theta 0..pi/2, r = R sin(theta)
        th = (math.pi / 2) * i / nprof
        x = math.sin(th)
        z = 0.5 * k_um * math.sqrt(max(0.0, 1 - x * x)) * (C0 + C2 * x * x + C4 * x ** 4)
        prof.append((R * x, z))
    bot = [(r, -z) for (r, z) in reversed(prof[:-1])]
    prof = prof + bot
    verts, faces = [], []
    top = len(verts); verts.append((0, 0, prof[0][1]))
    ring_ids = []
    for j in range(1, len(prof) - 1):
        r, z = prof[j]
        ids = []
        for k in range(seg):
            a = 2 * math.pi * k / seg
            x, y = r * math.cos(a), r * math.sin(a)
            p = Vector((x, y, z))
            n = noise.noise((p / D) * 2.2 + off)
            rr = 1 + wobble * n
            zz = z + cup * (r / R) ** 2 * R * 0.25 + wobble * 0.3 * D * noise.noise((p / D) * 3.1 + off * 1.3)
            ids.append(len(verts)); verts.append((x * rr, y * rr, zz))
        ring_ids.append(ids)
    bot_c = len(verts); verts.append((0, 0, prof[-1][1] + cup * 0))
    for k in range(seg):
        k2 = (k + 1) % seg
        faces.append((top, ring_ids[0][k], ring_ids[0][k2]))
    for a, b in zip(ring_ids[:-1], ring_ids[1:]):
        for k in range(seg):
            k2 = (k + 1) % seg
            faces.append((a[k], b[k], b[k2], a[k2]))
    for k in range(seg):
        k2 = (k + 1) % seg
        faces.append((ring_ids[-1][k], bot_c, ring_ids[-1][k2]))
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.update()
    for poly in me.polygons:
        poly.use_smooth = True
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    return me


def blob_mesh(name, radius=0.06, sub=4, seed=0, amp=0.25, freq=2.0, ruffle=0.0, ruffle_freq=9.0, squash=(1, 1, 1)):
    """Irregular organic sphere (white cell, platelet, organelle). `ruffle` adds membrane microvilli folds."""
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=1.0)
    rng = random.Random(seed)
    off = Vector((rng.uniform(-90, 90), rng.uniform(-90, 90), rng.uniform(-90, 90)))
    for v in bm.verts:
        d = v.co.normalized()
        n = noise.fractal(d * freq + off, 0.5, 2.0, 3)
        r = 1 + amp * n
        if ruffle:
            r += ruffle * (noise.ridged_multi_fractal(d * ruffle_freq + off, 0.9, 2.1, 3, 0.9, 2.0) - 0.6)
        v.co = Vector((d.x * squash[0], d.y * squash[1], d.z * squash[2])) * (radius * r)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me); bm.free()
    for p in me.polygons:
        p.use_smooth = True
    return me


def tube_mesh(name, radius=0.5, y0=-10, y1=10, nu=128, nv=600, seed=3, amp=0.06, inward=True, bend=None):
    """Open cylinder along Y with low-frequency radius undulation; normals point inward (lumen view).
    bend(y) -> (dx, dz) offsets the centreline."""
    rng = random.Random(seed)
    off = Vector((rng.uniform(-50, 50), rng.uniform(-50, 50), rng.uniform(-50, 50)))
    verts, faces = [], []
    for j in range(nv + 1):
        y = y0 + (y1 - y0) * j / nv
        cx, cz = bend(y) if bend else (0.0, 0.0)
        for i in range(nu):
            a = 2 * math.pi * i / nu
            d = Vector((math.cos(a), 0, math.sin(a)))
            pn = Vector((d.x * 1.3, y * 0.45, d.z * 1.3)) + off
            r = radius * (1 + amp * noise.fractal(pn, 0.55, 2.0, 4))
            verts.append((cx + d.x * r, y, cz + d.z * r))
    for j in range(nv):
        for i in range(nu):
            a = j * nu + i
            b = j * nu + (i + 1) % nu
            c = (j + 1) * nu + (i + 1) % nu
            d_ = (j + 1) * nu + i
            faces.append((a, b, c, d_) if inward else (a, d_, c, b))
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.update()
    for p in me.polygons:
        p.use_smooth = True
    return me


def obj_from_mesh(name, me, mat=None, loc=(0, 0, 0)):
    o = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(o)
    o.location = loc
    if mat is not None:
        if len(me.materials) == 0:
            me.materials.append(mat)
    return o


def cam_child_empty(name, cam, screen_xy_px, depth=1.0):
    """Empty parented to the camera so it sits at a fixed screen pixel position (1080x1920)."""
    d = cam.data
    vfov_half = math.atan((d.sensor_height / 2) / d.lens)
    hh = math.tan(vfov_half) * depth
    hw = hh * C.W / C.H
    x = (screen_xy_px[0] / C.W * 2 - 1) * hw
    y = (1 - screen_xy_px[1] / C.H * 2) * hh
    e = C.empty(name)
    e.parent = cam
    e.location = (x, y, -depth)
    return e


# --------------------------------------------------------------------------- shared micro-world pieces (sh09/sh10)


def time_value(nt, name="Time"):
    """A Value node in a node tree that always holds the absolute time in seconds (linear keys with
    linear extrapolation, so it is valid at motion-blur subframes and for any frame range)."""
    v = nt.nodes.get(name) or nt.nodes.new("ShaderNodeValue")
    v.name = name
    idb = nt
    path = f'nodes["{name}"].outputs[0].default_value'
    _bake_id(idb, [0, 24 * 200], path, [0.0, 200.0])
    act = idb.animation_data.action
    for fc in _fcurves_of(act):
        fc.extrapolation = "LINEAR"
    return v


def _fcurves_of(act):
    return C._fcurves(act)


def path_tube(name, pts, radius_fn, nu=32, store_s=True):
    """Tube along a polyline `pts` (list of Vector). radius_fn(s, i) -> radius at arc length s.
    Stores per-vertex arc length in the float attribute 's' (for travelling-pulse shaders)."""
    n = len(pts)
    tang = []
    for i in range(n):
        a = pts[max(0, i - 1)]; b = pts[min(n - 1, i + 1)]
        tang.append((b - a).normalized())
    # parallel-transport frame
    up = Vector((0, 0, 1)) if abs(tang[0].z) < 0.9 else Vector((1, 0, 0))
    nrm = tang[0].cross(up).normalized()
    frames_ = []
    for i in range(n):
        if i:
            nrm = (nrm - tang[i] * nrm.dot(tang[i])).normalized()
        frames_.append((nrm.copy(), tang[i].cross(nrm).normalized()))
    s_acc = [0.0]
    for i in range(1, n):
        s_acc.append(s_acc[-1] + (pts[i] - pts[i - 1]).length)
    verts, faces, svals = [], [], []
    for i in range(n):
        r = radius_fn(s_acc[i], i)
        a_, b_ = frames_[i]
        for k in range(nu):
            ang = 2 * math.pi * k / nu
            verts.append(tuple(pts[i] + (a_ * math.cos(ang) + b_ * math.sin(ang)) * r))
            svals.append(s_acc[i])
    for i in range(n - 1):
        for k in range(nu):
            k2 = (k + 1) % nu
            faces.append((i * nu + k, i * nu + k2, (i + 1) * nu + k2, (i + 1) * nu + k))
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.update()
    for p in me.polygons:
        p.use_smooth = True
    if store_s:
        at = me.attributes.new("s", "FLOAT", "POINT")
        at.data.foreach_set("value", svals)
    return me, s_acc


def mat_mito(name="Mito", glow=(1.0, 0.36, 0.07), strength=4.0, fog=None, hero=False):
    """Mitochondrion outer body: translucent amber membrane with bumpy surface; for non-hero
    mitochondria a cristae-like stripe pattern glows through (cheap); hero mitos get real cristae."""
    m, nt, p = mat_wet_tissue(name, base=(0.32, 0.11, 0.035), sss_radius=(1.0, 0.5, 0.2), sss_scale=0.006,
                              rough=0.35, coat=0.6, coat_rough=0.12)
    tc = _n(nt, "ShaderNodeTexCoord")
    nz = _n(nt, "ShaderNodeTexNoise", **{"Scale": 160.0, "Detail": 5.0})
    nt.links.new(tc.outputs["Object"], nz.inputs["Vector"])
    _bump_chain(nt, p, [(nz.outputs["Fac"], 0.15)], distance=0.002)
    # cristae stripes across the long (local Y) axis, wobbly
    wv = _n(nt, "ShaderNodeTexWave"); wv.wave_type = "BANDS"; wv.bands_direction = "Y"
    wv.inputs["Scale"].default_value = 380.0; wv.inputs["Distortion"].default_value = 5.0
    wv.inputs["Detail"].default_value = 2.0
    nt.links.new(tc.outputs["Object"], wv.inputs["Vector"])
    oi = _n(nt, "ShaderNodeObjectInfo")
    hum = _n(nt, "ShaderNodeTexNoise", **{"Scale": 1.0, "Detail": 0.0})
    tv = time_value(nt)
    comb = _n(nt, "ShaderNodeCombineXYZ")
    mt = _n(nt, "ShaderNodeMath"); mt.operation = "MULTIPLY"; mt.inputs[1].default_value = 3.0
    nt.links.new(tv.outputs[0], mt.inputs[0])
    nt.links.new(mt.outputs[0], comb.inputs["X"]); nt.links.new(oi.outputs["Random"], comb.inputs["Y"])
    nt.links.new(comb.outputs[0], hum.inputs["Vector"])
    ramp = _n(nt, "ShaderNodeMapRange"); ramp.inputs["From Min"].default_value = 0.25
    ramp.inputs["From Max"].default_value = 1.0
    ramp.inputs["To Min"].default_value = 0.15
    nt.links.new(wv.outputs["Fac"], ramp.inputs["Value"])
    mul = _n(nt, "ShaderNodeMath"); mul.operation = "MULTIPLY"
    nt.links.new(ramp.outputs[0], mul.inputs[0]); nt.links.new(hum.outputs["Fac"], mul.inputs[1])
    gain = nt.nodes.new("ShaderNodeValue"); gain.name = "glow_gain"; gain.outputs[0].default_value = 1.0
    mul2 = _n(nt, "ShaderNodeMath"); mul2.operation = "MULTIPLY"
    nt.links.new(mul.outputs[0], mul2.inputs[0]); nt.links.new(gain.outputs[0], mul2.inputs[1])
    mul3 = _n(nt, "ShaderNodeMath"); mul3.operation = "MULTIPLY"; mul3.inputs[1].default_value = strength
    nt.links.new(mul2.outputs[0], mul3.inputs[0])
    # glow from within: strongest where we look through the body, fading to the dark rim (volume read)
    lw = _n(nt, "ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.5
    core = _n(nt, "ShaderNodeMath"); core.operation = "SUBTRACT"; core.inputs[0].default_value = 1.0
    nt.links.new(lw.outputs["Facing"], core.inputs[1])
    core2 = _n(nt, "ShaderNodeMath"); core2.operation = "POWER"; core2.inputs[1].default_value = 1.8
    nt.links.new(core.outputs[0], core2.inputs[0])
    mul4 = _n(nt, "ShaderNodeMath"); mul4.operation = "MULTIPLY"
    nt.links.new(mul3.outputs[0], mul4.inputs[0]); nt.links.new(core2.outputs[0], mul4.inputs[1])
    p.inputs["Emission Color"].default_value = (*glow, 1)
    nt.links.new(mul4.outputs[0], p.inputs["Emission Strength"])
    if fog:
        fog_wrap(m, **fog)
    return m


def mito_mesh(name, length=0.03, width=0.011, seed=0, bend=0.15, lumps=0.06):
    """Elongated, slightly bent and lumpy mitochondrion (local long axis = Y)."""
    me = blob_mesh(name, radius=1.0, sub=4, seed=seed, amp=lumps, freq=1.3, squash=(width / 2, length / 2, width / 2 * 0.9))
    rng = random.Random(seed)
    b = rng.uniform(-bend, bend)
    for v in me.vertices:
        y = v.co.y / (length / 2)
        v.co.x += b * width * (1 - y * y)
    me.update()
    return me


def cristae_mesh(name, length=0.03, width=0.011, n=11, seed=0, bend_seed=None, bend=0.0, rfac=0.75):
    """Inner-membrane folds (lamellar cristae): smooth, gently undulating shelves across the long
    axis (local Y), alternately rooted on either side wall and reaching ~75 % across. Solidify it."""
    import bmesh as _bm
    rng = random.Random(seed)
    bm = _bm.new()
    for i in range(n):
        y0 = (-0.40 + 0.80 * (i + 0.5) / n) * length + rng.uniform(-0.08, 0.08) * length / n
        rr = width / 2 * rfac * math.sqrt(max(0.05, 1 - (y0 / (length / 2)) ** 2))
        side = 1 if i % 2 else -1
        g = _bm.ops.create_grid(bm, x_segments=10, y_segments=10, size=1.0)
        ph = rng.uniform(0, 6.28)
        tilt = math.tan(math.radians(rng.uniform(-6.0, 6.0)))      # near-parallel transverse plates
        for v in g["verts"]:
            u, w = v.co.x, v.co.y                    # [-1,1]^2 -> disc
            dx = u * math.sqrt(max(0.0, 1 - w * w / 2)); dz = w * math.sqrt(max(0.0, 1 - u * u / 2))
            x = side * (rr - (dx + 1) * 0.5 * rr * 1.5)
            z = dz * rr * 0.92
            yy = y0 + 0.0003 * math.sin(z / rr * 3.0 + ph) + 0.0002 * math.sin(x / rr * 4.0 + ph * 2) + z * tilt
            v.co = Vector((x, yy, z))
    if bend_seed is not None:                      # follow the envelope's bend (same rng draw)
        b = random.Random(bend_seed).uniform(-bend, bend)
        for v in bm.verts:
            yn = v.co.y / (length / 2)
            v.co.x += b * width * (1 - yn * yn)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me); bm.free()
    for p in me.polygons:
        p.use_smooth = True
    return me


def mat_mito_envelope():
    """Translucent double membrane: amber SSS film, more opaque at grazing angles (membrane rim),
    see-through in the middle so the 3D cristae read."""
    m, nt, p = mat_wet_tissue("MitoEnvelope", base=(0.55, 0.26, 0.09), sss_radius=(1.0, 0.55, 0.25), sss_scale=0.003,
                              rough=0.38, coat=0.0, coat_rough=0.1)
    lw = _n(nt, "ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.35
    al = _n(nt, "ShaderNodeMapRange"); al.inputs["To Min"].default_value = 0.35; al.inputs["To Max"].default_value = 0.55
    nt.links.new(lw.outputs["Facing"], al.inputs["Value"])
    nt.links.new(al.outputs[0], p.inputs["Alpha"])
    tc = _n(nt, "ShaderNodeTexCoord")
    nz = _n(nt, "ShaderNodeTexNoise", **{"Scale": 260.0, "Detail": 2.0})
    nt.links.new(tc.outputs["Object"], nz.inputs["Vector"])
    _bump_chain(nt, p, [(nz.outputs["Fac"], 0.08)], distance=0.0008)
    fog_wrap(m)
    return m


def mat_cristae_sss(wave=None):
    """Cristae folds: warm amber SSS with a faint, slowly humming inner glow (no stripes).
    wave = dict(t0, speed, origin (Vector), axis (Vector), width, gain): an amber energy wave
    travelling along `axis` through the mitochondria (world space)."""
    m, nt, p = mat_wet_tissue("CristaeSSS", base=(0.42, 0.17, 0.05), sss_radius=(1.0, 0.5, 0.2), sss_scale=0.002,
                              rough=0.45, coat=0.25, coat_rough=0.25)
    tv = time_value(nt)
    oi = _n(nt, "ShaderNodeObjectInfo")
    hum = _n(nt, "ShaderNodeTexNoise", **{"Scale": 1.0, "Detail": 1.0})
    cb = _n(nt, "ShaderNodeCombineXYZ")
    mt = _n(nt, "ShaderNodeMath"); mt.operation = "MULTIPLY"; mt.inputs[1].default_value = 2.0
    nt.links.new(tv.outputs[0], mt.inputs[0]); nt.links.new(mt.outputs[0], cb.inputs["X"])
    nt.links.new(oi.outputs["Random"], cb.inputs["Y"])
    nt.links.new(cb.outputs[0], hum.inputs["Vector"])
    st = _n(nt, "ShaderNodeMapRange"); st.inputs["To Min"].default_value = 0.12; st.inputs["To Max"].default_value = 0.45
    nt.links.new(hum.outputs["Fac"], st.inputs["Value"])
    p.inputs["Emission Color"].default_value = (1.0, 0.42, 0.1, 1)
    em = st.outputs[0]
    if wave:
        geo = _n(nt, "ShaderNodeNewGeometry")
        rel = _n(nt, "ShaderNodeVectorMath"); rel.operation = "SUBTRACT"
        nt.links.new(geo.outputs["Position"], rel.inputs[0]); rel.inputs[1].default_value = tuple(wave["origin"])
        dp = _n(nt, "ShaderNodeVectorMath"); dp.operation = "DOT_PRODUCT"
        nt.links.new(rel.outputs[0], dp.inputs[0]); dp.inputs[1].default_value = tuple(wave["axis"])
        fr = _n(nt, "ShaderNodeMath"); fr.operation = "MULTIPLY_ADD"
        fr.inputs[1].default_value = wave["speed"]; fr.inputs[2].default_value = -wave["speed"] * wave["t0"]
        nt.links.new(tv.outputs[0], fr.inputs[0])
        dd = _n(nt, "ShaderNodeMath"); dd.operation = "SUBTRACT"
        nt.links.new(dp.outputs["Value"], dd.inputs[0]); nt.links.new(fr.outputs[0], dd.inputs[1])
        q = _n(nt, "ShaderNodeMath"); q.operation = "DIVIDE"; q.inputs[1].default_value = wave["width"]
        nt.links.new(dd.outputs[0], q.inputs[0])
        q2 = _n(nt, "ShaderNodeMath"); q2.operation = "MULTIPLY"; nt.links.new(q.outputs[0], q2.inputs[0]); nt.links.new(q.outputs[0], q2.inputs[1])
        q3 = _n(nt, "ShaderNodeMath"); q3.operation = "MULTIPLY"; q3.inputs[1].default_value = -1.0; nt.links.new(q2.outputs[0], q3.inputs[0])
        g = _n(nt, "ShaderNodeMath"); g.operation = "EXPONENT"; nt.links.new(q3.outputs[0], g.inputs[0])
        g2 = _n(nt, "ShaderNodeMath"); g2.operation = "MULTIPLY_ADD"; g2.inputs[1].default_value = wave["gain"]
        g2.inputs[2].default_value = 1.0; nt.links.new(g.outputs[0], g2.inputs[0])
        e2 = _n(nt, "ShaderNodeMath"); e2.operation = "MULTIPLY"
        nt.links.new(em, e2.inputs[0]); nt.links.new(g2.outputs[0], e2.inputs[1])
        em = e2.outputs[0]
    nt.links.new(em, p.inputs["Emission Strength"])
    fog_wrap(m)
    return m


_MITO_CACHE = {}


def mito_assembly(name, loc, rot, variant=0, length=0.03, width=0.011, parent=None, lumps=0.02, m_cr=None):
    """A mitochondrion = translucent envelope + solidified 3-D cristae that follow the envelope's
    bend, sharing meshes per (variant, size)."""
    key = (variant, round(length, 4), round(width, 4), m_cr.name if m_cr else "")
    if key not in _MITO_CACHE:
        tag = f"{variant}_{int(length * 1e4)}_{int(width * 1e4)}"
        env = mito_mesh(f"mitoEnv{tag}", length=length, width=width, seed=500 + variant, bend=0.12, lumps=lumps)
        env.materials.append(_MITO_CACHE.get("m_env") or _MITO_CACHE.setdefault("m_env", mat_mito_envelope()))
        cr = cristae_mesh(f"mitoCr{tag}", length=length, width=width, n=max(5, int(length / 0.0019)), seed=variant,
                          bend_seed=500 + variant, bend=0.12, rfac=0.75)
        import bmesh as _bm
        bm = _bm.new(); bm.from_mesh(cr)
        _bm.ops.solidify(bm, geom=bm.faces[:], thickness=min(0.00045, width * 0.06))
        bm.to_mesh(cr); bm.free()
        cr.materials.append(m_cr or _MITO_CACHE.get("m_cr") or _MITO_CACHE.setdefault("m_cr", mat_cristae_sss()))
        _MITO_CACHE[key] = (env, cr)
    env, cr = _MITO_CACHE[key]
    o = obj_from_mesh(name, env)
    if parent is not None:
        o.parent = parent
    o.location = loc
    o.rotation_euler = rot
    c = obj_from_mesh(name + "_cr", cr)
    c.parent = o
    return o


def mat_web(name="Web", alpha_max=0.35, stretch=(40, 2.5, 40), tint=(0.86, 0.8, 0.74)):
    """Wispy connective-tissue film (endomysium / perineurium): fibrous alpha, soft wet sheen."""
    m, nt, p = C.new_mat(name)
    p.inputs["Base Color"].default_value = (*tint, 1)
    p.inputs["Roughness"].default_value = 0.35
    p.inputs["Sheen Weight"].default_value = 0.4
    tc = _n(nt, "ShaderNodeTexCoord")
    mp = _n(nt, "ShaderNodeMapping"); mp.inputs["Scale"].default_value = stretch
    nt.links.new(tc.outputs["Object"], mp.inputs["Vector"])
    n1 = _n(nt, "ShaderNodeTexNoise", **{"Scale": 1.0, "Detail": 6.0, "Roughness": 0.65, "Distortion": 0.6})
    nt.links.new(mp.outputs[0], n1.inputs["Vector"])
    n2 = _n(nt, "ShaderNodeTexNoise", **{"Scale": 3.0, "Detail": 2.0})
    nt.links.new(tc.outputs["Object"], n2.inputs["Vector"])
    a = _n(nt, "ShaderNodeMapRange"); a.interpolation_type = "SMOOTHSTEP"
    a.inputs["From Min"].default_value = 0.55; a.inputs["From Max"].default_value = 0.75
    a.inputs["To Max"].default_value = alpha_max
    nt.links.new(n1.outputs["Fac"], a.inputs["Value"])
    a2 = _n(nt, "ShaderNodeMath"); a2.operation = "MULTIPLY"
    nt.links.new(a.outputs[0], a2.inputs[0]); nt.links.new(n2.outputs["Fac"], a2.inputs[1])
    a3 = _n(nt, "ShaderNodeMath"); a3.operation = "MULTIPLY"; a3.inputs[1].default_value = 1.8
    nt.links.new(a2.outputs[0], a3.inputs[0])
    nt.links.new(a3.outputs[0], p.inputs["Alpha"])
    fog_wrap(m)
    return m


# --------------------------------------------------------------------------- geometry-nodes contraction


class _G:
    """Tiny expression helper for building geometry-node math graphs."""

    def __init__(self, tree):
        self.t = tree
        self.n = tree.nodes
        self.l = tree.links

    def _in(self, node, idx, v):
        if hasattr(v, "is_output") or hasattr(v, "links"):
            self.l.new(v, node.inputs[idx])
        else:
            node.inputs[idx].default_value = v

    def m(self, op, a, b=0.0, c=None):
        nd = self.n.new("ShaderNodeMath"); nd.operation = op
        self._in(nd, 0, a); self._in(nd, 1, b)
        if c is not None:
            self._in(nd, 2, c)
        return nd.outputs[0]

    def v(self, op, a, b=None, scale=None):
        nd = self.n.new("ShaderNodeVectorMath"); nd.operation = op
        self._in(nd, 0, a)
        if b is not None:
            self._in(nd, 1, b)
        if scale is not None:
            self._in(nd, 3, scale)
        return nd.outputs[0] if op not in ("LENGTH", "DOT_PRODUCT", "DISTANCE") else nd.outputs[1]

    def xyz(self, x, y, z):
        nd = self.n.new("ShaderNodeCombineXYZ")
        self._in(nd, 0, x); self._in(nd, 1, y); self._in(nd, 2, z)
        return nd.outputs[0]

    def sep(self, vec):
        nd = self.n.new("ShaderNodeSeparateXYZ"); self.l.new(vec, nd.inputs[0])
        return nd.outputs[0], nd.outputs[1], nd.outputs[2]


def gn_contraction(name="S7_Contract"):
    """Geometry nodes: a muscle-fibre twitch spreading from the neuromuscular junction (local y = yj)
    in both directions along local Y. The fibre thickens (along normals) and shortens toward the
    junction; stores 'rest' (undeformed position, so striations ride with the tissue and visibly
    bunch up) and 'contract' (0..1) for the shader. Inputs: yj, t0 (s), amp, speed, width."""
    g = bpy.data.node_groups.get(name)
    if g:
        return g
    g = bpy.data.node_groups.new(name, "GeometryNodeTree")
    g.is_modifier = True
    it = g.interface
    it.new_socket("Geometry", in_out="INPUT", socket_type="NodeSocketGeometry")
    it.new_socket("Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
    for nm_, dv in (("yj", 0.0), ("t0", 0.0), ("amp", 1.0), ("speed", 3.5), ("width", 0.25)):
        s = it.new_socket(nm_, in_out="INPUT", socket_type="NodeSocketFloat"); s.default_value = dv
    G = _G(g)
    gi = g.nodes.new("NodeGroupInput"); go = g.nodes.new("NodeGroupOutput")
    yj, t0, amp, spd, wid = gi.outputs[1], gi.outputs[2], gi.outputs[3], gi.outputs[4], gi.outputs[5]
    pos = g.nodes.new("GeometryNodeInputPosition").outputs[0]
    nrm = g.nodes.new("GeometryNodeInputNormal").outputs[0]
    st = g.nodes.new("GeometryNodeInputSceneTime").outputs["Seconds"]
    px, py, pz = G.sep(pos)
    s = G.m("SUBTRACT", py, yj)
    a_s = G.m("ABSOLUTE", s)
    tau = G.m("MAXIMUM", G.m("SUBTRACT", st, t0), 0.0)
    # envelope: fast rise (50 ms), relax (~0.7 s)
    env = G.m("MULTIPLY", G.m("EXPONENT", G.m("DIVIDE", tau, -0.7)),
              G.m("SUBTRACT", 1.0, G.m("EXPONENT", G.m("DIVIDE", tau, -0.05))))
    front = G.m("MULTIPLY", spd, tau)
    q = G.m("DIVIDE", G.m("SUBTRACT", front, a_s), wid)
    passed = G.m("MULTIPLY_ADD", G.m("TANH", G.m("MULTIPLY", q, 1.5)), 0.5, 0.5)
    head = G.m("EXPONENT", G.m("MULTIPLY", G.m("MULTIPLY", q, q), -1.0))
    k = G.m("MULTIPLY", G.m("MULTIPLY", env, amp), G.m("MULTIPLY_ADD", passed, 0.4, G.m("MULTIPLY", head, 0.6)))
    # offsets
    radial = G.v("SCALE", nrm, scale=G.m("MULTIPLY", k, 0.03))
    u = G.m("MULTIPLY", G.m("MULTIPLY", G.m("SIGN", s), -0.06),
            G.m("MULTIPLY", G.m("MULTIPLY", env, amp), G.m("MINIMUM", a_s, front)))
    off = G.v("ADD", radial, G.xyz(0.0, u, 0.0))
    st1 = g.nodes.new("GeometryNodeStoreNamedAttribute"); st1.data_type = "FLOAT_VECTOR"; st1.domain = "POINT"
    st1.inputs["Name"].default_value = "rest"
    g.links.new(gi.outputs[0], st1.inputs["Geometry"]); g.links.new(pos, st1.inputs["Value"])
    st2 = g.nodes.new("GeometryNodeStoreNamedAttribute"); st2.data_type = "FLOAT"; st2.domain = "POINT"
    st2.inputs["Name"].default_value = "contract"
    g.links.new(st1.outputs[0], st2.inputs["Geometry"]); g.links.new(k, st2.inputs["Value"])
    sp = g.nodes.new("GeometryNodeSetPosition")
    g.links.new(st2.outputs[0], sp.inputs["Geometry"]); g.links.new(off, sp.inputs["Offset"])
    g.links.new(sp.outputs[0], go.inputs[0])
    return g


def add_contraction(obj, yj, t0, amp=1.0, speed=3.5, width=0.25):
    md = obj.modifiers.new("contract", "NODES")
    md.node_group = gn_contraction()
    ids = {it.name: it.identifier for it in md.node_group.interface.items_tree if getattr(it, "in_out", "") == "INPUT"}
    for k_, v in (("yj", yj), ("t0", t0), ("amp", amp), ("speed", speed), ("width", width)):
        getattr(md.properties.inputs, ids[k_]).value = v
    return md


def store_rest(obj):
    """For static meshes using the fibre material: 'rest' = position (no GN cost at render)."""
    me = obj.data
    at = me.attributes.get("rest") or me.attributes.new("rest", "FLOAT_VECTOR", "POINT")
    co = [0.0] * (len(me.vertices) * 3)
    me.vertices.foreach_get("co", co)
    at.data.foreach_set("vector", co)


def mat_muscle(name="Muscle", fog=None, sarcomere=0.04, band_contrast=0.22, zline=0.0, sss_scale=0.04, sheen=0.35,
               coat=0.5):
    """Skeletal muscle fibre (sarcolemma seen from outside): deep red SSS body, A/I striation bands
    (period = sarcomere length, read from the 'rest' attribute so they bunch on contraction),
    longitudinal myofibril grain, wet glossy coat, warm glow where contracting."""
    m, nt, p = mat_wet_tissue(name, base=(0.30, 0.035, 0.03), sss_radius=(1.0, 0.3, 0.2), sss_scale=sss_scale,
                              rough=0.55, coat=coat, coat_rough=0.2)
    at = _n(nt, "ShaderNodeAttribute"); at.attribute_name = "rest"
    ac = _n(nt, "ShaderNodeAttribute"); ac.attribute_name = "contract"
    sep = _n(nt, "ShaderNodeSeparateXYZ"); nt.links.new(at.outputs["Vector"], sep.inputs[0])
    # striation: bands along local Y with slight waviness in X/Z
    wn = _n(nt, "ShaderNodeTexNoise", **{"Scale": 9.0, "Detail": 2.0})
    nt.links.new(at.outputs["Vector"], wn.inputs["Vector"])
    wobble = _n(nt, "ShaderNodeMath"); wobble.operation = "MULTIPLY_ADD"
    wobble.inputs[1].default_value = 0.02; nt.links.new(wn.outputs["Fac"], wobble.inputs[0])
    nt.links.new(sep.outputs["Y"], wobble.inputs[2])
    ph = _n(nt, "ShaderNodeMath"); ph.operation = "MULTIPLY"; ph.inputs[1].default_value = 2 * math.pi / sarcomere
    nt.links.new(wobble.outputs[0], ph.inputs[0])
    sn = _n(nt, "ShaderNodeMath"); sn.operation = "SINE"; nt.links.new(ph.outputs[0], sn.inputs[0])
    band = _n(nt, "ShaderNodeMapRange"); band.interpolation_type = "SMOOTHSTEP"
    band.inputs["From Min"].default_value = -0.9; band.inputs["From Max"].default_value = 0.9
    band.inputs["To Min"].default_value = 0.25; band.inputs["To Max"].default_value = 0.75
    nt.links.new(sn.outputs[0], band.inputs["Value"])
    # myofibril grain: noise stretched along Y
    mp = _n(nt, "ShaderNodeMapping"); mp.inputs["Scale"].default_value = (90.0, 2.0, 90.0)
    nt.links.new(at.outputs["Vector"], mp.inputs["Vector"])
    gn_ = _n(nt, "ShaderNodeTexNoise", **{"Scale": 1.0, "Detail": 4.0})
    nt.links.new(mp.outputs[0], gn_.inputs["Vector"])
    big = _n(nt, "ShaderNodeTexNoise", **{"Scale": 3.0, "Detail": 3.0})
    nt.links.new(at.outputs["Vector"], big.inputs["Vector"])
    fz = _n(nt, "ShaderNodeTexNoise", **{"Scale": 900.0, "Detail": 2.0})
    nt.links.new(at.outputs["Vector"], fz.inputs["Vector"])
    b = _bump_chain(nt, p, [(band.outputs[0], 0.07), (gn_.outputs["Fac"], 0.12), (big.outputs["Fac"], 0.25),
                            (fz.outputs["Fac"], 0.08)], distance=0.004)
    # glycocalyx: a soft fuzz sheen over the wet membrane
    p.inputs["Sheen Weight"].default_value = sheen
    p.inputs["Sheen Roughness"].default_value = 0.35
    p.inputs["Sheen Tint"].default_value = (1.0, 0.7, 0.6, 1)
    nt.links.new(b.outputs[0], p.inputs["Coat Normal"])
    # colour: dark A-bands / lighter I-bands, per-fibre variation
    oi = _n(nt, "ShaderNodeObjectInfo")
    cr = _n(nt, "ShaderNodeValToRGB")
    cr.color_ramp.elements[0].color = (0.17, 0.018, 0.02, 1)
    cr.color_ramp.elements[1].color = (0.38, 0.06, 0.045, 1)
    mx = _n(nt, "ShaderNodeMath"); mx.operation = "MULTIPLY_ADD"; mx.inputs[1].default_value = band_contrast
    nt.links.new(band.outputs[0], mx.inputs[0])
    m2 = _n(nt, "ShaderNodeMath"); m2.operation = "MULTIPLY"; m2.inputs[1].default_value = 0.3
    nt.links.new(oi.outputs["Random"], m2.inputs[0]); nt.links.new(m2.outputs[0], mx.inputs[2])
    nt.links.new(mx.outputs[0], cr.inputs[0])
    col_out = cr.outputs[0]
    if zline:
        # dark Z-lines: sharp peaks of cos(phase) (phase 0 = Z-line)
        cz = _n(nt, "ShaderNodeMath"); cz.operation = "COSINE"; nt.links.new(ph.outputs[0], cz.inputs[0])
        cz2 = _n(nt, "ShaderNodeMath"); cz2.operation = "MULTIPLY_ADD"; cz2.inputs[1].default_value = 0.5
        cz2.inputs[2].default_value = 0.5; nt.links.new(cz.outputs[0], cz2.inputs[0])
        cz3 = _n(nt, "ShaderNodeMath"); cz3.operation = "POWER"; cz3.inputs[1].default_value = 30.0
        nt.links.new(cz2.outputs[0], cz3.inputs[0])
        cz4 = _n(nt, "ShaderNodeMath"); cz4.operation = "MULTIPLY_ADD"; cz4.inputs[1].default_value = -zline
        cz4.inputs[2].default_value = 1.0; nt.links.new(cz3.outputs[0], cz4.inputs[0])
        zm = _n(nt, "ShaderNodeMix"); zm.data_type = "RGBA"; zm.blend_type = "MULTIPLY"; zm.inputs[0].default_value = 1.0
        nt.links.new(col_out, zm.inputs[6])
        zc = _n(nt, "ShaderNodeCombineColor")
        for s_ in ("Red", "Green", "Blue"):
            nt.links.new(cz4.outputs[0], zc.inputs[s_])
        nt.links.new(zc.outputs[0], zm.inputs[7])
        col_out = zm.outputs[2]
    nt.links.new(col_out, p.inputs["Base Color"])
    # contraction glow (warm amber, inner energy)
    ce = _n(nt, "ShaderNodeMath"); ce.operation = "MULTIPLY"; ce.inputs[1].default_value = 0.3
    nt.links.new(ac.outputs["Fac"], ce.inputs[0])
    p.inputs["Emission Color"].default_value = (1.0, 0.32, 0.08, 1)
    ce2 = _n(nt, "ShaderNodeMath"); ce2.operation = "MULTIPLY"
    bsoft = _n(nt, "ShaderNodeMapRange"); bsoft.inputs["To Min"].default_value = 0.75
    nt.links.new(band.outputs[0], bsoft.inputs["Value"])
    nt.links.new(ce.outputs[0], ce2.inputs[0]); nt.links.new(bsoft.outputs[0], ce2.inputs[1])
    nt.links.new(ce2.outputs[0], p.inputs["Emission Strength"])
    if fog:
        fog_wrap(m, **fog)
    return m


def fibre_mesh(name, radius=0.22, y0=-3.0, y1=6.0, nu=40, nv=360, seed=0, poly=0.06, waviness=0.03):
    """Muscle fibre: long, slightly polygonal (packed) cylinder with gentle waviness, local axis Y,
    centred on the object origin."""
    rng = random.Random(seed)
    off = Vector((rng.uniform(-50, 50), rng.uniform(-50, 50), rng.uniform(-50, 50)))
    rot6 = rng.uniform(0, 6.28)
    verts, faces = [], []
    for j in range(nv + 1):
        y = y0 + (y1 - y0) * j / nv
        cx = waviness * noise.noise(Vector((y * 0.35, 0, 0)) + off)
        cz = waviness * noise.noise(Vector((0, y * 0.35, 5)) + off)
        for i in range(nu):
            a = 2 * math.pi * i / nu
            r = radius * (1 + poly * math.cos(6 * a + rot6) * 0.6 + poly * noise.noise(Vector((math.cos(a), y * 0.6, math.sin(a))) + off))
            verts.append((cx + r * math.cos(a), y, cz + r * math.sin(a)))
    for j in range(nv):
        for i in range(nu):
            a_ = j * nu + i; b_ = j * nu + (i + 1) % nu
            faces.append((a_, (j + 1) * nu + i, (j + 1) * nu + (i + 1) % nu, b_))
    # caps (never seen, but keep it closed for SSS)
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.update()
    for p in me.polygons:
        p.use_smooth = True
    return me


# --------------------------------------------------------------------------- baked mosaic textures (fast)


def mosaic_image(name, w=2048, h=4096, cells_u=22, cells_v=13, seed=1, groove=0.08, nucleus=0.32, warp=0.25):
    """Seamlessly tiling cell-mosaic texture computed with numpy (much cheaper to render than 3D
    Voronoi). R = height (grooves at cell borders + nucleus bulge), G = per-cell random, B = nucleus
    mask. Cells are cells_u across (U) and cells_v along (V)."""
    import numpy as np
    rs = np.random.RandomState(seed)
    gu, gv = cells_u, cells_v
    jit = rs.uniform(0.15, 0.85, (gv, gu, 2))
    rid = rs.uniform(0, 1, (gv, gu))
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float32)
    u = xs / w * gu
    v = ys / h * gv
    # low-frequency warp (periodic) so the mosaic is irregular
    u = u + warp * np.sin(2 * np.pi * (ys / h * 3) + 1.3) * 0.6 + warp * 0.4 * np.sin(2 * np.pi * xs / w * 5 + ys / h * 2 * np.pi * 2)
    v = v + warp * np.sin(2 * np.pi * (xs / w * 4) + 0.4) * 0.5
    iu = np.floor(u).astype(np.int32); iv = np.floor(v).astype(np.int32)
    fu = u - iu; fv = v - iv
    d1 = np.full((h, w), 9.0, np.float32); d2 = np.full((h, w), 9.0, np.float32)
    idc = np.zeros((h, w), np.float32)
    for dv in (-1, 0, 1):
        for du in (-1, 0, 1):
            cu = (iu + du) % gu; cv = (iv + dv) % gv
            px = du + jit[cv, cu, 0]; py = dv + jit[cv, cu, 1]
            d = np.sqrt((fu - px) ** 2 + (fv - py) ** 2)
            closer = d < d1
            d2 = np.where(closer, d1, np.minimum(d2, d))
            idc = np.where(closer, rid[cv, cu], idc)
            d1 = np.where(closer, d, d1)
    edge = (d2 - d1)
    g = np.clip(edge / groove, 0, 1); g = g * g * (3 - 2 * g)
    nmask = np.clip(1 - d1 / nucleus, 0, 1); nmask = nmask * nmask * (3 - 2 * nmask)
    height = 0.55 * g + 0.45 * nmask
    img = bpy.data.images.new(name, w, h, alpha=False)
    px_ = np.stack([height, idc, nmask, np.ones_like(height)], axis=-1).astype(np.float32)
    img.pixels.foreach_set(px_.ravel())
    img.colorspace_settings.name = "Non-Color"
    img.pack()
    return img


def tube_uv(me, nu, nv, u_rep=1.0, v_len=None, y0=0.0, y1=1.0):
    """UVs for tube_mesh: U around (0..u_rep), V along Y in metres / v_len."""
    uvl = me.uv_layers.new(name="UVMap")
    data = []
    for poly in me.polygons:
        for li in poly.loop_indices:
            vi = me.loops[li].vertex_index
            j, i = divmod(vi, nu)
            data.append((i, j, poly.index))
    # fix seam: faces that wrap from i=nu-1 to i=0 use i=nu
    uvs = []
    for poly in me.polygons:
        ids = [me.loops[li].vertex_index for li in poly.loop_indices]
        ii = [vi % nu for vi in ids]
        wrap = max(ii) == nu - 1 and min(ii) == 0
        for vi in ids:
            j, i = divmod(vi, nu)
            if wrap and i == 0:
                i = nu
            y = y0 + (y1 - y0) * j / nv
            uvs += [u_rep * i / nu, (y / v_len) if v_len else j / nv]
    uvl.data.foreach_set("uv", uvs)
    return uvl


def mat_endothelium_fast(name="Endothelium", tile_v=4.0, seed=1):
    """Same look as mat_endothelium but driven by a baked mosaic image + one fine noise."""
    img = mosaic_image("endo_mosaic", seed=seed)
    m, nt, p = mat_wet_tissue(name, base=(0.36, 0.05, 0.045), sss_radius=(1.0, 0.2, 0.12), sss_scale=0.06,
                              rough=0.5, coat=1.0, coat_rough=0.06)
    p.inputs["Subsurface Weight"].default_value = 0.0      # budget: wall SSS adds cost, invisible under the coat
    p.inputs["Coat Weight"].default_value = 0.22
    p.inputs["Coat Tint"].default_value = (1.0, 0.6, 0.55, 1)
    p.inputs["Specular IOR Level"].default_value = 0.2
    p.inputs["Roughness"].default_value = 0.55
    uv = _n(nt, "ShaderNodeUVMap"); uv.uv_map = "UVMap"
    tx = _n(nt, "ShaderNodeTexImage"); tx.image = img; tx.interpolation = "Linear"
    nt.links.new(uv.outputs[0], tx.inputs["Vector"])
    sep = _n(nt, "ShaderNodeSeparateColor"); nt.links.new(tx.outputs["Color"], sep.inputs[0])
    tc = _n(nt, "ShaderNodeTexCoord")
    fine = _n(nt, "ShaderNodeTexNoise", **{"Scale": 140.0, "Detail": 3.0, "Roughness": 0.6})
    nt.links.new(tc.outputs["Object"], fine.inputs["Vector"])
    hsum = _n(nt, "ShaderNodeMath"); hsum.operation = "MULTIPLY_ADD"; hsum.inputs[1].default_value = 0.12
    nt.links.new(fine.outputs["Fac"], hsum.inputs[0]); nt.links.new(sep.outputs[0], hsum.inputs[2])
    b = _n(nt, "ShaderNodeBump"); b.inputs["Strength"].default_value = 0.35; b.inputs["Distance"].default_value = 0.006
    nt.links.new(hsum.outputs[0], b.inputs["Height"])
    nt.links.new(b.outputs[0], p.inputs["Normal"])
    cr = _n(nt, "ShaderNodeValToRGB")
    cr.color_ramp.elements[0].color = (0.30, 0.05, 0.055, 1)
    cr.color_ramp.elements[1].color = (0.42, 0.08, 0.08, 1)
    nt.links.new(sep.outputs[1], cr.inputs[0])
    # darker borders: multiply by (0.55 + 0.45*height)
    br = _n(nt, "ShaderNodeMapRange"); br.inputs["To Min"].default_value = 0.6
    nt.links.new(sep.outputs[0], br.inputs["Value"])
    mb = _n(nt, "ShaderNodeMix"); mb.data_type = "RGBA"; mb.blend_type = "MULTIPLY"; mb.inputs[0].default_value = 1
    nt.links.new(cr.outputs[0], mb.inputs[6])
    cb = _n(nt, "ShaderNodeCombineColor")
    for s in ("Red", "Green", "Blue"):
        nt.links.new(br.outputs[0], cb.inputs[s])
    nt.links.new(cb.outputs[0], mb.inputs[7])
    mn = _n(nt, "ShaderNodeMix"); mn.data_type = "RGBA"
    nm = _n(nt, "ShaderNodeMath"); nm.operation = "MULTIPLY"; nm.inputs[1].default_value = 0.4
    nt.links.new(sep.outputs[2], nm.inputs[0]); nt.links.new(nm.outputs[0], mn.inputs[0])
    nt.links.new(mb.outputs[2], mn.inputs[6]); mn.inputs[7].default_value = (0.2, 0.03, 0.06, 1)
    nt.links.new(mn.outputs[2], p.inputs["Base Color"])
    rn = _n(nt, "ShaderNodeTexNoise", **{"Scale": 6.0, "Detail": 2.0})
    nt.links.new(tc.outputs["Object"], rn.inputs["Vector"])
    rr = _n(nt, "ShaderNodeMapRange"); rr.inputs["To Min"].default_value = 0.16; rr.inputs["To Max"].default_value = 0.32
    nt.links.new(rn.outputs["Fac"], rr.inputs["Value"])
    nt.links.new(rr.outputs[0], p.inputs["Coat Roughness"])
    fog_wrap(m)
    return m


def budget_denoise(prefilter="FAST", quality="BALANCED", final_res=None):
    """common.configure_render() forces OIDN prefilter ACCURATE / quality HIGH for finals, which costs
    ~11 s per 1080x1920 frame on 4 cores (a quarter of the budget). We re-apply cheaper settings at
    render_init (this file only; common.py untouched). Measured: -7 s/frame, no visible difference
    at our noise level."""
    def _h(scene, *_):
        # blue-noise sampling: removes the faint regular screen-door pattern Sobol leaves at low spp
        try:
            scene.cycles.sampling_pattern = "BLUE_NOISE"
        except Exception:
            pass
        scene.cycles.denoising_prefilter = prefilter
        scene.cycles.denoising_quality = quality
        # director-approved budget fallback: finals at reduced resolution (post upscales)
        if final_res and scene.render.resolution_percentage == 100 and scene.render.image_settings.color_depth == "16":
            scene.render.resolution_percentage = final_res
    bpy.app.handlers.render_init.append(_h)


LEAN = {"max_bounces": 2, "diffuse_bounces": 1, "glossy_bounces": 1, "transmission_bounces": 1,
        "transparent_bounces": 4, "clamp_indirect": 3.0, "fast_gi": True, "ao_bounces": 1,
        "final_spp": 6, "final_threshold": 0.0, "preview_spp": 10}


def mat_mito_outer():
    """Hero mitochondrion envelope: amber translucent double membrane, partly see-through (alpha,
    cheap) so the glowing cristae inside read clearly."""
    m, nt, p = mat_wet_tissue("MitoOuter", base=(0.6, 0.28, 0.1), sss_radius=(1.0, 0.5, 0.2), sss_scale=0.004,
                              rough=0.3, coat=0.8, coat_rough=0.08)
    p.inputs["Alpha"].default_value = 0.5
    p.inputs["Emission Color"].default_value = (1.0, 0.45, 0.12, 1)
    p.inputs["Emission Strength"].default_value = 0.12
    tc = _n(nt, "ShaderNodeTexCoord")
    nz = _n(nt, "ShaderNodeTexNoise", **{"Scale": 220.0, "Detail": 3.0})
    nt.links.new(tc.outputs["Object"], nz.inputs["Vector"])
    _bump_chain(nt, p, [(nz.outputs["Fac"], 0.1)], distance=0.0008)
    fog_wrap(m)
    return m


def mat_cristae():
    m, nt, p = mat_wet_tissue("Cristae", base=(0.55, 0.22, 0.06), sss_radius=(1, 0.5, 0.2), sss_scale=0.002,
                                rough=0.4, coat=0.3, coat_rough=0.2)
    tv = time_value(nt)
    oi = _n(nt, "ShaderNodeObjectInfo")
    hum = _n(nt, "ShaderNodeTexNoise", **{"Scale": 1.0, "Detail": 1.0})
    cb = _n(nt, "ShaderNodeCombineXYZ")
    mt = _n(nt, "ShaderNodeMath"); mt.operation = "MULTIPLY"; mt.inputs[1].default_value = 2.5
    nt.links.new(tv.outputs[0], mt.inputs[0]); nt.links.new(mt.outputs[0], cb.inputs["X"])
    nt.links.new(oi.outputs["Random"], cb.inputs["Y"])
    nt.links.new(cb.outputs[0], hum.inputs["Vector"])
    s = _n(nt, "ShaderNodeMapRange"); s.inputs["From Min"].default_value = 0.3; s.inputs["From Max"].default_value = 0.7
    s.inputs["To Min"].default_value = 0.25; s.inputs["To Max"].default_value = 0.8
    nt.links.new(hum.outputs["Fac"], s.inputs["Value"])
    p.inputs["Emission Color"].default_value = (1.0, 0.5, 0.14, 1)
    nt.links.new(s.outputs[0], p.inputs["Emission Strength"])
    fog_wrap(m)
    return m


def tubes_from_edges(obj, radius=0.0007, mat=None, res=6):
    """Turn a mesh made of edges into thin round tubes (geometry nodes mesh->curve->mesh)."""
    g = bpy.data.node_groups.get(f"S7_Tubes_{radius}")
    if g is None:
        g = bpy.data.node_groups.new(f"S7_Tubes_{radius}", "GeometryNodeTree"); g.is_modifier = True
        g.interface.new_socket("Geometry", in_out="INPUT", socket_type="NodeSocketGeometry")
        g.interface.new_socket("Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
        gi = g.nodes.new("NodeGroupInput"); go = g.nodes.new("NodeGroupOutput")
        m2c = g.nodes.new("GeometryNodeMeshToCurve")
        cc = g.nodes.new("GeometryNodeCurvePrimitiveCircle"); cc.inputs["Resolution"].default_value = res
        cc.inputs["Radius"].default_value = radius
        c2m = g.nodes.new("GeometryNodeCurveToMesh")
        g.links.new(gi.outputs[0], m2c.inputs["Mesh"]); g.links.new(m2c.outputs[0], c2m.inputs["Curve"])
        g.links.new(cc.outputs["Curve"], c2m.inputs["Profile Curve"]); g.links.new(c2m.outputs[0], go.inputs[0])
    md = obj.modifiers.new("tubes", "NODES"); md.node_group = g
    if mat is not None:
        obj.data.materials.append(mat)
    return md


def er_network(name, center, extent, n_walks=160, steps=14, step=0.006, seed=0, avoid=None, avoid_r=0.0,
               axis_xy=None, axis_r=0.0):
    """Endoplasmic-reticulum-like lace: branching random-walk tubules inside a box."""
    import bmesh as _bm
    rng = random.Random(seed)
    bm = _bm.new()
    c = Vector(center)
    for w in range(n_walks):
        p = c + Vector((rng.uniform(-1, 1) * extent[0], rng.uniform(-1, 1) * extent[1], rng.uniform(-1, 1) * extent[2]))
        d = Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-1, 1))).normalized()
        vp = bm.verts.new(p)
        for k in range(steps):
            d = (d + Vector((rng.gauss(0, 0.5), rng.gauss(0, 0.5), rng.gauss(0, 0.5)))).normalized()
            p = p + d * step
            if avoid is not None and (p - Vector(avoid)).length < avoid_r:
                break
            if axis_xy is not None and math.hypot(p.x - axis_xy[0], p.y - axis_xy[1]) < axis_r:
                break
            vn = bm.verts.new(p); bm.edges.new((vp, vn)); vp = vn
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    return obj_from_mesh(name, me)


def mat_er():
    m, nt, p = mat_wet_tissue("ER", base=(0.55, 0.72, 0.7), sss_radius=(0.8, 1, 1), sss_scale=0.002, rough=0.3,
                              coat=0.6, coat_rough=0.1)
    p.inputs["Alpha"].default_value = 0.25
    fog_wrap(m)
    return m


# --------------------------------------------------------------------------- shared fibre interior (sh09 end / sh10 start)

# Hand-off state at frame 1250 (cut sh09 -> sh10), in the interior's local frame (hero
# mitochondrion at the origin, myofibrils along local +Y, camera looking along local +X).
INTERIOR_HANDOFF = dict(
    cam_local=(-0.030, -0.0019, 0.0),       # puts the hero mito centre at ~(535, 842) px
    focus=0.0265,                            # its near envelope
    fstop=16.0,
    fog_color=(0.070, 0.035, 0.035),
    fog_dist=0.14,
    fog_power=1.1,
    exposure=0.4,
    sarcomere=0.024,
    # builder parameters both shots must use unchanged (sh09 measured fibre_r by ray-cast: 0.193)
    fibre_c=(0.0105, 0.02),
    fibre_r=0.193,
    y_half=0.45,
    # the probe's interior light (parented to the camera) and the camera's handheld noise: identical
    # in both shots so the f1250 camera matrix (incl. handheld) and lighting match exactly
    probe=dict(energy=0.12, color=(0.8, 0.92, 0.95), offset=(0.0, 0.015, 0.0), radius=0.01),
    handheld=dict(amp_loc=0.0004, amp_rot=0.0012, speed=0.5, seed=9),
    cam_euler_ref=(0.000633, -1.570741, 0.000238),    # sh09 camera Euler at f1250 (local == world axes)
)


def _ico_template(sub=1):
    import bmesh as _bm
    bm = _bm.new()
    _bm.ops.create_icosphere(bm, subdivisions=sub, radius=1.0)
    v = [tuple(x.co) for x in bm.verts]
    f = [tuple(x.index for x in face.verts) for face in bm.faces]
    bm.free()
    return v, f


def points_mesh(name, centers, radii, sub=1):
    """Many tiny spheres in one mesh via numpy + from_pydata (fast build)."""
    import numpy as np
    tv, tf = _ico_template(sub)
    tv = np.array(tv, np.float32); tf = np.array(tf, np.int64)
    c = np.asarray(centers, np.float32); r = np.asarray(radii, np.float32)
    verts = (tv[None, :, :] * r[:, None, None] + c[:, None, :]).reshape(-1, 3)
    faces = (tf[None, :, :] + (np.arange(len(c)) * len(tv))[:, None, None]).reshape(-1, 3)
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts.tolist(), [], faces.tolist())
    me.update()
    for p in me.polygons:
        p.use_smooth = True
    return me


def tubes_mesh(name, centers_xz, radii, y0, y1, seg=12):
    """Open cylinders along local Y (one quad ring per tube) via numpy."""
    import numpy as np
    a = np.linspace(0, 2 * np.pi, seg, endpoint=False)
    ca, sa = np.cos(a), np.sin(a)
    verts, faces = [], []
    for k, ((x, z), r) in enumerate(zip(centers_xz, radii)):
        base = len(verts)
        for y in (y0, y1):
            for i in range(seg):
                verts.append((x + r * ca[i], y, z + r * sa[i]))
        for i in range(seg):
            i2 = (i + 1) % seg
            faces.append((base + i, base + seg + i, base + seg + i2, base + i2))
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.update()
    for p in me.polygons:
        p.use_smooth = True
    return me


def build_fibre_interior(root_name, matrix, fibre_c=(0.0105, 0.02), fibre_r=0.18, seed=909, corridor_x=-0.004,
                         corridor_hw=0.009, y_half=0.45, n_granules=4000, cristae_wave=None, wall_x=None):
    """The inside of one skeletal-muscle fibre, built in a LOCAL frame under an empty `root_name`
    (world = matrix @ local). Local frame: hero mitochondrion at the origin, myofibrils along +Y,
    the probe looks along +X and arrives through a narrow corridor (x < corridor_x) from the
    sarcolemma. Shared by sh09 (end) and sh10 (start) so the cut matches exactly.
    Returns dict(root, objects, hero)."""
    import numpy as np
    rng = random.Random(seed)
    H = INTERIOR_HANDOFF
    root = bpy.data.objects.new(root_name, None)
    bpy.context.scene.collection.objects.link(root)
    root.matrix_world = matrix
    before = set(bpy.data.objects)
    fc = Vector((fibre_c[0], 0, fibre_c[1]))

    def inside(x, z, margin=0.0):
        return (Vector((x, 0, z)) - fc).length < fibre_r - margin

    sarc = H["sarcomere"]
    # myofibrils: packed hex lattice, translucent softly banded bundles
    m_myo = mat_muscle("Myofibril", sarcomere=sarc, band_contrast=0.7, zline=0.6, sss_scale=0.005, sheen=0.15, coat=0.0)
    for n_ in m_myo.node_tree.nodes:
        if n_.type == "VALTORGB":
            n_.color_ramp.elements[0].color = (0.30, 0.07, 0.07, 1)
            n_.color_ramp.elements[1].color = (0.58, 0.18, 0.15, 1)
    sp = 0.0195
    # lattice anchored so the origin (hero mitochondrion) sits in a natural gap between 3 myofibrils
    lat = Vector((-sp * 0.5, 0, -sp * 0.2887))
    fib_c, fib_r = [], []
    for a in range(-14, 15):
        for b in range(-14, 15):
            x = lat.x + a * sp + b * sp * 0.5
            z = lat.z + b * sp * 0.866
            if not inside(x, z, 0.012):
                continue
            if abs(z) < corridor_hw and x < corridor_x:
                continue
            if abs(z) < 0.03 and x < -0.12:
                continue                                  # clear the probe's approach path
            fib_c.append((x, z)); fib_r.append(rng.uniform(0.0064, 0.0076))
    me = tubes_mesh("myofibrils", fib_c, fib_r, -y_half, y_half)
    o = obj_from_mesh("myofibrils", me, m_myo); o.parent = root
    store_rest(o)
    # mitochondria: chains in the gaps between myofibrils, centred on the Z-lines
    m_cr = mat_cristae_sss(wave=cristae_wave)
    n = 0
    for a in range(-14, 15):
        for b in range(-14, 15):
            x = lat.x + a * sp + b * sp * 0.5 + sp * 0.5
            z = lat.z + b * sp * 0.866 + sp * 0.2887
            if not inside(x, z, 0.014):
                continue
            if abs(z) < corridor_hw + 0.006 and x < corridor_x + 0.006:
                continue
            if abs(z) > 0.05 or x > 0.045 or x < -0.08:
                continue                                  # beyond the haze
            for k in range(-3, 4):
                if rng.random() < 0.5:
                    continue
                y = k * sarc + rng.uniform(-0.0015, 0.0015)
                if abs(x) < 0.006 and abs(z) < 0.006 and abs(y) < 0.02:
                    continue                              # the hero sits here
                mito_assembly(f"mito_{n:04d}", (x, y, z), (rng.uniform(-0.15, 0.15), rng.uniform(0, 6.28), rng.uniform(-0.15, 0.15)),
                              variant=n % 5, length=0.016, width=0.005, parent=root, m_cr=m_cr)
                n += 1
    # hero mitochondrion at the origin + soft warm glow
    hero = mito_assembly("heroMito0", (0, 0, 0), (0, 0, 0), variant=10, length=0.024, width=0.007, parent=root, m_cr=m_cr)
    for i, hp in enumerate(((0.004, 0.026, 0.009), (0.005, -0.025, -0.008))):
        mito_assembly(f"heroMito{i + 1}", hp, (0.1 * i, 0.4, 0.1), variant=11 + i, length=0.02, width=0.006, parent=root, m_cr=m_cr)
    gl = C.point_light("mitoGlow", power=0.02, radius=0.003, kelvin_k=2600)
    gl.parent = root; gl.location = (0, 0, 0)
    gl.data.specular_factor = 0.0; gl.visible_camera = False; gl.visible_glossy = False
    # out-of-focus foreground mitochondria inside the end frustum (camera at cam_local, looking +X)
    cx = H["cam_local"][0]
    for k, (d, sy, sz) in enumerate(((0.018, 0.0088, 0.0049), (0.021, -0.0095, -0.005))):
        mito_assembly(f"fgMito{k}", (cx + d, sy, sz), (0.2, 0.3 * k, 0.15), variant=k, length=0.016, width=0.005,
                      parent=root, m_cr=m_cr)
    # myonuclei: inside the fibre (>= 0.012 from the sarcolemma); one soft at the end-frame edge
    m_nucl = mat_wet_tissue("Myonucleus", base=(0.20, 0.11, 0.19), sss_radius=(0.7, 0.5, 1.0), sss_scale=0.003,
                            rough=0.45, coat=0.0)[0]
    fog_wrap(m_nucl)
    nuc_pos = [(cx + 0.02, 0.006, 0.0058)]
    ang0 = math.atan2(-fc.z, -fc.x)
    for k in range(2):
        aa = ang0 + (0.5 if k else -0.6)
        rr = fibre_r - 0.016
        nuc_pos.append((fc.x + rr * math.cos(aa), (0.05 if k else -0.06), fc.z + rr * math.sin(aa)))
    for k, pz in enumerate(nuc_pos):
        nm = blob_mesh(f"myonuc{k}", radius=1.0, sub=4, seed=70 + k, amp=0.06, squash=(0.0035, 0.022, 0.0035))
        on = obj_from_mesh(f"myonucleus{k}", nm, m_nucl); on.parent = root; on.location = pz
    # sarcoplasmic reticulum lace: rings at the Z-lines around nearby myofibrils + longitudinal tubules
    import bmesh as _bm
    bm = _bm.new()
    for (x, z), r in zip(fib_c, fib_r):
        if abs(z) > 0.05 or x > 0.04 or x < -0.12 or rng.random() < 0.4:
            continue
        if abs(z) < corridor_hw + 0.012 and x < corridor_x + 0.02:
            continue
        for k in range(-4, 5):
            if rng.random() < 0.35:
                continue
            y = k * sarc + rng.uniform(-0.001, 0.001)
            if x < 0.0 and abs(y + 0.0019) < 0.02 and abs(z) < 0.03:
                continue                                  # no SR within ~2 cm of the camera path
            ring = _bm.ops.create_circle(bm, segments=14, radius=r + 0.0022)
            for v in ring["verts"]:
                v.co = Vector((x + v.co.x * rng.uniform(0.92, 1.08), y + rng.uniform(-0.0008, 0.0008), z + v.co.y * rng.uniform(0.92, 1.08)))
    sme = bpy.data.meshes.new("SR"); bm.to_mesh(sme); bm.free()
    so = obj_from_mesh("SR", sme); so.parent = root
    m_sr = mat_wet_tissue("SR", base=(0.42, 0.26, 0.25), sss_radius=(0.8, 1, 1), sss_scale=0.002, rough=0.35, coat=0.0)[0]
    for n_ in m_sr.node_tree.nodes:
        if n_.type == "BSDF_PRINCIPLED":
            n_.inputs["Alpha"].default_value = 0.3
    fog_wrap(m_sr)
    tubes_from_edges(so, radius=0.0003, mat=m_sr)
    # glycogen granules: dark, matte, many depths, only inside the fibre, clear of the corridor
    cs, rs = [], []
    while len(cs) < n_granules:
        p = (rng.uniform(fc.x - fibre_r, min(0.12, fc.x + fibre_r)), rng.uniform(-0.12, 0.12), rng.uniform(-0.12, 0.1))
        if not inside(p[0], p[2], 0.012):
            continue
        if abs(p[2]) < corridor_hw and abs(p[1]) < corridor_hw and p[0] < -0.004:
            continue
        cs.append(p); rs.append(rng.uniform(0.0002, 0.0005))
    gme = points_mesh("granules", cs, rs)
    m_gr = mat_wet_tissue("Granule", base=(0.08, 0.07, 0.07), rough=0.7, coat=0.0, sss_scale=0.0005)[0]
    fog_wrap(m_gr)
    go = obj_from_mesh("granules", gme, m_gr); go.parent = root
    objs = [o_ for o_ in bpy.data.objects if o_ not in before and o_.type in ("MESH", "LIGHT")]
    return dict(root=root, objects=objs, hero=hero, fibrils=len(fib_c), mitos=n)


# =========================================================================== sh09/sh10 interior upgrade
# (fix round, review s3-6 + director rounds 2-3). NEW functions only: nothing above is changed, so
# sh06 and the existing builders are untouched. sh09 and sh10 both call upgrade_interior_s9() right
# after build_fibre_interior(), so the f1250 cut matches by construction.
# Review fix s3-6 (final round): the shared interior (lib_s7.build_fibre_interior, also used by sh10)
# is upgraded here, in sh09 only: volumetric double-membrane mitochondria (glossy SSS outer membrane,
# inner boundary membrane, folded 3-D cristae) and soft translucent tubular T-tubules.


MITO_VOL = dict(emit=3.5, emit_small=140.0, absorb=80.0, rim=0.40)   # hero / smaller chain bodies


# lib_s7 puts heroMito1/2 (and a sliver of fgMito0) inside myofibrils (the old alpha decals glowed through the
# fibril; the volumetric bodies read as dark ghosts there). Smallest offsets (local units) that clear
# the fibrils, found by an inside-mesh test; neither body is in frame at the f1250 hand-off.
HERO_NUDGE = {"heroMito1": (0.003, 0.0, -0.0045), "heroMito2": (-0.005, 0.0, -0.002), "fgMito0": (0.002, 0.007, 0.0025),
              "fgMito1": (0.0, 0.0, -0.004)}


def upgrade_interior(inter, wave):
    """Swap materials / meshes of the interior built by lib_s7 (same objects, transforms and
    hierarchy, so the hand-off framing is unchanged). Returns the new (inner-membrane) objects."""
    import re
    m_out, m_cr = mat_mito_outer_s9(), mat_cristae_s9(wave)
    m_out_fg = mat_mito_outer_s9(0.08, "MitoOuterS9Fg")      # the out-of-focus near pair: a faint veil, never a solid blob
    m_cr_fg = m_cr.copy(); m_cr_fg.name = "CristaeS9Fg"
    for n_ in m_cr_fg.node_tree.nodes:
        if n_.type == "BSDF_PRINCIPLED":
            n_.inputs["Alpha"].default_value = 0.06                  # out of focus and near: folds all but invisible
        elif n_.type == "MAP_RANGE" and abs(n_.inputs["To Max"].default_value - 5.4) < 1e-6:
            n_.inputs["To Min"].default_value = 0.0; n_.inputs["To Max"].default_value = 0.05
    m_in = mat_mito_inner_s9(MITO_VOL["emit_small"], "MitoInnerS9")        # the chains
    m_in_hero = mat_mito_inner_s9(MITO_VOL["emit"], "MitoInnerS9Hero", rim=2.0 * MITO_VOL["rim"])
    # hero folds: darker ridges seen against the glowing matrix (inner membranes), not bright slashes
    m_cr_hero = m_cr.copy(); m_cr_hero.name = "CristaeS9Hero"
    _shelf_shading(m_cr_hero)
    for n_ in m_cr_hero.node_tree.nodes:
        if n_.type == "BSDF_PRINCIPLED":
            n_.inputs["Base Color"].default_value = (*LOOK["cr_hero"], 1)
            n_.inputs["Alpha"].default_value = 0.95
        elif n_.type == "MAP_RANGE" and abs(n_.inputs["To Max"].default_value - 5.4) < 1e-6:
            n_.inputs["To Min"].default_value = 0.3; n_.inputs["To Max"].default_value = 2.8
    new, cr_cache, in_cache = [], {}, {}
    for o in list(inter["objects"]):
        if o.type != "MESH":
            continue
        nm = o.data.name
        if nm.startswith("mitoEnv"):
            if nm not in in_cache:
                v, l_, w_ = (int(x) for x in re.match(r"mitoEnv(\d+)_(\d+)_(\d+)", nm).groups())
                hero_ = v == 10
                env = mito_bean(nm + "_s9", length=l_ / 1e4 * (HERO_SHAPE["length"] if hero_ else 1.0), width=w_ / 1e4,
                                seed=v, bend=HERO_SHAPE["bend"] if hero_ else None)
                env.materials.append(m_out)
                in_cache[nm] = (env, inner_shell(env, m_in_hero if v >= 10 else m_in, gap=0.11 if hero_ else 0.075))
            o.data = in_cache[nm][0]
            inner = in_cache[nm][1]
            if o.name in HERO_NUDGE:                 # lib places these two inside myofibrils: move into the gap
                o.location += Vector(HERO_NUDGE[o.name])
            if o.name.startswith("fgMito"):          # the out-of-focus foreground pair: deep amber like the hero
                if nm + "_fg" not in in_cache:
                    in_cache[nm + "_fg"] = inner.copy()
                    in_cache[nm + "_fg"].materials[0] = m_in_hero
                    in_cache[nm + "_fgenv"] = o.data.copy()
                    in_cache[nm + "_fgenv"].materials[0] = m_out_fg
                inner = in_cache[nm + "_fg"]
                o.data = in_cache[nm + "_fgenv"]
            c = obj_from_mesh(o.name + "_in", inner); c.parent = o
            new.append(c)
            # glowing translucent organelle: no hard shadow from the inner glow light onto the fibrils
            # (the hero itself, which holds that light, keeps its shadows: it dims its own glow)
            for x_ in (o, c):
                x_.visible_shadow = o.name == "heroMito0"
        elif nm.startswith("mitoCr"):
            if nm not in cr_cache:
                v, l_, w_ = (int(x) for x in re.match(r"mitoCr(\d+)_(\d+)_(\d+)", nm).groups())
                hero_ = v == 10
                me = cristae_folded(nm + "_s9", length=l_ / 1e4 * (HERO_SHAPE["length"] if hero_ else 1.0), width=w_ / 1e4,
                                    seed=v, K=CRISTAE_HERO if hero_ else None, bend=HERO_SHAPE["bend"] if hero_ else None)
                me.materials.append(m_cr)
                cr_cache[nm] = me
            o.data = cr_cache[nm]
            o.visible_shadow = False                 # folds never shadow the inner glow (no lit box between them)
            if o.name == "heroMito0_cr":
                o.material_slots[0].link = "OBJECT"
                o.material_slots[0].material = m_cr_hero
            if o.name.startswith("fgMito"):          # near out-of-focus pair: faint folds, never bright spots
                o.material_slots[0].link = "OBJECT"
                o.material_slots[0].material = m_cr_fg
        elif o.name == "SR":
            soft_ttubules(o)
    return new


def inner_shell(env, mat, gap=0.075):
    """Inner boundary membrane: the envelope pulled in along its normals by `gap` x its width."""
    me = env.copy(); me.name = env.name + "_in"
    w = max(v.co.x for v in env.vertices) - min(v.co.x for v in env.vertices)
    for v, v0 in zip(me.vertices, env.vertices):
        v.co = v0.co - v0.normal * gap * w
    me.materials.clear(); me.materials.append(mat)
    me.update()
    return me


# Mitochondrion shape (round 2): an asymmetric bean, never a symmetric pointed spindle.
# Local frame as lib_s7: long axis Y; the bend and the flatter flank are in the X-Z plane along Z
# (for the hero, whose rotation is zero, Z is the screen's horizontal, so the bean reads on screen).
BEAN = dict(p=3.0, bend=0.16, flat=0.92, dent=0.06, depth=0.92, taper=0.0)
_BEAN_ZMID = {}


def _bean_side(sa, t):
    """Cross-section scale of a flank: +Z full, -Z flatter with a shallow kidney dent mid-length."""
    return 1.0 if sa > 0 else BEAN["flat"] - BEAN["dent"] * (1 - t * t)


def _bean_zmid(width, bend=None):
    """(zmax + zmin) / 2 of the raw bean (bend + flat flank), so the body is centred on its axis:
    the object origin (hero glow light, TRK_mito, the f1250 framing) stays at the body centre."""
    bend = BEAN["bend"] if bend is None else bend
    if (width, bend) not in _BEAN_ZMID:
        zs = []
        for j in range(1, 200):
            t = -1 + 2 * j / 200
            r = bean_radius(t, width)
            zc = bend * width * (1 - t * t)
            zs += [zc + r, zc - r * _bean_side(-1, t)]
        _BEAN_ZMID[(width, bend)] = (max(zs) + min(zs)) / 2
    return _BEAN_ZMID[(width, bend)]


def bean_centre(t, width, bend=None):
    """Centre-line offset (z) at t = y / (L/2): a gentle banana bend, re-centred on the axis."""
    bend = BEAN["bend"] if bend is None else bend
    return bend * width * (1 - t * t) - _bean_zmid(width, bend)


def bean_radius(t, width):
    """Superellipse profile (p=3): blunt, rounded ends."""
    return width / 2 * (1 + BEAN["taper"] * t) * max(0.0, 1 - abs(t) ** BEAN["p"]) ** (1 / BEAN["p"])


def mito_bean(name, length, width, seed=0, nu=40, nv=56, bend=None):
    """Envelope: blunt-ended, slightly bent bean with one flatter flank (-Z, the concave side) and
    faint organic lumps. Same length/width as the lib mesh it replaces (framing unchanged)."""
    off = Vector((seed * 3.1, seed * 1.7, 11.0))
    q = 2.0 / BEAN["p"]
    verts, faces = [], []
    verts.append((0.0, -length / 2, bean_centre(-1, width, bend)))
    for j in range(1, nv):
        ph = math.pi * j / nv
        c_ = -math.cos(ph)
        t = math.copysign(abs(c_) ** q, c_)
        r = width / 2 * (1 + BEAN["taper"] * t) * math.sin(ph) ** q      # one end a little fuller
        zc = bean_centre(t, width, bend)
        for i in range(nu):
            a = 2 * math.pi * i / nu
            ca, sa = math.cos(a), math.sin(a)
            lump = 1 + 0.035 * noise.noise(Vector((ca * 1.3, t * 1.6, sa * 1.3)) + off)
            x = r * BEAN["depth"] * ca * lump
            z = zc + r * sa * _bean_side(sa, t) * lump                     # kidney flank
            verts.append((x, t * length / 2, z))
    verts.append((0.0, length / 2, bean_centre(1, width, bend)))
    for i in range(nu):
        faces.append((0, 1 + (i + 1) % nu, 1 + i))
    for j in range(nv - 2):
        b0, b1 = 1 + j * nu, 1 + (j + 1) * nu
        for i in range(nu):
            faces.append((b0 + i, b0 + (i + 1) % nu, b1 + (i + 1) % nu, b1 + i))
    top = len(verts) - 1; bl = 1 + (nv - 2) * nu
    for i in range(nu):
        faces.append((bl + i, bl + (i + 1) % nu, top))
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])        # outward, for the inner shell offset
    bm.to_mesh(me); bm.free()
    me.update()
    for p_ in me.polygons:
        p_.use_smooth = True
    return me


# director round 6: colour looks (all mitochondria). "amber" = rounds 2-5 (reads as baked bread);
# A salmon/red-orange glassy, B berry membrane over a warm interior, C teal glass over amber (the
# film's teal/amber micro-world palette). S7_LOOK env var selects one for look-dev only.
MITO_LOOKS = {
    "amber": dict(outer=(0.19, 0.064, 0.009), rim=(1.0, 0.34, 0.05), inner=(0.70, 0.30, 0.06), irim=(1.0, 0.36, 0.05),
                  matrix=(1.0, 0.39, 0.05), absorb=(0.78, 0.32, 0.05), cr=(0.44, 0.17, 0.03), cr_em=(1.0, 0.40, 0.04),
                  cr_hero=(0.30, 0.10, 0.02), face=0.55, mscale=1.0, rim_k=1.0),
    "A": dict(outer=(0.40, 0.12, 0.075), rim=(1.0, 0.40, 0.28), inner=(0.85, 0.42, 0.32), irim=(1.0, 0.48, 0.36),
              matrix=(0.85, 0.26, 0.15), absorb=(0.85, 0.40, 0.30), cr=(0.80, 0.42, 0.30), cr_em=(1.0, 0.55, 0.40),
              cr_hero=(0.78, 0.40, 0.29), face=0.32, mscale=0.7, rim_k=1.3),
    "B": dict(outer=(0.42, 0.06, 0.20), rim=(1.0, 0.28, 0.62), inner=(0.70, 0.30, 0.10), irim=(1.0, 0.40, 0.25),
              matrix=(1.0, 0.39, 0.05), absorb=(0.80, 0.30, 0.25), cr=(0.55, 0.22, 0.05), cr_em=(1.0, 0.45, 0.08),
              cr_hero=(0.50, 0.20, 0.05), face=0.38, mscale=1.0, rim_k=1.2),
    "C": dict(outer=(0.05, 0.20, 0.22), rim=(0.35, 0.90, 1.0), inner=(0.60, 0.40, 0.12), irim=(1.0, 0.55, 0.15),
              matrix=(1.0, 0.45, 0.06), absorb=(0.55, 0.60, 0.55), cr=(0.55, 0.25, 0.05), cr_em=(1.0, 0.50, 0.08),
              cr_hero=(0.50, 0.22, 0.05), face=0.30, mscale=1.0, rim_k=1.1),
}
MITO_LOOK = os.environ.get("S7_LOOK", "C")         # director round 6 pick: C, teal glass over amber
LOOK = MITO_LOOKS[MITO_LOOK]
HERO_SHAPE = dict(length=0.82, bend=0.09)    # round 5: the hero ~2.8:1, gentler bend (env + cristae)
CRISTAE_HERO = dict(rad=0.88, root_depth=0.45, yspan=0.37, amp=0.012, cup=0.008, tilt=2.0, bow=0.012, reach=(0.40, 0.85),
                    reach_end=0.42, th=0.00042, pack=2.15, wave=0.03, periods=(1.0, 2.0), fork=0.03, fork_p=0.4)
# round 6: folded membranes, not slash marks - rounded tongues rooted on the inner membrane, alternating
# sides, sinuous along their length (1-2 periods), irregular reach (40-85 %) and spacing, some bent
# or Y-forked at the tip, thick enough to shade; every neighbour pair keeps disjoint y-extents  # folds rooted on the inner membrane, ~9 alternating
CRISTAE = dict(rad=0.64, yspan=0.24, amp=0.016, cup=0.012, tilt=3.0, bow=0.008, reach=(0.34, 0.68), reach_end=0.42)


def cristae_folded(name, length, width, seed=0, K=None, bend=None):
    """Cristae = INNER folds seen through the membranes: rounded tongues rooted alternately on the
    two side walls (+Z / -Z) inside 0.70 x the local half-width, each reaching at most ~60 % across
    (the outermost ones <= 0.48), so no fold ever spans the body as a ring or collar. Folds
    undulate and tilt in depth only (X), and the y-extents of neighbours are disjoint by
    construction, so two cristae can never cross."""
    K = K or CRISTAE
    rng = random.Random(1000 + seed)
    th = K.get("th") or min(0.00042, width * 0.06)
    amp, cup = K["amp"] * width, K["cup"] * width
    R0 = K["rad"] * width / 2
    bow = K["bow"] * width                                       # gentle curvature in the screen plane
    wav = K.get("wave", 0.0) * width                             # sinuous along the fold's length
    fk = K.get("fork", 0.0) * width                              # Y-fork opening at some tips
    ext = (1.45 * amp + cup + bow + math.tan(math.radians(K["tilt"])) * R0 * BEAN["depth"] + th
           + wav + fk)                                           # half y-extent (every term bounded)
    span = 2 * K["yspan"] * length
    gmin = 2.15 * ext                                            # neighbours' y-extents never touch
    n = max(3, int(span / (K.get("pack", 2.6) * ext)) + 1)
    w_ = [rng.uniform(0.2, 1.0) for _ in range(n - 1)]
    slack = max(0.0, span - (n - 1) * gmin)
    ys_ = [-K["yspan"] * length]
    for wk in w_:                                                # irregular gaps (random partition of the slack)
        ys_.append(ys_[-1] + gmin + slack * wk / sum(w_))
    bm = bmesh.new()
    NS, NA = 14, 12
    for i in range(n):
        y0 = ys_[i]
        t0 = y0 / (length / 2)
        te = min(0.95, (abs(y0) + ext) / (length / 2))           # narrowest point over the extent
        R = K["rad"] * bean_radius(te, width)
        zc = bean_centre(t0, width, bend)
        side = 1 if (i + seed) % 2 else -1
        Rs = R * (1.0 if side > 0 else _bean_side(-1, t0))      # the root wall (the real flank)
        reach = K["reach_end"] if i in (0, n - 1) else rng.uniform(*K["reach"])
        ph1, ph2 = rng.uniform(0, 6.28), rng.uniform(0, 6.28)
        tilt = math.tan(math.radians(rng.uniform(-K["tilt"], K["tilt"])))
        cu = rng.uniform(-1, 1) * cup
        bw = rng.uniform(-1, 1) * bow
        per = rng.uniform(*K.get("periods", (1.0, 1.0))); ph3 = rng.uniform(0, 6.28)
        fki = fk * (1 if rng.random() < K.get("fork_p", 0.0) else 0)
        pts = []
        for js in range(NS + 1):
            sfr = js / NS
            row = []
            for ja in range(NA + 1):
                a = -1 + 2 * ja / NA
                d = sfr * reach * 2 * R * (1 - 0.30 * a * a)          # distance from the root wall
                zl = side * (Rs - d)                                  # local z (from the centre line)
                Rz = R if zl > 0 else R * BEAN["flat"]
                chord = math.sqrt(max(0.0, Rz * Rz - zl * zl)) * BEAN["depth"]
                x = a * max(chord * 0.92, R * K.get("root_depth", 0.15) * (1 - sfr) ** 2, R * 0.15)  # deep root: a visible join
                yy = (y0 + amp * math.sin(x / R * 2.6 + ph1) * (0.4 + 0.6 * sfr)
                      + 0.45 * amp * math.sin(sfr * 5.0 + ph2) * abs(a) + cu * sfr * sfr + tilt * x
                      + bw * (zl / R) ** 2
                      + wav * math.sin(sfr * math.pi * per + ph3)                    # sinuous along the length
                      + fki * (1 if a >= 0 else -1) * min(1.0, abs(a) * 3) * max(0.0, (sfr - 0.62) / 0.38) ** 1.5)
                row.append((x, yy, zc + zl))
            pts.append(row)
        # a closed sac of thickness th (two layers +-th/2 in y, rim stitched; rounded by smooth shading)
        thi = th * rng.uniform(0.6, 1.0)                         # folds differ in thickness (never thicker than ext allows)
        lay = [[[bm.verts.new((x, y + sg * thi / 2 * (0.35 if js == NS or ja in (0, NA) else 1.0), z))
                 for ja, (x, y, z) in enumerate(row)] for js, row in enumerate(pts)] for sg in (1, -1)]
        for js in range(NS):
            for ja in range(NA):
                bm.faces.new((lay[0][js][ja], lay[0][js + 1][ja], lay[0][js + 1][ja + 1], lay[0][js][ja + 1]))
                bm.faces.new((lay[1][js][ja + 1], lay[1][js + 1][ja + 1], lay[1][js + 1][ja], lay[1][js][ja]))
        rim = ([(js, 0) for js in range(NS + 1)] + [(NS, ja) for ja in range(1, NA + 1)]
               + [(js, NA) for js in range(NS - 1, -1, -1)] + [(0, ja) for ja in range(NA - 1, 0, -1)])
        for k in range(len(rim)):
            (j0, a0), (j1, a1) = rim[k], rim[(k + 1) % len(rim)]
            bm.faces.new((lay[0][j0][a0], lay[0][j1][a1], lay[1][j1][a1], lay[1][j0][a0]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me); bm.free()
    for p in me.polygons:
        p.use_smooth = True
    return me


def mat_mito_outer_s9(face_alpha=None, name="MitoOuterS9"):
    """Outer mitochondrial membrane: glossy wet amber film with SSS; nearly clear face-on and dense
    at the silhouette (a membrane seen edge-on), so the body reads as a translucent volume."""
    face_alpha = LOOK["face"] if face_alpha is None else face_alpha
    m, nt, p = mat_wet_tissue(name, base=LOOK["outer"], sss_radius=(1.0, 0.55, 0.25),
                                sss_scale=0.0025, rough=0.5, coat=0.08, coat_rough=0.5)
    p.inputs["Specular IOR Level"].default_value = 0.25          # no tip glints on the near bodies
    lw = _n(nt, "ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.3
    pw = _n(nt, "ShaderNodeMath"); pw.operation = "POWER"; pw.inputs[1].default_value = 1.6
    nt.links.new(lw.outputs["Facing"], pw.inputs[0])
    al = _n(nt, "ShaderNodeMapRange"); al.inputs["To Min"].default_value = face_alpha; al.inputs["To Max"].default_value = 0.55
    nt.links.new(pw.outputs[0], al.inputs["Value"]); nt.links.new(al.outputs[0], p.inputs["Alpha"])
    tc = _n(nt, "ShaderNodeTexCoord")
    nz = _n(nt, "ShaderNodeTexNoise", **{"Scale": 420.0, "Detail": 3.0})
    nt.links.new(tc.outputs["Object"], nz.inputs["Vector"])
    _bump_chain(nt, p, [(nz.outputs["Fac"], 0.06)], distance=0.0004)
    # the matrix glow shines through the membrane where it is seen edge-on (luminous rim, not an outline)
    p.inputs["Emission Color"].default_value = (*LOOK["rim"], 1)
    em = _n(nt, "ShaderNodeMath"); em.operation = "MULTIPLY"; em.inputs[1].default_value = MITO_VOL["rim"] * LOOK["rim_k"]
    nt.links.new(pw.outputs[0], em.inputs[0]); nt.links.new(em.outputs[0], p.inputs["Emission Strength"])
    fog_wrap(m)
    return m


def mat_mito_inner_s9(emit, name, rim=0.0):
    """Inner boundary membrane: thinner, warmer, mostly clear (second rim inside the first)."""
    m, nt, p = mat_wet_tissue(name, base=LOOK["inner"], sss_radius=(1.0, 0.5, 0.2),
                                sss_scale=0.0015, rough=0.55, coat=0.05, coat_rough=0.5)
    lw = _n(nt, "ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.25
    pw = _n(nt, "ShaderNodeMath"); pw.operation = "POWER"; pw.inputs[1].default_value = 2.2
    nt.links.new(lw.outputs["Facing"], pw.inputs[0])
    al = _n(nt, "ShaderNodeMapRange"); al.inputs["To Min"].default_value = 0.05; al.inputs["To Max"].default_value = 0.8
    nt.links.new(pw.outputs[0], al.inputs["Value"]); nt.links.new(al.outputs[0], p.inputs["Alpha"])
    if rim:                                               # a faint inner-membrane line inside the outer rim
        p.inputs["Emission Color"].default_value = (*LOOK["irim"], 1)
        em = _n(nt, "ShaderNodeMath"); em.operation = "MULTIPLY"; em.inputs[1].default_value = rim
        nt.links.new(pw.outputs[0], em.inputs[0]); nt.links.new(em.outputs[0], p.inputs["Emission Strength"])
    fog_wrap(m)
    # matrix: homogeneous warm emission + absorption (analytic in Cycles, no ray marching): the glow
    # grows with the thickness looked through, so the body is brightest in its core and falls off to
    # the rims like a real translucent volume; the cristae inside shadow it
    out = [n for n in nt.nodes if n.type == "OUTPUT_MATERIAL"][0]
    ve = _n(nt, "ShaderNodeEmission"); ve.name = "matrix_emit"; ve.inputs["Color"].default_value = (*LOOK["matrix"], 1)
    ve.inputs["Strength"].default_value = emit
    va = _n(nt, "ShaderNodeVolumeAbsorption"); va.inputs["Color"].default_value = (*LOOK["absorb"], 1)
    va.inputs["Density"].default_value = MITO_VOL["absorb"]
    ad = _n(nt, "ShaderNodeAddShader")
    nt.links.new(ve.outputs[0], ad.inputs[0]); nt.links.new(va.outputs[0], ad.inputs[1])
    nt.links.new(ad.outputs[0], out.inputs["Volume"])
    return m


def _shelf_shading(m):
    """A fold reads as a thick membrane shelf: its +Y face (object space, towards the next fold up)
    carries the glow as a lit edge, its -Y face falls into shadow."""
    nt = m.node_tree
    p = [n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"][0]
    src = p.inputs["Emission Strength"].links[0].from_socket
    tc = _n(nt, "ShaderNodeTexCoord")
    sep = _n(nt, "ShaderNodeSeparateXYZ"); nt.links.new(tc.outputs["Normal"], sep.inputs[0])
    lit = _n(nt, "ShaderNodeMapRange"); lit.inputs["From Min"].default_value = -1.0
    lit.inputs["To Min"].default_value = 0.08; lit.inputs["To Max"].default_value = 1.6
    nt.links.new(sep.outputs["Y"], lit.inputs["Value"])
    mm = _n(nt, "ShaderNodeMath"); mm.operation = "MULTIPLY"
    nt.links.new(src, mm.inputs[0]); nt.links.new(lit.outputs[0], mm.inputs[1])
    # brighter towards the wall the fold grows from (object |z| ~ the hero's inner membrane): the root
    # reads as a continuous join with the inner membrane, never a floating dash
    sz = _n(nt, "ShaderNodeSeparateXYZ"); nt.links.new(tc.outputs["Object"], sz.inputs[0])
    az = _n(nt, "ShaderNodeMath"); az.operation = "ABSOLUTE"; nt.links.new(sz.outputs["Z"], az.inputs[0])
    rt = _n(nt, "ShaderNodeMapRange"); rt.inputs["From Min"].default_value = 0.0012; rt.inputs["From Max"].default_value = 0.0030
    rt.inputs["To Min"].default_value = 1.0; rt.inputs["To Max"].default_value = 2.4
    nt.links.new(az.outputs[0], rt.inputs["Value"])
    m2 = _n(nt, "ShaderNodeMath"); m2.operation = "MULTIPLY"
    nt.links.new(mm.outputs[0], m2.inputs[0]); nt.links.new(rt.outputs[0], m2.inputs[1])
    nt.links.new(m2.outputs[0], p.inputs["Emission Strength"])
    cb = _n(nt, "ShaderNodeMix"); cb.data_type = "RGBA"; cb.inputs[0].default_value = 0.0
    dk = _n(nt, "ShaderNodeMapRange"); dk.inputs["From Min"].default_value = -1.0
    dk.inputs["To Min"].default_value = 0.85; dk.inputs["To Max"].default_value = 0.0
    nt.links.new(sep.outputs["Y"], dk.inputs["Value"]); nt.links.new(dk.outputs[0], cb.inputs[0])
    cb.inputs[6].default_value = p.inputs["Base Color"].default_value[:]
    cb.inputs[7].default_value = (0.02, 0.012, 0.01, 1)                 # the shadowed side
    nt.links.new(cb.outputs[2], p.inputs["Base Color"])


def mat_cristae_s9(wave):
    """Cristae: warm SSS folds with a humming inner glow (energy wave on 'olup' kept); the glow is
    stronger where a fold is seen edge-on (more tissue along the ray) so the folds shade in 3-D."""
    m = mat_cristae_sss(wave=wave)
    m.name = "CristaeS9"
    nt = m.node_tree
    p = [n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"][0]
    p.inputs["Base Color"].default_value = (*LOOK["cr"], 1)
    p.inputs["Emission Color"].default_value = (*LOOK["cr_em"], 1)
    p.inputs["Roughness"].default_value = 0.6
    p.inputs["Alpha"].default_value = 0.95                           # soft internal folds, clearly visible
    p.inputs["Coat Weight"].default_value = 0.05                     # no glossy edge that could streak
    p.inputs["Coat Roughness"].default_value = 0.5
    p.inputs["Specular IOR Level"].default_value = 0.25
    src = p.inputs["Emission Strength"].links[0].from_socket
    lw = _n(nt, "ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.4
    sh = _n(nt, "ShaderNodeMapRange"); sh.inputs["To Min"].default_value = 0.4; sh.inputs["To Max"].default_value = 5.4
    nt.links.new(lw.outputs["Facing"], sh.inputs["Value"])
    mm = _n(nt, "ShaderNodeMath"); mm.operation = "MULTIPLY"
    nt.links.new(src, mm.inputs[0]); nt.links.new(sh.outputs[0], mm.inputs[1])
    nt.links.new(mm.outputs[0], p.inputs["Emission Strength"])
    return m


def soft_ttubules(so):
    """T-tubule rings: resample each 14-gon into a smooth, gently wandering loop and re-tube it
    thicker with a soft translucent membrane material (dense rim, clear core = a hollow tube)."""
    me = so.data
    adj = {v.index: [] for v in me.vertices}
    for e in me.edges:
        a, b = e.vertices
        adj[a].append(b); adj[b].append(a)
    seen, loops = set(), []
    for v0 in adj:
        if v0 in seen or len(adj[v0]) != 2:
            continue
        loop, prev, cur = [v0], None, v0
        seen.add(v0)
        while True:
            nx = [x for x in adj[cur] if x != prev]
            if not nx or nx[0] == v0:
                break
            prev, cur = cur, nx[0]
            if cur in seen:
                break
            loop.append(cur); seen.add(cur)
        pts = [Vector(me.vertices[i].co) for i in loop]
        cc = sum(pts, Vector()) / len(pts)
        for px, pz, psc, pdz in _PILLAR_T:                 # rings of the slimmed, moved corridor fibril follow it
            if math.hypot(cc.x - px, cc.z - pz) < 0.004:
                pts = [Vector((px + (q.x - px) * psc, q.y, pz + (q.z - pz) * psc + pdz)) for q in pts]
        if any(math.hypot(cc.x - fx, cc.z - fz) < 0.004 or (cc.x > fx and abs(cc.z - fz) < 0.017) for fx, fz in _CLEARED):
            _RINGS_DROPPED[0] += 1
            continue                                       # its fibril was cleared, or the cleared fibril hid it
        # smooth the per-vertex jitter (radius and y) around the loop, keeping the ring's size
        c = sum(pts, Vector()) / len(pts)
        rad = [Vector((q.x - c.x, 0, q.z - c.z)).length for q in pts]
        ys = [q.y for q in pts]
        for _ in range(4):
            rad = [0.5 * rad[i] + 0.25 * (rad[i - 1] + rad[(i + 1) % len(rad)]) for i in range(len(rad))]
            ys = [0.5 * ys[i] + 0.25 * (ys[i - 1] + ys[(i + 1) % len(ys)]) for i in range(len(ys))]
        out = []
        for q, r_, y_ in zip(pts, rad, ys):
            d = Vector((q.x - c.x, 0, q.z - c.z)).normalized()
            out.append(Vector((c.x + d.x * r_, y_, c.z + d.z * r_)))
        loops.append(out)
    verts, edges = [], []
    SUB = 4
    for k, pts in enumerate(loops):
        n = len(pts); i0 = len(verts)
        for i in range(n):
            p0, p1, p2, p3 = pts[i - 1], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]
            for j in range(SUB):
                t = j / SUB
                q = 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3)
                q.y += 0.00035 * noise.noise(Vector((q.x * 900, k * 1.7, q.z * 900)))
                verts.append(tuple(q))
        m_ = n * SUB
        edges += [(i0 + i, i0 + (i + 1) % m_) for i in range(m_)]
    nm = bpy.data.meshes.new("SR_s9"); nm.from_pydata(verts, edges, []); nm.update()
    mt = mat_ttubule()
    nm.materials.append(mt)
    so.data = nm
    for md in list(so.modifiers):
        so.modifiers.remove(md)
    # own mesh->curve->mesh group: lib_s7's drops the material (the old T-tubules rendered with
    # Blender's default grey material = the 'white wire' of the review)
    g = bpy.data.node_groups.new("S9_TTubes", "GeometryNodeTree"); g.is_modifier = True
    g.interface.new_socket("Geometry", in_out="INPUT", socket_type="NodeSocketGeometry")
    g.interface.new_socket("Geometry", in_out="OUTPUT", socket_type="NodeSocketGeometry")
    gi = g.nodes.new("NodeGroupInput"); go = g.nodes.new("NodeGroupOutput")
    m2c = g.nodes.new("GeometryNodeMeshToCurve")
    cc = g.nodes.new("GeometryNodeCurvePrimitiveCircle")
    cc.inputs["Resolution"].default_value = 10; cc.inputs["Radius"].default_value = 0.00062
    c2m = g.nodes.new("GeometryNodeCurveToMesh")
    sm = g.nodes.new("GeometryNodeSetMaterial"); sm.inputs["Material"].default_value = mt
    ss = g.nodes.new("GeometryNodeSetShadeSmooth")
    g.links.new(gi.outputs[0], m2c.inputs["Mesh"]); g.links.new(m2c.outputs[0], c2m.inputs["Curve"])
    g.links.new(cc.outputs["Curve"], c2m.inputs["Profile Curve"]); g.links.new(c2m.outputs[0], sm.inputs["Geometry"])
    g.links.new(sm.outputs[0], ss.inputs[0]); g.links.new(ss.outputs[0], go.inputs[0])
    so.modifiers.new("tubes", "NODES").node_group = g


def mat_ttubule():
    """Soft rosy membrane tube: clear core, denser rim, wet sheen; tinted like the sarcoplasm."""
    m, nt, p = mat_wet_tissue("TTubule", base=(0.50, 0.24, 0.23), sss_radius=(1.0, 0.6, 0.5), sss_scale=0.0008,
                                rough=0.4, coat=0.5, coat_rough=0.15)
    lw = _n(nt, "ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.3
    al = _n(nt, "ShaderNodeMapRange"); al.inputs["To Min"].default_value = 0.06; al.inputs["To Max"].default_value = 0.5
    nt.links.new(lw.outputs["Facing"], al.inputs["Value"]); nt.links.new(al.outputs[0], p.inputs["Alpha"])
    fog_wrap(m)
    return m


HERO_KEY = dict(f0=1215, f1=1240)      # hero matrix glow: chain-bright while small, deep amber at the cut
# Director round 4: the hero lies DIAGONALLY on screen (classic textbook mitochondrion), rolled about
# the view axis (local X; screen right = +Z) around its own centre, so TRK_mito / the callout stay put.
# The near out-of-focus pair is rolled to stay roughly parallel.
ROLL = dict(hero=-30.0, fg=-30.0)
NUCLEUS_SHIFT = (0.0, 0.0, 0.012)
GLOW_SCALE = 0.6       # near out-of-focus myonucleus moves right: the hero's low end stays visible
# the corridor-edge fibril in front of the hero's low end (it cut 2-21 % of it at 1205-1220): a
# little thinner and moved right, its T-tubule rings with it (removing it would uncover rings)
PILLAR = dict(xz=(-0.0195, 0.0113), dz=0.0025, r=0.0058)
_PILLAR_T = []                          # (cx, cz, scale, dz) applied to the rings in soft_ttubules
_CLEARED = []                           # (x, z) of myofibrils removed around the rolled hero
_RINGS_DROPPED = [0]


def _roll_and_clear(inter):
    """Roll the hero (and the fg pair), then remove the myofibril tubes and chain mitochondria the
    rolled hero would intersect (the lib packs it in a narrow gap between vertical fibrils)."""
    _CLEARED.clear(); _RINGS_DROPPED[0] = 0
    for o in inter["objects"]:
        if o.name == "myonucleus0":
            o.location += Vector(NUCLEUS_SHIFT)
    hero = inter["hero"]
    hero.rotation_euler.x += math.radians(ROLL["hero"])
    for o in inter["objects"]:
        if o.name in ("fgMito0", "fgMito1"):
            o.rotation_euler.x += math.radians(ROLL["fg"])
    th = math.radians(ROLL["hero"])
    L, Wd = 0.024, 0.007                                   # hero size (build_fibre_interior: variant 10)

    def seg_dist(x, z):                                     # distance in the X-Z plane to the hero's rolled axis
        return math.hypot(x, max(0.0, abs(z) - abs(L / 2 * math.sin(th))))
    fib = next(o for o in inter["objects"] if o.name == "myofibrils")
    me = fib.data
    per = 24                                                # tubes_mesh: 2 rings x 12 verts per tube
    kill = set()
    for k in range(len(me.vertices) // per):
        vs = [me.vertices[k * per + i].co for i in range(per)]
        cx = sum(v.x for v in vs) / per; cz = sum(v.z for v in vs) / per
        r = max(math.hypot(v.x - cx, v.z - cz) for v in vs)
        if seg_dist(cx, cz) < r + Wd * 0.62:
            kill.update(range(k * per, k * per + per)); _CLEARED.append((cx, cz))
    _PILLAR_T.clear()
    for k in range(len(me.vertices) // per):
        if k * per in kill:
            continue
        vs = [me.vertices[k * per + i] for i in range(per)]
        cx = sum(v.co.x for v in vs) / per; cz = sum(v.co.z for v in vs) / per
        if math.hypot(cx - PILLAR["xz"][0], cz - PILLAR["xz"][1]) < 0.002:
            r = max(math.hypot(v.co.x - cx, v.co.z - cz) for v in vs); sc_ = PILLAR["r"] / r
            for v in vs:
                v.co.x = cx + (v.co.x - cx) * sc_; v.co.z = cz + (v.co.z - cz) * sc_ + PILLAR["dz"]
            _PILLAR_T.append((cx, cz, sc_, PILLAR["dz"]))
    if kill:
        bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table()
        bmesh.ops.delete(bm, geom=[bm.verts[i] for i in sorted(kill)], context="VERTS")
        bm.to_mesh(me); bm.free(); me.update()
    # chain mitochondria the rolled hero would touch (axis-to-axis distance, sampled)
    bpy.context.view_layer.update()
    hm = hero.matrix_local
    hax = [hm @ Vector((0.0, L / 2 * t / 8, 0.0)) for t in range(-8, 9)]
    gone = 0
    for o in list(inter["objects"]):
        if o.type != "MESH" or not o.name.startswith("mito_") or o.parent is not hero.parent:
            continue
        om = o.matrix_local
        oax = [om @ Vector((0.0, 0.008 * t / 4, 0.0)) for t in range(-4, 5)]
        if min((p1 - p2).length for p1 in hax for p2 in oax) < Wd / 2 + 0.0025 + 0.0012:
            for c in list(o.children):
                if c in inter["objects"]:
                    inter["objects"].remove(c)
                bpy.data.objects.remove(c)
            inter["objects"].remove(o); bpy.data.objects.remove(o); gone += 1
    print(f"[lib_s7] hero rolled {ROLL['hero']} deg: cleared {len(_CLEARED)} myofibrils, {gone} chain mitochondria")


def upgrade_interior_s9(inter, wave, frames):
    """Volumetric double-membrane bean mitochondria, inner-fold cristae, soft T-tubules, plus the
    hero matrix-glow key (absolute frames; identical in sh09 and sh10). Returns the new objects."""
    _roll_and_clear(inter)
    new = upgrade_interior(inter, wave)
    gl = bpy.data.objects.get("mitoGlow")
    if gl is not None:                                  # the folds no longer shadow it: a softer inner glow
        gl.data.energy *= GLOW_SCALE
    fib = next(o for o in inter["objects"] if o.name == "myofibrils")
    print(f"[lib_s7] {len(fib.data.vertices) // 24} myofibrils kept, {len(_CLEARED)} cleared, "
          f"{_RINGS_DROPPED[0]} T-tubule rings dropped")
    mh = bpy.data.materials["MitoInnerS9Hero"]
    bake_id(mh.node_tree, frames, 'nodes["matrix_emit"].inputs[1].default_value',
            [LOOK["mscale"] * C.lerp(MITO_VOL["emit_small"], MITO_VOL["emit"], C.remap(f, HERO_KEY["f0"], HERO_KEY["f1"], C.smooth))
             for f in frames])
    return new
