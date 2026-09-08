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
CROP = [(0.36, 0.44, 0.16, 1.0), (0.56, 0.47, 0.20, 1.0), (0.28, 0.40, 0.18, 1.0)]
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
                parts.append((box(f"{name}_balcony_{floor}_{col}", x - 1.1, y0 - 0.62, z - 0.2, x + 1.1, y0, z), "trim"))
                parts.append((box(f"{name}_balcony_rail_{floor}_{col}", x - 1.1, y0 - 0.62, z + 0.65, x + 1.1, y0 - 0.54, z + 0.73), "trim"))
                for dx in (-1.05, 0, 1.05):
                    parts.append((box(f"{name}_baluster_{floor}_{col}", x + dx - 0.035, y0 - 0.62, z, x + dx + 0.035, y0 - 0.54, z + 0.65), "trim"))
            rows = max(1, int(d // 3.5))
            for row in range(rows):
                y = y0 + (row + 0.5) * d / rows
                left_panel(parts, f"{name}_left_window_{floor}_{row}", x0, y - 1.0, z, y + 1.0, z + 1.8)
                right_panel(parts, f"{name}_right_window_{floor}_{row}", x0 + w, y - 1.0, z, y + 1.0, z + 1.8)
        else:
            # Separate bays keep masonry visible; all frames sit ahead of the glass.
            for span, front, back, origin, near, far in (
                (w, front_panel, back_panel, x0, y0, y0 + d),
                (d, left_panel, right_panel, y0, x0, x0 + w),
            ):
                count = max(1, int(span // (3.2 if style == "office" else 3.8)))
                for bay in range(count):
                    centre = origin + (bay + 0.5) * span / count
                    half = min(1.15, span / count * 0.34)
                    label = f"{name}_bay_{floor}_{bay}_{near}_{far}"
                    if front == front_panel:
                        front(parts, label + "_front", centre - half, near, z, centre + half, z + 1.65)
                        back(parts, label + "_back", centre - half, far, z, centre + half, z + 1.65)
                    else:
                        front(parts, label + "_left", near, centre - half, z, centre + half, z + 1.65)
                        back(parts, label + "_right", far, centre - half, z, centre + half, z + 1.65)


def add_street_level(parts, name, w, style):
    if style == "industrial":
        parts.append((box(f"{name}_rollup", w * 0.18, -0.08, 0.0, w * 0.58, 0.0, 3.0), "industrial_door"))
        parts.append((box(f"{name}_service_door", w * 0.72, -0.08, 0.0, w * 0.84, 0.0, 2.3), "door"))
    elif style in ("commercial", "office"):
        bays = max(1, int(w // 4))
        for bay in range(bays):
            left, right = bay * w / bays + 0.45, (bay + 1) * w / bays - 0.45
            front_panel(parts, f"{name}_shopfront_{bay}", left, 0, 0.3, right, 2.5)
            parts.append((box(f"{name}_shop_mullion_{bay}", right - 0.9, -0.62, 0.3, right - 0.8, -0.5, 2.5), "trim"))
            if style == "commercial":
                parts.append((box(f"{name}_sign_{bay}", left, -0.64, 2.65, right, -0.5, 2.95), "sign"))
                parts.append((box(f"{name}_awning_{bay}", left - 0.1, -0.75, 2.5, right + 0.1, -0.1, 2.65), "awning"))
    else:
        parts.append((box(f"{name}_door_surround", w * 0.35, -0.18, 0, w * 0.65, 0, 2.7), "trim"))
        parts.append((box(f"{name}_door", w * 0.39, -0.22, 0, w * 0.61, -0.18, 2.4), "door"))
        parts.append((box(f"{name}_door_light", w * 0.43, -0.25, 1.5, w * 0.57, -0.22, 2.2), "glass"))
        parts.append((box(f"{name}_porch", w * 0.32, -0.62, 2.7, w * 0.68, 0, 2.85), "trim"))


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
    for row in range(4):
        parts.append((box(f"{name}_roof_louvre_{row}", x0 + w * 0.15 + 0.2, y0 + d * 0.15 - 0.04, h + 0.3 + row * 0.25,
                          x0 + w * 0.15 + 1.6, y0 + d * 0.15, h + 0.4 + row * 0.25), "wall"))
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


def build_small_industrial(variant):
    """Residual 1x1 frontage: workshop, delivery depot, or boiler house with tank."""
    name = f'industrial_1x1_{variant}'
    clear_scene()
    parts = []
    def block(label, corners, mat='shed'):
        parts.append((box(f'{name}_{label}', *corners), mat))
    def cylinder(label, x, y, radius, bottom, top, mat='tank'):
        parts.append((prism(f'{name}_{label}', x,y,radius,bottom,top,16),mat))

    block('yard',(0,0,0,6.5,6.5,.18),'yard')
    width = 3.2 if variant == 'c' else 5.5
    height = 4.2 if variant == 'a' else 5.4 if variant == 'b' else 4.8
    block('shed',(.5,1.2,.18,.5+width,6,height))
    if variant == 'a':
        parts.append((gabled_roof_at(name+'_roof',.35,1.05,width+.3,5.1,height,1.3),'trim'))
    else:
        block('roof',(.35,1.05,height,.65+width,6.15,height+.2),'trim')
    for y in range(2,6):
        for x in (.45,.5+width):
            block('wall_rib',(x,y,.2,x+.07,y+.08,height),'pipe')
    door_width = width-1
    block('door_frame',(.85,1.04,.18,1.05+door_width,1.25,3.6),'trim')
    block('loading_door',(1,1,.2,1+door_width,1.06,3.4),'pipe')
    for row in range(7):
        block('door_seam',(1,.96,.5+row*.4,1+door_width,1.02,.55+row*.4),'trim')
    for x in (1,door_width+.8):
        block('bollard',(x,.45,.18,x+.18,.63,1.05),'warning')
    block('gutter',(.35,1,height-.12,.65+width,1.14,height+.06),'pipe')
    if variant == 'a':
        block('workshop_window',(6.01,2,1.8,6.07,4.5,3.2),'glass')
        block('workshop_mullion',(6.06,3.2,1.8,6.12,3.3,3.2),'trim')
        block('vent',(.8,4.4,height+.6,1.8,5.3,height+1.6),'pipe')
    elif variant == 'b':
        block('clerestory',(1,1.04,4.1,5.5,1.15,4.8),'glass')
        block('loading_canopy',(.65,.3,3.7,5.85,1.5,3.9),'trim')
        for x in (1,4.8):
            block('crate',(x,.2,.18,x+.7,.85,.85),'tank')
        block('roof_plant',(2,3.5,height+.2,4,5,height+1),'pipe')
    else:
        cylinder('tank',5,4.6,1.05,.18,4.2)
        for z in (.5,2,3.8):
            cylinder('tank_band',5,4.6,1.10,z,z+.12,'pipe')
        cylinder('tank_cap',5,4.6,1.12,4.2,4.4,'trim')
        cylinder('stack',2.5,4.8,.4,height,8,'stack')
        cylinder('stack_rim',2.5,4.8,.48,7.75,8,'pipe')
        block('feed_pipe',(3.5,4.3,2.5,4.3,4.55,2.75),'pipe')
        block('service_box',(4.5,1.8,.18,5.7,2.8,1.7),'trim')
    mats = {key: material(f'{name}_{key}', colour) for key,colour in {
        'shed':INDUSTRY_SHED, 'trim':INDUSTRY_TRIM, 'pipe':PIPE,
        'tank':TANK, 'yard':YARD, 'glass':GLASS, 'stack':STACK,
        'warning':(.85,.58,.12,1),
    }.items()}
    export_parts(name,parts,mats,f'1x1 {variant}')
    return name, {'kind':'flat','deckY':height}


def works_specs(prefix):
    """Industry and the military take the same deep lots as a farm. One layout per size, so a
    row of them does not read as the same building stamped four times."""
    for frontage in range(1, 5):
        yield (f"{prefix}_{frontage}x4", frontage * CELL - 1.5, 4 * CELL - 1.5, frontage)


def build_industrial(name, w, d, variant, layout="a"):
    """1 compact tank depot, 2 boiler works, 3 freight warehouse, 4 integrated works."""
    clear_scene()
    parts = []

    def block(label, corners, mat="shed"):
        parts.append((box(f"{name}_{label}", *corners), mat))

    def cylinder(label, x, y, radius, bottom, top, mat="tank"):
        parts.append((prism(f"{name}_{label}", x, y, radius, bottom, top, 20), mat))

    block("yard", (0, 0, 0, w, d, .18), "yard")
    shed_w = min(w - .6, 18)
    block("shed", (.3, 1, .18, .3 + shed_w, 9, 7.5))
    if layout == "b":
        for bay in range(3):
            parts.append((gabled_roof_at(f"{name}_roof_{bay}", .2, .9+bay*8.2/3, shed_w+.2, 8.2/3, 7.5, 2.2), "trim"))
    elif layout == "c":
        block("office_roof", (.2,.9,7.5,shed_w+.4,9.1,7.8), "trim")
        block("office_glass", (.6,.85,5.2,shed_w,1,7), "glass")
        for x in range(1, int(shed_w), 2):
            block("office_pier", (x,.78,5,x+.16,1,7.5), "trim")
    else:
        parts.append((gabled_roof_at(f"{name}_roof", .2, .9, shed_w + .2, 8.2, 7.5, 1.8), "trim"))
    for x in range(1, int(shed_w) + 1):
        block("facade_rib", (x, .92, .3, x + .07, 1.02, 7.5), "pipe")
        block("rear_rib", (x, 8.98, .3, x + .07, 9.08, 7.5), "pipe")
    for y in range(2, 9):
        for x in (.24, shed_w + .3):
            block("side_rib", (x, y, .3, x + .07, y + .08, 7.5), "pipe")
    for i in range(max(1, int(shed_w // 6))):
        x = 1 + i * 6
        door_w = min(4, shed_w - x - .3)
        block("loading_frame", (x - .12, .78, .18, x + door_w + .12, 1.01, 4.8), "trim")
        block("loading_door", (x, .73, .2, x + door_w, .79, 4.6), "pipe")
        for row in range(8):
            block("door_seam", (x, .70, .45 + row * .5, x + door_w, .74, .49 + row * .5), "trim")
        for dx in (0, door_w - .18):
            block("bollard", (x + dx, .3, .18, x + dx + .18, .5, 1.25), "warning")
        if layout != "c":
            block("clerestory", (x, .8, 5.6, x + door_w, .94, 6.7), "glass")
            for dx in range(1, int(door_w)):
                block("window_bar", (x + dx, .76, 5.6, x + dx + .06, .82, 6.7), "trim")
    block("gutter", (.2, .75, 7.4, shed_w + .4, .94, 7.58), "pipe")
    cylinder("downpipe", .45, .6, .085, .18, 7.5, "pipe")

    equipment = 3 if layout == "b" else 1 if layout == "c" else variant
    if equipment in (2, 4):
        block("boiler", (.5, 10, .18, 7, 16, 5))
        cylinder("stack", 4.8, 13, 1.25, .18, 18.6, "stack")
        for height in (5, 10, 15, 18.3):
            cylinder("stack_band", 4.8, 13, 1.32, height, height + .25, "pipe")
        cylinder("stack_mouth", 4.8, 13, 1.1, 18.61, 18.64, "trim")
        for height in range(1, 18):
            block("ladder_rung", (4.4, 11.61, height, 5.2, 11.70, height + .06), "pipe")
        for x in (4.4, 5.15):
            block("ladder_rail", (x, 11.60, .5, x + .05, 11.69, 18), "pipe")
    if equipment in (1, 4):
        # The old 3 m radius skipped the narrow depot entirely and intersected the 4x4 warehouse.
        radius = min(2.5, (w - 1.2) / 2)
        cx = w / 2 if equipment == 1 else w - 4
        for cy in (18, 25):
            cylinder("tank", cx, cy, radius, .18, 7.8)
            cylinder("tank_cap", cx, cy, radius + .1, 7.8, 8.05, "pipe")
            cylinder("tank_hatch", cx, cy, .5, 8.05, 8.4, "trim")
            for height in (.5, 4, 7.5):
                cylinder("tank_ring", cx, cy, radius + .04, height, height + .12, "pipe")
            block("tank_outlet", (cx - .2, cy - radius - .6, .6, cx + .2, cy, 1), "pipe")
        for x in (cx - radius - .3, cx + radius + .15):
            block("bund_side", (x, 14.9, .18, x + .15, 28.1, .7), "trim")
        for y in (14.9, 28):
            block("bund_end", (cx - radius - .3, y, .18, cx + radius + .3, y + .15, .7), "trim")
    if equipment in (3, 4):
        store_w = w - 1.6 if equipment == 3 else w * .55
        block("warehouse", (.8, 20, .18, .8 + store_w, d - 1, 6))
        parts.append((gabled_roof_at(f"{name}_warehouse_roof", .7, 19.9, store_w + .2, d - 20.8, 6, 1.5), "trim"))
        block("dock", (.8, 18.5, .18, .8 + store_w, 20, 1), "pipe")
        for x in range(2, int(store_w) - 2, 5):
            block("freight_door", (x, 19.9, 1, x + 3, 20.02, 4.8), "trim")
            block("dock_edge", (x, 18.46, .8, x + 3, 18.52, 1), "warning")
        for y in range(21, int(d) - 1):
            block("warehouse_rib", (.72, y, .18, .82, y + .09, 6), "pipe")
    if equipment in (2, 3, 4):
        # Elevated pipes run across the service yard, clear of the tanks and freight doors.
        rack_end = w * .55 + 1 if equipment == 4 else w - 1
        for y in (17, 17.65):
            pipe = prism(f"{name}_pipe", 0, 0, .18, 0, rack_end - 1, 12)
            for vertex in pipe.data.vertices:
                x, py, z = vertex.co
                vertex.co = (1 + z, y + py, 5.7 - x)
            parts.append((pipe, "pipe"))
        block("service_walkway", (1, 16.2, 5.2, rack_end, 16.8, 5.32), "pipe")
        for y in (16.2, 16.75):
            block("walkway_rail", (1, y, 6.15, rack_end, y + .05, 6.22), "pipe")
            for x in range(1, int(rack_end) + 1, 2):
                block("walkway_post", (x, y, 5.32, x + .05, y + .05, 6.2), "pipe")
        for height in range(1, 11):
            block("access_rung", (1, 16.1, height * .5, 1.6, 16.18, height * .5 + .05), "pipe")
        for x in (1, 1.55):
            block("access_rail", (x, 16.1, .18, x + .05, 16.18, 6.2), "pipe")
        for x in (1, rack_end):
            for y in (16.8, 17.85):
                block("rack_leg", (x - .08, y, .18, x + .08, y + .12, 6), "trim")
            block("rack_beam", (x - .12, 16.7, 5.4, x + .12, 18.1, 5.55), "trim")
    if layout == "c":
        cylinder("silo", w/2, 11.7, min(1.4, w*.18), .18, 11.5)
        cylinder("silo_cap", w/2, 11.7, min(1.4, w*.18)+.06, 11.5, 11.8, "pipe")
    mats = {key: material(f"{name}_{key}", colour) for key, colour in {
        "shed": INDUSTRY_SHED, "trim": INDUSTRY_TRIM, "tank": TANK,
        "stack": STACK, "pipe": PIPE, "yard": YARD,
        "glass": GLASS, "warning": (.85, .58, .12, 1),
    }.items()}
    export_parts(name, parts, mats, f"works {w} x {d} m")


def build_military(name, w, d, variant, layout="a"):
    """Air-defense batteries: field post, hangar, magazine, and regional command."""
    from mathutils import Vector

    clear_scene()
    parts = []

    def block(label, corners, mat="wall", bevel=0):
        obj = box(f"{name}_{label}", *corners)
        if bevel:
            modifier = obj.modifiers.new("machined edges", "BEVEL")
            modifier.width = bevel
            modifier.segments = 2
            bpy.context.view_layer.objects.active = obj
            bpy.ops.object.modifier_apply(modifier=modifier.name)
        parts.append((obj, mat))
        return obj

    def rod(label, start, end, radius, mat="steel", sides=12):
        a, b = Vector(start), Vector(end)
        obj = prism(f"{name}_{label}", 0, 0, radius, 0, (b-a).length, sides)
        rotation = (b-a).to_track_quat('Z', 'Y')
        for vert in obj.data.vertices:
            vert.co = rotation @ vert.co + a
        for poly in obj.data.polygons:
            poly.use_smooth = len(poly.vertices) == 4
        parts.append((obj, mat))

    block("foundation", (0,0,0,w,d,.22), "concrete")
    block("apron", (.3,.4,.22,w-.3,d-.4,.25), "asphalt")
    for x in range(4, int(w), 4):
        block("slab_joint", (x,.5,.251,x+.035,d-.5,.26), "steel")
    for y in range(4, int(d), 4):
        block("slab_joint", (.5,y,.251,w-.5,y+.035,.26), "steel")

    # Front command cabin keeps the existing 3.6 m roof-deck contract.
    cabin_w = min(w-1.6, 6 if layout == "b" else 9)
    block("command", (.8,1.2,.25,.8+cabin_w,7.5,3.6), bevel=.12)
    block("roof", (.65,1.05,3.6,.95+cabin_w,7.65,3.82), "steel")
    for x in range(1, int(cabin_w)+1):
        block("roof_seam", (x,1.1,3.82,x+.055,7.6,3.9), "trim")
    block("door_frame", (1.05,1.03,.3,2.4,1.24,2.75), "steel")
    block("door", (1.2,.99,.3,2.25,1.05,2.55), "trim")
    block("door_glass", (1.36,.965,1.55,2.09,.99,2.22), "glass")
    for x in range(3, int(cabin_w), 2):
        block("window_frame", (x,1.03,1.4,x+1.35,1.24,2.6), "steel")
        block("window", (x+.1,1,1.52,x+1.25,1.03,2.48), "glass")
    block("hvac", (1.2,5.3,3.82,2.6,6.8,4.5), "concrete", .08)
    for y in range(6):
        block("hvac_louvre", (1.3,5.4+y*.2,4.51,2.5,5.47+y*.2,4.54), "steel")
    rod("aerial", (cabin_w,6.7,3.8),(cabin_w,6.7,7.1),.045)
    rod("aerial_cross", (cabin_w-.6,6.7,6.5),(cabin_w+.6,6.7,6.5),.035)

    # The main launcher stands at the parcel centre, where gameplay originates salvos.
    cx, cy = w/2, d/2
    block("launch_pad", (cx-2.65,cy-3.4,.26,cx+2.65,cy+3.4,.42), "concrete")
    for side in (-1,1):
        for i in range(7):
            block("warning", (cx+side*2.35-.12,cy-3+i*.9,.43,cx+side*2.35+.12,cy-2.5+i*.9,.445), "warning")
    rod("turntable", (cx,cy,.42),(cx,cy,1.05),1.7,"steel",24)
    rod("bearing", (cx,cy,1.05),(cx,cy,1.45),1.3,"trim",24)
    block("pedestal", (cx-.7,cy-.75,1.3,cx+.7,cy+.75,3.4), "wall", .12)
    rod("elevation_axle", (cx-1.4,cy,3.2),(cx+1.4,cy,3.2),.35)
    direction = Vector((0,0,1)) if layout == "c" else Vector((0,-.5,.866))
    for side in (-1,1):
        for row in range(3 if layout == "b" else 2):
            start = Vector((cx+side*.57,cy+1+row*.85,2.7+row*.48))
            end = start + direction*5.3
            rod("launch_canister", start,end,.44,"wall",16)
            for fraction in (.06,.55,.92):
                collar = start+direction*(5.3*fraction)
                rod("canister_band",collar,collar+direction*.16,.48,"steel",16)
            rod("canister_mouth",end,end+direction*.07,.36,"dark",16)
            rod("canister_rim",end-direction*.08,end,.46,"warning",16)
    for side in (-1,1):
        rod("hydraulic",(cx+side*.9,cy-.9,1.4),(cx+side*.9,cy-.35,4),.12)
        rod("piston",(cx+side*.9,cy-.35,4),(cx+side*.9,cy-.7,4.65),.07,"light")

    has_hangar = variant in (2,4) if layout == "a" else layout == "b"
    if has_hangar:
        hw = min(w-1.6, 12)
        block("hangar",(.8,22,.25,.8+hw,d-1,5.1),"wall",.15)
        parts.append((gabled_roof_at(f"{name}_hangar_roof",.65,21.85,hw+.3,d-22.7,5.1,1.3),"steel"))
        block("hangar_opening",(1.2,21.9,.3,hw+.4,22.05,4.5),"dark")
        for x in range(2, int(hw)):
            block("door_rib",(x,21.82,.4,x+.07,21.95,4.45),"trim")
        for y in range(23, int(d)-1):
            block("wall_rib",(.7,y,.3,.82,y+.08,5.0),"trim")
        rod("hangar_gutter",(.6,21.8,5.1),(hw+1,21.8,5.1),.09)
    else:
        block("magazine",(.8,23,.25,w-.8,d-1,2.8),"concrete",.25)
        for x in range(1,int(w)-1,3):
            block("blast_door",(x,22.9,.4,min(x+2,w-1),23.05,2.5),"trim")

    # Phased-array radar on a braced tower, above the rear shelter.
    rx, ry = (w-3.2 if variant >= 3 else w/2), d-4
    base = (2.8 if variant in (1,3) else (6.6 if variant==2 else .25)) if layout == "a" else 2.8
    if layout == "b":
        rx, ry = .8 + min(w-1.6,12)/2, (22+d-1)/2
        base = 6.4  # The hangar ridge, directly under the radar legs.
    for sx in (-.6,.6):
        for sy in (-.6,.6):
            rod("radar_leg",(rx+sx,ry+sy,base-abs(sy)*1.3/((d-22.7)/2) if layout == "b" else base),(rx+sx*.45,ry+sy*.45,base+3),.085)
    for level in range(3):
        rod("tower_brace",(rx-.6,ry-.6,base+level),(rx+.6,ry-.6,base+level+1),.045)
    rod("radar_yoke",(rx,ry,base+2.7),(rx,ry,base+3.6),.24)
    if layout == "c":
        rod("radar_disc",(rx,ry-.15,base+4.2),(rx,ry+.12,base+4.2),1.45,"steel",24)
        rod("radar_face",(rx,ry-.20,base+4.2),(rx,ry-.15,base+4.2),1.30,"light",24)
        rod("radar_feed",(rx,ry-.2,base+4.2),(rx,ry-1,base+4.2),.08)
    else:
        block("radar_back",(rx-1.6,ry-.3,base+3.4,rx+1.6,ry+.1,base+5.5),"steel",.1)
        block("radar_face",(rx-1.48,ry-.35,base+3.52,rx+1.48,ry-.30,base+5.38),"light")
        for x in range(8):
            for z in range(5):
                block("radar_element",(rx-1.35+x*.35,ry-.39,base+3.62+z*.33,rx-1.12+x*.35,ry-.35,base+3.83+z*.33),"trim")

    if variant >= 3:
        # Service container and protected fuel tank occupy the unused right-hand apron.
        block("service_container",(w-6,2,.25,w-1,8,3.0),"trim",.08)
        for y in range(11):
            block("container_rib",(w-6.06,2.2+y*.5,.35,w-5.96,2.28+y*.5,2.9),"steel")
        rod("fuel_tank",(w-3,20,1.5),(w-3,23,1.5),.9,"light",20)
        block("fuel_bund",(w-4.4,19,.25,w-1.6,24,.6),"concrete")
    if variant == 4:
        block("motor_chassis",(12,3,.85,15,8,1.4),"steel",.08)
        block("motor_cab",(12,3,1.4,15,5,2.9),"wall",.16)
        block("windscreen",(12.2,2.95,1.9,14.8,3,2.65),"glass")
        block("motor_bed",(12,5,1.4,15,8,1.95),"trim")
        for x in (11.9,15.1):
            for y in (4,7):
                rod("tyre",(x-.17,y,.85),(x+.17,y,.85),.58,"dark",16)

    # Open perimeter fencing leaves the equipment legible from the game camera.
    for x in (.2,w-.2):
        for y in range(9,int(d),3):
            rod("fence_post",(x,y,.25),(x,y,2.55),.065)
        for z in (.8,1.6,2.35):
            rod("fence_wire",(x,8.5,z),(x,d-.5,z),.025)
    for i in range(3):
        x=.5+i*.9
        block("barrier",(x,.1,.25,x+.65,.5,1.1),"concrete",.08)
        block("barrier_marker",(x+.1,.085,.7,x+.5,.1,.9),"warning")

    mats = {
        key: material(f"{name}_{key}",color) for key,color in {
            "wall":(.21,.26,.19,1), "trim":(.105,.14,.115,1),
            "steel":(.12,.15,.16,1), "concrete":(.37,.39,.37,1),
            "asphalt":(.13,.15,.15,1), "warning":(.78,.52,.12,1),
            "glass":(.065,.19,.23,1), "dark":(.025,.032,.03,1),
            "light":(.58,.61,.57,1),
        }.items()
    }
    for key in ("steel","light"):
        bsdf=mats[key].node_tree.nodes["Principled BSDF"]
        bsdf.inputs["Metallic"].default_value=.65
        bsdf.inputs["Roughness"].default_value=.42
    export_parts(name, parts, mats, f"compound {w} x {d} m")


def farm_specs():
    """Farms take the same deep lots the industrial frontage does, one holding per size:
    1 market garden, 2 grain farm, 3 orchard, 4 livestock."""
    for frontage in range(1, 5):
        yield (f"farm_{frontage}x4", frontage * CELL - 1.5, 4 * CELL - 1.5, frontage)


def build_farm(name, w, d, variant, layout="a"):
    clear_scene()
    import math

    parts = []
    def block(label, corners, mat="barn"):
        parts.append((box(f"{name}_{label}", *corners), mat))

    # Yard anchors the exact parcel bounds; detail stays within these edges.
    block("yard", (0, 0, 0, w, FARM_YARD_DEPTH, .15), "soil")
    # Crop family and barn proportions vary together; all layouts must fit the 1x4 holding.
    if layout != "a":
        variant = (variant - 1 + (1 if layout == "b" else 2)) % 4 + 1
    barn_w = min(w * (.45 if layout == "b" else .75 if layout == "c" else .62), 13.0)
    barn_d = 6.5 if layout == "b" else 8.5
    barn_h = 5.0
    ridge = 4 if layout == "c" else 3.4
    parts.append((box(f"{name}_barn", 0.0, 1.0, 0.0, barn_w, 1.0 + barn_d, barn_h), "barn"))
    parts.append((gabled_roof_at(f"{name}_barn_roof", 0.0, 1.0, barn_w, barn_d, barn_h, ridge), "trim"))
    # The big sliding door, and the white boards a barn is always trimmed with.
    parts.append((box(f"{name}_barn_door", barn_w * 0.3, 0.9, 0.0, barn_w * 0.7, 1.02, barn_h * 0.72), "door"))
    parts.append((box(f"{name}_barn_band", 0.0, 0.95, barn_h - 0.5, barn_w + 0.05, 1.05, barn_h - 0.2), "trim"))
    for x in range(1, int(barn_w * 2)):
        block("plank", (x * .5, .95, .2, x * .5 + .045, 1.02, 4.8), "door")
    for y in range(2, int(1+barn_d)+1):
        block("side_plank", (barn_w - .02, y, .2, barn_w + .035, y + .045, 4.9), "door")
    for x in (barn_w * .3, barn_w * .7):
        block("door_jamb", (x - .07, .78, .15, x + .07, .92, 3.7), "trim")
    for z in (.5, 3.1):
        block("door_brace", (barn_w * .3, .78, z, barn_w * .7, .92, z + .12), "trim")
    block("loft_window", (barn_w * .4, .9, 4, barn_w * .6, 1, 4.55), "door")
    block("gutter", (.05, .8, 4.95, barn_w, 1.02, 5.08), "trim")
    if w > barn_w + 4.0:
        # Silo and a low feed shed fill the rest of the yard.
        sx = barn_w + 1.5
        parts.append((prism(f"{name}_silo", sx + 1.6, 3.6, 1.6, .15, 10.5, 20), "silo"))
        cap = prism(f"{name}_silo_cap", sx + 1.6, 3.6, 1.65, 10.5, 11.6, 20)
        for vertex in cap.data.vertices:
            if vertex.co.z > 11:
                vertex.co.x = sx + 1.6 + (vertex.co.x - sx - 1.6) * .12
                vertex.co.y = 3.6 + (vertex.co.y - 3.6) * .12
        parts.append((cap, "trim"))
        for z in (1, 4, 7, 10):
            parts.append((prism(f"{name}_silo_band", sx + 1.6, 3.6, 1.64, z, z + .12, 20), "trim"))
        if w > sx + 8.0:
            parts.append((box(f"{name}_shed", sx + 4.2, 1.5, 0.0, w - 0.5, 6.5, 3.2), "barn"))
            parts.append((gabled_roof_at(f"{name}_shed_roof", sx + 4.2, 1.5, w - 0.5 - (sx + 4.2), 5.0, 3.2, 1.4), "trim"))
    # The field: bare soil, then whatever this holding grows on it.
    parts.append((box(f"{name}_soil", 0.0, FARM_YARD_DEPTH, 0.0, w, d, 0.3), "soil"))
    if variant == 1:
        # Market garden: polytunnels down the plot, with a bed between each pair.
        row = 0
        y = FARM_YARD_DEPTH + 1.0
        while y + 4.0 < d:
            # Barrel roof extruded along X, with outward winding and opaque polythene.
            vertices = []
            for x in (.6, w - .6):
                for step in range(9):
                    angle = math.pi * step / 8
                    vertices.append((x, y + 1.5 - 1.5 * math.cos(angle), .3 + 2.1 * math.sin(angle)))
            faces = [(i, i + 9, i + 10, i + 1) for i in range(8)]
            faces += [tuple(range(9)), tuple(range(17, 8, -1))]
            mesh = bpy.data.meshes.new(f"{name}_tunnel_{row}")
            mesh.from_pydata(vertices, [], faces)
            mesh.update()
            obj = bpy.data.objects.new(mesh.name, mesh)
            bpy.context.scene.collection.objects.link(obj)
            parts.append((obj, "tunnel"))
            for x in (.6, w / 2, w - .6):
                # A thin arch repeats the same profile, slightly above the skin.
                for step in range(8):
                    angle, next_angle = math.pi * step / 8, math.pi * (step + 1) / 8
                    ya, za = y + 1.5 - 1.5 * math.cos(angle), .32 + 2.1 * math.sin(angle)
                    yb, zb = y + 1.5 - 1.5 * math.cos(next_angle), .32 + 2.1 * math.sin(next_angle)
                    rib_mesh = bpy.data.meshes.new(f"{name}_hoop")
                    rib_mesh.from_pydata([(x-.035,ya,za),(x+.035,ya,za),(x+.035,yb,zb),(x-.035,yb,zb)], [], [(0,1,2,3)])
                    rib_mesh.update()
                    rib = bpy.data.objects.new(rib_mesh.name, rib_mesh)
                    bpy.context.scene.collection.objects.link(rib)
                    parts.append((rib, "trim"))
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
                for lobe, dx in enumerate((-.45, .45)):
                    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=1)
                    crown = bpy.context.object
                    crown.name = f"{name}_canopy_{row}_{i}_{lobe}"
                    for vertex in crown.data.vertices:
                        vertex.co = (x + dx + vertex.co.x * 1.1, y + vertex.co.y * 1.2,
                                     2.5 + ((row + i + lobe) % 3) * .25 + vertex.co.z * 1.35)
                    parts.append((crown, "orchard"))
                x += 4.0
                i += 1
            y += 4.0
            row += 1
    elif variant == 4:
        # Livestock: open pasture, a field shelter and hay bales, fenced into two paddocks.
        parts.append((box(f"{name}_pasture", 0.5, FARM_YARD_DEPTH + 0.5, 0.25, w - 0.5, d - 0.5, 0.55), "crop2"))
        split_y = (FARM_YARD_DEPTH + d) / 2
        for x in range(1, int(w), 3):
            block("paddock_post", (x, split_y, .55, x + .15, split_y + .15, 1.85), "trim")
        for z in (1, 1.65):
            for left, right in ((.5, w / 2 - 1), (w / 2 + 1, w - .5)):
                block("paddock_rail", (left, split_y, z, right, split_y + .1, z + .12), "trim")
        block("trough", (w - 6, 14, .55, w - 2, 15.3, 1.15), "silo")
        block("water", (w - 5.85, 14.15, 1.16, w - 2.15, 15.15, 1.18), "water")
        for x in (.8, 5.8):
            for y in (FARM_YARD_DEPTH + 2, FARM_YARD_DEPTH + 5.8):
                block("shelter_post", (x, y, .55, x + .2, y + .2, 2.6))
        block("shelter_back", (.8, FARM_YARD_DEPTH + 5.8, .55, 6, FARM_YARD_DEPTH + 6, 2.6))
        parts.append((gabled_roof_at(f"{name}_shelter_roof", 0.8, FARM_YARD_DEPTH + 2.0, min(w - 1.6, 5.2), 4.0, 2.6, 1.0), "trim"))
        for i in range(3):
            x = 1.2 + i * 3.2
            if x + 2.2 > w:
                break
            bale = prism(f"{name}_bale_{i}", 0, 0, 1, 0, 2, 12)
            for vertex in bale.data.vertices:
                bx, by, bz = vertex.co
                vertex.co = (x + bz, d - 3 + by, 1.55 - bx)
            parts.append((bale, "hay"))
    else:
        row = 0
        y = FARM_YARD_DEPTH + 0.9
        while y + 1.4 < d:
            # Tall enough to read as a crop from the camera's usual height, not a stripe on the dirt.
            for strip in range(3):
                block("crop_row", (.5, y + strip * .45, .3, w - .5, y + strip * .45 + .28,
                                   1.05 + ((row + strip) % 3) * .12), "crop1")
            y += 2.4
            row += 1
    # Open rails, not continuous solid walls: keep the field visible from street level.
    for x in (.15, w - .3):
        for y in range(int(FARM_YARD_DEPTH), int(d), 3):
            block("fence_post", (x, y, .3, x + .15, y + .15, 1.7), "trim")
        for z in (.85, 1.4):
            block("fence_rail", (x, FARM_YARD_DEPTH, z, x + .1, d - .2, z + .12), "trim")
    for x in range(1, int(w), 3):
        block("rear_post", (x, d - .3, .3, x + .15, d - .15, 1.7), "trim")
    for z in (.85, 1.4):
        block("rear_rail", (.15, d - .3, z, w - .15, d - .2, z + .12), "trim")
    if variant == 3:
        for i in range(3):
            block("fruit_crate", (1 + i * 1.5, 10, .15, 2.2 + i * 1.5, 10.9, .85), "barn")
            for z in (.3, .55):
                block("crate_slat", (1 + i * 1.5, 9.96, z, 2.2 + i * 1.5, 10.02, z + .07), "trim")

    mats = {
        "barn": material(name, BARN),
        "trim": material(f"{name}_trim", BARN_TRIM),
        "door": material(f"{name}_door", DOOR),
        "silo": material(f"{name}_silo", SILO),
        "soil": material(f"{name}_soil", SOIL),
    }
    mats["water"] = material(f"{name}_water", (.16, .32, .36, 1))
    mats["tunnel"] = material(f"{name}_tunnel", TUNNEL)
    mats["orchard"] = material(f"{name}_orchard", ORCHARD)
    mats["hay"] = material(f"{name}_hay", HAY)
    for i, colour in enumerate(CROP):
        mats[f"crop{i}"] = material(f"{name}_crop{i}", colour)
    export_parts(name, parts, mats, f"farm {w} x {d} m")


def urban_specs():
    # a is always pedestrian-safe; b is an urban mid-rise. Towers use zone-eligible sizes.
    for kind in ('residential', 'commercial'):
        for frontage in range(1, 5):
            for depth in range(1, 5):
                for variant in ('a', 'b', 'court', 'terraces'):
                    yield f'{kind}_{frontage}x{depth}_{variant}', frontage * CELL - 1.5, depth * CELL - 1.5, kind, variant
    for kind, size in (('residential', (3, 3)), ('residential', (4, 4)),
                       ('commercial', (3, 4)), ('commercial', (4, 3))):
        f, d = size
        for variant in ('tower', 'tower_steps', 'tower_offset', 'tower_crown', 'tower_split'):
            yield f'{kind}_{f}x{d}_{variant}', f * CELL - 1.5, d * CELL - 1.5, kind, variant


def build_urban(name, w, d, kind, variant):
    clear_scene()
    parts = []
    residential = kind == 'residential'
    large = min(w, d) >= 14
    pitched = residential and variant == 'a' and min(w, d) < 14
    # Volumes are also the roof contract: no second hand-maintained height formula.
    h = (9 if large else 6) if residential else (6 if large else 4.5)
    volumes = [(0, 0, w, d, 0, h)]
    if variant == 'b':
        if large:
            volumes = [(0, 0, w, d, 0, 9),
                       (w*.08, d*.12, w*.72, d*.72, 9, 27 if residential else 39)]
        else:
            volumes = [(0, 0, w, d, 0, 15 if residential else 18)]
    elif variant == 'court':
        # Street wing and two return wings enclose a real, lower patio deck.
        top = 12 if residential else 9
        volumes = [(0, 0, w, d, 0, 3)]
        if large:
            volumes += [(0, 0, w, d*.28, 3, top),
                        (0, d*.28, w*.27, d*.72, 3, top),
                        (w*.73, d*.28, w*.27, d*.72, 3, top-3)]
        else:
            volumes += [(0, 0, w, d*.62, 3, top-3),
                        (w*.12, d*.62, w*.76, d*.38, 3, 6)]
    elif variant == 'terraces':
        # Deep, inhabitable setbacks; narrow lots still have three distinct roof levels.
        step = 6 if residential else 9
        volumes = [(0, 0, w, d, 0, step)]
        for level in range(1, 4):
            volumes.append((w*.06*level, d*.17*level, w*(1-.12*level), d*(1-.17*level),
                            step*level, step*(level+1)))
    elif variant == 'tower_crown':
        # Art-deco shoulders and a narrow lantern, distinct from the broad stepped tower.
        shoulder = 72 if residential else 96
        volumes = [(0,0,w,d,0,9),
                   (w*.12,d*.14,w*.76,d*.72,9,shoulder),
                   (w*.22,d*.22,w*.56,d*.56,shoulder,shoulder+18),
                   (w*.34,d*.30,w*.32,d*.40,shoulder+18,shoulder+30),
                   (w*.41,d*.38,w*.18,d*.24,shoulder+30,shoulder+39)]
    elif variant == 'tower_split':
        # Unequal parallel shafts and an elevated bridge leave a visible slot in the skyline.
        top = 117 if residential else 129
        volumes = [(0,0,w,d,0,6),
                   (w*.07,d*.16,w*.29,d*.70,6,top),
                   (w*.64,d*.16,w*.29,d*.70,6,top-18),
                   (w*.36,d*.39,w*.28,d*.22,top-42,top-36)]
    elif variant == 'tower_steps':
        # Broad inhabited terraces versus a narrow office crown; decks share the mesh volumes.
        volumes = [(0, 0, w, d, 0, 6)]
        if residential:
            for level in range(4):
                volumes.append((w*(.07+level*.12), d*.14, w*(.86-level*.12), d*.70,
                                6+level*18, 24+level*18))
        else:
            volumes += [(w*.14,d*.16,w*.72,d*.68,6,90),
                        (w*.24,d*.24,w*.52,d*.52,90,108),
                        (w*.36,d*.34,w*.28,d*.32,108,120)]
    elif variant == 'tower_offset':
        volumes = [(0, 0, w, d, 0, 6)]
        if residential:
            # An L with unequal wings leaves an open courtyard instead of another central shaft.
            volumes += [(w*.08,d*.10,w*.30,d*.78,6,96),
                        (w*.38,d*.58,w*.54,d*.30,6,66)]
        else:
            # Offset upper shaft sits on a wider lower volume, with a visible shoulder.
            volumes += [(w*.10,d*.12,w*.78,d*.72,6,48),
                        (w*.36,d*.30,w*.52,d*.54,48,114)]
    elif variant == 'tower':
        volumes = [(0, 0, w, d, 0, 9)]
        if residential and w < 25:
            volumes += [(w*.18, d*.18, w*.64, d*.64, 9, 63)]
        elif residential:
            volumes += [(w*.08, d*.16, w*.32, d*.68, 9, 72),
                        (w*.60, d*.16, w*.32, d*.68, 9, 84)]
        elif w < 25:
            volumes += [(w*.08, d*.08, w*.84, d*.84, 9, 63),
                        (w*.19, d*.19, w*.62, d*.62, 63, 96),
                        (w*.28, d*.28, w*.44, d*.44, 96, 108)]
        else:
            volumes += [(w*.25, d*.20, w*.50, d*.60, 9, 132),
                        (w*.08, d*.25, w*.17, d*.50, 9, 36)]

    for i, (x, y, sw, sd, base, top) in enumerate(volumes):
        label = f'{name}_{i}'
        parts.append((box(label, x, y, base, x+sw, y+sd, top), 'wall'))
        if variant in ('a', 'court'):
            add_windows(parts, label, sw, sd, top-base, kind, x, y, base)
        else:
            # Continuous glazing with full-height piers gives a readable facade at city scale.
            # Floor bands and balcony slabs cost a few boxes per floor, not per window pane.
            for z in range(int(base)+3, int(top)-1, 3):
                if residential:
                    for span, front in ((sw, True), (sd, False)):
                        count = max(1, int(span//(5 if variant == "tower_split" else 3.5)))
                        for col in range(count):
                            centre = (col+.5)*span/count
                            for side in (0, sd) if front else (0, sw):
                                corners = (x+centre-.9,y+side-.12,z,x+centre+.9,y+side+.12,z+1.9) if front else (x+side-.12,y+centre-.9,z,x+side+.12,y+centre+.9,z+1.9)
                                parts.append((box(label+'_window', *corners), 'glass'))
                else:
                    for corners in ((x+.45,y-.12,z,x+sw-.45,y-.06,z+1.9),
                                    (x+.45,y+sd+.06,z,x+sw-.45,y+sd+.12,z+1.9),
                                    (x-.12,y+.45,z,x-.06,y+sd-.45,z+1.9),
                                    (x+sw+.06,y+.45,z,x+sw+.12,y+sd-.45,z+1.9)):
                        parts.append((box(label+'_glazing', *corners), 'glass'))
                if residential and (variant not in ('tower_offset', 'tower_split', 'tower_crown') or (variant != 'tower_crown' and z % 9 == 0)):
                    for by in (y-.60, y+sd):
                        parts.append((box(label+'_balcony', x-.15,by,z-.2,x+sw+.15,by+.60,z), 'trim'))
                        rail_y = by if by < y else by+.48
                        parts.append((box(label+'_rail', x-.15,rail_y,z+.65,x+sw+.15,rail_y+.12,z+.85), 'trim'))
                        for bx in (x, x+sw):
                            parts.append((box(label+'_rail_end',bx-.05,by,z,bx+.05,by+.6,z+.85),'trim'))
                elif not residential and variant not in ('tower_steps', 'tower_crown'):
                    for by in (y-.16, y+sd):
                        parts.append((box(label+'_spandrel',x,by,z+1.95,x+sw,by+.16,z+2.15),'trim'))
            # Offset towers read horizontally; crowned offices use strong vertical fins.
            for span, horizontal in (() if variant in ('tower_offset', 'tower_split', 'terraces') else ((sw, True), (sd, False))):
                for pier in range(max(1, int(span//4))+1):
                    offset = pier * span/max(1, int(span//4))
                    for side in (0, sd) if horizontal else (0, sw):
                        corners = (x+offset-.10,y+side-.18,base,x+offset+.10,y+side+.18,top) if horizontal else (x+side-.18,y+offset-.10,base,x+side+.18,y+offset+.10,top)
                        parts.append((box(label+'_pier',*corners),'trim'))
        if variant in ('court', 'tower_crown'):
            # Projecting masonry cornices make these facades read differently from balcony slabs.
            for z in (top-.65, top-.25):
                for corners in ((x-.2,y-.2,z,x+sw+.2,y+.1,z+.18),
                                (x-.2,y+sd-.1,z,x+sw+.2,y+sd+.2,z+.18),
                                (x-.2,y,z,x+.1,y+sd,z+.18),
                                (x+sw-.1,y,z,x+sw+.2,y+sd,z+.18)):
                    parts.append((box(label+'_cornice',*corners),'trim'))
        if pitched:
            parts.append((gabled_roof_at(label+'_roof',x,y,sw,sd,top,2.5),'trim'))
        else:
            add_parapet(parts,label,sw,sd,top,x,y)
    add_street_level(parts,name,w,kind)
    # Accent entrance and visible roof plant are authored, while runtime props use these decks.
    if variant != 'a':
        parts.append((box(name+'_canopy',w*.30,-.65,2.7,w*.70,.15,3.0),'awning'))
    x,y,sw,sd,base,top = max(volumes,key=lambda volume: volume[5])
    if not pitched:
        parts.append((box(name+'_roof_plant',x+sw*.15,y+sd*.15,top,x+sw*.15+1.5,y+sd*.15+1.2,top+1.5),'trim'))
    colour = ((.70,.57,.46,1) if variant == 'a' else (.78,.76,.68,1)) if residential else ((.66,.68,.70,1) if variant == 'a' else (.30,.40,.48,1))
    if variant == 'tower_steps':
        colour = (.68,.42,.29,1) if residential else (.62,.65,.61,1)
    elif variant == 'tower_offset':
        colour = (.83,.81,.72,1) if residential else (.23,.32,.39,1)
    if variant == 'court':
        colour = (.64,.34,.23,1) if residential else (.76,.66,.49,1)
    elif variant == 'terraces':
        colour = (.89,.85,.74,1) if residential else (.42,.52,.54,1)
    elif variant == 'tower_crown':
        colour = (.78,.66,.46,1) if residential else (.62,.57,.45,1)
    elif variant == 'tower_split':
        colour = (.66,.71,.73,1) if residential else (.21,.36,.43,1)
    mats = {key: material(f'{name}_{key}', value) for key,value in {
        'wall':colour, 'glass':GLASS, 'trim':trim_colour(colour), 'door':DOOR,
        'sign':SIGN, 'awning':AWNING,
    }.items()}
    export_parts(name,parts,mats,f'{kind} {variant}, {top} m deck')
    if pitched:
        return {'kind':'pitched','deckY':top,'ridgeY':top+2.5,'ridgeZ':-d/2}
    return {'kind':'terraced','width':w,'decks':[
        {'minX':x,'maxX':x+sw,'minZ':-y-sd,'maxZ':-y,'deckY':top}
        for x,y,sw,sd,base,top in volumes]}


def lot_roof(w, d, h, roof):
    if roof > 0:
        return {"kind": "pitched", "deckY": h, "ridgeY": h + roof, "ridgeZ": -d / 2}
    elif w * d >= CELL * CELL * 6:
        return {
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
        return {"kind": "flat", "deckY": h}


def build_variants(manifest, families=("lot", "farm", "industrial", "military")):
    if "lot" in families:
        for name, w, d, *_ in building_specs():
            for variant, h, roof, colour, style in (
                ("gable", 8, 3, (.73,.60,.45,1), "residential"),
                ("slab", 12, 0, (.53,.62,.65,1), "office"),
            ):
                model = f"{name}_{variant}"
                build(model,w,d,h,roof,colour,style)
                manifest["models"][model] = lot_roof(w,d,h,roof)
    for kind, builder in (("farm",build_farm),("industrial",build_industrial),("military",build_military)):
        if kind not in families:
            continue
        for name,w,d,size in works_specs(kind):
            for layout in ("b", "c"):
                model = f"{name}_{layout}"
                builder(model,w,d,size,layout)
                # These compounds receive no runtime roof props, as with the original models.
                manifest["models"][model] = {"kind":"flat","deckY":5 if kind == "farm" else 7.5 if kind == "industrial" else 3.6}


def write_manifest(manifest):
    with open(os.path.join(OUT_DIR, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)
        f.write("\n")


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    path = os.path.join(OUT_DIR, "manifest.json")
    if any(flag in sys.argv for flag in ("--variants-only", "--farms-only", "--military-only", "--lots-only")):
        with open(path, encoding="utf-8") as f:
            manifest = json.load(f)
    if "--variants-only" in sys.argv:
        build_variants(manifest)
        write_manifest(manifest)
        return
    if "--urban-only" in sys.argv or "--towers-only" in sys.argv:
        path = os.path.join(OUT_DIR, "manifest.json")
        with open(path, encoding="utf-8") as f:
            manifest = json.load(f)
        for spec in urban_specs():
            if "--towers-only" in sys.argv and not spec[-1].startswith("tower"):
                continue
            manifest["models"][spec[0]] = build_urban(*spec)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2)
            f.write("\n")
        return
    if "--farms-only" in sys.argv:
        for spec in farm_specs():
            build_farm(*spec)
        build_variants(manifest, ("farm",))
        write_manifest(manifest)
        return
    if "--industrial-only" in sys.argv or "--industrial-small-only" in sys.argv:
        if "--industrial-only" in sys.argv:
            for spec in works_specs("industrial"):
                build_industrial(*spec)
        path = os.path.join(OUT_DIR, "manifest.json")
        with open(path, encoding="utf-8") as f:
            manifest = json.load(f)
        if "--industrial-only" in sys.argv:
            build_variants(manifest, ("industrial",))
        for variant in ('a', 'b', 'c'):
            name, roof = build_small_industrial(variant)
            manifest["models"][name] = roof
        with open(path, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2)
            f.write("\n")
        return
    if "--military-only" in sys.argv:
        for spec in works_specs("military"):
            build_military(*spec)
        build_variants(manifest, ("military",))
        write_manifest(manifest)
        return
    if "--lots-only" in sys.argv:
        # Geometry-only refresh: roof facts remain unchanged and are checked against the GLBs.
        for spec in building_specs():
            build(*spec)
        build_variants(manifest, ("lot",))
        write_manifest(manifest)
        return
    manifest = {"models": {}}
    for spec in building_specs():
        name, w, d, h, roof, *_ = spec
        manifest["models"][name] = lot_roof(w, d, h, roof)
        build(*spec)
    for prefix, builder in (("industrial", build_industrial), ("military", build_military)):
        for name, w, d, variant in works_specs(prefix):
            manifest["models"][name] = {"kind": "flat", "deckY": 7.5 if prefix == "industrial" else 3.6}
            builder(name, w, d, variant)
    for name, w, d, variant in farm_specs():
        # Nothing stands on a barn roof, so the manifest only has to keep the deck flat and low.
        manifest["models"][name] = {"kind": "flat", "deckY": 5.0}
        build_farm(name, w, d, variant)
    for spec in urban_specs():
        manifest["models"][spec[0]] = build_urban(*spec)
    for variant in ('a', 'b', 'c'):
        name, roof = build_small_industrial(variant)
        manifest["models"][name] = roof
    build_variants(manifest)
    write_manifest(manifest)


if __name__ == "__main__":
    main()
    sys.exit(0)
