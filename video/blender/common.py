"""Shared library for every shot script (Blender 5.2, Cycles CPU).

A shot script looks like this::

    import os, sys
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    import common as C

    def build(ctx):
        C.world_hdri(C.ph_hdri("kloofendal_48d_partly_cloudy_puresky"))
        cam = C.camera("cam", lens=50, loc=(0, -3, 1.2), look_at=(0, 0, 0.5), fstop=2.8, focus=(0, 0, 0.5))
        C.key(cam, "location", 1.0, (0, -2.8, 1.2))          # keyframe at absolute time 1.0 s
        return {"final_spp": 32}                               # optional per-shot overrides

    C.run("sh01", build)

Run it with Blender (everything after `--` belongs to us)::

    blender -b --factory-startup -noaudio -P blender/shots/sh01.py -- --stills 1.0,3.5
    blender -b --factory-startup -noaudio -P blender/shots/sh01.py -- --animatic
    blender -b --factory-startup -noaudio -P blender/shots/sh01.py -- --final --from 0 --to 40

Time is ALWAYS absolute narration time in seconds (see timing/shots.json). Frame f shows
time f/24 s. `t2f(t)` converts. Every shot renders frames [render_f0, render_f1).
"""
import bpy, bmesh, math, os, sys, json, random, subprocess, time, glob, shutil, argparse
from mathutils import Vector, Euler, Matrix, Color

FPS = 24
W, H = 1080, 1920
VIDEO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))     # .../video
ASSETS = os.environ.get("VIDEO_ASSETS", os.path.join(VIDEO, ".assets"))
OUT = os.environ.get("VIDEO_OUT", os.path.join(VIDEO, ".out"))
SHOTS = json.load(open(os.path.join(VIDEO, "timing", "shots.json"), encoding="utf-8"))
HUMAN_BUNDLE_URL = "https://download.blender.org/demo/asset-bundles/human-base-meshes/human-base-meshes-bundle-v1.4.1.zip"


# --------------------------------------------------------------------------- time

def t2f(t):
    """Absolute time (s) -> absolute frame index."""
    return int(round(t * FPS))


def f2t(f):
    return f / FPS


def shot_info(shot_id):
    for s in SHOTS["shots"]:
        if s["id"] == shot_id:
            return s
    raise KeyError(shot_id)


def word_time(shot_id, word, nth=0, edge="s"):
    """Start ('s') or end ('e') time of the nth occurrence of `word` (prefix match, case-insensitive)
    inside the shot's narration. Use it to sync events to speech."""
    hits = [w for w in shot_info(shot_id)["words"] if w["w"].lower().startswith(word.lower())]
    return hits[nth][edge]


def smooth(x):
    x = max(0.0, min(1.0, x)); return x * x * (3 - 2 * x)


def smoother(x):
    x = max(0.0, min(1.0, x)); return x * x * x * (x * (x * 6 - 15) + 10)


def ease_out(x, p=3):
    x = max(0.0, min(1.0, x)); return 1 - (1 - x) ** p


def ease_in(x, p=3):
    x = max(0.0, min(1.0, x)); return x ** p


def lerp(a, b, x):
    if isinstance(a, (tuple, list, Vector)):
        return tuple(ai + (bi - ai) * x for ai, bi in zip(a, b))
    return a + (b - a) * x


def remap(t, t0, t1, fn=smoother):
    """Normalized eased progress of absolute time t between t0 and t1."""
    if t1 <= t0:
        return 1.0 if t >= t1 else 0.0
    return fn((t - t0) / (t1 - t0))


# --------------------------------------------------------------------------- keyframes

def key(obj, path, t, value, index=-1, interp="BEZIER", handles="AUTO_CLAMPED", frame=None):
    """Keyframe `obj.path = value` at absolute time t (seconds) or explicit frame=.
    interp: BEZIER / LINEAR / CONSTANT. handles: AUTO_CLAMPED (smooth, no overshoot) / VECTOR."""
    f = frame if frame is not None else t * FPS
    target = obj
    attr = path
    if "." in path:
        parts = path.split(".")
        for p in parts[:-1]:
            target = getattr(target, p)
        attr = parts[-1]
    if value is not None:
        cur = getattr(target, attr)
        if index >= 0:
            cur[index] = value
        elif hasattr(cur, "__len__") and not isinstance(cur, str):
            for i, v in enumerate(value):
                cur[i] = v
        else:
            setattr(target, attr, value)
    target.keyframe_insert(attr, index=index, frame=f)
    ad = getattr(obj, "animation_data", None) or getattr(getattr(obj, "id_data", None), "animation_data", None)
    if ad and ad.action:
        for fc in _fcurves(ad.action):
            for kp in fc.keyframe_points:
                if abs(kp.co.x - f) < 1e-4:
                    kp.interpolation = interp
                    if interp == "BEZIER":
                        kp.handle_left_type = handles
                        kp.handle_right_type = handles


