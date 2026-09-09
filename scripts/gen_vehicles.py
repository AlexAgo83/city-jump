"""Bake the fleet into four instanced parts: paint, coloured trim, head/tail lamps.

Run: /Applications/Blender.app/Contents/MacOS/Blender -b -P scripts/gen_vehicles.py
Kenney Car Kit 3.1 sources are retained under assets/vehicles/kenney (CC0).
Authoring coordinates: X across, Y forward, Z up. Export turns the nose to glTF +Z,
matching Babylon's default glTF conversion and the game's forward direction.
"""
import json
import math
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/vehicles/kenney"
OUT = ROOT / "public/vehicles"
WHITE = (1, 1, 1, 1)
RUBBER = (0.055, 0.065, 0.075, 1)
METAL = (0.42, 0.48, 0.53, 1)
GLASS = (0.12, 0.23, 0.29, 1)
CANVAS = (0.23, 0.28, 0.17, 1)
HAY = (0.64, 0.48, 0.21, 1)
# Widths include mirrors; length includes the load/hitch. Names retain traffic identity.
SPECS = [
    ("saloon", "sedan", 4.7, 2.43, None),
    ("hatchback", "hatchback-sports", 3.73, 2.43, None),
    ("van", "van", 5.35, 2.43, None),
    ("motorcycle", None, 2.2, 0.85, None),
    ("tractor", "tractor", 3.57, 2.07, "agricultural"),
    ("farm trailer", "tractor", 7.5, 2.43, "agricultural"),
    ("tanker", "truck-flat", 7.3, 2.43, "industrial"),
    ("flatbed", "truck-flat", 6.48, 2.43, "industrial"),
    ("apc", None, 5.67, 2.67, "military"),
    ("troop truck", "truck-flat", 6.16, 2.43, "military"),
]


def collect(obj, group, color=WHITE):
    """Bake modifiers and transforms, carrying colours into a single material per part."""
    deps = bpy.context.evaluated_depsgraph_get()
    evaluated = obj.evaluated_get(deps)
    mesh = evaluated.to_mesh()
    mesh.calc_loop_triangles()
    for face in mesh.loop_triangles:
        groups[group].append(([tuple(obj.matrix_world @ mesh.vertices[i].co) for i in face.vertices], color))
    evaluated.to_mesh_clear()
    bpy.data.objects.remove(obj, do_unlink=True)


def box(group, center, size, color=WHITE, bevel=0.04):
    bpy.ops.mesh.primitive_cube_add(size=1, location=center)
    obj = bpy.context.object
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod = obj.modifiers.new("chamfer", "BEVEL")
        mod.width = bevel
        mod.segments = 1
    collect(obj, group, color)


def cylinder(group, center, radius, depth, color=WHITE, axis="X", vertices=12):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=center)
    obj = bpy.context.object
    if axis == "X":
        obj.rotation_euler.y = math.pi / 2
    elif axis == "Y":
        obj.rotation_euler.x = math.pi / 2
    collect(obj, group, color)


def beam(a, b, radius=0.06, color=METAL):
    a, b = Vector(a), Vector(b)
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=radius, depth=(b-a).length, location=(a+b)/2)
    obj = bpy.context.object
    obj.rotation_euler = (b-a).to_track_quat("Z", "Y").to_euler()
    collect(obj, "trim", color)


def wheel(x, y, radius=0.45, z=None):
    z = radius if z is None else z
    cylinder("trim", (x, y, z), radius, 0.26, RUBBER)
    cylinder("trim", (x + (0.14 if x >= 0 else -0.14), y, z), radius * 0.52, 0.025, METAL)


def import_kenney(source, length, width):
    bpy.ops.import_scene.gltf(filepath=str(SOURCE / f"{source}.glb"))
    objects = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    image = next(image for image in bpy.data.images if image.size[0] > 0)
    pixels, (iw, ih) = list(image.pixels), image.size
    points = [obj.matrix_world @ vertex.co for obj in objects for vertex in obj.data.vertices]
    lo = Vector(tuple(min(p[i] for p in points) for i in range(3)))
    hi = Vector(tuple(max(p[i] for p in points) for i in range(3)))
    scale = Vector((width / (hi.x-lo.x), length / (hi.y-lo.y), width / (hi.x-lo.x)))
    for obj in objects:
        mesh = obj.data
        mesh.calc_loop_triangles()
        for face in mesh.loop_triangles:
            uv = sum((mesh.uv_layers.active.data[i].uv for i in face.loops), Vector((0, 0))) / 3
            px, py = min(iw-1, max(0, int(uv.x*iw))), min(ih-1, max(0, int(uv.y*ih)))
            color = tuple(pixels[(py*iw+px)*4:(py*iw+px)*4+3]) + (1,)
            group = "trim"
            if obj.name == "body":
                # Fixed regions of Kenney's shipped palette, not a colour guess at runtime.
                if uv.y < 0.25 and uv.x < 0.125:
                    color = GLASS
                elif uv.y < 0.25 and 0.125 <= uv.x < 0.375:
                    group = "head" if uv.x < 0.25 else "tail"
                elif uv.y > 0.5 or (source == "truck-flat" and uv.x > 0.75):
                    group = "body"
            if group != "trim":
                color = WHITE
            vertices = []
            for i in face.vertices:
                p = obj.matrix_world @ mesh.vertices[i].co
                # Kenney faces Blender -Y. Turn it to our +Y and ground the tyres.
                vertices.append((-(p.x-(lo.x+hi.x)/2)*scale.x, -(p.y-(lo.y+hi.y)/2)*scale.y, (p.z-lo.z)*scale.z))
            groups[group].append((vertices, color))
        bpy.data.objects.remove(obj, do_unlink=True)


