import { test, expect, describe } from 'bun:test';
import { createSpawnManager } from './spawning.js';
import type { SpawnEntry } from '../stages/types.js';

function entry(x: number): SpawnEntry {
  return { x, type: 'enemy-soldier', count: 1, formation: 'line' };
}

describe('spawn trigger (legacy center-crossing, halfView=0 margin=0)', () => {
  test('fires when camera.x crosses spawn.x', () => {
    let spawned = 0;
    const mgr = createSpawnManager([entry(50)], { onSpawn: () => { spawned++; }, halfView: 0, margin: 0 });
    mgr.update(49);
    expect(spawned).toBe(0);
    mgr.update(50);
    expect(spawned).toBe(1);
  });

  test('fires when camera.x exceeds spawn.x', () => {
    let spawned = 0;
    const mgr = createSpawnManager([entry(50)], { onSpawn: () => { spawned++; }, halfView: 0, margin: 0 });
    mgr.update(60);
    expect(spawned).toBe(1);
  });

  test('already-fired spawn never re-fires', () => {
    let spawned = 0;
    const mgr = createSpawnManager([entry(50)], { onSpawn: () => { spawned++; }, halfView: 0, margin: 0 });
    mgr.update(50);
    mgr.update(50);
    mgr.update(60);
    expect(spawned).toBe(1);
  });

  test('multiple spawns fire at their respective x values', () => {
    const fired: number[] = [];
    const spawns = [entry(30), entry(60), entry(90)];
    const mgr = createSpawnManager(spawns, { onSpawn: (s) => { fired.push(s.x); }, halfView: 0, margin: 0 });
    mgr.update(60);
    expect(fired).toEqual([30, 60]);
    mgr.update(100);
    expect(fired).toEqual([30, 60, 90]);
  });
});

describe('spawn trigger (right-edge lookahead)', () => {
  test('fires when spawn.x enters visible right edge (cameraX + halfView + margin)', () => {
    let spawned = 0;
    const mgr = createSpawnManager([entry(50)], { onSpawn: () => { spawned++; }, halfView: 17, margin: 2 });
    // right edge at cameraX=30 → 30+17+2=49 < 50, no fire
    mgr.update(30);
    expect(spawned).toBe(0);
    // right edge at cameraX=31 → 31+17+2=50 >= 50, fires
    mgr.update(31);
    expect(spawned).toBe(1);
  });

  test('does NOT fire while spawn.x is beyond right edge + margin', () => {
    let spawned = 0;
    const mgr = createSpawnManager([entry(100)], { onSpawn: () => { spawned++; }, halfView: 17, margin: 2 });
    mgr.update(0);
    mgr.update(10);
    mgr.update(50);
    // right edge = 50+17+2 = 69, still < 100
    expect(spawned).toBe(0);
  });

  test('multiple spawns fire in order as camera advances', () => {
    const fired: number[] = [];
    const spawns = [entry(60), entry(90), entry(120)];
    const mgr = createSpawnManager(spawns, {
      onSpawn: (s) => { fired.push(s.x); },
      halfView: 10,
      margin: 2,
    });
    // right edge = 40+10+2 = 52, fires nothing
    mgr.update(40);
    expect(fired).toEqual([]);
    // right edge = 48+10+2 = 60, fires x:60
    mgr.update(48);
    expect(fired).toEqual([60]);
    // right edge = 78+10+2 = 90, fires x:90
    mgr.update(78);
    expect(fired).toEqual([60, 90]);
    // right edge = 108+10+2 = 120, fires x:120
    mgr.update(108);
    expect(fired).toEqual([60, 90, 120]);
  });
});
