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
import json

import bpy

OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "buildings")

CELL = 8.0
COLOURS = [
    (0.78, 0.70, 0.58, 1.0),
    (0.68, 0.55, 0.48, 1.0),
    (0.60, 0.62, 0.66, 1.0),
    (0.45, 0.52, 0.60, 1.0),
    (0.62, 0.68, 0.58, 1.0),
]
GLASS = (0.28, 0.38, 0.44, 1.0)
DOOR = (0.18, 0.12, 0.08, 1.0)
ROOF_TRIM = (0.20, 0.22, 0.24, 1.0)
SIGN = (0.92, 0.66, 0.22, 1.0)
AWNING = (0.18, 0.28, 0.34, 1.0)
INDUSTRIAL_DOOR = (0.12, 0.13, 0.14, 1.0)


def trim_colour(colour):
    return (colour[0] * 0.55, colour[1] * 0.55, colour[2] * 0.55, 1.0)


def building_specs():
    for frontage in range(1, 5):
        for depth in range(1, 5):
            area = frontage * depth
            height = 6.0 + ((frontage * 7 + depth * 3) % 5) * 3.5 + min(area, 8)
            roof = 2.5 if area <= 2 else 0.0
            style = "office" if frontage >= 3 and depth >= 2 else "industrial" if depth >= 4 else "commercial" if frontage >= 2 else "residential"
            yield (
                f"lot_{frontage}x{depth}",
                frontage * CELL - 1.5,
                depth * CELL - 1.5,
                height,
                roof,
                COLOURS[(frontage * 4 + depth) % len(COLOURS)],
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
    bsdf.inputs["Roughness"].default_value = 0.18 if name.endswith("_glass") else 0.85
    return mat


def front_panel(parts, name, x0, y0, z0, x1, z1):
    parts.append((box(f"{name}_glass", x0 + 0.04, y0 - 0.5, z0 + 0.04, x1 - 0.04, y0 - 0.44, z1 - 0.04), "glass"))
    parts.append((box(f"{name}_frame_top", x0 - 0.06, y0 - 0.62, z1, x1 + 0.06, y0 - 0.5, z1 + 0.08), "trim"))
    parts.append((box(f"{name}_frame_bottom", x0 - 0.06, y0 - 0.62, z0 - 0.08, x1 + 0.06, y0 - 0.5, z0), "trim"))
    parts.append((box(f"{name}_frame_left", x0 - 0.08, y0 - 0.62, z0 - 0.08, x0, y0 - 0.5, z1 + 0.08), "trim"))
    parts.append((box(f"{name}_frame_right", x1, y0 - 0.62, z0 - 0.08, x1 + 0.08, y0 - 0.5, z1 + 0.08), "trim"))


def back_panel(parts, name, x0, y0, z0, x1, z1):
    parts.append((box(f"{name}_glass", x0 + 0.04, y0 + 0.44, z0 + 0.04, x1 - 0.04, y0 + 0.5, z1 - 0.04), "glass"))
    parts.append((box(f"{name}_frame_top", x0 - 0.06, y0 + 0.5, z1, x1 + 0.06, y0 + 0.62, z1 + 0.08), "trim"))
    parts.append((box(f"{name}_frame_bottom", x0 - 0.06, y0 + 0.5, z0 - 0.08, x1 + 0.06, y0 + 0.62, z0), "trim"))
    parts.append((box(f"{name}_frame_left", x0 - 0.08, y0 + 0.5, z0 - 0.08, x0, y0 + 0.62, z1 + 0.08), "trim"))
    parts.append((box(f"{name}_frame_right", x1, y0 + 0.5, z0 - 0.08, x1 + 0.08, y0 + 0.62, z1 + 0.08), "trim"))


def left_panel(parts, name, x0, y0, z0, y1, z1):
    parts.append((box(f"{name}_glass", x0 - 0.5, y0 + 0.04, z0 + 0.04, x0 - 0.44, y1 - 0.04, z1 - 0.04), "glass"))
    parts.append((box(f"{name}_frame_top", x0 - 0.62, y0 - 0.06, z1, x0 - 0.5, y1 + 0.06, z1 + 0.08), "trim"))
    parts.append((box(f"{name}_frame_bottom", x0 - 0.62, y0 - 0.06, z0 - 0.08, x0 - 0.5, y1 + 0.06, z0), "trim"))
    parts.append((box(f"{name}_frame_left", x0 - 0.62, y0 - 0.08, z0 - 0.08, x0 - 0.5, y0, z1 + 0.08), "trim"))
    parts.append((box(f"{name}_frame_right", x0 - 0.62, y1, z0 - 0.08, x0 - 0.5, y1 + 0.08, z1 + 0.08), "trim"))


def right_panel(parts, name, x0, y0, z0, y1, z1):
    parts.append((box(f"{name}_glass", x0 + 0.44, y0 + 0.04, z0 + 0.04, x0 + 0.5, y1 - 0.04, z1 - 0.04), "glass"))
    parts.append((box(f"{name}_frame_top", x0 + 0.5, y0 - 0.06, z1, x0 + 0.62, y1 + 0.06, z1 + 0.08), "trim"))
    parts.append((box(f"{name}_frame_bottom", x0 + 0.5, y0 - 0.06, z0 - 0.08, x0 + 0.62, y1 + 0.06, z0), "trim"))
    parts.append((box(f"{name}_frame_left", x0 + 0.5, y0 - 0.08, z0 - 0.08, x0 + 0.62, y0, z1 + 0.08), "trim"))
    parts.append((box(f"{name}_frame_right", x0 + 0.5, y1, z0 - 0.08, x0 + 0.62, y1 + 0.08, z1 + 0.08), "trim"))


def add_windows(parts, name, w, d, h, style, x0=0.0, y0=0.0, z0=0.0):
    floors = max(1, int((h - 2.5) // 3.0))
    for floor in range(floors):
        z = z0 + (1.0 if h < 4.5 else 3.0) + floor * 3.0
        if z > z0 + h - 1.2:
            break
        if style == "residential":
            cols = max(1, int(w // 3.5))
            for col in range(cols):
                x = x0 + (col + 0.5) * w / cols
                front_panel(parts, f"{name}_front_window_{floor}_{col}", x - 1.0, y0, z, x + 1.0, z + 1.8)
                back_panel(parts, f"{name}_back_window_{floor}_{col}", x - 1.0, y0 + d, z, x + 1.0, z + 1.8)
                parts.append((box(f"{name}_balcony_{floor}_{col}", x - 0.65, y0 - 0.55, z - 0.2, x + 0.65, y0 - 0.1, z), "trim"))
            rows = max(1, int(d // 3.5))
            for row in range(rows):
                y = y0 + (row + 0.5) * d / rows
                left_panel(parts, f"{name}_left_window_{floor}_{row}", x0, y - 1.0, z, y + 1.0, z + 1.8)
                right_panel(parts, f"{name}_right_window_{floor}_{row}", x0 + w, y - 1.0, z, y + 1.0, z + 1.8)
        else:
            front_panel(parts, f"{name}_front_windows_{floor}", x0 + 0.65, y0, z, x0 + w - 0.65, z + 1.65)
            back_panel(parts, f"{name}_back_windows_{floor}", x0 + 0.65, y0 + d, z, x0 + w - 0.65, z + 1.65)
            left_panel(parts, f"{name}_left_windows_{floor}", x0, y0 + 0.65, z, y0 + d - 0.65, z + 1.65)
            right_panel(parts, f"{name}_right_windows_{floor}", x0 + w, y0 + 0.65, z, y0 + d - 0.65, z + 1.65)
        if style == "office":
            for x in range(4, int(w), 4):
                parts.append((box(f"{name}_mullion_{floor}_{x}", x0 + x - 0.05, y0 - 0.12, z - 0.1, x0 + x + 0.05, y0 + 0.02, z + 1.15), "trim"))


def add_street_level(parts, name, w, style):
    if style == "industrial":
        parts.append((box(f"{name}_rollup", w * 0.18, -0.08, 0.0, w * 0.58, 0.0, 3.0), "industrial_door"))
        parts.append((box(f"{name}_service_door", w * 0.72, -0.08, 0.0, w * 0.84, 0.0, 2.3), "door"))
    elif w >= CELL * 1.8:
        parts.append((box(f"{name}_storefront", 0.8, -0.06, 0.35, w - 0.8, 0.0, 2.7), "glass"))
        parts.append((box(f"{name}_sign", 0.8, -0.08, 2.9, w - 0.8, 0.0, 3.45), "sign"))
        if style == "commercial":
            parts.append((box(f"{name}_awning", 0.6, -0.75, 2.55, w - 0.6, -0.08, 2.85), "awning"))
    else:
        parts.append((box(f"{name}_door", w * 0.42, -0.06, 0.0, w * 0.58, 0.0, 2.4), "door"))


def add_parapet(parts, name, w, d, h, x0=0.0, y0=0.0):
    t = 0.25
    parts.extend(
        [
            (box(f"{name}_parapet_front", x0, y0 - t, h, x0 + w, y0, h + 0.65), "trim"),
            (box(f"{name}_parapet_back", x0, y0 + d, h, x0 + w, y0 + d + t, h + 0.65), "trim"),
            (box(f"{name}_parapet_left", x0 - t, y0, h, x0, y0 + d, h + 0.65), "trim"),
            (box(f"{name}_parapet_right", x0 + w, y0, h, x0 + w + t, y0 + d, h + 0.65), "trim"),
        ]
    )


def add_flat_roof(parts, name, w, d, h, x0=0.0, y0=0.0):
    add_parapet(parts, name, w, d, h, x0, y0)
    parts.append(
        (
            box(
                f"{name}_roof_hut",
                x0 + w * 0.15,
                y0 + d * 0.15,
                h,
                x0 + min(w * 0.15 + 1.8, w - 0.6),
                y0 + min(d * 0.15 + 1.5, d - 0.6),
                h + 1.5,
            ),
            "trim",
        )
    )
    if w >= CELL * 2 and d >= CELL * 2:
        parts.append((box(f"{name}_skylight", x0 + w * 0.55, y0 + d * 0.35, h + 0.06, x0 + w * 0.8, y0 + d * 0.55, h + 0.22), "glass"))


def add_facade_relief(parts, name, w, d, h, x0=0.0, y0=0.0, z0=0.0):
    for floor in range(1, max(1, int(h // 3.0))):
        z = z0 + floor * 3.0
        parts.extend(
            [
                (box(f"{name}_front_sill_{floor}", x0, y0 - 0.16, z, x0 + w, y0 + 0.02, z + 0.12), "trim"),
                (box(f"{name}_back_sill_{floor}", x0, y0 + d - 0.02, z, x0 + w, y0 + d + 0.16, z + 0.12), "trim"),
                (box(f"{name}_left_sill_{floor}", x0 - 0.16, y0, z, x0 + 0.02, y0 + d, z + 0.12), "trim"),
                (box(f"{name}_right_sill_{floor}", x0 + w - 0.02, y0, z, x0 + w + 0.16, y0 + d, z + 0.12), "trim"),
            ]
        )
    parts.extend(
        [
            (box(f"{name}_front_left_corner", x0 - 0.12, y0 - 0.12, z0, x0 + 0.12, y0 + 0.12, z0 + h), "trim"),
            (box(f"{name}_front_right_corner", x0 + w - 0.12, y0 - 0.12, z0, x0 + w + 0.12, y0 + 0.12, z0 + h), "trim"),
            (box(f"{name}_back_left_corner", x0 - 0.12, y0 + d - 0.12, z0, x0 + 0.12, y0 + d + 0.12, z0 + h), "trim"),
            (box(f"{name}_back_right_corner", x0 + w - 0.12, y0 + d - 0.12, z0, x0 + w + 0.12, y0 + d + 0.12, z0 + h), "trim"),
        ]
    )


def build(name, w, d, h, roof, colour, style):
    clear_scene()
    has_setback = roof == 0 and w * d >= CELL * CELL * 6
    body_h = h * 0.72 if has_setback else h
    parts = [(box(name, 0.0, 0.0, 0.0, w, d, body_h), "wall")]
    if has_setback:
        sx, sy, sw, sd = w * 0.12, d * 0.12, w * 0.76, d * 0.76
        parts.append((box(f"{name}_setback", sx, sy, body_h, sx + sw, sy + sd, h), "wall"))
        add_windows(parts, f"{name}_setback", sw, sd, h - body_h, style, sx, sy, body_h)
        add_facade_relief(parts, f"{name}_setback", sw, sd, h - body_h, sx, sy, body_h)
    if roof > 0:
        parts.append((gabled_roof(f"{name}_roof", w, d, h, roof), "trim"))
    elif has_setback:
        add_parapet(parts, name, w, d, body_h)
        add_flat_roof(parts, f"{name}_setback", sw, sd, h, sx, sy)
    else:
        add_flat_roof(parts, name, w, d, h)
    if style == "industrial":
        parts.append((box(f"{name}_roof_vent", w * 0.6, d * 0.45, h + 0.1, w * 0.8, d * 0.65, h + 0.7), "trim"))
    add_street_level(parts, name, w, style)
    add_windows(parts, name, w, d, body_h, style)
    add_facade_relief(parts, name, w, d, body_h)

    mats = {
        "wall": material(name, colour),
        "glass": material(f"{name}_glass", GLASS),
        "door": material(f"{name}_door", DOOR),
        "trim": material(f"{name}_trim", trim_colour(colour)),
        "sign": material(f"{name}_sign", SIGN),
        "awning": material(f"{name}_awning", AWNING),
        "industrial_door": material(f"{name}_industrial_door", INDUSTRIAL_DOOR),
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
    manifest = {"models": {}}
    for spec in building_specs():
        name, w, d, h, roof, *_ = spec
        if roof > 0:
            manifest["models"][name] = {"kind": "pitched", "deckY": h, "ridgeY": h + roof, "ridgeZ": -d / 2}
        elif w * d >= CELL * CELL * 6:
            manifest["models"][name] = {
                "kind": "setback",
                "lowerDeckY": round(h * 0.72, 5),
                "upperDeckY": h,
                "width": w,
                "minX": round(w * 0.12, 5),
                "maxX": round(w * 0.88, 5),
                "minZ": round(-d * 0.88, 5),
                "maxZ": round(-d * 0.12, 5),
            }
        else:
            manifest["models"][name] = {"kind": "flat", "deckY": h}
        build(*spec)
    with open(os.path.join(OUT_DIR, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
        f.write("\n")


if __name__ == "__main__":
    main()
    sys.exit(0)
