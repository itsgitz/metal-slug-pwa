import { test, expect, describe, beforeEach } from 'bun:test';
import { createLoop, type LoopState } from './loop.js';
import type { Screen } from './types.js';

// Minimal mock world
function makeWorld() {
  return { entities: [], actions: { left: false, right: false, jump: false, shoot: false, grenade: false }, spawn: () => {}, kill: () => {}, camera: { x: 0 } };
}

describe('accumulator ticking', () => {
  test('33ms elapsed → 2 update calls', () => {
    let ticks = 0;
    const loop = createLoop({ onUpdate: () => { ticks++; } });
    loop.tick(33, makeWorld());
    expect(ticks).toBe(2);
  });

  test('16ms elapsed → 1 update call', () => {
    let ticks = 0;
    const loop = createLoop({ onUpdate: () => { ticks++; } });
    loop.tick(16, makeWorld());
    expect(ticks).toBe(1);
  });

  test('8ms elapsed → 0 update calls', () => {
    let ticks = 0;
    const loop = createLoop({ onUpdate: () => { ticks++; } });
    loop.tick(8, makeWorld());
    expect(ticks).toBe(0);
  });
});

describe('spiral-of-death guard', () => {
  test('1000ms elapsed → max 15 update calls (250ms clamp)', () => {
    let ticks = 0;
    const loop = createLoop({ onUpdate: () => { ticks++; } });
    loop.tick(1000, makeWorld());
    expect(ticks).toBeLessThanOrEqual(15);
  });
});

describe('state machine', () => {
  test('non-playing screen skips update()', () => {
    let ticks = 0;
    const loop = createLoop({ onUpdate: () => { ticks++; } });
    loop.setScreen('menu');
    loop.tick(33, makeWorld());
    expect(ticks).toBe(0);
  });

  test('playing screen calls update()', () => {
    let ticks = 0;
    const loop = createLoop({ onUpdate: () => { ticks++; } });
    loop.setScreen('playing');
    loop.tick(33, makeWorld());
    expect(ticks).toBeGreaterThan(0);
  });

  test('menu → playing transition', () => {
    const loop = createLoop({});
    loop.setScreen('menu');
    loop.transition('playing');
    expect(loop.getScreen()).toBe('playing');
  });

  test('playing → stage-clear → playing (stage advance)', () => {
    const loop = createLoop({});
    loop.setScreen('playing');
    loop.transition('stage-clear');
    expect(loop.getScreen()).toBe('stage-clear');
    loop.transition('playing');
    expect(loop.getScreen()).toBe('playing');
  });

  test('playing → game-over', () => {
    const loop = createLoop({});
    loop.setScreen('playing');
    loop.transition('game-over');
    expect(loop.getScreen()).toBe('game-over');
  });

  test('playing → victory', () => {
    const loop = createLoop({});
    loop.setScreen('playing');
    loop.transition('victory');
    expect(loop.getScreen()).toBe('victory');
  });
});

describe('visibility change resume', () => {
  test('resuming after hidden resets accumulator (no burst ticks)', () => {
    let ticks = 0;
    const loop = createLoop({ onUpdate: () => { ticks++; } });
    loop.setScreen('playing');
    loop.onResume(); // simulate tab return
    loop.tick(16, makeWorld()); // only 1 normal tick expected
    expect(ticks).toBe(1);
  });
});
