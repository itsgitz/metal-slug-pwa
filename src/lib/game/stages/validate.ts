import type { StageConfig } from './types.js';

export function validateStage(config: StageConfig): void {
  const { length, cameraMaxX, spawns, bossTrigger, endGate, platforms } = config;

  if (cameraMaxX !== length) {
    throw new Error(`cameraMaxX (${cameraMaxX}) must equal length (${length})`);
  }

  for (const spawn of spawns) {
    if (spawn.x >= bossTrigger.x) {
      throw new Error(`spawn at x=${spawn.x} must be before bossTrigger.x=${bossTrigger.x}`);
    }
  }

  if (bossTrigger.x >= endGate.x) {
    throw new Error(`bossTrigger.x (${bossTrigger.x}) must be less than endGate.x (${endGate.x})`);
  }

  if (endGate.x >= length) {
    throw new Error(`endGate.x (${endGate.x}) must be less than length (${length})`);
  }

  for (const p of platforms) {
    if (p.x + p.width > length) {
      throw new Error(`platform at x=${p.x} with width=${p.width} exceeds stage length=${length}`);
    }
  }
}
