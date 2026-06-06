import { test, expect, describe } from 'bun:test';
import { createGround, createPlatform } from './terrain.js';

describe('createGround()', () => {
  test('correct bounds from segment', () => {
    const g = createGround({ x: 0, y: 0, width: 200, height: 1 });
    expect(g.x).toBe(0);
    expect(g.y).toBe(0);
    expect(g.w).toBe(200);
    expect(g.h).toBe(1);
  });

  test('terrainKind is ground', () => {
    const g = createGround({ x: 0, y: 0, width: 10, height: 1 });
    expect(g.terrainKind).toBe('ground');
  });

  test('type is terrain', () => {
    const g = createGround({ x: 0, y: 0, width: 10, height: 1 });
    expect(g.type).toBe('terrain');
  });
});

describe('createPlatform()', () => {
  test('correct bounds from platform', () => {
    const p = createPlatform({ x: 40, y: 4, width: 15, height: 1 });
    expect(p.x).toBe(40);
    expect(p.y).toBe(4);
    expect(p.w).toBe(15);
    expect(p.h).toBe(1);
  });

  test('terrainKind is platform', () => {
    const p = createPlatform({ x: 0, y: 4, width: 10, height: 1 });
    expect(p.terrainKind).toBe('platform');
  });
});
