# outside.py: internal parts of the car whose points are not covered by the skin when seen from the front,
# back, sides or above (ray from the point outward hits no exterior panel)
import sys; sys.path.insert(0, '/home/claude/dbd/tools')
import bpy, numpy as np, glbread
from mathutils import Vector
from mathutils.bvhtree import BVHTree
glbread.TRIS = True
P = glbread.load('/home/claude/dbd/build/raw/model_y.glb')
SKIN = ('Body shell', 'Front fascia', 'Rear fascia', 'Frunk lid', 'Liftgate', 'Headlights', 'Tail lights', 'Glass roof',
        'Front left door', 'Front right door', 'Rear left door', 'Rear right door')
INNER = ('Front megacasting', 'Rear megacasting', 'Front drive unit', 'Rear drive unit', 'Radiator', 'Heat pump',
         'Frunk tub', 'Low-voltage', 'High-voltage', 'Front suspension', 'Rear suspension', 'Battery pack tray', 'Pack lid',
         '4680', 'Structural foam', 'Busbars', 'Cabin interior')
def bl(v): return np.stack([v[:, 0], -v[:, 2], v[:, 1]], 1) * 1000
vs, ps = [], []
for k, (v, e) in P.items():
    if k.startswith(SKIN):
        o = len(vs); vs.extend(map(Vector, bl(v))); ps.extend((glbread.FACES[k] + o).tolist())
tree = BVHTree.FromPolygons(vs, ps)
dirs = {'front': Vector((1, 0, 0)), 'back': Vector((-1, 0, 0)), 'up': Vector((0, 0, 1)), 'left': Vector((0, 1, 0)), 'right': Vector((0, -1, 0))}
for k, (v, e) in sorted(P.items()):
    if not k.startswith(INNER): continue
    X = bl(v)[::3]
    bad = {}
    for p in X:
        p = Vector(p)
        if p.z < 330: continue                                       # underbody is open by design
        for name, d in dirs.items():
            if name in ('left', 'right') and -1500 < p.x < 1500: continue   # door openings / wheel arches
            if tree.ray_cast(p, d, 6000)[0] is None:
                bad.setdefault(name, []).append(tuple(round(q) for q in p)); break
    for name, pts in bad.items():
        print(f'{k:40s} {name:6s} {len(pts):5d}  e.g. {pts[len(pts)//2]}')
