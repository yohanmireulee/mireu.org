import sys, math, random
sys.path.insert(0, '/home/claude/dbd/models')
from lib import *

reset()
random.seed(11)
W, D, H = 908, 700, 1790      # cabinet without doors; front faces -Y
FY, BY = -D / 2, D / 2
ZM0, ZM1 = 720, 790           # mullion between freezer and fridge
T = 55                         # wall thickness (foam)

mat('Stainless', (0.70, 0.705, 0.71), metal=1, rough=0.33)
mat('Brushed edge', (0.55, 0.555, 0.56), metal=1, rough=0.45)
mat('Painted steel', (0.18, 0.18, 0.19), metal=0.5, rough=0.45)
mat('Foam', (0.93, 0.74, 0.22), rough=0.95)
mat('Liner', (0.93, 0.93, 0.91), rough=0.4)
mat('Gasket', (0.55, 0.56, 0.57), rough=0.7)
mat('Glass', (0.55, 0.66, 0.66), rough=0.05, alpha=0.35, coat=1)
mat('Clear plastic', (0.8, 0.86, 0.88), rough=0.1, alpha=0.4)
mat('Grey plastic', (0.55, 0.56, 0.57), rough=0.5)
mat('Black plastic', (0.03, 0.03, 0.035), rough=0.5)
mat('Display', (0.01, 0.012, 0.015), rough=0.1)
mat('Display glow', (0.9, 0.9, 0.9), emit=((0.85, 0.92, 1.0), 2.0))
mat('LED', (1, 1, 1), emit=((1, 0.97, 0.9), 4.0))
mat('Copper', (0.78, 0.42, 0.24), metal=1, rough=0.3)
mat('Aluminium fin', (0.78, 0.79, 0.8), metal=1, rough=0.35)
mat('Compressor', (0.05, 0.05, 0.055), metal=0.4, rough=0.45)
mat('Steel', (0.5, 0.51, 0.53), metal=1, rough=0.35)
mat('Rubber', (0.04, 0.04, 0.045), rough=0.85)
mat('PCB', (0.03, 0.22, 0.1), rough=0.45)
mat('Chip', (0.04, 0.04, 0.045), rough=0.35)
mat('Fiberboard', (0.36, 0.33, 0.29), rough=0.9)
mat('Blue line', (0.15, 0.35, 0.7), rough=0.45)
mat('White plastic', (0.9, 0.9, 0.88), rough=0.45)

Y90 = (90, 0, 0)

def panel(cx, cy, cz, sx, sy, sz, m, part, r=2):
    part.add(box(sx, sy, sz, r), m, xf((cx, cy, cz)))

# ------------------------------------------------------------- the outer wrapper
top = Part('Top skin', (0, 0, 720))
panel(0, 0, H - 3, W, D, 6, 'Painted steel', top)
top.add(box(W - 40, 30, 14, 3), 'Painted steel', xf((0, BY - 40, H + 6)))               # hinge cover bar
ls = Part('Left side skin', (-760, 0, 0))
panel(-W / 2 + 3, 0, H / 2 + 10, 6, D, H - 20, 'Painted steel', ls)
rs = Part('Right side skin', (760, 0, 0))
panel(W / 2 - 3, 0, H / 2 + 10, 6, D, H - 20, 'Painted steel', rs)
bk = Part('Back panel', (0, 900, 120))
panel(0, BY - 3, (H + 230) / 2, W - 12, 6, H - 230, 'Fiberboard', bk)
for i in range(5):
    bk.add(box(W - 60, 3, 8), 'Fiberboard', xf((0, BY + 1, 420 + i * 300)))

