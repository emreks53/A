"""Kapanis cekimi (fotogercekci): Risale-i Nur Kulliyati + Kur'an-i Kerim.

Gorunum: parlak bir sabah, sol pencereden alcak acili (22 derece) sicak gunes; pencere kasasi/dikme/kayit ve
tul perde golgeleri (yari golgeli) duvara, kaideye ve kitaplara duser; golgeler kameranin arkasindaki acik
renkli odadan notr dolgu alir. Deri: cok acik, solgun gul-taba (acik kahveye kayan) - gunesli sirt orta tonu
~#CC9C86, parlak ~#E3BDA8, golge ~#A7745F (AgX, yaldiz haric olculur: `olc`).
Kadraj: Kur'an ustu ~%6, Lem'alar + kurdele alti ~%66 (dolly sonunda < %68), 75 mm, f/3.2.

Yontem: Cycles CPU'da tam cozunurluk tek kare ~6-7 dk surdugu icin (4 paylasimli cekirdek) 192 kare
dogrudan render edilmez. Bunun yerine:
  1) kare1: hareketin ilk konumundan 1350x2400 (1.25x), %3 genis goruntu alanli buyuk kare
     (160 ornek, esik 0.015) + ayni kameradan DOF'suz kamera-uzayi Z derinligi + olcum maskesi;
  2) son:   hareketin son konumundan 1080x1920 gercek render (dogrulama icin);
  3) hareket.py: derinlige gore yeniden izdusumle 2.5D dolly-in (192 kare) + son islem; son kareyi gercek
     render ile kiyaslar, 1. karede sirt renklerini ve altyazi bandinin sakinligini olcer.

Kullanim (python3, bpy modulu):
    python3 kapanis.py hepsi          # varlik indir + doku uret + kare1 (buyuk) + son kare + 2.5D hareket
    python3 kapanis.py varlik         # Poly Haven CC0 varliklarini indir
    python3 kapanis.py doku           # sirt / kapak dokularini uret
    python3 kapanis.py test [json]    # dusuk cozunurluklu deneme karesi + maske + sirt renk olcumu (test/)
    python3 kapanis.py olc img maske  # sirt derisi golge / orta / gunesli / parlak tonlari
    python3 kapanis.py zaman          # tam cozunurluk tek kare suresi
    python3 kapanis.py kare1          # 1350x2400 buyuk ilk kare + derinlik (EXR) + maske
    python3 kapanis.py son            # hareketin son karesi 1080x1920 (kontrol)
    python3 kapanis.py anim           # 192 kareyi dogrudan render (sure yetiyorsa)
"""
import json
import math
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ayarlar as A  # noqa: E402

CFG = {
    "tohum": 7,
    "lens": 75,
    "pitch": 10.5,               # daha onden bakis: ayni dikey aralikta konu daha genis
    "mesafe": 3.05,
    "hedef": [0.0, 0.18, 0.30],
    "fstop": 3.2,                # ~f/2.8 (1/3 durak kisik): ust sira basliklari okunur kalsin
    "samples": 64,
    "esik": 0.04,
    "rx": 540,
    "ry": 960,
    "dolly": 0.055,              # hareket boyunca mesafenin %5.5'i kadar yaklas
    "kaydir_v": -0.006,          # kamera kendi yukari ekseninde 6 mm asagi (cok hafif dikey suruklenme)
    "hedef_kuran_ust": 0.060,    # kadraj: Kur'an ust kenari (ustten oran)
    "hedef_lem_alt": 0.662,      # kadraj: Lem'alar + kurdele alt kenari (dolly sonunda da < 0.68 kalsin)
}
CFG_DOSYA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ayar.json")


def cfg_yukle(ek=None):
    c = dict(CFG)
    if os.path.exists(CFG_DOSYA):
        c.update(json.load(open(CFG_DOSYA)))
    if ek:
        c.update(ek)
    return c


# ------------------------------------------------------------------ kadraj
def _bbox_kosleri(objs):
    from mathutils import Vector
    pts = []
    for o in objs:
        if o.type != "MESH":
            continue
        dg = __import__("bpy").context.evaluated_depsgraph_get()
        oe = o.evaluated_get(dg)
        me = oe.to_mesh()
        mw = o.matrix_world
        pts += [mw @ v.co for v in me.vertices]
        oe.to_mesh_clear()
    return pts


