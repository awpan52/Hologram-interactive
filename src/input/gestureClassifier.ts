/**
 * Classifies hand landmarks from MediaPipe into discrete gestures.
 * Uses simple heuristics on landmark distances — no ML needed.
 *
 * MediaPipe hand landmarks (21 points):
 *  0: wrist
 *  1-4: thumb (CMC, MCP, IP, TIP)
 *  5-8: index finger (MCP, PIP, DIP, TIP)
 *  9-12: middle finger
 *  13-16: ring finger
 *  17-20: pinky
 */

export type GestureName = 'wave' | 'point' | 'open_palm' | 'fist' | 'thumbs_up' | 'none';

interface Landmark {
  x: number;
  y: number;
  z: number;
}

// Finger tip and PIP (proximal interphalangeal) indices
const FINGER_TIPS = [8, 12, 16, 20]; // index, middle, ring, pinky tips
const FINGER_PIPS = [6, 10, 14, 18]; // corresponding PIPs
const THUMB_TIP = 4;
const THUMB_IP = 3;
const WRIST = 0;
const INDEX_MCP = 5;
const PINKY_MCP = 17;

function dist(a: Landmark, b: Landmark): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/** Check if a finger is extended (tip further from wrist than PIP) */
function isFingerExtended(landmarks: Landmark[], tipIdx: number, pipIdx: number): boolean {
  const wrist = landmarks[WRIST];
  return dist(landmarks[tipIdx], wrist) > dist(landmarks[pipIdx], wrist);
}

function isThumbExtended(landmarks: Landmark[]): boolean {
  return dist(landmarks[THUMB_TIP], landmarks[WRIST]) >
    dist(landmarks[THUMB_IP], landmarks[WRIST]);
}

function countExtendedFingers(landmarks: Landmark[]): number {
  let count = 0;
  for (let i = 0; i < FINGER_TIPS.length; i++) {
    if (isFingerExtended(landmarks, FINGER_TIPS[i], FINGER_PIPS[i])) count++;
  }
  return count;
}

/**
 * Classify a single frame of hand landmarks into a gesture.
 */
export function classifyGesture(landmarks: Landmark[]): GestureName {
  if (landmarks.length < 21) return 'none';

  const extendedFingers = countExtendedFingers(landmarks);
  const thumbOut = isThumbExtended(landmarks);
  const indexExtended = isFingerExtended(landmarks, 8, 6);
  const middleExtended = isFingerExtended(landmarks, 12, 10);
  const ringExtended = isFingerExtended(landmarks, 16, 14);
  const pinkyExtended = isFingerExtended(landmarks, 20, 18);

  // Open palm: all 4 fingers + thumb extended
  if (extendedFingers >= 4 && thumbOut) {
    return 'open_palm';
  }

  // Point: only index finger extended
  if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
    return 'point';
  }

  // Thumbs up: thumb extended, all fingers closed
  if (thumbOut && extendedFingers === 0) {
    // Check thumb is above the hand (pointing up)
    if (landmarks[THUMB_TIP].y < landmarks[WRIST].y) {
      return 'thumbs_up';
    }
  }

  // Fist: no fingers extended, thumb tucked
  if (extendedFingers === 0 && !thumbOut) {
    return 'fist';
  }

  return 'none';
}

/**
 * Wave detector — tracks palm position over time.
 * A wave is rapid lateral movement of an open palm.
 */
export class WaveDetector {
  private history: { x: number; time: number }[] = [];
  private readonly WINDOW_MS = 1000;
  private readonly MIN_REVERSALS = 2;
  private readonly MIN_AMPLITUDE = 0.05; // fraction of frame width

  update(palmX: number, isOpenPalm: boolean): boolean {
    const now = Date.now();

    // Only track when palm is open
    if (!isOpenPalm) {
      this.history = [];
      return false;
    }

    this.history.push({ x: palmX, time: now });

    // Trim old entries
    this.history = this.history.filter((h) => now - h.time < this.WINDOW_MS);

    if (this.history.length < 4) return false;

    // Count direction reversals with sufficient amplitude
    let reversals = 0;
    let lastDirection = 0;

    for (let i = 1; i < this.history.length; i++) {
      const dx = this.history[i].x - this.history[i - 1].x;
      if (Math.abs(dx) < this.MIN_AMPLITUDE * 0.1) continue;

      const direction = dx > 0 ? 1 : -1;
      if (lastDirection !== 0 && direction !== lastDirection) {
        reversals++;
      }
      lastDirection = direction;
    }

    // Also check total sweep amplitude
    const xs = this.history.map((h) => h.x);
    const amplitude = Math.max(...xs) - Math.min(...xs);

    if (reversals >= this.MIN_REVERSALS && amplitude >= this.MIN_AMPLITUDE) {
      this.history = []; // Reset after detection
      return true;
    }

    return false;
  }

  reset(): void {
    this.history = [];
  }
}
