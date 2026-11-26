import sys, math, random
sys.path.insert(0, '/home/claude/dbd/models')
from lib import *

reset()
random.seed(23)
# X forward, Y to the left, Z up; mm. Origin at the middle of the wheelbase on the ground.
AX = 1445            # half wheelbase
TR = 818             # half track
WR = 360             # wheel radius

mat('Paint', (0.2, 0.215, 0.23), metal=0.7, rough=0.2, coat=1.0)      # midnight silver
mat('Gloss black', (0.02, 0.02, 0.022), rough=0.15, coat=1.0)
mat('Matte black', (0.035, 0.035, 0.04), rough=0.75)
mat('Glass', (0.015, 0.02, 0.025), rough=0.03, alpha=0.82, coat=1.0)
mat('Light lens', (0.85, 0.88, 0.9), rough=0.05, alpha=0.6)
mat('DRL', (1, 1, 1), emit=((1.0, 0.98, 0.95), 4.0))
mat('Tail red', (0.5, 0.02, 0.02), rough=0.2, emit=((0.9, 0.05, 0.03), 1.5))
mat('Cast aluminium', (0.64, 0.65, 0.66), metal=1, rough=0.5)
mat('Aluminium', (0.78, 0.79, 0.8), metal=1, rough=0.32)
mat('Steel', (0.5, 0.51, 0.53), metal=1, rough=0.35)
mat('Dark steel', (0.22, 0.22, 0.24), metal=1, rough=0.45)
mat('Cell can', (0.7, 0.7, 0.72), metal=1, rough=0.3)
mat('Cell top', (0.12, 0.12, 0.13), rough=0.5)
mat('Foam', (0.86, 0.85, 0.82), rough=0.95)
mat('Copper', (0.78, 0.42, 0.24), metal=1, rough=0.3)
mat('PCB', (0.03, 0.22, 0.1), rough=0.45)
mat('Tyre', (0.03, 0.03, 0.032), rough=0.85)
mat('Rim', (0.12, 0.12, 0.13), metal=0.8, rough=0.3)
mat('Rotor', (0.45, 0.45, 0.46), metal=1, rough=0.55)
mat('Caliper', (0.2, 0.2, 0.22), metal=0.5, rough=0.4)
mat('Seat', (0.92, 0.91, 0.88), rough=0.6)          # the white vegan leather
mat('Seat dark', (0.06, 0.06, 0.07), rough=0.6)
mat('Trim wood', (0.42, 0.3, 0.2), rough=0.5)
mat('Screen', (0.01, 0.012, 0.015), rough=0.08, coat=1)
mat('Screen glow', (0.5, 0.55, 0.6), emit=((0.55, 0.62, 0.72), 1.2))
mat('Rubber', (0.04, 0.04, 0.045), rough=0.85)
mat('HV cable', (0.16, 0.16, 0.17), rough=0.5)
mat('Plastic', (0.07, 0.07, 0.075), rough=0.6)
mat('Radiator fin', (0.7, 0.71, 0.72), metal=1, rough=0.4)

# ------------------------------------------------------------- body surfaces
# (x, half width, z bottom, z top, superellipse exponent)
LOWER = [(2405, 300, 380, 600, 2.2), (2390, 520, 300, 660, 2.4), (2350, 770, 250, 730, 2.7), (2250, 900, 200, 800, 3.2),
         (2000, 945, 178, 880, 3.6), (1500, 955, 170, 950, 4.0), (1000, 960, 168, 1000, 4.2), (0, 960, 165, 1010, 4.4),
         (-1000, 960, 168, 1020, 4.4), (-1600, 955, 175, 1020, 4.2), (-2000, 935, 200, 1012, 3.8), (-2250, 880, 260, 992, 3.2),
         (-2330, 790, 320, 965, 2.7), (-2361, 620, 380, 925, 2.3), (-2368, 400, 450, 880, 2.2)]
# greenhouse: (x, half width at the belt, belt z, height above belt, exponent)
UPPER = [(1150, 880, 992, 4, 2.25), (1000, 880, 1000, 110, 2.25), (700, 868, 1004, 370, 2.25), (400, 860, 1008, 545, 2.3),
         (100, 856, 1010, 606, 2.35), (-500, 852, 1015, 614, 2.35), (-1100, 848, 1020, 592, 2.35), (-1600, 828, 1020, 480, 2.3),
         (-2000, 800, 1012, 280, 2.25), (-2250, 760, 994, 70, 2.25), (-2300, 745, 990, 4, 2.25)]


