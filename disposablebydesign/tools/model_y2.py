"""Tesla Model Y built from the supplied model (TeslaModelY.glb) plus modeled structure and internals.

The source is a 2.4-million-triangle showroom shell made of unwelded faces in arbitrary units. Here it is
welded, decimated, scaled to the real 4,751 mm length, turned so X points forward, and sorted panel by
panel into the parts that come off: doors (with their glass), frunk lid, liftgate, fascias, lights,
wheels and brakes. Logos are left out. Everything under the floor is modeled: pack, cells, foam,
castings, drive units, suspension and the thermal system.
"""
import sys, math, random
sys.path.insert(0, '/home/claude/dbd/models')
from lib import *
from mathutils import Matrix, Vector

bpy.ops.wm.open_mainfile(filepath='/home/claude/dbd/src_models/tesla_import.blend')
K = 4751 / 1.34
M = Matrix.Rotation(math.pi / 2, 4, 'Z') @ Matrix.Scale(K, 4) @ Matrix.Translation((0, -0.12, 0.08))
AX, TR, WR = 1436, 771, 372

RATIO = {'tires': 0.07, 'wheels': 0.08, 'calipers': 0.07, 'calipers2': 0.3, 'brakedsk': 0.12, 'chrome_rear_lights': 0.04,
         'interior': 0.1, 'body': 0.65, 'fenders': 0.25, 'glass_lights': 0.07, 'chrome': 0.1, 'black2': 0.08, 'black': 0.3,
         'chrome_rear_2': 0.08, 'glass_body': 0.5, 'metal': 0.4, 'alum': 0.5, 'chrome_dark': 0.3, 'glass_front_lights': 0.5}
DROP = {'91', '66', '60', '04', '05', '18', '19', '23', '25', '02', '03', '22', '24'}                                    # badges and logos
REPEATER = '50'                    # fender camera housings: kept, with the engraved T filled in
TAIL = {'34', '35', '38', '39', '40', '61', '62', '63', '64', '65', '67', '94', '95', '96'}
HEAD = {'57', '58', '59', '68', '69', '70', '71', '72', '73', '74', '77', '78', '79', '81', '82', '84', '86', '87', '89', '99', '100'}
FFASCIA = {'52', '53', '76'}
MIRROR = {'80', '85', '97'}
LIFTGLASS = {'36', '37'}
WINDSHIELD = {'92', '93'}
INTERIOR = {'41', '42', '43', '45', '49', '54', '83'}

buckets = {}
def put(part, mtl, bm):
    buckets.setdefault(part, []).append((mtl, bm))

DEFER = []                         # (mtl, bm, [(vertex-index list, label)]) — labelled per island, split at the end
def defer(mtl, bm, labelled):
    DEFER.append((mtl, bm, labelled))


