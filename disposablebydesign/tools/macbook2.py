"""MacBook Air built from the supplied Onshape model (MacBookAir.blend) plus modeled internals.

The source is in millimetres with Y up (Onshape's default), so everything is rotated to Z up, the
front edge to -Y, and set on the ground. The base is one solid body in CAD; it is split at a seam into
a bottom case and a top case so the internals have somewhere to show up between them.
"""
import sys, math, random
sys.path.insert(0, '/home/claude/dbd/models')
from lib import *
from mathutils import Matrix, Vector

SRC = '/home/claude/dbd/src_models/d755d721-MacBookAir.blend'
P = 'MACBOOKAIR2020_ASM - '
open_source(SRC)
M = Matrix.Translation((0, 0, 9)) @ Matrix.Rotation(math.pi, 4, 'Z') @ Matrix.Rotation(math.pi / 2, 4, 'X')
SEAM = 2.2                      # height of the bottom-case seam (mm above the ground)

base = grab(P + 'BOTTOM_1', M, ratio=0.09)


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
base.free()
feet = [grab(P + 'RUBBER_FOOT' + s, M) for s in ('', ' (1)', ' (2)', ' (3)')]
keys = [grab(o, M, ratio=0.035) for o in bpy.data.objects if o.name.startswith(P + 'KEYBOARD_2')]
pad = grab(P + 'TOUCHPAD_1', M)
ports = [grab(P + n, M) for n in ('TYPEC_PORT', 'TYPEC_PORT (1)', 'TYPEC_PORT (2)', 'TYPEC_PORT_2', 'TYPEC_PORT_2 (1)')]

# the lid: closed in the source, opened here to 110 degrees about the hinge line
HY, HZ = 111.6, 10.0
OPEN = 110
L = Matrix.Translation((0, HY, HZ)) @ Matrix.Rotation(math.radians(-OPEN), 4, 'X') @ Matrix.Translation((0, -HY, -HZ))
lid_shell = grab(P + 'SCREEN_1', None, ratio=0.5)
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
lid_gasket = grab(P + 'SCREEN_2_RUBBER', L @ M, ratio=0.12)
lid_panel = grab(P + 'SCREEN_3', L @ M)
hinges = [grab(P + n, M) for n in ('SCREEN_HINGE', 'SCREEN_HINGE_2', 'SCREEN_HINGE_2 (1)')]

reset()
random.seed(11)
W, Y0, Y1 = 304.1, -98.9, 113.5
CY = (Y0 + Y1) / 2

mat('Aluminium', (0.80, 0.81, 0.83), metal=1, rough=0.34)
mat('Aluminium dark', (0.36, 0.38, 0.42), metal=1, rough=0.42)
mat('Keycap', (0.03, 0.03, 0.035), rough=0.45)
mat('PCB', (0.03, 0.22, 0.1), rough=0.45)
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
kb.add(box(270, 104, 0.3), 'Black plastic', xf((0, 50, 5.6)))           # backlight sheet under the keys

tp = Part('Trackpad', (0, -12, 30))
tp.add(pad, 'Trackpad glass')
tp.add(box(100, 60, 1.2), 'Aluminium dark', xf((0, -52, 4.0)))
tp.add(box(46, 12, 2.0, 0.6), 'Steel', xf((0, -50, 3.0)))                  # Taptic Engine
tp.add(box(40, 6, 0.2), 'Polyimide flex', xf((0, -18, 4.6)))

# ---------------- internals, bottom up (z between the seam and the deck)
ps = Part('Pentalobe screws', (0, 0, -95))
for x, y in ((-W / 2 + 8, Y1 - 10), (W / 2 - 8, Y1 - 10), (-W / 2 + 8, Y0 + 9), (W / 2 - 8, Y0 + 9),
             (-60, Y1 - 10), (60, Y1 - 10), (-W / 2 + 8, CY), (W / 2 - 8, CY), (-60, Y0 + 9), (60, Y0 + 9)):
    ps.add(screw(3.0, 1.6, 0.8), 'Steel', xf((x, y, 0.4), rot=(180, 0, 0)))

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