def interp(secs, x):
    xs = [s[0] for s in secs]
    n = len(secs)
    for i in range(n - 1):
        if xs[i] >= x >= xs[i + 1]:
            break
    x0, x1 = xs[i], xs[i + 1]
    t = (x - x0) / (x1 - x0) if x1 != x0 else 0
    out = []
    for k in range(1, len(secs[0])):
        def val(j):
            return secs[max(0, min(n - 1, j))][k]
        def slope(j):
            a, b = max(0, j - 1), min(n - 1, j + 1)
            return (secs[b][k] - secs[a][k]) / (xs[b] - xs[a]) * (x1 - x0)
        p0, p1, m0, m1 = val(i), val(i + 1), slope(i), slope(i + 1)
        t2, t3 = t * t, t * t * t
        out.append((2 * t3 - 3 * t2 + 1) * p0 + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * p1 + (t3 - t2) * m1)
    return out


def lower(x0, x1, steps, th0=0.0, th1=360.0, off=0.0, seg=None, cap=True):
    seg = seg or max(4, int(round(80 * (th1 - th0) / 360)))
    secs = []
    for i in range(steps + 1):
        x = x0 + (x1 - x0) * i / steps
        hw, zb, zt, n = interp(LOWER, x)
        secs.append((x, hw + off, zb - off, zt + off, n))
    return loft(secs, seg, th0, th1, cap)


def upper(x0, x1, steps, th0=0.0, th1=180.0, off=0.0, seg=None):
    seg = seg or max(3, int(round(56 * (th1 - th0) / 180)))
    secs = []
    for i in range(steps + 1):
        x = x0 + (x1 - x0) * i / steps
        hw, belt, h, n = interp(UPPER, x)
        secs.append((x, hw + off, belt - h - off, belt + h + off, n))
    return loft(secs, seg, th0, th1, cap=False)


def mirror_y(bm):
    bmesh.ops.scale(bm, vec=(1, -1, 1), verts=bm.verts)
    bmesh.ops.reverse_faces(bm, faces=bm.faces)
    return bm


body = Part('Body shell', (0, 0, 1750), smooth=50)
cutters = []
for sx in (-1, 1):
    for sy in (-1, 1):
        c = cyl(405, 520, 64)
        bmesh.ops.transform(c, matrix=xf((sx * AX, sy * 930, WR - 10), (90, 0, 0)), verts=c.verts)
        cutters.append(('BOOLEAN', c))
body.add(apply_mods(lower(2150, -2150, 80), cutters), 'Paint')
for sx in (-1, 1):
    for sy in (-1, 1):
        body.add(ring(412, 396, 300, 48, -12, 192), 'Matte black', xf((sx * AX, sy * 800, WR - 10), (90, 0, 0)))
for sy in (-1, 1):                                                             # rocker trim
    body.add(lower(1020, -1030, 30, -62, -48, 3) if sy > 0 else lower(1020, -1030, 30, 228, 242, 3), 'Gloss black')

ff = Part('Front fascia', (1350, 0, 0), smooth=50)
ff.add(lower(2405, 2150, 18), 'Paint')
ff.add(lower(2404, 2330, 8, 240, 300, 2), 'Matte black')                      # lower intake
ff.add(lower(2310, 2200, 6, 300, 340, 2), 'Matte black')
ff.add(lower(2310, 2200, 6, 200, 240, 2), 'Matte black')
rf = Part('Rear fascia', (-1350, 0, 0), smooth=50)
rf.add(lower(-2150, -2368, 16), 'Paint')
rf.add(lower(-2300, -2366, 8, 235, 305, 2), 'Matte black')                    # diffuser
rf.add(cyl(14, 4, 16), 'Plastic', xf((-2366, 0, 640), (0, 90, 0)))            # camera

hl = Part('Headlights', (1750, 0, 300))
for (a0, a1) in ((14, 34), (146, 166)):
    hl.add(lower(2345, 2190, 10, a0, a1, 3), 'Gloss black')
    hl.add(lower(2338, 2200, 10, a0 + 13, a0 + 16, 5) if a0 < 90 else lower(2338, 2200, 10, a1 - 16, a1 - 13, 5), 'DRL')
    hl.add(lower(2345, 2190, 10, a0, a1, 6), 'Light lens')
