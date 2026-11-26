import json, struct, numpy as np
CT = {5126: np.float32, 5125: np.uint32, 5123: np.uint16, 5121: np.uint8}
NC = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}
def quat_mat(q):
    x, y, z, w = q
    return np.array([[1-2*(y*y+z*z), 2*(x*y-z*w), 2*(x*z+y*w)], [2*(x*y+z*w), 1-2*(x*x+z*z), 2*(y*z-x*w)], [2*(x*z-y*w), 2*(y*z+x*w), 1-2*(x*x+y*y)]])
TRIS = False
FACES = {}
def load(path):
    """returns {node_name: (verts Nx3 in file units, explode extras or None)} for top-level mesh nodes"""
    b = open(path, 'rb').read()
    jl = struct.unpack('<I', b[12:16])[0]
    J = json.loads(b[20:20+jl]); bin_ = b[20+jl+8:]
    def acc(i):
        a = J['accessors'][i]; bv = J['bufferViews'][a['bufferView']]
        off = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
        n = NC[a['type']]; dt = CT[a['componentType']]
        stride = bv.get('byteStride', 0)
        if stride and stride != n * np.dtype(dt).itemsize:
            raw = np.frombuffer(bin_, np.uint8, a['count'] * stride, off).reshape(a['count'], stride)
            return raw[:, :n*np.dtype(dt).itemsize].copy().view(dt).reshape(a['count'], n)
        return np.frombuffer(bin_, dt, a['count'] * n, off).reshape(a['count'], n)
    out = {}
    def walk(ni, M):
        nd = J['nodes'][ni]
        L = np.eye(4)
        if 'matrix' in nd: L = np.array(nd['matrix']).reshape(4, 4).T
        else:
            R = quat_mat(nd.get('rotation', [0, 0, 0, 1])) * np.array(nd.get('scale', [1, 1, 1]))
            L[:3, :3] = R; L[:3, 3] = nd.get('translation', [0, 0, 0])
        W = M @ L
        if 'mesh' in nd:
            vs = []; fs = []; n0 = 0
            for pr in J['meshes'][nd['mesh']]['primitives']:
                v = acc(pr['attributes']['POSITION']).astype(np.float64)
                vs.append(v @ W[:3, :3].T + W[:3, 3])
                if TRIS and 'indices' in pr:
                    fs.append(acc(pr['indices']).reshape(-1, 3).astype(np.int64) + n0)
                n0 += len(v)
            key = nd.get('name', str(ni))
            out[key] = (np.vstack(vs), (nd.get('extras') or {}).get('explode'))
            if TRIS: FACES[key] = np.vstack(fs) if fs else np.zeros((0, 3), int)
        for c in nd.get('children', []): walk(c, W)
    for r in J['scenes'][0]['nodes']: walk(r, np.eye(4))
    return out
