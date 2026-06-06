import * as THREE from 'three';

export interface SceneContext {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
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
  scene.background = new THREE.Color(0x1a1a2e);

  const halfH = FRUSTUM_HEIGHT / 2;
  const halfW = halfH * aspect;
  const camera = new THREE.OrthographicCamera(-halfW, halfW, halfH, -halfH, 0.1, 100);
  camera.position.set(0, halfH, 50);

  const ambient = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(ambient);

  const directional = new THREE.DirectionalLight(0xffffff, 0.6);
  directional.position.set(5, 10, 5);
  scene.add(directional);

  return {
    renderer,
    scene,
    camera,

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
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
