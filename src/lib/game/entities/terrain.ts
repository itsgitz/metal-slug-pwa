import type { Entity } from '../types.js';
import type { GroundSegment, Platform } from '../stages/types.js';

let nextId = 9000;

export interface TerrainEntity extends Entity {
  type: 'terrain';
  terrainKind: 'ground' | 'platform';
}

export function createGround(seg: GroundSegment): TerrainEntity {
  return {
    id: nextId++,
    type: 'terrain',
    terrainKind: 'ground',
    x: seg.x,
    y: seg.y,
    vx: 0, vy: 0,
    w: seg.width,
    h: seg.height,
    alive: true,
    mesh: null,
    update() {},
  };
}

export function createPlatform(p: Platform): TerrainEntity {
  return {
    id: nextId++,
    type: 'terrain',
    terrainKind: 'platform',
    x: p.x,
    y: p.y,
    vx: 0, vy: 0,
    w: p.width,
    h: p.height,
    alive: true,
    mesh: null,
    update() {},
  };
}
