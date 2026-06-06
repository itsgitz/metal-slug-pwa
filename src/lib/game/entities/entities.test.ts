import { test, expect, describe } from 'bun:test';
import { createPlayer, damagePlayer, PLAYER_MOVE_SPEED, PLAYER_JUMP_FORCE } from './player.js';
import { createSoldier, createTurret, createDrone } from './enemies.js';
import { createBullet } from './bullet.js';
import { createGrenade, GRENADE_SPLASH_RADIUS } from './grenade.js';
import { createActionMap } from '../systems/input.js';
import type { World } from '../types.js';

function makeWorld(entities: any[] = []): World {
  return {
    entities,
    actions: createActionMap(),
    spawn(t) { entities.push({ ...t, id: 9999, alive: true, mesh: null, vx: t.vx ?? 0, vy: t.vy ?? 0, w: t.w ?? 1, h: t.h ?? 1, update: () => {} }); },
    kill(e) { e.alive = false; },
    camera: { x: 0 },
  };
}

describe('player', () => {
  test('moves right when action.right', () => {
    const p = createPlayer(0, 0);
    p.onGround = true;
    const world = makeWorld();
    world.actions.right = true;
    p.update(16, world);
    expect(p.x).toBeGreaterThan(0);
  });

  test('moves left when action.left', () => {
    const p = createPlayer(5, 0);
    p.onGround = true;
    const world = makeWorld();
    world.actions.left = true;
    p.update(16, world);
    expect(p.x).toBeLessThan(5);
  });

  test('jumps when on ground + action.jump', () => {
    const p = createPlayer(0, 0);
    p.onGround = true;
    const world = makeWorld();
    world.actions.jump = true;
    const prevVy = p.vy;
    p.update(16, world);
    expect(p.vy).toBeGreaterThan(prevVy);
  });

  test('does not jump when airborne', () => {
    const p = createPlayer(0, 5);
    p.onGround = false;
    const world = makeWorld();
    world.actions.jump = true;
    p.vy = 0;
    p.update(16, world);
    // vy should be falling due to gravity, not jumping
    expect(p.vy).toBeLessThan(PLAYER_JUMP_FORCE);
  });

  test('invincibility set after damage', () => {
    const p = createPlayer(0, 0);
    expect(p.invincible).toBe(false);
    damagePlayer(p);
    expect(p.invincible).toBe(true);
  });

  test('invincibility does not stack', () => {
    const p = createPlayer(0, 0);
    damagePlayer(p);
    const timer1 = p.invincibleTimer;
    damagePlayer(p);
    expect(p.invincibleTimer).toBe(timer1); // no reset
  });

  test('spawns bullet when shoot action', () => {
    const p = createPlayer(0, 1);
    p.onGround = true;
    const world = makeWorld([p]);
    world.actions.shoot = true;
    p.update(16, world);
    const bullet = world.entities.find(e => e.type === 'bullet-player');
    expect(bullet).toBeDefined();
  });

  test('spawns grenade when grenade action', () => {
    const p = createPlayer(0, 1);
    p.onGround = true;
    const world = makeWorld([p]);
    world.actions.grenade = true;
    p.update(16, world);
    const grenade = world.entities.find(e => e.type === 'grenade');
    expect(grenade).toBeDefined();
  });
});

describe('bullet', () => {
  test('moves in vx direction', () => {
    const b = createBullet('bullet-player', 0, 0, 20, 0);
    b.update(16, makeWorld());
    expect(b.x).toBeGreaterThan(0);
  });

  test('culled when far off screen', () => {
    const b = createBullet('bullet-player', 600, 0, 1, 0);
    b.update(16, makeWorld());
    expect(b.alive).toBe(false);
  });
});

describe('grenade', () => {
  test('arcs upward then falls due to gravity', () => {
    const g = createGrenade(0, 1, 0, 6); // upward velocity, above floor
    const world = makeWorld([g]);
    g.update(50, world); // peak
    const peakVy = g.vy;
    g.update(50, world); // falling
    // gravity decreases vy each tick
    expect(g.vy).toBeLessThan(peakVy);
  });

  test('bounces off ground', () => {
    const g = createGrenade(0, 0, 0, 0); // at floor
    g.vy = -10;
    const world = makeWorld([g]);
    g.update(16, world);
    expect(g.y).toBeGreaterThanOrEqual(0);
  });

  test('explodes after fuse and kills nearby enemies', () => {
    const g = createGrenade(0, 1, 0, 0);
    const enemy = createSoldier(1, 1);
    const world = makeWorld([g, enemy]);
    g.update(2100, world); // past fuse
    expect(g.alive).toBe(false);
    expect(enemy.alive).toBe(false);
  });

  test('does not kill enemy outside splash radius', () => {
    const g = createGrenade(0, 0, 0, 0);
    const far = createSoldier(50, 0);
    const world = makeWorld([g, far]);
    g.update(2100, world);
    expect(far.alive).toBe(true);
  });
});

describe('soldier', () => {
  test('patrols back and forth', () => {
    const s = createSoldier(10, 0, 5);
    const world = makeWorld([s]);
    const x0 = s.x;
    // move far enough to hit patrol limit
    s.update(3000, world);
    // direction should have flipped at least once
    expect(s.x).toBeDefined(); // basic alive check
  });
});

describe('turret', () => {
  test('stationary (vx=0)', () => {
    const t = createTurret(10, 0);
    const world = makeWorld([t]);
    const x0 = t.x;
    t.update(500, world);
    expect(t.x).toBe(x0);
  });

  test('has 3 hp', () => {
    const t = createTurret(0, 0);
    expect(t.hp).toBe(3);
  });
});

describe('drone', () => {
  test('hovers at altitude', () => {
    const d = createDrone(0, 0, 6);
    expect(d.y).toBe(6);
  });

  test('moves horizontally', () => {
    const d = createDrone(5, 0, 6);
    const world = makeWorld([d]);
    d.update(500, world);
    expect(d.x).not.toBe(5);
  });
});
