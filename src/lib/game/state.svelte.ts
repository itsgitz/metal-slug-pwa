import type { Screen } from './types.js';

export interface GameState {
  screen: Screen;
  score: number;
  hiScore: number;
  lives: number;
  stageIndex: number;
  bossHp: number;
  bossHpMax: number;
}

export const gameState = $state<GameState>({
  screen: 'menu',
  score: 0,
  hiScore: 0,
  lives: 3,
  stageIndex: 0,
  bossHp: 0,
  bossHpMax: 0,
});

export function setScreen(s: Screen): void {
  if (gameState.screen !== s) gameState.screen = s;
}

export function addScore(points: number): void {
  const next = gameState.score + points;
  if (next !== gameState.score) gameState.score = next;
  if (gameState.score > gameState.hiScore) gameState.hiScore = gameState.score;
}

export function setLives(n: number): void {
  if (gameState.lives !== n) gameState.lives = n;
}

export function setBossHp(hp: number, max?: number): void {
  if (gameState.bossHp !== hp) gameState.bossHp = hp;
  if (max !== undefined && gameState.bossHpMax !== max) gameState.bossHpMax = max;
}

export function advanceStage(): void {
  gameState.stageIndex = gameState.stageIndex + 1;
}

export function resetForStage(stageIndex: number): void {
  gameState.stageIndex = stageIndex;
  gameState.bossHp = 0;
  gameState.bossHpMax = 0;
}
