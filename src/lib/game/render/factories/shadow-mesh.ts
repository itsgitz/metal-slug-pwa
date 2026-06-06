import * as THREE from 'three';

// Pooled blob shadows — dark transparent ellipses under characters.
// Cheaper and more arcade-correct than shadow mapping for an ortho scene.

export interface ShadowPool {
  acquire(id: number, scale?: number): void;
  release(id: number): void;
  /** Position shadow for entity id; heightAboveGround shrinks + fades it. */
  place(id: number, x: number, groundY: number, heightAboveGround: number): void;
  dispose(): void;
}

const SHADOW_Z = 10.6; // just in front of terrain (z=10), behind actors (z=15)

export function createShadowPool(scene: THREE.Scene, size = 16): ShadowPool {
  const geo = new THREE.CircleGeometry(0.55, 16);
  const free: THREE.Mesh[] = [];
  const used = new Map<number, { mesh: THREE.Mesh; baseScale: number }>();

  for (let i = 0; i < size; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.scale.set(1, 0.32, 1); // squash circle into ground ellipse
    mesh.visible = false;
    mesh.position.z = SHADOW_Z;
    scene.add(mesh);
    free.push(mesh);
  }

  return {
    acquire(id: number, scale = 1): void {
      if (used.has(id)) return;
      const mesh = free.pop();
      if (!mesh) return; // pool exhausted — skip gracefully
      mesh.visible = true;
      used.set(id, { mesh, baseScale: scale });
    },

    release(id: number): void {
      const entry = used.get(id);
      if (!entry) return;
      entry.mesh.visible = false;
      used.delete(id);
      free.push(entry.mesh);
    },

    place(id: number, x: number, groundY: number, heightAboveGround: number): void {
      const entry = used.get(id);
      if (!entry) return;
      const h = Math.max(0, heightAboveGround);
      // higher = smaller + fainter
      const shrink = Math.max(0.35, 1 - h * 0.08);
      entry.mesh.position.x = x;
      entry.mesh.position.y = groundY + 0.06;
      entry.mesh.scale.set(entry.baseScale * shrink, 0.32 * shrink, 1);
      (entry.mesh.material as THREE.MeshBasicMaterial).opacity = 0.35 * Math.max(0.25, 1 - h * 0.07);
    },

    dispose(): void {
      for (const m of free) { scene.remove(m); (m.material as THREE.MeshBasicMaterial).dispose(); }
      for (const { mesh } of used.values()) { scene.remove(mesh); (mesh.material as THREE.MeshBasicMaterial).dispose(); }
      geo.dispose();
      used.clear();
      free.length = 0;
    },
  };
}
