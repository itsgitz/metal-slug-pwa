import * as THREE from 'three';

export function createSoldierMesh(): THREE.Group {
  const group = new THREE.Group();

  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.7, 0.7),
    new THREE.MeshLambertMaterial({ color: 0x8b6914 }),
  );
  head.position.set(0, 1.3, 0);

  const helmet = new THREE.Mesh(
    new THREE.BoxGeometry(0.75, 0.3, 0.75),
    new THREE.MeshLambertMaterial({ color: 0x556b2f }),
  );
  helmet.position.set(0, 1.6, 0);

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 1.1, 0.6),
    new THREE.MeshLambertMaterial({ color: 0x556b2f }),
  );
  body.position.set(0, 0.6, 0);

  const gun = new THREE.Mesh(
    new THREE.BoxGeometry(1.0, 0.15, 0.15),
    new THREE.MeshLambertMaterial({ color: 0x222222 }),
  );
  gun.position.set(0.6, 0.9, 0);

  group.add(head, helmet, body, gun);
  group.position.z = 15;
  return group;
}

export function createTurretMesh(): THREE.Group {
  const group = new THREE.Group();

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.8, 0.5, 8),
    new THREE.MeshLambertMaterial({ color: 0x666666 }),
  );
  base.position.set(0, 0.25, 0);

  const barrel = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.2, 0.2),
    new THREE.MeshLambertMaterial({ color: 0x444444 }),
  );
  barrel.position.set(0.4, 0.6, 0);

  group.add(base, barrel);
  group.position.z = 15;
  return group;
}

export function createDroneMesh(): THREE.Group {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.5, 0.8),
    new THREE.MeshLambertMaterial({ color: 0x555555 }),
  );

  const wingL = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.1, 0.4),
    new THREE.MeshLambertMaterial({ color: 0x444444 }),
  );
  wingL.position.set(-0.8, 0, 0);

  const wingR = wingL.clone();
  wingR.position.set(0.8, 0, 0);

  const engineL = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.15, 0.3, 6),
    new THREE.MeshLambertMaterial({ color: 0xff6600, emissive: 0xff3300, emissiveIntensity: 0.5 }),
  );
  engineL.position.set(-0.8, -0.3, 0);

  const engineR = engineL.clone();
  engineR.position.set(0.8, -0.3, 0);

  group.add(body, wingL, wingR, engineL, engineR);
  group.position.z = 15;
  return group;
}
