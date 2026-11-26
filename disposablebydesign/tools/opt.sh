# opt.sh name...  : optimize raw/NAME.glb -> opt/NAME.glb with fine normal quantization, copy to dist
set -e
G=/home/claude/site/node_modules/.bin/gltf-transform
for n in "$@"; do
  $G optimize build/raw/$n.glb /tmp/_o_$n.glb --compress false --join false --instance false --flatten false --palette false --simplify false --weld false >/dev/null
  $G meshopt /tmp/_o_$n.glb build/opt/$n.glb --quantize-normal 12 --quantize-position 16 >/dev/null
  ls -la build/opt/$n.glb | awk '{print $5, $9}'
  cp build/opt/$n.glb dist/models/
done
