import sys, math, random
sys.path.insert(0, '/home/claude/dbd/models')
from lib import *

reset()
random.seed(7)
W, D, H = 686, 760, 990          # cabinet, mm. Front faces -Y.
CZ = 500                         # drum axis height
FY = -D / 2                      # front face

mat('Enamel', (0.88, 0.885, 0.875), rough=0.3, coat=0.6)
mat('Galvanised steel', (0.62, 0.63, 0.64), metal=1, rough=0.45)
mat('Console', (0.06, 0.065, 0.07), rough=0.3, coat=0.6)
mat('Display', (0.01, 0.012, 0.015), rough=0.1)
mat('Display glow', (0.9, 0.9, 0.9), emit=((0.85, 0.9, 1.0), 2.0))
mat('Chrome', (0.78, 0.78, 0.8), metal=1, rough=0.12)
mat('Dark chrome', (0.22, 0.23, 0.25), metal=1, rough=0.18)
mat('Door glass', (0.18, 0.22, 0.24), rough=0.05, alpha=0.45, coat=1)
mat('Rubber', (0.42, 0.43, 0.44), rough=0.7)
mat('Black rubber', (0.04, 0.04, 0.045), rough=0.8)
mat('Tub plastic', (0.55, 0.56, 0.55), rough=0.6)
mat('Stainless', (0.75, 0.76, 0.77), metal=1, rough=0.22)
mat('Perforation', (0.02, 0.02, 0.025), rough=0.9)
mat('White plastic', (0.88, 0.88, 0.86), rough=0.5)
mat('Cast aluminium', (0.6, 0.61, 0.62), metal=1, rough=0.55)
mat('Steel', (0.5, 0.51, 0.53), metal=1, rough=0.35)
mat('Copper', (0.78, 0.42, 0.24), metal=1, rough=0.3)
mat('Magnet', (0.2, 0.2, 0.22), metal=1, rough=0.45)
mat('Concrete', (0.55, 0.54, 0.51), rough=0.95)
mat('PCB', (0.03, 0.22, 0.1), rough=0.45)
mat('Chip', (0.04, 0.04, 0.045), rough=0.35)
mat('Hose', (0.72, 0.72, 0.7), rough=0.6)
mat('Blue plastic', (0.12, 0.3, 0.62), rough=0.45)
mat('Black plastic', (0.03, 0.03, 0.035), rough=0.5)

Y90 = (90, 0, 0)   # lathe/cyl Z axis -> -Y (toward the front)

# ------------------------------------------------------------- cabinet
top = Part('Top panel', (0, 0, 760))
top.add(box(W, D, 18, 6), 'Enamel', xf((0, 0, H - 9)))

def sheet(sx, sy, sz):
    return box(sx, sy, sz, 3)

ls = Part('Left side panel', (-700, 0, 0))
ls.add(sheet(10, D - 20, H - 120), 'Enamel', xf((-W / 2 + 5, 10, (H - 120) / 2 + 100)))
ls.add(box(4, D - 80, 30), 'Galvanised steel', xf((-W / 2 + 12, 10, H - 60)))       # top flange
rs = Part('Right side panel', (700, 0, 0))
rs.add(sheet(10, D - 20, H - 120), 'Enamel', xf((W / 2 - 5, 10, (H - 120) / 2 + 100)))
rs.add(box(4, D - 80, 30), 'Galvanised steel', xf((W / 2 - 12, 10, H - 60)))

rp = Part('Rear panel', (0, 980, 0))
rp.add(box(W - 20, 8, H - 120, 2), 'Galvanised steel', xf((0, D / 2 - 4, (H - 120) / 2 + 100)))
for x, z in ((-200, 820), (200, 820), (0, 760)):
    rp.add(cyl(14, 14, 16), 'Black plastic', xf((x, D / 2 + 4, z), Y90))           # hose ports, cord grommet
for i in range(6):                                                                  # stiffening pressings
    rp.add(box(W - 120, 3, 12, 1), 'Galvanised steel', xf((0, D / 2 + 1, 220 + i * 110)))

# front panel with the door opening punched through it
fp = Part('Front panel', (0, -700, 0))
cut = cyl(218, 80, 72)
bmesh.ops.transform(cut, matrix=xf((0, 0, CZ - (H - 230) / 2 - 110), Y90), verts=cut.verts)
fp.add(apply_mods(box(W, 12, H - 230, 4), [('BOOLEAN', cut)]), 'Enamel', xf((0, FY + 6, (H - 230) / 2 + 110)))
fp.add(ring(232, 216, 10, 72), 'White plastic', xf((0, FY - 2, CZ), Y90))          # door opening trim

