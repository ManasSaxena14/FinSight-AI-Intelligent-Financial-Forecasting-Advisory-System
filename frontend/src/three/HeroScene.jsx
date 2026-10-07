import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import { gsap, prefersReducedMotion } from '../lib/motion';
import { buildCore } from './core';
import { useThreeScene } from './useThreeScene';

/**
 * Landing-page hero: the AI core, two glowing "forecast ribbons" spiralling
 * upward around it with light pulses travelling along them, a ring of
 * orbiting gold coins and a deep starfield. Exposes intro() and setScroll(p).
 */
const HeroScene = forwardRef(function HeroScene({ className = '', play = true }, ref) {
  const mountRef = useRef(null);
  const playedScenes = useRef(new WeakSet());

  const controller = useThreeScene(mountRef, ({ scene, camera, pointer, width }) => {
    const mobile = width < 768;
    const root = new THREE.Group();
    scene.add(root);

    // ── Lights for the metallic coins ───────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const key = new THREE.PointLight(0xffe7a3, 60, 30);
    key.position.set(4, 4, 6);
    scene.add(key);
    const rim = new THREE.PointLight(0xa78bfa, 35, 30);
    rim.position.set(-5, -2, 3);
    scene.add(rim);

    // ── Core ───────────────────────────────────────────────────────────
    const core = buildCore({ energy: 0.4, scale: 1 });
    root.add(core.group);

    // ── Forecast ribbons ───────────────────────────────────────────────
    const ribbonUniforms = [];
    const makeRibbon = (phase, color, radius, tubeRadius) => {
      const pts = [];
      for (let i = 0; i <= 160; i++) {
        const t = i / 160;
        const a = phase + t * Math.PI * 3.4;
        const r = radius - t * 0.35 + Math.sin(t * 9) * 0.06;
        pts.push(new THREE.Vector3(Math.cos(a) * r, -2.1 + t * 4.2 + Math.sin(t * 14) * 0.08, Math.sin(a) * r));
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      const uniforms = { uTime: { value: 0 }, uReveal: { value: 0 }, uColor: { value: new THREE.Color(color) } };
      ribbonUniforms.push(uniforms);
      const material = new THREE.ShaderMaterial({
        uniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: /* glsl */ `
          uniform float uTime;
          uniform float uReveal;
          uniform vec3 uColor;
          varying vec2 vUv;
          void main() {
            if (vUv.x > uReveal) discard;
            float head = smoothstep(uReveal - 0.04, uReveal, vUv.x) * step(uReveal, 0.999);
            float pulse = pow(1.0 - fract(vUv.x * 2.5 - uTime * 0.22), 10.0);
            float fade = smoothstep(0.0, 0.12, vUv.x);
            float a = (0.28 + pulse * 1.4 + head * 2.0) * fade;
            gl_FragColor = vec4(uColor * (1.0 + pulse + head * 2.0), a);
          }
        `,
      });
      const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 400, tubeRadius, 8, false), material);
      root.add(mesh);
      return mesh;
    };
    makeRibbon(0, '#e8c967', 2.35, 0.022);
    makeRibbon(Math.PI, '#a78bfa', 2.6, 0.014);

    // ── Orbiting coins (instanced) ─────────────────────────────────────
    const coinCount = mobile ? 10 : 18;
    const coinGeo = new THREE.CylinderGeometry(0.17, 0.17, 0.035, 40);
    const coinMat = new THREE.MeshStandardMaterial({ color: '#e2be4e', metalness: 0.95, roughness: 0.22, emissive: '#3b2f0c', emissiveIntensity: 0.6 });
    const coins = new THREE.InstancedMesh(coinGeo, coinMat, coinCount);
    const coinData = Array.from({ length: coinCount }, (_, i) => ({
      radius: 2.9 + Math.random() * 1.3,
      speed: 0.12 + Math.random() * 0.12,
      offset: (i / coinCount) * Math.PI * 2,
      tilt: (Math.random() - 0.5) * 0.9,
      spin: 0.5 + Math.random() * 1.5,
      y: (Math.random() - 0.5) * 1.6,
    }));
    const dummy = new THREE.Object3D();
    root.add(coins);
    const coinState = { scale: 0 };

    // ── Starfield ──────────────────────────────────────────────────────
    const starCount = mobile ? 900 : 2200;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 8 + Math.random() * 18;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      starPos.set([r * Math.sin(ph) * Math.cos(th), r * Math.sin(ph) * Math.sin(th), r * Math.cos(ph) - 6], i * 3);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
      color: '#f0dc95', size: 0.035, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    scene.add(stars);

    camera.position.set(0, 0.2, mobile ? 12.5 : 10);
    const baseZ = camera.position.z;
    const tilt = new THREE.Vector2();
    let scroll = 0;
    const dolly = { z: 0 };
    const reduced = prefersReducedMotion();
    if (reduced) {
      ribbonUniforms.forEach((u) => { u.uReveal.value = 1; });
      coinState.scale = 1;
    } else {
      core.group.scale.setScalar(0.001);
    }

    const api = {
      intro() {
        if (reduced) return null;
        const tl = gsap.timeline();
        tl.to(core.group.scale, { x: 1, y: 1, z: 1, duration: 1.8, ease: 'elastic.out(1, 0.6)' })
          .fromTo(core.uniforms.uEnergy, { value: 1.2 }, { value: 0.4, duration: 2.2, ease: 'power2.out' }, 0)
          .to(ribbonUniforms.map((u) => u.uReveal), { value: 1, duration: 2.4, stagger: 0.25, ease: 'power2.inOut' }, 0.35)
          .to(coinState, { scale: 1, duration: 1.4, ease: 'back.out(1.7)' }, 0.8)
          .fromTo(dolly, { z: 4 }, { z: 0, duration: 2.6, ease: 'expo.out' }, 0);
        return tl;
      },
      setScroll(p) { scroll = p; },
      update(time) {
        core.update(time, tilt);
        ribbonUniforms.forEach((u) => { u.uTime.value = time; });

        tilt.x += (pointer.y * 0.25 - tilt.x) * 0.04;
        tilt.y += (pointer.x * 0.4 - tilt.y) * 0.04;
        root.rotation.x = tilt.x * 0.6 + scroll * 0.6;
        root.rotation.y = tilt.y * 0.6 + time * 0.05 + scroll * 1.2;
        root.position.y = -0.35 + scroll * 1.6;
        camera.position.z = baseZ + dolly.z + scroll * 3;
        stars.rotation.y = time * 0.01 + tilt.y * 0.1;
        stars.rotation.x = tilt.x * 0.1;

        coinData.forEach((c, i) => {
          const a = c.offset + time * c.speed;
          dummy.position.set(Math.cos(a) * c.radius, c.y + Math.sin(a * 2) * 0.25 + Math.sin(a) * c.tilt, Math.sin(a) * c.radius);
          dummy.rotation.set(time * c.spin, a, Math.PI / 2.4);
          dummy.scale.setScalar(coinState.scale);
          dummy.updateMatrix();
          coins.setMatrixAt(i, dummy.matrix);
        });
        coins.instanceMatrix.needsUpdate = true;
      },
    };
    return api;
  }, { fov: 38, cameraZ: 9.2, maxDpr: 1.75 });

  // Play the entrance once, as soon as both the scene exists and the page says go.
  useEffect(() => {
    // Flag lives on the scene instance: StrictMode remounts create a fresh scene that must play too.
    const scene = controller.current;
    if (play && scene && !playedScenes.current.has(scene)) {
      playedScenes.current.add(scene);
      scene.intro();
    }
  }, [play, controller]);

  useImperativeHandle(ref, () => ({
    intro: () => controller.current?.intro(),
    setScroll: (p) => controller.current?.setScroll(p),
  }), [controller]);

  return <div ref={mountRef} aria-hidden="true" className={className} />;
});

export default HeroScene;