def _fcurves(action):
    """Blender 5 layered actions: walk every fcurve of every slot/channelbag."""
    if hasattr(action, "fcurves") and len(getattr(action, "fcurves", [])):
        return list(action.fcurves)
    out = []
    for layer in getattr(action, "layers", []):
        for strip in layer.strips:
            for bag in getattr(strip, "channelbags", []):
                out.extend(bag.fcurves)
    return out


def fcurves(obj):
    ad = obj.animation_data
    return _fcurves(ad.action) if ad and ad.action else []


def set_extrapolation(obj, mode="LINEAR"):
    for fc in fcurves(obj):
        fc.extrapolation = mode


def handheld(obj, amp_loc=0.0015, amp_rot=0.0012, speed=0.35, seed=1):
    """Subtle real-camera micro shake via noise fcurve modifiers (applied on top of keyframes).
    Keep amplitudes tiny: the goal is 'operator breathing', not shaky cam."""
    for path, amp in (("location", amp_loc), ("rotation_euler", amp_rot)):
        for i in range(3):
            if not obj.animation_data or not any(fc.data_path == path and fc.array_index == i for fc in fcurves(obj)):
                obj.keyframe_insert(path, index=i, frame=0)
            for fc in fcurves(obj):
                if fc.data_path == path and fc.array_index == i:
                    m = fc.modifiers.new("NOISE")
                    m.scale = FPS / max(0.01, speed)
                    m.strength = amp * 2
                    m.phase = seed * 13.37 + i * 7.1
                    m.depth = 1


# --------------------------------------------------------------------------- scene / render

class Ctx:
    def __init__(self, shot_id, mode, args):
        self.shot = shot_id
        self.info = shot_info(shot_id)
        self.mode = mode
        self.args = args
        self.f0 = self.info["render_f0"]
        self.f1 = self.info["render_f1"]
        self.t0 = self.info["start_s"]
        self.t1 = self.info["end_s"]
        self.seed = 1234

    def word(self, w, nth=0, edge="s"):
        return word_time(self.shot, w, nth, edge)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.fps = FPS
    sc.render.fps_base = 1.0
    sc.render.resolution_x, sc.render.resolution_y = W, H
    sc.render.resolution_percentage = 100
    sc.render.engine = "CYCLES"
    sc.cycles.device = "CPU"
    sc.view_settings.view_transform = "AgX"
    sc.view_settings.look = "AgX - Medium High Contrast"
    sc.view_settings.exposure = 0.0
    sc.view_settings.gamma = 1.0
    sc.render.film_transparent = False
    sc.unit_settings.system = "METRIC"
    sc.unit_settings.scale_length = 1.0
    w = bpy.data.worlds.new("World")
    sc.world = w
    return sc


