"""iPhone built from the supplied model (iPhone18Pro.blend) plus modeled internals.

The source is one solid body in millimetres. It is re-centred, then sliced into cover glass, titanium
band and back glass so each can lift away; the camera plateau and lenses come straight from the source.
"""
import sys, math, random
sys.path.insert(0, '/home/claude/dbd/models')
from lib import *
from mathutils import Matrix, Vector

SRC = '/home/claude/dbd/src_models/4465b385-iPhone18Pro.blend'
open_source(SRC)
M = Matrix.Translation((0, -77.0, -3.9))
_obs = {o.name: o for o in bpy.data.objects if o.type == 'MESH'}
_body = [o for n, o in _obs.items() if n.endswith('Fillet12')][0]
_plateau = [o for n, o in _obs.items() if n.endswith('[2]')][0]
_lenses = [o for n, o in _obs.items() if n.endswith(('[1]', '[3]', '[4]'))]
body = grab(_body, M, ratio=0.6)
plateau = grab(_plateau, M, ratio=0.5)
lenses = [grab(o, M, ratio=0.5) for o in _lenses]
lens_xy = [tuple((sum((v.co for v in b.verts), Vector()) / len(b.verts))[:2]) for b in lenses]


def cut(bm, z, keep_above, fill=True):
    out = bm.copy()
    geom = out.verts[:] + out.edges[:] + out.faces[:]
    r = bmesh.ops.bisect_plane(out, geom=geom, plane_co=(0, 0, z), plane_no=(0, 0, 1),
                               clear_inner=keep_above, clear_outer=not keep_above)
    edges = [e for e in r['geom_cut'] if isinstance(e, bmesh.types.BMEdge)]
    if fill and edges:
        bmesh.ops.holes_fill(out, edges=edges, sides=0)
    return out


Z_GLASS = 3.35          # cover glass seam
Z_BACK = -3.35          # back glass seam
cover = cut(body, Z_GLASS, True)
back = cut(body, Z_BACK, False)
band = cut(cut(body, Z_GLASS, False, fill=False), Z_BACK, True, fill=False)

reset()
random.seed(4)
W, H, T, R = 73.5, 149.6, 8.2, 12.0
mat('Cover glass', (0.02, 0.025, 0.03), rough=0.03, coat=1.0)
mat('OLED', (0.005, 0.005, 0.008), rough=0.25)
mat('Titanium', (0.62, 0.6, 0.57), metal=1, rough=0.32)
mat('Aluminium', (0.78, 0.79, 0.8), metal=1, rough=0.35)
mat('PCB', (0.03, 0.22, 0.1), rough=0.45)
mat('Chip', (0.04, 0.04, 0.045), rough=0.35)
mat('Shield', (0.72, 0.73, 0.75), metal=1, rough=0.25)
mat('Gold', (0.95, 0.74, 0.35), metal=1, rough=0.25)
mat('Battery foil', (0.55, 0.56, 0.58), metal=0.6, rough=0.4)
mat('Battery label', (0.06, 0.06, 0.07), rough=0.5)
mat('Adhesive', (0.6, 0.6, 0.58), rough=0.6)
mat('Polyimide flex', (0.66, 0.43, 0.12), rough=0.4)
mat('Black plastic', (0.025, 0.025, 0.028), rough=0.55)
mat('Steel', (0.6, 0.6, 0.62), metal=1, rough=0.3)
mat('Copper', (0.8, 0.45, 0.28), metal=1, rough=0.3)
mat('Magnet', (0.42, 0.42, 0.44), metal=1, rough=0.45)
mat('Sapphire', (0.02, 0.02, 0.03), rough=0.05, coat=1.0)
mat('Back glass', (0.46, 0.43, 0.39), rough=0.5)
mat('Graphite', (0.09, 0.09, 0.1), rough=0.7)
mat('Mesh', (0.12, 0.12, 0.13), rough=0.8)

# ---- front of the stack (+Z)

oled = Part('OLED display', (0, 0, 34))
oled.add(slab(W - 2.4, H - 2.4, 0.55, R - 1.2, 12), 'OLED', xf((0, 0, T / 2 - 1.0)))
oled.add(box(22, 9, 0.25), 'Polyimide flex', xf((0, -H / 2 + 6, T / 2 - 1.35)))     # display driver tail
oled.add(box(6, 3, 0.5), 'Chip', xf((0, -H / 2 + 7, T / 2 - 1.55)))

