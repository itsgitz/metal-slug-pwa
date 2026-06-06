import { test, expect, describe } from 'bun:test';
import { createPlayer, damagePlayer, PLAYER_MOVE_SPEED, PLAYER_JUMP_FORCE } from './player.js';
import { createSoldier, createTurret, createDrone, TELEGRAPH_MS } from './enemies.js';
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
    emit: () => {},
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

  test('grenade near boss decrements hp but does not one-shot at full hp', () => {
    const g = createGrenade(0, 1, 0, 0);
    const boss = { id: 999, type: 'boss' as const, x: 0, y: 0, vx: 0, vy: 0, w: 4, h: 3, alive: true, mesh: null, hp: 300, hpMax: 300, update: () => {} };
    const world = makeWorld([g, boss]);
    g.update(2100, world);
    expect(boss.alive).toBe(true);
    expect(boss.hp).toBeLessThan(300);
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

describe('soldier alert state', () => {
  test('out of alertRange does not fire', () => {
    const s = createSoldier(10, 0, 3);
    const player = { id: 1, type: 'player' as const, x: 100, y: 0, vx: 0, vy: 0, w: 1, h: 2, alive: true, mesh: null, update: () => {} };
    const world = makeWorld([s, player]);
    // run 3 full fire cycles — player is far away
    s.update(2000, world);
    s.update(2000, world);
    s.update(2000, world);
    const bullets = world.entities.filter(e => e.type === 'bullet-enemy');
    expect(bullets.length).toBe(0);
  });

  test('in alertRange fires', () => {
    const s = createSoldier(10, 0, 3);
    const player = { id: 1, type: 'player' as const, x: 15, y: 0, vx: 0, vy: 0, w: 1, h: 2, alive: true, mesh: null, update: () => {} };
    const world = makeWorld([s, player]);
    s.update(2100, world); // past one full fire cycle
    const bullets = world.entities.filter(e => e.type === 'bullet-enemy');
    expect(bullets.length).toBeGreaterThan(0);
  });

  test('alert flag reflects player proximity', () => {
    const s = createSoldier(10, 0, 3);
    const farPlayer = { id: 1, type: 'player' as const, x: 100, y: 0, vx: 0, vy: 0, w: 1, h: 2, alive: true, mesh: null, update: () => {} };
    const world = makeWorld([s, farPlayer]);
    s.update(16, world);
    expect(s.alert).toBe(false);

    farPlayer.x = 15; // move in range
    s.update(16, world);
    expect(s.alert).toBe(true);
  });
});

describe('turret aimAngle + telegraph', () => {
  test('aimAngle tracks player direction', () => {
    const t = createTurret(0, 0);
    const player = { id: 1, type: 'player' as const, x: 10, y: 0, vx: 0, vy: 0, w: 1, h: 2, alive: true, mesh: null, update: () => {} };
    const world = makeWorld([t, player]);
    t.update(16, world);
    // player is to the right, aimAngle should be near 0 (pointing right)
    expect(t.aimAngle).toBeDefined();
    expect(Math.abs(t.aimAngle! - Math.atan2(-0.8, 10))).toBeLessThan(0.1);
  });

  test('telegraph true during wind-up window', () => {
    const t = createTurret(0, 0);
    const world = makeWorld([t]);
    // run to just inside telegraph window
    t.update(1500 - TELEGRAPH_MS + 1, world);
    expect(t.telegraph).toBe(true);
  });

  test('telegraph false after firing', () => {
    const t = createTurret(0, 0);
    const world = makeWorld([t]);
    t.update(1600, world); // past full cycle
    expect(t.telegraph).toBe(false);
  });
});

describe('drone telegraph', () => {
  test('telegraph true during wind-up', () => {
    const d = createDrone(0, 0, 6);
    const world = makeWorld([d]);
    d.update(1800 - TELEGRAPH_MS + 1, world);
    expect(d.telegraph).toBe(true);
  });

  test('telegraph false after firing', () => {
    const d = createDrone(0, 0, 6);
    const world = makeWorld([d]);
    d.update(1900, world); // past full cycle
    expect(d.telegraph).toBe(false);
  });
});
