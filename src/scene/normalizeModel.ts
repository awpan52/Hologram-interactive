import * as THREE from 'three';
import { MODEL_TARGET_SIZE } from '../utils/constants';

/**
 * Centers a model at the origin and scales it to fit within MODEL_TARGET_SIZE.
 * Optionally aligns the bottom of the bounding box to y=0 (ground plane).
 */
export function normalizeModel(
  object: THREE.Object3D,
  options: { groundPlane?: boolean; targetSize?: number } = {},
): void {
  const { groundPlane = false, targetSize = MODEL_TARGET_SIZE } = options;

  // Force world matrix update
  object.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(object);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());

  // Center the model at origin
  object.position.sub(center);

  // Scale to fit target size
  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim > 0) {
    const scale = targetSize / maxDim;
    object.scale.multiplyScalar(scale);
  }

  // Align bottom to ground plane
  if (groundPlane) {
    object.updateMatrixWorld(true);
    const newBox = new THREE.Box3().setFromObject(object);
    object.position.y -= newBox.min.y;
  }
}
