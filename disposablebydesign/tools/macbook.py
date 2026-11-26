import sys, math, random
sys.path.insert(0, '/home/claude/dbd/models')
from lib import *

reset()
random.seed(11)
W, D = 304.1, 215.0
BASE = 7.4
mat('Aluminium', (0.78, 0.79, 0.81), metal=1, rough=0.38)
mat('Aluminium dark', (0.36, 0.38, 0.42), metal=1, rough=0.42)
mat('Keycap', (0.03, 0.03, 0.035), rough=0.45)
mat('PCB', (0.03, 0.22, 0.1), rough=0.45)
mat('Chip', (0.04, 0.04, 0.045), rough=0.35)
mat('SoC lid', (0.7, 0.71, 0.73), metal=1, rough=0.3)
mat('NAND', (0.08, 0.08, 0.09), rough=0.3)
mat('Gold', (0.95, 0.74, 0.35), metal=1, rough=0.25)
mat('Battery cell', (0.12, 0.12, 0.13), rough=0.5)
mat('Battery wrap', (0.72, 0.72, 0.74), metal=0.5, rough=0.4)
mat('Adhesive', (0.55, 0.56, 0.55), rough=0.6)
mat('Polyimide flex', (0.66, 0.43, 0.12), rough=0.4)
mat('Black plastic', (0.025, 0.025, 0.028), rough=0.55)
mat('Steel', (0.6, 0.6, 0.62), metal=1, rough=0.3)
mat('Graphite', (0.09, 0.09, 0.1), rough=0.7)
mat('Copper', (0.8, 0.45, 0.28), metal=1, rough=0.3)
mat('Glass', (0.01, 0.012, 0.015), rough=0.04, coat=1.0)
mat('LCD', (0.01, 0.015, 0.03), rough=0.2)
mat('Rubber', (0.05, 0.05, 0.05), rough=0.85)
mat('Trackpad glass', (0.7, 0.71, 0.73), rough=0.25, coat=0.6)

# ---------------- base, bottom up
bc = Part('Bottom case', (0, 0, -70))
bc.add(slab(W, D, 1.0, 10, 10, bevel=0.5), 'Aluminium', xf((0, 0, 0.5)))
bc.add(frame(W, D, 5.6, 10, 1.1, 10), 'Aluminium', xf((0, 0, 3.8)))
for x in (-W / 2 + 20, W / 2 - 20):
    for y in (-D / 2 + 18, D / 2 - 18):
        bc.add(cyl(5.2, 0.8, 24, bevel=0.3), 'Rubber', xf((x, y, -0.4)))
for x in range(-110, 120, 22):                                         # stiffening ribs
    bc.add(box(1.2, 150, 0.8), 'Aluminium', xf((x, -10, 1.4)))

ps = Part('Pentalobe screws', (0, 0, -105))
for x, y in ((-W / 2 + 7, D / 2 - 7), (W / 2 - 7, D / 2 - 7), (-W / 2 + 7, -D / 2 + 7), (W / 2 - 7, -D / 2 + 7), (-50, D / 2 - 7), (50, D / 2 - 7)):
    ps.add(screw(3.2, 1.6, 0.8), 'Steel', xf((x, y, 0.2), rot=(180, 0, 0)))

cells = Part('Battery cells', (0, -8, -40))
for x in (-104, -36, 36, 104):
    cells.add(slab(62, 112, 3.6, 3, 6, bevel=0.6), 'Battery wrap', xf((x, -40, 3.2)))
    cells.add(slab(56, 96, 0.1, 2, 4), 'Battery cell', xf((x, -40, 5.06)))
cells.add(box(200, 14, 0.4), 'Polyimide flex', xf((0, 20, 5.1)))
bm_ = Part('Battery management board', (0, 18, -26))
bm_.add(slab(70, 12, 1.0, 2, 4), 'PCB', xf((0, 24, 5.2)))
for k in range(9):
    bm_.add(box(random.uniform(2, 5), random.uniform(2, 4), 0.6), 'Chip', xf((-30 + k * 7.5, 24, 5.9)))

ad = Part('Battery adhesive', (0, -8, -20))
for x in (-104, -36, 36, 104):
    for dx in (-18, 0, 18):
        ad.add(box(8, 104, 0.15), 'Adhesive', xf((x + dx, -40, 5.15)))