# ------------------------------------------------------------- foam (the thing you can't take apart)
foam = Part('Polyurethane foam', (0, 380, 0))
fx = W / 2 - 6 - T / 2
panel(-fx, 0, (H + 230) / 2 - 3, T, D - 6, H - 236, 'Foam', foam, 1)
panel(fx, 0, (H + 230) / 2 - 3, T, D - 6, H - 236, 'Foam', foam, 1)
panel(0, 0, H - 6 - T / 2, W - 12 - 2 * T, D - 6, T, 'Foam', foam, 1)
panel(0, BY - 6 - T / 2, (H + 230) / 2, W - 12 - 2 * T, T, H - 236 - 2 * T, 'Foam', foam, 1)
panel(0, -40, 230 - T / 2 + 30, W - 12 - 2 * T, D - 90, T, 'Foam', foam, 1)            # floor over the compressor bay
panel(0, -20, (ZM0 + ZM1) / 2, W - 12 - 2 * T, D - 46, ZM1 - ZM0, 'Foam', foam, 1)    # mullion
for k in range(26):                                                                    # foam-blowing texture: little cells on the faces
    x, z = random.uniform(-380, 380), random.uniform(260, 1700)
    foam.add(sphere(random.uniform(6, 16), 10, 6), 'Foam', xf((x, BY - 6 - T - 2, z), (0, 0, 0), (1, 0.4, 1)))

# ------------------------------------------------------------- liners
IX = W / 2 - 6 - T                 # interior half width
IB = BY - 6 - T                    # interior back
lin = Part('Inner liners', (0, -260, 0))
for (z0, z1) in ((260, ZM0), (ZM1, H - 6 - T)):
    h = z1 - z0
    panel(-IX + 2, (FY + IB) / 2, (z0 + z1) / 2, 4, IB - FY, h, 'Liner', lin)
    panel(IX - 2, (FY + IB) / 2, (z0 + z1) / 2, 4, IB - FY, h, 'Liner', lin)
    panel(0, IB - 2, (z0 + z1) / 2, 2 * IX, 4, h, 'Liner', lin)
    panel(0, (FY + IB) / 2, z0 + 2, 2 * IX, IB - FY, 4, 'Liner', lin)
    panel(0, (FY + IB) / 2, z1 - 2, 2 * IX, IB - FY, 4, 'Liner', lin)
    for z in range(int(z0) + 120, int(z1) - 60, 160):                                    # shelf ribs moulded into the sides
        for sx in (-1, 1):
            lin.add(box(6, IB - FY - 60, 8, 2), 'Liner', xf((sx * (IX - 6), (FY + IB) / 2 + 20, z)))
lin.add(box(2 * IX - 80, 30, 520, 10), 'Liner', xf((0, IB - 18, 1340)))                 # air duct cover
for k in range(8):
    lin.add(box(60, 4, 10, 2), 'Black plastic', xf((-210 + k * 60, IB - 34, 1560)))      # duct vents

led = Part('LED lighting', (0, -360, 300))
led.add(box(400, 40, 8, 4), 'White plastic', xf((0, -80, H - 6 - T - 6)))
led.add(box(370, 26, 2), 'LED', xf((0, -80, H - 6 - T - 11)))
led.add(box(10, 200, 30, 3), 'White plastic', xf((-IX + 8, -40, H - 200)))
led.add(box(4, 180, 16), 'LED', xf((-IX + 14, -40, H - 200)))

# ------------------------------------------------------------- fridge contents
sh = Part('Glass shelves', (0, -520, 0))
for z in (1080, 1320, 1540):
    sh.add(slab(2 * IX - 20, IB - FY - 120, 5, 6), 'Glass', xf((0, (FY + IB) / 2 + 30, z)))
    sh.add(box(2 * IX - 20, 18, 26, 4), 'Grey plastic', xf((0, FY + 72, z - 6)))
    sh.add(box(2 * IX - 20, 10, 16, 2), 'Grey plastic', xf((0, IB - 30, z - 6)))
    for sx in (-1, 1):
        sh.add(box(12, IB - FY - 120, 20, 2), 'Steel', xf((sx * (IX - 14), (FY + IB) / 2 + 30, z - 12)))

cr = Part('Crisper drawers', (0, -760, 0))
for sx in (-1, 1):
    cx = sx * (IX / 2)
    cr.add(box(IX - 20, 6, 200, 6), 'Clear plastic', xf((cx, FY + 70, ZM1 + 110)))
    cr.add(box(IX - 20, IB - FY - 120, 6, 4), 'Clear plastic', xf((cx, (FY + IB) / 2 + 30, ZM1 + 14)))
    for xx in (-1, 1):
        cr.add(box(5, IB - FY - 120, 190, 3), 'Clear plastic', xf((cx + xx * (IX / 2 - 12), (FY + IB) / 2 + 30, ZM1 + 110)))
    cr.add(box(IX - 20, 5, 190, 3), 'Clear plastic', xf((cx, IB - 30, ZM1 + 110)))
    cr.add(box(IX - 80, 12, 24, 6), 'Grey plastic', xf((cx, FY + 64, ZM1 + 190)))
    cr.add(box(90, 14, 14, 4), 'Grey plastic', xf((cx + 60, FY + 64, ZM1 + 160)))          # humidity slider