def move_groups(dy):
    for key in groups:
        groups[key] = [([(x, y+dy, z) for x, y, z in vertices], color) for vertices, color in groups[key]]


def trailer():
    move_groups(2.0)
    # The tractor actually pulls an open trailer; there is no second cab on the load.
    groups["tail"] = []
    box("trim", (0, -0.25, 0.5), (0.2, 1.9, 0.2), METAL)
    box("body", (0, -2.0, 0.75), (2.3, 3.15, 0.22))
    for x in [-1.08, 1.08]:
        for z in [1.0, 1.3]:
            box("body", (x, -2.0, z), (0.12, 3.1, 0.22))
        for y in [-3.3, -2.0, -0.65]:
            box("trim", (x, y, 1.13), (0.14, 0.12, 0.75), METAL)
        for y in [-2.75, -1.8]:
            wheel(x, y, 0.43)
    for y in [-3.52, -0.48]:
        box("body", (0, y, 1.18), (2.25, 0.12, 0.65))
    for y in [-2.85, -1.75, -0.75]:
        box("trim", (0, y, 1.15), (1.9, 0.85, 0.65), HAY, 0.12)
    for x in [-0.85, 0.85]:
        box("tail", (x, -3.61, 0.85), (0.28, 0.08, 0.18))


def truck_details(name, length):
    for x in [-0.9, 0.9]:
        wheel(x, -length * 0.17, 0.48)
    if name == "tanker":
        cylinder("trim", (0, -1.0, 1.8), 0.92, 3.6, (0.62, 0.67, 0.68, 1), "Y", 16)
        for y in [-2.85, 0.85]:
            cylinder("trim", (0, y, 1.8), 0.84, 0.14, METAL, "Y", 16)
        for y in [-2.1, 0.1]:
            cylinder("body", (0, y, 1.8), 0.94, 0.12, axis="Y", vertices=16)
        box("trim", (0, -1, 2.77), (0.48, 3.4, 0.1), METAL)
        for y in [-2, -0.2]:
            cylinder("trim", (0, y, 2.88), 0.23, 0.14, METAL, "Z")
        for y in [-2.6, 0.6]:
            beam((0.38, y, 2.78), (0.38, y, 3.04), 0.025)
        beam((0.38, -2.6, 3.04), (0.38, 0.6, 3.04), 0.025)
    elif name == "flatbed":
        for y in [-1.9, -0.75]:
            box("trim", (-0.4, y, 1.35), (1.0, 0.9, 0.85), (0.4, 0.26, 0.13, 1))
            box("trim", (-0.4, y, 1.79), (1.03, 0.12, 0.04), METAL, 0)
        for x in [0.35, 0.75]:
            cylinder("trim", (x, -1.4, 1.25), 0.17, 2.6, METAL, "Y")
    else:
        box("trim", (0, -1.0, 1.83), (2.12, 3.15, 1.55), CANVAS, 0.28)
        # Opening in the back, visible canvas ribs and a spare tyre behind the cab.
        box("trim", (0, -2.59, 1.65), (1.6, 0.04, 0.92), RUBBER, 0.04)
        box("body", (0, -2.65, 1.05), (2.05, 0.12, 0.42))
        for y in [-2.4, -1.1, 0.4]:
            for x in [-1.065, 1.065]:
                box("trim", (x, y, 1.8), (0.03, 0.06, 1.15), METAL, 0)
        wheel(1.0, 0.95, 0.38, 1.35)


def motorcycle():
    for y in [-0.75, 0.75]:
        wheel(0, y, 0.32)
    box("body", (0, 0.14, 0.85), (0.46, 0.64, 0.34), bevel=0.14)
    box("body", (0, -0.55, 0.77), (0.38, 0.55, 0.14))
    box("trim", (0, -0.3, 0.88), (0.36, 0.56, 0.12), RUBBER)
    cylinder("trim", (0, 0, 0.52), 0.23, 0.4, METAL)
    for x in [-0.16, 0.16]:
        beam((x, 0.75, 0.32), (x, 0.5, 1.07))
        beam((x, -0.75, 0.32), (x, -0.1, 0.65))
    beam((-0.4, 0.48, 1.12), (0.4, 0.48, 1.12), 0.04)
    cylinder("trim", (0.29, -0.35, 0.42), 0.07, 0.85, METAL, "Y")
    # Seated rider: boots, bent legs and arms reach the controls.
    box("trim", (0, -0.22, 1.17), (0.4, 0.3, 0.52), (0.15, 0.22, 0.3, 1), 0.12)
    for x in [-0.24, 0.24]:
        beam((x, -0.25, 0.97), (x, 0.13, 0.77), 0.105, RUBBER)
        beam((x, 0.13, 0.77), (x, -0.08, 0.47), 0.085, RUBBER)
        beam((x, -0.17, 1.35), (x, 0.16, 1.1), 0.065, GLASS)
        beam((x, 0.16, 1.1), (x, 0.48, 1.12), 0.06, GLASS)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=6, radius=0.2, location=(0, -0.15, 1.62))
    collect(bpy.context.object, "body")
    box("trim", (0, 0.015, 1.63), (0.29, 0.07, 0.13), RUBBER)
    box("head", (0, 0.72, 1.02), (0.25, 0.12, 0.22))
    box("tail", (0, -0.82, 0.8), (0.2, 0.08, 0.12))


