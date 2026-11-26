# poke.py name "shell|shell" [tol_mm]: how far each non-shell part sticks out of the shell's convex hull when assembled
import sys; sys.path.insert(0, '/home/claude/dbd/tools')
import numpy as np
from scipy.spatial import ConvexHull
from glbread import load
name, shells = sys.argv[1], sys.argv[2].split('|')
tol = float(sys.argv[3]) if len(sys.argv) > 3 else 0.2
P = {k: v * 1000 for k, (v, e) in load(f'/home/claude/dbd/build/raw/{name}.glb').items()}
isS = lambda k: any(k.startswith(s) or k.startswith(s.replace(' ', '_')) for s in shells)
sv = np.vstack([v for k, v in P.items() if isS(k)])
hull = ConvexHull(sv[::max(1, len(sv)//200000)])
A, b = hull.equations[:, :3], hull.equations[:, 3]
for k, v in sorted(P.items()):
    if isS(k): continue
    d = np.concatenate([(v[i:i+2000] @ A.T + b).max(axis=1) for i in range(0, len(v), 2000)])
    if d.max() > tol:
        p = v[d.argmax()]
        print(f'{k:36s} {(d>tol).sum():6d} out, max {d.max():6.2f} mm at {np.round(p,1)}')
