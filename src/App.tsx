import { useState, useCallback, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { QuadViewRenderer } from './renderer/QuadViewRenderer';
import { HologramScene } from './scene/HologramScene';
import { useGestures } from './input/useGestures';
import { TriggerManager } from './triggers/TriggerManager';
import { createDefaultRules } from './triggers/triggerConfig';
import { ModelPicker } from './ui/ModelPicker';
import { ControlPanel } from './ui/ControlPanel';
import { GestureStatus } from './ui/GestureStatus';
import type { AnimationController } from './scene/AnimationController';

/** Runs inside the Canvas to drive rotation via useFrame */
function RotationDriver({
  autoRotate,
  autoRotateSpeed,
  onUpdate,
}: {
  autoRotate: boolean;
  autoRotateSpeed: number;
  onUpdate: (deltaY: number) => void;
}) {
  const autoRotateRef = useRef(autoRotate);
  useEffect(() => { autoRotateRef.current = autoRotate; }, [autoRotate]);

  useFrame((_, delta) => {
    if (autoRotateRef.current) {
      onUpdate(delta * autoRotateSpeed);
    }
  });
  return null;
}

export default function App() {
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [modelFormat, setModelFormat] = useState<'glb' | 'fbx' | 'obj'>('glb');
  const [autoRotate, setAutoRotate] = useState(true);
  const [autoRotateSpeed, setAutoRotateSpeed] = useState(0.3);
  const [gesturesEnabled, setGesturesEnabled] = useState(false);

  const [rotationY, setRotationY] = useState(0);
  const [rotationX, setRotationX] = useState(0);
  const [scaleValue, setScaleValue] = useState(1);
  const [positionX, setPositionX] = useState(0);
  const [positionY, setPositionY] = useState(0);
  const [animationPlaying, setAnimationPlaying] = useState(true);
  const [animationNames, setAnimationNames] = useState<string[]>([]);
  const [activeAnimation, setActiveAnimation] = useState<string | null>(null);

  const triggerManagerRef = useRef(new TriggerManager());

  // Gesture detection
  const { state: gestureState, onGesture, onFrame } = useGestures(gesturesEnabled);

  useEffect(() => {
    onGesture((gesture) => {
      triggerManagerRef.current.handleGesture(gesture, false);
    });
  }, [onGesture]);

  // Continuous per-frame gesture driving:
  //   open_palm → Y rotation mirrors lateral palm movement (waving mirrors hologram)
  //   point     → Y rotation drifts continuously in the pointing direction
  const lastPalmXRef = useRef<number | null>(null);
  useEffect(() => {
    onFrame((gesture, palmX, pointDirX, pointDirY) => {
      if (gesture === 'open_palm') {
        setAutoRotate(false);
        if (lastPalmXRef.current !== null) {
          const delta = palmX - lastPalmXRef.current;
          // 6 rad per full screen-width sweep feels 1:1 with hand movement
          setRotationY((r) => r - delta * 6);
        }
        lastPalmXRef.current = palmX;
      } else if (gesture === 'point') {
        setAutoRotate(false);
        // pointDirX/Y ∈ [-1, 1]: ~3 rad/s at 60 fps with full deflection
        setRotationY((r) => r + pointDirX * 0.05);
        setRotationX((r) => r + pointDirY * 0.05);
        lastPalmXRef.current = null;
      } else if (gesture === 'thumbs_up') {
        // Zoom in — ~1.5× per second at 30 fps detection rate
        setScaleValue((s) => Math.min(5, s * 1.015));
        lastPalmXRef.current = null;
      } else if (gesture === 'thumbs_down') {
        // Zoom out
        setScaleValue((s) => Math.max(0.2, s * (1 / 1.015)));
        lastPalmXRef.current = null;
      } else {
        lastPalmXRef.current = null;
      }
    });
  }, [onFrame]);

  useEffect(() => {
    const tm = triggerManagerRef.current;
    tm.setOnToggleRotate(() => setAutoRotate((prev) => !prev));
    // Set default rules immediately so gestures work even without a model loaded
    tm.setRules(createDefaultRules([]));
  }, []);

  const controllerRef = useRef<AnimationController | null>(null);

  const handleControllerReady = useCallback((controller: AnimationController | null) => {
    controllerRef.current = controller;
    const tm = triggerManagerRef.current;
    tm.setAnimationController(controller);
    // Always update rules from the controller so gestures work regardless of
    // whether the model has animations or not
    const names = controller ? controller.listAnimations() : [];
    tm.setRules(createDefaultRules(names));
    if (controller) {
      setAnimationNames(names);
      setActiveAnimation(names[0] ?? null);
      setAnimationPlaying(true);
    } else {
      setAnimationNames([]);
      setActiveAnimation(null);
      setAnimationPlaying(false);
    }
  }, []);

  const handleModelSelect = useCallback((url: string, format: 'glb' | 'fbx' | 'obj') => {
    if (modelUrl) URL.revokeObjectURL(modelUrl);
    setModelUrl(url);
    setModelFormat(format);
  }, [modelUrl]);

  const handleReset = useCallback(() => {
    if (modelUrl) {
      URL.revokeObjectURL(modelUrl);
      setModelUrl(null);
    }
    setRotationY(0);
    setRotationX(0);
    setScaleValue(1);
    setPositionX(0);
    setPositionY(0);
  }, [modelUrl]);

  // Pointer controls:
  //   Drag = rotate
  //   Shift+drag = pan (move)
  //   Scroll = zoom
  const handlePointerControls = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.type === 'pointerdown' && e.button === 0) {
      const shiftAtStart = e.shiftKey;
      const onMove = (me: PointerEvent) => {
        setAutoRotate(false);
        if (shiftAtStart || me.shiftKey) {
          setPositionX((p) => p + me.movementX * 0.005);
          setPositionY((p) => p - me.movementY * 0.005);
        } else {
          setRotationY((r) => r + me.movementX * 0.005);
          setRotationX((r) => r + me.movementY * 0.005);
        }
      };
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    }
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    setAutoRotate(false);
    setScaleValue((s) => Math.max(0.2, Math.min(5, s * (e.deltaY > 0 ? 0.95 : 1.05))));
  }, []);

  return (
    <>
      <div
        onPointerDown={handlePointerControls}
        onWheel={handleWheel}
        style={{ width: '100vw', height: '100vh' }}
      >
        <Canvas
          gl={{ alpha: false, antialias: true, powerPreference: 'high-performance' }}
          dpr={[1, 1.5]}
          style={{ width: '100%', height: '100%', background: '#000' }}
          frameloop="always"
        >
          <RotationDriver
            autoRotate={autoRotate}
            autoRotateSpeed={autoRotateSpeed}
            onUpdate={(dy) => setRotationY((r) => r + dy)}
          />
          <QuadViewRenderer>
            <HologramScene
              modelUrl={modelUrl}
              modelFormat={modelFormat}
              rotationY={rotationY}
              rotationX={rotationX}
              scaleValue={scaleValue}
              positionX={positionX}
              positionY={positionY}
              onControllerReady={handleControllerReady}
            />
          </QuadViewRenderer>
        </Canvas>
      </div>

      {/* UI overlays */}
      <ModelPicker onModelSelect={handleModelSelect} />
      <GestureStatus
        gestureState={gestureState}
        gesturesEnabled={gesturesEnabled}
        onToggle={() => setGesturesEnabled((v) => !v)}
      />
      <ControlPanel
        autoRotate={autoRotate}
        onAutoRotateChange={setAutoRotate}
        autoRotateSpeed={autoRotateSpeed}
        onAutoRotateSpeedChange={setAutoRotateSpeed}
        animationPlaying={animationPlaying}
        animationNames={animationNames}
        activeAnimation={activeAnimation}
        onAnimationToggle={() => {
          const controller = controllerRef.current;
          if (!controller) return;
          if (animationPlaying) {
            controller.stop();
            setAnimationPlaying(false);
          } else {
            if (activeAnimation) controller.play(activeAnimation);
            setAnimationPlaying(true);
          }
        }}
        onAnimationSelect={(name) => {
          const controller = controllerRef.current;
          if (!controller) return;
          controller.play(name);
          setActiveAnimation(name);
          setAnimationPlaying(true);
        }}
        onReset={handleReset}
        modelLoaded={!!modelUrl}
      />
    </>
  );
}
