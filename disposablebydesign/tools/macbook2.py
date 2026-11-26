"""MacBook Air built from the supplied Onshape model (MacBookAir.blend) plus modeled internals.

The source is in millimetres with Y up (Onshape's default), so everything is rotated to Z up, the
front edge to -Y, and set on the ground. The base is one solid body in CAD; it is split at a seam into
a bottom case and a top case so the internals have somewhere to show up between them.
"""
import sys, math, random
sys.path.insert(0, '/home/claude/dbd/models')
from lib import *
from pcbkit import Board, board_materials
from mathutils import Matrix, Vector

SRC = '/home/claude/dbd/src_models/d755d721-MacBookAir.blend'
P = 'MACBOOKAIR2020_ASM - '
open_source(SRC)
M = Matrix.Translation((0, 0, 9)) @ Matrix.Rotation(math.pi, 4, 'Z') @ Matrix.Rotation(math.pi / 2, 4, 'X')
SEAM = 2.2                      # height of the bottom-case seam (mm above the ground)

# The CAD deck carries speaker grilles either side of the keyboard (a MacBook Pro detail; the Air's
# speakers fire through the hinge). Delete the perforated strips on the dense source and cap them flat.
def _no_grilles(name):
    """Plug every perforation: delete each hole's little wall tube and cap its top and bottom rims, so the
    deck reads as one continuous sheet."""
    ob = bpy.data.objects[name]
    T = M @ ob.matrix_world
    g = bmesh.new(); g.from_mesh(ob.data)
    bmesh.ops.remove_doubles(g, verts=g.verts, dist=0.002)
    g.normal_update()
    R = T.to_3x3()
    inside = lambda c: 137.5 < abs(c.x) < 151.5 and -10 < c.y < 104 and c.z > 6
    walls = set(f for f in g.faces if abs((R @ f.normal).normalized().z) < 0.35 and inside(T @ f.calc_center_median()))
    seen = set(); kill = []
    for f in walls:                                   # connected wall tubes; keep only hole-sized ones
        if f in seen: continue
        comp = []; stack = [f]; seen.add(f)
        while stack:
            h = stack.pop(); comp.append(h)
            for e in h.edges:
                for k in e.link_faces:
                    if k in walls and k not in seen:
                        seen.add(k); stack.append(k)
        pts = [T @ v.co for h in comp for v in h.verts]
        if max(p.x for p in pts) - min(p.x for p in pts) < 2.5 and max(p.y for p in pts) - min(p.y for p in pts) < 2.5:
            kill.extend(comp)
    bmesh.ops.delete(g, geom=kill, context='FACES_ONLY')
    edges = [e for e in g.edges if e.is_boundary]
    caps = bmesh.ops.holes_fill(g, edges=edges, sides=0)['faces']
    print('grille wall faces removed', len(kill), 'caps', len(caps))
    g.to_mesh(ob.data); g.free()
_no_grilles(P + 'BOTTOM_1')
base = grab(P + 'BOTTOM_1', M, ratio=0.09, transfer=False)


def cut(bm, z, keep_above):
    out = bm.copy()
    geom = out.verts[:] + out.edges[:] + out.faces[:]
    r = bmesh.ops.bisect_plane(out, geom=geom, plane_co=(0, 0, z), plane_no=(0, 0, 1),
                               clear_inner=keep_above, clear_outer=not keep_above)
    edges = [e for e in r['geom_cut'] if isinstance(e, bmesh.types.BMEdge)]
    if edges:
        bmesh.ops.holes_fill(out, edges=edges, sides=0)
    return out


bottom = cut(base, SEAM, False)
top = cut(base, SEAM, True)
from mathutils.bvhtree import BVHTree as _BVH
_bt = _BVH.FromBMesh(bottom)
def under(x, y):
    """height of the bottom case's outer skin at (x, y)"""
    # the floor is a single surface in the CAD export; the rubber feet sit in openings at the corners
    up = _bt.ray_cast(Vector((x, y, -20)), Vector((0, 0, 1)), 40)[0]
    assert up is not None, (x, y)
    return up.z
