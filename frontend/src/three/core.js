import * as THREE from 'three';
import { gsap } from '../lib/motion';
import { SIMPLEX_GLSL } from './useThreeScene';

/**
 * Builds the "AI core" (noise-displaced fresnel orb, glow, orbit rings, particle
 * halo) into a THREE.Group. Shared by <CoreOrb> and the landing-page hero.
 * update(time, tilt) animates it; tilt is an optional {x, y} rotation target.
 */
export function buildCore({ color = '#d4af37', energy = 0.35, rings = true, halo = true, scale = 1 } = {}) {
    const group = new THREE.Group();
    group.scale.setScalar(scale);

    const uniforms = {
      uTime: { value: 0 },
      uEnergy: { value: energy },
      uColor: { value: new THREE.Color(color) },
      uDeep: { value: new THREE.Color('#0b0c10') },
    };

    const orbMaterial = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: /* glsl */ `
        ${SIMPLEX_GLSL}
        uniform float uTime;
        uniform float uEnergy;
        varying vec3 vNormal;
        varying vec3 vView;
        varying float vDisp;
        void main() {
          float t = uTime * (0.25 + uEnergy * 0.9);
          float n = snoise(normal * 1.6 + t) * 0.6 + snoise(normal * 3.4 - t * 1.3) * 0.25;
          float disp = n * (0.045 + uEnergy * 0.16);
          vec3 p = position + normal * disp;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vNormal = normalize(normalMatrix * normal);
          vView = normalize(-mv.xyz);
          vDisp = n;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform vec3 uDeep;
        uniform float uEnergy;
        varying vec3 vNormal;
        varying vec3 vView;
        varying float vDisp;
        void main() {
          float fres = pow(1.0 - max(dot(vNormal, vView), 0.0), 2.4);
          float bands = smoothstep(0.15, 0.9, vDisp * 0.5 + 0.5);
          vec3 base = mix(uDeep, uColor * 0.35, bands * 0.6);
          vec3 col = base + uColor * fres * (1.1 + uEnergy * 0.8);
          col += vec3(1.0) * pow(fres, 6.0) * 0.35;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 64), orbMaterial);
    group.add(orb);

    // Soft outer glow sprite (camera-facing quad with radial falloff).
    const glowMaterial = new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
          mv.xy += position.xy;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform float uEnergy;
        varying vec2 vUv;
        void main() {
          float d = length(vUv - 0.5) * 2.0;
          float a = smoothstep(1.0, 0.35, d) * (0.18 + uEnergy * 0.2);
          gl_FragColor = vec4(uColor, a);
        }
      `,
    });
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(4.0, 4.0), glowMaterial);
    group.add(glow);

    const ringMeshes = [];
    if (rings) {
      const ringMaterial = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false });
      [[1.45, 0.006, 1.1, 0.3], [1.75, 0.004, -0.4, 1.0], [2.05, 0.003, 0.6, -0.7]].forEach(([r, tube, rx, rz]) => {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 8, 220), ringMaterial);
        ring.rotation.set(rx, 0, rz);
        group.add(ring);
        ringMeshes.push(ring);
      });
    }

    let haloPoints = null;
    if (halo) {
      const count = 700;
      const pos = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const r = 1.35 + Math.random() * 1.1;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.55;
        pos[i * 3 + 2] = r * Math.cos(phi);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      haloPoints = new THREE.Points(g, new THREE.PointsMaterial({
        color, size: 0.02, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false,
      }));
      group.add(haloPoints);
    }

    return {
      group,
      orb,
      glow,
      rings: ringMeshes,
      halo: haloPoints,
      uniforms,
      setColor(next) {
        const c = new THREE.Color(next);
        gsap.to(uniforms.uColor.value, { r: c.r, g: c.g, b: c.b, duration: 1.2, ease: 'power2.out' });
        ringMeshes.forEach((m) => gsap.to(m.material.color, { r: c.r, g: c.g, b: c.b, duration: 1.2 }));
        if (haloPoints) gsap.to(haloPoints.material.color, { r: c.r, g: c.g, b: c.b, duration: 1.2 });
      },
      setEnergy(next) {
        gsap.to(uniforms.uEnergy, { value: next, duration: 0.9, ease: 'power2.out' });
      },
      update(time, tilt) {
        uniforms.uTime.value = time;
        group.rotation.x = tilt?.x ?? 0;
        group.rotation.y = (tilt?.y ?? 0) + time * 0.08;
        ringMeshes.forEach((r, i) => { r.rotation.z += 0.0015 * (i % 2 ? -1 : 1) * (1 + uniforms.uEnergy.value * 3); });
        if (haloPoints) haloPoints.rotation.y = time * (0.05 + uniforms.uEnergy.value * 0.25);
        const breathe = 1 + Math.sin(time * 1.4) * 0.012 * (1 + uniforms.uEnergy.value * 2);
        orb.scale.setScalar(breathe);
      },
    };
}
