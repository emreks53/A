"""Shared helpers for studio S6 shots (sh05, sh07). Uses only common.py + bpy."""
import bpy, math
from mathutils import Vector


def sun_dir(elev_deg, azim_deg):
    """Unit vector pointing FROM the scene TOWARD the sun. azim 0 = +Y, 90 = +X."""
    e, a = math.radians(elev_deg), math.radians(azim_deg)
    return Vector((math.cos(e) * math.sin(a), math.cos(e) * math.cos(a), math.sin(e)))


def aim_sun_lamp(lamp, elev_deg, azim_deg):
    """Point a SUN lamp so its light travels away from the sun direction."""
    d = -sun_dir(elev_deg, azim_deg)
    lamp.rotation_mode = "QUATERNION"
    lamp.rotation_quaternion = d.to_track_quat("-Z", "Y")


def compositor(bloom=0.25, threshold=1.0, size=0.6, fog=0.0, fog_size=0.8, vignette=0.0, grain=0.0):
    """Lens-like post inside the render: bloom (+ optional wide fog glow) and an optical vignette.
    Returns dict of nodes so callers can keyframe inputs."""
    sc = bpy.context.scene
    ng = bpy.data.node_groups.new("S6_comp", "CompositorNodeTree")
    sc.compositing_node_group = ng
    sc.render.compositor_device = "CPU"
    sc.render.use_compositing = True
    nodes, links = ng.nodes, ng.links
    ng.interface.new_socket("Image", in_out="OUTPUT", socket_type="NodeSocketColor")
    rl = nodes.new("CompositorNodeRLayers")
    out = nodes.new("NodeGroupOutput")
    cur = rl.outputs["Image"]
    res = {"rl": rl}

    def glare(kind, strength, thr, sz):
        g = nodes.new("CompositorNodeGlare")
        g.inputs["Type"].default_value = kind
        g.inputs["Quality"].default_value = "High"
        g.inputs["Threshold"].default_value = thr
        g.inputs["Strength"].default_value = strength
        g.inputs["Size"].default_value = sz
        return g
    if bloom > 0:
        g = glare("Bloom", bloom, threshold, size)
        links.new(cur, g.inputs["Image"]); cur = g.outputs["Image"]; res["bloom"] = g
    if fog > 0:
        g = glare("Fog Glow", fog, threshold, fog_size)
        links.new(cur, g.inputs["Image"]); cur = g.outputs["Image"]; res["fog"] = g
    if vignette > 0:
        # radial falloff via ellipse mask blurred, multiplied
        em = nodes.new("CompositorNodeEllipseMask")
        try:
            em.inputs["Size"].default_value = (1.25, 1.0)
        except Exception:
            pass
        bl = nodes.new("CompositorNodeBlur")
        try:
            bl.inputs["Size"].default_value = (400, 400)
        except Exception:
            pass
        links.new(em.outputs[0], bl.inputs["Image"])
        mr = nodes.new("ShaderNodeMapRange")
        mr.inputs["To Min"].default_value = 1.0 - vignette
        links.new(bl.outputs[0], mr.inputs["Value"])
        mul = nodes.new("ShaderNodeMix"); mul.data_type = "RGBA"; mul.blend_type = "MULTIPLY"
        mul.inputs[0].default_value = 1.0
        links.new(cur, mul.inputs[6]); links.new(mr.outputs[0], mul.inputs[7]); cur = mul.outputs[2]
        res["vig"] = mr
    links.new(cur, out.inputs[0])
    return res
