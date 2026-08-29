"""Generate the placeholder building library as GLB, headless in Blender.

    /Applications/Blender.app/Contents/MacOS/Blender -b -P scripts/gen_buildings.py

This is the MeshAnvil side of the contract: whatever authors a building has to obey
the convention in docs/assets.md, and this script is the smallest thing that does.
Blender is Z-up and the glTF exporter maps Blender +Z to glTF +Y and Blender +Y to
glTF -Z, so a box built here from (0, 0, 0) to (w, d, h) exports with its origin at
the front-left footprint corner, extending to +X, up +Y and back into -Z.
"""

import os
import sys

import bpy

OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "buildings")

CELL = 8.0
PALETTES = {
    "office": [(0.55, 0.59, 0.62, 1.0), (0.45, 0.52, 0.60, 1.0), (0.64, 0.65, 0.61, 1.0)],
    "industrial": [(0.50, 0.51, 0.49, 1.0), (0.56, 0.52, 0.45, 1.0), (0.43, 0.46, 0.47, 1.0)],
    "commercial": [(0.78, 0.70, 0.58, 1.0), (0.68, 0.55, 0.48, 1.0), (0.70, 0.65, 0.56, 1.0)],
    "residential": [(0.72, 0.58, 0.50, 1.0), (0.62, 0.68, 0.58, 1.0), (0.75, 0.70, 0.62, 1.0)],
}
GLASS = (0.08, 0.11, 0.15, 1.0)
LIT_GLASS = (0.95, 0.68, 0.32, 1.0)
DOOR = (0.18, 0.12, 0.08, 1.0)
ROOF_TRIM = (0.20, 0.22, 0.24, 1.0)
ROOF_FELT = (0.10, 0.11, 0.12, 1.0)
SIGN = (0.92, 0.66, 0.22, 1.0)
AWNING = (0.18, 0.28, 0.34, 1.0)
INDUSTRIAL_DOOR = (0.12, 0.13, 0.14, 1.0)
DIRT = (0.16, 0.14, 0.11, 1.0)
METAL = (0.44, 0.46, 0.47, 1.0)


