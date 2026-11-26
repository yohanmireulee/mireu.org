"""iPhone built from the supplied shell (iPhone18Pro.blend) with internals laid out after iFixit's iPhone 17 Pro
teardown: a compact stacked logic board in the top third, tucked against the camera plateau; a vapor chamber
over it; the battery in a steel tray held by Torx Plus screws; Taptic Engine, speaker and USB-C along the bottom.

The source is one solid body in millimetres. It is re-centred, then sliced into cover glass, frame band
and back glass so each can lift away; the plateau and lenses come straight from the source.
"""
import sys, math, random
sys.path.insert(0, '/home/claude/dbd/models')
from lib import *
from pcbkit import Board, board_materials
from mathutils import Matrix, Vector

SRC = '/home/claude/dbd/src_models/4465b385-iPhone18Pro.blend'
open_source(SRC)
M = Matrix.Translation((0, -77.0, -3.9))
_obs = {o.name: o for o in bpy.data.objects if o.type == 'MESH'}
_body = [o for n, o in _obs.items() if n.endswith('Fillet12')][0]
_plateau = [o for n, o in _obs.items() if n.endswith('[2]')][0]
_lenses = [o for n, o in _obs.items() if n.endswith(('[1]', '[3]', '[4]'))]
body = grab(_body, M, ratio=0.6, transfer=False)
plateau = grab(_plateau, M)
lenses = [grab(o, M) for o in _lenses]
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


cover = cut(body, 3.35, True)
back = cut(body, -3.35, False)
# no logos: the shell has the Apple logo pressed into the back; cut it out and close the hole flat
_zmin = min(v.co.z for v in back.verts)
_logo = [f for f in back.faces if abs(f.calc_center_median().x) < 16 and -40 < f.calc_center_median().y < 22
         and f.calc_center_median().z > _zmin + 0.015 and f.calc_center_median().z < _zmin + 1.2]
if _logo:
    _edges = set()
    bmesh.ops.delete(back, geom=_logo, context='FACES')
    _bound = [e for e in back.edges if e.is_boundary and abs(e.verts[0].co.z - _zmin) < 0.05 and abs(e.verts[0].co.x) < 17]
    bmesh.ops.holes_fill(back, edges=_bound, sides=0)
    print('logo faces removed', len(_logo))
band = cut(cut(body, 3.35, False, fill=False), -3.35, True, fill=False)

reset()
random.seed(4)
W, H, T, R = 73.5, 149.6, 8.2, 12.0
board_materials()
mat('Cover glass', (0.02, 0.025, 0.03), rough=0.03, coat=1.0)
mat('OLED', (0.005, 0.005, 0.008), rough=0.25)
mat('Aluminium', (0.74, 0.75, 0.77), metal=1, rough=0.33)
mat('Frame', (0.66, 0.64, 0.6), metal=1, rough=0.3)
mat('Vapor chamber', (0.72, 0.46, 0.32), metal=1, rough=0.35)
mat('Battery foil', (0.18, 0.18, 0.2), metal=0.4, rough=0.4)
mat('Battery label', (0.62, 0.63, 0.65), metal=0.6, rough=0.35)
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
mat('Lens', (0.02, 0.03, 0.05), rough=0.02, coat=1.0)

# ------------------------------------------------------------- front of the stack
Part('Cover glass', (0, 0, 60)).add(cover, 'Cover glass')

oled = Part('OLED display', (0, 0, 46))
oled.add(slab(W - 3.0, H - 3.0, 0.45, R - 1.4, 12), 'OLED', xf((0, 0, 3.05)))
oled.add(slab(W - 3.4, H - 3.4, 0.25, R - 1.6, 12), 'Graphite', xf((0, 0, 2.72)))       # back film
oled.add(box(26, 12, 0.15), 'Polyimide flex', xf((0, -H / 2 + 8.5, 2.5)))
oled.add(box(7, 3.2, 0.4), 'Chip', xf((0, -H / 2 + 9, 2.25)))                          # display driver
oled.add(box(8, 3, 0.6), 'Connector', xf((-6, -H / 2 + 14, 2.2)))