def delogo(bm):
    """Replace the fender camera housings (they carry an engraved T) with clean gloss-black covers of the
    same outline and crown: the outline is the housing's side-view hull, the height at each point is the
    housing's outer surface sampled around it (wide enough to step over the engraving), then relaxed."""
    import numpy as np
    from scipy.spatial import ConvexHull, Delaunay
    from mathutils.kdtree import KDTree
    out = bmesh.new()
    for side in (1, -1):
        P = np.array([(v.co.x, v.co.z, abs(v.co.y)) for v in bm.verts if v.co.y * side > 0])
        h = ConvexHull(P[:, :2]); poly = P[h.vertices, :2]
        cen = poly.mean(0); poly = cen + (poly - cen) * 0.985
        pts = []
        for i in range(len(poly)):                                       # densified outline
            a_, b_ = poly[i], poly[(i + 1) % len(poly)]
            n = max(1, int(np.linalg.norm(b_ - a_) / 3))
            pts += [a_ + (b_ - a_) * t / n for t in range(n)]
        nb = len(pts)
        tri0 = Delaunay(poly)
        xs = np.arange(P[:, 0].min(), P[:, 0].max(), 3.0); zs = np.arange(P[:, 1].min(), P[:, 1].max(), 3.0)
        for x in xs:
            for z in zs:
                if tri0.find_simplex([x, z]) >= 0 and min(np.linalg.norm(np.array(pts) - (x, z), axis=1)) > 1.5:
                    pts.append(np.array([x, z]))
        pts = np.array(pts)
        kd = KDTree(len(P))
        for i, p_ in enumerate(P): kd.insert((p_[0], p_[1], 0), i)
        kd.balance()
        # outline heights: the housing's outer edge, smoothed along the loop
        Hb = np.array([max([P[j][2] for _, j, _ in kd.find_range((x, z, 0), 4.0)] or [P[kd.find((x, z, 0))[1]][2]]) for x, z in pts[:nb]])
        for _ in range(20):
            Hb = 0.5 * Hb + 0.25 * (np.roll(Hb, 1) + np.roll(Hb, -1))
        D = Delaunay(pts)
        nbr = [set() for _ in pts]
        for t in D.simplices:
            for i in range(3):
                nbr[t[i]].update((t[(i + 1) % 3], t[(i + 2) % 3]))
        nbr = [list(n) for n in nbr]
        # interior: a smooth dome spanning the outline (Poisson solve, outline fixed), crowned ~3 mm
        H = np.concatenate([Hb, np.full(len(pts) - nb, Hb.mean())])
        for _ in range(600):
            H[nb:] = np.array([H[nbr[i]].mean() for i in range(nb, len(pts))]) + 0.035
        top = [out.verts.new((x, side * y, z)) for (x, z), y in zip(pts, H)]
        low = [out.verts.new((x, side * (y - 8), z)) for (x, z), y in zip(pts[:nb], H[:nb])]
        for t in D.simplices:
            f = out.faces.new([top[i] for i in t])
            if f.calc_center_median().y * side > 0 and f.normal.y * side < 0: f.normal_flip()
            f.normal_update()
            if f.normal.y * side < 0: f.normal_flip()
        for i in range(nb):                                                 # skirt down into the fender
            j = (i + 1) % nb
            out.faces.new([top[i], top[j], low[j], low[i]])
    out.normal_update()
    print('repeater covers', len(out.faces))
    return out

def centre(bm, comp=None):
    vs = [bm.verts[i].co for i in comp] if comp is not None else [v.co for v in bm.verts]
    mn = Vector([min(c[k] for c in vs) for k in range(3)]); mx = Vector([max(c[k] for c in vs) for k in range(3)])
    return mn, mx

def piece(bm, comp):
    keep = set(comp)
    return subset(bm, lambda f: f.verts[0].index in keep)

def door_of(mn, mx):
    c = (mn + mx) / 2
    if c.x < -1350 or c.x > 950 or abs(c.y) < 450:
        return None
    side = 'left' if c.y > 0 else 'right'
    return ('Front ' if c.x > -280 else 'Rear ') + side + ' door'

def body_region(mn, mx):
    c = (mn + mx) / 2
    span_y = mx.y - mn.y
    if mn.x > 1640 and mx.z < 820:
        return 'Front fascia'
    if mx.x < -1760 and mx.z < 800:
        return 'Rear fascia'
    if mn.x > 1150 and mn.z > 700 and span_y > 700:
        return 'Frunk lid'
    if mx.x < -1350 and mn.z > 540 and span_y > 600:
        return 'Liftgate'
    return 'Body shell'

# Shading. The source splits one surface across several objects in an interlocking checkerboard, so each
# object's normals have to be read from the whole surface: pool the dense samples per material and let
# every decimated piece take its normals from the pool (see lib.grab / _blur_normals).
import numpy as np
_pool = {}
for o in [o for o in bpy.data.objects if o.type == 'MESH']:
    if o.name.split('_')[0] in DROP:
        continue
    _pool.setdefault(o.data.materials[0].name if o.data.materials else 'black', []).append(hi_samples(o, M, 0.0005))
POOL = {k: tuple(np.concatenate([p[i] for p in v]) for i in range(3)) for k, v in _pool.items()}
del _pool

