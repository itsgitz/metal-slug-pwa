import type { EntityType } from '../types.js';

export interface GroundSegment {
  x: number;
  width: number;
  y: number;
  height: number;
}

export interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BackgroundLayer {
  zDepth: number;
  parallaxFactor: number;
  color: number;
}

export type Formation = 'line' | 'spread' | 'staggered';

export interface SpawnEntry {
  x: number;
  type: EntityType;
  count: number;
  formation: Formation;
  patrolRange?: number;
  altitude?: number;
}

export interface BossTrigger {
  x: number;
  lockCamera: boolean;
  bossSpawnX: number;
  bossSpawnY: number;
}

export interface EndGate {
  x: number;
  type: 'reach' | 'boss-cleared';
}

export type StageTheme = 'jungle' | 'industrial';

export interface StageConfig {
  id: number;
  name: string;
  theme: StageTheme;
  length: number;
  cameraMinX: number;
  cameraMaxX: number;
  ground: GroundSegment[];
  platforms: Platform[];
  background: BackgroundLayer[];
  spawns: SpawnEntry[];
  bossTrigger: BossTrigger;
  endGate: EndGate;
  bossHp: number;
}
