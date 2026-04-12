import { useEffect, useRef, useState, useCallback } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import {
  classifyGesture,
  getPointingDirection,
  type GestureName,
} from './gestureClassifier';

export interface GestureState {
  gesture: GestureName;
  isActive: boolean;    // camera feed is running
  isLoading: boolean;   // MediaPipe model loading
  error: string | null;
}

const INITIAL_STATE: GestureState = {
  gesture: 'none',
  isActive: false,
  isLoading: false,
  error: null,
};

const TASKS_VISION_VERSION = '0.10.34';

export function useGestures(enabled: boolean) {
  const [state, setState] = useState<GestureState>(INITIAL_STATE);
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const lastGestureRef = useRef<GestureName>('none');
  const gestureCallbackRef = useRef<((gesture: GestureName) => void) | null>(null);
  const frameCallbackRef = useRef<((gesture: GestureName, palmX: number, pointDirX: number, pointDirY: number) => void) | null>(null);

  const onGesture = useCallback((cb: (gesture: GestureName) => void) => {
    gestureCallbackRef.current = cb;
  }, []);

  /** Called every detection frame with the current gesture + raw position data.
   *  Use this for continuous effects like rotation mirroring. */
  const onFrame = useCallback((cb: (gesture: GestureName, palmX: number, pointDirX: number, pointDirY: number) => void) => {
    frameCallbackRef.current = cb;
  }, []);

  useEffect(() => {
    if (!enabled) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setState(INITIAL_STATE);
      return;
    }

    let cancelled = false;

    async function init() {
      setState((s) => ({ ...s, isLoading: true, error: null }));

      try {
        const vision = await FilesetResolver.forVisionTasks(
          `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VISION_VERSION}/wasm`,
        );

        if (cancelled) return;

        // HandLandmarker + hand_landmarker.task — GestureRecognizer expects gesture_recognizer.task instead.
        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 1,
        });

        if (cancelled) return;
        landmarkerRef.current = landmarker;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 640, height: 480 },
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        const video = document.createElement('video');
        video.srcObject = stream;
        video.playsInline = true;
        video.muted = true;
        video.style.display = 'none';
        document.body.appendChild(video);
        await video.play();
        videoRef.current = video;

        setState((s) => ({ ...s, isLoading: false, isActive: true }));

        let lastTime = -1;
        function detect() {
          if (cancelled) return;

          const video = videoRef.current;
          const landmarker = landmarkerRef.current;
          if (!video || !landmarker || video.readyState < 2) {
            rafRef.current = requestAnimationFrame(detect);
            return;
          }

          const now = performance.now();
          if (now === lastTime) {
            rafRef.current = requestAnimationFrame(detect);
            return;
          }
          lastTime = now;

          try {
            const results = landmarker.detectForVideo(video, now);

            if (results.landmarks && results.landmarks.length > 0) {
              const landmarks = results.landmarks[0];
              const gesture = classifyGesture(landmarks);
              const palmX = landmarks[0].x;
              const { x: pointDirX, y: pointDirY } = getPointingDirection(landmarks);

              // Continuous per-frame callback — drives rotation mirroring and pointing
              frameCallbackRef.current?.(gesture, palmX, pointDirX, pointDirY);

              // Discrete callback on gesture change only
              if (gesture !== lastGestureRef.current) {
                lastGestureRef.current = gesture;
                setState((s) => ({ ...s, gesture }));
                gestureCallbackRef.current?.(gesture);
              }
            } else {
              frameCallbackRef.current?.('none', 0, 0, 0);
              if (lastGestureRef.current !== 'none') {
                lastGestureRef.current = 'none';
                setState((s) => ({ ...s, gesture: 'none' }));
              }
            }
          } catch {
            // Frame processing can occasionally fail — just skip
          }

          rafRef.current = requestAnimationFrame(detect);
        }

        rafRef.current = requestAnimationFrame(detect);
      } catch (err) {
        if (!cancelled) {
          setState((s) => ({
            ...s,
            isLoading: false,
            error: err instanceof Error ? err.message : 'Failed to initialize gesture detection',
          }));
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.remove();
        videoRef.current = null;
      }
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
        landmarkerRef.current = null;
      }
    };
  }, [enabled]);

  return { state, onGesture, onFrame };
}
