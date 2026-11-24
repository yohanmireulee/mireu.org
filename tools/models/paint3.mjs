import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dequantize, meshopt, prune } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import fs from "fs";
await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });
const f = "/home/claude/mireu.org/assets/models/museum.glb", doc = await io.read(f);
await doc.transform(dequantize());
const ref = doc.getRoot().listMaterials().find(m => m.getName() === "shin-bijutsukai-0147.jpeg");
const buf = doc.getRoot().listBuffers()[0];
let k = 0;
for (const n of doc.getRoot().listNodes()) {
  const m = n.getMesh(); if (!m) continue;
  const p = m.listPrimitives()[0];
  if (p.getMaterial()?.getName() !== "SIMPLE__shin-bijutsukai-0150.jpeg") continue;
  const id = n.getName().match(/shin-bijutsukai-\d+/)[0];
  const img = fs.readFileSync(`/tmp/paint/${id}.webp`);
  const tex = doc.createTexture(id).setImage(img).setMimeType("image/webp").setURI(id + ".webp");
  const mat = ref.clone().setName(id + ".jpeg").setBaseColorTexture(tex).setAlphaMode("OPAQUE");
  const P = p.getAttribute("POSITION"), a = [0,0,0], n4 = P.getCount();
  let mnx=1e9,mxx=-1e9,mnz=1e9,mxz=-1e9;
  for (let i=0;i<n4;i++){P.getElement(i,a);mnx=Math.min(mnx,a[0]);mxx=Math.max(mxx,a[0]);mnz=Math.min(mnz,a[2]);mxz=Math.max(mxz,a[2]);}
  const uv = new Float32Array(n4*2);
  for (let i=0;i<n4;i++){P.getElement(i,a);uv[i*2]=(a[0]-mnx)/(mxx-mnx);uv[i*2+1]=(a[2]-mnz)/(mxz-mnz);}
  p.setAttribute("TEXCOORD_0", doc.createAccessor().setType("VEC2").setArray(uv).setBuffer(buf));
  p.setMaterial(mat); k++;
}
console.log("fixed", k);
await doc.transform(prune(), meshopt({ encoder: MeshoptEncoder, level: "medium", quantizeNormal: 16 }));
await io.write(f, doc);
