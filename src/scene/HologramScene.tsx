import { Suspense } from 'react';
import { ModelLoader } from './ModelLoader';
import type { AnimationController } from './AnimationController';

interface HologramSceneProps {
  modelUrl: string | null;
  modelFormat: 'glb' | 'fbx' | 'obj';
  rotationY: number;
  rotationX: number;
  scaleValue: number;
  positionX: number;
  positionY: number;
  onAnimationsFound?: (clips: THREE.AnimationClip[]) => void;
  onControllerReady?: (controller: AnimationController | null) => void;
}

function DemoCube() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#4488ff" emissive="#1144aa" emissiveIntensity={0.3} />
    </mesh>
  );
}

export function HologramScene({
  modelUrl,
  modelFormat,
  rotationY,
  rotationX,
  scaleValue,
  positionX,
  positionY,
  onAnimationsFound,
  onControllerReady,
}: HologramSceneProps) {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[3, 5, 2]} intensity={1.0} />
      <directionalLight position={[-3, 2, -2]} intensity={0.5} color="#88aaff" />
      <pointLight position={[0, 3, 0]} intensity={0.8} color="#66bbff" />

      {/* Model container — rotation/scale driven by React state */}
      <group
        name="model-pivot"
        position={[positionX, positionY, 0]}
        rotation={[rotationX, rotationY, 0]}
        scale={[scaleValue, scaleValue, scaleValue]}
      >
        <Suspense fallback={null}>
          {modelUrl ? (
            <ModelLoader
              url={modelUrl}
              format={modelFormat}
              onAnimationsFound={onAnimationsFound}
              onControllerReady={onControllerReady}
            />
          ) : (
            <DemoCube />
          )}
        </Suspense>
      </group>
    </>
  );
}
