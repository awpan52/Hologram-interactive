import { useEffect, useRef, useState, useCallback } from 'react';
import {
  GestureRecognizer,
  FilesetResolver,
} from '@mediapipe/tasks-vision';
import {
  classifyGesture,
  WaveDetector,
  type GestureName,
} from './gestureClassifier';

export interface GestureState {
  gesture: GestureName;
  isWaving: boolean;
  isActive: boolean;    // camera feed is running
  isLoading: boolean;   // MediaPipe model loading
  error: string | null;
}

const INITIAL_STATE: GestureState = {
  gesture: 'none',
  isWaving: false,
  isActive: false,
  isLoading: false,
  error: null,
};

export function useGestures(enabled: boolean) {
  const [state, setState] = useState<GestureState>(INITIAL_STATE);
  const recognizerRef = useRef<GestureRecognizer | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const waveDetectorRef = useRef(new WaveDetector());
  const lastGestureRef = useRef<GestureName>('none');
  const gestureCallbackRef = useRef<((gesture: GestureName, isWave: boolean) => void) | null>(null);

  const onGesture = useCallback((cb: (gesture: GestureName, isWave: boolean) => void) => {
    gestureCallbackRef.current = cb;
  }, []);

  useEffect(() => {
    if (!enabled) {
      // Clean up if disabled
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
        // Initialize MediaPipe
        const vision = await FilesetResolver.forVisionTasks(
          // Use CDN for WASM files — more reliable than bundling
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm',
        );

        if (cancelled) return;

        const recognizer = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 1,
        });

        if (cancelled) return;
        recognizerRef.current = recognizer;

        // Get camera feed
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 640, height: 480 },
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        // Create hidden video element
        const video = document.createElement('video');
        video.srcObject = stream;
        video.playsInline = true;
        video.muted = true;
        video.style.display = 'none';
        document.body.appendChild(video);
        await video.play();
        videoRef.current = video;

        setState((s) => ({ ...s, isLoading: false, isActive: true }));

        // Detection loop
        let lastTime = -1;
        function detect() {
          if (cancelled) return;

          const video = videoRef.current;
          const recognizer = recognizerRef.current;
          if (!video || !recognizer || video.readyState < 2) {
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
            const results = recognizer.recognizeForVideo(video, now);

            if (results.landmarks && results.landmarks.length > 0) {
              const landmarks = results.landmarks[0];
              const gesture = classifyGesture(landmarks);
              const palmX = landmarks[0].x; // wrist X as palm position
              const isWave = waveDetectorRef.current.update(palmX, gesture === 'open_palm');

              // Only fire callback on gesture change or wave detection
              if (gesture !== lastGestureRef.current || isWave) {
                lastGestureRef.current = gesture;
                setState((s) => ({ ...s, gesture, isWaving: isWave }));
                if (gestureCallbackRef.current) {
                  gestureCallbackRef.current(gesture, isWave);
                }
              }
            } else {
              if (lastGestureRef.current !== 'none') {
                lastGestureRef.current = 'none';
                waveDetectorRef.current.reset();
                setState((s) => ({ ...s, gesture: 'none', isWaving: false }));
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
      if (recognizerRef.current) {
        recognizerRef.current.close();
        recognizerRef.current = null;
      }
    };
  }, [enabled]);

  return { state, onGesture };
}