tl = Part('Tail lights', (-1750, 0, 300))
for (a0, a1) in ((20, 46), (134, 160)):
    tl.add(lower(-2205, -2345, 10, a0, a1, 3), 'Tail red')
    tl.add(lower(-2205, -2345, 10, a0, a1, 6), 'Light lens')

glass = Part('Glass roof and windows', (0, 0, 2500), smooth=50)
glass.add(upper(1150, -1560, 60), 'Glass')
trim = Part('Pillars and roof rails', (0, 0, 2250), smooth=50)
for (a0, a1) in ((40, 47), (133, 140)):
    trim.add(upper(1000, -1560, 50, a0, a1, 3), 'Gloss black')
trim.add(upper(-30, -110, 4, 0, 180, 3), 'Gloss black')                        # B-pillar hoop
trim.add(upper(-900, -980, 4, 47, 133, 3), 'Gloss black')                      # roof crossbar
for (a0, a1) in ((0, 4), (176, 180)):
    trim.add(upper(1000, -1560, 50, a0, a1, 3), 'Gloss black')                 # belt line

frunk = Part('Frunk lid', (900, 0, 2000), smooth=50)
frunk.add(lower(2260, 1040, 30, 52, 128, 4, cap=False), 'Paint')
lg = Part('Liftgate', (-900, 0, 1950), smooth=50)
lg.add(upper(-1560, -2300, 24, 0, 180, 4), 'Glass')
lg.add(lower(-1980, -2350, 14, 40, 140, 4, cap=False), 'Paint')
lg.add(upper(-2210, -2300, 4, 20, 160, 9), 'Paint')                           # spoiler lip
lg.add(box(30, 300, 20, 6), 'Gloss black', xf((-2330, 0, 905)))

def door(name, x0, x1, side, explode, mirror=False):
    p = Part(name, explode, smooth=50)
    a0, a1 = (-48, 72) if side > 0 else (108, 228)
    p.add(lower(x0, x1, 24, a0, a1, 4, cap=False), 'Paint')
    xm = (x0 + x1) / 2
    hw, zb, zt, n = interp(LOWER, xm)
    p.add(slab(160, 30, 6, 10), 'Gloss black', xf((xm - 120, side * (hw + 6), 880), (90, 0, 0)))  # flush handle
    hw2, belt, h, _ = interp(UPPER, xm)
    # inner door card, visible once the door is off
    p.add(box(abs(x1 - x0) - 120, 30, 520, 20), 'Seat dark', xf((xm, side * (hw - 80), 640)))
    p.add(box(abs(x1 - x0) - 300, 34, 40, 8), 'Trim wood', xf((xm, side * (hw - 84), 840)))
    p.add(box(140, 40, 80, 10), 'Plastic', xf((xm - 200, side * (hw - 70), 360)))       # speaker
    if mirror:
        p.add(box(200, 160, 110, 40), 'Paint', xf((x0 - 40, side * (hw + 90), 1060), (0, 0, side * 8)))
        p.add(box(30, 20, 60, 6), 'Paint', xf((x0 - 40, side * (hw + 10), 1040)))
        p.add(box(10, 130, 85, 20), 'Glass', xf((x0 - 145, side * (hw + 92), 1060)))
    return p

door('Front left door', 1020, -45, 1, (150, 1350, 450), True)
door('Rear left door', -75, -1030, 1, (-250, 1350, 450))
door('Front right door', 1020, -45, -1, (150, -1350, 450), True)
door('Rear right door', -75, -1030, -1, (-250, -1350, 450))

# ------------------------------------------------------------- structural battery pack
PX0, PX1, PY, PZ = -950, 1000, 720, 170
tray = Part('Battery pack tray', (0, 0, -1550))
tray.add(box(PX1 - PX0, 2 * PY, 8, 2), 'Aluminium', xf(((PX0 + PX1) / 2, 0, PZ + 4)))
for sy in (-1, 1):
    tray.add(box(PX1 - PX0, 60, 140, 6), 'Aluminium', xf(((PX0 + PX1) / 2, sy * (PY - 30), PZ + 70)))
