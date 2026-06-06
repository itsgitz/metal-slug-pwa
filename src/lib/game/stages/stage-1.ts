import type { StageConfig } from './types.js';

export const stage1: StageConfig = {
  id: 1,
  name: 'Jungle Outpost',
  theme: 'jungle',
  length: 200,
  cameraMinX: 0,
  cameraMaxX: 200,
  ground: [{ x: 0, width: 200, y: 0, height: 1 }],
  platforms: [
    { x: 40, y: 4, width: 15, height: 1 },
    { x: 85, y: 5, width: 10, height: 1 },
    { x: 130, y: 3, width: 20, height: 1 },
  ],
  background: [
    { zDepth: 0, parallaxFactor: 0.2, color: 0x4a7c4e },
    { zDepth: 5, parallaxFactor: 0.5, color: 0x2d5a27 },
  ],
  spawns: [
    { x: 50,  type: 'enemy-soldier', count: 2, formation: 'line' },
    { x: 70,  type: 'enemy-soldier', count: 1, formation: 'line' },
    { x: 90,  type: 'enemy-turret',  count: 1, formation: 'line' },
    { x: 110, type: 'enemy-soldier', count: 2, formation: 'spread' },
    { x: 125, type: 'enemy-soldier', count: 1, formation: 'line' },
    { x: 140, type: 'enemy-drone',   count: 2, formation: 'staggered', altitude: 6 },
    { x: 155, type: 'enemy-soldier', count: 1, formation: 'line' },
  ],
  bossTrigger: { x: 165, lockCamera: true, bossSpawnX: 175, bossSpawnY: 0 },
  endGate: { x: 195, type: 'boss-cleared' },
  bossHp: 300,
};