tk = Part('Toe kick and pump access', (0, -700, -260))
tk.add(box(W, 10, 100, 3), 'Enamel', xf((0, FY + 5, 60)))
tk.add(slab(110, 70, 6, 10), 'White plastic', xf((W / 2 - 110, FY - 1, 60), Y90))  # filter flap

# ------------------------------------------------------------- console + drawer
con = Part('Control console', (0, -330, 600))
con.add(box(W - 24, 90, 120, 6), 'Console', xf((0, FY + 50, H - 78)))
con.add(cyl(36, 26, 48, bevel=3), 'Chrome', xf((60, FY - 6, H - 78), Y90))               # cycle knob
con.add(cyl(30, 4, 48), 'Dark chrome', xf((60, FY - 20, H - 78), Y90))
for k in range(24):                                                                     # knob tick marks
    a = TAU * k / 24
    con.add(box(2, 2, 8), 'Display glow', xf((60 + 50 * math.cos(a), FY + 3, H - 78 + 50 * math.sin(a)), (0, -math.degrees(a), 0)))
con.add(box(120, 4, 40, 3), 'Display', xf((200, FY + 4, H - 70)))
for i, w in enumerate((18, 12, 18, 12, 6)):                                             # digits
    con.add(box(w, 1, 16), 'Display glow', xf((160 + i * 20, FY + 1.5, H - 70)))
for i in range(6):
    con.add(cyl(7, 4, 20), 'Dark chrome', xf((150 + i * 22, FY + 3, H - 108), Y90))
con.add(cyl(11, 6, 24), 'Chrome', xf((300, FY + 2, H - 78), Y90))                        # power

dr = Part('Detergent drawer', (-160, -720, 640))
dr.add(box(220, 14, 112, 5), 'White plastic', xf((-210, FY - 2, H - 80)))
dr.add(box(150, 4, 20, 4), 'Console', xf((-210, FY - 10, H - 60)))                       # finger pull
dr.add(box(206, 320, 90, 4), 'White plastic', xf((-210, FY + 170, H - 84)))
for x in (-150, -45):
    dr.add(box(4, 300, 80), 'White plastic', xf((-210 + x + 60, FY + 170, H - 80)))
dr.add(box(60, 70, 6), 'Blue plastic', xf((-270, FY + 90, H - 50)))                    # softener cap

# ------------------------------------------------------------- door
door = Part('Door', (0, -1180, 0))
door.add(lathe([(200, 0), (272, 0), (282, 18), (276, 44), (248, 58), (212, 60), (200, 46), (200, 0)], 96),
         'Dark chrome', xf((0, FY - 6, CZ), Y90))
door.add(lathe([(210, 2), (199, -30), (175, -78), (120, -112), (40, -124), (0, -125)], 72),
         'Door glass', xf((0, FY - 6, CZ), Y90))
door.add(cyl(214, 5, 96), 'Door glass', xf((0, FY - 60, CZ), Y90))
door.add(torus(213, 3, 96, 8), 'Chrome', xf((0, FY - 62, CZ), Y90))
door.add(box(40, 50, 120, 12), 'Dark chrome', xf((262, FY - 40, CZ)))                 # handle
door.add(box(30, 24, 70, 4), 'Black plastic', xf((-262, FY - 10, CZ + 120)))          # hinge
door.add(box(30, 24, 70, 4), 'Black plastic', xf((-262, FY - 10, CZ - 120)))
for dz in (-120, 120):
    door.add(cyl(6, 90, 12), 'Steel', xf((-276, FY - 10, CZ + dz)))
door.add(box(16, 40, 30, 4), 'Steel', xf((250, FY + 14, CZ)))                         # latch hook

lock = Part('Door lock', (360, -880, 0))
lock.add(box(60, 50, 90, 6), 'Black plastic', xf((262, FY + 40, CZ)))
lock.add(cyl(14, 40, 16), 'Steel', xf((262, FY + 70, CZ + 20), (0, 90, 0)))         # solenoid
lock.add(box(18, 8, 12), 'White plastic', xf((262, FY + 70, CZ - 40)))              # connector

