import { test, expect, describe } from 'bun:test';
import { validateStage } from './validate.js';
import type { StageConfig } from './types.js';
import { stage1 } from './stage-1.js';
import { stage2 } from './stage-2.js';

function baseConfig(): StageConfig {
  return {
    id: 1,
    name: 'Test',
    length: 200,
    cameraMinX: 0,
    cameraMaxX: 200,
    ground: [{ x: 0, width: 200, y: 0, height: 1 }],
    platforms: [],
    background: [],
    spawns: [{ x: 30, type: 'enemy-soldier', count: 1, formation: 'line' }],
    bossTrigger: { x: 165, lockCamera: true, bossSpawnX: 175, bossSpawnY: 0 },
    endGate: { x: 195, type: 'boss-cleared' },
    bossHp: 300,
  };
}

describe('validateStage() invariants', () => {
  test('valid config passes', () => {
    expect(() => validateStage(baseConfig())).not.toThrow();
  });

  test('spawn.x >= bossTrigger.x → error', () => {
    const c = baseConfig();
    c.spawns = [{ x: 170, type: 'enemy-soldier', count: 1, formation: 'line' }];
    expect(() => validateStage(c)).toThrow(/spawn.*boss/i);
  });

  test('endGate.x >= length → error', () => {
    const c = baseConfig();
    c.endGate.x = 200;
    expect(() => validateStage(c)).toThrow(/endGate/i);
  });

  test('bossTrigger.x >= endGate.x → error', () => {
    const c = baseConfig();
    c.bossTrigger.x = 196;
    expect(() => validateStage(c)).toThrow(/boss.*trigger|bossTrigger/i);
  });

  test('platform out of bounds → error', () => {
    const c = baseConfig();
    c.platforms = [{ x: 190, y: 3, width: 20, height: 1 }]; // 190+20=210 > 200
    expect(() => validateStage(c)).toThrow(/platform/i);
  });

  test('cameraMaxX !== length → error', () => {
    const c = baseConfig();
    c.cameraMaxX = 199;
    expect(() => validateStage(c)).toThrow(/cameraMaxX/i);
  });
});

describe('real stage configs', () => {
  test('stage 1 passes validation', () => {
    expect(() => validateStage(stage1)).not.toThrow();
  });
  test('stage 2 passes validation', () => {
    expect(() => validateStage(stage2)).not.toThrow();
  });
});
