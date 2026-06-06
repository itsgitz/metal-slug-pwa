<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { gameState } from '$lib/game/state.svelte.js';
  import { createScene } from '$lib/game/render/scene.js';
  import { createRenderer } from '$lib/game/render/renderer.js';
  import { createGame } from '$lib/game/game.js';
  import { createAudioEngine } from '$lib/game/audio/sfx.js';
  import type { GameInstance } from '$lib/game/game.js';
  import type { SceneContext } from '$lib/game/render/scene.js';
  import type { Renderer } from '$lib/game/render/renderer.js';
  import type { AudioEngine } from '$lib/game/audio/sfx.js';
  import type { Entity } from '$lib/game/types.js';

  let container: HTMLDivElement;
  let game: GameInstance | null = null;
  let sceneCtx: SceneContext | null = null;
  let renderer: Renderer | null = null;
  let audio: AudioEngine | null = null;

  let unsubBus: (() => void) | null = null;
  let muted = false;

  function toggleMute() {
    muted = !muted;
    audio?.setMuted(muted);
    localStorage.setItem('sfx-muted', muted ? '1' : '0');
  }

  function startGame() {
    if (!sceneCtx || !renderer) return;
    const r = renderer;
    const a = audio!;
    a.resume(); // satisfy autoplay policy on first user gesture
    const g = createGame(container, (entities: Entity[], alpha: number, cameraX: number) => {
      r.syncEntities(entities);
      r.renderFrame(entities, alpha, cameraX);
    });
    // subscribe to event bus: wire FX + audio
    unsubBus?.();
    unsubBus = g.subscribe((event) => {
      if (event.type === 'explosion') r.triggerFX(event.x, event.y);
      if (event.type === 'enemy-death') r.triggerFX(event.x, event.y);
      a.play(event);
    });
    game = g;
    g.start();
  }

  function handleRestart() {
    game?.stop();
    game = null;
    startGame();
  }

  function handleResume() {
    startGame();
  }

  onMount(() => {
    sceneCtx = createScene(container);
    renderer = createRenderer(sceneCtx);
    audio = createAudioEngine();
    muted = localStorage.getItem('sfx-muted') === '1';
    audio.setMuted(muted);

    const handleResize = () => {
      if (!container || !sceneCtx) return;
      sceneCtx.resize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  });

  onDestroy(() => {
    unsubBus?.();
    game?.stop();
    audio?.dispose();
    renderer?.dispose();
    sceneCtx?.dispose();
  });

  // Touch button handlers
  function touchPress(action: 'left' | 'right' | 'jump' | 'shoot' | 'grenade') {
    if (!game) return;
    const actions = game.getActions();
    actions[action] = true;
  }

  function touchRelease(action: 'left' | 'right' | 'shoot') {
    if (!game) return;
    const actions = game.getActions();
    actions[action] = false;
  }
</script>

<div class="root">
  <div class="canvas-container" bind:this={container}></div>

  <!-- HUD -->
  {#if gameState.screen === 'playing'}
    <div class="hud">
      <div class="hud-left">
        <span>SCORE: {gameState.score.toString().padStart(7, '0')}</span>
        <span>HI: {gameState.hiScore.toString().padStart(7, '0')}</span>
      </div>
      <div class="hud-center">
        {#if gameState.bossHpMax > 0}
          <div class="boss-bar-wrap">
            <span class="boss-label">BOSS</span>
            <div class="boss-bar">
              <div class="boss-fill" style="width:{(gameState.bossHp / gameState.bossHpMax) * 100}%"></div>
            </div>
          </div>
        {/if}
      </div>
      <div class="hud-right">
        {'♥'.repeat(Math.max(0, gameState.lives))}
        <span class="stage-label">STAGE {gameState.stageIndex + 1}</span>
        <button class="mute-btn" onclick={toggleMute} title="Toggle sound">{muted ? '🔇' : '🔊'}</button>
      </div>
    </div>

    <!-- Touch controls -->
    <div class="touch-controls">
      <div class="dpad">
        <button
          class="btn dpad-left"
          ontouchstart={() => touchPress('left')}
          ontouchend={() => touchRelease('left')}
        >◄</button>
        <button
          class="btn dpad-right"
          ontouchstart={() => touchPress('right')}
          ontouchend={() => touchRelease('right')}
        >►</button>
        <button
          class="btn dpad-up"
          ontouchstart={() => touchPress('jump')}
          ontouchend={() => {}}
        >▲</button>
      </div>
      <div class="action-btns">
        <button
          class="btn btn-grenade"
          ontouchstart={() => touchPress('grenade')}
          ontouchend={() => {}}
        >G</button>
        <button
          class="btn btn-shoot"
          ontouchstart={() => touchPress('shoot')}
          ontouchend={() => touchRelease('shoot')}
        >S</button>
      </div>
    </div>
  {/if}

  <!-- Menu screen -->
  {#if gameState.screen === 'menu'}
    <div class="overlay">
      <h1 class="title">METAL SLUG PWA</h1>
      <p class="subtitle">Run · Gun · Survive</p>
      {#if gameState.hiScore > 0}
        <p class="hi-score">HI-SCORE: {gameState.hiScore.toString().padStart(7, '0')}</p>
      {/if}
      <button class="start-btn" onclick={startGame}>START GAME</button>
      <p class="controls-hint">WASD / Arrows · Z/X Shoot · C Grenade</p>
    </div>
  {/if}

  <!-- Stage clear -->
  {#if gameState.screen === 'stage-clear'}
    <div class="overlay overlay--clear">
      <h2>STAGE CLEAR!</h2>
      <p>Score: {gameState.score.toString().padStart(7, '0')}</p>
      <p>Lives remaining: {gameState.lives}</p>
    </div>
  {/if}

  <!-- Game over -->
  {#if gameState.screen === 'game-over'}
    <div class="overlay overlay--over">
      <h2>GAME OVER</h2>
      <p>Final Score: {gameState.score.toString().padStart(7, '0')}</p>
      <button class="start-btn" onclick={handleRestart}>TRY AGAIN</button>
    </div>
  {/if}

  <!-- Victory -->
  {#if gameState.screen === 'victory'}
    <div class="overlay overlay--victory">
      <h2>MISSION COMPLETE!</h2>
      <p>Score: {gameState.score.toString().padStart(7, '0')}</p>
      <p>HI-SCORE: {gameState.hiScore.toString().padStart(7, '0')}</p>
      <button class="start-btn" onclick={handleRestart}>PLAY AGAIN</button>
    </div>
  {/if}
</div>

<style>
  .root {
    position: fixed;
    inset: 0;
    background: #1a1a2e;
    overflow: hidden;
    font-family: 'Courier New', monospace;
  }

  .canvas-container {
    position: absolute;
    inset: 0;
  }

  .canvas-container :global(canvas) {
    display: block;
    width: 100% !important;
    height: 100% !important;
  }

  /* HUD */
  .hud {
    position: absolute;
    top: 0; left: 0; right: 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 16px;
    background: linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%);
    color: #f0e040;
    font-size: 14px;
    font-weight: bold;
    pointer-events: none;
    z-index: 10;
  }

  .hud-left, .hud-right {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .hud-right {
    align-items: flex-end;
  }

  .stage-label {
    font-size: 11px;
    color: #aaa;
  }

  .mute-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 14px;
    padding: 0;
    pointer-events: all;
  }

  .boss-bar-wrap {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .boss-label {
    font-size: 11px;
    color: #ff4444;
  }

  .boss-bar {
    width: 120px;
    height: 8px;
    background: #333;
    border: 1px solid #666;
    border-radius: 4px;
    overflow: hidden;
  }

  .boss-fill {
    height: 100%;
    background: linear-gradient(to right, #ff2222, #ff8800);
    transition: width 0.1s;
  }

  /* Touch controls */
  .touch-controls {
    position: absolute;
    bottom: 20px;
    left: 0; right: 0;
    display: flex;
    justify-content: space-between;
    padding: 0 20px;
    pointer-events: none;
    z-index: 10;
  }

  @media (pointer: fine) {
    .touch-controls { display: none; }
  }

  .dpad {
    position: relative;
    width: 120px;
    height: 80px;
    pointer-events: all;
  }

  .action-btns {
    display: flex;
    gap: 12px;
    align-items: flex-end;
    pointer-events: all;
  }

  .btn {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    border: 2px solid rgba(255,255,255,0.4);
    background: rgba(0,0,0,0.5);
    color: white;
    font-size: 18px;
    font-weight: bold;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
    touch-action: none;
  }

  .dpad-left { position: absolute; left: 0; top: 12px; }
  .dpad-right { position: absolute; left: 64px; top: 12px; }
  .dpad-up { position: absolute; left: 32px; top: -8px; }

  .btn-shoot { background: rgba(220, 50, 50, 0.7); }
  .btn-grenade { background: rgba(50, 100, 220, 0.7); }

  /* Overlays */
  .overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    background: rgba(0,0,0,0.75);
    color: white;
    text-align: center;
    z-index: 20;
  }

  .title {
    font-size: clamp(2rem, 6vw, 4rem);
    color: #f0e040;
    text-shadow: 0 0 20px #ff8800, 0 2px 4px #000;
    margin: 0;
    letter-spacing: 0.1em;
  }

  .subtitle {
    font-size: 1.1rem;
    color: #aaa;
    margin: 0;
  }

  .hi-score {
    color: #ff8800;
    font-size: 1rem;
    margin: 0;
  }

  .controls-hint {
    font-size: 0.8rem;
    color: #666;
    margin: 0;
  }

  .start-btn {
    padding: 14px 40px;
    font-size: 1.2rem;
    font-family: 'Courier New', monospace;
    font-weight: bold;
    background: #f0e040;
    color: #1a1a2e;
    border: none;
    cursor: pointer;
    letter-spacing: 0.1em;
    transition: transform 0.1s;
  }

  .start-btn:hover {
    transform: scale(1.05);
    background: #ffee66;
  }

  .overlay--clear { background: rgba(0, 50, 0, 0.85); }
  .overlay--clear h2 { color: #44ff44; font-size: 2.5rem; margin: 0; }

  .overlay--over { background: rgba(50, 0, 0, 0.85); }
  .overlay--over h2 { color: #ff4444; font-size: 2.5rem; margin: 0; }

  .overlay--victory { background: rgba(20, 0, 50, 0.9); }
  .overlay--victory h2 { color: #f0e040; font-size: 2.5rem; margin: 0; }
</style>