gas = Part('Door bellow', (0, -520, 0))
prof = [(232, 6), (220, 0), (206, -14), (226, -34), (200, -54), (224, -74), (204, -94), (220, -112), (214, -126)]
gas.add(lathe(prof, 96), 'Rubber', xf((0, FY, CZ), Y90))
gas.add(torus(222, 4, 96, 8), 'Steel', xf((0, FY - 2, CZ), Y90))                        # clamp band
gas.add(torus(216, 4, 96, 8), 'Steel', xf((0, FY + 126, CZ), Y90))

# ------------------------------------------------------------- tub (two halves, welded)
TF, TB = FY + 120, D / 2 - 120          # tub front / back y
tub = Part('Outer tub (welded shut)', (0, 0, 0), smooth=40)
z = lambda y: -(y)                      # profile z when rotated by Y90 about the axis origin
front = [(212, z(TF)), (230, z(TF + 10)), (300, z(TF + 44)), (305, z(-6))]
back = [(305, z(6)), (305, z(TB - 22)), (288, z(TB)), (70, z(TB + 8)), (40, z(TB + 4))]
tub.add(lathe(front, 96), 'Tub plastic', xf((0, 0, CZ), Y90))
tub.add(lathe(back, 96), 'Tub plastic', xf((0, 0, CZ), Y90))
tub.add(ring(318, 302, 12, 96), 'Tub plastic', xf((0, 0, CZ), Y90))                      # the weld flange
for k in range(36):                                                                     # weld bosses around the seam
    a = TAU * k / 36
    tub.add(box(10, 16, 10), 'Tub plastic', xf((321 * math.cos(a), 0, CZ + 321 * math.sin(a)), (0, -math.degrees(a), 0)))
for k in range(8):                                                                      # rear ribs
    a = TAU * k / 8
    tub.add(box(230, 14, 22), 'Tub plastic', xf((180 * math.cos(a), TB + 14, CZ + 180 * math.sin(a)), (0, -math.degrees(a), 0)))
tub.add(cyl(78, 34, 48), 'Cast aluminium', xf((0, TB + 20, CZ), Y90))                    # moulded-in bearing housing
tub.add(cyl(26, 50, 24), 'Tub plastic', xf((0, -60, CZ - 320)))                          # sump outlet

cw = Part('Concrete counterweights', (0, -380, 420))
cw.add(ring(330, 238, 70, 48, 25, 155), 'Concrete', xf((0, TF + 40, CZ), Y90))
cw.add(ring(330, 250, 60, 48, 215, 325), 'Concrete', xf((0, TF + 40, CZ), Y90))
for a in (40, 90, 140):
    r = math.radians(a)
    cw.add(cyl(7, 90, 12), 'Steel', xf((300 * math.cos(r), TF + 40, CZ + 300 * math.sin(r)), Y90))

heat = Part('Heating element', (0, -60, -430))
heat.add(pipe([(-170, TF + 90, CZ - 287), (150, TF + 90, CZ - 288), (160, TF + 110, CZ - 288), (150, TF + 130, CZ - 288),
               (-170, TF + 130, CZ - 287)], 6, 10), 'Steel', None)
heat.add(box(40, 30, 60, 4), 'Black rubber', xf((-190, TF + 110, CZ - 287)))

# ------------------------------------------------------------- drum
drum = Part('Stainless drum', (0, -420, 0))
DF, DB = TF + 30, TB - 20
dprof = [(212, z(DF - 8)), (222, z(DF)), (266, z(DF + 20)), (268, z(DF + 30)), (268, z(DB - 8)), (258, z(DB)), (0, z(DB + 2))]
drum.add(lathe(dprof, 96), 'Stainless', xf((0, 0, CZ), Y90))
for k in range(12):                                                                     # embossed ribs on the back wall
    a = TAU * k / 12
    drum.add(box(170, 4, 10), 'Stainless', xf((150 * math.cos(a), DB + 2, CZ + 150 * math.sin(a)), (0, -math.degrees(a), 0)))
for i in range(13):
    yy = DF + 48 + i * (DB - DF - 70) / 12
    for k in range(48):
        a = TAU * (k + 0.5 * (i % 2)) / 48
        n = (math.cos(a), 0, math.sin(a))
        drum.add(quad((268.6 * n[0], yy, CZ + 268.6 * n[2]), n, 6, (0, 1, 0)), 'Perforation')
for k in range(3):                                                                      # lifters
    a = math.radians(90 + 120 * k)
    beta = math.atan2(-math.cos(a), -math.sin(a))
    M = Matrix.Translation((267 * math.cos(a), (DF + DB) / 2, CZ + 267 * math.sin(a))) @ Matrix.Rotation(beta, 4, 'Y') @ xf((0, 0, 0), (90, 0, 0))
    drum.add(prism([(-28, 0), (28, 0), (10, 46), (-10, 46)], DB - DF - 50), 'White plastic', M)

