import * as THREE from 'three';
import { createStage } from './stage.js';
const q = new URLSearchParams(location.search);
const c = document.getElementById('c');
const st = createStage(c, { preserve: true });
(async () => {
  await st.show(q.get('m'), { pitch: +(q.get('p') || 0.45), spin: 0, ex: +(q.get('ex') || 0), yaw: 0 });
  st.explode = 1; st.jump(); st.state.reduce = true; st.zoom = +(q.get('z') || 1);
  await new Promise((r) => setTimeout(r, 400));
  const frames = [];
  for (let i = 0; i < 36; i++) {
    st.state.yaw = -i / 36 * Math.PI * 2 + 0.6;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    frames.push(c.toDataURL('image/png'));
  }
  window.__frames = frames;
})();
