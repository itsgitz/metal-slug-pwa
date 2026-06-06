import * as THREE from 'three';
import type { StageTheme } from '../../stages/types.js';

export interface BackgroundLayer {
  group: THREE.Group;
  factor: number;
}

export interface Background {
  layers: BackgroundLayer[];
  skyMesh: THREE.Mesh;
  setTheme(theme: StageTheme): void;
  update(cameraX: number, cameraY: number, dt?: number): void;
  dispose(): void;
}

function makeSkyTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0,    '#0b1428');
  grad.addColorStop(0.55, '#1a2850');
  grad.addColorStop(0.85, '#2d3060');
  grad.addColorStop(1,    '#3d2855');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 2, 256);
  return new THREE.CanvasTexture(canvas);
}

// Flat mountain silhouette: overlapping box peaks of different heights
function makeMountains(scene: THREE.Scene): THREE.Group {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0x1a2540 });

  const peaks = [
    { x: -80, w: 40, h: 14 },
    { x: -40, w: 30, h: 18 },
    { x: -10, w: 50, h: 12 },
    { x: 40,  w: 35, h: 20 },
    { x: 80,  w: 45, h: 15 },
    { x: 130, w: 38, h: 17 },
    { x: 180, w: 50, h: 13 },
    { x: 230, w: 35, h: 19 },
    { x: 280, w: 40, h: 11 },
  ];

  for (const p of peaks) {
    // triangle peak via box tilted with tapered top — approximate with two stacked boxes
    const base = new THREE.Mesh(new THREE.BoxGeometry(p.w, p.h * 0.6, 0.5), mat.clone() as THREE.MeshBasicMaterial);
    base.position.set(p.x, p.h * 0.3, 0);
    const peak = new THREE.Mesh(new THREE.BoxGeometry(p.w * 0.55, p.h * 0.5, 0.5), mat.clone() as THREE.MeshBasicMaterial);
    peak.position.set(p.x, p.h * 0.75, 0);
    group.add(base, peak);
  }

  group.position.z = -10;
  scene.add(group);
  return group;
}

// Silhouette cityscape: rectangular buildings
function makeBuildings(scene: THREE.Scene): THREE.Group {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0x1c2a3a });

  const buildings = [
    { x: -60, w: 8,  h: 8  },
    { x: -50, w: 12, h: 12 },
    { x: -35, w: 6,  h: 9  },
    { x: -20, w: 10, h: 14 },
    { x: -8,  w: 7,  h: 7  },
    { x: 5,   w: 14, h: 11 },
    { x: 22,  w: 8,  h: 13 },
    { x: 35,  w: 11, h: 9  },
    { x: 50,  w: 9,  h: 15 },
    { x: 65,  w: 7,  h: 8  },
    { x: 80,  w: 13, h: 12 },
    { x: 100, w: 8,  h: 10 },
    { x: 120, w: 11, h: 14 },
    { x: 140, w: 7,  h: 8  },
    { x: 160, w: 12, h: 11 },
    { x: 180, w: 9,  h: 13 },
    { x: 200, w: 10, h: 9  },
    { x: 215, w: 8,  h: 12 },
  ];

  for (const b of buildings) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, 0.5), mat.clone() as THREE.MeshBasicMaterial);
    mesh.position.set(b.x, b.h / 2, 0);
    // window lights (small emissive dots)
    const windowMat = new THREE.MeshBasicMaterial({ color: 0xffee88 });
    const rows = Math.floor(b.h / 2);
    const cols = Math.floor(b.w / 3);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (Math.random() > 0.4) {
          const win = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.1), windowMat);
          win.position.set(-b.w / 2 + 0.8 + c * 2.5, 0.8 + r * 2, 0.4);
          mesh.add(win);
        }
      }
    }
    group.add(mesh);
  }

  group.position.z = -2;
  scene.add(group);
  return group;
}

// Soft cloud quads — radial-gradient CanvasTexture blobs, slow independent drift
function makeCloudTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 32, 4, 64, 32, 60);
  grad.addColorStop(0, 'rgba(200, 210, 235, 0.55)');
  grad.addColorStop(0.6, 'rgba(180, 190, 220, 0.25)');
  grad.addColorStop(1, 'rgba(180, 190, 220, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 64);
  return new THREE.CanvasTexture(canvas);
}

