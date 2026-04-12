---
name: calibrate-prism
description: Adjust the hologram mirror flip and camera-to-face mapping based on how the prism looks physically
---

# Prism Calibration

The user is testing with their physical Pepper's Ghost prism and something looks wrong. Help them fix it.

## Common issues and fixes

### 1. Hologram appears mirrored/flipped
**Fix**: Toggle the horizontal flip in `src/renderer/CompositeShader.ts`.
- Find lines with `localUV.x = 1.0 - localUV.x;`
- Remove the flip for the affected view, or add it if missing

### 2. Front view appears on the wrong prism face
**Fix**: Swap camera positions in `src/renderer/QuadViewRenderer.tsx`.
- The `positions` array maps cameras to views: `[top, right, bottom, left]`
- Camera at `[0,0,d]` (front) feeds the top view
- Camera at `[d,0,0]` (right) feeds the right view
- Camera at `[0,0,-d]` (back) feeds the bottom view
- Camera at `[-d,0,0]` (left) feeds the left view
- Swap entries to reassign which camera feeds which prism face

### 3. Image appears upside down on one face
**Fix**: Toggle the Y-flip in the shader for that specific view.
- Add or remove `localUV.y = 1.0 - localUV.y;` for the affected quadrant

## Steps
1. Ask the user which view(s) look wrong and how
2. Read the current CompositeShader.ts and QuadViewRenderer.tsx
3. Make the targeted fix
4. Tell the user to refresh and check again
