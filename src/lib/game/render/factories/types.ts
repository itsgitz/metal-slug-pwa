import type * as THREE from 'three';

export interface AnimatedParts {
  [name: string]: THREE.Object3D;
}

export interface AnimState {
  vx: number;
  vy: number;
  grounded: boolean;
  facingRight: boolean;
  muzzleFlash: number;
  phase?: number;
  invincible?: boolean;
  tMs: number;
  aimAngle?: number;
  telegraph?: boolean;
  alert?: boolean;
}

export interface AnimLocal {
  walkT: number;
  [key: string]: number;
}

export type AnimateFn = (
  root: THREE.Object3D,
  parts: AnimatedParts,
  state: AnimState,
  dt: number,
  local: AnimLocal,
) => void;
