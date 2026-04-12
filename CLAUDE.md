# Hologram Interactive

Pepper's Ghost hologram viewer. Renders 3D models from 4 camera angles in a diamond layout, reflected through a 4-sided pyramid prism to create a hologram illusion.

## Tech Stack

- **Build**: Vite + React + TypeScript
- **3D**: Three.js 0.183.2 + React Three Fiber 9 + drei 10
- **Effects**: Raw three.js postprocessing (NOT @react-three/postprocessing — conflicts with custom render loop)
- **Target**: iPad Safari (primary), desktop Chrome (dev), eventually mobile via Capacitor

## Commands

```bash
npm run dev          # Vite dev server on http://localhost:3000
npm run build        # Production build to dist/
npx tsc --noEmit     # Type-check without emitting
```

## Architecture

The app has one custom render loop that replaces R3F's default rendering:

1. **4 PerspectiveCamera** instances at 0°/90°/180°/270° around the model
2. Each renders to a **WebGLRenderTarget** (sized to `min(W,H)/2`, not full screen)
3. A **custom GLSL shader** composites the 4 textures into a diamond layout with:
   - 45-degree diagonal boundaries between views (matches prism geometry)
   - Horizontal mirror flip per view (prism reflection)
4. **UnrealBloomPass** applied to the composite for holographic glow

### Key files

- `src/renderer/QuadViewRenderer.tsx` — owns the render loop (`useFrame` priority 1)
- `src/renderer/CompositeShader.ts` — GLSL diamond layout + mirror flip
- `src/renderer/diamondLayout.ts` — view size/position math
- `src/scene/normalizeModel.ts` — auto-centers and scales any model to fit
- `src/scene/ModelLoader.tsx` — unified GLB/FBX/OBJ loading (FBX/OBJ via dynamic import)
- `src/input/useTouchControls.ts` — pointer drag rotate, pinch/scroll zoom

### Interaction model

Rotation and scale are driven as **React state** passed as declarative props to the `<group>`. This is required because R3F v9 sets `matrixAutoUpdate=false` on managed objects, so imperative `.rotation.y` changes are not picked up by the renderer. Auto-rotate runs in a `useFrame` that calls `setRotationY()`.

### Model loading

Models are loaded via `useLoader(GLTFLoader)`, cloned with **`SkeletonUtils.clone()`** (NOT `Object3D.clone()`), normalized, then rendered via `<primitive>`. The `SkeletonUtils.clone` is critical — standard clone doesn't rebind skeletons, so SkinnedMesh models ignore parent transforms entirely.

## Important constraints

- **MUST use `SkeletonUtils.clone()`** for GLTF models — standard `clone()` breaks SkinnedMesh parent transforms.
- **MUST use declarative R3F props** for transforms — imperative `.rotation.y` changes are invisible due to R3F v9's matrix management.
- **MUST use `<primitive>`** to add loaded models — imperatively added objects don't get R3F matrix updates.
- **Do NOT use `@react-three/postprocessing`** — it fights the custom render loop. Use raw three.js `EffectComposer`/`UnrealBloomPass` from `three/examples/jsm/postprocessing/`.
- **Render targets must be sized to view size** (`min(W,H)/2`), not full screen. DPR capped at 1.5 to avoid iPad memory issues.
- **Background must be pure black** — `gl={{ alpha: false }}`, clear color `0x000000`. Any non-black leaks through the prism.
- **FBX/OBJ loaders use dynamic `import()`** — they're large and should only load on demand.

## Prism calibration (not yet validated)

The mirror flip direction and camera-to-face mapping have NOT been tested with the physical prism. If the hologram looks wrong:
- Toggle `localUV.x = 1.0 - localUV.x` per view in `CompositeShader.ts`
- Swap camera order in `QuadViewRenderer.tsx` (the `positions` array)