def configure_render(mode, ov):
    """Quality presets. `ov` = overrides returned by the shot's build()."""
    sc = bpy.context.scene
    c = sc.cycles
    c.use_light_tree = True
    c.use_adaptive_sampling = True
    c.use_animated_seed = True
    c.seed = ov.get("seed", 7)
    c.max_bounces = ov.get("max_bounces", 8)
    c.diffuse_bounces = ov.get("diffuse_bounces", 3)
    c.glossy_bounces = ov.get("glossy_bounces", 3)
    c.transmission_bounces = ov.get("transmission_bounces", 8)
    c.volume_bounces = ov.get("volume_bounces", 0)
    c.transparent_max_bounces = ov.get("transparent_bounces", 16)
    c.caustics_reflective = ov.get("caustics", False)
    c.caustics_refractive = ov.get("caustics", False)
    c.blur_glossy = ov.get("filter_glossy", 1.0)
    c.sample_clamp_direct = ov.get("clamp_direct", 0.0)
    c.sample_clamp_indirect = ov.get("clamp_indirect", 6.0)
    c.texture_limit_render = ov.get("texture_limit", "4096")
    c.use_denoising = True
    c.denoiser = "OPENIMAGEDENOISE"
    c.denoising_input_passes = "RGB_ALBEDO_NORMAL"
    c.denoising_prefilter = "ACCURATE"
    c.denoising_quality = "HIGH"
    if "volume_step_rate" in ov:
        c.volume_step_rate = ov["volume_step_rate"]
    if ov.get("fast_gi"):
        c.use_fast_gi = True
        c.ao_bounces_render = ov.get("ao_bounces", 1)
    if ov.get("guiding"):
        c.use_guiding = True
    sc.render.use_motion_blur = ov.get("motion_blur", True)
    sc.render.motion_blur_shutter = ov.get("shutter", 0.5)
    sc.render.use_persistent_data = True
    sc.render.film_transparent = ov.get("transparent", False)
    sc.render.dither_intensity = 1.0
    if mode == "final":
        c.samples = ov.get("final_spp", 32)
        c.adaptive_threshold = ov.get("final_threshold", 0.025)
        c.adaptive_min_samples = ov.get("final_min_spp", 0)
        sc.render.resolution_percentage = 100
    elif mode == "stills":
        c.samples = ov.get("preview_spp", 24)
        c.adaptive_threshold = 0.04
        sc.render.resolution_percentage = 50
    else:  # animatic
        c.samples = ov.get("animatic_spp", 6)
        c.adaptive_threshold = 0.1
        c.denoising_prefilter = "FAST"
        c.denoising_quality = "FAST"
        sc.render.resolution_percentage = 25
        sc.render.use_motion_blur = False
    img = sc.render.image_settings
    img.file_format = "PNG"
    img.color_mode = "RGBA" if sc.render.film_transparent else "RGB"
    img.color_depth = "16" if mode == "final" else "8"
    img.compression = 15


def _parse():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument("--stills", default=None, help="comma separated absolute times (s)")
    p.add_argument("--animatic", action="store_true")
    p.add_argument("--final", action="store_true")
    p.add_argument("--from", dest="ffrom", type=int, default=None)
    p.add_argument("--to", dest="fto", type=int, default=None, help="inclusive")
    p.add_argument("--step", type=int, default=None)
    p.add_argument("--res", type=float, default=None, help="resolution percentage override, e.g. 50")
    p.add_argument("--spp", type=int, default=None)
    p.add_argument("--out", default=None)
    p.add_argument("--save-blend", action="store_true")
    p.add_argument("--track", action="store_true", help="export TRK_* screen positions, no rendering")
    return p.parse_args(argv)


def export_tracks(ctx, out_root):
    """Screen-space positions (pixels, origin top-left, 1080x1920) of every Empty/object named TRK_*,
    for each frame of the render range. Also exports visibility (in front of camera, inside frame)."""
    from bpy_extras.object_utils import world_to_camera_view
    sc = bpy.context.scene
    objs = [o for o in sc.objects if o.name.startswith("TRK_")]
    data = {"shot": ctx.shot, "fps": FPS, "width": W, "height": H, "frames": {}}
    for f in range(ctx.f0, ctx.f1):
        sc.frame_set(f)
        row = {}
        for o in objs:
            co = world_to_camera_view(sc, sc.camera, o.matrix_world.translation)
            row[o.name[4:]] = [round(co.x * W, 1), round((1 - co.y) * H, 1), round(co.z, 3),
                               int(co.z > 0 and 0 <= co.x <= 1 and 0 <= co.y <= 1)]
        data["frames"][f] = row
    d = os.path.join(out_root, "track"); os.makedirs(d, exist_ok=True)
    p = os.path.join(d, f"{ctx.shot}.json")
    json.dump(data, open(p, "w"))
    print(f"[common] tracks {[o.name for o in objs]} -> {p}", flush=True)


