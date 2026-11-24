import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { prune, meshopt } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });
const f = process.argv[2];
const doc = await io.read(f);
for (const m of doc.getRoot().listMaterials()) {
  if (m.getName() !== "BAKED__PROJ1_-_Laptop_Body") continue;
  const bc = m.getBaseColorTexture();
  console.log("old factor", m.getBaseColorFactor(), m.getMetallicFactor(), m.getRoughnessFactor(), bc?.getSize());
  m.setBaseColorTexture(null).setMetallicRoughnessTexture(null).setNormalTexture(null);
  m.setBaseColorFactor([0.62, 0.63, 0.65, 1]).setMetallicFactor(1).setRoughnessFactor(0.36);
}
await doc.transform(prune());
await io.write(f, doc);