fl = Part('Display flex cables', (0, -10, 36))
fl.add(pipe([(0, -H / 2 + 14, 2.2), (-4, -48, 1.9), (-12, 20, 1.9), (-14, 28, 1.6)], 0.08, 4), 'Polyimide flex')
fl.add(box(9, 70, 0.12), 'Polyimide flex', xf((-12, -14, 1.95)))
fl.add(box(8, 3, 0.6), 'Connector', xf((-14, 28, 1.55)))

td = Part('TrueDepth camera', (0, 22, 40))
td.add(box(26, 7, 2.6, 0.6), 'Black plastic', xf((0, 66.5, 1.4)))
for x, r in ((-9, 1.6), (-3.5, 1.2), (3.5, 1.9), (9, 1.3)):                             # IR camera, flood, front camera, dot projector
    td.add(cyl(r, 1.0, 24), 'Lens', xf((x, 66.5, 2.9)))
    td.add(ring(r + 0.5, r, 0.6, 24), 'Steel', xf((x, 66.5, 2.8)))
td.add(box(14, 4, 0.12), 'Polyimide flex', xf((-8, 61, 1.7)))

ear = Part('Earpiece speaker', (0, 28, 48))
ear.add(box(11, 2.4, 2.0, 0.6), 'Black plastic', xf((0, 71.5, 1.8)))
ear.add(box(10, 1.2, 0.2), 'Mesh', xf((0, 71.8, 2.9)))

fr = Part('Aluminium unibody', (0, 0, 0))
fr.add(band, 'Frame')

mid = Part('Midframe and vapor chamber', (0, 0, 24))
mid.add(slab(W - 3.4, H - 3.4, 0.5, R - 1.8, 12), 'Aluminium', xf((0, 0, 1.6)))
mid.add(slab(44, 36, 0.4, 4, 8), 'Vapor chamber', xf((-6, 48, 1.15)))
for i in range(9):                                                                     # stamped wick texture
    mid.add(box(40, 0.25, 0.05), 'Copper', xf((-6, 34 + i * 3.6, 0.93)))
for x, y in ((-30, 62), (30, 62), (-30, -60), (30, -60), (-30, 25), (30, 25)):
    mid.add(cyl(1.4, 0.6, 16), 'Aluminium', xf((x, y, 1.1)))

# ------------------------------------------------------------- the stacked logic board (top third, L-shaped round the cameras)
POLY = [(-33, 26), (33, 26), (33, 34), (2, 34), (2, 71), (-33, 71)]
lb = Part('Logic board', (64, 10, -4))
up = Board(7).substrate(POLY, 0.0, 0.8, holes=[(-31, 69, 0.7), (-31, 28, 0.7), (31, 30, 0.7), (0, 69, 0.7)])
up.shield(-17, 58, 22, 18, 0.8)
up.shield(-24, 38, 13, 10, 0.7)
up.chip(-6, 39, 7, 7, 0.5)                                       # power management
up.chip(-29, 48, 4, 5, 0.45)
up.chip(20, 30, 6, 4, 0.45)                                      # audio amplifier
up.chip(-10, 30, 3.5, 3.5, 0.4)                                  # accelerometer / gyroscope
up.connector(-26, 29, 7, 1.6)                                     # battery
up.connector(10, 30.5, 8, 1.6)                                    # display
up.connector(-3, 64, 6, 1.4, rot=math.pi / 2)                     # front camera
up.connector(26, 30, 5, 1.4)                                      # USB-C flex
up.passives(22)
up.testpads(40)
up.silk(30)
up.into(lb)
# the interposer ring and the RF board under it
lb.add(prism([(-32, 27), (1, 27), (1, 70), (-32, 70)], 1.3), 'Connector', xf((0, 0, -0.65)))
lo = Board(11).substrate(POLY, -2.1, 0.8)
lo.shield(-15, 56, 24, 22, 0.7, dimples=False)
lo.chip(20, 30, 8, 3.5, 0.4)
lo.passives(8)
lo.testpads(20)
lo.into(lb)