spi = Part('Drum spider and shaft', (0, 300, 0))
spi.add(cyl(48, 36, 32, bevel=4), 'Cast aluminium', xf((0, DB + 26, CZ), Y90))
for k in range(3):
    a = 90 + 120 * k
    r = math.radians(a)
    spi.add(box(46, 22, 215, 6), 'Cast aluminium', xf((135 * math.cos(r), DB + 16, CZ + 135 * math.sin(r)), (0, -(a - 90), 0)))
    spi.add(cyl(12, 26, 16), 'Cast aluminium', xf((250 * math.cos(r), DB + 6, CZ + 250 * math.sin(r)), Y90))
spi.add(cyl(19, 110, 24), 'Steel', xf((0, DB + 78, CZ), Y90))

brg = Part('Bearings and seal', (0, 480, 0))
for yy, ro in ((DB + 52, 42), (DB + 92, 36)):
    brg.add(ring(ro, 20, 16, 40), 'Steel', xf((0, yy, CZ), Y90))
    brg.add(ring(ro - 3, 23, 17, 40), 'Black rubber', xf((0, yy, CZ), Y90))
brg.add(ring(50, 20, 12, 40), 'Black rubber', xf((0, DB + 34, CZ), Y90))                  # the shaft seal

# ------------------------------------------------------------- direct-drive motor
sta = Part('Motor stator', (0, 640, 0))
SY = TB + 70
sta.add(ring(92, 50, 34, 48), 'Steel', xf((0, SY, CZ), Y90))
for k in range(36):
    a = TAU * k / 36
    d = math.degrees(a)
    sta.add(box(42, 34, 11), 'Steel', xf((111 * math.cos(a), SY, CZ + 111 * math.sin(a)), (0, -d, 0)))
    sta.add(box(24, 40, 17), 'Copper', xf((112 * math.cos(a), SY, CZ + 112 * math.sin(a)), (0, -d, 0)))
for k in range(6):
    a = TAU * k / 6
    sta.add(cyl(6, 50, 12), 'Steel', xf((70 * math.cos(a), SY + 10, CZ + 70 * math.sin(a)), Y90))
sta.add(box(30, 16, 20), 'White plastic', xf((0, SY + 20, CZ + 80)))                       # connector

rot = Part('Motor rotor', (0, 800, 0))
RY = SY + 22
rot.add(lathe([(18, z(RY + 4)), (150, z(RY + 4)), (152, z(RY - 34)), (144, z(RY - 34)), (142, z(RY - 2)), (18, z(RY - 2))], 72),
        'Steel', xf((0, 0, CZ), Y90))
for k in range(48):
    a = TAU * (k + 0.5) / 48
    rot.add(box(14, 30, 6), 'Magnet', xf((139 * math.cos(a), RY - 18, CZ + 139 * math.sin(a)), (0, -math.degrees(a) + 90, 0)))
for k in range(12):
    a = TAU * k / 12
    rot.add(box(100, 8, 12), 'Steel', xf((85 * math.cos(a), RY + 8, CZ + 85 * math.sin(a)), (0, -math.degrees(a), 0)))
    rot.add(box(16, 6, 30), 'Steel', xf((70 * math.cos(a + 0.26), RY + 2, CZ + 70 * math.sin(a + 0.26)), (0, -math.degrees(a), 0)))
rot.add(cyl(30, 18, 24), 'Steel', xf((0, RY + 8, CZ), Y90))
rot.add(cyl(9, 4, 16), 'Chrome', xf((0, RY + 16, CZ), Y90))

# ------------------------------------------------------------- suspension
spr = Part('Suspension springs', (0, 0, 520))
for x in (-215, 215):
    spr.add(helix(18, 3, 11, 150), 'Steel', xf((x, -40, CZ + 305)))
    spr.add(box(20, 20, 30, 3), 'White plastic', xf((x, -40, CZ + 392)))
    spr.add(box(30, 40, 50, 4), 'Tub plastic', xf((x, -40, CZ + 222)))