def kadraj_olc():
    import bpy
    from bpy_extras.object_utils import world_to_camera_view
    sc = bpy.context.scene
    cam = sc.camera
    bpy.context.view_layer.update()
    gr = {
        "kuran": [o for o in sc.objects if o.name.startswith("kuran_cilt")],
        "rahle": [o for o in sc.objects if o.name.startswith("rahle")],
        "ust_sira": [o for o in sc.objects if o.name.startswith("cilt_") and any(o.name == "cilt_" + A.DOSYA[a] for a in A.UST_SIRA)],
        "alt_sira": [o for o in sc.objects if o.name.startswith("cilt_") and any(o.name == "cilt_" + A.DOSYA[a] for a in A.ALT_SIRA)],
        "lemalar": [o for o in sc.objects if o.name == "cilt_" + A.DOSYA[A.YATAN]],
        "kurdele": [o for o in sc.objects if o.name.startswith("kurdele")],
        "kaide": [o for o in sc.objects if o.name.startswith("kaide")],
    }
    out = {}
    for k, objs in gr.items():
        pts = _bbox_kosleri(objs)
        if not pts:
            continue
        v = [world_to_camera_view(sc, cam, p) for p in pts]
        ys = [1.0 - q.y for q in v]
        xs = [q.x for q in v]
        out[k] = dict(y0=min(ys), y1=max(ys), x0=min(xs), x1=max(xs))
    return out


def kamera_coz(cfg, sahne):
    """Kur'an ust kenari ve Lem'alar alt kenari hedef oranlara gelsin."""
    import bpy
    cam = bpy.context.scene.camera
    for it in range(14):
        sahne.kamera_konum(cam, cfg, 0.0)
        k = kadraj_olc()
        top, bot = k["kuran"]["y0"], max(k["lemalar"]["y1"], k["kurdele"]["y1"])
        span, hspan = bot - top, cfg["hedef_lem_alt"] - cfg["hedef_kuran_ust"]
        cfg["mesafe"] *= (span / hspan) ** 0.9
        mid, hmid = (top + bot) / 2, (cfg["hedef_lem_alt"] + cfg["hedef_kuran_ust"]) / 2
        # kadrajda asagi kaymissa (mid buyuk) hedefi asagi indir
        h = list(cfg["hedef"])
        frame_h = 2 * cfg["mesafe"] * math.tan(math.atan(18.0 / cfg["lens"]))
        h[2] -= (mid - hmid) * frame_h * 0.9
        cfg["hedef"] = h
        if abs(span - hspan) < 0.0015 and abs(mid - hmid) < 0.0015:
            break
    sahne.kamera_konum(cam, cfg, 0.0)
    return kadraj_olc()


# ------------------------------------------------------------------ render
def kur(cfg):
    import sahne
    sc = sahne.sahne_kur(cfg)
    k = kamera_coz(cfg, sahne)
    return sahne, sc, k


def render_kare(path, cfg, t=0.0, z_pass=False):
    import bpy
    import sahne
    sc = bpy.context.scene
    sahne.kamera_konum(sc.camera, cfg, t)
    sc.render.filepath = path
    if z_pass:
        vl = sc.view_layers[0]
        vl.use_pass_z = True
    t0 = time.time()
    bpy.ops.render.render(write_still=True)
    dt = time.time() - t0
    if z_pass:
        # derinlik: Render Result'tan EXR kaydet
        rr = bpy.data.images["Render Result"]
        sc.render.image_settings.file_format = "OPEN_EXR_MULTILAYER"
        sc.render.image_settings.color_depth = "32"
        sc.render.image_settings.exr_codec = "ZIP"
        rr.save_render(os.path.splitext(path)[0] + ".exr", scene=sc)
        sc.render.image_settings.file_format = "PNG"
        sc.render.image_settings.color_depth = "8"
    return dt


def maske_render(path):
    """Olcum maskesi (her kitabin sirt derisi ayri gri seviye) - sahne kurulduktan sonra cagrilir."""
    import bpy
    import sahne
    sc = bpy.context.scene
    sahne.maske_modu()
    sc.render.dither_intensity = 0.0
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)