base.free()
feet = [grab(P + 'RUBBER_FOOT' + s, M) for s in ('', ' (1)', ' (2)', ' (3)')]
keys = [grab(o, M, ratio=0.06, transfer=False) for o in bpy.data.objects if o.name.startswith(P + 'KEYBOARD_2')]
key_boxes = []
for k in keys:
    xs = [v.co.x for v in k.verts]; ys = [v.co.y for v in k.verts]; zs = [v.co.z for v in k.verts]
    key_boxes.append(((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2, max(zs), max(xs) - min(xs), max(ys) - min(ys)))
pad = grab(P + 'TOUCHPAD_1', M)
ports = [grab(P + n, M) for n in ('TYPEC_PORT', 'TYPEC_PORT (1)', 'TYPEC_PORT (2)', 'TYPEC_PORT_2', 'TYPEC_PORT_2 (1)')]

# the lid: closed in the source, opened here to 110 degrees about the hinge line
HY, HZ = 111.6, 10.0
OPEN = 110
L = Matrix.Translation((0, HY, HZ)) @ Matrix.Rotation(math.radians(-OPEN), 4, 'X') @ Matrix.Translation((0, -HY, -HZ))
lid_shell = grab(P + 'SCREEN_1', None, ratio=0.5, transfer=False)
# no logos: cut the logo recess out of the lid's outer skin and lay a flat patch over it
from mathutils.bvhtree import BVHTree
_t = BVHTree.FromBMesh(lid_shell)
def _surf(x, z):
    return _t.ray_cast(Vector((x, 60, z)), Vector((0, -1, 0)), 200)[0].y
_a, _b = _surf(0, -19), _surf(0, 30)
_kill = [f for f in lid_shell.faces if abs(f.calc_center_median().x) < 18.5 and -17 < f.calc_center_median().z < 27
         and f.calc_center_median().y > (_a + _b) / 2 - 2.5]
bmesh.ops.delete(lid_shell, geom=_kill, context='FACES')
_slope = math.degrees(math.atan2(_b - _a, 49))
logo_patch = box(38, 0.3, 46)
bmesh.ops.transform(logo_patch, matrix=xf((0, (_a + _b) / 2 - 0.15, 5.5), (-_slope, 0, 0)), verts=logo_patch.verts)
bmesh.ops.transform(lid_shell, matrix=L @ M, verts=lid_shell.verts)
bmesh.ops.transform(logo_patch, matrix=L @ M, verts=logo_patch.verts)
lid_glass = grab(P + 'SCREEN_2', L @ M)
lid_gasket = grab(P + 'SCREEN_2_RUBBER', L @ M, ratio=0.12, transfer=False)
lid_panel = grab(P + 'SCREEN_3', L @ M)
# the display stack in the source sits at a slight tilt (the closed lid follows the wedge); read that
# tilt from the glass so the backlight and the camera sit parallel to it
_g = grab(P + 'SCREEN_2', None)
_big = max(_g.faces, key=lambda f: f.calc_area())
_n = _big.normal.copy()
if _n.y > 0: _n.negate()                                        # facing the screen side (-Y in the source)
_R = Vector((0, -1, 0)).rotation_difference(_n).to_matrix().to_4x4()
_zmin = min(v.co.z for v in _g.verts)
_edge = [v.co for v in _g.verts if v.co.z < _zmin + 8]
_cam_p = Vector((0, min(c.y for c in _edge) + 0.7, _zmin + 5.0))
_g.free()
backing = lid_panel.copy()
_pf = max(backing.faces, key=lambda f: f.calc_area()).normal.copy()
_nn = (L @ M).to_3x3() @ _n
if _pf.dot(_nn) < 0: _pf.negate()
bmesh.ops.translate(backing, vec=-_pf * 1.6, verts=backing.verts)
hinges = [grab(P + n, M) for n in ('SCREEN_HINGE', 'SCREEN_HINGE_2', 'SCREEN_HINGE_2 (1)')]

reset()
random.seed(11)


def legend(text, size):
    cu = bpy.data.curves.new('_t', 'FONT')
    cu.body = text; cu.size = size; cu.align_x = 'CENTER'; cu.align_y = 'CENTER'
    ob = bpy.data.objects.new('_t', cu); bpy.context.scene.collection.objects.link(ob)
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    g = bmesh.new(); g.from_mesh(me)
    bpy.data.objects.remove(ob); bpy.data.curves.remove(cu); bpy.data.meshes.remove(me)
    bmesh.ops.triangulate(g, faces=g.faces)
    return g

W, Y0, Y1 = 304.1, -98.9, 113.5
CY = (Y0 + Y1) / 2

board_materials()
mat('Aluminium', (0.80, 0.81, 0.83), metal=1, rough=0.34)
mat('Legend', (0.95, 0.96, 0.97), rough=0.35, emit=((0.9, 0.92, 0.95), 0.35))
mat('Aluminium dark', (0.36, 0.38, 0.42), metal=1, rough=0.42)
mat('Keycap', (0.03, 0.03, 0.035), rough=0.45)
mat('Chip', (0.04, 0.04, 0.045), rough=0.35)
mat('SoC lid', (0.7, 0.71, 0.73), metal=1, rough=0.3)
mat('NAND', (0.08, 0.08, 0.09), rough=0.3)
mat('Gold', (0.95, 0.74, 0.35), metal=1, rough=0.25)
mat('Battery wrap', (0.2, 0.2, 0.22), metal=0.3, rough=0.45)
mat('Battery label', (0.55, 0.56, 0.58), metal=0.6, rough=0.4)
mat('Adhesive', (0.7, 0.7, 0.68), rough=0.6)
mat('Polyimide flex', (0.66, 0.43, 0.12), rough=0.4)
mat('Black plastic', (0.025, 0.025, 0.028), rough=0.55)
mat('Steel', (0.6, 0.6, 0.62), metal=1, rough=0.3)
mat('Graphite', (0.09, 0.09, 0.1), rough=0.7)
mat('Copper', (0.8, 0.45, 0.28), metal=1, rough=0.3)
mat('Glass', (0.008, 0.01, 0.012), rough=0.04, coat=1.0)
mat('LCD', (0.015, 0.02, 0.035), rough=0.2)
mat('Rubber', (0.05, 0.05, 0.05), rough=0.85)
mat('Trackpad glass', (0.74, 0.75, 0.77), rough=0.3, coat=0.5)

# ---------------- the enclosure from the supplied model
bc = Part('Bottom case', (0, 0, -60))
bc.add(bottom, 'Aluminium')
for f in feet:
    bc.add(f, 'Rubber')

tc = Part('Top case', (0, 0, 48))
tc.add(top, 'Aluminium')

kb = Part('Keyboard', (0, 0, 74))
for k in keys:
    kb.add(k, 'Keycap')
# legends: sort the keys into rows by height on the deck, then read them off a US layout
ROWS = [['esc', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12', ''],
        ['~', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'delete'],
        ['tab', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']', '\\'],
        ['caps lock', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'", 'return'],
        ['shift', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/', 'shift'],
        ['fn', 'control', 'option', 'command', '', 'command', 'option', '←', '↑', '↓', '→']]
info = []
for k in key_boxes:
    info.append(k)
info.sort(key=lambda t: -t[1])
rows = []
for t in info:
    if rows and abs(rows[-1][0][1] - t[1]) < 7.5:
        rows[-1].append(t)
    else:
        rows.append([t])
print('key rows', [len(r) for r in rows])
if len(rows) > 6:                                       # the half-height arrow keys form their own little rows
    tail = [t for r in rows[5:] for t in r]
    rows = rows[:5] + [tail]
for r, labels in zip(rows, ROWS):
    r.sort(key=lambda t: (round(t[0], 0), -t[1]))
    for (x, y, z, w, h), lab in zip(r, labels):
        if not lab:
            continue
        g = legend(lab, 3.4 if len(lab) == 1 else 1.75)
        if len(lab) == 1:
            bmesh.ops.translate(g, vec=(x, y, z + 0.02), verts=g.verts)
        else:
            bmesh.ops.translate(g, vec=(x, y - h * 0.22, z + 0.02), verts=g.verts)
        kb.add(g, 'Legend')
kb.add(box(270, 104, 0.3), 'Black plastic', xf((0, 50, 5.6)))           # backlight sheet under the keys

tp = Part('Trackpad', (0, -12, 30))
tp.add(pad, 'Trackpad glass')
tp.add(box(100, 60, 1.2), 'Aluminium dark', xf((0, -52, 4.0)))
tp.add(box(46, 12, 2.0, 0.6), 'Steel', xf((0, -50, 3.0)))                  # Taptic Engine
tp.add(box(40, 6, 0.2), 'Polyimide flex', xf((0, -18, 4.6)))

# ---------------- internals, bottom up (z between the seam and the deck)
ps = Part('Pentalobe screws', (0, 0, -95))
for x, y in ((-W / 2 + 28, Y1 - 13), (W / 2 - 28, Y1 - 13), (-W / 2 + 28, Y0 + 12), (W / 2 - 28, Y0 + 12),
             (-60, Y1 - 13), (60, Y1 - 13), (-W / 2 + 12, CY), (W / 2 - 12, CY), (-60, Y0 + 12), (60, Y0 + 12)):
    # head flush with the skin directly under it (the case curves up toward its edges)
    ps.add(screw(3.0, 1.6, 0.8), 'Steel', xf((x, y, under(x, y) + 0.02 + 1.5 + 0.88), rot=(180, 0, 0)))

cells = Part('Battery cells', (0, -6, -34))
for x, w in ((-92, 78), (0, 86), (92, 78)):
    cells.add(slab(w, 96, 2.6, 3, 6, bevel=0.5), 'Battery wrap', xf((x, -36, SEAM + 1.6)))
    cells.add(slab(w - 10, 80, 0.06, 2, 4), 'Battery label', xf((x, -36, SEAM + 2.95)))
cells.add(box(220, 12, 0.3), 'Polyimide flex', xf((0, 16, SEAM + 3.0)))

bmb = Part('Battery management board', (0, 16, -20))
bmb.add(slab(70, 11, 0.9, 2, 4), 'PCB', xf((0, 20, SEAM + 3.2)))
for k in range(9):
    bmb.add(box(random.uniform(2, 5), random.uniform(2, 4), 0.6), 'Chip', xf((-30 + k * 7.5, 20, SEAM + 3.9)))

ad = Part('Battery adhesive', (0, -6, -16))
for x, w in ((-92, 78), (0, 86), (92, 78)):
    for dx in (-w / 3, 0, w / 3):
        ad.add(box(7, 88, 0.15), 'Adhesive', xf((x + dx, -36, SEAM + 0.25)))

lb = Part('Logic board', (0, 100, -6))
LBY = 70
LBZ = SEAM + 1.15
LPOLY = [(-95, 51), (40, 51), (40, 62), (55, 62), (55, 89), (-95, 89)]
bd = Board(21).substrate(LPOLY, LBZ, 0.9, holes=[(-92, 54, 0.9), (-92, 86, 0.9), (37, 54, 0.9), (52, 86, 0.9), (-30, 86, 0.9)])
bd.keep += [(-20, LBY, 30, 24), (21, LBY, 30, 18)]                 # room for the SoC and the NAND parts
bd.shield(-70, 70, 22, 26, 1.0)                                    # Wi-Fi / Bluetooth
bd.chip(-48, 60, 9, 9, 0.6)                                        # power management
bd.chip(-48, 78, 7, 7, 0.55)
bd.chip(46, 75, 6, 6, 0.5)                                         # Thunderbolt retimer
bd.chip(46, 66, 5, 5, 0.5)                                         # USB-C port controller
bd.chip(-88, 70, 5, 8, 0.5)                                        # audio codec
bd.chip(-5, 56, 4, 4, 0.45)
bd.connector(-80, 87, 10, 2.0)                                     # display
bd.connector(-35, 54, 12, 2.0)                                     # battery
bd.connector(10, 54, 10, 2.0)                                      # keyboard
bd.connector(30, 54, 6, 1.8)                                       # trackpad
bd.connector(53, 74, 8, 1.8, rot=math.pi / 2)                      # I/O board
bd.passives(16)
bd.testpads(70)
bd.silk(60)
bd.into(lb)

soc = Part('M-series chip and memory', (0, 100, 16))
soc.add(box(28, 22, 0.5, 0.4), 'PCB', xf((-20, LBY, LBZ + 1.15)))                  # package substrate
soc.add(box(13, 13, 0.7, 0.3), 'Die', xf((-25, LBY, LBZ + 1.7)))                   # the M-series die
for dy in (-5.2, 5.2):                                                             # unified memory, on the package
    soc.add(box(8, 9, 0.8, 0.3), 'Chip', xf((-11.5, LBY + dy, LBZ + 1.75)))
for i in range(28):
    soc.add(box(0.5, 0.3, 0.3), 'Cap', xf((-33 + (i % 14) * 1.3, LBY + (10.2 if i < 14 else -10.2), LBZ + 1.55)))

ssd = Part('Soldered SSD', (24, 100, 26))
for x in (14, 28):
    ssd.add(box(12, 16, 1.0, 0.3), 'NAND', xf((x, LBY, LBZ + 1.4)))
    for k in range(3):
        ssd.add(box(7, 0.15, 0.01), 'Silk', xf((x - 1, LBY - 3 + k * 1.1, LBZ + 1.91)))
    ssd.add(cyl(0.35, 0.02, 8), 'Silk', xf((x - 5, LBY + 7, LBZ + 1.91)))

hs = Part('Heat spreader', (0, 100, 38))
hs.add(slab(110, 36, 0.4, 3, 6), 'Aluminium dark', xf((-20, LBY, LBZ + 3.2)))
hs.add(slab(80, 28, 0.12, 3, 6), 'Graphite', xf((-20, LBY, LBZ + 2.9)))

spk = Part('Speakers', (0, 8, 0))
for sx in (-1, 1):
    spk.add(box(40, 70, 3.0, 1.5), 'Black plastic', xf((sx * 128, 20, SEAM + 2.0)))
    spk.add(box(30, 2, 1.2), 'Steel', xf((sx * 128, 56, SEAM + 2.6)))

pb = Part('Port boards', (0, 0, 0))
for p in ports:
    pb.add(p, 'Steel')
pb.add(box(10, 40, 0.9, 0.5), 'PCB', xf((W / 2 - 15, 70, SEAM + 1.4)))
pb.add(box(10, 18, 0.9, 0.5), 'PCB', xf((-W / 2 + 15, 80, SEAM + 1.4)))
pb.add(box(40, 6, 0.2), 'Polyimide flex', xf((W / 2 - 38, 70, SEAM + 2.0)))
pb.add(box(40, 6, 0.2), 'Polyimide flex', xf((-W / 2 + 38, 80, SEAM + 2.0)))

kf = Part('Keyboard and trackpad flex', (0, 6, 12))
kf.add(box(60, 10, 0.2), 'Polyimide flex', xf((30, 40, SEAM + 3.8)))
kf.add(box(10, 50, 0.2), 'Polyimide flex', xf((0, 0, SEAM + 3.8)))

# ---------------- the lid
n = Vector((0, -math.sin(math.radians(OPEN)), -math.cos(math.radians(OPEN))))    # the way the screen faces
up = Vector((0, 40, 70))
def nv(k):
    v = n * k + up
    return (v.x, v.y, v.z)

lid = Part('Display lid', nv(-46))
lid.add(lid_shell, 'Aluminium')
lid.add(logo_patch, 'Aluminium')
gl = Part('Display glass and bezel', nv(40))
gl.add(lid_glass, 'Glass')
gl.add(lid_gasket, 'Black plastic')
pn = Part('Liquid Retina panel', nv(18))
pn.add(lid_panel, 'LCD')
# give the panel some body: a backlight stack behind the visible plane
pn.add(backing, 'Black plastic')

cam = Part('FaceTime camera', nv(30))
CM = L @ M @ Matrix.Translation(_cam_p) @ _R
cam.add(box(10, 0.8, 3.5, 0.3), 'Black plastic', CM @ xf((0, 0.5, 0)))
cam.add(cyl(1.2, 0.3, 20), 'Glass', CM @ xf((0, 0.0, 0), (90, 0, 0)))
cam.add(box(30, 0.15, 3, 0.05), 'Polyimide flex', CM @ xf((18, 0.9, 1)))

hg = Part('Display hinge', (0, 34, 8))
for h in hinges:
    hg.add(h, 'Aluminium dark')

dc = Part('Display cable', (0, 34, 18))
dc.add(pipe([(-60, LBY + 14, SEAM + 2.6), (-60, Y1 - 8, SEAM + 3.0), (-60, Y1 - 2, HZ)], 1.2, 8), 'Polyimide flex')
dc.add(box(12, 6, 1.0), 'Gold', xf((-60, LBY + 14, SEAM + 2.6)))

export('/home/claude/dbd/build/raw/macbook.glb')
