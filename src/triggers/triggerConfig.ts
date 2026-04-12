import type { TriggerRule } from './TriggerManager';

/**
 * Default trigger rules mapping gestures to actions.
 * These are the "pre-canned" triggers for Phase 2.
 *
 * When a model has animations, the first animation is used as the
 * default for gesture triggers. Users can customize this later.
 */
export function createDefaultRules(animationNames: string[]): TriggerRule[] {
  const rules: TriggerRule[] = [];

  // Wave → play first animation once (e.g., a wave-back animation)
  if (animationNames.length > 0) {
    rules.push({
      gesture: 'wave',
      action: { type: 'play_animation_once', animation: animationNames[0] },
      cooldownMs: 2000,
    });
  }

  // Point → play second animation if available, otherwise toggle rotation
  if (animationNames.length > 1) {
    rules.push({
      gesture: 'point',
      action: { type: 'play_animation_once', animation: animationNames[1] },
      cooldownMs: 1500,
    });
  } else {
    rules.push({
      gesture: 'point',
      action: { type: 'toggle_rotate' },
      cooldownMs: 1000,
    });
  }

  // Open palm → stop animation / pause
  rules.push({
    gesture: 'open_palm',
    action: { type: 'toggle_rotate' },
    cooldownMs: 1500,
  });

  // Fist → play last animation if multiple available
  if (animationNames.length > 2) {
    rules.push({
      gesture: 'fist',
      action: { type: 'play_animation_once', animation: animationNames[animationNames.length - 1] },
      cooldownMs: 1500,
    });
  }

  return rules;
}
