import * as THREE from 'three';
import type { AnimatedParts, AnimState, AnimLocal, AnimateFn } from './types.js';

// ---- Soldier ----

function animateSoldier(
  root: THREE.Object3D,
  parts: AnimatedParts,
  state: AnimState,
  dt: number,
  local: AnimLocal,
): void {
  root.scale.x = state.vx < 0 ? -1 : 1;
  const moving = Math.abs(state.vx) > 0.1;
  if (moving) local.walkT += dt * 0.008;
  const swing = moving ? Math.sin(local.walkT) * 0.45 : 0;
  parts.hipL.rotation.z = swing;
  parts.hipR.rotation.z = -swing;
}

export function createSoldierMesh(): THREE.Group {
  const group = new THREE.Group();

  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.65, 0.65, 0.65),
    new THREE.MeshLambertMaterial({ color: 0x8b6914 }),
  );
  head.position.set(0, 1.45, 0);

  const helmet = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 0.3, 0.72),
    new THREE.MeshLambertMaterial({ color: 0x3a5a20 }),
  );
  helmet.position.set(0, 1.73, 0);

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.75, 0.9, 0.6),
    new THREE.MeshLambertMaterial({ color: 0x4a6530 }),
  );
  body.position.set(0, 0.85, 0);

  const gun = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 0.14, 0.14),
    new THREE.MeshLambertMaterial({ color: 0x1a1a1a }),
  );
  gun.position.set(0.55, 1.05, 0);

  const hipL = new THREE.Group();
  hipL.position.set(-0.2, 0.45, 0);
  const legL = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.55, 0.3),
    new THREE.MeshLambertMaterial({ color: 0x4a6530 }),
  );
  legL.position.set(0, -0.28, 0);
  const bootL = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.18, 0.36),
    new THREE.MeshLambertMaterial({ color: 0x1a1008 }),
  );
  bootL.position.set(0, -0.55, 0);
  hipL.add(legL, bootL);

  const hipR = new THREE.Group();
  hipR.position.set(0.2, 0.45, 0);
  const legR = legL.clone();
  const bootR = bootL.clone();
  hipR.add(legR, bootR);

  group.add(head, helmet, body, gun, hipL, hipR);
  group.position.z = 15;

  const parts: AnimatedParts = { hipL, hipR };
  group.userData.parts = parts;
  group.userData.animate = animateSoldier as AnimateFn;
  return group;
}

// ---- Turret ----

function animateTurret(
  root: THREE.Object3D,
  parts: AnimatedParts,
  state: AnimState,
  _dt: number,
  local: AnimLocal,
): void {
  // barrel recoil fades out
  if (local.recoil === undefined) local.recoil = 0;
  if ((state.muzzleFlash ?? 0) > 0 && local.recoilTriggered !== 1) {
    local.recoil = 0.15;
    local.recoilTriggered = 1;
  }
  if ((state.muzzleFlash ?? 0) <= 0) local.recoilTriggered = 0;
  local.recoil = Math.max(0, local.recoil - 0.01);
  parts.barrelPivot.position.x = -local.recoil;
}

export function createTurretMesh(): THREE.Group {
  const group = new THREE.Group();

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.75, 0.55, 8),
    new THREE.MeshLambertMaterial({ color: 0x555566 }),
  );
  base.position.set(0, 0.28, 0);

  const dome = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.5, 0.5, 8),
    new THREE.MeshLambertMaterial({ color: 0x445566 }),
  );
  dome.position.set(0, 0.75, 0);

  // barrel in a pivot group for recoil
  const barrelPivot = new THREE.Group();
  barrelPivot.position.set(0, 0.8, 0);
  const barrel = new THREE.Mesh(
    new THREE.BoxGeometry(0.85, 0.18, 0.18),
    new THREE.MeshLambertMaterial({ color: 0x333344 }),
  );
  barrel.position.set(0.42, 0, 0);
  barrelPivot.add(barrel);

  group.add(base, dome, barrelPivot);
  group.position.z = 15;

  const parts: AnimatedParts = { barrelPivot };
  group.userData.parts = parts;
  group.userData.animate = animateTurret as AnimateFn;
  return group;
}

// ---- Drone ----

function animateDrone(
  root: THREE.Object3D,
  parts: AnimatedParts,
  state: AnimState,
  dt: number,
  local: AnimLocal,
): void {
  // rotor spin
  local.rotorT = (local.rotorT ?? 0) + dt * 0.015;
  parts.rotorL.rotation.y = local.rotorT;
  parts.rotorR.rotation.y = -local.rotorT;

  // bank on x movement
  const bank = Math.max(-0.25, Math.min(0.25, state.vx * 0.04));
  root.rotation.z = -bank;

  // engine glow pulse
  const pulse = 0.5 + 0.5 * Math.sin(local.rotorT * 3);
  const eng = (parts.engineL as THREE.Mesh).material as THREE.MeshLambertMaterial;
  eng.emissiveIntensity = 0.4 + pulse * 0.5;
}

export function createDroneMesh(): THREE.Group {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.45, 0.7),
    new THREE.MeshLambertMaterial({ color: 0x444455 }),
  );

  const wingL = new THREE.Mesh(
    new THREE.BoxGeometry(0.75, 0.08, 0.35),
    new THREE.MeshLambertMaterial({ color: 0x333344 }),
  );
  wingL.position.set(-0.85, 0.05, 0);

  const wingR = wingL.clone();
  wingR.position.set(0.85, 0.05, 0);

  // rotors (flat disc using cylinder)
  const rotorGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.05, 8);
  const rotorMat = new THREE.MeshLambertMaterial({ color: 0x222233 });

  const rotorL = new THREE.Mesh(rotorGeo, rotorMat);
  rotorL.position.set(-0.85, 0.15, 0);

  const rotorR = new THREE.Mesh(rotorGeo, rotorMat.clone());
  rotorR.position.set(0.85, 0.15, 0);

  const engineMat = new THREE.MeshLambertMaterial({ color: 0xff4400, emissive: 0xff2200, emissiveIntensity: 0.6 });
  const engineL = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 0.22, 6),
    engineMat,
  );
  engineL.position.set(-0.85, -0.25, 0);

  const engineR = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 0.22, 6),
    engineMat.clone() as THREE.MeshLambertMaterial,
  );
  engineR.position.set(0.85, -0.25, 0);

  group.add(body, wingL, wingR, rotorL, rotorR, engineL, engineR);
  group.position.z = 15;

  const parts: AnimatedParts = { rotorL, rotorR, engineL, engineR };
  group.userData.parts = parts;
  group.userData.animate = animateDrone as AnimateFn;
  return group;
}
