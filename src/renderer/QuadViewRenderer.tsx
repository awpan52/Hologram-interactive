import { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useThree, useFrame } from '@react-three/fiber';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { useRenderTargets } from './useRenderTargets';
import { computeDiamondLayout } from './diamondLayout';
import { createCompositeMaterial } from './CompositeShader';
import { CAMERA_DISTANCE, BLOOM_DEFAULTS } from '../utils/constants';

/**
 * Takes over the R3F render loop to render the scene from 4 cameras
 * and composite them into a diamond layout for the Pepper's Ghost prism.
 * Uses the R3F root scene directly — children are passed through as a fragment.
 */
export function QuadViewRenderer({ children }: { children: React.ReactNode }) {
  const { gl, size, scene } = useThree();

  const layout = useMemo(
    () => computeDiamondLayout(size.width, size.height),
    [size.width, size.height],
  );

  const targets = useRenderTargets(layout.viewSize);

  const cameras = useMemo(() => {
    const d = CAMERA_DISTANCE;
    const fov = 40;
    const aspect = 1;
    const near = 0.1;
    const far = 100;

    const positions: [number, number, number][] = [
      [0, 0, d],   // front -> top view
      [d, 0, 0],   // right -> right view
      [0, 0, -d],  // back -> bottom view
      [-d, 0, 0],  // left -> left view
    ];

    return positions.map(([x, y, z]) => {
      const cam = new THREE.PerspectiveCamera(fov, aspect, near, far);
      cam.position.set(x, y, z);
      cam.lookAt(0, 0, 0);
      return cam;
    });
  }, []);

  const compositeScene = useMemo(() => new THREE.Scene(), []);
  const compositeCamera = useMemo(
    () => new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0, 1),
    [],
  );
  const compositeMaterial = useMemo(() => createCompositeMaterial(), []);

  useEffect(() => {
    const geometry = new THREE.PlaneGeometry(1, 1);
    const mesh = new THREE.Mesh(geometry, compositeMaterial);
    compositeScene.add(mesh);
    return () => {
      compositeScene.remove(mesh);
      geometry.dispose();
    };
  }, [compositeScene, compositeMaterial]);

  const bloomComposer = useMemo(() => {
    const composer = new EffectComposer(gl);
    composer.addPass(new RenderPass(compositeScene, compositeCamera));
    composer.addPass(new UnrealBloomPass(
      new THREE.Vector2(size.width, size.height),
      BLOOM_DEFAULTS.intensity,
      BLOOM_DEFAULTS.radius,
      BLOOM_DEFAULTS.luminanceThreshold,
    ));
    composer.addPass(new OutputPass());
    return composer;
  }, [gl, compositeScene, compositeCamera, size.width, size.height]);

  useEffect(() => {
    bloomComposer.setSize(size.width, size.height);
  }, [bloomComposer, size.width, size.height]);

  useEffect(() => {
    return () => { bloomComposer.dispose(); };
  }, [bloomComposer]);

  useEffect(() => {
    compositeMaterial.uniforms.uScreenSize.value.set(size.width, size.height);
    compositeMaterial.uniforms.uViewSize.value = layout.viewSize;
    compositeMaterial.uniforms.uViewTop.value = targets[0].texture;
    compositeMaterial.uniforms.uViewRight.value = targets[1].texture;
    compositeMaterial.uniforms.uViewBottom.value = targets[2].texture;
    compositeMaterial.uniforms.uViewLeft.value = targets[3].texture;
  }, [compositeMaterial, targets, layout, size]);

  useFrame(() => {
    const currentRenderTarget = gl.getRenderTarget();
    const currentAutoClear = gl.autoClear;
    gl.autoClear = true;

    for (let i = 0; i < 4; i++) {
      gl.setRenderTarget(targets[i]);
      gl.setClearColor(0x000000, 1);
      gl.clear();
      gl.render(scene, cameras[i]);
    }

    gl.setRenderTarget(null);
    bloomComposer.render();

    gl.setRenderTarget(currentRenderTarget);
    gl.autoClear = currentAutoClear;
  }, 1);

  return <>{children}</>;
}