soc = Part('A-series chip', (64, 10, 12))
soc.add(box(14, 15, 0.9, 0.35), 'Chip', xf((-17, 58, 1.25)))
soc.add(box(11, 12, 0.08), 'Die', xf((-17, 58, 1.72)))                                 # RAM stacked on the SoC
nand = Part('NAND storage', (72, 2, 10))
nand.add(box(11, 13, 0.9, 0.3), 'Chip', xf((-23, 38, 1.2)))
for k in range(3):
    nand.add(box(6, 0.12, 0.01), 'Silk', xf((-24, 36 + k * 1.0, 1.66)))
modem = Part('Modem and radios', (64, 10, -20))
modem.add(box(10, 9, 0.7, 0.3), 'Shield', xf((-15, 56, -1.0)))
modem.add(box(7, 6, 0.7, 0.3), 'Shield', xf((-27, 40, -1.0)))
for x in (-30.5, -2.5):
    modem.add(box(1.6, 3.2, 0.6, 0.2), 'Gold', xf((x, 66, -1.0)))                          # antenna feed clips

# ------------------------------------------------------------- battery in its tray
bat = Part('Battery', (-62, -4, -8))
bat.add(slab(64, 84, 4.6, 3.5, 8, bevel=0.6), 'Battery foil', xf((-1, -19, -1.0)))
bat.add(slab(54, 60, 0.05, 2, 6), 'Battery label', xf((-1, -16, 1.33)))
for k in range(4):
    bat.add(box(30 - k * 5, 0.3, 0.02), 'Black plastic', xf((-1, -36 + k * 1.6, 1.36)))
bat.add(box(12, 5, 0.8, 0.3), 'Black plastic', xf((-22, 25, 0.4)))                    # battery management board
bat.add(box(8, 3, 0.15), 'Polyimide flex', xf((-26, 27, 0.9)))
tray = Part('Battery tray', (-62, -4, -26))
tray.add(slab(67, 87, 0.3, 4, 8), 'Steel', xf((-1, -19, -3.45)))
for sx in (-1, 1):
    tray.add(box(0.3, 82, 2.0), 'Steel', xf((-1 + sx * 33.4, -19, -2.45)))
for x, y in ((-33, 22), (31, 22), (-33, -58), (31, -58)):                             # tabs for the Torx Plus screws
    tray.add(slab(6, 5, 0.3, 1.5, 6), 'Steel', xf((x, y, -1.2)))
    tray.add(screw(1.6, 1.0, 0.5), 'Steel', xf((x, y, -1.0)))
    tray.add(box(0.8, 0.2, 0.05), 'Black plastic', xf((x, y, -0.05)))
ad = Part('Battery adhesive', (-62, -4, -17))
for x in (-18, -1, 16):
    ad.add(box(8, 74, 0.1), 'Adhesive', xf((x, -19, -3.25)))

# ------------------------------------------------------------- bottom of the phone
tap = Part('Taptic Engine', (36, -52, -10))
tap.add(box(10, 32, 3.6, 1.0), 'Steel', xf((24, -60, -0.6)))
tap.add(box(8, 3, 0.15), 'Polyimide flex', xf((22, -42, 1.2)))
tap.add(box(6, 6, 0.3), 'Black plastic', xf((24, -48, 1.3)))
spk = Part('Loudspeaker', (-36, -52, -10))
spk.add(box(18, 11, 3.6, 1.0), 'Black plastic', xf((-22, -66, -0.6)))
spk.add(box(14, 1.2, 1.0), 'Mesh', xf((-22, -72, -0.6)))
port = Part('USB-C port', (0, -62, -6))
port.add(box(9.2, 7.0, 3.3, 1.5), 'Steel', xf((0, -70.8, -0.4)))
port.add(box(6.6, 5.0, 0.7, 0.3), 'Black plastic', xf((0, -71.0, -0.4)))
for i in range(12):
    port.add(box(0.22, 3.6, 0.05), 'Gold', xf((-2.6 + i * 0.47, -71.5, -0.03)))
