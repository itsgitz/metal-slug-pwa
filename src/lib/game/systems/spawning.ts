import type { SpawnEntry } from '../stages/types.js';

interface SpawnManagerOptions {
  onSpawn(entry: SpawnEntry): void;
  halfView?: number;
  margin?: number;
}

export interface SpawnManager {
  update(cameraX: number): void;
  reset(spawns: SpawnEntry[]): void;
}

export function createSpawnManager(spawns: SpawnEntry[], options: SpawnManagerOptions): SpawnManager {
  const { onSpawn, halfView = 0, margin = 0 } = options;
  const pending = new Set<SpawnEntry>(spawns);

  return {
    update(cameraX: number): void {
      const rightEdge = cameraX + halfView + margin;
      for (const spawn of pending) {
        if (spawn.x <= rightEdge) {
          onSpawn(spawn);
          pending.delete(spawn);
        }
      }
    },

    reset(newSpawns: SpawnEntry[]): void {
      pending.clear();
      for (const s of newSpawns) pending.add(s);
    },
  };
}
