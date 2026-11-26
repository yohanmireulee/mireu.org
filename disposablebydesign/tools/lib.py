"""Small procedural modeling kit for the Disposable by Design teardown models.

Every model is built in millimetres, Z up. A Part collects primitives (each with its own
material) into one mesh object, so the exploded view moves whole components. Each part
stores an 'explode' vector (mm, Blender axes) as a custom property; the glTF exporter
writes it into the node extras for the site to read.
"""
import bpy, bmesh, math
from mathutils import Matrix, Vector, Euler

TAU = math.tau


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    for m in list(bpy.data.materials):
        bpy.data.materials.remove(m)


MATS = {}


def mat(name, color, metal=0.0, rough=0.5, alpha=1.0, transmission=0.0, emit=None, coat=0.0, ior=1.5):
    """Register a material by name; colour is linear-ish sRGB triple (0-1)."""
    if name in MATS:
        return name
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Metallic'].default_value = metal
    b.inputs['Roughness'].default_value = rough
    if transmission:
        b.inputs['Transmission Weight'].default_value = transmission
        b.inputs['IOR'].default_value = ior
    if alpha < 1:
        b.inputs['Alpha'].default_value = alpha
        try:
            m.surface_render_method = 'BLENDED'
        except Exception:
            pass
    if coat:
        b.inputs['Coat Weight'].default_value = coat
        b.inputs['Coat Roughness'].default_value = 0.05
    if emit:
        b.inputs['Emission Color'].default_value = (*emit[0], 1)
        b.inputs['Emission Strength'].default_value = emit[1]
    MATS[name] = m
    return name


def xf(loc=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1)):
    """Location + XYZ euler rotation in degrees + scale."""
    r = Euler(tuple(math.radians(a) for a in rot), 'XYZ').to_matrix().to_4x4()
    s = Matrix.Diagonal((*scale, 1))
    return Matrix.Translation(Vector(loc)) @ r @ s


# ---------------------------------------------------------------- primitives (return bmesh)

def _bevel(bm, r, segs, only=None):
    if r <= 0:
        return
    edges = only if only is not None else bm.edges[:]
    bmesh.ops.bevel(bm, geom=edges, offset=r, offset_type='OFFSET', segments=segs,
                    profile=0.5, affect='EDGES', clamp_overlap=True)


def box(sx, sy, sz, r=0.0, segs=2):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=(sx, sy, sz), verts=bm.verts)
    _bevel(bm, min(r, min(sx, sy, sz) * 0.49), segs)
    return bm


def _rrect_pts(w, d, r, seg):
    r = min(r, w / 2 - 1e-4, d / 2 - 1e-4)
    pts = []
    for cx, cy, a0 in ((w / 2 - r, d / 2 - r, 0), (-w / 2 + r, d / 2 - r, 90),
                       (-w / 2 + r, -d / 2 + r, 180), (w / 2 - r, -d / 2 + r, 270)):
        for i in range(seg + 1):
            a = math.radians(a0 + 90 * i / seg)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def slab(w, d, h, r, seg=10, bevel=0.0, bsegs=2):
    """Rounded-rectangle prism, centred, thickness h along Z."""
    bm = bmesh.new()
    pts = _rrect_pts(w, d, r, seg)
    bot = [bm.verts.new((x, y, -h / 2)) for x, y in pts]
    top = [bm.verts.new((x, y, h / 2)) for x, y in pts]
    n = len(pts)
    bm.faces.new(top)
    bm.faces.new(list(reversed(bot)))
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((bot[i], bot[j], top[j], top[i]))
    if bevel > 0:
        rim = [e for e in bm.edges if abs(e.verts[0].co.z - e.verts[1].co.z) < 1e-6]
        _bevel(bm, min(bevel, h * 0.49), bsegs, rim)
    return bm


def frame(w, d, h, r, wall, seg=10, bevel=0.0):
    """Rounded-rectangle ring (a phone band, a door frame)."""
    bm = bmesh.new()
    o = _rrect_pts(w, d, r, seg)
    i_ = _rrect_pts(w - 2 * wall, d - 2 * wall, max(r - wall, 0.5), seg)
    n = len(o)
    ob = [bm.verts.new((x, y, -h / 2)) for x, y in o]
    ot = [bm.verts.new((x, y, h / 2)) for x, y in o]
    ib = [bm.verts.new((x, y, -h / 2)) for x, y in i_]
    it = [bm.verts.new((x, y, h / 2)) for x, y in i_]
    for k in range(n):
        j = (k + 1) % n
        bm.faces.new((ob[k], ob[j], ot[j], ot[k]))
        bm.faces.new((it[k], it[j], ib[j], ib[k]))
        bm.faces.new((ot[k], ot[j], it[j], it[k]))
        bm.faces.new((ib[k], ib[j], ob[j], ob[k]))
    if bevel > 0:
        _bevel(bm, bevel, 2)
    return bm


