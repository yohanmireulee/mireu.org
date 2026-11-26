# zfight.py name [part filter]: find overlapping coplanar triangles (z-fighting) in the assembled model
import sys; sys.path.insert(0, '/home/claude/dbd/tools')
import numpy as np, glbread
from collections import defaultdict
glbread.TRIS = True
P = glbread.load(f'/home/claude/dbd/build/raw/{sys.argv[1]}.glb')
only = sys.argv[2] if len(sys.argv) > 2 else None
groups = defaultdict(list)
for k, (v, e) in P.items():
    v = v * 1000; F = glbread.FACES[k]
    t = v[F]
    n = np.cross(t[:, 1] - t[:, 0], t[:, 2] - t[:, 0]); a = np.linalg.norm(n, axis=1)
    ok = a > 1.0                       # skip slivers (area < 0.5 mm^2)
    n = n[ok] / a[ok, None]; t = t[ok]
    # canonical direction (sign-free), plane offset
    s = np.sign(n[:, np.argmax(np.abs(n), axis=1)][np.arange(len(n)), np.argmax(np.abs(n), axis=1)])
    n = n * s[:, None]
    d = (t[:, 0] * n).sum(1)
    for i in range(len(t)):
        key = (round(n[i, 0], 2), round(n[i, 1], 2), round(n[i, 2], 2), round(d[i] / 0.1))
        groups[key].append((k, t[i]))
def proj(n, pts):
    a = np.array([1, 0, 0]) if abs(n[0]) < 0.9 else np.array([0, 1, 0])
    u = np.cross(n, a); u /= np.linalg.norm(u); w = np.cross(n, u)
    return np.stack([pts @ u, pts @ w], 1)
def shrink(p, f=0.06):
    c = p.mean(0); return c + (p - c) * (1 - f)
def overlap(A, B):
    for P_, Q in ((A, B), (B, A)):
        for i in range(3):
            e = P_[(i + 1) % 3] - P_[i]; ax = np.array([-e[1], e[0]])
            pa, pb = P_ @ ax, Q @ ax
            if pa.max() <= pb.min() + 1e-6 or pb.max() <= pa.min() + 1e-6: return False
    return True
hits = defaultdict(int)
for key, L in groups.items():
    if len(L) < 2 or len({k for k, _ in L}) < 1: continue
    n = np.array(key[:3], float)
    if not np.isfinite(n).all() or np.linalg.norm(n) < 0.5: continue
    n /= np.linalg.norm(n)
    T = [(k, shrink(proj(n, t))) for k, t in L]
    if len(T) > 400: T = T[:400]
    for i in range(len(T)):
        for j in range(i + 1, len(T)):
            ki, kj = T[i][0], T[j][0]
            if only and only not in ki and only not in kj: continue
            if overlap(T[i][1], T[j][1]):
                hits[(ki, kj, key[:3], key[3] * 0.1)] += 1
for (a, b, n, d), c in sorted(hits.items(), key=lambda x: -x[1])[:40]:
    print(f'{c:5d}  {a} <> {b}   n={n} d={d:.1f}')
print('total pairs', sum(hits.values()))