def run(shot_id, build):
    a = _parse()
    mode = "final" if a.final else ("animatic" if a.animatic else "stills")
    sc = reset()
    ctx = Ctx(shot_id, mode, a)
    random.seed(ctx.seed)
    sc.frame_start, sc.frame_end = ctx.f0, ctx.f1 - 1
    t_build = time.time()
    ov = build(ctx) or {}
    print(f"[common] build {shot_id} took {time.time() - t_build:.1f}s", flush=True)
    configure_render(mode, ov)
    if a.res:
        sc.render.resolution_percentage = int(a.res)
    if a.spp:
        sc.cycles.samples = a.spp
    if not sc.camera:
        raise RuntimeError("shot has no scene.camera")
    out_root = a.out or OUT
    if a.save_blend:
        os.makedirs(os.path.join(out_root, "blend"), exist_ok=True)
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out_root, "blend", f"{shot_id}.blend"))
    if a.track:
        export_tracks(ctx, out_root)
        return
    if mode == "stills":
        times = [float(x) for x in (a.stills or "").split(",") if x.strip()] or \
                [ctx.t0 + (ctx.t1 - ctx.t0) * k for k in (0.1, 0.5, 0.9)]
        d = os.path.join(out_root, "previews"); os.makedirs(d, exist_ok=True)
        for t in times:
            sc.frame_set(t2f(t))
            sc.render.filepath = os.path.join(d, f"{shot_id}_t{t:07.3f}.png")
            t_r = time.time()
            bpy.ops.render.render(write_still=True)
            print(f"[common] still t={t:.3f} f={t2f(t)} -> {sc.render.filepath} ({time.time() - t_r:.1f}s)", flush=True)
    elif mode == "animatic":
        step = a.step or 2
        d = os.path.join(out_root, "animatic", shot_id)
        shutil.rmtree(d, ignore_errors=True); os.makedirs(d)
        frames = list(range(ctx.f0, ctx.f1, step))
        t_r = time.time()
        for f in frames:
            sc.frame_set(f)
            sc.render.filepath = os.path.join(d, f"{f:05d}.png")
            bpy.ops.render.render(write_still=True)
        print(f"[common] animatic {len(frames)} frames in {time.time() - t_r:.1f}s", flush=True)
        _encode_animatic(shot_id, d, frames, step, out_root, ctx)
    else:
        f_from = ctx.f0 if a.ffrom is None else a.ffrom
        f_to = ctx.f1 - 1 if a.fto is None else a.fto
        d = os.path.join(out_root, "frames", shot_id); os.makedirs(d, exist_ok=True)
        sc.frame_start, sc.frame_end = f_from, f_to
        sc.frame_step = a.step or 1
        sc.render.filepath = os.path.join(d, f"{shot_id}_#####")
        sc.render.use_overwrite = False      # resumable: skip frames already on disk
        sc.render.use_placeholder = True
        for f in range(f_from, f_to + 1, sc.frame_step):   # stale 0-byte placeholders of an interrupted run
            p = os.path.join(d, f"{shot_id}_{f:05d}.png")
            if os.path.exists(p) and os.path.getsize(p) == 0:
                os.remove(p)
        stamps = []
        bpy.app.handlers.render_pre.append(lambda *_: stamps.append(time.time()))
        t_r = time.time()
        bpy.ops.render.render(animation=True)
        n = len(stamps)
        print(f"[common] final {shot_id} frames {f_from}-{f_to}: {n} rendered in {time.time() - t_r:.1f}s "
              f"({(time.time() - t_r) / max(1, n):.1f}s/frame)", flush=True)


def _encode_animatic(shot_id, d, frames, step, out_root, ctx):
    """Animatic mp4 with the matching narration slice, so timing can be judged by ear."""
    m4a = os.path.join(VIDEO, "audio", "narration.m4a")
    out = os.path.join(out_root, "animatic", f"{shot_id}_animatic.mp4")
    fps = FPS / step
    lst = os.path.join(d, "list.txt")
    with open(lst, "w") as fh:
        for f in frames:
            fh.write(f"file '{f:05d}.png'\nduration {1 / fps:.6f}\n")
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst,
           "-ss", f"{ctx.f0 / FPS:.3f}", "-t", f"{(ctx.f1 - ctx.f0) / FPS:.3f}", "-i", m4a,
           "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2,format=yuv420p", "-r", "24",
           "-c:v", "libx264", "-crf", "20", "-c:a", "aac", "-shortest", out]
    subprocess.run(cmd, check=False)
    print(f"[common] animatic -> {out}", flush=True)


# --------------------------------------------------------------------------- downloads / assets

def _curl(url, dest):
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        return dest
    tmp = dest + ".part"
    for attempt in range(5):
        r = subprocess.run(["curl", "-sSfL", "--retry", "3", "-o", tmp, url])
        if r.returncode == 0:
            os.replace(tmp, dest)
            return dest
        time.sleep(2 ** attempt)
    raise RuntimeError(f"download failed: {url}")


