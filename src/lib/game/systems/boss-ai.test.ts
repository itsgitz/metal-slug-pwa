import { test, expect, describe } from 'bun:test';
import { createBossAI } from './boss-ai.js';

describe('boss phases', () => {
  test('starts in phase 1 at full hp', () => {
    const boss = createBossAI(300);
    expect(boss.phase).toBe(1);
    expect(boss.cadence).toBe(2000);
  });

  test('transitions to phase 2 at 66% hp', () => {
    const boss = createBossAI(300);
    boss.update(200); // 200/300 = 66.7% → still P1
    expect(boss.phase).toBe(1);
    boss.update(198); // 198/300 = 66% → P2
    expect(boss.phase).toBe(2);
    expect(boss.cadence).toBe(1200);
  });

  test('transitions to phase 3 at 33% hp', () => {
    const boss = createBossAI(300);
    boss.update(99); // 99/300 = 33% → P3
    expect(boss.phase).toBe(3);
    expect(boss.cadence).toBe(800);
  });

  test('transitions are idempotent', () => {
    const boss = createBossAI(300);
    boss.update(198);
    const phaseAtFirst = boss.phase;
    boss.update(198); // same hp, no re-fire
    expect(boss.phase).toBe(phaseAtFirst);
  });

  test('P3 cadence faster than P1', () => {
    const boss = createBossAI(300);
    const p1Cadence = boss.cadence;
    boss.update(0); // 0 hp → P3
    expect(boss.cadence).toBeLessThan(p1Cadence);
  });

  test('hp=0 triggers stageClear callback', () => {
    let cleared = false;
    const boss = createBossAI(300, { onStageClear: () => { cleared = true; } });
    boss.update(0);
    expect(cleared).toBe(true);
  });

  test('stageClear fires only once', () => {
    let count = 0;
    const boss = createBossAI(300, { onStageClear: () => { count++; } });
    boss.update(0);
    boss.update(0);
    expect(count).toBe(1);
  });
});