function makeClouds(scene: THREE.Scene): { group: THREE.Group; tex: THREE.CanvasTexture } {
  const group = new THREE.Group();
  const tex = makeCloudTexture();
  const positions = [
    { x: -50, y: 15, s: 8 },
    { x: 10, y: 17, s: 11 },
    { x: 70, y: 14, s: 7 },
    { x: 130, y: 16, s: 10 },
    { x: 200, y: 15, s: 8 },
    { x: 260, y: 17, s: 12 },
  ];
  for (const p of positions) {
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(p.s, p.s * 0.5), mat);
    quad.position.set(p.x, p.y, 0);
    group.add(quad);
  }
  group.position.z = -15;
  scene.add(group);
  return { group, tex };
}

// Foreground silhouette layer — z in front of actors, parallax factor >1.
// Sparse, bottom-edge only, so gameplay stays readable.
function makeForeground(scene: THREE.Scene, theme: StageTheme): THREE.Group {
  const group = new THREE.Group();
  if (theme === 'jungle') {
    const mat = new THREE.MeshBasicMaterial({ color: 0x122408 });
    for (let x = -40; x < 320; x += 14 + (x % 3) * 5) {
      // grass tuft: 3 thin angled blades
      for (let b = 0; b < 3; b++) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.4 + (b % 2) * 0.6, 0.1), mat);
        blade.position.set(x + b * 0.3, 0.7, 0);
        blade.rotation.z = (b - 1) * 0.18;
        group.add(blade);
      }
    }
  } else {
    const mat = new THREE.MeshBasicMaterial({ color: 0x14141e });
    for (let x = -40; x < 360; x += 26) {
      // girder post + angled brace
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.4, 0.1), mat);
      post.position.set(x, 1.2, 0);
      const brace = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2.0, 0.1), mat);
      brace.position.set(x + 1.1, 0.9, 0);
      brace.rotation.z = 0.7;
      group.add(post, brace);
    }
  }
  group.position.z = 18;
  group.visible = false;
  scene.add(group);
  return group;
}

export function createBackground(scene: THREE.Scene, frustumHeight: number, aspect: number): Background {
  const W = frustumHeight * aspect;
  const H = frustumHeight;

  // sky quad — locked to camera
  const skyTex = makeSkyTexture();
  const skyMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(W * 3, H * 2),
    new THREE.MeshBasicMaterial({ map: skyTex, depthWrite: false }),
  );
  skyMesh.position.set(0, H / 4, -20);
  scene.add(skyMesh);

  const mountainGroup = makeMountains(scene);
  const buildingGroup = makeBuildings(scene);
  const clouds = makeClouds(scene);
  const fgJungle = makeForeground(scene, 'jungle');
  const fgIndustrial = makeForeground(scene, 'industrial');
  fgJungle.visible = true; // default theme

  let activeForeground = fgJungle;
  let cloudDrift = 0;

  const layers: BackgroundLayer[] = [
    { group: clouds.group, factor: 0.1 },
    { group: mountainGroup, factor: 0.2 },
    { group: buildingGroup, factor: 0.45 },
  ];

  return {
    layers,
    skyMesh,

    setTheme(theme: StageTheme): void {
      activeForeground.visible = false;
      activeForeground = theme === 'industrial' ? fgIndustrial : fgJungle;
      activeForeground.visible = true;
    },

    update(cameraX: number, cameraY: number, dt = 16): void {
      skyMesh.position.x = cameraX;
      cloudDrift = (cloudDrift + dt * 0.0004) % 80;
      for (const layer of layers) {
        layer.group.position.x = cameraX * layer.factor;
      }
      // clouds get extra slow independent drift on top of parallax
      clouds.group.position.x += cloudDrift;
      // foreground sweeps past faster than the camera (effective parallax factor 1.3)
      activeForeground.position.x = -cameraX * 0.3;
    },

    dispose(): void {
      const freeGroup = (g: THREE.Object3D) => {
        g.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry.dispose();
            (child.material as THREE.Material).dispose();
          }
        });
        scene.remove(g);
      };
      skyTex.dispose();
      clouds.tex.dispose();
      (skyMesh.material as THREE.MeshBasicMaterial).dispose();
      skyMesh.geometry.dispose();
      scene.remove(skyMesh);
      freeGroup(fgJungle);
      freeGroup(fgIndustrial);
      for (const layer of layers) {
        freeGroup(layer.group);
      }
    },
  };
}
