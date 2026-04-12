import type { DiamondLayout } from '../utils/types';

/**
 * Computes the diamond layout for 4 views on a screen.
 * Each view is a square with its inner edge at screen center.
 * Overlap between adjacent views is resolved by a 45-degree
 * diagonal boundary in the composite shader (matching the prism geometry).
 */
export function computeDiamondLayout(
  screenWidth: number,
  screenHeight: number,
): DiamondLayout {
  const viewSize = Math.floor(Math.min(screenWidth, screenHeight) / 2);
  const cx = screenWidth / 2;
  const cy = screenHeight / 2;
  const half = viewSize / 2;

  return {
    viewSize,
    // Order: top, right, bottom, left
    positions: [
      { x: cx - half, y: cy - viewSize }, // top: bottom edge at center
      { x: cx, y: cy - half },            // right: left edge at center
      { x: cx - half, y: cy },            // bottom: top edge at center
      { x: cx - viewSize, y: cy - half }, // left: right edge at center
    ],
    screenWidth,
    screenHeight,
  };
}