port.add(pipe([(0, -66, -0.4), (6, -55, 0.6), (8, 10, 0.6), (26, 28, 0.6)], 0.09, 4), 'Polyimide flex')
port.add(box(5, 50, 0.12), 'Polyimide flex', xf((8, -25, 0.65)))
port.add(cyl(1.0, 1.0, 12), 'Black plastic', xf((-10, -71, -0.4), rot=(90, 0, 0)))    # microphone

pen = Part('Pentalobe screws', (0, -78, 0))
for x in (-6.5, 6.5):                                                                  # heads sit flush in the bottom edge
    pen.add(screw(3.0, 0.75, 0.42), 'Steel', xf((x, -H / 2 + 2.2, 0), rot=(90, 0, 0)))

sc = Part('Internal screws', (0, 0, 32))
random.seed(5)
for (x, y), L in zip(((-31, 69), (-31, 28), (31, 30), (0, 69), (-20, 22), (12, 22), (20, -40), (-22, -56), (26, -50), (-5, 62), (24, 66), (-30, 50)),
                     (1.2, 1.6, 2.0, 2.6, 1.2, 1.6, 2.0, 3.4, 1.2, 2.6, 1.6, 2.0)):
    sc.add(screw(L, 0.85, 0.45), 'Steel', xf((x, y, 2.0 - L / 2)))

br = Part('Connector brackets', (0, 0, 14))
for x, y, w, h in ((-26, 29, 9, 3.4), (10, 30.5, 10, 3.4), (-3, 64, 3.2, 8), (26, 30, 7, 3.2)):
    br.add(box(w, h, 0.25, 0.2), 'Steel', xf((x, y, 1.55)))

cam = Part('Rear camera system', (0, 26, -46))
for (lx, ly), b, r in zip(lens_xy, lenses, (6.6, 5.4, 5.4)):
    cam.add(b, 'Sapphire')
    cam.add(cyl(r, 5.4, 40, bevel=0.5), 'Black plastic', xf((lx, ly, -1.0)))
    cam.add(cyl(r - 1.6, 0.4, 40), 'Lens', xf((lx, ly, -3.85)))
    cam.add(ring(r + 0.4, r - 0.2, 1.0, 40), 'Aluminium', xf((lx, ly, -3.6)))
    cam.add(box(2 * r + 2, 2 * r + 2, 1.2, 0.5), 'Steel', xf((lx, ly, 1.6)))          # sensor and stabiliser housing
# the tetraprism telephoto lies on its side
tl = lens_xy[2] if len(lens_xy) > 2 else (22, 61)
cam.add(box(11, 18, 4.6, 1.0), 'Black plastic', xf((tl[0] - 1, tl[1] - 4, -0.8)))
cam.add(box(22, 6, 0.15), 'Polyimide flex', xf((10, 40, 0.8)))
cam.add(cyl(2.4, 1.2, 24), 'Lens', xf((-24, 64, -3.9)))                                # LiDAR
cam.add(cyl(2.0, 1.0, 24), 'Adhesive', xf((-24, 44, -3.9)))                            # flash

mag = Part('MagSafe coil and magnets', (0, -12, -52))
mag.add(ring(27, 17, 0.25, 64), 'Copper', xf((0, -6, -3.75)))
for k in range(18):
    a = math.radians(k * 20)
    mag.add(box(3.6, 2.2, 0.9), 'Magnet', xf((28.5 * math.cos(a), -6 + 28.5 * math.sin(a), -3.5), rot=(0, 0, k * 20)))
mag.add(box(4, 10, 0.9), 'Magnet', xf((0, -42, -3.5)))
mag.add(box(4, 16, 0.12), 'Polyimide flex', xf((22, 12, -3.6)))

bg = Part('Back glass and camera plateau', (0, 0, -72))
bg.add(back, 'Back glass')
bg.add(plateau, 'Aluminium')

export('/home/claude/dbd/build/raw/iphone.glb')