def _ph_files(asset):
    cache = os.path.join(ASSETS, "polyhaven", "_api", f"{asset}.json")
    if not os.path.exists(cache):
        _curl(f"https://api.polyhaven.com/files/{asset}", cache)
    return json.load(open(cache))


def ph_hdri(name, res="2k", ext="exr"):
    """Poly Haven HDRI (CC0) -> local path. ext 'hdr' or 'exr'."""
    f = _ph_files(name)["hdri"][res][ext]
    return _curl(f["url"], os.path.join(ASSETS, "polyhaven", "hdri", f"{name}_{res}.{ext}"))


def ph_texture(name, res="2k"):
    """Poly Haven texture set (CC0) -> {'diff':path,'nor':path,'rough':path,'disp':path,'ao':path,...}"""
    files = _ph_files(name)
    want = {"diff": ["Diffuse", "diff"], "nor": ["nor_gl"], "rough": ["Rough", "rough"],
            "disp": ["Displacement", "disp"], "ao": ["AO", "ao"], "metal": ["Metal", "metal"],
            "spec": ["Spec", "spec"], "trans": ["Translucency", "translucent"], "mask": ["Mask", "mask"]}
    out = {}
    for k, keys in want.items():
        for kk in keys:
            if kk in files and res in files[kk]:
                fmts = files[kk][res]
                fmt = "jpg" if "jpg" in fmts else ("png" if "png" in fmts else list(fmts)[0])
                u = fmts[fmt]["url"]
                out[k] = _curl(u, os.path.join(ASSETS, "polyhaven", "tex", name, os.path.basename(u)))
                break
    return out


def ph_model(name, res="1k", collection=None):
    """Import a Poly Haven model (glTF, CC0). Returns the list of imported objects."""
    files = _ph_files(name)
    g = files["gltf"][res]["gltf"]
    root = os.path.join(ASSETS, "polyhaven", "models", name, res)
    main = _curl(g["url"], os.path.join(root, os.path.basename(g["url"])))
    for rel, inc in g.get("include", {}).items():
        _curl(inc["url"], os.path.join(root, rel))
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=main)
    objs = [o for o in bpy.data.objects if o not in before]
    if collection:
        col = bpy.data.collections.get(collection) or bpy.data.collections.new(collection)
        if col.name not in bpy.context.scene.collection.children:
            bpy.context.scene.collection.children.link(col)
        for o in objs:
            for c in list(o.users_collection):
                c.objects.unlink(o)
            col.objects.link(o)
    return objs


def human_mesh(obj_name="realistic_hand"):
    """Append an object from Blender's CC0 Human Base Meshes bundle (e.g. 'realistic_hand',
    'realistic_body_male', 'realisitc_skeleton' (sic), 'realistic_head_animation')."""
    d = os.path.join(ASSETS, "human")
    blend = glob.glob(os.path.join(d, "**", "human_base_meshes_bundle.blend"), recursive=True)
    if not blend:
        z = _curl(HUMAN_BUNDLE_URL, os.path.join(d, "hbm.zip"))
        subprocess.run(["unzip", "-o", "-q", z, "-d", d], check=True)
        blend = glob.glob(os.path.join(d, "**", "human_base_meshes_bundle.blend"), recursive=True)
    with bpy.data.libraries.load(blend[0], link=False) as (src, dst):
        dst.objects = [n for n in src.objects if n == obj_name]
    objs = []
    for o in dst.objects:
        if o is not None:
            bpy.context.scene.collection.objects.link(o)
            objs.append(o)
    return objs[0] if len(objs) == 1 else objs


# --------------------------------------------------------------------------- world / lights

def world_hdri(path, strength=1.0, rot_z_deg=0.0, saturation=1.0, tint=(1, 1, 1)):
    w = bpy.context.scene.world
    nt = w.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputWorld")
    bg = nt.nodes.new("ShaderNodeBackground")
    env = nt.nodes.new("ShaderNodeTexEnvironment")
    env.image = bpy.data.images.load(path, check_existing=True)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Rotation"].default_value[2] = math.radians(rot_z_deg)
    hsv = nt.nodes.new("ShaderNodeHueSaturation")
    hsv.inputs["Saturation"].default_value = saturation
    mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.blend_type = "MULTIPLY"
    mix.inputs[0].default_value = 1.0
    mix.inputs[7].default_value = (*tint, 1)
    nt.links.new(tc.outputs["Generated"], mp.inputs["Vector"])
    nt.links.new(mp.outputs["Vector"], env.inputs["Vector"])
    nt.links.new(env.outputs["Color"], hsv.inputs["Color"])
    nt.links.new(hsv.outputs["Color"], mix.inputs[6])
    nt.links.new(mix.outputs[2], bg.inputs["Color"])
    bg.inputs["Strength"].default_value = strength
    nt.links.new(bg.outputs[0], out.inputs["Surface"])
    return bg


