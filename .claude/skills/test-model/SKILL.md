---
name: test-model
description: Download a sample GLB model and verify it loads correctly in the hologram viewer
---

# Test Model Loading

Download a sample 3D model and verify the full pipeline works: loading → normalization → quad-view rendering.

## Steps

1. Check if there are any models in `public/models/`
2. If none, suggest the user drop a GLB file via the upload UI, or use one of these free test models:
   - A simple geometric shape (cube, sphere) for basic testing
   - An animated character model to test animation detection
3. Read `src/scene/ModelLoader.tsx` and `src/scene/normalizeModel.ts` to understand the pipeline
4. If there are loading errors, debug by:
   - Checking the browser console for three.js loader errors
   - Verifying the file format (GLB vs glTF vs FBX vs OBJ)
   - Checking if the model has unusual scale/origin that breaks normalization
5. Report what works and what needs fixing