def cyl(r, h, seg=32, bevel=0.0, r2=None):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r,
                          radius2=r if r2 is None else r2, depth=h)
    if bevel > 0:
        caps = [e for e in bm.edges if abs(e.verts[0].co.z - e.verts[1].co.z) < 1e-6 and abs(abs(e.verts[0].co.z) - h / 2) < 1e-6]
        _bevel(bm, min(bevel, h * 0.45, r * 0.45), 2, caps)
    return bm


def ring(r_out, r_in, h, seg=48, a0=0.0, a1=360.0):
    """Annulus (or an arc of one) with thickness h along Z."""
    bm = bmesh.new()
    full = abs(a1 - a0) >= 359.999
    n = seg if full else seg + 1
    vs = []
    for k in range(n):
        a = math.radians(a0 + (a1 - a0) * k / seg)
        c, s = math.cos(a), math.sin(a)
        vs.append([bm.verts.new((r_out * c, r_out * s, -h / 2)), bm.verts.new((r_out * c, r_out * s, h / 2)),
                   bm.verts.new((r_in * c, r_in * s, h / 2)), bm.verts.new((r_in * c, r_in * s, -h / 2))])
    m = n if full else n - 1
    for k in range(m):
        A, B = vs[k], vs[(k + 1) % n]
        for q in range(4):
            bm.faces.new((A[q], B[q], B[(q + 1) % 4], A[(q + 1) % 4]))
    if not full:
        bm.faces.new(list(reversed(vs[0])))
        bm.faces.new(vs[-1])
    return bm


def sphere(r, seg=24, rings=12):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=r)
    return bm


def torus(R, r, seg=48, rseg=12):
    bm = bmesh.new()
    rows = []
    for i in range(seg):
        a = TAU * i / seg
        row = []
        for j in range(rseg):
            b = TAU * j / rseg
            row.append(bm.verts.new(((R + r * math.cos(b)) * math.cos(a), (R + r * math.cos(b)) * math.sin(a), r * math.sin(b))))
        rows.append(row)
    for i in range(seg):
        for j in range(rseg):
            a, b = rows[i][j], rows[(i + 1) % seg][j]
            c, d = rows[(i + 1) % seg][(j + 1) % rseg], rows[i][(j + 1) % rseg]
            bm.faces.new((a, b, c, d))
    return bm


def pipe(points, r, rseg=10, closed=False):
    """Tube swept along a polyline of 3D points."""
    bm = bmesh.new()
    P = [Vector(p) for p in points]
    rings_ = []
    for i, p in enumerate(P):
        if closed:
            t = (P[(i + 1) % len(P)] - P[i - 1]).normalized()
        elif i == 0:
            t = (P[1] - P[0]).normalized()
        elif i == len(P) - 1:
            t = (P[-1] - P[-2]).normalized()
        else:
            t = ((P[i + 1] - P[i]).normalized() + (P[i] - P[i - 1]).normalized()).normalized()
        up = Vector((0, 0, 1)) if abs(t.z) < 0.9 else Vector((1, 0, 0))
        u = t.cross(up).normalized()
        v = t.cross(u).normalized()
        rings_.append([bm.verts.new(p + r * (math.cos(TAU * k / rseg) * u + math.sin(TAU * k / rseg) * v)) for k in range(rseg)])
    n = len(rings_) if closed else len(rings_) - 1
    for i in range(n):
        A, B = rings_[i], rings_[(i + 1) % len(rings_)]
        for k in range(rseg):
            bm.faces.new((A[k], A[(k + 1) % rseg], B[(k + 1) % rseg], B[k]))
    if not closed:
        bm.faces.new(list(reversed(rings_[0])))
        bm.faces.new(rings_[-1])
    return bm


def helix(R, r, turns, height, pts_per_turn=24, rseg=8):
    pts = []
    N = int(turns * pts_per_turn)
    for i in range(N + 1):
        a = TAU * i / pts_per_turn
        pts.append((R * math.cos(a), R * math.sin(a), -height / 2 + height * i / N))
    return pipe(pts, r, rseg)


def prism(poly, h):
    """Extrude a 2D polygon (list of (x,y), CCW) along Z, centred."""
    bm = bmesh.new()
    bot = [bm.verts.new((x, y, -h / 2)) for x, y in poly]
    top = [bm.verts.new((x, y, h / 2)) for x, y in poly]
    bm.faces.new(top)
    bm.faces.new(list(reversed(bot)))
    n = len(poly)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((bot[i], bot[j], top[j], top[i]))
    return bm


