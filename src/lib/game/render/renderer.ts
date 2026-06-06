import * as THREE from 'three';
import type { Entity } from '../types.js';
import type { StageTheme } from '../stages/types.js';
import type { SceneContext } from './scene.js';
import type { AnimatedParts, AnimateFn, AnimLocal } from './factories/types.js';
import { createPlayerMesh } from './factories/player-mesh.js';
import { createSoldierMesh, createTurretMesh, createDroneMesh } from './factories/enemy-meshes.js';
import { createBossMesh } from './factories/boss-mesh.js';
import { createFXPool, createBulletMeshPool } from './factories/fx-mesh.js';
import type { FXKind } from './factories/fx-mesh.js';
import { createGroundMesh, createPlatformMesh } from './factories/terrain-mesh.js';
import { createShadowPool } from './factories/shadow-mesh.js';

const EXPLODABLE = new Set(['enemy-soldier', 'enemy-turret', 'enemy-drone', 'boss']);
const SHADOWED = new Set(['player', 'enemy-soldier', 'enemy-turret', 'enemy-drone', 'boss']);
const GROUND_TOP_Y = 1; // stage ground segments are y:0 h:1

const DEATH_ANIM_MS = 180;

interface MeshEntry {
  mesh: THREE.Object3D;
  prevX: number;
  prevY: number;
  entityType: string;
  animate?: AnimateFn;
  parts?: AnimatedParts;
  local: AnimLocal;
}

interface DyingEntry {
  mesh: THREE.Object3D;
  life: number;
  vy: number;
  kind: FXKind;
  x: number;
  y: number;
}

function fxKindFor(entityType: string): FXKind {
  if (entityType === 'boss') return 'boss';
  if (entityType.startsWith('enemy-')) return entityType.replace('enemy-', '') as FXKind;
  return 'default';
}

// recursively free geometries, materials, and material textures of a removed object
function deepDispose(obj: THREE.Object3D): void {
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      for (const m of mats) {
        const mat = m as THREE.MeshLambertMaterial;
        mat.map?.dispose();
        mat.dispose();
      }
    }
  });
}

export interface Renderer {
  syncEntities(entities: Entity[]): void;
  renderFrame(entities: Entity[], alpha: number, cameraX: number, dt?: number): void;
  triggerFX(x: number, y: number, kind?: FXKind): void;
  triggerMuzzleSmoke(x: number, y: number): void;
  shake(intensity: number, durationMs: number): void;
  setStageTheme(theme: StageTheme): void;
  dispose(): void;
}

