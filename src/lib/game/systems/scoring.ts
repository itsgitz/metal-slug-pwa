import type { EntityType } from '../types.js';

const HI_SCORE_KEY = 'metalSlugPwa:hiScore';

const KILL_POINTS: Partial<Record<EntityType, number>> = {
  'enemy-soldier': 100,
  'enemy-turret': 200,
  'enemy-drone': 150,
};

interface Storage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export class Scoring {
  score = 0;
  lives: number;
  private storage: Storage;

  constructor(initialLives: number, storage?: Storage) {
    this.lives = initialLives;
    this.storage = storage ?? (typeof localStorage !== 'undefined' ? localStorage : { getItem: () => null, setItem: () => {} });
  }

  onEnemyKilled(type: EntityType): void {
    this.score += KILL_POINTS[type] ?? 0;
  }

  onBossHit(): void {
    this.score += 50;
  }

  onBossKilled(): void {
    this.score += 5000;
  }

  onStageClear(): void {
    this.score += 1000 * this.lives;
  }

  onPlayerHit(): { gameOver: boolean } {
    this.lives = Math.max(0, this.lives - 1);
    return { gameOver: this.lives === 0 };
  }

  loadHiScore(): number {
    try {
      const raw = this.storage.getItem(HI_SCORE_KEY);
      return raw ? parseInt(raw, 10) : 0;
    } catch {
      return 0;
    }
  }

  saveHiScore(): void {
    try {
      const hi = this.loadHiScore();
      if (this.score > hi) {
        this.storage.setItem(HI_SCORE_KEY, String(this.score));
      }
    } catch {
      // storage unavailable — fail silently
    }
  }
}
