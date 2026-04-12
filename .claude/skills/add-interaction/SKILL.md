---
name: add-interaction
description: Add a new interaction trigger (gesture, wand button, etc.) that maps to a model animation or effect
---

# Add Interaction

Wire up a new input → action mapping for the hologram.

## Steps

1. **Identify the input source**: Ask the user what triggers the action:
   - Camera gesture (wave, point, open palm)
   - Wand button press
   - Wand motion (flick, shake)
   - Touch/click on screen

2. **Identify the action**: What should happen:
   - Play a specific animation clip from the loaded model
   - Trigger a particle effect
   - Change lighting/color
   - Rotate/scale the model

3. **Implementation**:
   - Add the input detection to the appropriate file in `src/input/`
   - Add the action handler in `src/triggers/TriggerManager.ts`
   - Wire the mapping in `src/triggers/triggerConfig.ts`
   - If it's a new animation: use `AnimationController` in `src/scene/`

4. **Test**: Verify in the browser that the trigger fires and the action plays correctly across all 4 views.

## Architecture reference
- Input hooks live in `src/input/` (useTouchControls, useWandBLE, useGestures)
- Trigger mapping lives in `src/triggers/`
- Animation playback uses THREE.AnimationMixer via `src/scene/AnimationController.ts`
