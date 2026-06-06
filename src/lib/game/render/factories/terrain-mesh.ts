import * as THREE from 'three';
import type { GroundSegment, Platform } from '../../stages/types.js';

const GROUND_COLOR = 0x5c4a1e;
const PLATFORM_COLOR = 0x7a6030;

export function createGroundMesh(seg: GroundSegment): THREE.Mesh {
  const geo = new THREE.BoxGeometry(seg.width, seg.height, 1);
  const mat = new THREE.MeshLambertMaterial({ color: GROUND_COLOR });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(seg.x + seg.width / 2, seg.y + seg.height / 2, 10);
  return mesh;
}

export function createPlatformMesh(p: Platform): THREE.Mesh {
  const geo = new THREE.BoxGeometry(p.width, p.height, 1);
  const mat = new THREE.MeshLambertMaterial({ color: PLATFORM_COLOR });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(p.x + p.width / 2, p.y + p.height / 2, 10);
  return mesh;
}

export function createBackgroundRect(
  width: number, height: number,
  color: number, z: number,
): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(width, height);
  const mat = new THREE.MeshLambertMaterial({ color });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(width / 2, height / 2, z);
  return mesh;
}
