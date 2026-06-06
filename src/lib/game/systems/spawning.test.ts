import { test, expect, describe } from 'bun:test';
import { createSpawnManager } from './spawning.js';
import type { SpawnEntry } from '../stages/types.js';

function entry(x: number): SpawnEntry {
  return { x, type: 'enemy-soldier', count: 1, formation: 'line' };
}

describe('spawn trigger', () => {
  test('fires when camera.x crosses spawn.x', () => {
    let spawned = 0;
    const mgr = createSpawnManager([entry(50)], { onSpawn: () => { spawned++; } });
    mgr.update(49);
    expect(spawned).toBe(0);
    mgr.update(50);
    expect(spawned).toBe(1);
  });

  test('fires when camera.x exceeds spawn.x', () => {
    let spawned = 0;
    const mgr = createSpawnManager([entry(50)], { onSpawn: () => { spawned++; } });
    mgr.update(60);
    expect(spawned).toBe(1);
  });

  test('already-fired spawn never re-fires', () => {
    let spawned = 0;
    const mgr = createSpawnManager([entry(50)], { onSpawn: () => { spawned++; } });
    mgr.update(50);
    mgr.update(50);
    mgr.update(60);
    expect(spawned).toBe(1);
  });

  test('multiple spawns fire at their respective x values', () => {
    const fired: number[] = [];
    const spawns = [entry(30), entry(60), entry(90)];
    const mgr = createSpawnManager(spawns, { onSpawn: (s) => { fired.push(s.x); } });
    mgr.update(60);
    expect(fired).toEqual([30, 60]);
    mgr.update(100);
    expect(fired).toEqual([30, 60, 90]);
  });
});
