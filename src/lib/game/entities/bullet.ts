import type { Entity, EntityType } from '../types.js';

let nextId = 1000;

export function createBullet(
  type: 'bullet-player' | 'bullet-enemy',
  x: number, y: number,
  vx: number, vy: number,
): Entity {
  return {
    id: nextId++,
    type,
    x, y,
    vx, vy,
    w: 0.4, h: 0.15,
    alive: true,
    mesh: null,

    update(dt: number): void {
      this.x += this.vx * (dt / 1000);
      this.y += this.vy * (dt / 1000);

      // cull off-screen bullets
      if (Math.abs(this.x) > 500 || this.y < -10) this.alive = false;
    },
  };
}