for o in [o for o in bpy.data.objects if o.type == 'MESH']:
    num, mtl = o.name.split('_')[0], o.data.materials[0].name if o.data.materials else 'black'
    if num in DROP:
        continue
    if num == REPEATER:
        bm = grab(o, M, ratio=1.0, weld=0.0005, transfer=False)
        put('Body shell', 'black', delogo(bm)); continue
    bm = grab(o, M, ratio=RATIO.get(mtl, 0.3), weld=0.0005, blur=20, blur_pool=POOL[mtl])
    if not bm.verts:
        continue
    bm.verts.ensure_lookup_table()
    mn, mx = centre(bm); c = (mn + mx) / 2
    if mtl in ('tires', 'wheels', 'metal', 'alum') and mx.z < 800:
        q = ('Front ' if c.x > 0 else 'Rear ') + ('left' if c.y > 0 else 'right') + ' wheel and tyre'
        put(q, mtl, bm); continue
    if mtl in ('calipers', 'calipers2', 'brakedsk'):
        put('Left brakes' if c.y > 0 else 'Right brakes', mtl, bm); continue
    if num in TAIL: put('Tail lights', mtl, bm); continue
    if num in HEAD: put('Headlights', mtl, bm); continue
    if num in FFASCIA: put('Front fascia', mtl, bm); continue
    if num in LIFTGLASS: put('Liftgate', mtl, bm); continue
    if num in WINDSHIELD: put('Glass roof and windows', mtl, bm); continue
    if num in INTERIOR: put('Cabin interior', mtl, bm); continue
    if num in MIRROR:
        lab = []
        for comp in islands(bm):
            a, b = centre(bm, comp)
            lab.append((comp, 'Front left door' if (a.y + b.y) > 0 else 'Front right door'))
        defer(mtl, bm, lab); continue
    if num == '98':                                         # the four doors
        lab = []
        for comp in islands(bm):
            a, b = centre(bm, comp)
            lab.append((comp, door_of(a, b) or 'Body shell'))
        defer(mtl, bm, lab); continue
    if mtl in ('glass_body', 'metal') or num == '102':     # side glass and window frames ride with their doors
        lab = []
        for comp in islands(bm):
            a, b = centre(bm, comp)
            d = door_of(a, b) if (b.z > 900 and mtl != 'glass_body' or (mtl == 'glass_body' and a.z < 1150)) else None
            if mtl == 'glass_body' and (a.x + b.x) / 2 < -1450:
                d = 'Liftgate'
            lab.append((comp, d or 'Glass roof and windows' if mtl == 'glass_body' else d or 'Body shell'))
        defer(mtl, bm, lab); continue
    if mtl in ('body', 'fenders', 'black', 'black2', 'chrome', 'chrome_dark'):
        lab = []
        for comp in islands(bm):
            a, b = centre(bm, comp)
            lab.append((comp, body_region(a, b)))
        defer(mtl, bm, lab); continue
    put('Body shell', mtl, bm)

# ---- fragments follow the panel they sit on -------------------------------------------------------------
# The source surfaces break into hundreds of small islands. Labelling each by its own bounding box left
# bits of the liftgate, frunk lid and door handles behind on the body. Instead, every small panel island is
# projected onto the big panels (from behind for the liftgate, from above for the frunk lid, from the side
# for the doors) and goes with the one it lies on.
import os
DEBUG = os.environ.get('DBG')
from mathutils.bvhtree import BVHTree
PANEL_MTL = ('body', 'fenders', 'black', 'black2', 'chrome', 'chrome_dark')
SEED = 800
MOVERS = [('Front left door', (0, -1, 0)), ('Rear left door', (0, -1, 0)), ('Front right door', (0, 1, 0)),
          ('Rear right door', (0, 1, 0)), ('Liftgate', (1, 0, 0)), ('Frunk lid', (0, 0, -1))]
seed_geo = {L: ([], []) for L, _ in MOVERS}
seed_geo['Body shell'] = ([], [])
def add_seed(L, cos, faces):
    vs, ps = seed_geo[L]; o = len(vs); vs.extend(cos); ps.extend([[o + i for i in f] for f in faces])
