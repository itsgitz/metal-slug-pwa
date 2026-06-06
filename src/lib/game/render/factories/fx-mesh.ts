import * as THREE from 'three';

interface FXShard {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  isSmoke: boolean;
}

export type FXKind = 'soldier' | 'turret' | 'drone' | 'boss' | 'grenade' | 'default';

interface FXPreset {
  shards: number;       // fire shards per burst
  smoke: number;        // smoke shards per burst
  color: number;
  emissive: number;
  speedMin: number;
  speedMax: number;
  life: number;
  flashSize: number;
  bursts: number;       // staggered burst count (boss = multi-burst)
  burstGapMs: number;
}

const PRESETS: Record<FXKind, FXPreset> = {
  default: { shards: 4, smoke: 4, color: 0xff6600, emissive: 0xff3300, speedMin: 3, speedMax: 8, life: 350, flashSize: 1.5, bursts: 1, burstGapMs: 0 },
  soldier: { shards: 4, smoke: 3, color: 0xff6600, emissive: 0xff3300, speedMin: 3, speedMax: 7, life: 320, flashSize: 1.2, bursts: 1, burstGapMs: 0 },
  turret:  { shards: 6, smoke: 4, color: 0xffaa33, emissive: 0xff5500, speedMin: 3, speedMax: 8, life: 380, flashSize: 1.6, bursts: 1, burstGapMs: 0 },
  drone:   { shards: 6, smoke: 2, color: 0x44ddff, emissive: 0x22aaff, speedMin: 5, speedMax: 10, life: 250, flashSize: 1.3, bursts: 1, burstGapMs: 0 },
  boss:    { shards: 8, smoke: 6, color: 0xffcc44, emissive: 0xff6600, speedMin: 4, speedMax: 11, life: 450, flashSize: 3.2, bursts: 4, burstGapMs: 130 },
  grenade: { shards: 5, smoke: 6, color: 0xff8822, emissive: 0xff4400, speedMin: 3, speedMax: 9, life: 400, flashSize: 1.8, bursts: 1, burstGapMs: 0 },
};

interface PendingBurst {
  x: number;
  y: number;
  kind: FXKind;
  delay: number;
}

export function createFXPool(scene: THREE.Scene, size = 64): {
  explode(x: number, y: number, kind?: FXKind): void;
  puff(x: number, y: number): void;
  update(dt: number): void;
  dispose(): void;
} {
  const shards: FXShard[] = [];
  const pendingBursts: PendingBurst[] = [];

  const fireMat = new THREE.MeshLambertMaterial({
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
      isSmoke ? smokeMat.clone() as THREE.MeshLambertMaterial : fireMat.clone() as THREE.MeshLambertMaterial,
    );
    mesh.visible = false;
    mesh.position.z = 20;
    scene.add(mesh);
    shards.push({ mesh, vx: 0, vy: 0, life: 0, maxLife: 400, isSmoke });
  }

  // flash quad (single bright flash at explosion center)
  const flashMat = new THREE.MeshBasicMaterial({ color: 0xffee88, transparent: true, opacity: 1, depthWrite: false });
  const flash = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), flashMat);
  flash.visible = false;
  flash.position.z = 21;
  scene.add(flash);
  let flashLife = 0;

  function spawnBurst(x: number, y: number, preset: FXPreset): void {
    // flash
    flash.position.set(x, y, 21);
    flash.scale.set(preset.flashSize, preset.flashSize, 1);
    flash.visible = true;
    flashLife = 80;

    let fireSpawned = 0;
    let smokeSpawned = 0;
    const total = preset.shards + preset.smoke;
    let n = 0;
    for (const s of shards) {
      if (s.life > 0) continue;
      const wantFire = fireSpawned < preset.shards;
      const wantSmoke = smokeSpawned < preset.smoke;
      if (s.isSmoke && !wantSmoke) continue;
      if (!s.isSmoke && !wantFire) continue;
      if (!wantFire && !wantSmoke) break;

      const angle = (n / total) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
      const speed = s.isSmoke
        ? 1.5 + Math.random() * 2
        : preset.speedMin + Math.random() * (preset.speedMax - preset.speedMin);
      s.vx = Math.cos(angle) * speed;
      s.vy = Math.sin(angle) * speed;
      s.life = s.isSmoke ? 600 : preset.life;
      s.maxLife = s.life;
      s.mesh.position.set(x, y, 20);
      s.mesh.visible = true;
      if (!s.isSmoke) {
        const mat = s.mesh.material as THREE.MeshLambertMaterial;
        mat.color.setHex(preset.color);
        mat.emissive.setHex(preset.emissive);
      }
      if (s.isSmoke) smokeSpawned++; else fireSpawned++;
      n++;
    }
  }

  return {
    explode(x: number, y: number, kind: FXKind = 'default'): void {
      const preset = PRESETS[kind] ?? PRESETS.default;
      spawnBurst(x, y, preset);
      // queue extra staggered bursts (boss multi-burst)
      for (let b = 1; b < preset.bursts; b++) {
        pendingBursts.push({
          x: x + (Math.random() - 0.5) * 2.5,
          y: y + (Math.random() - 0.5) * 1.5,
          kind,
          delay: b * preset.burstGapMs,
        });
      }
    },

    // small muzzle smoke puff — reuses smoke shards
    puff(x: number, y: number): void {
      let spawned = 0;
      for (const s of shards) {
        if (!s.isSmoke || s.life > 0) continue;
        if (spawned >= 2) break;
        s.vx = (Math.random() - 0.5) * 1.2;
        s.vy = 1 + Math.random() * 1.2;
        s.life = 220;
        s.maxLife = 220;
        s.mesh.position.set(x, y, 20);
        s.mesh.visible = true;
        spawned++;
      }
    },

    update(dt: number): void {
      // drain queued bursts
      for (let i = pendingBursts.length - 1; i >= 0; i--) {
        pendingBursts[i].delay -= dt;
        if (pendingBursts[i].delay <= 0) {
          const b = pendingBursts[i];
          pendingBursts.splice(i, 1);
          spawnBurst(b.x, b.y, PRESETS[b.kind] ?? PRESETS.default);
        }
      }

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
      fireMat.dispose();
      smokeMat.dispose();
    },
  };
}

export function createBulletMeshPool(scene: THREE.Scene, size = 40): {
  acquire(): THREE.Mesh;
  release(mesh: THREE.Mesh): void;
  dispose(): void;
} {
  const mat = new THREE.MeshLambertMaterial({ color: 0xffee00, emissive: 0xffaa00, emissiveIntensity: 0.5 });
  // shared tracer trail material — faint stretched quad parented behind each bullet
  const trailMat = new THREE.MeshBasicMaterial({ color: 0xffcc44, transparent: true, opacity: 0.3, depthWrite: false });
  const trailGeo = new THREE.PlaneGeometry(1.1, 0.07);
  const pool: THREE.Mesh[] = [];

  for (let i = 0; i < size; i++) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.12, 0.12), mat);
    const trail = new THREE.Mesh(trailGeo, trailMat);
    trail.position.x = -0.75; // behind bullet nose; inherits bullet rotation
    mesh.add(trail);
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
      trailGeo.dispose();
      trailMat.dispose();
      mat.dispose();
    },
  };
}
