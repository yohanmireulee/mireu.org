import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dequantize, meshopt, prune } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });
const file = "/home/claude/mireu.org/assets/models/museum.glb";
const doc = await io.read(file);
await doc.transform(dequantize());
const jobs = { "Text": "/tmp/text_title.glb", "Text.001": "/tmp/text_sub.glb" };
// where each line should sit on the wooden plaque (world space): centre x, centre y, width
const target = { "Text": [2.657, 1.47, 1.40], "Text.001": [2.657, 1.245, 1.40] };
const nodeOf = (mesh) => doc.getRoot().listNodes().find((n) => n.getMesh() === mesh);
const bounds = (acc) => { const mn=[1e9,1e9,1e9], mx=[-1e9,-1e9,-1e9], a=[0,0,0]; for (let i=0;i<acc.getCount();i++){acc.getElement(i,a);for(let k=0;k<3;k++){mn[k]=Math.min(mn[k],a[k]);mx[k]=Math.max(mx[k],a[k]);}} return [mn,mx]; };
for (const mesh of doc.getRoot().listMeshes()) {
  const src = jobs[mesh.getName()]; if (!src) continue;
  const prim = mesh.listPrimitives()[0];
  const [omn, omx] = bounds(prim.getAttribute("POSITION"));
  const tdoc = await io.read(src);
  const tp = tdoc.getRoot().listMeshes()[0].listPrimitives()[0];
  const P = tp.getAttribute("POSITION"), N = tp.getAttribute("NORMAL"), I = tp.getIndices();
  const [mn, mx] = bounds(P);
  const node = nodeOf(mesh), T = node.getTranslation(), S = node.getScale()[0];
  const [wx, wy, ww] = target[mesh.getName()];
  // node is rotated 90 degrees about X: world = T + S * (x, -z, y)
  const s = ww / S / (mx[0] - mn[0]);
  const sy = (omx[1] - omn[1]) / (mx[1] - mn[1]);
  const c = [0,1,2].map(k => (mn[k] + mx[k]) / 2);
  const oc = [(wx - T[0]) / S, (omn[1] + omx[1]) / 2, -(wy - T[1]) / S];
  const n = P.getCount(), pos = new Float32Array(n*3), nor = new Float32Array(n*3), a=[0,0,0];
  for (let i=0;i<n;i++){ P.getElement(i,a);
    pos[i*3]=(a[0]-c[0])*s+oc[0]; pos[i*3+1]=(a[1]-c[1])*sy+oc[1]; pos[i*3+2]=(a[2]-c[2])*s+oc[2];
    N.getElement(i,a); const x=a[0]/s, y=a[1]/sy, z=a[2]/s, l=Math.hypot(x,y,z)||1; nor[i*3]=x/l; nor[i*3+1]=y/l; nor[i*3+2]=z/l; }
  const buf = doc.getRoot().listBuffers()[0];
  prim.setAttribute("POSITION", doc.createAccessor().setType("VEC3").setArray(pos).setBuffer(buf));
  prim.setAttribute("NORMAL", doc.createAccessor().setType("VEC3").setArray(nor).setBuffer(buf));
  for (const k of prim.listSemantics()) if (!["POSITION","NORMAL"].includes(k)) prim.setAttribute(k, null);
  prim.setIndices(doc.createAccessor().setType("SCALAR").setArray(new Uint32Array(I.getArray())).setBuffer(buf));
  console.log(mesh.getName(), "scale", s.toFixed(4), "verts", n, "height", ((mx[2]-mn[2])*s).toFixed(3));
}
await doc.transform(prune(), meshopt({ encoder: MeshoptEncoder, level: "medium", quantizeNormal: 16 }));
await io.write(file, doc);