for x in (PX0 + 30, PX1 - 30):
    tray.add(box(60, 2 * PY, 140, 6), 'Aluminium', xf((x, 0, PZ + 70)))
tray.add(box(PX1 - PX0 - 60, 40, 120, 4), 'Aluminium', xf(((PX0 + PX1) / 2, 0, PZ + 60)))
for k in range(20):
    x = PX0 + 60 + k * (PX1 - PX0 - 120) / 19
    for sy in (-1, 1):
        tray.add(cyl(10, 20, 12), 'Steel', xf((x, sy * (PY - 30), PZ + 148)))

cells = Part('4680 cells', (0, 0, -1150))
bm = bmesh.new()
cols, rows, pitch = 36, 26, 52
cell_xy = []
for i in range(cols):
    x = PX0 + 80 + i * pitch
    for j in range(rows):
        y = -PY + 75 + j * pitch + (pitch / 2 if i % 2 else 0)
        if abs(y) < 40 or abs(y) > PY - 60:
            continue
        cell_xy.append((x, y))
for x, y in cell_xy:
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=10, radius1=23, radius2=23, depth=80,
                          matrix=Matrix.Translation((x, y, PZ + 52)))
cells.add(bm, 'Cell can')
top_bm = bmesh.new()
for x, y in cell_xy:
    bmesh.ops.create_circle(top_bm, cap_ends=True, cap_tris=False, segments=8, radius=14, matrix=Matrix.Translation((x, y, PZ + 92.6)))
cells.add(top_bm, 'Cell top')
print('cells', len(cell_xy))

foam = Part('Structural foam', (0, 0, -760))
foam.add(box(PX1 - PX0 - 140, 2 * PY - 130, 60, 4), 'Foam', xf(((PX0 + PX1) / 2, 0, PZ + 52)))
hb = bmesh.new()
for x, y in cell_xy:
    bmesh.ops.create_circle(hb, cap_ends=True, cap_tris=False, segments=8, radius=23.5, matrix=Matrix.Translation((x, y, PZ + 82.4)))
foam.add(hb, 'Matte black')

bus = Part('Busbars and battery management', (0, 0, -440))
for j in range(rows - 1):
    y = -PY + 75 + j * pitch + pitch / 4
    if abs(y) < 40 or abs(y) > PY - 70:
        continue
    bus.add(box(cols * pitch - 30, 14, 3), 'Copper', xf((PX0 + 80 + (cols - 1) * pitch / 2, y, PZ + 98)))
bus.add(box(220, 900, 40, 6), 'Plastic', xf((PX1 - 70, 0, PZ + 110)))           # BMS housing
bus.add(box(200, 860, 2), 'PCB', xf((PX1 - 70, 0, PZ + 132)))
for k in range(40):
    bus.add(box(random.uniform(8, 30), random.uniform(8, 30), random.uniform(3, 10)), random.choice(['Plastic', 'Steel', 'Copper']),
            xf((PX1 - 70 + random.uniform(-85, 85), random.uniform(-400, 400), PZ + 137)))
for sy in (-1, 1):
    bus.add(box(80, 120, 60, 8), 'Plastic', xf((PX1 + 10, sy * 220, PZ + 110)))   # HV connectors

lid = Part('Pack lid (the cabin floor)', (0, 0, -160))
lid.add(box(PX1 - PX0, 2 * PY, 10, 3), 'Matte black', xf(((PX0 + PX1) / 2, 0, PZ + 145)))
for x in (-850, -500, 200, 560):
    for sy in (-1, 1):
        lid.add(box(60, 90, 40, 6), 'Steel', xf((x, sy * 400, PZ + 170)))         # seat mounts on the pack
for x in (-640, 380):
    lid.add(box(70, 2 * PY - 120, 50, 6), 'Steel', xf((x, 0, PZ + 175)))         # seat crossmembers

# ------------------------------------------------------------- castings
fc = Part('Front megacasting', (1000, 0, -650))
for sy in (-1, 1):
    fc.add(box(820, 120, 220, 18), 'Cast aluminium', xf((1830, sy * 480, 440)))
    fc.add(lathe([(150, 0), (150, 40), (110, 120), (95, 380), (120, 400), (0, 400)], 32), 'Cast aluminium', xf((AX, sy * 560, 380)))
    for k in range(5):
        fc.add(box(18, 100, 200, 3), 'Cast aluminium', xf((1500 + k * 160, sy * 400, 430)))
