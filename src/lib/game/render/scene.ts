import * as THREE from 'three';
import { createBackground } from './factories/background-mesh.js';
import type { Background } from './factories/background-mesh.js';

export interface SceneContext {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  background: Background;
  resize(width: number, height: number): void;
  dispose(): void;
}

const FRUSTUM_HEIGHT = 20;

export function createScene(container: HTMLElement): SceneContext {
  const width = container.clientWidth;
  const height = container.clientHeight;
  const aspect = width / height;

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(width, height);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  // no flat background — sky is a geometry mesh
  scene.background = new THREE.Color(0x0b1428);

  const halfH = FRUSTUM_HEIGHT / 2;
  const halfW = halfH * aspect;
  const camera = new THREE.OrthographicCamera(-halfW, halfW, halfH, -halfH, 0.1, 100);
  camera.position.set(0, halfH, 50);

  // lighting: cool ambient + warm key + hemisphere fill
  const ambient = new THREE.AmbientLight(0x6677aa, 0.45);
  scene.add(ambient);

  const directional = new THREE.DirectionalLight(0xffeedd, 0.9);
  directional.position.set(-5, 10, 5);
  scene.add(directional);

  const hemisphere = new THREE.HemisphereLight(0x5566aa, 0x332211, 0.5);
  scene.add(hemisphere);

  const background = createBackground(scene, FRUSTUM_HEIGHT, aspect);

  return {
    renderer,
    scene,
    camera,
    background,

    resize(w: number, h: number): void {
      const asp = w / h;
      const hw = (FRUSTUM_HEIGHT / 2) * asp;
      const hh = FRUSTUM_HEIGHT / 2;
      camera.left = -hw;
      camera.right = hw;
      camera.top = hh;
      camera.bottom = -hh;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    },

    dispose(): void {
      background.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
