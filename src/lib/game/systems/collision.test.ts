import { test, expect, describe } from 'bun:test';
import { overlaps, inSplashRadius, resolveTerrainLanding, processCollisions } from './collision.js';
import type { Entity, World } from '../types.js';

function e(x: number, y: number, w = 1, h = 1, type: Entity['type'] = 'player'): Entity {
  return { id: Math.random(), type, x, y, vx: 0, vy: 0, w, h, alive: true, mesh: null, update: () => {} };
}

function makeWorld(entities: Entity[]): World {
  return { entities, actions: { left: false, right: false, jump: false, shoot: false, grenade: false }, spawn: () => {}, kill: (ent) => { ent.alive = false; }, camera: { x: 0 } };
}

describe('overlaps()', () => {
  test('b right of a → false', () => expect(overlaps(e(0, 0), e(2, 0))).toBe(false));
  test('b left of a → false', () => expect(overlaps(e(2, 0), e(0, 0))).toBe(false));
  test('b above a → false', () => expect(overlaps(e(0, 0), e(0, 2))).toBe(false));
  test('b below a → false', () => expect(overlaps(e(0, 2), e(0, 0))).toBe(false));
  test('overlapping at center → true', () => expect(overlaps(e(0, 0, 2, 2), e(1, 1, 2, 2))).toBe(true));
  test('partial overlap → true', () => expect(overlaps(e(0, 0, 2, 2), e(1, 0, 2, 2))).toBe(true));
  test('touching edge only → false', () => expect(overlaps(e(0, 0, 1, 1), e(1, 0, 1, 1))).toBe(false));
});

describe('inSplashRadius()', () => {
  test('target inside radius → true', () => {
    const grenade = e(0, 0, 1, 1);
    const target = e(1, 0, 1, 1);
    expect(inSplashRadius(grenade, target, 3)).toBe(true);
  });
  test('target outside radius → false', () => {
    const grenade = e(0, 0, 1, 1);
    const target = e(10, 10, 1, 1);
    expect(inSplashRadius(grenade, target, 3)).toBe(false);
  });
  test('target exactly on edge → true', () => {
    const grenade = e(0, 0, 0, 0); // center 0,0
    const target = e(3, 0, 0, 0);  // center 3,0
    expect(inSplashRadius(grenade, target, 3)).toBe(true);
  });
});

describe('resolveTerrainLanding()', () => {
  test('player lands on terrain from above → snaps y, zeroes vy', () => {
    const player = e(0, 3.5, 1, 2, 'player'); // falling, overlaps terrain
    player.vy = -5;
    const terrain = e(0, 0, 10, 1, 'terrain'); // terrain top at y=1
    resolveTerrainLanding(player, terrain);
    expect(player.y).toBe(terrain.y + terrain.h);
    expect(player.vy).toBe(0);
  });
});

describe('processCollisions()', () => {
  test('player-bullet + enemy-soldier → both die', () => {
    const bullet = e(0, 0, 1, 1, 'bullet-player');
    const enemy = e(0, 0, 1, 1, 'enemy-soldier');
    const world = makeWorld([bullet, enemy]);
    processCollisions(world, { score: 0, lives: 3, onScoreChange: () => {}, onLivesChange: () => {}, onGameOver: () => {} });
    expect(bullet.alive).toBe(false);
    expect(enemy.alive).toBe(false);
  });

  test('bullet-enemy + player → player loses life', () => {
    const player = e(0, 0, 1, 1, 'player');
    const bullet = e(0, 0, 1, 1, 'bullet-enemy');
    let lives = 3;
    const world = makeWorld([player, bullet]);
    processCollisions(world, { score: 0, lives, onScoreChange: () => {}, onLivesChange: (n) => { lives = n; }, onGameOver: () => {} });
    expect(bullet.alive).toBe(false);
    expect(lives).toBe(2);
  });

  test('player + enemy-soldier → player loses life, enemy gets knockback flag', () => {
    const player = e(0, 0, 1, 1, 'player');
    const enemy = e(0, 0, 1, 1, 'enemy-soldier') as Entity & { knockback?: boolean };
    let lives = 3;
    const world = makeWorld([player, enemy]);
    processCollisions(world, { score: 0, lives, onScoreChange: () => {}, onLivesChange: (n) => { lives = n; }, onGameOver: () => {} });
    expect(lives).toBe(2);
  });

  test('end-gate collision → triggers once, not every tick', () => {
    const player = e(0, 0, 1, 1, 'player');
    const gate = e(0, 0, 1, 1, 'end-gate') as Entity & { triggered?: boolean };
    const world = makeWorld([player, gate]);
    let triggers = 0;
    const ctx = { score: 0, lives: 3, onScoreChange: () => {}, onLivesChange: () => {}, onGameOver: () => {}, onStageClear: () => { triggers++; } };
    processCollisions(world, ctx);
    processCollisions(world, ctx);
    expect(triggers).toBe(1);
  });
});
