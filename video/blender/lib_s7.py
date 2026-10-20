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


def mito_mesh(name, length=0.03, width=0.011, seed=0, bend=0.15):
    """Elongated, slightly bent and lumpy mitochondrion (local long axis = Y)."""
    me = blob_mesh(name, radius=1.0, sub=4, seed=seed, amp=0.06, freq=1.3, squash=(width / 2, length / 2, width / 2 * 0.9))
    rng = random.Random(seed)
    b = rng.uniform(-bend, bend)
    for v in me.vertices:
        y = v.co.y / (length / 2)
        v.co.x += b * width * (1 - y * y)
    me.update()
    return me


def cristae_mesh(name, length=0.03, width=0.011, n=11, seed=0):
    """Inner-membrane folds (lamellar cristae): smooth, gently undulating shelves across the long
    axis (local Y), alternately rooted on either side wall and reaching ~75 % across. Solidify it."""
    import bmesh as _bm
    rng = random.Random(seed)
    bm = _bm.new()
    for i in range(n):
        y0 = (-0.40 + 0.80 * (i + 0.5) / n) * length + rng.uniform(-0.08, 0.08) * length / n
        rr = width / 2 * 0.84 * math.sqrt(max(0.05, 1 - (y0 / (length / 2)) ** 2))
        side = 1 if i % 2 else -1
        g = _bm.ops.create_grid(bm, x_segments=10, y_segments=10, size=1.0)
        ph = rng.uniform(0, 6.28)
        for v in g["verts"]:
            u, w = v.co.x, v.co.y                    # [-1,1]^2 -> disc
            dx = u * math.sqrt(max(0.0, 1 - w * w / 2)); dz = w * math.sqrt(max(0.0, 1 - u * u / 2))
            x = side * (rr - (dx + 1) * 0.5 * rr * 1.5)
            z = dz * rr * 0.92
            yy = y0 + 0.0011 * math.sin(z / rr * 3.0 + ph) + 0.0007 * math.sin(x / rr * 4.0 + ph * 2)
            v.co = Vector((x, yy, z))
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me); bm.free()
    for p in me.polygons:
        p.use_smooth = True
    return me


def mat_mito_envelope():
    """Translucent double membrane: amber SSS film, more opaque at grazing angles (membrane rim),
    see-through in the middle so the 3D cristae read."""
    m, nt, p = mat_wet_tissue("MitoEnvelope", base=(0.55, 0.26, 0.09), sss_radius=(1.0, 0.55, 0.25), sss_scale=0.003,
                              rough=0.32, coat=0.7, coat_rough=0.1)
    lw = _n(nt, "ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.35
    al = _n(nt, "ShaderNodeMapRange"); al.inputs["To Min"].default_value = 0.3; al.inputs["To Max"].default_value = 0.9
    nt.links.new(lw.outputs["Facing"], al.inputs["Value"])
    nt.links.new(al.outputs[0], p.inputs["Alpha"])
    tc = _n(nt, "ShaderNodeTexCoord")
    nz = _n(nt, "ShaderNodeTexNoise", **{"Scale": 260.0, "Detail": 2.0})
    nt.links.new(tc.outputs["Object"], nz.inputs["Vector"])
    _bump_chain(nt, p, [(nz.outputs["Fac"], 0.08)], distance=0.0008)
    fog_wrap(m)
    return m


def mat_cristae_sss():
    """Cristae folds: warm amber SSS with a faint, slowly humming inner glow (no stripes)."""
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
    nt.links.new(st.outputs[0], p.inputs["Emission Strength"])
    fog_wrap(m)
    return m


_MITO_CACHE = {}


def mito_assembly(name, loc, rot, variant=0, length=0.03, width=0.011):
    """A mitochondrion = translucent envelope + solidified 3D cristae, sharing meshes per variant."""
    key = variant
    if key not in _MITO_CACHE:
        env = mito_mesh(f"mitoEnv{variant}", length=length, width=width, seed=500 + variant, bend=0.12)
        env.materials.append(_MITO_CACHE.get("m_env") or _MITO_CACHE.setdefault("m_env", mat_mito_envelope()))
        cr = cristae_mesh(f"mitoCr{variant}", length=length, width=width, n=int(length / 0.0019), seed=variant)
        import bmesh as _bm
        bm = _bm.new(); bm.from_mesh(cr)
        _bm.ops.solidify(bm, geom=bm.faces[:], thickness=0.00045)
        bm.to_mesh(cr); bm.free()
        cr.materials.append(_MITO_CACHE.get("m_cr") or _MITO_CACHE.setdefault("m_cr", mat_cristae_sss()))
        _MITO_CACHE[key] = (env, cr)
    env, cr = _MITO_CACHE[key]
    o = obj_from_mesh(name, env, loc=loc)
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


def mat_muscle(name="Muscle", fog=None, sarcomere=0.04):
    """Skeletal muscle fibre (sarcolemma seen from outside): deep red SSS body, A/I striation bands
    (period = sarcomere length, read from the 'rest' attribute so they bunch on contraction),
    longitudinal myofibril grain, wet glossy coat, warm glow where contracting."""
    m, nt, p = mat_wet_tissue(name, base=(0.30, 0.035, 0.03), sss_radius=(1.0, 0.3, 0.2), sss_scale=0.04,
                              rough=0.55, coat=0.5, coat_rough=0.2)
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
    p.inputs["Sheen Weight"].default_value = 0.35
    p.inputs["Sheen Roughness"].default_value = 0.35
    p.inputs["Sheen Tint"].default_value = (1.0, 0.7, 0.6, 1)
    nt.links.new(b.outputs[0], p.inputs["Coat Normal"])
    # colour: dark A-bands / lighter I-bands, per-fibre variation
    oi = _n(nt, "ShaderNodeObjectInfo")
    cr = _n(nt, "ShaderNodeValToRGB")
    cr.color_ramp.elements[0].color = (0.17, 0.018, 0.02, 1)
    cr.color_ramp.elements[1].color = (0.38, 0.06, 0.045, 1)
    mx = _n(nt, "ShaderNodeMath"); mx.operation = "MULTIPLY_ADD"; mx.inputs[1].default_value = 0.22
    nt.links.new(band.outputs[0], mx.inputs[0])
    m2 = _n(nt, "ShaderNodeMath"); m2.operation = "MULTIPLY"; m2.inputs[1].default_value = 0.3
    nt.links.new(oi.outputs["Random"], m2.inputs[0]); nt.links.new(m2.outputs[0], mx.inputs[2])
    nt.links.new(mx.outputs[0], cr.inputs[0])
    nt.links.new(cr.outputs[0], p.inputs["Base Color"])
    # contraction glow (warm amber, inner energy)
    ce = _n(nt, "ShaderNodeMath"); ce.operation = "MULTIPLY"; ce.inputs[1].default_value = 0.9
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
