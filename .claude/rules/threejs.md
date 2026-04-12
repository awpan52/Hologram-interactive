---
paths:
  - "src/renderer/**/*"
  - "src/scene/**/*"
---

# Three.js / R3F Rules

- Always dispose geometries, materials, and render targets in `useEffect` cleanup
- Use `useFrame` for animations — never `requestAnimationFrame` directly
- The render loop is owned by `QuadViewRenderer` via `useFrame` priority 1. Do not add competing render loops.
- Use raw three.js postprocessing (`three/examples/jsm/postprocessing/`), NOT `@react-three/postprocessing`
- When loading models, always run `normalizeModel()` to center and scale them
- Keep all scene content inside the `<scene ref={sceneRef}>` in QuadViewRenderer — anything outside won't be rendered by the 4 cameras