fc.add(box(80, 1100, 200, 16), 'Cast aluminium', xf((2230, 0, 440)))
fc.add(box(820, 850, 14, 4), 'Cast aluminium', xf((1830, 0, 350)))
for k in range(6):
    fc.add(box(820, 14, 80, 2), 'Cast aluminium', xf((1830, -360 + k * 144, 395)))
for k in range(5):
    fc.add(box(14, 850, 80, 2), 'Cast aluminium', xf((1500 + k * 160, 0, 395)))
for sy in (-1, 1):
    for x in (1500, 1900, 2200):
        fc.add(cyl(22, 60, 16), 'Cast aluminium', xf((x, sy * 480, 570)))

rc = Part('Rear megacasting', (-1000, 0, -650))
for sy in (-1, 1):
    rc.add(box(960, 130, 260, 18), 'Cast aluminium', xf((-1800, sy * 500, 460)))
    rc.add(lathe([(150, 0), (150, 40), (115, 120), (95, 340), (120, 360), (0, 360)], 32), 'Cast aluminium', xf((-AX + 60, sy * 560, 420)))
    for k in range(6):
        rc.add(box(18, 110, 240, 3), 'Cast aluminium', xf((-1380 - k * 160, sy * 405, 450)))
rc.add(box(90, 1150, 240, 16), 'Cast aluminium', xf((-2240, 0, 470)))
rc.add(box(90, 1150, 180, 16), 'Cast aluminium', xf((-1330, 0, 420)))
rc.add(box(960, 880, 14, 4), 'Cast aluminium', xf((-1800, 0, 520)))
for k in range(7):
    rc.add(box(960, 14, 90, 2), 'Cast aluminium', xf((-1800, -390 + k * 130, 570)))
for k in range(6):
    rc.add(box(14, 880, 90, 2), 'Cast aluminium', xf((-1380 - k * 165, 0, 570)))

# ------------------------------------------------------------- drive units
def drive_unit(name, x, r, explode, sign):
    p = Part(name, explode)
    p.add(cyl(r, 330, 40, bevel=12), 'Aluminium', xf((x, 110, WR), (90, 0, 0)))
    for k in range(16):
        a = TAU * k / 16
        p.add(box(330, 8, 14), 'Aluminium', xf((x + (r + 4) * math.cos(a), 110, WR + (r + 4) * math.sin(a)), (0, -math.degrees(a), 0)) @ xf((0, 0, 0), (0, 0, 90)))
    p.add(box(300, 220, 320, 30), 'Cast aluminium', xf((x, -150, WR + 20)))       # gearbox
    p.add(box(320, 300, 110, 20), 'Cast aluminium', xf((x - sign * 20, 40, WR + r + 60)))   # inverter
    p.add(box(80, 90, 60, 10), 'Plastic', xf((x + sign * 90, 60, WR + r + 140)))   # HV connector
    for sy in (-1, 1):                                                         # half shafts with CV boots
        y0, y1 = sy * 250, sy * (TR - 110)
        p.add(pipe([(x, y0, WR), (x, y1, WR)], 20, 14), 'Steel')
        for yy in (y0 + sy * 40, y1 - sy * 40):
            p.add(lathe([(26, -55), (45, -40), (34, -25), (50, -10), (36, 5), (50, 20), (34, 35), (28, 55)], 24), 'Rubber',
                  xf((x, yy, WR), (90, 0, 0)))
    for sy in (-1, 1):
        p.add(box(60, 80, 60, 8), 'Rubber', xf((x, sy * 280, WR + 120)))         # mounts
    return p

drive_unit('Front drive unit', AX, 120, (700, 0, -1050), 1)
drive_unit('Rear drive unit', -AX, 135, (-700, 0, -1050), -1)

