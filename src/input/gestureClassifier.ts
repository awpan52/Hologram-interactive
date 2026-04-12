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

export type GestureName = 'open_palm' | 'point' | 'thumbs_up' | 'thumbs_down' | 'none';

interface Landmark {
  x: number;
  y: number;
  z: number;
}

// Finger tip and PIP (proximal interphalangeal) indices
const FINGER_TIPS = [8, 12, 16, 20]; // index, middle, ring, pinky tips
const FINGER_PIPS = [6, 10, 14, 18]; // corresponding PIPs
const WRIST = 0;

function dist(a: Landmark, b: Landmark): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/** Check if a finger is extended (tip further from wrist than PIP) */
function isFingerExtended(landmarks: Landmark[], tipIdx: number, pipIdx: number): boolean {
  return dist(landmarks[tipIdx], landmarks[WRIST]) > dist(landmarks[pipIdx], landmarks[WRIST]);
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
  const indexExtended = isFingerExtended(landmarks, 8, 6);
  const middleExtended = isFingerExtended(landmarks, 12, 10);
  const ringExtended = isFingerExtended(landmarks, 16, 14);
  const pinkyExtended = isFingerExtended(landmarks, 20, 18);

  // Open palm: all 4 fingers extended
  if (extendedFingers >= 4) {
    return 'open_palm';
  }

  // Point: only index finger extended
  if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
    return 'point';
  }

  // Thumbs up / thumbs down: all 4 fingers curled, thumb extended vertically.
  // MediaPipe y increases downward (0 = top, 1 = bottom of frame).
  // A threshold of 0.08 avoids misclassifying a flat fist.
  if (!indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
    const thumbTipY = landmarks[4].y;
    const wristY = landmarks[WRIST].y;
    const THUMB_THRESHOLD = 0.08;
    if (thumbTipY < wristY - THUMB_THRESHOLD) return 'thumbs_up';
    if (thumbTipY > wristY + THUMB_THRESHOLD) return 'thumbs_down';
  }

  return 'none';
}

/**
 * Returns the pointing direction of the index finger as a normalized {x, y} vector.
 * Positive x = pointing right (from the user's perspective).
 * Positive y = pointing down.
 * X is un-negated: front camera is mirrored so raw dx already maps correctly.
 */
export function getPointingDirection(landmarks: Landmark[]): { x: number; y: number } {
  const dx = landmarks[8].x - landmarks[5].x;
  const dy = landmarks[8].y - landmarks[5].y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.01) return { x: 0, y: 0 };
  return { x: dx / len, y: dy / len };
}