def apc():
    box("body", (0, 0, 1.03), (2.35, 4.9, 1.1), bevel=0.36)
    box("body", (0, -0.25, 1.87), (1.45, 1.8, 0.58), bevel=0.22)
    cylinder("body", (0, -0.5, 2.2), 0.43, 0.1, axis="Z")
    cylinder("trim", (0, 1.5, 1.95), 0.09, 2.6, RUBBER, "Y")
    for x in [-1.14, 1.14]:
        for y in [-1.8, -0.6, 0.6, 1.8]:
            wheel(x, y, 0.52)
        box("body", (x, 0, 1.16), (0.25, 4.7, 0.23))
        box("trim", (x, -1.65, 1.6), (0.2, 0.9, 0.35), CANVAS)
        beam((x*0.7, -1.7, 1.6), (x*0.7, -1.9, 2.75), 0.022, RUBBER)
    for x in [-0.55, 0.55]:
        box("trim", (x, 1.65, 1.58), (0.5, 0.42, 0.06), GLASS)
        box("head", (x*1.5, 2.44, 1.04), (0.28, 0.08, 0.19))
        box("tail", (x*1.5, -2.44, 1.04), (0.2, 0.08, 0.16))
    box("trim", (0, -2.44, 1.04), (1.15, 0.08, 0.8), CANVAS)


def export(name, length, width, theme):
    points = [p for faces in groups.values() for vertices, _ in faces for p in vertices]
    lo = [min(p[i] for p in points) for i in range(3)]
    hi = [max(p[i] for p in points) for i in range(3)]
    sx, sy = width/(hi[0]-lo[0]), length/(hi[1]-lo[1])
    for group, faces in groups.items():
        assert faces, f"{name}: empty {group}"
        vertices = [(-(x-(lo[0]+hi[0])/2)*sx, -(y-(lo[1]+hi[1])/2)*sy, z-lo[2]) for points, _ in faces for x, y, z in points]
        mesh = bpy.data.meshes.new(group)
        mesh.from_pydata(vertices, [], [(i, i+1, i+2) for i in range(0, len(vertices), 3)])
        colors = mesh.color_attributes.new(name="Color", type="FLOAT_COLOR", domain="CORNER")
        for i, (_, color) in enumerate(faces):
            for j in range(3):
                colors.data[i*3+j].color = color
        obj = bpy.data.objects.new(group, mesh)
        bpy.context.collection.objects.link(obj)
        material = bpy.data.materials.new(group)
        material.diffuse_color = WHITE
        material.use_nodes = True
        attribute = material.node_tree.nodes.new("ShaderNodeVertexColor")
        attribute.layer_name = "Color"
        material.node_tree.links.new(attribute.outputs["Color"], material.node_tree.nodes.get("Principled BSDF").inputs["Base Color"])
        obj.data.materials.append(material)
    file = name.replace(" ", "-") + ".glb"
    bpy.ops.export_scene.gltf(filepath=str(OUT/file), export_format="GLB", export_yup=True,
                             export_materials="EXPORT", export_cameras=False)
    triangles = sum(len(faces) for faces in groups.values())
    print(f"FLEET {name}: {triangles} triangles")
    return dict(name=name, file=file, length=length, width=width, height=round(hi[2]-lo[2], 4), theme=theme, triangles=triangles)


OUT.mkdir(parents=True, exist_ok=True)
catalog = []
for name, source, length, width, theme in SPECS:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    groups = {key: [] for key in ["body", "trim", "head", "tail"]}
    if source:
        import_kenney(source, 3.3 if name == "farm trailer" else length, width)
    if source == "tractor":
        for x in [-0.45, 0.45]:
            box("head", (x, 1.62, 1.1), (0.24, 0.08, 0.2))
    if name == "tractor":
        for x in [-0.65, 0.65]:
            box("tail", (x, -1.65, 0.95), (0.22, 0.08, 0.16))
    if name == "farm trailer":
        trailer()
    elif name in ["tanker", "flatbed", "troop truck"]:
        truck_details(name, length)
    elif name == "motorcycle":
        motorcycle()
    elif name == "apc":
        apc()
    catalog.append(export(name, length, width, theme))
(OUT/"manifest.json").write_text(json.dumps(catalog, indent=2) + "\n")