def world_sky(sun_elev_deg=8.0, sun_rot_deg=0.0, strength=1.0, altitude=0.0, air=1.0, aerosol=1.0, ozone=1.0,
              sun_disc=True, sun_size_deg=0.545, sun_intensity=1.0, model="MULTIPLE_SCATTERING"):
    """Physically based sky (Cycles). Pair with C.sun(...) of matching angles for crisp shadows if the
    sky's own sun disc is too small for the sampler."""
    w = bpy.context.scene.world
    nt = w.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputWorld")
    bg = nt.nodes.new("ShaderNodeBackground")
    sky = nt.nodes.new("ShaderNodeTexSky")
    sky.sky_type = model
    sky.sun_disc = sun_disc
    sky.sun_size = math.radians(sun_size_deg)
    sky.sun_intensity = sun_intensity
    sky.sun_elevation = math.radians(sun_elev_deg)
    sky.sun_rotation = math.radians(sun_rot_deg)
    sky.altitude = altitude
    sky.air_density = air
    sky.aerosol_density = aerosol
    sky.ozone_density = ozone
    nt.links.new(sky.outputs[0], bg.inputs[0])
    bg.inputs["Strength"].default_value = strength
    nt.links.new(bg.outputs[0], out.inputs["Surface"])
    return sky, bg


def world_color(rgb=(0.02, 0.02, 0.02), strength=1.0):
    nt = bpy.context.scene.world.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputWorld")
    bg = nt.nodes.new("ShaderNodeBackground")
    bg.inputs[0].default_value = (*rgb, 1)
    bg.inputs[1].default_value = strength
    nt.links.new(bg.outputs[0], out.inputs["Surface"])
    return bg


def kelvin(k):
    """Blackbody colour temperature -> linear RGB (approximate, normalised)."""
    t = k / 100.0
    r = 255 if t <= 66 else 329.698727446 * ((t - 60) ** -0.1332047592)
    g = 99.4708025861 * math.log(t) - 161.1195681661 if t <= 66 else 288.1221695283 * ((t - 60) ** -0.0755148492)
    b = 255 if t >= 66 else (0 if t <= 19 else 138.5177312231 * math.log(t - 10) - 305.0447927307)
    rgb = [max(0, min(255, c)) / 255.0 for c in (r, g, b)]
    lin = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in rgb]
    m = max(lin)
    return tuple(c / m for c in lin)


def sun(elev_deg=30, azim_deg=0, strength=3.0, kelvin_k=5500, angle_deg=0.53, name="Sun"):
    """Sun lamp. azim 0 = light travelling toward +Y (sun behind the -Y side)."""
    d = bpy.data.lights.new(name, "SUN")
    d.energy = strength
    d.color = kelvin(kelvin_k)
    d.angle = math.radians(angle_deg)
    o = bpy.data.objects.new(name, d)
    bpy.context.scene.collection.objects.link(o)
    o.rotation_euler = Euler((math.radians(90 - elev_deg), 0, math.radians(azim_deg)), "XYZ")
    return o


def area(name="Area", loc=(0, 0, 3), look_at=(0, 0, 0), size=1.0, size_y=None, power=200, kelvin_k=5500, shape="RECTANGLE",
         spread_deg=180):
    d = bpy.data.lights.new(name, "AREA")
    d.shape = shape
    d.size = size
    d.size_y = size_y or size
    d.energy = power
    d.color = kelvin(kelvin_k)
    d.spread = math.radians(spread_deg)
    o = bpy.data.objects.new(name, d)
    bpy.context.scene.collection.objects.link(o)
    o.location = loc
    point_at(o, look_at)
    return o


def point_light(name="Point", loc=(0, 0, 2), power=100, radius=0.1, kelvin_k=5500):
    d = bpy.data.lights.new(name, "POINT")
    d.energy = power
    d.shadow_soft_size = radius
    d.color = kelvin(kelvin_k)
    o = bpy.data.objects.new(name, d)
    bpy.context.scene.collection.objects.link(o)
    o.location = loc
    return o


