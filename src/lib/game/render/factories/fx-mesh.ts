import * as THREE from 'three';

interface FXShard {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

export function createFXPool(scene: THREE.Scene, size = 30): {
  explode(x: number, y: number): void;
  update(dt: number): void;
  dispose(): void;
} {
  const shards: FXShard[] = [];
  const mat = new THREE.MeshLambertMaterial({ color: 0xff6600, emissive: 0xff3300, emissiveIntensity: 0.8 });

  for (let i = 0; i < size; i++) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), mat);
    mesh.visible = false;
    mesh.position.z = 20;
    scene.add(mesh);
    shards.push({ mesh, vx: 0, vy: 0, life: 0, maxLife: 300 });
  }

  return {
    explode(x: number, y: number): void {
      for (const s of shards) {
        if (s.life > 0) continue;
        const angle = Math.random() * Math.PI * 2;
        const speed = 3 + Math.random() * 5;
        s.vx = Math.cos(angle) * speed;
        s.vy = Math.sin(angle) * speed;
        s.life = 300;
        s.maxLife = 300;
        s.mesh.position.set(x, y, 20);
        s.mesh.visible = true;
        break;
      }
    },

    update(dt: number): void {
      for (const s of shards) {
        if (s.life <= 0) continue;
        s.life -= dt;
        s.mesh.position.x += s.vx * (dt / 1000);
        s.mesh.position.y += s.vy * (dt / 1000);
        const opacity = s.life / s.maxLife;
        (s.mesh.material as THREE.MeshLambertMaterial).opacity = opacity;
        if (s.life <= 0) s.mesh.visible = false;
      }
    },

    dispose(): void {
      for (const s of shards) {
        scene.remove(s.mesh);
        s.mesh.geometry.dispose();
      }
      mat.dispose();
    },
  };
}

export function createBulletMeshPool(scene: THREE.Scene, size = 30): {
  acquire(): THREE.Mesh;
  release(mesh: THREE.Mesh): void;
  dispose(): void;
} {
  const mat = new THREE.MeshLambertMaterial({ color: 0xffff00 });
  const pool: THREE.Mesh[] = [];

  for (let i = 0; i < size; i++) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 0.15), mat);
    mesh.visible = false;
    mesh.position.z = 15;
    scene.add(mesh);
    pool.push(mesh);
  }

  return {
    acquire(): THREE.Mesh {
      const mesh = pool.find(m => !m.visible) ?? pool[0];
      mesh.visible = true;
      return mesh;
    },

    release(mesh: THREE.Mesh): void {
      mesh.visible = false;
    },

    dispose(): void {
      for (const m of pool) {
        scene.remove(m);
        m.geometry.dispose();
      }
      mat.dispose();
    },
  };
}
