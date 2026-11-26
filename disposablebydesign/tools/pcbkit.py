"""Populated circuit boards: solder-masked substrate, EMI shields, packages, connectors with pins,
hundreds of passives, test pads, screw pads and silkscreen. Everything is built into one bmesh per
material so a dense board stays cheap to build and light to draw."""
import math, random
import bmesh
from mathutils import Matrix, Vector
from lib import mat, prism, slab, box, cyl, ring, Part, xf


def board_materials():
    mat('PCB', (0.018, 0.05, 0.035), rough=0.32, coat=0.35)            # Apple's near-black green solder mask
    mat('Gold', (0.95, 0.74, 0.35), metal=1, rough=0.25)
    mat('Shield', (0.74, 0.75, 0.77), metal=1, rough=0.28)
    mat('Chip', (0.035, 0.035, 0.04), rough=0.4)
    mat('Die', (0.18, 0.2, 0.24), metal=0.6, rough=0.2)
    mat('Cap', (0.62, 0.5, 0.33), rough=0.45)                          # MLCC body
    mat('Res', (0.05, 0.05, 0.055), rough=0.4)
    mat('Tin', (0.8, 0.8, 0.82), metal=1, rough=0.3)
    mat('Silk', (0.85, 0.86, 0.84), rough=0.6)
    mat('Connector', (0.06, 0.06, 0.07), rough=0.5)


def _inside(poly, x, y):
    c = False
    j = len(poly) - 1
    for i in range(len(poly)):
        xi, yi = poly[i]; xj, yj = poly[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi + 1e-12) + xi:
            c = not c
        j = i
    return c


def _hit(rects, x, y, pad):
    for (cx, cy, w, h) in rects:
        if abs(x - cx) < w / 2 + pad and abs(y - cy) < h / 2 + pad:
            return True
    return False