# --------------------------------------------------------------------------- camera

def point_at(obj, target, roll_deg=0.0):
    target = Vector(target)
    d = target - Vector(obj.location)
    q = d.to_track_quat("-Z", "Y")
    e = q.to_euler()
    if roll_deg:
        e.rotate_axis("Z", math.radians(roll_deg))
    obj.rotation_euler = e
    return obj


def camera(name="Camera", lens=50.0, loc=(0, -5, 1.6), look_at=None, rot_deg=None, fstop=None, focus=None,
           sensor=36.0, clip_start=0.01, clip_end=5000.0, shift_x=0.0, shift_y=0.0):
    """Physical camera. Vertical 9:16 frame: sensor_fit VERTICAL so `sensor` is the frame HEIGHT
    (36 mm = full-frame long side). `focus` may be a distance (float), a point (tuple) or an object."""
    d = bpy.data.cameras.new(name)
    d.lens = lens
    d.sensor_fit = "VERTICAL"
    d.sensor_height = sensor
    d.sensor_width = sensor
    d.clip_start = clip_start
    d.clip_end = clip_end
    d.shift_x, d.shift_y = shift_x, shift_y
    o = bpy.data.objects.new(name, d)
    bpy.context.scene.collection.objects.link(o)
    o.location = loc
    o.rotation_mode = "XYZ"
    if look_at is not None:
        point_at(o, look_at)
    elif rot_deg is not None:
        o.rotation_euler = Euler([math.radians(v) for v in rot_deg], "XYZ")
    if fstop:
        d.dof.use_dof = True
        d.dof.aperture_fstop = fstop
        d.dof.aperture_blades = 7
        d.dof.aperture_rotation = math.radians(12)
        if isinstance(focus, bpy.types.Object):
            d.dof.focus_object = focus
        elif isinstance(focus, (tuple, list, Vector)):
            e = bpy.data.objects.new(name + "_focus", None)
            bpy.context.scene.collection.objects.link(e)
            e.location = focus
            d.dof.focus_object = e
        elif focus is not None:
            d.dof.focus_distance = float(focus)
    bpy.context.scene.camera = o
    return o


def focus_empty(cam):
    return cam.data.dof.focus_object


def track_to(obj, target_obj):
    c = obj.constraints.new("TRACK_TO")
    c.target = target_obj
    c.track_axis = "TRACK_NEGATIVE_Z"
    c.up_axis = "UP_Y"
    return c


def empty(name="Empty", loc=(0, 0, 0)):
    e = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(e)
    e.location = loc
    return e


# --------------------------------------------------------------------------- materials

