import type { Entity, World } from '../types.js';

let nextId = 100;

export const TELEGRAPH_MS = 400;

interface SoldierEntity extends Entity {
  type: 'enemy-soldier';
  hp: number;
  patrolDir: number;
  patrolRange: number;
  patrolOrigin: number;
  shootTimer: number;
  alertRange: number;
}

interface TurretEntity extends Entity {
  type: 'enemy-turret';
  hp: number;
  shootTimer: number;
}

interface DroneEntity extends Entity {
  type: 'enemy-drone';
  hp: number;
  hoverOffset: number;
  hoverTime: number;
  shootTimer: number;
}

export function createSoldier(x: number, y: number, patrolRange = 5): SoldierEntity {
  return {
    id: nextId++,
    type: 'enemy-soldier',
    x, y,
    vx: -2, vy: 0,
    w: 0.8, h: 1.8,
    alive: true,
    mesh: null,
    hp: 1,
    patrolDir: -1,
    patrolRange,
    patrolOrigin: x,
    shootTimer: 2000,
    alert: false,
    alertRange: 12,

    update(dt: number, world: World): void {
      // patrol movement
      this.x += this.vx * (dt / 1000);
      if (Math.abs(this.x - this.patrolOrigin) >= this.patrolRange) {
        this.patrolDir *= -1;
        this.vx = 2 * this.patrolDir;
      }

      // alert detection
      const player = world.entities.find(e => e.type === 'player' && e.alive);
      const dist = player ? Math.abs(player.x - this.x) : Infinity;
      this.alert = dist <= this.alertRange;

      if (this.alert) {
        this.shootTimer -= dt;
        if (this.shootTimer <= 0) {
          this.shootTimer = 2000;
          if (player) {
            const dir = player.x > this.x ? 1 : -1;
            world.spawn({ type: 'bullet-enemy', x: this.x + 0.4, y: this.y + 1, vx: dir * 12, vy: 0, w: 0.4, h: 0.15 });
          }
        }
      } else {
        // don't fire instantly on entering range
        if (this.shootTimer < 500) this.shootTimer = 500;
      }
    },
  };
}

export function createTurret(x: number, y: number): TurretEntity {
  return {
    id: nextId++,
    type: 'enemy-turret',
    x, y,
    vx: 0, vy: 0,
    w: 1.2, h: 1.2,
    alive: true,
    mesh: null,
    hp: 3,
    shootTimer: 1500,
    aimAngle: 0,
    telegraph: false,

    update(dt: number, world: World): void {
      const player = world.entities.find(e => e.type === 'player' && e.alive);
      if (player) {
        const dx = player.x - this.x;
        const dy = player.y - (this.y + 0.8);
        this.aimAngle = Math.atan2(dy, dx);
      }

      this.shootTimer -= dt;
      this.telegraph = this.shootTimer > 0 && this.shootTimer <= TELEGRAPH_MS;

      if (this.shootTimer <= 0) {
        this.shootTimer = 1500;
        this.telegraph = false;
        if (player) {
          const dx = player.x - this.x;
          const dy = player.y - this.y;
          const len = Math.hypot(dx, dy) || 1;
          world.spawn({ type: 'bullet-enemy', x: this.x + 0.6, y: this.y + 0.6, vx: (dx / len) * 10, vy: (dy / len) * 10, w: 0.4, h: 0.15 });
        }
      }
    },
  };
}

export function createDrone(x: number, y: number, altitude = 6): DroneEntity {
  return {
    id: nextId++,
    type: 'enemy-drone',
    x, y: altitude,
    vx: -3, vy: 0,
    w: 1.2, h: 0.8,
    alive: true,
    mesh: null,
    hp: 2,
    hoverOffset: 0,
    hoverTime: 0,
    shootTimer: 1800,
    telegraph: false,

    update(dt: number, world: World): void {
      this.hoverTime += dt;
      this.hoverOffset = Math.sin(this.hoverTime / 600) * 0.5;
      this.x += this.vx * (dt / 1000);

      this.shootTimer -= dt;
      this.telegraph = this.shootTimer > 0 && this.shootTimer <= TELEGRAPH_MS;

      if (this.shootTimer <= 0) {
        this.shootTimer = 1800;
        this.telegraph = false;
        world.spawn({ type: 'bullet-enemy', x: this.x + 0.6, y: this.y - 0.4, vx: 0, vy: -8, w: 0.3, h: 0.3 });
      }
    },
  };
}
