import * as THREE from 'three';
import type { Entity } from '../types.js';
import type { SceneContext } from './scene.js';
import type { AnimatedParts, AnimateFn, AnimLocal } from './factories/types.js';
import { createPlayerMesh } from './factories/player-mesh.js';
import { createSoldierMesh, createTurretMesh, createDroneMesh } from './factories/enemy-meshes.js';
import { createBossMesh } from './factories/boss-mesh.js';
import { createFXPool, createBulletMeshPool } from './factories/fx-mesh.js';
import { createGroundMesh, createPlatformMesh } from './factories/terrain-mesh.js';

const EXPLODABLE = new Set(['enemy-soldier', 'enemy-turret', 'enemy-drone', 'boss']);

interface MeshEntry {
  mesh: THREE.Object3D;
  prevX: number;
  prevY: number;
  entityType: string;
  animate?: AnimateFn;
  parts?: AnimatedParts;
  local: AnimLocal;
}

export interface Renderer {
  syncEntities(entities: Entity[]): void;
  renderFrame(entities: Entity[], alpha: number, cameraX: number, dt?: number): void;
  triggerFX(x: number, y: number): void;
  dispose(): void;
}

export function createRenderer(ctx: SceneContext): Renderer {
  const { scene, renderer, camera, background } = ctx;
  const meshMap = new Map<number, MeshEntry>();
  const fxPool = createFXPool(scene, 48);
  const bulletPool = createBulletMeshPool(scene, 40);

  let tMs = 0;

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
          return createGroundMesh({ x: entity.x, y: entity.y, width: entity.w, height: entity.h });
        }
        return createPlatformMesh({ x: entity.x, y: entity.y, width: entity.w, height: entity.h });
      }
      default: return null;
    }
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
      }

      for (const [id, entry] of meshMap) {
        if (!liveIds.has(id)) {
          // fire FX explosion on enemy/boss death
          if (EXPLODABLE.has(entry.entityType)) {
            fxPool.explode(entry.prevX, entry.prevY);
          }
          scene.remove(entry.mesh);
          if (entry.mesh instanceof THREE.Mesh) {
            entry.mesh.geometry.dispose();
          } else if (entry.entityType === 'bullet-player' || entry.entityType === 'bullet-enemy') {
            bulletPool.release(entry.mesh as THREE.Mesh);
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
          }, dt, entry.local);
        }
      }

      // update FX
      fxPool.update(dt);

      // parallax background
      background.update(cameraX, 0);

      // apply camera
      camera.position.x = cameraX;
      renderer.render(scene, camera);
    },

    triggerFX(x: number, y: number): void {
      fxPool.explode(x, y);
    },

    dispose(): void {
      fxPool.dispose();
      bulletPool.dispose();
      meshMap.clear();
    },
  };
}
