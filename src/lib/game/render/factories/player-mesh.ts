import * as THREE from 'three';
import type { AnimatedParts, AnimState, AnimLocal, AnimateFn } from './types.js';

const SKIN = 0xd4a96a;
const UNIFORM = 0x3a6b3e;
const BOOT = 0x2a1a0e;
const GUN_COL = 0x222222;
const HELMET = 0x2a4a2a;
const FLASH_COL = 0xffff88;

const BASE_BODY_Y = 0.75;
const SWING_AMP = 0.5;
const WALK_RATE = 0.009;
const BOB_AMP = 0.04;

function animatePlayer(
  root: THREE.Object3D,
  parts: AnimatedParts,
  state: AnimState,
  dt: number,
  local: AnimLocal,
): void {
  // facing flip
  root.scale.x = state.facingRight ? 1 : -1;

  // invincibility blink (every 100ms)
  if (state.invincible) {
    root.visible = Math.floor(state.tMs / 100) % 2 === 0;
  } else {
    root.visible = true;
  }

  const moving = Math.abs(state.vx) > 0.5 && state.grounded;

  if (!state.grounded) {
    // jump tuck
    local.walkT = 0;
    parts.hipL.rotation.z = 0.5;
    parts.hipR.rotation.z = -0.5;
    (parts.body as THREE.Mesh).position.y = BASE_BODY_Y;
  } else {
    // walk cycle
    if (moving) local.walkT += dt * WALK_RATE;
    const swing = moving ? Math.sin(local.walkT) * SWING_AMP : 0;
    parts.hipL.rotation.z = swing;
    parts.hipR.rotation.z = -swing;
    (parts.body as THREE.Mesh).position.y = BASE_BODY_Y + (moving ? Math.abs(Math.sin(local.walkT)) * BOB_AMP : 0);
  }

  // muzzle flash
  const showFlash = (state.muzzleFlash ?? 0) > 0;
  parts.muzzle.visible = showFlash;
  if (showFlash) {
    const s = 0.8 + (state.tMs % 100) / 200;
    parts.muzzle.scale.set(s, s, s);
  }
}

export function createPlayerMesh(): THREE.Group {
  const group = new THREE.Group();

  // head
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.75, 0.7, 0.75),
    new THREE.MeshLambertMaterial({ color: SKIN }),
  );
  head.position.set(0.1, 1.55, 0);

  // helmet
  const helmet = new THREE.Mesh(
    new THREE.BoxGeometry(0.82, 0.35, 0.82),
    new THREE.MeshLambertMaterial({ color: HELMET }),
  );
  helmet.position.set(0.1, 1.88, 0);

  // torso
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.85, 0.7),
    new THREE.MeshLambertMaterial({ color: UNIFORM }),
  );
  body.position.set(0, BASE_BODY_Y, 0);

  // legs via hip pivots (origin at hip joint, mesh hangs below)
  const hipL = new THREE.Group();
  hipL.position.set(-0.22, 0.38, 0);
  const legL = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.55, 0.35),
    new THREE.MeshLambertMaterial({ color: UNIFORM }),
  );
  legL.position.set(0, -0.28, 0);
  const bootL = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.2, 0.4),
    new THREE.MeshLambertMaterial({ color: BOOT }),
  );
  bootL.position.set(0, -0.55, 0);
  hipL.add(legL, bootL);

  const hipR = new THREE.Group();
  hipR.position.set(0.22, 0.38, 0);
  const legR = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.55, 0.35),
    new THREE.MeshLambertMaterial({ color: UNIFORM }),
  );
  legR.position.set(0, -0.28, 0);
  const bootR = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.2, 0.4),
    new THREE.MeshLambertMaterial({ color: BOOT }),
  );
  bootR.position.set(0, -0.55, 0);
  hipR.add(legR, bootR);

  // gun arm (shoulder pivot)
  const shoulder = new THREE.Group();
  shoulder.position.set(0.45, 0.9, 0);
  const arm = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.5, 0.28),
    new THREE.MeshLambertMaterial({ color: SKIN }),
  );
  arm.position.set(0, -0.15, 0);
  const gun = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 0.18, 0.18),
    new THREE.MeshLambertMaterial({ color: GUN_COL }),
  );
  gun.position.set(0.5, 0.1, 0);

  // muzzle flash (billboard quad at barrel tip)
  const muzzle = new THREE.Mesh(
    new THREE.PlaneGeometry(0.4, 0.4),
    new THREE.MeshBasicMaterial({ color: FLASH_COL, transparent: true, opacity: 0.9, depthWrite: false }),
  );
  muzzle.position.set(1.1, 0.1, 0.1);
  muzzle.visible = false;

  shoulder.add(arm, gun, muzzle);

  group.add(head, helmet, body, hipL, hipR, shoulder);
  group.position.z = 15;

  const parts: AnimatedParts = { head, helmet, body, hipL, hipR, shoulder, muzzle };
  const animate: AnimateFn = animatePlayer;
  group.userData.parts = parts;
  group.userData.animate = animate;

  return group;
}
