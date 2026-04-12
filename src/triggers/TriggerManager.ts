import type { GestureName } from '../input/gestureClassifier';
import type { AnimationController } from '../scene/AnimationController';

export interface TriggerAction {
  type: 'play_animation' | 'play_animation_once' | 'stop_animation' | 'toggle_rotate' | 'effect';
  animation?: string;
  effect?: string;
}

export interface TriggerRule {
  gesture: GestureName | 'wave';
  action: TriggerAction;
  cooldownMs?: number;
}

/**
 * Maps input events (gestures, wand buttons) to actions (animations, effects).
 * Supports cooldowns to prevent rapid re-triggering.
 */
export class TriggerManager {
  private rules: TriggerRule[] = [];
  private lastTriggered: Map<string, number> = new Map();
  private animController: AnimationController | null = null;
  private effectCallbacks: Map<string, () => void> = new Map();
  private onToggleRotate: (() => void) | null = null;

  setAnimationController(controller: AnimationController | null): void {
    this.animController = controller;
  }

  setRules(rules: TriggerRule[]): void {
    this.rules = rules;
  }

  setEffectCallback(name: string, cb: () => void): void {
    this.effectCallbacks.set(name, cb);
  }

  setOnToggleRotate(cb: () => void): void {
    this.onToggleRotate = cb;
  }

  /** Process a detected gesture and fire matching triggers */
  handleGesture(gesture: GestureName, isWave: boolean): void {
    const now = Date.now();

    for (const rule of this.rules) {
      // Match wave separately since it's a compound gesture
      const matches =
        (rule.gesture === 'wave' && isWave) ||
        (rule.gesture === gesture && rule.gesture !== 'wave');

      if (!matches) continue;

      // Check cooldown
      const key = `${rule.gesture}:${rule.action.type}:${rule.action.animation ?? ''}`;
      const lastTime = this.lastTriggered.get(key) ?? 0;
      const cooldown = rule.cooldownMs ?? 1000;
      if (now - lastTime < cooldown) continue;

      this.lastTriggered.set(key, now);
      this.executeAction(rule.action);
    }
  }

  private executeAction(action: TriggerAction): void {
    switch (action.type) {
      case 'play_animation':
        if (action.animation && this.animController) {
          this.animController.play(action.animation);
        }
        break;

      case 'play_animation_once':
        if (action.animation && this.animController) {
          this.animController.playOnce(action.animation);
        }
        break;

      case 'stop_animation':
        this.animController?.stop();
        break;

      case 'toggle_rotate':
        this.onToggleRotate?.();
        break;

      case 'effect':
        if (action.effect) {
          this.effectCallbacks.get(action.effect)?.();
        }
        break;
    }
  }
}