dmp = Part('Friction dampers', (0, 0, -520))
for x in (-190, 190):
    tilt = 12 if x > 0 else -12
    M = xf((x, 30, 125), (0, tilt, 0))
    dmp.add(cyl(22, 90, 20, bevel=2), 'Black plastic', M @ xf((0, 0, -15)))
    dmp.add(cyl(9, 80, 16), 'Steel', M @ xf((0, 0, 50)))
    dmp.add(cyl(15, 26, 16), 'White plastic', M @ xf((0, 0, 95)))
    dmp.add(cyl(15, 26, 16), 'White plastic', M @ xf((0, 0, -70)))

# ------------------------------------------------------------- water
pump = Part('Drain pump and filter', (300, -480, -360))
PX, PY, PZ = W / 2 - 110, FY + 120, 90
pump.add(cyl(46, 80, 32, bevel=4), 'Black plastic', xf((PX, PY, PZ), Y90))
pump.add(cyl(38, 60, 32), 'White plastic', xf((PX, PY - 60, PZ), Y90))                    # filter body
pump.add(box(10, 20, 60, 3), 'White plastic', xf((PX, PY - 96, PZ)))                      # filter grip
pump.add(box(70, 70, 60, 6), 'Black plastic', xf((PX - 70, PY + 40, PZ)))                 # pump motor
pump.add(pipe([(PX, PY + 20, PZ + 40), (PX - 40, PY + 40, PZ + 120), (-20, -60, CZ - 345)], 22, 14), 'Black rubber')
pump.add(cyl(14, 50, 16), 'Black plastic', xf((PX - 40, PY + 80, PZ), Y90))

val = Part('Water inlet valves', (0, 900, 380))
for x in (-180, -120):
    val.add(box(46, 60, 46, 6), 'Black plastic', xf((x, D / 2 - 50, 880)))
    val.add(cyl(18, 50, 20), 'Black plastic', xf((x, D / 2 - 50, 925)))                     # solenoid coil
    val.add(cyl(12, 40, 16), 'Blue plastic' if x < -150 else 'Copper', xf((x, D / 2 - 8, 880), Y90))
    val.add(box(14, 10, 10), 'White plastic', xf((x, D / 2 - 50, 958)))

hos = Part('Hoses', (0, 560, 180))
hos.add(pipe([(-180, D / 2 - 90, 880), (-190, 100, 900), (-210, FY + 300, 900)], 9, 10), 'Hose')
hos.add(pipe([(-120, D / 2 - 90, 870), (-130, 120, 890), (-170, FY + 320, 895)], 9, 10), 'Hose')
hos.add(pipe([(PX - 40, PY + 80, PZ), (200, 200, 120), (200, D / 2 - 40, 400), (200, D / 2 - 30, 800)], 13, 12), 'Hose')
hos.add(pipe([(-210, FY + 300, 880), (-120, FY + 300, 840), (0, TF + 40, CZ + 260)], 20, 12), 'Rubber')   # drawer to tub

# ------------------------------------------------------------- brains
pcb = Part('Main control board', (0, 220, 700))
pcb.add(box(300, 180, 30, 5), 'White plastic', xf((60, FY + 190, H - 120)))
pcb.add(box(280, 160, 2), 'PCB', xf((60, FY + 190, H - 102)))
for i in range(30):
    sx, sy = random.uniform(6, 24), random.uniform(6, 24)
    pcb.add(box(sx, sy, random.uniform(2, 10)), random.choice(['Chip', 'Chip', 'Black plastic', 'Copper']),
            xf((60 + random.uniform(-125, 125), FY + 190 + random.uniform(-70, 70), H - 97)))
pcb.add(cyl(12, 26, 16), 'Black plastic', xf((150, FY + 150, H - 88)))                    # capacitors
pcb.add(cyl(9, 20, 16), 'Black plastic', xf((175, FY + 150, H - 91)))
pcb.add(pipe([(-90, FY + 220, H - 110), (-200, 0, H - 140), (-260, 200, 700), (-200, D / 2 - 80, 400), (0, TB + 80, CZ + 60)], 8, 8), 'Black plastic')

base = Part('Base frame', (0, 0, -700))
for x in (-W / 2 + 25, W / 2 - 25):
    base.add(box(40, D - 40, 50, 2), 'Galvanised steel', xf((x, 0, 35)))
for y in (-D / 2 + 40, D / 2 - 40, 0):
    base.add(box(W - 40, 40, 40, 2), 'Galvanised steel', xf((0, y, 30)))
for x in (-190, 190):
    base.add(box(60, 60, 20, 2), 'Galvanised steel', xf((x, 30, 55)))                   # damper mounts