# ------------------------------------------------------------- suspension
fs = Part('Front suspension', (0, 0, -380))
for sy in (-1, 1):
    fs.add(pipe([(AX - 220, sy * 300, 300), (AX - 20, sy * (TR - 110), 270), (AX + 220, sy * 300, 300)], 18, 10), 'Dark steel')
    fs.add(pipe([(AX - 150, sy * 470, 700), (AX, sy * (TR - 170), 690), (AX + 150, sy * 470, 700)], 15, 10), 'Dark steel')
    fs.add(box(90, 70, 380, 20), 'Cast aluminium', xf((AX, sy * (TR - 140), WR + 60)))            # knuckle
    fs.add(cyl(30, 380, 18, bevel=6), 'Dark steel', xf((AX - 30, sy * 600, 560), (sy * -6, 0, 0)))
    fs.add(cyl(14, 120, 12), 'Steel', xf((AX - 30, sy * 610, 790), (sy * -6, 0, 0)))
    fs.add(helix(62, 8, 6, 240, 20, 8), 'Steel', xf((AX - 30, sy * 600, 620), (sy * -6, 0, 0)))
    fs.add(pipe([(AX + 180, sy * 220, 330), (AX + 230, sy * 520, 330), (AX + 60, sy * (TR - 170), 330)], 10, 8), 'Steel')  # anti-roll bar
fs.add(box(500, 620, 60, 10), 'Dark steel', xf((AX, 0, 270)))                                    # subframe
fs.add(pipe([(AX + 180, -220, 330), (AX + 180, 220, 330)], 10, 8), 'Steel')

rs = Part('Rear suspension', (0, 0, -380))
for sy in (-1, 1):
    k = (-AX, sy * (TR - 130), WR)
    for (px, py, pz) in ((-AX - 250, sy * 320, 300), (-AX + 250, sy * 330, 290), (-AX - 150, sy * 420, 620),
                         (-AX + 150, sy * 420, 610), (-AX + 260, sy * 300, 420)):
        rs.add(pipe([(px, py, pz), (k[0] + (px + AX) * 0.15, k[1], k[2] + (pz - WR) * 0.5)], 13, 8), 'Dark steel')
    rs.add(box(110, 70, 340, 20), 'Cast aluminium', xf(k))
    rs.add(helix(70, 9, 5, 200, 20, 8), 'Steel', xf((-AX - 120, sy * 520, 390)))
    rs.add(cyl(26, 340, 18, bevel=6), 'Dark steel', xf((-AX + 140, sy * 600, 560), (sy * -8, 0, 0)))
rs.add(box(620, 680, 70, 12), 'Dark steel', xf((-AX, 0, 250)))
for x in (-AX - 260, -AX + 260):
    rs.add(box(70, 700, 90, 12), 'Dark steel', xf((x, 0, 280)))

# ------------------------------------------------------------- wheels
def wheel(name, x, side, explode):
    p = Part(name, explode, smooth=40)
    y = side * TR
    R = xf((x, y, WR), (-90, 0, 0)) if side > 0 else xf((x, y, WR), (90, 0, 0))   # lathe +Z points outboard
    prof = [(241, -118), (300, -126), (338, -122), (356, -104), (361, -70), (362, 0), (361, 70), (356, 104), (338, 122), (300, 126), (241, 118)]
    p.add(lathe(prof, 96), 'Tyre', R)
    for k in range(72):                                                         # tread blocks
        a = TAU * k / 72
        for zz in (-80, -27, 27, 80):
            M = R @ Matrix.Rotation(a, 4, 'Z') @ xf((364, 0, zz + (8 if k % 2 else -8)))
            p.add(box(6, 26, 40), 'Tyre', M)
    p.add(lathe([(238, -110), (241, -100), (241, 95), (246, 108), (230, 112), (180, 100), (60, 96), (0, 96)], 72), 'Rim', R)
    for k in range(10):                                                         # spokes
        a = TAU * k / 10
        M = R @ Matrix.Rotation(a, 4, 'Z') @ xf((150, 0, 104))
        p.add(box(170, 26, 16, 4), 'Rim', M)
    p.add(cyl(62, 20, 32, bevel=4), 'Gloss black', R @ xf((0, 0, 110)))
    for k in range(5):
        a = TAU * k / 5
        p.add(cyl(10, 12, 12), 'Steel', R @ xf((40 * math.cos(a), 40 * math.sin(a), 118)))
    return p