# logic board, centre rear
lb = Part('Logic board', (0, 12, -12))
lb.add(slab(118, 52, 1.0, 4, 6), 'PCB', xf((0, 62, 4.4)))
for _ in range(70):
    lb.add(box(random.uniform(1.5, 5), random.uniform(1.2, 4), random.uniform(0.3, 0.8)), random.choice(['Chip', 'Chip', 'Steel', 'Gold']),
           xf((random.uniform(-55, 55), 62 + random.uniform(-22, 22), 5.1)))
for x in (-50, 50, -20):
    lb.add(box(8, 3, 1.0), 'Gold', xf((x, 88 - 2, 5.3)))

soc = Part('M-series chip and memory', (0, 18, 18))
soc.add(box(26, 22, 0.6, 0.6), 'PCB', xf((-6, 60, 5.2)))
soc.add(box(16, 16, 0.9, 0.5), 'SoC lid', xf((-10, 60, 5.9)))
soc.add(box(7, 16, 0.9, 0.4), 'Chip', xf((4, 60, 5.9)))

ssd = Part('Soldered SSD', (22, 8, 26))
for x in (32, 46):
    ssd.add(box(12, 16, 1.2, 0.4), 'NAND', xf((x, 60, 5.5)))
ssd.add(box(9, 9, 0.9, 0.3), 'Chip', xf((22, 72, 5.4)))     # controller lives in the SoC; this is the PMIC beside it

hs = Part('Heat spreader', (0, 18, 34))
hs.add(slab(96, 40, 0.5, 3, 6), 'Aluminium dark', xf((0, 62, 6.4)))
hs.add(slab(70, 30, 0.15, 3, 6), 'Graphite', xf((0, 62, 6.1)))

spk = Part('Speakers', (0, 10, 0))
for sx in (-1, 1):
    spk.add(box(46, 18, 4.2, 2), 'Black plastic', xf((sx * 112, 80, 3.6)))
    spk.add(box(40, 2, 1.5), 'Steel', xf((sx * 112, 90, 4.2)))

pb = Part('Port boards', (0, 0, 0))
pb.add(box(8, 52, 3.6, 1), 'PCB', xf((-W / 2 + 8, 52, 3.4)))
pb.add(box(5, 16, 2.6, 1.2), 'Steel', xf((-W / 2 + 3.6, 40, 3.6)))       # MagSafe
for y in (60, 72):
    pb.add(box(5, 9, 3.2, 1.2), 'Steel', xf((-W / 2 + 3.6, y, 3.6)))     # two USB-C
pb.add(box(8, 18, 3.6, 1), 'PCB', xf((W / 2 - 8, 60, 3.4)))
pb.add(cyl(2.6, 6, 20), 'Steel', xf((W / 2 - 4, 60, 3.6), rot=(0, 90, 0)))   # headphone jack
pb.add(box(30, 8, 0.3), 'Polyimide flex', xf((-W / 2 + 28, 52, 5.4)))

tp = Part('Trackpad', (0, -10, 30))
tp.add(slab(134, 83, 0.9, 4, 8, bevel=0.3), 'Trackpad glass', xf((0, -D / 2 + 50, BASE - 0.4)))
tp.add(box(110, 64, 1.6), 'Aluminium dark', xf((0, -D / 2 + 50, BASE - 1.8)))
tp.add(box(46, 12, 2.6, 1), 'Steel', xf((0, -D / 2 + 52, BASE - 3.6)))   # Taptic engine
tp.add(box(40, 6, 0.2), 'Polyimide flex', xf((0, -D / 2 + 96, BASE - 2.8)))

tc = Part('Top case', (0, 0, 52))
deck = slab(W, D, 0.8, 10, 10, bevel=0.3)
tc.add(deck, 'Aluminium', xf((0, 0, BASE - 0.4)))
tc.add(box(278, 2, 1.6), 'Aluminium', xf((0, -D / 2 + 94, BASE - 1.2)))

kb = Part('Keyboard', (0, 0, 78))
pitch = 18.6
rows = [
    [0.5] * 0,
]
layout = [
    (14, [1] * 13 + [1.0]),                                           # function row (half height)
    (0, [1] * 13 + [1.5]),
    (0, [1.5] + [1] * 13),
    (0, [1.8] + [1] * 11 + [1.8]),
    (0, [2.3] + [1] * 10 + [2.3]),
    (0, [1, 1, 1, 1.25, 5.4, 1.25, 1, 3]),
]
ky = D / 2 - 30
for ri, (half, keys) in enumerate(layout):
    h = 9 if ri == 0 else 15.6
    tot = sum(keys) * pitch
    x = -tot / 2
    for k in keys:
        wk = k * pitch - 3
        kb.add(slab(wk, h, 0.7, 2.2, 4, bevel=0.25), 'Keycap', xf((x + k * pitch / 2, ky, BASE + 0.25)))
        x += k * pitch
    ky -= (h / 2 + 3 + (7.8 if ri < 5 else 0)) if ri == 0 else pitch
