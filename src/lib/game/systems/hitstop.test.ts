import { test, expect, describe } from 'bun:test';
import { createHitStop } from './hitstop.js';

describe('createHitStop', () => {
  test('tick returns false when not frozen', () => {
    const hs = createHitStop();
    expect(hs.tick()).toBe(false);
  });

  test('freeze N ticks → tick returns true N times then false', () => {
    const hs = createHitStop();
    hs.freeze(3);
    expect(hs.tick()).toBe(true);
    expect(hs.tick()).toBe(true);
    expect(hs.tick()).toBe(true);
    expect(hs.tick()).toBe(false);
  });

  test('freeze does not reset to lower value', () => {
    const hs = createHitStop();
    hs.freeze(5);
    hs.tick(); // 4 remaining
    hs.freeze(2); // should not reduce from 4 to 2
    expect(hs.tick()).toBe(true); // 3 remaining
    expect(hs.tick()).toBe(true); // 2 remaining
    expect(hs.tick()).toBe(true); // 1 remaining
    expect(hs.tick()).toBe(true); // 0 remaining
    expect(hs.tick()).toBe(false);
  });

  test('freeze can extend an active freeze', () => {
    const hs = createHitStop();
    hs.freeze(1);
    hs.freeze(5); // extend from 1 to 5
    let trueCount = 0;
    while (hs.tick()) trueCount++;
    expect(trueCount).toBe(5);
  });
});