def lathe(profile, seg=48):
    """Revolve a list of (radius, z) points around Z."""
    bm = bmesh.new()
    rows = []
    for i in range(seg):
        a = TAU * i / seg
        rows.append([bm.verts.new((r * math.cos(a), r * math.sin(a), z)) for r, z in profile])
    for i in range(seg):
        A, B = rows[i], rows[(i + 1) % seg]
        for k in range(len(profile) - 1):
            bm.faces.new((A[k], B[k], B[k + 1], A[k + 1]))
    return bm


def screw(length, head_r, shank_r, head_h=None, seg=16):
    bm = bmesh.new()
    hh = head_h or head_r * 0.55
    bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=head_r, radius2=head_r * 0.92, depth=hh,
                          matrix=Matrix.Translation((0, 0, length / 2 + hh / 2)))
    bmesh.ops.create_cone(bm, cap_ends=True, segments=max(8, seg // 2), radius1=shank_r * 0.8, radius2=shank_r, depth=length)
    return bm


# ---------------------------------------------------------------- parts

PARTS = []


class Part:
    def __init__(self, name, explode=(0, 0, 0), smooth=30, order=None, recalc=True):
        self.recalc = recalc
        self.name = name
        self.bm = bmesh.new()
        self.mats = []
        self.explode = explode
        self.smooth = smooth
        PARTS.append(self)

    def add(self, prim, material, M=None):
        if material not in self.mats:
            self.mats.append(material)
        idx = self.mats.index(material)
        if M is not None:
            bmesh.ops.transform(prim, matrix=M, verts=prim.verts)
        for f in prim.faces:
            f.material_index = idx
        tmp = bpy.data.meshes.new('_tmp')
        prim.to_mesh(tmp)
        prim.free()
        self.bm.from_mesh(tmp)
        bpy.data.meshes.remove(tmp)
        return self

    def build(self, scale=0.001):
        me = bpy.data.meshes.new(self.name)
        bmesh.ops.scale(self.bm, vec=(scale, scale, scale), verts=self.bm.verts)
        if self.recalc:
            bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces)
        self.bm.to_mesh(me)
        self.bm.free()
        for m in self.mats:
            me.materials.append(MATS[m])
        for p in me.polygons:
            p.use_smooth = True
        try:
            me.set_sharp_from_angle(angle=math.radians(self.smooth))
        except Exception:
            pass
        ob = bpy.data.objects.new(self.name, me)
        bpy.context.scene.collection.objects.link(ob)
        ob['explode'] = [v * scale for v in self.explode]
        return ob


def export(path, scale=0.001):
    objs = [p.build(scale) for p in PARTS]
    for o in objs:
        o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_extras=True,
                              export_yup=True, export_apply=True, export_materials='EXPORT', export_normals=True,
                              export_texcoords=False)
    tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in objs)
    print('exported', path, len(objs), 'parts', tris, 'tris')


def quad(center, normal, size, up=(0, 0, 1)):
    """A single square face, for perforations and decals."""
    bm = bmesh.new()
    c, n = Vector(center), Vector(normal).normalized()
    u = n.cross(Vector(up))
    if u.length < 1e-6:
        u = n.cross(Vector((1, 0, 0)))
    u.normalize()
    v = n.cross(u).normalized()
    h = size / 2
    bm.faces.new([bm.verts.new(c + h * (a * u + b * v)) for a, b in ((-1, -1), (1, -1), (1, 1), (-1, 1))])
    return bm


def merge(*bms):
    out = bmesh.new()
    for b in bms:
        tmp = bpy.data.meshes.new('_t')
        b.to_mesh(tmp)
        b.free()
        out.from_mesh(tmp)
        bpy.data.meshes.remove(tmp)
    return out


def superellipse_pts(a, b, n, seg, th0=0.0, th1=360.0, closed=True):
    pts = []
    N = seg if closed else seg + 1
    for k in range(N):
        th = math.radians(th0 + (th1 - th0) * k / seg)
        c, s = math.cos(th), math.sin(th)
        x = a * math.copysign(abs(c) ** (2 / n), c)
        y = b * math.copysign(abs(s) ** (2 / n), s)
        pts.append((x, y, th))
    return pts


