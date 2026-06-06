import type { ActionMap } from '../types.js';

export function createActionMap(): ActionMap {
  return { left: false, right: false, jump: false, shoot: false, grenade: false };
}

/** Reset one-shot edge flags after each simulation tick. */
export function consumeEdges(actions: ActionMap): void {
  actions.jump = false;
  actions.grenade = false;
}

export class KeyboardAdapter {
  private actions: ActionMap;

  constructor(actions: ActionMap) {
    this.actions = actions;
  }

  keydown(key: string): void {
    switch (key) {
      case 'ArrowLeft': case 'a': this.actions.left = true; break;
      case 'ArrowRight': case 'd': this.actions.right = true; break;
      case 'ArrowUp': case 'w': case ' ': this.actions.jump = true; break;
      case 'z': case 'x': this.actions.shoot = true; break;
      case 'c': this.actions.grenade = true; break;
    }
  }

  keyup(key: string): void {
    switch (key) {
      case 'ArrowLeft': case 'a': this.actions.left = false; break;
      case 'ArrowRight': case 'd': this.actions.right = false; break;
      case 'z': case 'x': this.actions.shoot = false; break;
    }
  }

  attach(target: EventTarget): () => void {
    const down = (e: Event) => this.keydown((e as KeyboardEvent).key);
    const up = (e: Event) => this.keyup((e as KeyboardEvent).key);
    target.addEventListener('keydown', down);
    target.addEventListener('keyup', up);
    return () => {
      target.removeEventListener('keydown', down);
      target.removeEventListener('keyup', up);
    };
  }
}

export class TouchAdapter {
  private actions: ActionMap;
  private held = new Set<string>();

  constructor(actions: ActionMap) {
    this.actions = actions;
  }

  press(button: keyof ActionMap): void {
    this.held.add(button);
    if (button === 'jump' || button === 'grenade') {
      this.actions[button] = true;
    } else {
      this.actions[button] = true;
    }
  }

  release(button: keyof ActionMap): void {
    this.held.delete(button);
    if (button !== 'jump' && button !== 'grenade') {
      this.actions[button] = false;
    }
  }
}
