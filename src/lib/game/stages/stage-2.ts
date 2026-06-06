import type { StageConfig } from './types.js';

export const stage2: StageConfig = {
  id: 2,
  name: 'Industrial Fortress',
  length: 250,
  cameraMinX: 0,
  cameraMaxX: 250,
  ground: [
    { x: 0,   width: 100, y: 0, height: 1 },
    { x: 115, width: 135, y: 0, height: 1 },
  ],
  platforms: [
    { x: 60,  y: 4,  width: 12, height: 1 },
    { x: 100, y: 3,  width: 10, height: 1 }, // over pit
    { x: 145, y: 6,  width: 15, height: 1 },
    { x: 170, y: 4,  width: 8,  height: 1 },
  ],
  background: [
    { zDepth: 0, parallaxFactor: 0.2, color: 0x2a2a3e },
    { zDepth: 5, parallaxFactor: 0.5, color: 0x1a1a2e },
  ],
  spawns: [
    { x: 40,  type: 'enemy-soldier', count: 2, formation: 'line' },
    { x: 55,  type: 'enemy-turret',  count: 1, formation: 'line' },
    { x: 90,  type: 'enemy-drone',   count: 1, formation: 'line', altitude: 8 },
    { x: 100, type: 'enemy-turret',  count: 1, formation: 'line' },
    { x: 110, type: 'enemy-soldier', count: 2, formation: 'spread' },
    { x: 140, type: 'enemy-drone',   count: 2, formation: 'staggered' },
    { x: 150, type: 'enemy-turret',  count: 1, formation: 'line' },
    { x: 160, type: 'enemy-soldier', count: 1, formation: 'line' },
    { x: 190, type: 'enemy-soldier', count: 2, formation: 'spread' },
  ],
  bossTrigger: { x: 210, lockCamera: true, bossSpawnX: 220, bossSpawnY: 0 },
  endGate: { x: 245, type: 'boss-cleared' },
  bossHp: 500,
};