def _hex(c):
    return "#%02X%02X%02X" % tuple(int(round(float(x) * 255)) for x in c)


def sirt_olc(img_path, mask_path, erode=1, yaz=True):
    """Sirt derisi piksellerinin (yaldiz ve cevresi haric) golge / orta / parlak tonlari.
    Parlaklik yuzdeliklerine gore: golge P5-P15, orta P40-P60, gunesli orta P55-P80 (gunes alan sirtlarin
    orta tonu; dikme golgesindeki kitaplar dagilimin alt ceyreginde kalir), parlak P90-P98 bandlarinin ortalamasi."""
    import colorsys
    import cv2
    import numpy as np
    im = cv2.imread(img_path, cv2.IMREAD_UNCHANGED)[..., :3][..., ::-1].astype(np.float32)
    im /= 65535.0 if im.max() > 255 else 255.0
    mk = cv2.imread(mask_path, cv2.IMREAD_GRAYSCALE)
    if mk.shape != im.shape[:2]:
        mk = cv2.resize(mk, (im.shape[1], im.shape[0]), interpolation=cv2.INTER_NEAREST)
    lab = np.rint(mk / 15.0).astype(int) - 1
    sirali = A.UST_SIRA + A.ALT_SIRA + [A.YATAN]
    hsv = cv2.cvtColor(im, cv2.COLOR_RGB2HSV)
    Hh = hsv[..., 0]
    yaldiz = (Hh >= 26.5) & (lab >= 0)
    yaldiz = cv2.dilate(yaldiz.astype(np.uint8), np.ones((3, 3), np.uint8), iterations=max(1, erode + 1)).astype(bool)
    lum = im @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    ker = np.ones((3, 3), np.uint8)
    tum = np.zeros(lab.shape, bool)
    kitap = {}
    for i, a in enumerate(sirali):
        m = (lab == i).astype(np.uint8)
        if erode:
            m = cv2.erode(m, ker, iterations=erode)
        m = m.astype(bool) & ~yaldiz
        if m.sum() < 20:
            continue
        tum |= m
        kitap[a] = _hex(np.median(im[m], axis=0))

    def bant(m, lo, hi):
        L = lum[m]
        a, b = np.percentile(L, lo), np.percentile(L, hi)
        sel = m & (lum >= a) & (lum <= b)
        c = im[sel].mean(0)
        h, s_, v = colorsys.rgb_to_hsv(*c)
        return dict(hex=_hex(c), h=round(h * 360, 1), s=round(s_, 3), v=round(v, 3), n=int(sel.sum()))
    out = dict(golge=bant(tum, 5, 15), orta=bant(tum, 40, 60), gunesli=bant(tum, 55, 80), parlak=bant(tum, 90, 98),
               piksel=int(tum.sum()), kitap=kitap,
               en_parlak_kanal=float(np.percentile(im[tum].max(1), 99.9)))
    if yaz:
        for k in ("golge", "orta", "gunesli", "parlak"):
            print(f"SIRT {k:7s} {out[k]['hex']}  h={out[k]['h']:5.1f}  s={out[k]['s']:.3f}  v={out[k]['v']:.3f}")
        print("SIRT kitap medyanlari", json.dumps(kitap, ensure_ascii=False))
    return out


