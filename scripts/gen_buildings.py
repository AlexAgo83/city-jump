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
BARN = (0.46, 0.38, 0.30, 1.0)  # weathered timber: a red barn shouted across the whole map
BARN_TRIM = (0.86, 0.84, 0.78, 1.0)
SILO = (0.72, 0.73, 0.70, 1.0)
TUNNEL = (0.80, 0.82, 0.78, 1.0)
ORCHARD = (0.30, 0.44, 0.24, 1.0)
HAY = (0.78, 0.70, 0.40, 1.0)
CROP = [(0.52, 0.62, 0.24, 1.0), (0.74, 0.68, 0.28, 1.0), (0.42, 0.55, 0.26, 1.0)]
SOIL = (0.36, 0.27, 0.19, 1.0)

INDUSTRY_SHED = (0.62, 0.64, 0.66, 1.0)
INDUSTRY_TRIM = (0.30, 0.33, 0.36, 1.0)
TANK = (0.78, 0.79, 0.76, 1.0)
STACK = (0.72, 0.55, 0.45, 1.0)
PIPE = (0.45, 0.48, 0.50, 1.0)
YARD = (0.34, 0.34, 0.35, 1.0)
MILITARY_WALL = (0.42, 0.45, 0.34, 1.0)
MILITARY_TRIM = (0.26, 0.29, 0.22, 1.0)
MILITARY_HARD = (0.38, 0.38, 0.36, 1.0)

# A farm is mostly field: only the front cell or so is built on, the rest is crop rows. Depth is
# always 4 cells (the sizes agricultural frontage is allowed), so the yard sits at the road and
# the field runs back from it.
FARM_YARD_DEPTH = 11.0


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


def gabled_roof_at(name, x0, y0, w, d, base_z, ridge_h):
    """`gabled_roof`, but placed -- a farm's barn does not sit at the lot's origin."""
    verts = [
        (x0, y0, base_z), (x0 + w, y0, base_z), (x0 + w, y0 + d, base_z), (x0, y0 + d, base_z),
        (x0, y0 + d / 2, base_z + ridge_h), (x0 + w, y0 + d / 2, base_z + ridge_h),
    ]
    faces = [(0, 1, 5, 4), (2, 3, 4, 5), (0, 4, 3), (1, 2, 5)]
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


def prism(name, cx, cy, r, z0, z1, sides=8):
    """A round-ish tower -- a silo, a tank -- without dragging in a mesh primitive op."""
    import math
    verts = []
    for z in (z0, z1):
        for i in range(sides):
            a = 2 * math.pi * i / sides
            verts.append((cx + r * math.cos(a), cy + r * math.sin(a), z))
    faces = [tuple(range(sides))[::-1], tuple(range(sides, 2 * sides))]
    faces += [(i, (i + 1) % sides, sides + (i + 1) % sides, sides + i) for i in range(sides)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def export_parts(name, parts, mats, note):
    for part, mat_name in parts:
        part.data.materials.append(mats[mat_name])
    bpy.ops.object.select_all(action="DESELECT")
    for part, _ in parts:
        part.select_set(True)
    bpy.context.view_layer.objects.active = parts[0][0]
    if len(parts) > 1:
        bpy.ops.object.join()
    path = os.path.join(OUT_DIR, f"{name}.glb")
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True, export_yup=True, export_apply=True)
    print(f"wrote {path}  ({note})")


def works_specs(prefix):
    """Industry and the military take the same deep lots as a farm. One layout per size, so a
    row of them does not read as the same building stamped four times."""
    for frontage in range(1, 5):
        yield (f"{prefix}_{frontage}x4", frontage * CELL - 1.5, 4 * CELL - 1.5, frontage)