fl = Part('Display flex cables', (0, -10, 24))
fl.add(box(14, 26, 0.2), 'Polyimide flex', xf((6, -H / 2 + 22, T / 2 - 1.9)))
fl.add(box(10, 3.2, 0.8), 'Gold', xf((6, -H / 2 + 34, T / 2 - 2.2)))
fl.add(box(8, 18, 0.2), 'Polyimide flex', xf((-6, -H / 2 + 20, T / 2 - 1.95)))
fl.add(box(7, 3, 0.8), 'Gold', xf((-6, -H / 2 + 29, T / 2 - 2.25)))

td = Part('TrueDepth camera', (0, 12, 28))
td.add(box(30, 7, 3.2, 0.8), 'Black plastic', xf((0, H / 2 - 7.5, T / 2 - 2.6)))
for x, r in ((-10, 1.6), (-4, 1.1), (5, 1.7), (11, 0.9)):
    td.add(cyl(r, 0.6, 24), 'Sapphire', xf((x, H / 2 - 7.5, T / 2 - 0.95)))
td.add(box(14, 5, 0.2), 'Polyimide flex', xf((0, H / 2 - 13, T / 2 - 3.6)))

ear = Part('Earpiece speaker', (0, 20, 36))
ear.add(box(13, 2.6, 2.2, 0.6), 'Black plastic', xf((0, H / 2 - 2.6, T / 2 - 2.0)))
ear.add(box(11, 1.0, 0.3), 'Mesh', xf((0, H / 2 - 2.2, T / 2 - 0.85)))

# ---- frame and internals (centre)

mid = Part('Aluminium midframe', (0, 0, 14))
mid.add(slab(W - 3.4, H - 3.4, 0.6, R - 1.8, 12), 'Aluminium', xf((0, 0, 1.75)))
for x, y in ((-18, 40), (18, 40), (-18, -30), (18, -30), (0, 0)):
    mid.add(cyl(1.6, 0.8, 16), 'Aluminium', xf((x, y, 1.2)))

Part('Graphite heat spreader', (0, 0, 7)).add(slab(40, 60, 0.15, 3, 4), 'Graphite', xf((10, 38, 1.35)))

# logic board: double-stacked PCB, upper right
lb = Part('Logic board', (8, 6, -16))
lb.add(slab(36, 58, 1.0, 3, 6), 'PCB', xf((14, 40, 0.6)))
lb.add(slab(36, 58, 1.0, 3, 6), 'PCB', xf((14, 40, -1.3)))
lb.add(box(32, 54, 1.0), 'Black plastic', xf((14, 40, -0.35)))        # interposer
for _ in range(46):
    sx, sy = random.uniform(1, 3.2), random.uniform(0.8, 2.6)
    lb.add(box(sx, sy, random.uniform(0.3, 0.7)), random.choice(['Chip', 'Chip', 'Shield', 'Gold']),
           xf((14 + random.uniform(-15, 15), 40 + random.uniform(-25, 25), 1.25)))
for x, y in ((3, 62), (25, 62), (25, 16)):
    lb.add(box(6, 2.6, 0.9), 'Gold', xf((x, y, 1.5)))                 # board-to-board connectors

soc = Part('A-series chip', (14, 8, -32))
soc.add(box(14.5, 14.5, 0.9, 0.4), 'Shield', xf((18, 46, -2.3)))
soc.add(box(12, 12, 0.5), 'Chip', xf((18, 46, -2.95)))

nand = Part('NAND storage', (18, -4, -28))
nand.add(box(11, 13, 1.0, 0.3), 'Chip', xf((10, 26, -2.3)))

modem = Part('Modem and radios', (22, 14, -26))
modem.add(box(10, 9, 1.0, 0.4), 'Shield', xf((22, 60, -2.25)))
modem.add(box(7, 7, 1.0, 0.4), 'Shield', xf((8, 58, -2.25)))

# battery
bat = Part('Battery', (-10, -6, -40))
bat.add(slab(50, 82, 5.0, 2.5, 6, bevel=0.6), 'Battery foil', xf((-8, -26, -0.6)))
bat.add(slab(46, 60, 0.12, 1.5, 4), 'Battery label', xf((-8, -26, -3.15)))
bat.add(box(16, 6, 0.3), 'Polyimide flex', xf((6, 12, 1.6)))
bat.add(box(5, 4, 1.0), 'Gold', xf((10, 14, 2.0)))

