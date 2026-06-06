import * as THREE from 'three';

const BODY_COLOR = 0x4a7c4e;
const HEAD_COLOR = 0xd4a96a;
const GUN_COLOR = 0x333333;

export function createPlayerMesh(): THREE.Group {
  const group = new THREE.Group();

  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.8, 0.8),
    new THREE.MeshLambertMaterial({ color: HEAD_COLOR }),
  );
  head.position.set(0, 1.4, 0);

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 1.2, 0.8),
    new THREE.MeshLambertMaterial({ color: BODY_COLOR }),
  );
  body.position.set(0, 0.6, 0);

  const legL = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.6, 0.4),
    new THREE.MeshLambertMaterial({ color: BODY_COLOR }),
  );
  legL.position.set(-0.25, 0, 0);

  const legR = legL.clone();
  legR.position.set(0.25, 0, 0);

  const gun = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.2, 0.2),
    new THREE.MeshLambertMaterial({ color: GUN_COLOR }),
  );
  gun.position.set(0.8, 0.8, 0);

  group.add(head, body, legL, legR, gun);
  group.position.z = 15;
  return group;
}