feet = Part('Levelling feet', (0, 0, -860))
for x in (-W / 2 + 50, W / 2 - 50):
    for y in (-D / 2 + 60, D / 2 - 60):
        feet.add(cyl(8, 40, 12), 'Steel', xf((x, y, 10)))
        feet.add(cyl(24, 12, 24, bevel=3), 'Black rubber', xf((x, y, -6)))

# ------------------------------------------------------------- finishing details
# console: printed cycle names as fine tick lines around the knob, a status ring and a door-lock icon
for k in range(10):
    a = math.radians(200 - k * 22)
    con.add(box(14, 1, 2), 'Display glow' if k == 3 else 'Dark chrome', xf((60 + 66 * math.cos(a), FY + 4, H - 78 + 44 * math.sin(a)), (0, -math.degrees(a), 0)))
con.add(torus(40, 1.2, 48, 6), 'Display glow', xf((60, FY + 3.5, H - 78), Y90))
con.add(box(10, 1, 10, 2), 'Dark chrome', xf((300, FY + 3.5, H - 56)))
con.add(box(W - 30, 2, 2), 'Dark chrome', xf((0, FY + 4, H - 20)))                  # console top trim line
# front panel: a pressed shoulder line and rounded vertical edges
fp.add(box(W - 30, 3, 3, 1), 'Enamel', xf((0, FY - 1, 168)))
for sx in (-1, 1):
    fp.add(cyl(6, H - 240, 12), 'Enamel', xf((sx * (W / 2 - 6), FY + 6, (H - 230) / 2 + 110)))
# door: inner gasket lip, hinge plate, a finger recess on the handle
door.add(torus(206, 4, 96, 8), 'Black rubber', xf((0, FY + 2, CZ), Y90))
door.add(box(16, 8, 210, 4), 'Black plastic', xf((-270, FY - 4, CZ)))
door.add(box(24, 6, 60, 6), 'Black plastic', xf((262, FY - 66, CZ)))
# drawer: compartment labels as tiny raised marks
for i, x in enumerate((-280, -230, -170)):
    dr.add(box(18, 1, 6, 1), 'White plastic', xf((x, FY - 10, H - 46)))
# rear: power cord with plug, hose ports labelled hot/cold, vent slots, transport bolts
cord = [(60, D / 2 + 10, 760), (90, D / 2 + 60, 700), (140, D / 2 + 90, 520), (170, D / 2 + 110, 300), (200, D / 2 + 140, 160)]
rp.add(pipe(cord, 4, 8), 'Black plastic')
rp.add(box(30, 26, 40, 6), 'Black plastic', xf((200, D / 2 + 150, 130)))
rp.add(cyl(16, 6, 16), 'Blue plastic', xf((-200, D / 2 + 8, 820), Y90))
rp.add(cyl(16, 6, 16), 'Black rubber', xf((200, D / 2 + 8, 820), Y90))
for i in range(8):
    rp.add(box(40, 2, 6, 1), 'Black plastic', xf((-210 + i * 60, D / 2 + 1, 930)))
for x, z in ((-250, 300), (250, 300), (-250, 700), (250, 700)):
    rp.add(cyl(10, 8, 16), 'Steel', xf((x, D / 2 + 4, z), Y90))
# inside: the pressure switch that tells the board how full the tub is, with its hose
psw = Part('Pressure switch', (220, -120, 620))
psw.add(cyl(26, 22, 24, bevel=3), 'White plastic', xf((220, 160, H - 110)))
psw.add(box(20, 14, 12, 3), 'Black plastic', xf((220, 186, H - 110)))
psw.add(pipe([(220, 160, H - 122), (240, 120, 600), (200, 40, 220), (60, -40, CZ - 318)], 3, 8), 'Hose')
# wiring harness from the board down to the motor, pump and lock
harn = Part('Wiring harness', (-120, 120, 300))
harn.add(pipe([(-90, FY + 200, H - 110), (-300, -100, H - 130), (-310, 150, 700), (-280, D / 2 - 70, 420), (-120, SY + 30, CZ + 90)], 6, 8), 'Black plastic')
harn.add(pipe([(-300, -100, H - 130), (-310, -250, 600), (262, FY + 60, CZ - 40)], 4, 8), 'Black plastic')
harn.add(pipe([(-310, 150, 700), (-300, 50, 250), (PX - 70, PY + 40, PZ + 40)], 4, 8), 'Black plastic')

export('/home/claude/dbd/build/raw/washer.glb')