tabs = Part('Adhesive pull tabs', (-10, -30, -22))
for x in (-24, -8, 8):
    tabs.add(box(6.5, 80, 0.12), 'Adhesive', xf((x, -26, -3.3)))
    tabs.add(box(6.5, 8, 0.3), 'Black plastic', xf((x, -68.5, -3.2)))

tap = Part('Taptic Engine', (24, -10, -20))
tap.add(box(10, 32, 3.8, 1.2), 'Steel', xf((26, -44, -0.4)))
tap.add(box(8.5, 26, 0.4), 'Black plastic', xf((26, -44, 1.6)))
tap.add(box(4, 3, 0.4), 'Gold', xf((26, -27, 1.4)))

spk = Part('Loudspeaker', (-16, -24, -16))
spk.add(box(17, 11, 3.6, 1.2), 'Black plastic', xf((-21, -66, -0.4)))
spk.add(box(13, 1.2, 1.6), 'Mesh', xf((-21, -H / 2 + 1.6, -0.4)))

port = Part('USB-C port', (0, -36, -6))
port.add(box(8.9, 7, 3.2, 1.2), 'Steel', xf((0, -H / 2 + 4.6, 0)))
port.add(box(6.5, 4, 0.7), 'Black plastic', xf((0, -H / 2 + 3.8, 0)))
for k in range(12):
    port.add(box(0.25, 3.5, 0.08), 'Gold', xf((-2.75 + k * 0.5, -H / 2 + 3.9, 0.38)))
port.add(pipe([(4, -H / 2 + 8, 1.0), (14, -H / 2 + 14, 1.0), (24, -20, 1.0), (24, 6, 1.0)], 0.9, 6), 'Polyimide flex')


# screws: two pentalobes at the bottom, a scatter of tri-points inside in five lengths
pen = Part('Pentalobe screws', (0, -30, 0))
for x in (-6.5, 6.5):
    pen.add(screw(3.4, 0.75, 0.42), 'Steel', xf((x, -H / 2 - 0.9, 0), rot=(90, 0, 0)))

sc = Part('Internal screws', (0, 0, 20))
lengths = [1.2, 1.6, 2.0, 2.6, 3.4]
for i, (x, y) in enumerate(((3, 66), (25, 66), (30, 16), (2, 14), (-28, 62), (-6, 66), (20, -60), (30, -30), (-28, -70), (-12, -72), (12, 30), (30, 48))):
    L = lengths[i % 5]
    sc.add(screw(L, 0.55, 0.3), 'Steel', xf((x, y, 2.0 - L / 2)))

br = Part('Connector brackets', (0, 0, 10))
for x, y, w, d in ((14, 62, 26, 5), (25, 16, 7, 10), (10, 14, 9, 6), (-6, -64, 10, 6)):
    br.add(box(w, d, 0.3, 0.6), 'Steel', xf((x, y, 2.05)))

# ---- back of the stack (-Z)

mag = Part('MagSafe coil and magnets', (0, -4, -60))
mag.add(ring(23, 15, 0.5, 64), 'Copper', xf((0, -8, -3.35)))
for k in range(18):
    a = 360 * k / 18
    mag.add(ring(27.5, 24.5, 0.8, 4, a + 2, a + 18), 'Magnet', xf((0, -8, -3.4)))
mag.add(box(3, 10, 0.8), 'Magnet', xf((0, -42, -3.4)))
mag.add(box(18, 5, 0.15), 'Polyimide flex', xf((12, 10, -3.2)))


Part('Cover glass', (0, 0, 46)).add(cover, 'Cover glass')

fr = Part('Titanium frame', (0, 0, 0))
fr.add(band, 'Titanium')

cam = Part('Rear camera system', (-6, 10, -58))
for (lx, ly), b in zip(lens_xy, lenses):
    cam.add(b, 'Sapphire')
    cam.add(cyl(6.2, 6.4, 40, bevel=0.6), 'Black plastic', xf((lx, ly, -1.2)))
    cam.add(ring(6.8, 5.9, 1.0, 40), 'Titanium', xf((lx, ly, -T / 2 - 2.5)))
    cam.add(box(10, 10, 2.0, 0.5), 'Chip', xf((lx, ly, 2.2)))
cam.add(box(30, 6, 0.2), 'Polyimide flex', xf((lens_xy[0][0] + 6, lens_xy[0][1] - 9, 1.9)))

bg = Part('Back glass and camera plateau', (0, 0, -80))
bg.add(back, 'Back glass')
bg.add(plateau, 'Aluminium')

export('/home/claude/dbd/build/raw/iphone.glb')