def build_industrial(name, w, d, variant):
    """A works. The variant decides what fills the yard behind the shed:
    1 tank farm, 2 boiler house and stack, 3 warehouse and pipe rack, 4 the lot."""
    clear_scene()
    parts = [(box(f"{name}_yard", 0.0, 9.0, 0.0, w, d, 0.15), "yard")]
    shed_w = min(w, 26.0)
    shed_h = 7.5
    parts.append((box(f"{name}_shed", 0.0, 1.0, 0.0, shed_w, 9.0, shed_h), "shed"))
    parts.append((gabled_roof_at(f"{name}_shed_roof", 0.0, 1.0, shed_w, 8.0, shed_h, 1.8), "trim"))
    # Roller doors along the frontage, one per 8 m of shed.
    for i in range(max(1, int(shed_w // 8))):
        x = 1.5 + i * 8.0
        if x + 4.5 > shed_w:
            break
        parts.append((box(f"{name}_door_{i}", x, 0.9, 0.0, x + 4.5, 1.05, shed_h * 0.6), "trim"))
    if variant in (2, 4):
        # The stack, and the boiler house it comes out of.
        parts.append((box(f"{name}_boiler", 0.5, 10.0, 0.0, min(w, 7.0), 16.0, 5.0), "shed"))
        parts.append((prism(f"{name}_stack", min(w, 7.0) - 2.0, 13.0, 1.3, 0.0, 19.0), "stack"))
    if variant in (1, 4):
        # A tank farm: as many as the frontage has room for, bunded by a low wall.
        tanks = max(1, int((w - 2.0) // 7.0))
        for i in range(tanks):
            cx = 4.0 + i * 7.0
            if cx + 3.0 > w:
                break
            parts.append((prism(f"{name}_tank_{i}", cx, 22.0, 3.0, 0.0, 8.0), "tank"))
            parts.append((prism(f"{name}_tank_cap_{i}", cx, 22.0, 3.0, 8.0, 8.8, 8), "trim"))
        parts.append((box(f"{name}_bund_front", 0.4, 17.5, 0.0, w - 0.4, 18.1, 1.1), "trim"))
        parts.append((box(f"{name}_bund_back", 0.4, 26.5, 0.0, w - 0.4, 27.1, 1.1), "trim"))
    if variant in (3, 4):
        # A back warehouse and the pipe rack feeding it, on stubby legs.
        parts.append((box(f"{name}_store", 0.8, d - 12.0, 0.0, max(3.0, w - 0.8), d - 1.0, 6.0), "shed"))
        parts.append((gabled_roof_at(f"{name}_store_roof", 0.8, d - 12.0, max(2.2, w - 1.6), 11.0, 6.0, 1.5), "trim"))
    if variant in (2, 3, 4):
        parts.append((box(f"{name}_pipe", 0.6, 17.0, 3.4, 1.4, d - 1.0, 4.2), "pipe"))
        parts.append((box(f"{name}_pipe2", 1.8, 17.0, 3.4, 2.6, d - 1.0, 4.2), "pipe"))
        for i in range(3):
            y = 18.0 + i * 5.0
            parts.append((box(f"{name}_pipe_leg_{i}", 0.6, y, 0.0, 2.6, y + 0.6, 3.4), "pipe"))
    if variant == 1:
        # Nothing else stands here, so the yard gets its stock in the open.
        for i in range(4):
            x = 1.0 + i * 4.0
            if x + 3.0 > w:
                break
            parts.append((box(f"{name}_stock_{i}", x, d - 6.0, 0.0, x + 3.0, d - 1.5, 2.2), "trim"))
    mats = {
        "shed": material(name, INDUSTRY_SHED),
        "trim": material(f"{name}_trim", INDUSTRY_TRIM),
        "tank": material(f"{name}_tank", TANK),
        "stack": material(f"{name}_stack", STACK),
        "pipe": material(f"{name}_pipe", PIPE),
        "yard": material(f"{name}_yard", YARD),
    }
    export_parts(name, parts, mats, f"works {w} x {d} m")


def build_military(name, w, d, variant):
    """A compound. The variant decides what stands behind the barracks:
    1 motor pool, 2 hangar, 3 ammunition silos, 4 the whole base."""
    clear_scene()
    parts = [(box(f"{name}_apron", 0.0, 10.0, 0.0, w, d, 0.15), "hard")]
    # Barracks blocks along the frontage: long, low, gabled, evenly spaced.
    blocks = max(1, int(w // 9.0))
    for i in range(blocks):
        x = 0.5 + i * 9.0
        bw = min(7.5, w - x - 0.5)
        if bw < 3.0:
            break
        parts.append((box(f"{name}_barrack_{i}", x, 1.0, 0.0, x + bw, 8.0, 3.6), "wall"))
        parts.append((gabled_roof_at(f"{name}_barrack_roof_{i}", x, 1.0, bw, 7.0, 3.6, 1.3), "trim"))
        parts.append((box(f"{name}_barrack_door_{i}", x + bw / 2 - 0.6, 0.9, 0.0, x + bw / 2 + 0.6, 1.05, 2.2), "trim"))
    if variant in (2, 4):
        # The hangar: one big shed with the doors facing the apron.
        hangar_w = min(w - 1.0, 18.0)
        parts.append((box(f"{name}_hangar", 0.5, 11.0, 0.0, 0.5 + hangar_w, 22.0, 7.0), "wall"))
        parts.append((gabled_roof_at(f"{name}_hangar_roof", 0.5, 11.0, hangar_w, 11.0, 7.0, 2.6), "trim"))
        parts.append((box(f"{name}_hangar_door", 1.5, 10.85, 0.0, 0.5 + hangar_w - 1.0, 11.05, 5.2), "hard"))
    if variant in (3, 4):
        # Ammunition silos, each in its own revetment.
        silos = max(1, int((w - 2.0) // 6.0))
        for i in range(silos):
            cx = 3.5 + i * 6.0
            if cx + 2.5 > w:
                break
            parts.append((prism(f"{name}_silo_{i}", cx, 26.0, 2.2, 0.0, 6.5), "hard"))
            parts.append((prism(f"{name}_silo_cap_{i}", cx, 26.0, 2.2, 6.5, 7.4, 8), "trim"))
            parts.append((box(f"{name}_revet_{i}", cx - 3.0, 22.8, 0.0, cx + 3.0, 23.4, 2.0), "wall"))
    if variant in (1, 4):
        # Motor pool: a vehicle shelter and rows of crates under it.
        shelter_w = min(w - 1.0, 16.0)
        parts.append((box(f"{name}_shelter_roof", 0.5, 12.0, 3.4, 0.5 + shelter_w, 20.0, 3.9), "trim"))
        for i in range(4):
            x = 1.2 + i * (shelter_w / 4 if shelter_w > 4 else 4)
            if x + 1.0 > w:
                break
            parts.append((box(f"{name}_post_{i}", x, 12.4, 0.0, x + 0.5, 12.9, 3.4), "trim"))
            parts.append((box(f"{name}_post_b_{i}", x, 19.2, 0.0, x + 0.5, 19.7, 3.4), "trim"))
    for i in range(3):
        x = 1.0 + i * 3.4
        if x + 2.4 > w:
            break
        parts.append((box(f"{name}_crate_{i}", x, d - 3.0, 0.0, x + 2.4, d - 1.2, 1.6), "wall"))
    # A wire fence down both sides of the compound.
    for i, fx in enumerate([0.1, w - 0.35]):
        parts.append((box(f"{name}_fence_{i}", fx, 9.5, 0.0, fx + 0.25, d, 2.4), "trim"))
    mats = {
        "wall": material(name, MILITARY_WALL),
        "trim": material(f"{name}_trim", MILITARY_TRIM),
        "hard": material(f"{name}_hard", MILITARY_HARD),
    }
    export_parts(name, parts, mats, f"compound {w} x {d} m")


def farm_specs():
    """Farms take the same deep lots the industrial frontage does, one holding per size:
    1 market garden, 2 grain farm, 3 orchard, 4 livestock."""
    for frontage in range(1, 5):
        yield (f"farm_{frontage}x4", frontage * CELL - 1.5, 4 * CELL - 1.5, frontage)


def build_farm(name, w, d, variant):
    clear_scene()
    parts = []
    barn_w = min(w * 0.62, 13.0)
    barn_d = 8.5
    barn_h = 5.0
    ridge = 3.4
    parts.append((box(f"{name}_barn", 0.0, 1.0, 0.0, barn_w, 1.0 + barn_d, barn_h), "barn"))
    parts.append((gabled_roof_at(f"{name}_barn_roof", 0.0, 1.0, barn_w, barn_d, barn_h, ridge), "trim"))
    # The big sliding door, and the white boards a barn is always trimmed with.
    parts.append((box(f"{name}_barn_door", barn_w * 0.3, 0.9, 0.0, barn_w * 0.7, 1.02, barn_h * 0.72), "door"))
    parts.append((box(f"{name}_barn_band", -0.05, 0.95, barn_h - 0.5, barn_w + 0.05, 1.05, barn_h - 0.2), "trim"))
    if w > barn_w + 4.0:
        # Silo and a low feed shed fill the rest of the yard.
        sx = barn_w + 1.5
        parts.append((box(f"{name}_silo", sx, 2.0, 0.0, sx + 3.2, 5.2, 10.5), "silo"))
        parts.append((gabled_roof_at(f"{name}_silo_cap", sx, 2.0, 3.2, 3.2, 10.5, 1.1), "trim"))
        if w > sx + 8.0:
            parts.append((box(f"{name}_shed", sx + 4.2, 1.5, 0.0, w - 0.5, 6.5, 3.2), "barn"))
            parts.append((gabled_roof_at(f"{name}_shed_roof", sx + 4.2, 1.5, w - 0.5 - (sx + 4.2), 5.0, 3.2, 1.4), "trim"))
    # The field: bare soil, then whatever this holding grows on it.
    parts.append((box(f"{name}_soil", 0.0, FARM_YARD_DEPTH, 0.0, w, d, 0.3), "soil"))
    if variant == 1:
        # Market garden: polytunnels down the plot, with a bed between each pair.
        row = 0
        y = FARM_YARD_DEPTH + 1.0
        while y + 3.0 < d:
            parts.append((box(f"{name}_tunnel_{row}", 0.6, y, 0.0, w - 0.6, y + 3.0, 1.4), "tunnel"))
            parts.append((gabled_roof_at(f"{name}_tunnel_top_{row}", 0.6, y, w - 1.2, 3.0, 1.4, 0.9), "tunnel"))
            parts.append((box(f"{name}_bed_{row}", 0.8, y + 3.2, 0.25, w - 0.8, y + 4.0, 0.7), f"crop{row % len(CROP)}"))
            y += 5.0
            row += 1
    elif variant == 3:
        # Orchard: staggered rows of little trees, trunk and canopy.
        row = 0
        y = FARM_YARD_DEPTH + 2.0
        while y + 2.0 < d:
            x = 2.0 + (1.5 if row % 2 else 0.0)
            i = 0
            while x + 1.5 < w:
                parts.append((box(f"{name}_trunk_{row}_{i}", x - 0.2, y - 0.2, 0.25, x + 0.2, y + 0.2, 1.4), "soil"))
                parts.append((prism(f"{name}_canopy_{row}_{i}", x, y, 1.5, 1.4, 3.6, 6), "orchard"))
                x += 4.0
                i += 1
            y += 4.0
            row += 1
    elif variant == 4:
        # Livestock: open pasture, a field shelter and hay bales, fenced into two paddocks.
        parts.append((box(f"{name}_pasture", 0.5, FARM_YARD_DEPTH + 0.5, 0.25, w - 0.5, d - 0.5, 0.55), "crop2"))
        parts.append((box(f"{name}_paddock_split", 0.5, (FARM_YARD_DEPTH + d) / 2, 0.0, w - 0.5, (FARM_YARD_DEPTH + d) / 2 + 0.25, 1.2), "trim"))
        parts.append((box(f"{name}_shelter", 0.8, FARM_YARD_DEPTH + 2.0, 0.0, min(w - 0.8, 6.0), FARM_YARD_DEPTH + 6.0, 2.6), "barn"))
        parts.append((gabled_roof_at(f"{name}_shelter_roof", 0.8, FARM_YARD_DEPTH + 2.0, min(w - 1.6, 5.2), 4.0, 2.6, 1.0), "trim"))
        for i in range(3):
            x = 1.2 + i * 3.2
            if x + 2.2 > w:
                break
            parts.append((prism(f"{name}_bale_{i}", x + 1.1, d - 3.0, 1.1, 0.25, 2.4, 8), "hay"))
    else:
        row = 0
        y = FARM_YARD_DEPTH + 0.9
        while y + 1.4 < d:
            # Tall enough to read as a crop from the camera's usual height, not a stripe on the dirt.
            parts.append((box(f"{name}_crop_{row}", 0.5, y, 0.25, w - 0.5, y + 1.4, 1.6), f"crop{row % len(CROP)}"))
            y += 2.4
            row += 1
    # A post fence around the field, so its edge is legible even before the crop grows.
    for i, fx in enumerate([0.1, w - 0.35]):
        parts.append((box(f"{name}_fence_{i}", fx, FARM_YARD_DEPTH, 0.0, fx + 0.25, d, 1.3), "trim"))
    parts.append((box(f"{name}_fence_back", 0.1, d - 0.25, 0.0, w - 0.1, d, 1.3), "trim"))

    mats = {
        "barn": material(name, BARN),
        "trim": material(f"{name}_trim", BARN_TRIM),
        "door": material(f"{name}_door", DOOR),
        "silo": material(f"{name}_silo", SILO),
        "soil": material(f"{name}_soil", SOIL),
    }
    mats["tunnel"] = material(f"{name}_tunnel", TUNNEL)
    mats["orchard"] = material(f"{name}_orchard", ORCHARD)
    mats["hay"] = material(f"{name}_hay", HAY)
    for i, colour in enumerate(CROP):
        mats[f"crop{i}"] = material(f"{name}_crop{i}", colour)
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
    print(f"wrote {path}  (farm {w} x {d} m)")


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
    for prefix, builder in (("industrial", build_industrial), ("military", build_military)):
        for name, w, d, variant in works_specs(prefix):
            manifest["models"][name] = {"kind": "flat", "deckY": 7.5 if prefix == "industrial" else 3.6}
            builder(name, w, d, variant)
    for name, w, d, variant in farm_specs():
        # Nothing stands on a barn roof, so the manifest only has to keep the deck flat and low.
        manifest["models"][name] = {"kind": "flat", "deckY": 5.0}
        build_farm(name, w, d, variant)
    with open(os.path.join(OUT_DIR, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
        f.write("\n")


if __name__ == "__main__":
    main()
    sys.exit(0)