cr.add(slab(2 * IX - 20, IB - FY - 110, 5, 6), 'Glass', xf((0, (FY + IB) / 2 + 30, ZM1 + 230)))

wf = Part('Water filter', (240, -480, 420))
wf.add(box(260, 120, 80, 10), 'White plastic', xf((250, FY + 120, H - 6 - T - 45)))
wf.add(cyl(30, 220, 24, bevel=4), 'White plastic', xf((250, FY + 110, H - 6 - T - 95), (0, 90, 0)))
wf.add(cyl(31, 30, 24), 'Blue line', xf((360, FY + 110, H - 6 - T - 95), (0, 90, 0)))

# ------------------------------------------------------------- freezer insides
fd = Part('Freezer drawer', (0, -1100, -120))
FZ0, FZ1 = 40, ZM0 + 10
fd.add(slab(W - 6, FZ1 - FZ0, 62, 18, bevel=4), 'Stainless', xf((0, FY - 36, (FZ0 + FZ1) / 2), Y90))
fd.add(pipe([(-320, FY - 70, FZ1 - 70), (-320, FY - 110, FZ1 - 70), (320, FY - 110, FZ1 - 70), (320, FY - 70, FZ1 - 70)], 11, 14), 'Stainless')
fd.add(frame(W - 40, FZ1 - FZ0 - 40, 12, 18, 22), 'Gasket', xf((0, FY - 2, (FZ0 + FZ1) / 2), Y90))
fd.add(box(W - 60, 6, FZ1 - FZ0 - 60, 6), 'Liner', xf((0, FY - 6, (FZ0 + FZ1) / 2)))
BZ0 = 270
for (x, wdt) in ((0, 2 * IX - 30),):
    fd.add(box(wdt, IB - FY - 110, 6, 4), 'Grey plastic', xf((x, (FY + IB) / 2 - 10, BZ0)))
    for sx in (-1, 1):
        fd.add(box(6, IB - FY - 110, 300, 4), 'Grey plastic', xf((sx * wdt / 2, (FY + IB) / 2 - 10, BZ0 + 150)))
    fd.add(box(wdt, 6, 300, 4), 'Grey plastic', xf((x, IB - 65, BZ0 + 150)))
    fd.add(box(wdt, 6, 260, 4), 'Grey plastic', xf((x, FY + 40, BZ0 + 130)))
fd.add(box(2 * IX - 60, IB - FY - 200, 110, 4), 'Clear plastic', xf((0, (FY + IB) / 2 - 40, BZ0 + 360)))     # upper tray
for sx in (-1, 1):
    fd.add(box(18, IB - FY - 60, 30, 3), 'Steel', xf((sx * (IX - 14), (FY + IB) / 2 - 10, BZ0 + 30)))       # slides
    for k in range(10):
        fd.add(box(4, 30, 220, 1), 'Grey plastic', xf((sx * (IX - 15), FY + 90 + k * 50, BZ0 + 150)))      # basket slats

evp = Part('Evaporator and defrost heater', (0, -150, 0))
EY = IB - 30
for k in range(56):
    evp.add(box(1.2, 44, 340), 'Aluminium fin', xf((-320 + k * 640 / 55, EY, 470)))
pts = []
for i in range(8):
    z = 330 + i * 40
    xs = (-330, 330) if i % 2 == 0 else (330, -330)
    pts += [(xs[0], EY, z), (xs[1], EY, z)]
evp.add(pipe(pts, 5, 10), 'Copper', None)
evp.add(pipe([(-330, EY + 10, 300), (330, EY + 10, 300), (330, EY + 10, 290), (-330, EY + 10, 290)], 5, 8), 'Black plastic')  # defrost heater
evp.add(box(120, 30, 30, 4), 'Black plastic', xf((360, EY, 300)))
evp.add(box(60, 14, 30, 4), 'Grey plastic', xf((-200, EY - 26, 640)))                   # defrost thermostat

