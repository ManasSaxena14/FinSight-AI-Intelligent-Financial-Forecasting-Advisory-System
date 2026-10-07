import { useRef } from 'react';
import * as THREE from 'three';
import { SIMPLEX_GLSL, useThreeScene } from './useThreeScene';

/**
 * Full-bleed background: a slow, drifting field of gold "data dust" with
 * depth, noise-driven flow and gentle pointer/scroll parallax.
 */
export default function AmbientField({ className = '', density = 1 }) {
  const ref = useRef(null);

  useThreeScene(ref, ({ scene, camera, pointer, width }) => {
    const mobile = width < 768;
    const count = Math.round((mobile ? 1400 : 3200) * density);

    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 22;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 14;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10 - 2;
      seeds[i] = Math.random();
      sizes[i] = Math.random() < 0.06 ? 2.6 + Math.random() * 2 : 0.7 + Math.random() * 1.2;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

    const uniforms = {
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 1.75) },
      uGold: { value: new THREE.Color('#d4af37') },
      uCool: { value: new THREE.Color('#a78bfa') },
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        ${SIMPLEX_GLSL}
        uniform float uTime;
        uniform float uPixelRatio;
        attribute float aSeed;
        attribute float aSize;
        varying float vAlpha;
        varying float vSeed;
        void main() {
          vec3 p = position;
          float t = uTime * 0.04;
          p.x += snoise(vec3(p.yz * 0.18, t + aSeed)) * 0.9;
          p.y += snoise(vec3(p.xz * 0.18, t * 1.3 + aSeed * 2.0)) * 0.7;
          p.z += snoise(vec3(p.xy * 0.12, t * 0.7)) * 0.6;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          float twinkle = 0.55 + 0.45 * sin(uTime * (0.6 + aSeed) + aSeed * 40.0);
          gl_PointSize = aSize * uPixelRatio * (9.0 / -mv.z);
          vAlpha = twinkle * smoothstep(-14.0, -3.0, mv.z);
          vSeed = aSeed;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uGold;
        uniform vec3 uCool;
        varying float vAlpha;
        varying float vSeed;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float glow = smoothstep(0.5, 0.0, d);
          vec3 color = mix(uGold, uCool, step(0.92, vSeed));
          gl_FragColor = vec4(color, glow * glow * vAlpha * 0.55);
        }
      `,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);
    camera.position.set(0, 0, 6);

    const target = new THREE.Vector2();
    return {
      update(time) {
        uniforms.uTime.value = time;
        target.x += (pointer.x * 0.35 - target.x) * 0.03;
        target.y += (pointer.y * 0.25 - target.y) * 0.03;
        const scroll = window.scrollY || 0;
        points.rotation.y = target.x * 0.25 + time * 0.006;
        points.rotation.x = -target.y * 0.2;
        points.position.y = scroll * 0.0012;
      },
    };
  }, { fov: 55, cameraZ: 6, maxDpr: 1.5 });

  return <div ref={ref} aria-hidden="true" className={`pointer-events-none ${className}`} />;
}
