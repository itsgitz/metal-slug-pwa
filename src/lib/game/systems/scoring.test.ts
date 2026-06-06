import { test, expect, describe, beforeEach, mock, spyOn } from 'bun:test';
import { Scoring } from './scoring.js';

describe('point table', () => {
  test('soldier kill = 100', () => {
    const s = new Scoring(3);
    s.onEnemyKilled('enemy-soldier');
    expect(s.score).toBe(100);
  });
  test('turret kill = 200', () => {
    const s = new Scoring(3);
    s.onEnemyKilled('enemy-turret');
    expect(s.score).toBe(200);
  });
  test('drone kill = 150', () => {
    const s = new Scoring(3);
    s.onEnemyKilled('enemy-drone');
    expect(s.score).toBe(150);
  });
  test('boss hit = 50', () => {
    const s = new Scoring(3);
    s.onBossHit();
    expect(s.score).toBe(50);
  });
  test('boss killed = 5000', () => {
    const s = new Scoring(3);
    s.onBossKilled();
    expect(s.score).toBe(5000);
  });
  test('stage clear bonus = 1000 × remaining lives', () => {
    const s = new Scoring(3);
    s.onStageClear();
    expect(s.score).toBe(3000);
  });
  test('stage clear bonus with 1 life left', () => {
    const s = new Scoring(1);
    s.onStageClear();
    expect(s.score).toBe(1000);
  });
});

describe('lives', () => {
  test('starts with provided lives', () => {
    const s = new Scoring(3);
    expect(s.lives).toBe(3);
  });
  test('hit decrements lives', () => {
    const s = new Scoring(3);
    const result = s.onPlayerHit();
    expect(s.lives).toBe(2);
    expect(result.gameOver).toBe(false);
  });
  test('lives reach 0 → game over', () => {
    const s = new Scoring(1);
    const result = s.onPlayerHit();
    expect(s.lives).toBe(0);
    expect(result.gameOver).toBe(true);
  });
});

describe('hi-score persistence', () => {
  test('loadHiScore returns 0 when empty', () => {
    const storage = new Map<string, string>();
    const s = new Scoring(3, {
      getItem: (k) => storage.get(k) ?? null,
      setItem: (k, v) => storage.set(k, v),
    });
    expect(s.loadHiScore()).toBe(0);
  });
  test('saveHiScore persists value', () => {
    const storage = new Map<string, string>();
    const store = { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => storage.set(k, v) };
    const s = new Scoring(3, store);
    s.score = 1234;
    s.saveHiScore();
    expect(s.loadHiScore()).toBe(1234);
  });
  test('graceful when storage throws', () => {
    const s = new Scoring(3, {
      getItem: () => { throw new Error('storage unavailable'); },
      setItem: () => { throw new Error('storage unavailable'); },
    });
    expect(s.loadHiScore()).toBe(0);
    expect(() => s.saveHiScore()).not.toThrow();
  });
});