fan = Part('Evaporator fan', (0, -330, 120))
fan.add(box(260, 40, 200, 8), 'Liner', xf((0, IB - 60, 650)))
fan.add(torus(85, 8, 40, 8), 'Grey plastic', xf((0, IB - 84, 650), Y90))
for k in range(5):
    a = 72 * k
    fan.add(box(70, 3, 34, 6), 'Black plastic', xf((0, IB - 90, 650), (0, a, 0)) @ xf((40, 0, 0), (25, 0, 0)))
fan.add(cyl(22, 30, 20), 'Black plastic', xf((0, IB - 90, 650), Y90))

# ------------------------------------------------------------- doors
def french_door(side):
    sx = -1 if side == 'L' else 1
    p = Part('Left French door' if side == 'L' else 'Right French door', (sx * 900, -1150, 120))
    dw, dz0, dz1 = W / 2 - 3, ZM0 + 30, H
    cx, cz = sx * (W / 4 + 1.5), (dz0 + dz1) / 2
    dh = dz1 - dz0
    p.add(slab(dw, dh, 64, 18, bevel=5), 'Stainless', xf((cx, FY - 38, cz), Y90))
    p.add(slab(dw - 50, dh - 50, 24, 14), 'Liner', xf((cx, FY - 2, cz), Y90))
    p.add(frame(dw - 14, dh - 14, 12, 16, 22), 'Gasket', xf((cx, FY + 2, cz), Y90))
    hx = cx - sx * (dw / 2 - 40)
    p.add(pipe([(hx, FY - 70, cz - 260), (hx, FY - 108, cz - 260), (hx, FY - 108, cz + 260), (hx, FY - 70, cz + 260)], 11, 14), 'Stainless')
    for k, z in enumerate((cz - 330, cz - 60, cz + 230)):                               # door bins
        bw = dw - 110 if not (side == 'L' and k == 2) else dw - 260
        bx = cx if not (side == 'L' and k == 2) else cx + 60
        p.add(box(bw, 6, 90, 4), 'Clear plastic', xf((bx, FY + 112, z)))
        p.add(box(bw, 100, 5, 3), 'Clear plastic', xf((bx, FY + 64, z - 44)))
        for e in (-1, 1):
            p.add(box(5, 100, 90, 3), 'Clear plastic', xf((bx + e * bw / 2, FY + 64, z)))
        p.add(box(bw, 8, 22, 3), 'Grey plastic', xf((bx, FY + 116, z + 34)))
    p.add(box(30, 50, 60, 6), 'Black plastic', xf((cx + sx * (dw / 2 - 40), FY - 20, dz1 + 10)))     # top hinge
    if side == 'L':                                                                    # through-the-door dispenser
        p.add(slab(220, 330, 16, 18), 'Black plastic', xf((cx + 40, FY - 72, cz + 40), Y90))
        p.add(box(60, 30, 26, 8), 'Grey plastic', xf((cx + 40, FY - 82, cz + 112)))          # ice chute
        p.add(cyl(5, 18, 12), 'Grey plastic', xf((cx + 70, FY - 82, cz + 104)))              # water nozzle
        for i in range(7):
            p.add(box(150, 3, 3), 'Grey plastic', xf((cx + 40, FY - 86 + i * 2, cz - 112)))  # drip tray grille
        p.add(box(160, 24, 8, 3), 'Black plastic', xf((cx + 40, FY - 76, cz - 116)))
        p.add(slab(180, 220, 20, 12), 'Display', xf((cx + 40, FY - 66, cz - 10), Y90))
        p.add(box(120, 6, 40, 4), 'Display', xf((cx + 40, FY - 80, cz + 160)))
        for i in range(5):
            p.add(box(14, 2, 8), 'Display glow', xf((cx - 6 + i * 22, FY - 84, cz + 160)))
        p.add(box(80, 26, 70, 6), 'Grey plastic', xf((cx + 40, FY - 60, cz + 60)))       # paddle
    p.add(box(dw - 40, 6, 6, 2), 'Brushed edge', xf((cx, FY - 70, dz1 - 6)))           # top edge cap
    return p

french_door('L')
french_door('R')