def main():
    cmd = sys.argv[1] if len(sys.argv) > 1 else "test"
    ek = json.loads(sys.argv[2]) if len(sys.argv) > 2 and cmd != "olc" else None
    os.makedirs(A.TEST, exist_ok=True)
    os.makedirs(A.KARELER, exist_ok=True)
    if cmd in ("varlik", "hepsi"):
        import varliklar
        varliklar.indir()
    if cmd in ("doku", "hepsi"):
        import dokular
        dokular.hepsi()
    if cmd == "test":
        cfg = cfg_yukle(ek)
        sahne, sc, k = kur(cfg)
        print("KADRAJ", json.dumps({a: {kk: round(vv, 3) for kk, vv in b.items()} for a, b in k.items()}))
        print("KAMERA", cfg["mesafe"], cfg["hedef"])
        ad = cfg.get("ad", "deneme")
        dt = render_kare(os.path.join(A.TEST, ad + ".png"), cfg, cfg.get("t", 0.0))
        print(f"SURE {dt:.1f}s")
        if cfg.get("maske", True):
            maske_render(os.path.join(A.TEST, ad + "_maske.png"))
            sirt_olc(os.path.join(A.TEST, ad + ".png"), os.path.join(A.TEST, ad + "_maske.png"))
    if cmd == "olc":
        # python3 kapanis.py olc <goruntu.png> <maske.png>
        sirt_olc(sys.argv[2], sys.argv[3], erode=int(sys.argv[4]) if len(sys.argv) > 4 else 1)
    if cmd == "zaman":
        cfg = cfg_yukle(dict(ek or {}, rx=1080, ry=1920, samples=128, esik=0.02))
        sahne, sc, k = kur(cfg)
        dt = render_kare(os.path.join(A.TEST, "tam_zaman.png"), cfg, 0.0)
        print(f"TAM_KARE_SURE {dt:.1f}s")
    if cmd in ("kare1", "hepsi"):
        import bpy
        import numpy as np
        cfg = cfg_yukle(dict(ek or {}, samples=ek.get("samples", 160) if ek else 160, esik=0.015))
        # 1.25x cozunurluk, %3 genis goruntu alani (hareket/salinim payi)
        pay = 1.03
        so = cfg.get("test_olcek", 1.0)
        cfg_b = dict(cfg, rx=int(round(1350 * so)), ry=int(round(2400 * so)))
        sahne, sc, k = kur(cfg_b)
        sc.camera.data.lens = cfg_b["lens"] / pay
        sc.render.image_settings.color_depth = "16"
        dt = render_kare(os.path.join(A.SCRATCH, "kare1_buyuk.png"), cfg_b, 0.0)
        # derinlik gecisi
        sahne.derinlik_modu()
        exr = os.path.join(A.SCRATCH, "kare1_derinlik.exr")
        sc.render.filepath = exr
        t0 = time.time()
        bpy.ops.render.render(write_still=True)
        im = bpy.data.images.load(exr)
        w, h = im.size
        px = np.empty(w * h * 4, np.float32)
        im.pixels.foreach_get(px)
        dep = px.reshape(h, w, 4)[::-1, :, 0].copy()
        np.save(os.path.join(A.SCRATCH, "kare1_derinlik.npy"), dep)
        print("DERINLIK", dep.min(), np.median(dep), dep.max(), f"{time.time() - t0:.1f}s")
        # olcum maskesi (ayni kamera/cozunurluk): hareket.py bunu 1. kareye tasiyip renkleri olcer
        sc.view_layers[0].material_override = None
        maske_render(os.path.join(A.SCRATCH, "kare1_maske.png"))
        sirt_olc(os.path.join(A.SCRATCH, "kare1_buyuk.png"), os.path.join(A.SCRATCH, "kare1_maske.png"), erode=2)
        json.dump(dict(cfg_b, pay=pay, kadraj=k, sure=dt), open(os.path.join(A.SCRATCH, "kare1_bilgi.json"), "w"), indent=1)
        print(f"KARE1 {dt:.1f}s")
    if cmd in ("son", "hepsi"):
        cfg = cfg_yukle(dict(ek or {}, samples=128, esik=0.02, rx=1080, ry=1920))
        sahne, sc, k = kur(cfg)
        dt = render_kare(os.path.join(A.SCRATCH, "son_kare_render.png"), cfg, 1.0, z_pass=False)
        print(f"SON {dt:.1f}s")
    if cmd == "anim":
        cfg = cfg_yukle(dict(ek or {}, samples=128, esik=0.02, rx=1080, ry=1920))
        sahne, sc, k = kur(cfg)
        import hareket
        for i in range(192):
            out = os.path.join(A.KARELER, f"{i + 1:04d}.png")
            if os.path.exists(out):
                continue
            t = hareket.ilerleme(i)
            render_kare(out, cfg, t)
    if cmd == "hepsi":
        import subprocess
        subprocess.check_call([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), "hareket.py")])


if __name__ == "__main__":
    main()
