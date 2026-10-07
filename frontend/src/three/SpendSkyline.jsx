import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { gsap } from '../lib/motion';
import { CATEGORY_COLORS, inr } from '../lib/format';
import { useThreeScene } from './useThreeScene';

/**
 * A slowly orbiting 3D "skyline" of spending by category. Bars grow in with
 * GSAP when the data changes; hover a bar to read its amount.
 * data: [{ name, amount, peer? }]
 */
export default function SpendSkyline({ data = [], className = '' }) {
  const ref = useRef(null);
  const [hover, setHover] = useState(null);

  const controller = useThreeScene(ref, ({ scene, camera, renderer, pointer }) => {
    camera.position.set(0, 4.2, 9.5);
    camera.lookAt(0, 0.9, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xfff1c7, 1.6);
    key.position.set(4, 8, 6);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xa78bfa, 0.6);
    rim.position.set(-6, 3, -4);
    scene.add(rim);

    const world = new THREE.Group();
    scene.add(world);

    // Floor grid that fades towards the edges.
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 16),
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: /* glsl */ `
          varying vec2 vUv;
          void main() {
            vec2 g = abs(fract(vUv * 32.0 - 0.5) - 0.5) / fwidth(vUv * 32.0);
            float line = 1.0 - min(min(g.x, g.y), 1.0);
            float fade = smoothstep(0.5, 0.1, length(vUv - 0.5));
            gl_FragColor = vec4(vec3(0.83, 0.69, 0.22), line * fade * 0.22);
          }
        `,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    world.add(floor);

    const bars = [];
    const geometry = new THREE.BoxGeometry(0.9, 1, 0.9);
    geometry.translate(0, 0.5, 0); // grow from the floor

    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2(-10, -10);
    const canvas = renderer.domElement;
    const onMove = (e) => {
      const r = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    };
    const onLeave = () => ndc.set(-10, -10);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerleave', onLeave);
    let hovered = null;

    const setData = (items) => {
      bars.forEach((b) => { world.remove(b.mesh); b.mesh.material.dispose(); });
      bars.length = 0;
      const max = Math.max(1, ...items.map((d) => d.amount || 0));
      const gap = 1.35;
      const offset = ((items.length - 1) * gap) / 2;
      items.forEach((d, i) => {
        const color = new THREE.Color(CATEGORY_COLORS[d.name] || '#d4af37');
        const material = new THREE.MeshStandardMaterial({
          color, metalness: 0.55, roughness: 0.28, emissive: color, emissiveIntensity: 0.12,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.x = i * gap - offset;
        mesh.scale.y = 0.001;
        mesh.userData = d;
        world.add(mesh);
        bars.push({ mesh, d });
        gsap.to(mesh.scale, { y: Math.max(0.05, (d.amount / max) * 3.4), duration: 1.4, delay: 0.15 + i * 0.08, ease: 'elastic.out(1, 0.75)' });
      });
    };

    const look = new THREE.Vector2();
    return {
      setData,
      update(time) {
        look.x += (pointer.x * 0.25 - look.x) * 0.04;
        world.rotation.y = Math.sin(time * 0.15) * 0.35 + look.x;

        raycaster.setFromCamera(ndc, camera);
        const hit = raycaster.intersectObjects(bars.map((b) => b.mesh))[0]?.object || null;
        if (hit !== hovered) {
          if (hovered) gsap.to(hovered.material, { emissiveIntensity: 0.12, duration: 0.3 });
          if (hit) gsap.to(hit.material, { emissiveIntensity: 0.65, duration: 0.3 });
          hovered = hit;
          setHover(hit ? hit.userData : null);
          canvas.style.cursor = hit ? 'pointer' : 'default';
        }
      },
      dispose() {
        canvas.removeEventListener('pointermove', onMove);
        canvas.removeEventListener('pointerleave', onLeave);
      },
    };
  }, { fov: 38 });

  const key = data.map((d) => `${d.name}:${Math.round(d.amount)}`).join('|');
  useEffect(() => {
    controller.current?.setData(data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, controller]);

  return (
    <div className={`relative ${className}`}>
      <div ref={ref} className="absolute inset-0" />
      <div className="pointer-events-none absolute left-4 top-4 min-h-[52px]">
        {hover ? (
          <div className="rounded-xl border border-line bg-ink-900/80 px-3 py-2 backdrop-blur">
            <p className="text-xs text-fg-muted">{hover.name}</p>
            <p className="num text-lg text-fg">{inr(hover.amount)}</p>
          </div>
        ) : (
          <p className="text-xs text-fg-faint">Hover a bar to see the amount</p>
        )}
      </div>
    </div>
  );
}
