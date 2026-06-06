import type { SpawnEntry } from '../stages/types.js';

interface SpawnManagerOptions {
  onSpawn(entry: SpawnEntry): void;
}

export interface SpawnManager {
  update(cameraX: number): void;
  reset(spawns: SpawnEntry[]): void;
}

export function createSpawnManager(spawns: SpawnEntry[], options: SpawnManagerOptions): SpawnManager {
  const { onSpawn } = options;
  const pending = new Set<SpawnEntry>(spawns);

  return {
    update(cameraX: number): void {
      for (const spawn of pending) {
        if (cameraX >= spawn.x) {
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
