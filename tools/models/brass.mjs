import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });
const f = "/home/claude/mireu.org/assets/models/museum.glb", doc = await io.read(f);
for (const m of doc.getRoot().listMaterials()) if (m.getName() === "SIMPLE__Weatherd Polished Brass") m.setBaseColorFactor([0.5, 0.36, 0.22, 1]).setMetallicFactor(0.85).setRoughnessFactor(0.42);
await io.write(f, doc);
