import { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { MAX_DPR } from '../utils/constants';

export function useRenderTargets(viewSize: number) {
  const gl = useThree((s) => s.gl);

  const targets = useMemo(() => {
    const dpr = Math.min(gl.getPixelRatio(), MAX_DPR);
    const size = Math.ceil(viewSize * dpr);

    return Array.from({ length: 4 }, () =>
      new THREE.WebGLRenderTarget(size, size, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
      }),
    );
  }, [viewSize, gl]);

  useEffect(() => {
    return () => {
      targets.forEach((t) => t.dispose());
    };
  }, [targets]);

  return targets;
}