wheel('Front left wheel and tyre', AX, 1, (300, 1150, 0))
wheel('Front right wheel and tyre', AX, -1, (300, -1150, 0))
wheel('Rear left wheel and tyre', -AX, 1, (-300, 1150, 0))
wheel('Rear right wheel and tyre', -AX, -1, (-300, -1150, 0))

def brakes(name, side, explode):
    p = Part(name, explode)
    for x in (AX, -AX):
        y = side * (TR - 70)
        R = xf((x, y, WR), (90, 0, 0))
        p.add(cyl(166, 26, 64), 'Rotor', R)
        p.add(cyl(95, 50, 32), 'Rotor', R @ xf((0, 0, -side * 20)))
        for k in range(36):
            a = TAU * k / 36
            p.add(box(40, 3, 27), 'Dark steel', R @ Matrix.Rotation(a, 4, 'Z') @ xf((140, 0, 0)))
        cal = xf((x, y, WR), (90, 0, 0)) @ Matrix.Rotation(math.radians(120 if x > 0 else 60), 4, 'Z')
        p.add(ring(195, 120, 80, 16, -22, 22), 'Caliper', cal)
        p.add(box(60, 50, 90, 10), 'Caliper', cal @ xf((185, 0, -side * 0)))
    return p

brakes('Left brakes', 1, (0, 820, 0))
brakes('Right brakes', -1, (0, -820, 0))

# ------------------------------------------------------------- interior
def seat(p, x, y, w, z=PZ + 200):
    p.add(box(500, w, 120, 40), 'Seat', xf((x, y, z + 130)))
    p.add(box(500, w - 60, 40, 15), 'Seat dark', xf((x, y, z + 50)))
    for sy in (-1, 1):
        p.add(box(460, 70, 150, 30), 'Seat', xf((x, y + sy * (w / 2 - 30), z + 160)))
    bk = xf((x - 260, y, z + 470), (0, -14, 0))
    p.add(box(120, w, 620, 40), 'Seat', bk)
    p.add(box(130, w - 80, 560, 30), 'Seat dark', bk @ xf((-20, 0, 0)))
    p.add(box(110, w * 0.55, 200, 50), 'Seat', xf((x - 330, y, z + 880), (0, -10, 0)))
    for sy in (-1, 1):
        p.add(cyl(8, 120, 10), 'Steel', xf((x - 320, y + sy * 70, z + 760)))
        p.add(box(560, 40, 40, 6), 'Dark steel', xf((x, y + sy * (w / 2 - 50), z + 10)))

fsts = Part('Front seats', (250, 0, 1050))
for y in (400, -400):
    seat(fsts, 380, y, 540)
rst = Part('Rear seats', (-350, 0, 1150))
rst.add(box(520, 1340, 130, 40), 'Seat', xf((-700, 0, PZ + 330)))
rst.add(box(130, 1340, 600, 40), 'Seat', xf((-1000, 0, PZ + 660), (0, -18, 0)))
for y in (-460, 0, 460):
    rst.add(box(110, 300, 170, 50), 'Seat', xf((-1080, y, PZ + 1030), (0, -12, 0)))
for y in (-230, 230):
    rst.add(box(150, 6, 560, 3), 'Seat dark', xf((-1000, y, PZ + 660), (0, -18, 0)))

dash = Part('Dashboard and touchscreen', (700, 0, 1350))
dash.add(box(360, 1720, 170, 60), 'Seat dark', xf((1060, 0, 850)))
dash.add(box(30, 1700, 50, 10), 'Trim wood', xf((880, 0, 820)))
dash.add(slab(240, 380, 18, 14), 'Screen', xf((850, 0, 1000), (0, 76, 0)))
dash.add(slab(220, 360, 2, 12), 'Screen glow', xf((840, 0, 998), (0, 76, 0)))
dash.add(box(60, 60, 140, 10), 'Matte black', xf((880, 0, 920)))
dash.add(pipe([(980, 400, 800), (760, 400, 900)], 30, 12), 'Matte black')
SW = xf((740, 400, 905), (0, -68, 0))
dash.add(torus(180, 20, 64, 12), 'Seat dark', SW)
dash.add(cyl(60, 40, 24, bevel=10), 'Seat dark', SW)
for a in (0, 180, 270):
    dash.add(box(130, 30, 16, 6), 'Matte black', SW @ Matrix.Rotation(math.radians(a), 4, 'Z') @ xf((110, 0, 0)))
