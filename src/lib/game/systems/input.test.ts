import { test, expect, describe } from 'bun:test';
import { createActionMap, KeyboardAdapter, consumeEdges } from './input.js';

describe('createActionMap', () => {
  test('all flags false by default', () => {
    const a = createActionMap();
    expect(a.left).toBe(false);
    expect(a.right).toBe(false);
    expect(a.jump).toBe(false);
    expect(a.shoot).toBe(false);
    expect(a.grenade).toBe(false);
  });
});

describe('KeyboardAdapter', () => {
  test('ArrowLeft sets left', () => {
    const a = createActionMap();
    const kb = new KeyboardAdapter(a);
    kb.keydown('ArrowLeft');
    expect(a.left).toBe(true);
    kb.keyup('ArrowLeft');
    expect(a.left).toBe(false);
  });

  test('a key sets left', () => {
    const a = createActionMap();
    const kb = new KeyboardAdapter(a);
    kb.keydown('a');
    expect(a.left).toBe(true);
  });

  test('ArrowRight / d sets right', () => {
    const a = createActionMap();
    const kb = new KeyboardAdapter(a);
    kb.keydown('ArrowRight');
    expect(a.right).toBe(true);
    kb.keydown('d');
    expect(a.right).toBe(true);
  });

  test('Space sets jump edge', () => {
    const a = createActionMap();
    const kb = new KeyboardAdapter(a);
    kb.keydown(' ');
    expect(a.jump).toBe(true);
  });

  test('ArrowUp / w sets jump edge', () => {
    const a = createActionMap();
    const kb = new KeyboardAdapter(a);
    kb.keydown('ArrowUp');
    expect(a.jump).toBe(true);
    const a2 = createActionMap();
    const kb2 = new KeyboardAdapter(a2);
    kb2.keydown('w');
    expect(a2.jump).toBe(true);
  });

  test('z / x sets shoot (held)', () => {
    const a = createActionMap();
    const kb = new KeyboardAdapter(a);
    kb.keydown('z');
    expect(a.shoot).toBe(true);
    kb.keyup('z');
    expect(a.shoot).toBe(false);
    kb.keydown('x');
    expect(a.shoot).toBe(true);
  });

  test('c sets grenade edge', () => {
    const a = createActionMap();
    const kb = new KeyboardAdapter(a);
    kb.keydown('c');
    expect(a.grenade).toBe(true);
  });
});

describe('edge semantics', () => {
  test('jump true for 1 tick then reset', () => {
    const a = createActionMap();
    const kb = new KeyboardAdapter(a);
    kb.keydown('ArrowUp');
    expect(a.jump).toBe(true);
    consumeEdges(a); // called at end of each tick
    expect(a.jump).toBe(false);
  });

  test('grenade true for 1 tick then reset', () => {
    const a = createActionMap();
    const kb = new KeyboardAdapter(a);
    kb.keydown('c');
    expect(a.grenade).toBe(true);
    consumeEdges(a);
    expect(a.grenade).toBe(false);
  });

  test('shoot held across ticks', () => {
    const a = createActionMap();
    const kb = new KeyboardAdapter(a);
    kb.keydown('z');
    consumeEdges(a);
    expect(a.shoot).toBe(true); // still held
    consumeEdges(a);
    expect(a.shoot).toBe(true);
    kb.keyup('z');
    expect(a.shoot).toBe(false);
  });
});
