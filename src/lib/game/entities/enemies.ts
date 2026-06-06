import type { Entity, World } from '../types.js';

let nextId = 100;

interface SoldierEntity extends Entity {
  type: 'enemy-soldier';
  hp: number;
  patrolDir: number;
  patrolRange: number;
  patrolOrigin: number;
  shootTimer: number;
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

    update(dt: number, world: World): void {
      // patrol
      this.x += this.vx * (dt / 1000);
      if (Math.abs(this.x - this.patrolOrigin) >= this.patrolRange) {
        this.patrolDir *= -1;
        this.vx = 2 * this.patrolDir;
      }

      // shoot toward player
      this.shootTimer -= dt;
      if (this.shootTimer <= 0) {
        this.shootTimer = 2000;
        const player = world.entities.find(e => e.type === 'player' && e.alive);
        if (player) {
          const dir = player.x > this.x ? 1 : -1;
          world.spawn({ type: 'bullet-enemy', x: this.x + 0.4, y: this.y + 1, vx: dir * 12, vy: 0, w: 0.4, h: 0.15 });
        }
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

    update(dt: number, world: World): void {
      this.shootTimer -= dt;
      if (this.shootTimer <= 0) {
        this.shootTimer = 1500;
        const player = world.entities.find(e => e.type === 'player' && e.alive);
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

    update(dt: number, world: World): void {
      this.hoverTime += dt;
      this.hoverOffset = Math.sin(this.hoverTime / 600) * 0.5;
      this.x += this.vx * (dt / 1000);

      this.shootTimer -= dt;
      if (this.shootTimer <= 0) {
        this.shootTimer = 1800;
        world.spawn({ type: 'bullet-enemy', x: this.x + 0.6, y: this.y - 0.4, vx: 0, vy: -8, w: 0.3, h: 0.3 });
      }
    },
  };
}