def loft(sections, seg=48, th0=0.0, th1=360.0, cap=True):
    """sections: list of (x, half_width, z_bottom, z_top, n). Cross-sections are superellipses in the YZ plane.
    Returns bmesh plus per-face (theta, x) so callers can assign materials."""
    bm = bmesh.new()
    closed = abs(th1 - th0) >= 359.99
    rows = []
    for (x, hw, z0, z1, n) in sections:
        b = (z1 - z0) / 2
        zc = (z1 + z0) / 2
        rows.append([bm.verts.new((x, px, zc + py)) for px, py, th in superellipse_pts(hw, b, n, seg, th0, th1, closed)])
    m = len(rows[0])
    faces = []
    for i in range(len(rows) - 1):
        A, B = rows[i], rows[i + 1]
        for k in range(m if closed else m - 1):
            j = (k + 1) % m
            f = bm.faces.new((A[k], A[j], B[j], B[k]))
            faces.append(f)
    if cap and closed:
        bm.faces.new(list(reversed(rows[0])))
        bm.faces.new(rows[-1])
    return bm


def apply_mods(bm, mods):
    """Run Blender modifiers on a bmesh. mods: list of ('BOOLEAN', cutter_bm) or ('SOLIDIFY', thickness)."""
    me = bpy.data.meshes.new('_m')
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new('_m', me)
    bpy.context.scene.collection.objects.link(ob)
    cutters = []
    for kind, arg in mods:
        if kind == 'BOOLEAN':
            cme = bpy.data.meshes.new('_c')
            arg.to_mesh(cme)
            arg.free()
            co = bpy.data.objects.new('_c', cme)
            bpy.context.scene.collection.objects.link(co)
            co.hide_render = True
            cutters.append(co)
            md = ob.modifiers.new('b', 'BOOLEAN')
            md.operation = 'DIFFERENCE'
            md.solver = 'EXACT'
            md.object = co
        elif kind == 'SOLIDIFY':
            md = ob.modifiers.new('s', 'SOLIDIFY')
            md.thickness = arg
            md.offset = -1
    dg = bpy.context.evaluated_depsgraph_get()
    ev = ob.evaluated_get(dg)
    out = bmesh.new()
    out.from_mesh(ev.to_mesh())
    ev.to_mesh_clear()
    bpy.data.objects.remove(ob)
    bpy.data.meshes.remove(me)
    for c in cutters:
        m2 = c.data
        bpy.data.objects.remove(c)
        bpy.data.meshes.remove(m2)
    return out


# ---------------------------------------------------------------- importing supplied models

def open_source(path):
    if path.endswith('.blend'):
        bpy.ops.wm.open_mainfile(filepath=path)
    else:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=path)
    bpy.context.view_layer.update()


def grab(obj, M=None, ratio=1.0, weld=0.0):
    """Copy an object's evaluated mesh (world space, optionally decimated) into a free bmesh, then apply M."""
    ob = bpy.data.objects[obj] if isinstance(obj, str) else obj
    mods = []
    if weld > 0:
        w = ob.modifiers.new('_w', 'WELD'); w.merge_threshold = weld; mods.append(w)
    if ratio < 1.0:
        d = ob.modifiers.new('_d', 'DECIMATE'); d.ratio = ratio; d.use_collapse_triangulate = True; mods.append(d)
    dg = bpy.context.evaluated_depsgraph_get()
    ev = ob.evaluated_get(dg)
    me = ev.to_mesh()
    bm = bmesh.new()
    bm.from_mesh(me)
    ev.to_mesh_clear()
    for m in mods:
        ob.modifiers.remove(m)
    bmesh.ops.transform(bm, matrix=ob.matrix_world, verts=bm.verts)
    if M is not None:
        bmesh.ops.transform(bm, matrix=M, verts=bm.verts)
    return bm


def tris(bm):
    return sum(len(f.verts) - 2 for f in bm.faces)


def islands(bm):
    """Split a bmesh into connected pieces; returns list of vertex-index sets."""
    bm.verts.ensure_lookup_table()
    seen = set(); out = []
    for v in bm.verts:
        if v.index in seen:
            continue
        stack = [v]; seen.add(v.index); comp = []
        while stack:
            x = stack.pop(); comp.append(x.index)
            for e in x.link_edges:
                y = e.other_vert(x)
                if y.index not in seen:
                    seen.add(y.index); stack.append(y)
        out.append(comp)
    return out


def subset(bm, keep_fn):
    """New bmesh containing only faces for which keep_fn(face) is true."""
    out = bm.copy()
    kill = [f for f in out.faces if not keep_fn(f)]
    bmesh.ops.delete(out, geom=kill, context='FACES')
    loose = [v for v in out.verts if not v.link_faces]
    bmesh.ops.delete(out, geom=loose, context='VERTS')
    return out