for mtl, bm, lab in DEFER:
    bm.verts.ensure_lookup_table(); bm.faces.ensure_lookup_table()
    for comp, L in lab:
        if L in seed_geo and len(comp) >= SEED and (L != 'Body shell' or mtl in PANEL_MTL):
            keep = set(comp); idx = {}
            fs = [f for f in bm.faces if f.verts[0].index in keep]
            cos = []
            for f in fs:
                for v in f.verts:
                    if v.index not in idx: idx[v.index] = len(cos); cos.append(v.co.copy())
            add_seed(L, cos, [[idx[v.index] for v in f.verts] for f in fs])
for L in ('Liftgate', 'Frunk lid'):                       # glass already filed there counts as panel too
    for mtl, bm in buckets.get(L, []):
        add_seed(L, [v.co.copy() for v in bm.verts], [[v.index for v in f.verts] for f in bm.faces])
trees = {L: BVHTree.FromPolygons(vs, ps) for L, (vs, ps) in seed_geo.items() if ps}
def lies_on(L, d, cos):
    """True when most of the points sit on or just under panel L, seen along d. Rays that slip through a
    small hole in the panel (where a badge was) count if the rays around them land."""
    t = trees.get(L)
    if t is None: return False
    d = Vector(d)
    u = Vector((0, 0, 1)) if abs(d.z) < 0.5 else Vector((1, 0, 0)); w = d.cross(u)
    ok = 0
    for c in cos:
        hit = t.ray_cast(c - d * 6000, d, 12000)[0]
        if hit is None:
            ring = [t.ray_cast(c + o * 30 - d * 6000, d, 12000)[0] for o in (u, -u, w, -w)]
            ring = [h for h in ring if h is not None]
            if len(ring) >= 3 and -10 <= (c - sum(ring, Vector()) / len(ring)).dot(d) <= 150: ok += 1
        elif -10 <= (c - hit).dot(d) <= 150: ok += 1
    return ok >= 0.6 * len(cos)
