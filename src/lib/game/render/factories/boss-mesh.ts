import * as THREE from 'three';

const PHASE_TINTS = [0x888888, 0xff8800, 0xff2200];

export function createBossMesh(phase = 1): THREE.Group {
  const group = new THREE.Group();
  const tint = PHASE_TINTS[phase - 1] ?? PHASE_TINTS[0];
  const emissive = phase > 1 ? tint : 0x000000;

  const core = new THREE.Mesh(
    new THREE.BoxGeometry(3, 2.5, 1.5),
    new THREE.MeshLambertMaterial({ color: 0x555566, emissive, emissiveIntensity: phase > 1 ? 0.4 : 0 }),
  );
  core.position.set(1.5, 1.25, 0);

  const turret = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.5, 0.8, 8),
    new THREE.MeshLambertMaterial({ color: 0x444455 }),
  );
  turret.position.set(1.5, 2.5, 0);

  const cannon = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 0.3, 0.3),
    new THREE.MeshLambertMaterial({ color: 0x333344 }),
  );
  cannon.position.set(2.5, 2.6, 0);

  const treadL = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 0.5, 0.4),
    new THREE.MeshLambertMaterial({ color: 0x333333 }),
  );
  treadL.position.set(1.5, 0, 0.5);

  const treadR = treadL.clone();
  treadR.position.set(1.5, 0, -0.5);

  group.add(core, turret, cannon, treadL, treadR);
  group.position.z = 15;
  return group;
}
