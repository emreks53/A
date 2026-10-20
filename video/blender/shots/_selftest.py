"""Library self-test (not part of the film). Renders sh03's time range with a tiny table scene."""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import common as C

def build(ctx):
    C.world_hdri(C.ph_hdri("brown_photostudio_02", "1k"), strength=0.6)
    C.sun(elev_deg=25, azim_deg=-60, strength=4, kelvin_k=4500, angle_deg=2)
    import bpy
    bpy.ops.mesh.primitive_plane_add(size=3)
    table = bpy.context.object
    C.assign(table, C.mat_from_textures("wood", C.ph_texture("wood_table_worn", "1k"), scale=1.5))
    apple = C.ph_model("food_apple_01", "1k")
    for o in apple:
        if o.type == "MESH": o.location.z += 0.0
    cam = C.camera("cam", lens=85, loc=(0, -0.9, 0.35), look_at=(0, 0, 0.04), fstop=2.8, focus=(0, 0, 0.04))
    C.key(cam, "location", ctx.t0, (0, -0.9, 0.35)); C.key(cam, "location", ctx.t1, (0.1, -0.7, 0.3))
    C.handheld(cam)
    C.empty("TRK_apple", (0, 0, 0.05))
    print("WORD takdim at", ctx.word("takdim"))
    return {"final_spp": 16}

C.run("sh03", build)