ice = Part('In-door ice maker', (-360, -1240, 260))
IXc, IZ = -W / 4 + 60, H - 300
ice.add(box(240, 170, 130, 8), 'White plastic', xf((IXc, FY + 90, IZ + 80)))
for k in range(8):                                                                     # the cube tray
    ice.add(box(22, 60, 18, 6), 'Grey plastic', xf((IXc - 85 + k * 24.5, FY + 90, IZ + 5)))
ice.add(box(70, 60, 60, 6), 'Black plastic', xf((IXc + 140, FY + 90, IZ + 80)))       # motor/harvester
ice.add(box(250, 160, 200, 10), 'Clear plastic', xf((IXc, FY + 92, IZ - 160)))         # bucket
ice.add(helix(30, 4, 4, 160, 20, 8), 'Steel', xf((IXc, FY + 92, IZ - 160), (0, 90, 0))) # auger
for k in range(24):
    ice.add(box(18, 18, 18, 5), 'Clear plastic', xf((IXc + random.uniform(-100, 100), FY + 92 + random.uniform(-55, 55), IZ - 230 + random.uniform(0, 70)), (random.uniform(0, 40), random.uniform(0, 40), 0)))

# ------------------------------------------------------------- the machine compartment
MB = (BY - 200, BY - 10)          # compressor bay y range
cov = Part('Machine compartment cover', (0, 1060, -60))
cov.add(box(W - 20, 6, 220, 3), 'Painted steel', xf((0, BY - 3, 120)))
for i in range(14):
    cov.add(box(36, 4, 140, 2), 'Black plastic', xf((-330 + i * 50, BY + 1, 120)))

comp = Part('Linear compressor', (260, 760, -280))
CX, CYc, CZc = 180, BY - 110, 115
comp.add(lathe([(0, -150), (58, -150), (78, -120), (82, -60), (82, 60), (78, 120), (58, 150), (0, 150)], 40),
         'Compressor', xf((CX, CYc, CZc), (0, 90, 0)))
comp.add(torus(84, 4, 40, 8), 'Compressor', xf((CX, CYc, CZc), (0, 90, 0)))                    # weld seam
for dx in (-110, 110):
    for dy in (-55, 55):
        comp.add(cyl(14, 30, 12), 'Rubber', xf((CX + dx, CYc + dy, CZc - 80)))                 # grommets
comp.add(box(300, 140, 6, 2), 'Steel', xf((CX, CYc, CZc - 98)))
comp.add(box(80, 50, 60, 4), 'Black plastic', xf((CX + 60, CYc - 70, CZc + 40)))               # inverter / terminal cover
for dx in (-40, 0, 40):
    comp.add(cyl(5, 40, 10), 'Copper', xf((CX + dx, CYc, CZc + 95)))                           # process, suction, discharge stubs

cnd = Part('Condenser coil', (-280, 760, -280))
NX = -200
pts = []
for i in range(10):
    x = NX - 110 + i * 24
    pts += [(x, BY - 160, 40), (x, BY - 160, 190)] if i % 2 == 0 else [(x, BY - 160, 190), (x, BY - 160, 40)]
cnd.add(pipe(pts, 4, 8), 'Copper', None)
for k in range(30):
    cnd.add(box(240, 30, 1.0), 'Steel', xf((NX, BY - 160, 45 + k * 5)))
cnd.add(box(250, 40, 10, 2), 'Steel', xf((NX, BY - 160, 30)))

cf = Part('Condenser fan', (0, 920, -220))
cf.add(ring(95, 85, 40, 40), 'Black plastic', xf((-20, BY - 120, 115), (0, 90, 0)))
for k in range(5):
    cf.add(box(3, 60, 30, 6), 'Black plastic', xf((-20, BY - 120, 115), (72 * k, 0, 0)) @ xf((0, 40, 0), (0, 25, 0)))
cf.add(cyl(30, 60, 20), 'Steel', xf((10, BY - 120, 115), (0, 90, 0)))

seal = Part('Sealed-system tubing', (0, 520, 160))
seal.add(pipe([(CX - 40, CYc, CZc + 115), (CX - 40, CYc, 230), (60, BY - 60, 230), (NX + 110, BY - 120, 210), (NX + 106, BY - 160, 190)], 4.5, 8), 'Copper')
seal.add(pipe([(NX - 110, BY - 160, 40), (-350, BY - 60, 40), (-IX - 22, BY - 60, 60), (-IX - 22, FY + 30, 260),
               (-IX - 22, FY + 30, ZM1 - 20), (IX + 22, FY + 30, ZM1 - 20), (IX + 22, FY + 30, 260), (IX + 22, BY - 40, 240)], 3.5, 8), 'Copper')   # hot loop
