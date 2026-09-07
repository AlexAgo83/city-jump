"""Author the articulated kaiju and embedded skin textures in Blender.

    /Applications/Blender.app/Contents/MacOS/Blender -b -P scripts/gen_kaiju.py
"""

import json
import math
import os

import bpy
import numpy as np
from mathutils import Vector
from mathutils.geometry import interpolate_bezier

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "kaiju.glb")
PARTS = []


def texture(name, pixels, noncolor=False):
    image = bpy.data.images.new(name, width=pixels.shape[1], height=pixels.shape[0])
    if noncolor:
        image.colorspace_settings.name = 'Non-Color'
    image.pixels.foreach_set(pixels.astype(np.float32).ravel())
    image.pack()
    return image


def skin_textures():
    # Periodic staggered scales: the same atlas tiles across every articulated part.
    y, x = np.mgrid[0:512, 0:512] / 512 * 8
    row = np.floor(y)
    u = (x + (row % 2) * 0.5) % 1 - 0.5
    v = y % 1 - 0.5
    ridge = np.clip(1 - (np.abs(u) / 0.5) ** 2 - (np.abs(v) / 0.56) ** 4, 0, 1)
    rng = np.random.default_rng(17)
    cells = rng.random((8, 8))
    variation = cells[row.astype(int) % 8, np.floor(x + (row % 2) * .5).astype(int) % 8]
    height = ridge ** 0.65 * (0.55 + variation * .35) + rng.random(x.shape) * 0.12
    color = np.ones((512, 512, 4))
    for i, base in enumerate((0.24, 0.29, 0.255)):
        color[:, :, i] = base * (0.3 + ridge * 0.5 + variation * .35) + rng.random(x.shape) * 0.04
    dx = (np.roll(height, -1, axis=1) - np.roll(height, 1, axis=1)) * 3
    dy = (np.roll(height, -1, axis=0) - np.roll(height, 1, axis=0)) * 3
    normal = np.stack((-dx, -dy, np.ones_like(dx)), axis=-1)
    normal /= np.linalg.norm(normal, axis=-1, keepdims=True)
    rgba = np.ones((512, 512, 4))
    rgba[:, :, :3] = normal * 0.5 + 0.5
    return texture('kaiju_scale_color', color), texture('kaiju_scale_normal', rgba, True)


def material(name, color, roughness=0.75, emission=None, maps=None):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    bsdf = nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    if emission:
        bsdf.inputs['Emission Color'].default_value = (*emission, 1)
        bsdf.inputs['Emission Strength'].default_value = 2.5
    if maps:
        if maps[0]:
            albedo = nodes.new('ShaderNodeTexImage')
            albedo.image = maps[0]
            mat.node_tree.links.new(albedo.outputs['Color'], bsdf.inputs['Base Color'])
        tex = nodes.new('ShaderNodeTexImage')
        tex.image = maps[1]
        normal = nodes.new('ShaderNodeNormalMap')
        normal.inputs['Strength'].default_value = 0.65
        mat.node_tree.links.new(tex.outputs['Color'], normal.inputs['Color'])
        mat.node_tree.links.new(normal.outputs['Normal'], bsdf.inputs['Normal'])
    return mat


def ellipsoid(loc, size, mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, location=loc)
    obj = bpy.context.object
    obj.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    return obj


def tube(points, radii, mat, sides=12):
    verts, faces = [], []
    for i, point in enumerate(points):
        tangent = Vector(points[min(i + 1, len(points) - 1)]) - Vector(points[max(0, i - 1)])
        tangent.normalize()
        axis = tangent.cross(Vector((1, 0, 0)))
        if axis.length < 0.01:
            axis = tangent.cross(Vector((0, 1, 0)))
        axis.normalize()
        other = tangent.cross(axis).normalized()
        for j in range(sides):
            angle = j * math.tau / sides
            verts.append(Vector(point) + radii[i] * (axis * math.cos(angle) + other * math.sin(angle)))
    faces.append(tuple(reversed(range(sides))))
    for i in range(len(points) - 1):
        for j in range(sides):
            a = i * sides + j
            b = i * sides + (j + 1) % sides
            faces.append((a, b, b + sides, a + sides))
    faces.append(tuple(range((len(points) - 1) * sides, len(points) * sides)))
    mesh = bpy.data.meshes.new('organic_surface')
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new('organic_surface', mesh)
    bpy.context.collection.objects.link(obj)
    mesh.materials.append(mat)
    return obj


def join(objects, name, pivot=(0, 0, 0)):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    obj = objects[0]
    obj.name = name
    bpy.context.scene.cursor.location = pivot
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    return obj


