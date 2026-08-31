"""Generate the first kaiju as GLB, headless in Blender.

    /Applications/Blender.app/Contents/MacOS/Blender -b -P scripts/gen_kaiju.py
"""

import os
import json

import bpy

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "kaiju.glb")
MANIFEST = os.path.join(os.path.dirname(OUT), "kaiju.manifest.json")

# The original 49 m silhouette read too small against 25 m city blocks; scale the generated GLB
# so the manifest stays the source of truth for shipped size.
SCALE = 2

def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def material(name, colour):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = colour
    bsdf.inputs["Roughness"].default_value = 0.9
    return mat


def box(name, size, loc, mat):
    bpy.ops.mesh.primitive_cube_add(size=1, location=[v * SCALE for v in loc])
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = [v * SCALE for v in size]
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    return obj


def main():
    clear_scene()
    skin = material("kaiju_skin", (0.12, 0.15, 0.14, 1))
    belly = material("kaiju_belly", (0.18, 0.22, 0.20, 1))
    claw = material("kaiju_claws", (0.08, 0.09, 0.08, 1))

    box("kaiju_body", (14, 18, 11), (0, 0, 31), skin)
    box("kaiju_chest", (12, 10, 10), (0, -4, 36), belly)
    box("kaiju_head", (9, 8, 7), (0, -10, 42), skin)
    box("kaiju_tail", (6, 24, 5), (0, 16, 20), skin)
    box("kaiju_left_leg", (5, 6, 24), (-5, 1, 12), skin)
    box("kaiju_right_leg", (5, 6, 24), (5, 1, 12), skin)
    box("kaiju_left_foot", (6, 10, 3), (-5, -3, 1.5), claw)
    box("kaiju_right_foot", (6, 10, 3), (5, -3, 1.5), claw)
    box("kaiju_left_arm", (4, 5, 17), (-9, -4, 27), skin)
    box("kaiju_right_arm", (4, 5, 17), (9, -4, 27), skin)
    for i, x in enumerate([-4, 0, 4]):
        box(f"kaiju_spine_{i}", (2, 3, 6), (x, 6, 43 + i * 1.5), claw)

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", use_selection=False)
    with open(MANIFEST, "w", encoding="utf-8") as f:
        json.dump({"models": {"kaiju": {"file": "kaiju.glb", "heightM": 49 * SCALE}}}, f, indent=2)
        f.write("\n")


if __name__ == "__main__":
    main()
