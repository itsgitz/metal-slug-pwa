import type { Entity, World } from '../types.js';
import { createBossAI } from '../systems/boss-ai.js';

const TELEGRAPH_MS = 400;

let nextId = 500;

export interface BossEntity extends Entity {
  type: 'boss';
  hp: number;
  hpMax: number;
  shootTimer: number;
  phase: number;
}

export function createBoss(x: number, y: number, hp: number, onStageClear: () => void): BossEntity {
  const ai = createBossAI(hp, { onStageClear });

  return {
    id: nextId++,
    type: 'boss',
    x, y,
    vx: 0, vy: 0,
    w: 4, h: 3,
    alive: true,
    mesh: null,
    hp,
    hpMax: hp,
    shootTimer: ai.cadence,
    phase: 1,
    telegraph: false,

    update(dt: number, world: World): void {
      ai.update(this.hp);
      this.phase = ai.phase;

      // chase player
      const player = world.entities.find(e => e.type === 'player' && e.alive);
      if (player) {
        const dir = player.x > this.x + this.w / 2 ? 1 : -1;
        this.vx = dir * ai.speed;
      }
      this.x += this.vx * (dt / 1000);

      // shoot with telegraph wind-up
      this.shootTimer -= dt;
      this.telegraph = this.shootTimer > 0 && this.shootTimer <= TELEGRAPH_MS;

      if (this.shootTimer <= 0) {
        this.shootTimer = ai.cadence;
        this.telegraph = false;
        this._firePattern(ai.pattern, world);
      }
    },

    _firePattern(pattern: string, world: World) {
      const cx = this.x + this.w / 2;
      const cy = this.y + this.h / 2;
      switch (pattern) {
        case 'slow':
          world.spawn({ type: 'bullet-enemy', x: cx - 0.2, y: cy, vx: -8, vy: 0, w: 0.4, h: 0.4 });
          world.spawn({ type: 'bullet-enemy', x: cx - 0.2, y: cy, vx: 8,  vy: 0, w: 0.4, h: 0.4 });
          break;
        case 'spread':
          for (let a = -30; a <= 30; a += 15) {
            const rad = (a * Math.PI) / 180;
            world.spawn({ type: 'bullet-enemy', x: cx, y: cy, vx: Math.sin(rad) * 10, vy: -Math.cos(rad) * 10, w: 0.3, h: 0.3 });
          }
          break;
        case 'rush':
          world.spawn({ type: 'bullet-enemy', x: cx, y: cy, vx: -14, vy: 0, w: 0.5, h: 0.5 });
          world.spawn({ type: 'bullet-enemy', x: cx, y: cy, vx: 14,  vy: 0, w: 0.5, h: 0.5 });
          world.spawn({ type: 'bullet-enemy', x: cx, y: cy, vx: 0,   vy: -14, w: 0.5, h: 0.5 });
          break;
      }
    },
  } as BossEntity & { _firePattern(p: string, w: World): void };
}
