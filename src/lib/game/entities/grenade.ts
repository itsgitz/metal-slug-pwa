import type { Entity } from '../types.js';
import { inSplashRadius } from '../systems/collision.js';

let nextId = 2000;

const GRAVITY = 20;
const FUSE = 2000; // ms
const SPLASH_RADIUS = 3;

export interface GrenadeEntity extends Entity {
  type: 'grenade';
  fuse: number;
  exploded: boolean;
}

export function createGrenade(x: number, y: number, vx: number, vy: number): GrenadeEntity {
  return {
    id: nextId++,
    type: 'grenade',
    x, y,
    vx, vy,
    w: 0.4, h: 0.4,
    alive: true,
    mesh: null,
    fuse: FUSE,
    exploded: false,

    update(dt: number, world: any): void {
      this.fuse -= dt;
      this.vy -= GRAVITY * (dt / 1000);
      this.x += this.vx * (dt / 1000);
      this.y += this.vy * (dt / 1000);

      // bounce off ground
      if (this.y <= 0) { this.y = 0; this.vy = Math.abs(this.vy) * 0.4; this.vx *= 0.8; }

      if (this.fuse <= 0 && !this.exploded) {
        this.exploded = true;
        this.alive = false;

        for (const ent of world.entities) {
          if (!ent.alive) continue;
          if (ent.type === 'enemy-soldier' || ent.type === 'enemy-turret' || ent.type === 'enemy-drone' || ent.type === 'boss') {
            if (inSplashRadius(this, ent, SPLASH_RADIUS)) {
              world.kill(ent);
            }
          }
        }
      }
    },
  };
}

export const GRENADE_SPLASH_RADIUS = SPLASH_RADIUS;
