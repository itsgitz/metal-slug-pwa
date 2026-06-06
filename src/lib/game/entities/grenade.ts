import type { Entity } from '../types.js';
import { inSplashRadius, GRENADE_DAMAGE } from '../systems/collision.js';

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

        world.emit({ type: 'explosion', x: this.x + this.w / 2, y: this.y + this.h / 2 });
        for (const ent of world.entities) {
          if (!ent.alive) continue;
          if (ent.type === 'enemy-soldier' || ent.type === 'enemy-turret' || ent.type === 'enemy-drone') {
            if (inSplashRadius(this, ent, SPLASH_RADIUS)) {
              world.emit({ type: 'enemy-death', x: ent.x + ent.w / 2, y: ent.y + ent.h / 2 });
              world.kill(ent);
            }
          }
          if (ent.type === 'boss') {
            if (inSplashRadius(this, ent, SPLASH_RADIUS)) {
              const boss = ent as Entity & { hp: number };
              boss.hp -= GRENADE_DAMAGE;
              if (boss.hp <= 0) {
                world.emit({ type: 'enemy-death', x: boss.x + boss.w / 2, y: boss.y + boss.h / 2 });
                world.kill(boss);
              }
            }
          }
        }
      }
    },
  };
}

export const GRENADE_SPLASH_RADIUS = SPLASH_RADIUS;