export function createRenderer(ctx: SceneContext): Renderer {
  const { scene, renderer, camera, background } = ctx;
  const meshMap = new Map<number, MeshEntry>();
  const fxPool = createFXPool(scene, 64);
  const bulletPool = createBulletMeshPool(scene, 40);
  const shadowPool = createShadowPool(scene, 16);
  const dying: DyingEntry[] = [];

  let tMs = 0;
  let shakeIntensity = 0;
  let shakeDuration = 0;
  let stageTheme: StageTheme = 'jungle';
  const CAMERA_BASE_Y = 10; // FRUSTUM_HEIGHT / 2

  function meshForEntity(entity: Entity): THREE.Object3D | null {
    switch (entity.type) {
      case 'player': return createPlayerMesh();
      case 'enemy-soldier': return createSoldierMesh();
      case 'enemy-turret': return createTurretMesh();
      case 'enemy-drone': return createDroneMesh();
      case 'boss': return createBossMesh(entity.phase ?? 1);
      case 'bullet-player':
      case 'bullet-enemy': return bulletPool.acquire();
      case 'terrain': {
        if (entity.terrainKind === 'ground') {
          return createGroundMesh({ x: entity.x, y: entity.y, width: entity.w, height: entity.h }, stageTheme);
        }
        return createPlatformMesh({ x: entity.x, y: entity.y, width: entity.w, height: entity.h }, stageTheme);
      }
      default: return null;
    }
  }

  function shadowScaleFor(entityType: string): number {
    if (entityType === 'boss') return 3.2;
    if (entityType === 'enemy-drone') return 1.1;
    return 1;
  }

  return {
    syncEntities(entities: Entity[]): void {
      const liveIds = new Set(entities.filter(e => e.alive).map(e => e.id));

      for (const ent of entities) {
        if (!ent.alive || meshMap.has(ent.id)) continue;
        const mesh = meshForEntity(ent);
        if (!mesh) continue;
        scene.add(mesh);
        const animate = mesh.userData.animate as AnimateFn | undefined;
        const parts = mesh.userData.parts as AnimatedParts | undefined;
        meshMap.set(ent.id, {
          mesh,
          prevX: ent.x,
          prevY: ent.y,
          entityType: ent.type,
          animate,
          parts,
          local: { walkT: 0 },
        });
        if (SHADOWED.has(ent.type)) shadowPool.acquire(ent.id, shadowScaleFor(ent.type));
      }

      for (const [id, entry] of meshMap) {
        if (!liveIds.has(id)) {
          shadowPool.release(id);
          if (EXPLODABLE.has(entry.entityType)) {
            // brief death animation — mesh flashes/falls, then shard burst
            dying.push({
              mesh: entry.mesh,
              life: DEATH_ANIM_MS,
              vy: 3,
              kind: fxKindFor(entry.entityType),
              x: entry.prevX,
              y: entry.prevY,
            });
            meshMap.delete(id);
            continue;
          }
          scene.remove(entry.mesh);
          if (entry.entityType === 'bullet-player' || entry.entityType === 'bullet-enemy') {
            bulletPool.release(entry.mesh as THREE.Mesh);
          } else {
            deepDispose(entry.mesh); // terrain (incl. cloned texture), player, gate meshes
          }
          meshMap.delete(id);
        }
      }
    },

    renderFrame(entities: Entity[], alpha: number, cameraX: number, dt = 16): void {
      tMs += dt;

      for (const ent of entities) {
        if (!ent.alive) continue;
        if (ent.type === 'terrain' || ent.type === 'end-gate') continue;
        const entry = meshMap.get(ent.id);
        if (!entry) continue;

        const ix = entry.prevX + (ent.x - entry.prevX) * alpha;
        const iy = entry.prevY + (ent.y - entry.prevY) * alpha;
        entry.mesh.position.x = ix;
        entry.mesh.position.y = iy;
        entry.prevX = ent.x;
        entry.prevY = ent.y;

        // blob shadow follows entity
        if (SHADOWED.has(ent.type)) {
          shadowPool.place(ent.id, ix + ent.w / 2, GROUND_TOP_Y, ent.y - GROUND_TOP_Y);
        }

        // bullet rotation to travel direction
        if ((ent.type === 'bullet-player' || ent.type === 'bullet-enemy') && (ent.vx !== 0 || ent.vy !== 0)) {
          entry.mesh.rotation.z = Math.atan2(ent.vy, ent.vx);
        }

        // per-entity animation
        if (entry.animate && entry.parts) {
          entry.local.tMs = tMs;
          entry.animate(entry.mesh, entry.parts, {
            vx: ent.vx,
            vy: ent.vy,
            grounded: ent.onGround ?? true,
            facingRight: ent.facingRight ?? true,
            muzzleFlash: ent.muzzleFlash ?? 0,
            phase: ent.phase,
            invincible: ent.invincible,
            tMs,
            aimAngle: ent.aimAngle,
            telegraph: ent.telegraph,
            alert: ent.alert,
          }, dt, entry.local);
        }
      }

      // advance death animations
      for (let i = dying.length - 1; i >= 0; i--) {
        const d = dying[i];
        d.life -= dt;
        d.vy -= 14 * (dt / 1000);
        d.mesh.position.y += d.vy * (dt / 1000);
        d.mesh.rotation.z += 0.012 * dt;
        if (d.life <= 0) {
          scene.remove(d.mesh);
          deepDispose(d.mesh);
          fxPool.explode(d.x, d.y, d.kind);
          dying.splice(i, 1);
        }
      }

      // update FX
      fxPool.update(dt);

      // parallax background (with cloud drift)
      background.update(cameraX, 0, dt);

      // apply camera with optional shake offset
      if (shakeDuration > 0) {
        shakeDuration -= dt;
        const t = Math.max(0, shakeDuration / shakeIntensity);
        camera.position.x = cameraX + (Math.random() - 0.5) * shakeIntensity * t;
        camera.position.y = CAMERA_BASE_Y + (Math.random() - 0.5) * shakeIntensity * 0.5 * t;
      } else {
        camera.position.x = cameraX;
        camera.position.y = CAMERA_BASE_Y;
      }
      renderer.render(scene, camera);
    },

    triggerFX(x: number, y: number, kind: FXKind = 'default'): void {
      fxPool.explode(x, y, kind);
    },

    triggerMuzzleSmoke(x: number, y: number): void {
      fxPool.puff(x, y);
    },

    shake(intensity: number, durationMs: number): void {
      shakeIntensity = intensity;
      shakeDuration = durationMs;
    },

    setStageTheme(theme: StageTheme): void {
      stageTheme = theme;
      background.setTheme(theme);
    },

    dispose(): void {
      for (const d of dying) {
        scene.remove(d.mesh);
        deepDispose(d.mesh);
      }
      dying.length = 0;
      fxPool.dispose();
      bulletPool.dispose();
      shadowPool.dispose();
      meshMap.clear();
    },
  };
}