def flesh(shapes, mat, name):
    obj = join([ellipsoid(loc, size, mat) for loc, size in shapes], name)
    remesh = obj.modifiers.new('Continuous anatomy', 'REMESH')
    remesh.mode = 'VOXEL'
    remesh.voxel_size = 0.32
    bpy.ops.object.modifier_apply(modifier=remesh.name)
    smooth = obj.modifiers.new('Muscle transitions', 'SMOOTH')
    smooth.factor = 1.25
    smooth.iterations = 5
    bpy.ops.object.modifier_apply(modifier=smooth.name)
    tex = bpy.data.textures.get('dermal folds') or bpy.data.textures.new('dermal folds', type='CLOUDS')
    tex.noise_scale = 0.55
    displace = obj.modifiers.new('Dermal relief', 'DISPLACE')
    displace.texture = tex
    displace.strength = 0.13
    bpy.ops.object.modifier_apply(modifier=displace.name)
    decimate = obj.modifiers.new('Game surface', 'DECIMATE')
    decimate.ratio = 0.32
    bpy.ops.object.modifier_apply(modifier=decimate.name)
    return obj


def finish(objects, name, pivot):
    obj = join(objects, name, pivot)
    for poly in obj.data.polygons:
        poly.use_smooth = True
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.cube_project(cube_size=5.5)
    bpy.ops.object.mode_set(mode='OBJECT')
    PARTS.append(obj)
    return obj


def plate(loc, width, height, mat, lean=0):
    x, y, z = loc
    verts = [(x-width,y,z), (x+width,y,z), (x+width*.65,y+1.2,z+height*.45),
             (x+lean,y+2,z+height), (x-width*.65,y+1.2,z+height*.45),
             (x,y-1.5,z+height*.35), (x,y+2.5,z+height*.3)]
    faces = []
    for i in range(5):
        faces.extend([(i,(i+1)%5,5), ((i+1)%5,i,6)])
    mesh = bpy.data.meshes.new('dorsal_plate')
    mesh.from_pydata(verts, [], faces)
    mesh.materials.append(mat)
    obj = bpy.data.objects.new('dorsal_plate', mesh)
    bpy.context.collection.objects.link(obj)
    bevel = obj.modifiers.new('Worn edges', 'BEVEL')
    bevel.width = .22
    bevel.segments = 2
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    return obj


