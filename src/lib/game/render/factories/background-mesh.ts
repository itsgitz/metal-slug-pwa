import * as THREE from 'three';

export interface BackgroundLayer {
  group: THREE.Group;
  factor: number;
}

export interface Background {
  layers: BackgroundLayer[];
  skyMesh: THREE.Mesh;
  update(cameraX: number, cameraY: number): void;
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

  const layers: BackgroundLayer[] = [
    { group: mountainGroup, factor: 0.2 },
    { group: buildingGroup, factor: 0.45 },
  ];

  return {
    layers,
    skyMesh,

    update(cameraX: number, cameraY: number): void {
      skyMesh.position.x = cameraX;
      for (const layer of layers) {
        layer.group.position.x = cameraX * layer.factor;
      }
    },

    dispose(): void {
      skyTex.dispose();
      (skyMesh.material as THREE.MeshBasicMaterial).dispose();
      skyMesh.geometry.dispose();
      scene.remove(skyMesh);
      for (const layer of layers) {
        scene.remove(layer.group);
      }
    },
  };
}
