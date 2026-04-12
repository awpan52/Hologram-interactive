import type { TriggerRule } from './TriggerManager';

/**
 * Default trigger rules mapping gestures to discrete actions.
 * open_palm and point are handled as continuous rotation drivers in App.tsx
 * and do not need TriggerManager rules.
 */
export function createDefaultRules(_animationNames: string[]): TriggerRule[] {
  return [];
}