seal.add(cyl(12, 110, 16), 'Copper', xf((IX + 22, BY - 40, 300)))                            # filter drier
cap = []
for i in range(60):
    a = i * 0.55
    cap.append((IX - 20 + 14 * math.cos(a), BY - 40 + 14 * math.sin(a), 360 + i * 3.5))
seal.add(pipe([(IX + 22, BY - 40, 355)] + cap + [(330, EY, 330)], 1.6, 6), 'Copper')            # capillary
seal.add(pipe([(-330, EY, 610), (-360, EY + 20, 600), (-360, BY - 30, 300), (CX, BY - 30, 240), (CX, CYc, CZc + 115)], 6, 10), 'Copper')  # suction line

pcb = Part('Main control board', (0, 560, 560))
pcb.add(box(300, 160, 40, 6), 'Black plastic', xf((200, BY - 100, H - 60)))
pcb.add(box(280, 140, 2), 'PCB', xf((200, BY - 100, H - 39)))
for i in range(28):
    pcb.add(box(random.uniform(6, 22), random.uniform(6, 22), random.uniform(2, 9)), random.choice(['Chip', 'Chip', 'Black plastic', 'Copper']),
            xf((200 + random.uniform(-125, 125), BY - 100 + random.uniform(-60, 60), H - 34)))
pcb.add(pipe([(80, BY - 100, H - 60), (-300, BY - 30, H - 70), (-400, BY - 30, 900), (-350, BY - 30, 240), (CX + 60, CYc - 70, CZc + 70)], 7, 8), 'Black plastic')

wv = Part('Water valve and lines', (-200, 1000, 0))
wv.add(box(70, 50, 60, 6), 'Black plastic', xf((-330, BY - 60, 70)))
wv.add(cyl(18, 40, 16), 'Black plastic', xf((-330, BY - 60, 120)))
wv.add(cyl(10, 40, 12), 'Copper', xf((-330, BY - 20, 70), Y90))
wv.add(pipe([(-330, BY - 60, 140), (-420, BY - 50, 300), (-420, BY - 50, H - 30), (250, FY + 200, H - 6 - T - 95)], 5, 8), 'Blue line')
wv.add(pipe([(-300, BY - 60, 140), (-410, BY - 70, 320), (-410, BY - 70, H - 20), (-W / 2 + 40, FY - 20, H + 4)], 5, 8), 'White plastic')

ft = Part('Rollers and levelling feet', (0, 0, -260))
for sx in (-1, 1):
    ft.add(cyl(10, 50, 12), 'Steel', xf((sx * (W / 2 - 50), FY + 50, 20)))
    ft.add(cyl(26, 14, 24, bevel=3), 'Rubber', xf((sx * (W / 2 - 50), FY + 50, -6)))
    ft.add(cyl(24, 20, 24), 'Black plastic', xf((sx * (W / 2 - 50), BY - 60, 24), (0, 90, 0)))
    ft.add(box(40, 60, 30, 3), 'Steel', xf((sx * (W / 2 - 50), BY - 60, 44)))
ft.add(box(W - 40, 40, 30, 3), 'Steel', xf((0, FY + 50, 30)))

# ------------------------------------------------------------- finishing details
grille = Part('Front toe grille', (0, -900, -360))
grille.add(box(W - 40, 10, 50, 4), 'Black plastic', xf((0, FY - 8, 22)))
for i in range(36):
    grille.add(box(14, 4, 30, 1), 'Painted steel', xf((-W / 2 + 40 + i * 23.5, FY - 14, 22)))
fd.add(box(W - 60, 8, 6, 2), 'Brushed edge', xf((0, FY - 69, FZ1 - 8)))
for sx in (-1, 1):
    top.add(box(120, 60, 18, 6), 'Painted steel', xf((sx * (W / 2 - 70), FY + 40, H + 9)))   # hinge covers
for z in (500, 900, 1300):
    lin.add(box(2 * IX - 40, 10, 4, 2), 'Grey plastic', xf((0, IB - 6, z)))

export('/home/claude/dbd/build/raw/fridge.glb')