def new_mat(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    return m, m.node_tree, m.node_tree.nodes["Principled BSDF"]


def principled(name, base=(0.8, 0.8, 0.8), rough=0.5, metal=0.0, spec=0.5, sss=0.0, sss_radius=(1, 0.2, 0.1),
               sss_scale=0.05, transmission=0.0, ior=1.45, alpha=1.0, emission=None, emission_strength=0.0,
               coat=0.0, coat_rough=0.03, sheen=0.0, thin_film=0.0):
    m, nt, p = new_mat(name)
    p.inputs["Base Color"].default_value = (*base, 1)
    p.inputs["Roughness"].default_value = rough
    p.inputs["Metallic"].default_value = metal
    p.inputs["Specular IOR Level"].default_value = spec
    p.inputs["Subsurface Weight"].default_value = sss
    p.inputs["Subsurface Radius"].default_value = sss_radius
    p.inputs["Subsurface Scale"].default_value = sss_scale
    p.inputs["Transmission Weight"].default_value = transmission
    p.inputs["IOR"].default_value = ior
    p.inputs["Alpha"].default_value = alpha
    p.inputs["Coat Weight"].default_value = coat
    p.inputs["Coat Roughness"].default_value = coat_rough
    p.inputs["Sheen Weight"].default_value = sheen
    p.inputs["Thin Film Thickness"].default_value = thin_film
    if emission:
        p.inputs["Emission Color"].default_value = (*emission, 1)
        p.inputs["Emission Strength"].default_value = emission_strength
    return m


def mat_water(name="Water", tint=(0.9, 0.97, 1.0), rough=0.0):
    return principled(name, base=tint, rough=rough, transmission=1.0, ior=1.333, spec=0.5)


def mat_glass(name="Glass", tint=(0.98, 0.99, 1.0), rough=0.0, ior=1.5):
    return principled(name, base=tint, rough=rough, transmission=1.0, ior=ior)


def mat_from_textures(name, tex, scale=1.0, disp_scale=0.0, base_tint=None, rough_mul=1.0, bump=0.0):
    """Principled material from a ph_texture() dict. `scale` = tiles per object-UV unit (box mapped if no UVs:
    uses Generated? no - uses UV; call box=True variant below for unwrapped meshes)."""
    m, nt, p = new_mat(name)
    tc = nt.nodes.new("ShaderNodeTexCoord")
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Scale"].default_value = (scale, scale, scale)
    nt.links.new(tc.outputs["UV"], mp.inputs["Vector"])

    def img(path, noncolor):
        n = nt.nodes.new("ShaderNodeTexImage")
        n.image = bpy.data.images.load(path, check_existing=True)
        if noncolor:
            n.image.colorspace_settings.name = "Non-Color"
        nt.links.new(mp.outputs["Vector"], n.inputs["Vector"])
        return n
    if "diff" in tex:
        d = img(tex["diff"], False)
        if base_tint:
            mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"; mix.blend_type = "MULTIPLY"
            mix.inputs[0].default_value = 1.0
            nt.links.new(d.outputs["Color"], mix.inputs[6]); mix.inputs[7].default_value = (*base_tint, 1)
            nt.links.new(mix.outputs[2], p.inputs["Base Color"])
        else:
            nt.links.new(d.outputs["Color"], p.inputs["Base Color"])
    if "rough" in tex:
        r = img(tex["rough"], True)
        mm = nt.nodes.new("ShaderNodeMath"); mm.operation = "MULTIPLY"; mm.inputs[1].default_value = rough_mul
        nt.links.new(r.outputs["Color"], mm.inputs[0]); nt.links.new(mm.outputs[0], p.inputs["Roughness"])
    if "nor" in tex:
        n = img(tex["nor"], True)
        nm = nt.nodes.new("ShaderNodeNormalMap")
        nt.links.new(n.outputs["Color"], nm.inputs["Color"])
        nt.links.new(nm.outputs["Normal"], p.inputs["Normal"])
    if "disp" in tex and disp_scale > 0:
        dd = img(tex["disp"], True)
        dn = nt.nodes.new("ShaderNodeDisplacement")
        dn.inputs["Scale"].default_value = disp_scale
        nt.links.new(dd.outputs["Color"], dn.inputs["Height"])
        nt.links.new(dn.outputs[0], nt.nodes["Material Output"].inputs["Displacement"])
        try:
            m.displacement_method = "BOTH"
        except Exception:
            pass
    return m


def assign(obj, mat, slot=None):
    if obj.data.materials and slot is None:
        obj.data.materials[0] = mat
    elif slot is not None and slot < len(obj.data.materials):
        obj.data.materials[slot] = mat
    else:
        obj.data.materials.append(mat)
    return obj


# --------------------------------------------------------------------------- geometry helpers

def link(obj):
    bpy.context.scene.collection.objects.link(obj)
    return obj


def mesh_obj(name, verts, faces, edges=()):
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, edges, faces)
    me.update()
    return link(bpy.data.objects.new(name, me))


def smooth_shade(obj):
    for p in obj.data.polygons:
        p.use_smooth = True
    return obj


def subsurf(obj, levels=2, render_levels=None):
    m = obj.modifiers.new("Subsurf", "SUBSURF")
    m.levels = levels
    m.render_levels = render_levels if render_levels is not None else levels
    return m


def bevel(obj, width=0.002, segments=3):
    m = obj.modifiers.new("Bevel", "BEVEL")
    m.width = width
    m.segments = segments
    m.limit_method = "ANGLE"
    return m


def apply_modifiers(obj):
    dg = bpy.context.evaluated_depsgraph_get()
    ev = obj.evaluated_get(dg)
    me = bpy.data.meshes.new_from_object(ev)
    obj.modifiers.clear()
    obj.data = me
    return obj


def collection(name):
    col = bpy.data.collections.get(name) or bpy.data.collections.new(name)
    if col.name not in [c.name for c in bpy.context.scene.collection.children]:
        bpy.context.scene.collection.children.link(col)
    return col


def move_to_collection(obj, col):
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    col.objects.link(obj)


def hide_from_camera(obj):
    obj.visible_camera = False


def stamp_meta(**kw):
    bpy.context.scene["video_meta"] = json.dumps(kw)
