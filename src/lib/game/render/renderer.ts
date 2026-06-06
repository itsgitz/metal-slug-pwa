import * as THREE from 'three';
import type { Entity } from '../types.js';
import type { SceneContext } from './scene.js';
import { createPlayerMesh } from './factories/player-mesh.js';
import { createSoldierMesh, createTurretMesh, createDroneMesh } from './factories/enemy-meshes.js';
import { createBossMesh } from './factories/boss-mesh.js';
import { createFXPool, createBulletMeshPool } from './factories/fx-mesh.js';

interface MeshEntry {
  mesh: THREE.Object3D;
  prevX: number;
  prevY: number;
}

export interface Renderer {
  syncEntities(entities: Entity[]): void;
  renderFrame(entities: Entity[], alpha: number, cameraX: number): void;
  triggerFX(x: number, y: number): void;
  dispose(): void;
}

export function createRenderer(ctx: SceneContext): Renderer {
  const { scene, renderer, camera } = ctx;
  const meshMap = new Map<number, MeshEntry>();
  const fxPool = createFXPool(scene, 30);
  const bulletPool = createBulletMeshPool(scene, 30);

  function meshForEntity(entity: Entity): THREE.Object3D | null {
    switch (entity.type) {
      case 'player': return createPlayerMesh();
      case 'enemy-soldier': return createSoldierMesh();
      case 'enemy-turret': return createTurretMesh();
      case 'enemy-drone': return createDroneMesh();
      case 'boss': return createBossMesh(1);
      case 'bullet-player':
      case 'bullet-enemy': return bulletPool.acquire();
      case 'terrain': return null; // terrain meshes added to scene separately
      default: return null;
    }
  }

  return {
    syncEntities(entities: Entity[]): void {
      const liveIds = new Set(entities.filter(e => e.alive).map(e => e.id));

      // spawn meshes for new entities
      for (const ent of entities) {
        if (!ent.alive || meshMap.has(ent.id)) continue;
        const mesh = meshForEntity(ent);
        if (!mesh) continue;
        scene.add(mesh);
        meshMap.set(ent.id, { mesh, prevX: ent.x, prevY: ent.y });
      }

      // remove meshes for dead entities
      for (const [id, entry] of meshMap) {
        if (!liveIds.has(id)) {
          scene.remove(entry.mesh);
          if (entry.mesh instanceof THREE.Mesh) {
            entry.mesh.geometry.dispose();
          }
          meshMap.delete(id);
        }
      }
    },

    renderFrame(entities: Entity[], alpha: number, cameraX: number): void {
      // update mesh positions with interpolation
      for (const ent of entities) {
        if (!ent.alive) continue;
        const entry = meshMap.get(ent.id);
        if (!entry) continue;
        const ix = entry.prevX + (ent.x - entry.prevX) * alpha;
        const iy = entry.prevY + (ent.y - entry.prevY) * alpha;
        entry.mesh.position.x = ix;
        entry.mesh.position.y = iy;
        entry.prevX = ent.x;
        entry.prevY = ent.y;
      }

      // update FX
      fxPool.update(16);

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
