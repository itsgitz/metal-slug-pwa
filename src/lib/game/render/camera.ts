import type * as THREE from 'three';
import type { PlayerEntity } from '../entities/player.js';

export interface CameraController {
  update(player: PlayerEntity, locked: boolean, lockX?: number): void;
  getX(): number;
}

const LOOK_AHEAD = 3;
const SMOOTHING = 0.1;

export function createCameraController(
  camera: THREE.OrthographicCamera,
  stageStart: number,
  stageEnd: number,
): CameraController {
  const halfView = (camera.right - camera.left) / 2;
  let x = stageStart + halfView;

  return {
    update(player: PlayerEntity, locked: boolean, lockX?: number): void {
      if (locked && lockX !== undefined) {
        x += (lockX - x) * SMOOTHING;
      } else {
        const dir = player.facingRight ? 1 : -1;
        const target = Math.max(
          stageStart + halfView,
          Math.min(stageEnd - halfView, player.x + dir * LOOK_AHEAD),
        );
        x += (target - x) * SMOOTHING;
      }

      camera.position.x = x;
    },

    getX(): number {
      return x;
    },
  };
}