moved = {}
for mtl, bm, lab in DEFER:
    if mtl not in PANEL_MTL: continue
    for i, (comp, L) in enumerate(lab):
        if len(comp) >= SEED or L not in ('Body shell', 'Liftgate', 'Frunk lid', 'Front fascia', 'Rear fascia') + tuple(m for m, _ in MOVERS): continue
        step = max(1, len(comp) // 24)
        cos = [bm.verts[j].co for j in comp[::step]]
        if L in ('Front fascia', 'Rear fascia'):          # fascia bits only move if they lie on a lid
            new = 'Frunk lid' if L == 'Front fascia' and lies_on('Frunk lid', (0, 0, -1), cos) else \
                  'Liftgate' if L == 'Rear fascia' and lies_on('Liftgate', (1, 0, 0), cos) else None
            if new:
                lab[i] = (comp, new); moved[(L, new)] = moved.get((L, new), 0) + 1
            continue
        new = next((M_ for M_, d in MOVERS if lies_on(M_, d, cos)), None)
        if new is None:
            # fills a hole in a big panel (badge cut-outs, decimation seams): goes with the panel it sits
            # closest to, on average over its points
            near = {}
            for M_, tr in trees.items():
                dd = [tr.find_nearest(c)[3] for c in cos]
                near[M_] = sum(x if x is not None else 1e9 for x in dd) / len(dd)
            M_ = min(near, key=near.get)
            if near[M_] < 25: new = M_
            if DEBUG:
                a_, b_ = centre(bm, comp); c_ = (a_ + b_) / 2
                if c_.x < -1700 and c_.z > 780 and abs(c_.y) < 760:
                    print('DBG', len(comp), [round(q) for q in a_], [round(q) for q in b_], {k: round(v) for k, v in near.items() if k in ('Liftgate', 'Body shell')}, '->', new)
        if new is None and L in ('Liftgate', 'Frunk lid'): new = 'Body shell'
        if new and new != L:
            lab[i] = (comp, new); moved[(L, new)] = moved.get((L, new), 0) + 1
print('fragments moved', moved)
for mtl, bm, lab in DEFER:
    vlab = {}
    for comp, L in lab:
        for j in comp: vlab[j] = L
    for L, piece_bm in split_faces(bm, lambda f: vlab.get(f.verts[0].index)).items():
        put(L, mtl, piece_bm)

reset()
random.seed(23)
mat('Paint', (0.34, 0.35, 0.37), metal=0.65, rough=0.3, coat=0.6)    # stealth-ish grey
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
mat('Caliper', (0.55, 0.06, 0.05), metal=0.3, rough=0.35)
mat('Seat', (0.92, 0.91, 0.88), rough=0.6)          # the white vegan leather
mat('Seat dark', (0.06, 0.06, 0.07), rough=0.6)
mat('Trim wood', (0.42, 0.3, 0.2), rough=0.5)
mat('Screen', (0.01, 0.012, 0.015), rough=0.08, coat=1)
mat('Screen glow', (0.5, 0.55, 0.6), emit=((0.55, 0.62, 0.72), 1.2))
mat('Rubber', (0.04, 0.04, 0.045), rough=0.85)
mat('HV cable', (0.16, 0.16, 0.17), rough=0.5)
mat('Plastic', (0.07, 0.07, 0.075), rough=0.6)
mat('Radiator fin', (0.7, 0.71, 0.72), metal=1, rough=0.4)

mat('Dark chrome', (0.16, 0.16, 0.17), metal=0.9, rough=0.25)
mat('Lamp chrome', (0.85, 0.86, 0.88), metal=1, rough=0.12)
mat('Interior', (0.05, 0.05, 0.055), rough=0.6)
mat('Lamp housing', (0.03, 0.03, 0.035), rough=0.35)
mat('Clear lens', (0.9, 0.93, 0.95), rough=0.02, alpha=0.18, coat=1.0)
mat('Red lens', (0.55, 0.02, 0.03), rough=0.05, alpha=0.55, coat=1.0)

SRC_MAT = {'body': 'Paint', 'fenders': 'Matte black', 'black': 'Gloss black', 'black2': 'Gloss black', 'chrome': 'Dark chrome',
           'chrome_dark': 'Dark chrome', 'chrome_rear_2': 'Lamp chrome', 'chrome_rear_lights': 'Tail red', 'glass_body': 'Glass',
           'glass_lights': 'Light lens', 'glass_front_lights': 'Light lens', 'interior': 'Interior', 'metal': 'Dark chrome',
           'alum': 'Rim', 'tires': 'Tyre', 'wheels': 'Rim', 'calipers': 'Caliper', 'calipers2': 'Caliper', 'brakedsk': 'Rotor'}
EXPLODE = {
    'Body shell': (0, 0, 1550), 'Glass roof and windows': (0, 0, 2250), 'Frunk lid': (950, 0, 1900), 'Liftgate': (-950, 0, 1850),
    'Front fascia': (1350, 0, 0), 'Rear fascia': (-1350, 0, 0), 'Headlights': (1750, 0, 350), 'Tail lights': (-1750, 0, 350),
    'Front left door': (150, 1350, 500), 'Rear left door': (-250, 1350, 500), 'Front right door': (150, -1350, 500),
    'Rear right door': (-250, -1350, 500), 'Cabin interior': (0, 0, 850),
    'Front left wheel and tyre': (250, 1150, 0), 'Front right wheel and tyre': (250, -1150, 0),
    'Rear left wheel and tyre': (-250, 1150, 0), 'Rear right wheel and tyre': (-250, -1150, 0),
    'Left brakes': (0, 800, 0), 'Right brakes': (0, -800, 0)}
LAMP = {
    'Headlights': {'chrome': 'Lamp chrome', 'chrome_dark': 'Lamp chrome', 'black': 'Lamp housing', 'black2': 'Lamp housing',
                   'glass_lights': 'Clear lens', 'glass_front_lights': 'DRL', 'alum': 'Lamp chrome', 'metal': 'Lamp chrome'},
    'Tail lights': {'chrome_rear_lights': 'Tail red', 'chrome_rear_2': 'Lamp chrome', 'black2': 'Lamp housing', 'black': 'Lamp housing',
                    'glass_lights': 'Red lens', 'chrome': 'Lamp chrome'},
}
for name, items in buckets.items():
    p = Part(name, EXPLODE.get(name, (0, 0, 0)), smooth=40, recalc=False)
    for mtl, bm in items:
        p.add(bm, LAMP.get(name, {}).get(mtl, SRC_MAT.get(mtl, 'Gloss black')))

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
    fc.add(box(700, 120, 220, 18), 'Cast aluminium', xf((1760, sy * 480, 440)))
    fc.add(lathe([(150, 0), (150, 40), (110, 120), (95, 380), (120, 400), (0, 400)], 32), 'Cast aluminium', xf((AX, sy * 560, 380)))
    for k in range(5):
        fc.add(box(18, 100, 200, 3), 'Cast aluminium', xf((1500 + k * 160, sy * 400, 430)))
fc.add(box(80, 960, 200, 16), 'Cast aluminium', xf((2080, 0, 440)))
fc.add(box(700, 850, 14, 4), 'Cast aluminium', xf((1760, 0, 350)))
for k in range(6):
    fc.add(box(700, 14, 80, 2), 'Cast aluminium', xf((1760, -360 + k * 144, 395)))
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
rc.add(box(90, 1150, 240, 16), 'Cast aluminium', xf((-2140, 0, 470)))
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

# ------------------------------------------------------------- front-end systems
tub = Part('Frunk tub', (850, 0, 1350))
for (sx, sy, sz, cx, cy, cz) in ((400, 840, 8, 1740, 0, 610), (400, 8, 180, 1740, 420, 700), (400, 8, 180, 1740, -420, 700),
                                 (8, 840, 180, 1940, 0, 700), (8, 840, 180, 1540, 0, 700)):
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
rad.add(box(30, 760, 340, 4), 'Radiator fin', xf((2140, 0, 520)))
for k in range(30):
    rad.add(box(34, 3, 340), 'Aluminium', xf((2140, -370 + k * 25.5, 520)))
rad.add(box(40, 780, 30, 4), 'Plastic', xf((2140, 0, 700)))
rad.add(box(40, 780, 30, 4), 'Plastic', xf((2140, 0, 340)))
rad.add(ring(170, 160, 40, 40), 'Plastic', xf((2100, 0, 520), (0, 90, 0)))
for k in range(7):
    rad.add(box(3, 70, 30, 6), 'Plastic', xf((2100, 0, 520), (360 / 7 * k, 0, 0)) @ xf((0, 70, 0), (0, 25, 0)))

lv = Part('Low-voltage battery', (1400, -800, 900))
lv.add(box(300, 180, 190, 12), 'Plastic', xf((1650, -330, 740)))
lv.add(box(260, 150, 6, 4), 'Matte black', xf((1650, -330, 838)))
for dy in (-40, 40):
    lv.add(cyl(10, 20, 12), 'Copper', xf((1760, -330 + dy, 848)))

hv = Part('High-voltage cabling and charge port', (-300, 950, -250))
for sy in (-1, 1):
    hv.add(pipe([(PX1 + 10, sy * 220, PZ + 110), (PX1 + 200, sy * 200, 300), (AX - 80, sy * 100, 600), (AX + 70, 60, WR + 280)], 16, 10), 'HV cable')
    hv.add(pipe([(PX0 - 10, sy * 200, PZ + 110), (PX0 - 200, sy * 150, 300), (-AX + 120, sy * 60, WR + 300)], 16, 10), 'HV cable')
hv.add(pipe([(-1900, 715, 880), (-1700, 640, 700), (-1300, 600, 400), (PX0 + 20, 600, PZ + 120)], 14, 10), 'HV cable')
hv.add(box(80, 40, 90, 14), 'Plastic', xf((-1900, 720, 885)))       # charge inlet, behind the left tail lamp (skin is at y~790 here)

export('/home/claude/dbd/build/raw/model_y.glb')
