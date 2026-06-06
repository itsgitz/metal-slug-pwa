import * as THREE from 'three';

interface FXShard {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

const SHARDS_PER_EXPLODE = 8;

export function createFXPool(scene: THREE.Scene, size = 40): {
  explode(x: number, y: number): void;
  update(dt: number): void;
  dispose(): void;
} {
  const shards: FXShard[] = [];

  const orangeMat = new THREE.MeshLambertMaterial({
    color: 0xff6600,
    emissive: 0xff3300,
    emissiveIntensity: 0.9,
    transparent: true,
    opacity: 1,
    depthWrite: false,
  });
  const smokeMat = new THREE.MeshLambertMaterial({
    color: 0x888888,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
  });

  for (let i = 0; i < size; i++) {
    const isSmoke = i >= size / 2;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(isSmoke ? 0.3 : 0.18, isSmoke ? 0.3 : 0.18, 0.1),
      isSmoke ? smokeMat.clone() as THREE.MeshLambertMaterial : orangeMat.clone() as THREE.MeshLambertMaterial,
    );
    mesh.visible = false;
    mesh.position.z = 20;
    scene.add(mesh);
    shards.push({ mesh, vx: 0, vy: 0, life: 0, maxLife: 400 });
  }

  // flash quad (single bright flash at explosion center)
  const flashMat = new THREE.MeshBasicMaterial({ color: 0xffee88, transparent: true, opacity: 1, depthWrite: false });
  const flash = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), flashMat);
  flash.visible = false;
  flash.position.z = 21;
  scene.add(flash);
  let flashLife = 0;

  return {
    explode(x: number, y: number): void {
      // brief flash
      flash.position.set(x, y, 21);
      flash.visible = true;
      flashLife = 80;

      // spawn SHARDS_PER_EXPLODE orange shards + a few smoke shards
      let spawned = 0;
      for (const s of shards) {
        if (s.life > 0) continue;
        if (spawned >= SHARDS_PER_EXPLODE) break;
        const isSmoke = spawned >= SHARDS_PER_EXPLODE / 2;
        const angle = (spawned / SHARDS_PER_EXPLODE) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
        const speed = isSmoke ? 1.5 + Math.random() * 2 : 3 + Math.random() * 5;
        s.vx = Math.cos(angle) * speed;
        s.vy = Math.sin(angle) * speed;
        s.life = isSmoke ? 600 : 350;
        s.maxLife = s.life;
        s.mesh.position.set(x, y, 20);
        s.mesh.visible = true;
        spawned++;
      }
    },

    update(dt: number): void {
      // flash fade
      if (flashLife > 0) {
        flashLife -= dt;
        (flash.material as THREE.MeshBasicMaterial).opacity = Math.max(0, flashLife / 80);
        if (flashLife <= 0) flash.visible = false;
      }

      for (const s of shards) {
        if (s.life <= 0) continue;
        s.life -= dt;
        s.vy -= 4 * (dt / 1000); // slight gravity on shards
        s.mesh.position.x += s.vx * (dt / 1000);
        s.mesh.position.y += s.vy * (dt / 1000);
        const t = Math.max(0, s.life / s.maxLife);
        (s.mesh.material as THREE.MeshLambertMaterial).opacity = t;
        if (s.life <= 0) s.mesh.visible = false;
      }
    },

    dispose(): void {
      scene.remove(flash);
      (flash.material as THREE.MeshBasicMaterial).dispose();
      flash.geometry.dispose();
      for (const s of shards) {
        scene.remove(s.mesh);
        s.mesh.geometry.dispose();
        (s.mesh.material as THREE.MeshLambertMaterial).dispose();
      }
    },
  };
}

export function createBulletMeshPool(scene: THREE.Scene, size = 40): {
  acquire(): THREE.Mesh;
  release(mesh: THREE.Mesh): void;
  dispose(): void;
} {
  const mat = new THREE.MeshLambertMaterial({ color: 0xffee00, emissive: 0xffaa00, emissiveIntensity: 0.5 });
  const pool: THREE.Mesh[] = [];

  for (let i = 0; i < size; i++) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.12, 0.12), mat);
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
      mesh.rotation.z = 0;
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