lb = Part('Logic board', (0, 12, -10))
LBY = 70
lb.add(slab(150, 40, 0.9, 4, 6), 'PCB', xf((-20, LBY, SEAM + 1.6)))
for _ in range(80):
    lb.add(box(random.uniform(1.5, 5), random.uniform(1.2, 4), random.uniform(0.3, 0.8)), random.choice(['Chip', 'Chip', 'Steel', 'Gold']),
           xf((-20 + random.uniform(-70, 70), LBY + random.uniform(-17, 17), SEAM + 2.3)))
for x in (-80, 40, 20):
    lb.add(box(8, 3, 0.9), 'Gold', xf((x, LBY - 18, SEAM + 2.4)))

soc = Part('M-series chip and memory', (0, 16, 16))
soc.add(box(28, 22, 0.6, 0.6), 'PCB', xf((-20, LBY, SEAM + 2.4)))
soc.add(box(16, 16, 0.9, 0.5), 'SoC lid', xf((-24, LBY, SEAM + 3.1)))
soc.add(box(7, 16, 0.9, 0.4), 'Chip', xf((-10, LBY, SEAM + 3.1)))

ssd = Part('Soldered SSD', (26, 10, 24))
for x in (14, 28):
    ssd.add(box(12, 16, 1.2, 0.4), 'NAND', xf((x, LBY, SEAM + 2.7)))
ssd.add(box(8, 8, 0.8, 0.3), 'Chip', xf((44, LBY + 6, SEAM + 2.5)))

hs = Part('Heat spreader', (0, 16, 34))
hs.add(slab(110, 36, 0.4, 3, 6), 'Aluminium dark', xf((-20, LBY, SEAM + 3.9)))
hs.add(slab(80, 28, 0.12, 3, 6), 'Graphite', xf((-20, LBY, SEAM + 3.6)))

spk = Part('Speakers', (0, 8, 0))
for sx in (-1, 1):
    spk.add(box(40, 70, 3.0, 1.5), 'Black plastic', xf((sx * 128, 20, SEAM + 2.0)))
    spk.add(box(30, 2, 1.2), 'Steel', xf((sx * 128, 56, SEAM + 2.6)))

pb = Part('Port boards', (0, 0, 0))
for p in ports:
    pb.add(p, 'Steel')
pb.add(box(10, 40, 0.9, 0.5), 'PCB', xf((W / 2 - 9, 74, SEAM + 1.0)))
pb.add(box(10, 18, 0.9, 0.5), 'PCB', xf((-W / 2 + 9, 83, SEAM + 1.0)))
pb.add(box(40, 6, 0.2), 'Polyimide flex', xf((W / 2 - 32, 74, SEAM + 1.6)))
pb.add(box(40, 6, 0.2), 'Polyimide flex', xf((-W / 2 + 32, 83, SEAM + 1.6)))

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
pnl = slab(286, 178, 1.4, 4, 6)
pn.add(pnl, 'LCD', L @ M @ xf((0, 1.5, 7.3), (90, 0, 0)))

cam = Part('FaceTime camera', nv(30))
cam.add(box(10, 0.8, 3.5, 0.3), 'Black plastic', L @ M @ xf((0, -1.0, -93)))
cam.add(cyl(1.2, 0.3, 20), 'Glass', L @ M @ xf((0, -1.45, -93), (90, 0, 0)))

hg = Part('Display hinge', (0, 34, 8))
for h in hinges:
    hg.add(h, 'Aluminium dark')

dc = Part('Display cable', (0, 34, 18))
dc.add(pipe([(-60, LBY + 14, SEAM + 2.6), (-60, Y1 - 8, SEAM + 3.0), (-60, Y1 - 2, HZ)], 1.2, 8), 'Polyimide flex')
dc.add(box(12, 6, 1.0), 'Gold', xf((-60, LBY + 14, SEAM + 2.6)))

export('/home/claude/dbd/build/raw/macbook.glb')
