import * as THREE from 'three';
import type { GroundSegment, Platform } from '../../stages/types.js';
import type { StageTheme } from '../../stages/types.js';

// Procedural CanvasTextures per theme — generated once, cloned per mesh
// (clones share the image, each gets its own repeat).

function makeDirtTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#5c4a1e';
  ctx.fillRect(0, 0, 64, 64);
  // dirt noise speckle
  for (let i = 0; i < 180; i++) {
    const shade = Math.random();
    ctx.fillStyle = shade > 0.6 ? '#6b572a' : shade > 0.3 ? '#4e3d16' : '#3d2f10';
    ctx.fillRect(Math.floor(Math.random() * 64), Math.floor(Math.random() * 64), 2, 2);
  }
  // grass strip hint at top
  ctx.fillStyle = '#3a5a20';
  ctx.fillRect(0, 0, 64, 4);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function makeMetalTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#4a4a58';
  ctx.fillRect(0, 0, 64, 64);
  // panel seams
  ctx.strokeStyle = '#33333e';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, 31, 31);
  ctx.strokeRect(33, 1, 30, 31);
  ctx.strokeRect(1, 33, 31, 30);
  ctx.strokeRect(33, 33, 30, 30);
  // rivets
  ctx.fillStyle = '#6a6a7a';
  for (const [rx, ry] of [[5, 5], [27, 5], [5, 27], [27, 27], [37, 5], [59, 5], [37, 27], [59, 27], [5, 37], [27, 37], [5, 59], [27, 59], [37, 37], [59, 37], [37, 59], [59, 59]]) {
    ctx.fillRect(rx, ry, 2, 2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

let dirtTex: THREE.CanvasTexture | null = null;
let metalTex: THREE.CanvasTexture | null = null;

function themeTexture(theme: StageTheme): THREE.CanvasTexture {
  if (theme === 'industrial') {
    if (!metalTex) metalTex = makeMetalTexture();
    return metalTex;
  }
  if (!dirtTex) dirtTex = makeDirtTexture();
  return dirtTex;
}

const EDGE_COLORS: Record<StageTheme, number> = {
  jungle: 0x6f9a3c,
  industrial: 0x8a8aa0,
};

function texturedMaterial(theme: StageTheme, width: number, height: number): THREE.MeshLambertMaterial {
  const tex = themeTexture(theme).clone();
  tex.needsUpdate = true;
  tex.repeat.set(Math.max(1, width / 4), Math.max(1, height / 2));
  return new THREE.MeshLambertMaterial({ map: tex });
}

export function createGroundMesh(seg: GroundSegment, theme: StageTheme = 'jungle'): THREE.Mesh {
  const geo = new THREE.BoxGeometry(seg.width, seg.height, 1);
  const mesh = new THREE.Mesh(geo, texturedMaterial(theme, seg.width, seg.height));
  mesh.position.set(seg.x + seg.width / 2, seg.y + seg.height / 2, 10);
  return mesh;
}

export function createPlatformMesh(p: Platform, theme: StageTheme = 'jungle'): THREE.Mesh {
  const geo = new THREE.BoxGeometry(p.width, p.height, 1);
  const mesh = new THREE.Mesh(geo, texturedMaterial(theme, p.width, p.height));
  mesh.position.set(p.x + p.width / 2, p.y + p.height / 2, 10);

  // edge highlight strip on walkable top — sells the surface
  const edge = new THREE.Mesh(
    new THREE.BoxGeometry(p.width, 0.12, 1.05),
    new THREE.MeshLambertMaterial({ color: EDGE_COLORS[theme] }),
  );
  edge.position.set(0, p.height / 2 - 0.06, 0);
  mesh.add(edge);
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