dash.add(box(500, 1600, 60, 20), 'Plastic', xf((1180, 0, 760)))                 # HVAC duct
for y in (-600, -200, 200, 600):
    dash.add(box(40, 260, 12, 4), 'Matte black', xf((900, y, 930)))

con = Part('Centre console', (0, 0, 850))
con.add(box(780, 230, 260, 40), 'Seat dark', xf((300, 0, PZ + 300)))
con.add(box(700, 200, 10, 6), 'Gloss black', xf((300, 0, PZ + 435)))
con.add(box(180, 160, 10, 4), 'Matte black', xf((600, 0, PZ + 442)))           # phone pads

# ------------------------------------------------------------- front-end systems
tub = Part('Frunk tub', (850, 0, 1350))
for (sx, sy, sz, cx, cy, cz) in ((560, 1000, 8, 1950, 0, 560), (560, 8, 220, 1950, 500, 670), (560, 8, 220, 1950, -500, 670),
                                 (8, 1000, 220, 2230, 0, 670), (8, 1000, 220, 1670, 0, 670)):
    tub.add(box(sx, sy, sz, 3), 'Plastic', xf((cx, cy, cz)))

hp = Part('Heat pump and Octovalve', (1500, 600, 700))
hp.add(box(200, 160, 140, 20), 'Plastic', xf((1700, 260, 740)))
for k in range(8):
    a = TAU * k / 8
    hp.add(cyl(18, 50, 12), 'Aluminium', xf((1700 + 70 * math.cos(a), 260 + 55 * math.sin(a), 825)))
hp.add(box(150, 120, 120, 16), 'Dark steel', xf((1900, 330, 700)))           # compressor
for k in range(5):
    hp.add(pipe([(1700, 200 + k * 30, 760), (1800 + k * 20, 150 + k * 40, 700), (2180, -300 + k * 120, 560 + k * 30)], 8, 8), 'Aluminium')
hp.add(box(120, 300, 90, 10), 'Aluminium', xf((1580, -200, 760)))            # chiller

rad = Part('Radiator and fan', (1600, 0, 150))
rad.add(box(30, 900, 380, 4), 'Radiator fin', xf((2240, 0, 520)))
for k in range(30):
    rad.add(box(34, 3, 380), 'Aluminium', xf((2240, -440 + k * 30, 520)))
rad.add(box(40, 920, 30, 4), 'Plastic', xf((2240, 0, 720)))
rad.add(box(40, 920, 30, 4), 'Plastic', xf((2240, 0, 320)))
rad.add(ring(170, 160, 40, 40), 'Plastic', xf((2200, 0, 520), (0, 90, 0)))
for k in range(7):
    rad.add(box(3, 70, 30, 6), 'Plastic', xf((2200, 0, 520), (360 / 7 * k, 0, 0)) @ xf((0, 70, 0), (0, 25, 0)))

lv = Part('Low-voltage battery', (1400, -800, 900))
lv.add(box(300, 180, 190, 12), 'Plastic', xf((1650, -330, 740)))
lv.add(box(260, 150, 6, 4), 'Matte black', xf((1650, -330, 838)))
for dy in (-40, 40):
    lv.add(cyl(10, 20, 12), 'Copper', xf((1760, -330 + dy, 848)))

hv = Part('High-voltage cabling and charge port', (-300, 950, -250))
for sy in (-1, 1):
    hv.add(pipe([(PX1 + 10, sy * 220, PZ + 110), (PX1 + 200, sy * 200, 300), (AX - 80, sy * 100, 600), (AX + 70, 60, WR + 280)], 16, 10), 'HV cable')
    hv.add(pipe([(PX0 - 10, sy * 200, PZ + 110), (PX0 - 200, sy * 150, 300), (-AX + 120, sy * 60, WR + 300)], 16, 10), 'HV cable')
hv.add(pipe([(-1900, 900, 880), (-1700, 700, 700), (-1300, 600, 400), (PX0 + 20, 600, PZ + 120)], 14, 10), 'HV cable')
hv.add(box(80, 40, 90, 14), 'Plastic', xf((-1910, 930, 890)))
hv.add(box(140, 10, 120, 20), 'Paint', xf((-1910, 958, 890)))

export('/home/claude/dbd/build/raw/model_y.glb')
