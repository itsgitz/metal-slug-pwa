import * as THREE from 'three';
import type { AnimatedParts, AnimState, AnimLocal, AnimateFn } from './types.js';

const PHASE_EMISSIVE = [0x000000, 0xff6600, 0xff0000];
const PHASE_INTENSITY = [0, 0.4, 0.7];

function animateBoss(
  _root: THREE.Object3D,
  parts: AnimatedParts,
  state: AnimState,
  dt: number,
  local: AnimLocal,
): void {
  const phase = state.phase ?? 1;

  // tread scroll illusion (UV offset not available in Lambert, fake with position)
  local.treadT = (local.treadT ?? 0) + dt * 0.002;
  parts.treadL.position.x = 1.6 + Math.sin(local.treadT) * 0.05;
  parts.treadR.position.x = 1.6 + Math.cos(local.treadT) * 0.05;

  // cannon recoil
  if ((state.muzzleFlash ?? 0) > 0 && !local.recoilFired) {
    local.recoilAmt = 0.25;
    local.recoilFired = 1;
  }
  if ((state.muzzleFlash ?? 0) <= 0) local.recoilFired = 0;
  if (local.recoilAmt > 0) local.recoilAmt = Math.max(0, local.recoilAmt - 0.015);
  parts.cannonPivot.position.x = 2.1 - (local.recoilAmt ?? 0);

  // phase emissive pulse on core
  const coreMat = (parts.core as THREE.Mesh).material as THREE.MeshLambertMaterial;
  const pulse = 0.5 + 0.5 * Math.sin(local.treadT * 4);
  coreMat.emissive.setHex(PHASE_EMISSIVE[phase - 1] ?? 0x000000);
  coreMat.emissiveIntensity = PHASE_INTENSITY[phase - 1] * (phase > 1 ? 0.6 + pulse * 0.4 : 0);
}

export function createBossMesh(_phase = 1): THREE.Group {
  const group = new THREE.Group();

  const core = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 2.6, 1.4),
    new THREE.MeshLambertMaterial({ color: 0x445566, emissive: 0x000000, emissiveIntensity: 0 }),
  );
  core.position.set(1.6, 1.5, 0);

  const turretBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.45, 0.55, 0.7, 8),
    new THREE.MeshLambertMaterial({ color: 0x334455 }),
  );
  turretBase.position.set(1.6, 2.85, 0);

  // cannon in a pivot for recoil
  const cannonPivot = new THREE.Group();
  cannonPivot.position.set(2.1, 2.85, 0);
  const cannon = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.28, 0.28),
    new THREE.MeshLambertMaterial({ color: 0x223344 }),
  );
  cannon.position.set(0.9, 0, 0);

  // cannon sight detail
  const sight = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.15, 0.2),
    new THREE.MeshLambertMaterial({ color: 0x445566 }),
  );
  sight.position.set(0.4, 0.2, 0);
  cannonPivot.add(cannon, sight);

  // armor plates
  const frontPlate = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 2.0, 1.2),
    new THREE.MeshLambertMaterial({ color: 0x556677 }),
  );
  frontPlate.position.set(3.1, 1.5, 0);

  // treads
  const treadGeo = new THREE.BoxGeometry(3.4, 0.45, 0.38);
  const treadMat = new THREE.MeshLambertMaterial({ color: 0x222222 });

  const treadL = new THREE.Mesh(treadGeo, treadMat);
  treadL.position.set(1.6, 0.22, 0.55);

  const treadR = new THREE.Mesh(treadGeo, treadMat.clone() as THREE.MeshLambertMaterial);
  treadR.position.set(1.6, 0.22, -0.55);

  // tread rollers
  for (let i = 0; i < 4; i++) {
    const roller = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 0.4, 6),
      new THREE.MeshLambertMaterial({ color: 0x333333 }),
    );
    roller.rotation.x = Math.PI / 2;
    roller.position.set(0.3 + i * 0.9, 0.22, 0);
    group.add(roller);
  }

  group.add(core, turretBase, cannonPivot, frontPlate, treadL, treadR);
  group.position.z = 15;

  const parts: AnimatedParts = { core, cannonPivot, treadL, treadR };
  group.userData.parts = parts;
  group.userData.animate = animateBoss as AnimateFn;
  return group;
}
