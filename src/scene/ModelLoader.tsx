import { useEffect, useRef, useState } from 'react';
import { useLoader, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { normalizeModel } from './normalizeModel';
import { AnimationController } from './AnimationController';

interface ModelLoaderProps {
  url: string;
  format: 'glb' | 'fbx' | 'obj';
  onAnimationsFound?: (clips: THREE.AnimationClip[]) => void;
  onControllerReady?: (controller: AnimationController | null) => void;
}

function GlbModel({ url, onAnimationsFound, onControllerReady }: Omit<ModelLoaderProps, 'format'>) {
  const gltf = useLoader(GLTFLoader, url);
  const [clone, setClone] = useState<THREE.Object3D | null>(null);
  const controllerRef = useRef<AnimationController | null>(null);

  useEffect(() => {
    if (!gltf.scene) return;

    // Use SkeletonUtils.clone — standard clone() doesn't rebind skeletons,
    // so SkinnedMesh would reference bones from the original scene and
    // ignore parent transforms (rotation, scale, position).
    const c = skeletonClone(gltf.scene);
    normalizeModel(c);
    setClone(c);

    if (gltf.animations.length > 0) {
      const controller = new AnimationController(c);
      controller.setClips(gltf.animations);
      controllerRef.current = controller;
      onAnimationsFound?.(gltf.animations);
      onControllerReady?.(controller);

      const names = controller.listAnimations();
      if (names.length > 0) {
        controller.play(names[0]);
      }
    } else {
      controllerRef.current = null;
      onControllerReady?.(null);
    }

    return () => {
      if (controllerRef.current) {
        controllerRef.current.dispose();
        controllerRef.current = null;
        onControllerReady?.(null);
      }
    };
  }, [gltf, onAnimationsFound, onControllerReady]);

  useFrame((_, delta) => {
    controllerRef.current?.update(delta);
  });

  // Use <primitive> so R3F manages matrix updates for the entire subtree
  return clone ? <primitive object={clone} /> : null;
}

function FbxModel({ url, onAnimationsFound, onControllerReady }: Omit<ModelLoaderProps, 'format'>) {
  const [model, setModel] = useState<THREE.Object3D | null>(null);
  const controllerRef = useRef<AnimationController | null>(null);

  useEffect(() => {
    let cancelled = false;
    import('three/examples/jsm/loaders/FBXLoader.js').then(({ FBXLoader }) => {
      if (cancelled) return;
      const loader = new FBXLoader();
      loader.load(url, (fbx) => {
        if (cancelled) return;
        normalizeModel(fbx);
        setModel(fbx);

        if (fbx.animations.length > 0) {
          const controller = new AnimationController(fbx);
          controller.setClips(fbx.animations);
          controllerRef.current = controller;
          onAnimationsFound?.(fbx.animations);
          onControllerReady?.(controller);

          const names = controller.listAnimations();
          if (names.length > 0) {
            controller.play(names[0]);
          }
        }
      });
    });
    return () => {
      cancelled = true;
      if (controllerRef.current) {
        controllerRef.current.dispose();
        controllerRef.current = null;
        onControllerReady?.(null);
      }
    };
  }, [url, onAnimationsFound, onControllerReady]);

  useFrame((_, delta) => {
    controllerRef.current?.update(delta);
  });

  return model ? <primitive object={model} /> : null;
}

function ObjModel({ url }: Omit<ModelLoaderProps, 'format'>) {
  const [model, setModel] = useState<THREE.Object3D | null>(null);

  useEffect(() => {
    let cancelled = false;
    import('three/examples/jsm/loaders/OBJLoader.js').then(({ OBJLoader }) => {
      if (cancelled) return;
      const loader = new OBJLoader();
      loader.load(url, (obj) => {
        if (cancelled) return;
        normalizeModel(obj);
        setModel(obj);
      });
    });
    return () => { cancelled = true; };
  }, [url]);

  return model ? <primitive object={model} /> : null;
}

export function ModelLoader({ url, format, onAnimationsFound, onControllerReady }: ModelLoaderProps) {
  switch (format) {
    case 'glb':
      return <GlbModel url={url} onAnimationsFound={onAnimationsFound} onControllerReady={onControllerReady} />;
    case 'fbx':
      return <FbxModel url={url} onAnimationsFound={onAnimationsFound} onControllerReady={onControllerReady} />;
    case 'obj':
      return <ObjModel url={url} />;
  }
}
