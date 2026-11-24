// Recompute smooth vertex normals at full precision for the site's .glb models.
//
// The first conversion stored normals as 8-bit values, which shows up as faint stepped bands on
// curved surfaces (the "subdivision lines" on the dog's legs). For every vertex this sums the
// normals of the faces around it, keeping only faces close to the vertex's original (coarse)
// normal so hard edges stay hard, then re-compresses with 16-bit normals.
//
// Usage: node tools/refine_normals.mjs assets/models/*.glb   (run from the repo root, needs
// npm i @gltf-transform/core @gltf-transform/extensions @gltf-transform/functions meshoptimizer)
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dequantize, meshopt } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";

const CREASE = Math.cos((55 * Math.PI) / 180);

await MeshoptDecoder.ready;
await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  "meshopt.decoder": MeshoptDecoder,
  "meshopt.encoder": MeshoptEncoder,
});

function refine(prim) {
  const pos = prim.getAttribute("POSITION");
  const nor = prim.getAttribute("NORMAL");
  const idx = prim.getIndices();
  if (!pos || !nor || prim.getMode() !== 4) return 0;
  const n = pos.getCount();
  const P = new Float64Array(n * 3), N0 = new Float64Array(n * 3);
  const a = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    pos.getElement(i, a); P.set(a, i * 3);
    nor.getElement(i, a);
    const l = Math.hypot(a[0], a[1], a[2]) || 1;
    N0[i * 3] = a[0] / l; N0[i * 3 + 1] = a[1] / l; N0[i * 3 + 2] = a[2] / l;
  }
  const tri = idx ? Array.from(idx.getArray()) : Array.from({ length: n }, (_, i) => i);
  // weld vertices that share a position (UV seams split them, but shading should not split there)
  const key = (i) => `${P[i * 3].toFixed(6)},${P[i * 3 + 1].toFixed(6)},${P[i * 3 + 2].toFixed(6)}`;
  const group = new Map(), gid = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    const k = key(i);
    if (!group.has(k)) group.set(k, group.size);
    gid[i] = group.get(k);
  }
  const faces = []; // per group: list of face normals (area weighted)
  for (let g = 0; g < group.size; g++) faces.push([]);
  for (let t = 0; t < tri.length; t += 3) {
    const i0 = tri[t], i1 = tri[t + 1], i2 = tri[t + 2];
    const ux = P[i1 * 3] - P[i0 * 3], uy = P[i1 * 3 + 1] - P[i0 * 3 + 1], uz = P[i1 * 3 + 2] - P[i0 * 3 + 2];
    const vx = P[i2 * 3] - P[i0 * 3], vy = P[i2 * 3 + 1] - P[i0 * 3 + 1], vz = P[i2 * 3 + 2] - P[i0 * 3 + 2];
    const fn = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
    if (!fn[0] && !fn[1] && !fn[2]) continue;
    for (const i of [i0, i1, i2]) faces[gid[i]].push(fn);
  }
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const o = [N0[i * 3], N0[i * 3 + 1], N0[i * 3 + 2]];
    let sx = 0, sy = 0, sz = 0;
    for (const f of faces[gid[i]]) {
      const l = Math.hypot(f[0], f[1], f[2]);
      if ((f[0] * o[0] + f[1] * o[1] + f[2] * o[2]) / l < CREASE) continue;
      sx += f[0]; sy += f[1]; sz += f[2];
    }
    const l = Math.hypot(sx, sy, sz);
    if (l > 0) { out[i * 3] = sx / l; out[i * 3 + 1] = sy / l; out[i * 3 + 2] = sz / l; }
    else out.set(o, i * 3);
  }
  nor.setArray(out).setNormalized(false);
  return n;
}

for (const file of process.argv.slice(2)) {
  const doc = await io.read(file);
  await doc.transform(dequantize());
  let verts = 0;
  for (const mesh of doc.getRoot().listMeshes()) for (const prim of mesh.listPrimitives()) verts += refine(prim);
  // "medium" keeps every attribute quantized but lets normals use 16 bits instead of 8.
  await doc.transform(meshopt({ encoder: MeshoptEncoder, level: "medium", quantizeNormal: 16 }));
  await io.write(file, doc);
  console.log(`${file}: refined ${verts} vertices`);
}