class Board:
    """Collects geometry per material, then adds it to a Part in one go."""

    def __init__(self, seed):
        self.rng = random.Random(seed)
        self.bm = {}
        self.keep = []

    def _b(self, m):
        if m not in self.bm:
            self.bm[m] = bmesh.new()
        return self.bm[m]

    def cube(self, m, c, s, rot=0.0):
        M = Matrix.Translation(c) @ Matrix.Rotation(rot, 4, 'Z') @ Matrix.Diagonal((*s, 1))
        bmesh.ops.create_cube(self._b(m), size=1.0, matrix=M)

    def disc(self, m, c, r, h, seg=10):
        bmesh.ops.create_cone(self._b(m), cap_ends=True, cap_tris=False, segments=seg, radius1=r, radius2=r, depth=h,
                              matrix=Matrix.Translation(c))

    def merge(self, m, prim, M=None):
        if M is not None:
            bmesh.ops.transform(prim, matrix=M, verts=prim.verts)
        import bpy
        tmp = bpy.data.meshes.new('_t'); prim.to_mesh(tmp); prim.free()
        self._b(m).from_mesh(tmp); bpy.data.meshes.remove(tmp)

    # ------------------------------------------------------------ parts of a board
    def substrate(self, poly, z0, t, holes=()):
        self.poly, self.ztop = poly, z0 + t
        self.merge('PCB', prism(poly, t), Matrix.Translation((0, 0, z0 + t / 2)))
        for (x, y, r) in holes:                                   # screw pads with plated rings
            self.merge('Gold', ring(r + 0.9, r, 0.06, 20), Matrix.Translation((x, y, self.ztop + 0.03)))
            self.merge('Tin', ring(r + 0.35, r, 0.1, 20), Matrix.Translation((x, y, self.ztop + 0.05)))
            self.keep.append((x, y, 2 * r + 2.2, 2 * r + 2.2))
        # gold edge plating around the outline
        n = len(poly)
        for i in range(n):
            (x0, y0), (x1, y1) = poly[i], poly[(i + 1) % n]
            L = math.hypot(x1 - x0, y1 - y0)
            if L < 0.5:
                continue
            a = math.atan2(y1 - y0, x1 - x0)
            self.cube('Gold', ((x0 + x1) / 2, (y0 + y1) / 2, z0 + t / 2), (L, 0.12, t * 1.02), a)
        return self

    def shield(self, cx, cy, w, h, ht=0.9, dimples=True):
        z = self.ztop
        self.merge('Shield', box(w, h, ht, min(0.25, ht * 0.3), 2), Matrix.Translation((cx, cy, z + ht / 2)))
        self.cube('Shield', (cx, cy, z + 0.04), (w + 0.4, h + 0.4, 0.08))        # the soldered fence
        if dimples:
            nx, ny = max(1, int(w / 2.2)), max(1, int(h / 2.2))
            for i in range(nx):
                for j in range(ny):
                    x = cx - w / 2 + (i + 0.5) * w / nx
                    y = cy - h / 2 + (j + 0.5) * h / ny
                    self.disc('Tin', (x, y, z + ht + 0.005), 0.25, 0.02, 8)
        self.keep.append((cx, cy, w + 0.5, h + 0.5))

    def chip(self, cx, cy, w, h, ht=0.6, die=None, label=True, m='Chip'):
        z = self.ztop
        self.merge(m, box(w, h, ht, min(0.15, ht * 0.3), 2), Matrix.Translation((cx, cy, z + ht / 2)))
        if die:
            dw, dh = die
            self.cube('Die', (cx, cy, z + ht + 0.03), (dw, dh, 0.06))
        if label:
            self.disc('Silk', (cx - w / 2 + 0.6, cy + h / 2 - 0.6, z + ht + 0.01), 0.18, 0.02, 8)
            for k in range(3):
                self.cube('Silk', (cx - w * 0.15, cy - h * 0.1 - k * 0.5, z + ht + 0.005), (w * 0.45, 0.12, 0.01))
        self.keep.append((cx, cy, w + 0.3, h + 0.3))

    def connector(self, cx, cy, w, h, pins=None, rot=0.0):
        z = self.ztop
        Rm = Matrix.Translation((cx, cy, 0)) @ Matrix.Rotation(rot, 4, 'Z')
        self.merge('Connector', box(w, h, 0.7, 0.1, 1), Rm @ Matrix.Translation((0, 0, z + 0.35)))
        n = pins or max(4, int(w / 0.35))
        for row in (-1, 1):
            for i in range(n):
                x = -w / 2 + 0.3 + i * (w - 0.6) / max(1, n - 1)
                p = Rm @ Vector((x, row * (h / 2 + 0.12), z + 0.08))
                self.cube('Gold', p, (0.14, 0.32, 0.1), rot)
        self.keep.append((cx, cy, (w if abs(math.sin(rot)) < 0.5 else h) + 0.8, (h if abs(math.sin(rot)) < 0.5 else w) + 0.8))

    def passives(self, density, region=None, sizes=((1.0, 0.5, 0.5), (0.6, 0.3, 0.3), (0.4, 0.2, 0.22)), cluster=0.7):
        """Scatter capacitors and resistors, clustered toward the edges of the chips the way real boards are."""
        rng = self.rng
        xs = [p[0] for p in self.poly]; ys = [p[1] for p in self.poly]
        x0, x1, y0, y1 = (min(xs), max(xs), min(ys), max(ys)) if region is None else region
        area = (x1 - x0) * (y1 - y0)
        target = int(area / 100.0 * density)          # density: parts per square centimetre
        placed = 0; tries = 0
        z = self.ztop
        anchors = [(k[0], k[1], k[2], k[3]) for k in self.keep]
        while placed < target and tries < target * 30:
            tries += 1
            if anchors and rng.random() < cluster:
                cx, cy, w, h = rng.choice(anchors)
                side = rng.randrange(4)
                off = rng.uniform(0.5, 2.2)
                if side < 2:
                    x = cx + (w / 2 + off) * (1 if side == 0 else -1); y = cy + rng.uniform(-h / 2, h / 2)
                else:
                    y = cy + (h / 2 + off) * (1 if side == 2 else -1); x = cx + rng.uniform(-w / 2, w / 2)
            else:
                x, y = rng.uniform(x0, x1), rng.uniform(y0, y1)
            if not _inside(self.poly, x, y) or _hit(self.keep, x, y, 0.15):
                continue
            # stay off the board edge
            if not all(_inside(self.poly, x + dx, y + dy) for dx, dy in ((0.9, 0), (-0.9, 0), (0, 0.9), (0, -0.9))):
                continue
            sx, sy, sz = rng.choice(sizes)
            rot = 0.0 if rng.random() < 0.5 else math.pi / 2
            if rng.random() < 0.72:
                self.cube('Cap', (x, y, z + sz / 2), (sx * 0.8, sy, sz), rot)
                for e in (-1, 1):                              # tinned terminations
                    ex, ey = (e * sx * 0.45, 0) if rot == 0.0 else (0, e * sx * 0.45)
                    self.cube('Tin', (x + ex, y + ey, z + sz / 2), (sx * 0.12, sy * 1.02, sz * 1.02) if rot == 0.0 else (sy * 1.02, sx * 0.12, sz * 1.02))
            else:
                self.cube('Res', (x, y, z + sz * 0.35), (sx, sy, sz * 0.7), rot)
            self.keep.append((x, y, sx if rot == 0.0 else sy, sy if rot == 0.0 else sx))
            placed += 1
        return placed

    def testpads(self, n, region=None):
        xs = [p[0] for p in self.poly]; ys = [p[1] for p in self.poly]
        x0, x1, y0, y1 = (min(xs), max(xs), min(ys), max(ys)) if region is None else region
        k = 0; tries = 0
        while k < n and tries < n * 40:
            tries += 1
            x, y = self.rng.uniform(x0, x1), self.rng.uniform(y0, y1)
            if _inside(self.poly, x, y) and not _hit(self.keep, x, y, 0.2):
                self.disc('Gold', (x, y, self.ztop + 0.015), 0.28, 0.03, 10)
                k += 1

    def silk(self, n):
        k = 0; tries = 0
        xs = [p[0] for p in self.poly]; ys = [p[1] for p in self.poly]
        while k < n and tries < n * 40:
            tries += 1
            x, y = self.rng.uniform(min(xs), max(xs)), self.rng.uniform(min(ys), max(ys))
            if _inside(self.poly, x, y) and not _hit(self.keep, x, y, 0.3):
                L = self.rng.uniform(0.8, 2.6)
                self.cube('Silk', (x, y, self.ztop + 0.005), (L, 0.1, 0.01), self.rng.choice((0.0, math.pi / 2)))
                k += 1

    def into(self, part):
        for m, b in self.bm.items():
            part.add(b, m)
        self.bm = {}
