---
paths:
  - "src/renderer/CompositeShader.ts"
---

# Composite Shader Rules

- The shader splits the screen into 4 sectors using 45-degree diagonal boundaries
- Each sector maps to one prism face: top (front camera), right, bottom (back camera), left
- All views apply horizontal mirror flip (`localUV.x = 1.0 - localUV.x`) for prism reflection
- The bottom view additionally flips Y so it faces outward
- Pixels outside all 4 view bounds must return `vec4(0.0, 0.0, 0.0, 1.0)` — any non-black bleeds through the prism
- The camera-to-face mapping may need adjustment after physical prism testing