def scute(loc, size, mat):
    # A low, ridged shield with an uneven rim, rather than a separate spherical bump.
    x, y, z = loc
    w, depth, h = size
    verts = [(x,y-depth,z+h*.15)]
    for i in range(10):
        angle = math.tau*i/10
        radius = 1 + .08*math.sin(i*7.3+z)
        verts.append((x+math.cos(angle)*w*radius,y,z+math.sin(angle)*h*radius))
    verts.append((x,y+depth*.25,z))
    faces = []
    for i in range(10):
        a,b=i+1,(i+1)%10+1
        faces.extend([(0,a,b),(11,b,a)])
    mesh=bpy.data.meshes.new('ridged_scute')
    mesh.from_pydata(verts,[],faces)
    mesh.materials.append(mat)
    obj=bpy.data.objects.new('ridged_scute',mesh)
    bpy.context.collection.objects.link(obj)
    return obj


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    maps = skin_textures()
    skin = material('kaiju_scaled_hide', (.15,.20,.17), maps=maps)
    armor = material('kaiju_basalt_armor', (.09,.13,.115), .64, maps=(None,maps[1]))
    belly = material('kaiju_ventral_scutes', (.135,.16,.115), .82, maps=(None,maps[1]))
    horn = material('kaiju_worn_ivory', (.30,.255,.16), .67)
    mouth = material('kaiju_mouth', (.105,.018,.023), .48)
    eye = material('kaiju_amber_eyes', (.9,.25,.018), .24, (1,.22,.012))
    pupil = material('kaiju_pupils', (.003,.005,.003), .2)
    heat = material('kaiju_dorsal_fissures', (.18,.36,.30), .55, (.08,.48,.31))

    body = [flesh([((0,2,44),(13,11,22)), ((0,0,59),(16,12,15)),
                   ((0,3,32),(13,10.5,12)), ((0,-3,71),(10,9,14)),
                   ((-10,0,61),(8,9,10)), ((10,0,61),(8,9,10)),
                   ((-14,0,61),(6,7,7)), ((14,0,61),(6,7,7)),
                   ((-8,2,33),(8,9,9)), ((8,2,33),(8,9,9))], skin, 'torso')]
    for z in range(32, 71, 4):
        front = max(11*math.sqrt(max(0,1-((z-44)/22)**2))-2,
                    12*math.sqrt(max(0,1-((z-59)/15)**2)),
                    9*math.sqrt(max(0,1-((z-71)/14)**2))+3)
        # One shallow overlapping shield per row, embedded in the torso rather than paired beads.
        width = 5.8 + 1.8 * math.sin((z-32)/38*math.pi)
        body.append(scute((0,-front+.35,z),(width,.65,2.5),belly))
    for side in (-1,1):
        for z in range(37, 67, 5):
            for step in range(3):
                body.append(scute((side*(11+step*.85), -5+step*4,z),(1.8,1.1,2.5),armor))
        for i in range(3):
            body.append(tube([(side*(12+i*.8),2+i*1.2,64-i*.6),
                              (side*(18+i),5+i,69-i*.5),
                              (side*(19+i),8+i,71-i*.8)], [2,1.2,.06], horn))
    for i in range(10):
        z = 29+i*5
        y = 12 if z < 65 else 8-(z-65)*.3
        h = 8+5*math.sin(i/9*math.pi)
        dorsal=plate((0,y,z),2.6+1.1*math.sin(i/9*math.pi),h,armor,(-1 if i%2 else 1)*.65)
        for vert in dorsal.data.vertices:
            vert.co.y += max(0,vert.co.z-z)*.9
        body.append(dorsal)
        body.append(tube([(0,y-1,z+2),(0,y+h*.6,z+h*.65),(0,y+h*.9+2,z+h-.4)], [.22,.15,.03], heat, 6))
        for side in (-1,1):
            body.append(plate((side*7,y-2,z-2),2.2,h*.65,armor,side*1.8))
    finish(body,'kaiju_body',(0,0,0))

    head = [flesh([((0,-9,79),(8.6,9,6.5)), ((0,-17,79),(6.2,8,3.5)),
                   ((0,-22,78),(5.8,4,3.2)), ((-6,-12,76),(3.4,6,4.5)),
                   ((6,-12,76),(3.4,6,4.5))],skin,'skull')]
    head.append(ellipsoid((0,-19,75.6),(5.5,7.2,.7),mouth))
    for side in (-1,1):
        head.append(ellipsoid((side*6.4,-16.5,80),(1.15,2.1,1.2),armor))
        head.append(ellipsoid((side*7.18,-17.1,80.3),(.43,1.1,.6),eye))
        head.append(ellipsoid((side*7.55,-17.2,80.3),(.12,.26,.48),pupil))
        head.append(tube([(side*5,-22,82),(side*7,-17,82.5),(side*8,-11,83)], [1.1,1.5,.45],armor))
        head.append(ellipsoid((side*3.6,-24.7,79.3),(1,.4,.55),pupil))
        head.append(tube([(side*6,-7,83),(side*9,-2,88),(side*10,4,91)], [2.7,1.5,.03],horn))
        for i in range(9):
            y = -24+i*1.3
            x = side*(4.6+ .6*math.sin(i/8*math.pi))
            length = 1.5 + .9*(.5+.5*math.sin(i*2.3))
            head.append(tube([(x,y,76.3),(x*.96,y-.2,76-length*.6),(x*.92,y-.4,76-length)], [.4,.23,.025],horn))
    for i in range(7):
        x=(i-3)*1.15
        head.append(tube([(x,-25.4,76.4),(x,-25.7,75.5),(x,-25.6,74.9)], [.32,.2,.02],horn))
    for i in range(4):
        head.append(plate((0,-18+i*3.8,83),1.8,3+i*.45,armor))
    for side in (-1,1):
        for i in range(6):
            head.append(scute((side*(4+i%2),-22+i*2,81.4+i*.35),(2,.6,1.5),armor))
    finish(head,'kaiju_head',(0,-4,73))
    jaw = [flesh([((0,-14,71.4),(6.3,6.5,2.7)), ((0,-21,71.7),(5.4,5,1.8)),
                  ((-5.5,-10,73),(2.7,4,3.2)), ((5.5,-10,73),(2.7,4,3.2))],skin,'jaw')]
    jaw.append(ellipsoid((0,-19.8,73),(4.9,6.1,.5),mouth))
    jaw.append(ellipsoid((0,-19,73.4),(2.5,4,.45),mouth))
    for side in (-1,1):
        for i in range(9):
            y=-24+i*1.3
            jaw.append(tube([(side*4.9,y,72.5),(side*4.7,y-.1,74.1),(side*4.5,y-.3,75)], [.45,.22,.02],horn))
    finish(jaw,'kaiju_jaw',(0,-9,73))

    for side, label in [(-1,'left'),(1,'right')]:
        leg = [flesh([((side*9,2,26),(8,9,14)), ((side*10,-1,20),(6.8,7,10)),
                       ((side*11,-3,17),(5.6,6,8)), ((side*11,1,10),(4.6,5.2,9)), ((side*11,-4,3.2),(5.5,8,3.2))],skin,'leg')]
        leg.append(scute((side*11,-7.6,18),(4.5,1.2,4),armor))
        for i in range(3):
            x=side*11+(i-1)*3.5
            leg.append(ellipsoid((x,-9,2.5),(1.8,4.5,2.2),skin))
            leg.append(tube([(x,-11,2.8),(x,-14,2),(x,-16,1)], [1.4,.8,.04],horn))
        for z in range(7,16,3):
            leg.append(scute((side*11,-3.5,z),(3.8,.8,1.8),belly))
        finish(leg,f'kaiju_{label}_leg',(side*9,2,34))
        arm = [flesh([((side*15,0,62),(5.8,6,6)), ((side*17,-2,57),(6,6,9)),
                       ((side*19,-3,52),(5,5.2,8)), ((side*20,-4,49),(4.5,4.8,8)),
                       ((side*21,-7,42),(4,4,7)), ((side*21,-9,36),(4.5,3.5,4))],skin,'arm')]
        for i in range(4):
            x=side*21+(i-1.5)*2.0
            arm.append(tube([(x,-9,36),(x,-11,32),(x,-12,29)], [1.15,.95,.6],skin))
            arm.append(tube([(x,-12,29),(x,-13.5,27),(x,-15,28)], [.75,.45,.025],horn))
        arm.append(tube([(side*18,-9,38),(side*16,-12,35),(side*16,-14,32)], [1.7,1,.04],horn))
        for i in range(4):
            arm.append(plate((side*22,0,41+i*4),1.7,4,armor,side*2))
        finish(arm,f'kaiju_{label}_arm',(side*15,0,63))

    points=[(0,7,30),(0,16,24),(-2,25,18),(-4,35,12),(-2,46,8),(5,57,6),(16,67,7),(28,75,10),(34,81,14)]
    radii=[8,8,6.5,5.2,4,3,2,1,.04]
    curve, curve_radii = [], []
    # Blender's Bezier interpolation rounds the silhouette without adding animation joints.
    for i in range(len(points)-1):
        start, end = Vector(points[i]), Vector(points[i+1])
        handle_a = start + (end-Vector(points[max(0,i-1)]))/6
        handle_b = end - (Vector(points[min(len(points)-1,i+2)])-start)/6
        curve.extend(interpolate_bezier(start, handle_a, handle_b, end, 5)[:-1])
        curve_radii.extend(radii[i]+(radii[i+1]-radii[i])*step/4 for step in range(4))
    curve.append(Vector(points[-1]))
    curve_radii.append(radii[-1])
    tail=[tube(curve,curve_radii,skin,24)]
    for i,p in enumerate(points[1:-1]):
        radius=[8,6.5,5.2,4,3,2,1][i]
        tail.append(plate((p[0],p[1],p[2]+radius*.8),max(.7,2.7-i*.32),max(2,8-i),armor,(-1 if i%2 else 1)*.5))
        for side in (-1,1):
            tail.append(scute((p[0]+side*radius*.75,p[1],p[2]+radius*.5),(radius*.4,1,radius*.35),armor))
    finish(tail,'kaiju_tail',(0,7,30))

    bounds=[obj.matrix_world @ v.co for obj in PARTS for v in obj.data.vertices]
    floor=min(v.z for v in bounds)
    scale=98/(max(v.z for v in bounds)-floor)
    for obj in PARTS:
        for vert in obj.data.vertices:
            vert.co *= scale
        obj.location *= scale
        obj.location.z -= floor*scale
    triangles=sum(len(poly.vertices)-2 for obj in PARTS for poly in obj.data.polygons)
    assert len(PARTS)==8 and triangles < 180000, (len(PARTS),triangles)
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=OUT,export_format='GLB',use_selection=True,export_yup=True)
    with open(os.path.join(os.path.dirname(OUT),'kaiju.manifest.json'),'w',encoding='utf-8') as f:
        json.dump({'models':{'kaiju':{'file':'kaiju.glb','heightM':98,'triangles':triangles,'style':'armored reptilian titan'}}},f,indent=2)
        f.write('\n')
    print(f'Kaiju: {triangles} triangles, {os.path.getsize(OUT)/1024/1024:.2f} MiB')


if __name__ == '__main__':
    main()
