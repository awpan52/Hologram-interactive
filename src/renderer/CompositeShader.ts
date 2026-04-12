import * as THREE from 'three';

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uViewTop;
  uniform sampler2D uViewRight;
  uniform sampler2D uViewBottom;
  uniform sampler2D uViewLeft;
  uniform vec2 uScreenSize;
  uniform float uViewSize;

  varying vec2 vUv;

  void main() {
    vec2 pixel = vUv * uScreenSize;
    vec2 center = uScreenSize * 0.5;
    vec2 d = pixel - center;
    float halfView = uViewSize * 0.5;

    // Split the screen into 4 sectors along 45-degree diagonals.
    // This matches the prism face geometry and prevents overlap.
    //   TOP sector:    more vertical, above center
    //   BOTTOM sector: more vertical, below center
    //   RIGHT sector:  more horizontal, right of center
    //   LEFT sector:   more horizontal, left of center

    // Each prism face reflects the image, flipping it vertically.
    // All views get both X-flip (horizontal mirror) and Y-flip (vertical mirror)
    // so the reflection through the prism appears right-side up.

    if (d.y <= -abs(d.x)) {
      // TOP sector — view spans x:[-halfView, halfView], y:[-viewSize, 0] from center
      if (abs(d.x) <= halfView && d.y >= -uViewSize) {
        vec2 localUV = vec2(
          (d.x + halfView) / uViewSize,
          (d.y + uViewSize) / uViewSize
        );
        localUV.x = 1.0 - localUV.x;
        localUV.y = 1.0 - localUV.y;
        gl_FragColor = texture2D(uViewTop, localUV);
        return;
      }
    } else if (d.y >= abs(d.x)) {
      // BOTTOM sector — view spans x:[-halfView, halfView], y:[0, viewSize] from center
      if (abs(d.x) <= halfView && d.y <= uViewSize) {
        vec2 localUV = vec2(
          (d.x + halfView) / uViewSize,
          d.y / uViewSize
        );
        localUV.x = 1.0 - localUV.x;
        localUV.y = 1.0 - localUV.y;
        gl_FragColor = texture2D(uViewBottom, localUV);
        return;
      }
    } else if (d.x > 0.0) {
      // RIGHT sector — view spans x:[0, viewSize], y:[-halfView, halfView] from center
      if (d.x <= uViewSize && abs(d.y) <= halfView) {
        vec2 localUV = vec2(
          d.x / uViewSize,
          (d.y + halfView) / uViewSize
        );
        localUV.x = 1.0 - localUV.x;
        localUV.y = 1.0 - localUV.y;
        gl_FragColor = texture2D(uViewRight, localUV);
        return;
      }
    } else {
      // LEFT sector — view spans x:[-viewSize, 0], y:[-halfView, halfView] from center
      if (d.x >= -uViewSize && abs(d.y) <= halfView) {
        vec2 localUV = vec2(
          (d.x + uViewSize) / uViewSize,
          (d.y + halfView) / uViewSize
        );
        localUV.x = 1.0 - localUV.x;
        localUV.y = 1.0 - localUV.y;
        gl_FragColor = texture2D(uViewLeft, localUV);
        return;
      }
    }

    // Outside all views: pure black
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
  }
`;

export function createCompositeMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uViewTop: { value: null },
      uViewRight: { value: null },
      uViewBottom: { value: null },
      uViewLeft: { value: null },
      uScreenSize: { value: new THREE.Vector2(1, 1) },
      uViewSize: { value: 1.0 },
    },
    vertexShader,
    fragmentShader,
    depthTest: false,
    depthWrite: false,
  });
}