kb.add(ring(7.2, 6.4, 0.3, 32), 'Steel', xf((W / 2 - 25, D / 2 - 30, BASE + 0.62)))    # Touch ID ring
kb.add(box(270, 112, 0.3), 'Black plastic', xf((0, D / 2 - 75, BASE - 0.3)))         # backlight sheet

kf = Part('Keyboard and trackpad flex', (0, 6, 14))
kf.add(box(60, 10, 0.2), 'Polyimide flex', xf((40, 30, 6.0)))
kf.add(box(10, 60, 0.2), 'Polyimide flex', xf((70, 0, 6.0)))

# ---------------- lid: modeled flat with the screen facing +Z, then hinged open to 110 degrees
OPEN = 70
hinge_y = D / 2 - 4
n = (0, -math.sin(math.radians(OPEN)), math.cos(math.radians(OPEN)))


def lid(loc_local):
    x, y, z = loc_local
    return xf((0, hinge_y, BASE + 1.0)) @ xf(rot=(OPEN, 0, 0)) @ xf((x, y, z))


LD = 212
def nv(k, extra=(0, 0, 0)):
    return (n[0] * k + extra[0], n[1] * k + extra[1], n[2] * k + extra[2])

ls = Part('Display lid', nv(-55, (0, 0, 20)))
ls.add(slab(W, LD, 1.0, 10, 10, bevel=0.5), 'Aluminium', lid((0, LD / 2, -1.6)))
ls.add(frame(W, LD, 2.2, 10, 1.0, 10), 'Aluminium', lid((0, LD / 2, -0.2)))

panel = Part('Liquid Retina panel', nv(26))
panel.add(slab(W - 6, LD - 6, 1.6, 8, 10), 'LCD', lid((0, LD / 2, 0.4)))
panel.add(box(200, 10, 0.3), 'Polyimide flex', lid((0, 4, 0.0)))
panel.add(box(60, 6, 1.0), 'Chip', lid((0, 8, 0.3)))

gl = Part('Display glass and bezel', nv(46))
gl.add(slab(W - 1.6, LD - 1.6, 0.6, 9.5, 10, bevel=0.2), 'Glass', lid((0, LD / 2, 1.5)))
gl.add(frame(W - 1.6, LD - 1.6, 0.62, 9.5, 4.5, 10), 'Black plastic', lid((0, LD / 2, 1.52)))
gl.add(slab(31, 7, 0.62, 3, 6), 'Black plastic', lid((0, LD - 6.5, 1.52)))           # the notch

cam = Part('FaceTime camera', nv(36, (0, 0, 14)))
cam.add(box(18, 5, 2.0, 1), 'Black plastic', lid((0, LD - 5, 0.6)))
cam.add(cyl(1.5, 0.4, 24), 'Glass', lid((0, LD - 5, 1.7)))
cam.add(box(40, 5, 0.2), 'Polyimide flex', lid((26, LD - 6, 0.2)))

hg = Part('Display hinge', (0, 30, -16))
for sx in (-1, 1):
    hg.add(cyl(3.2, 40, 24), 'Aluminium dark', xf((sx * 100, hinge_y, BASE + 1.0), rot=(0, 90, 0)))
    hg.add(box(36, 10, 1.6, 0.6), 'Steel', xf((sx * 100, hinge_y - 8, BASE - 1.2)))
hg.add(cyl(3.0, 230, 24), 'Black plastic', xf((0, hinge_y, BASE + 1.0), rot=(0, 90, 0)))   # antenna/hinge cover

dc = Part('Display cable', (0, 34, 4))
dc.add(pipe([(-80, 60, 5.6), (-80, hinge_y - 6, 5.6), (-80, hinge_y, BASE + 3)], 1.2, 8), 'Polyimide flex')
dc.add(box(12, 6, 1.0), 'Gold', xf((-80, 58, 5.7)))

export('/home/claude/dbd/build/raw/macbook.glb')