def building_specs():
    for frontage in range(1, 5):
        for depth in range(1, 5):
            area = frontage * depth
            height = 6.0 + ((frontage * 7 + depth * 3) % 5) * 3.5 + min(area, 8)
            roof = 2.5 if area <= 2 else 0.0
            style = "office" if frontage >= 3 and depth >= 2 else "industrial" if depth >= 4 else "commercial" if frontage >= 2 else "residential"
            palette = PALETTES[style]
            yield (
                f"lot_{frontage}x{depth}",
                frontage * CELL - 1.5,
                depth * CELL - 1.5,
                height,
                roof,
                palette[(frontage * 4 + depth) % len(palette)],
                style,
            )


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def box(name, x0, y0, z0, x1, y1, z1):
    """Axis-aligned box from two corners, in Blender coordinates."""
    verts = [
        (x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0),
        (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1),
    ]
    faces = [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def gabled_roof(name, w, d, base_z, ridge_h):
    """A simple ridge running along the width, so the front reads as a facade."""
    verts = [
        (0, 0, base_z), (w, 0, base_z), (w, d, base_z), (0, d, base_z),
        (0, d / 2, base_z + ridge_h), (w, d / 2, base_z + ridge_h),
    ]
    faces = [(0, 1, 5, 4), (2, 3, 4, 5), (0, 4, 3), (1, 2, 5)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def material(name, colour):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = colour
    bsdf.inputs["Roughness"].default_value = 0.85
    return mat


def add_windows(parts, name, w, d, h, style):
    floors = max(1, int((h - 2.5) // 3.0))
    for floor in range(floors):
        z = 3.0 + floor * 3.0
        if z > h - 1.2:
            break
        lit = "lit_glass" if (floor + len(name)) % 4 == 0 else "glass"
        if style == "residential":
            cols = max(1, int(w // 3.5))
            for col in range(cols):
                x = (col + 0.5) * w / cols
                mat = "lit_glass" if (floor * 3 + col + len(name)) % 5 == 0 else "glass"
                parts.append((box(f"{name}_window_{floor}_{col}", x - 0.45, -0.1, z, x + 0.45, 0.0, z + 1.1), mat))
                parts.append((box(f"{name}_balcony_{floor}_{col}", x - 0.65, -0.55, z - 0.2, x + 0.65, -0.1, z), "trim"))
                parts.append((box(f"{name}_balcony_rail_{floor}_{col}", x - 0.65, -0.62, z, x + 0.65, -0.55, z + 0.45), "metal"))
        else:
            parts.append((box(f"{name}_front_windows_{floor}", 0.7, -0.08, z, w - 0.7, 0.0, z + 1.0), lit))
            parts.append((box(f"{name}_back_windows_{floor}", 0.7, d, z, w - 0.7, d + 0.08, z + 1.0), "glass"))
            parts.append((box(f"{name}_left_windows_{floor}", -0.08, 0.7, z, 0.0, d - 0.7, z + 1.0), "glass"))
            parts.append((box(f"{name}_right_windows_{floor}", w, 0.7, z, w + 0.08, d - 0.7, z + 1.0), lit))
        if style == "office":
            for x in range(4, int(w), 4):
                parts.append((box(f"{name}_mullion_{floor}_{x}", x - 0.05, -0.12, z - 0.1, x + 0.05, 0.02, z + 1.15), "trim"))


def add_street_level(parts, name, w, style):
    if style == "industrial":
        parts.append((box(f"{name}_rollup", w * 0.18, -0.08, 0.0, w * 0.58, 0.0, 3.0), "industrial_door"))
        for i in range(1, 5):
            z = i * 0.6
            parts.append((box(f"{name}_rollup_slat_{i}", w * 0.18, -0.12, z, w * 0.58, -0.06, z + 0.06), "metal"))
        parts.append((box(f"{name}_service_door", w * 0.72, -0.08, 0.0, w * 0.84, 0.0, 2.3), "door"))
    elif w >= CELL * 1.8:
        parts.append((box(f"{name}_storefront", 0.8, -0.06, 0.35, w - 0.8, 0.0, 2.7), "glass"))
        parts.append((box(f"{name}_sign", 0.8, -0.08, 2.9, w - 0.8, 0.0, 3.45), "sign"))
        parts.append((box(f"{name}_recessed_entry", w * 0.45, -0.12, 0.0, w * 0.58, -0.02, 2.55), "door"))
        if style == "commercial":
            parts.append((box(f"{name}_awning", 0.6, -0.75, 2.55, w - 0.6, -0.08, 2.85), "awning"))
    else:
        parts.append((box(f"{name}_door", w * 0.42, -0.06, 0.0, w * 0.58, 0.0, 2.4), "door"))


def add_flat_roof(parts, name, w, d, h):
    t = 0.25
    parts.extend(
        [
            (box(f"{name}_roof_surface", 0.2, 0.2, h + 0.01, w - 0.2, d - 0.2, h + 0.05), "roof_felt"),
            (box(f"{name}_parapet_front", 0, -t, h, w, 0, h + 0.65), "trim"),
            (box(f"{name}_parapet_back", 0, d, h, w, d + t, h + 0.65), "trim"),
            (box(f"{name}_parapet_left", -t, 0, h, 0, d, h + 0.65), "trim"),
            (box(f"{name}_parapet_right", w, 0, h, w + t, d, h + 0.65), "trim"),
            (box(f"{name}_roof_hut", w * 0.15, d * 0.15, h, min(w * 0.15 + 1.8, w - 0.6), min(d * 0.15 + 1.5, d - 0.6), h + 1.5), "trim"),
        ]
    )
    if w >= CELL * 2 and d >= CELL * 2:
        parts.append((box(f"{name}_skylight", w * 0.55, d * 0.35, h + 0.06, w * 0.8, d * 0.55, h + 0.22), "glass"))
        parts.append((box(f"{name}_hvac", w * 0.34, d * 0.6, h + 0.08, w * 0.48, d * 0.75, h + 0.72), "metal"))
        parts.append((box(f"{name}_hvac_duct", w * 0.48, d * 0.66, h + 0.25, w * 0.62, d * 0.7, h + 0.45), "metal"))
    if w >= CELL * 3:
        parts.append((box(f"{name}_roof_rail", w * 0.18, d * 0.78, h + 0.65, w * 0.7, d * 0.82, h + 1.05), "metal"))


def add_facade_relief(parts, name, w, d, h):
    for floor in range(1, max(1, int(h // 3.0))):
        z = floor * 3.0
        parts.extend(
            [
                (box(f"{name}_front_sill_{floor}", 0.0, -0.16, z, w, 0.02, z + 0.12), "trim"),
                (box(f"{name}_back_sill_{floor}", 0.0, d - 0.02, z, w, d + 0.16, z + 0.12), "trim"),
                (box(f"{name}_left_sill_{floor}", -0.16, 0.0, z, 0.02, d, z + 0.12), "trim"),
                (box(f"{name}_right_sill_{floor}", w - 0.02, 0.0, z, w + 0.16, d, z + 0.12), "trim"),
            ]
        )
    parts.extend(
        [
            (box(f"{name}_front_left_corner", -0.12, -0.12, 0.0, 0.12, 0.12, h), "trim"),
            (box(f"{name}_front_right_corner", w - 0.12, -0.12, 0.0, w + 0.12, 0.12, h), "trim"),
            (box(f"{name}_back_left_corner", -0.12, d - 0.12, 0.0, 0.12, d + 0.12, h), "trim"),
            (box(f"{name}_back_right_corner", w - 0.12, d - 0.12, 0.0, w + 0.12, d + 0.12, h), "trim"),
        ]
    )
    parts.extend(
        [
            (box(f"{name}_front_grime", 0.2, -0.18, 0.0, w - 0.2, -0.1, 0.55), "dirt"),
            (box(f"{name}_back_grime", 0.2, d + 0.1, 0.0, w - 0.2, d + 0.18, 0.55), "dirt"),
        ]
    )
    for x in (w * 0.18, w * 0.82):
        parts.append((box(f"{name}_rain_stain_{x:.1f}", x - 0.12, -0.19, h * 0.35, x + 0.12, -0.11, h * 0.88), "dirt"))
    if w >= CELL * 2 and h >= 11:
        x = w - 0.55
        parts.append((box(f"{name}_fire_escape_ladder", x, -0.23, 2.8, x + 0.14, -0.12, h - 1.2), "metal"))
        for floor in range(2, max(3, int(h // 3))):
            z = floor * 3.0 - 0.25
            parts.append((box(f"{name}_fire_escape_platform_{floor}", x - 1.1, -0.75, z, x + 0.55, -0.2, z + 0.12), "metal"))


def build(name, w, d, h, roof, colour, style):
    clear_scene()
    parts = [(box(name, 0.0, 0.0, 0.0, w, d, h * (0.72 if roof == 0 and w * d >= CELL * CELL * 6 else 1.0)), "wall")]
    if roof == 0 and w * d >= CELL * CELL * 6:
        parts.append((box(f"{name}_setback", w * 0.12, d * 0.12, h * 0.72, w * 0.88, d * 0.88, h), "wall"))
    if roof > 0:
        parts.append((gabled_roof(f"{name}_roof", w, d, h, roof), "trim"))
    else:
        add_flat_roof(parts, name, w, d, h)
    if style == "industrial":
        parts.append((box(f"{name}_roof_vent", w * 0.6, d * 0.45, h + 0.1, w * 0.8, d * 0.65, h + 0.7), "trim"))
    add_street_level(parts, name, w, style)
    add_windows(parts, name, w, d, h, style)
    add_facade_relief(parts, name, w, d, h)

    mats = {
        "wall": material(name, colour),
        "glass": material(f"{name}_glass", GLASS),
        "lit_glass": material(f"{name}_lit_glass", LIT_GLASS),
        "door": material(f"{name}_door", DOOR),
        "trim": material(f"{name}_trim", ROOF_TRIM),
        "roof_felt": material(f"{name}_roof_felt", ROOF_FELT),
        "sign": material(f"{name}_sign", SIGN),
        "awning": material(f"{name}_awning", AWNING),
        "industrial_door": material(f"{name}_industrial_door", INDUSTRIAL_DOOR),
        "dirt": material(f"{name}_dirt", DIRT),
        "metal": material(f"{name}_metal", METAL),
    }
    for part, mat_name in parts:
        part.data.materials.append(mats[mat_name])

    bpy.ops.object.select_all(action="DESELECT")
    for part, _ in parts:
        part.select_set(True)
    bpy.context.view_layer.objects.active = parts[0][0]
    if len(parts) > 1:
        bpy.ops.object.join()

    path = os.path.join(OUT_DIR, f"{name}.glb")
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=True,
    )
    print(f"wrote {path}  ({w} x {d} x {h + roof} m)")


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for spec in building_specs():
        build(*spec)


if __name__ == "__main__":
    main()
    sys.exit(0)
