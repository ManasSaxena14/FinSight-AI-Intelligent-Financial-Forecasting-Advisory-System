import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { prefersReducedMotion } from '../lib/motion';

/**
 * Mounts a WebGL scene into `containerRef` and runs it efficiently:
 * - pixel ratio capped (default 1.75) and canvas sized by ResizeObserver
 * - render loop paused when the canvas is off-screen or the tab is hidden
 * - reduced-motion users get a single static frame
 * - everything disposed on unmount
 *
 * `create({ renderer, scene, camera, width, height, pointer })` must return
 * { update?(time, delta), resize?(w, h), dispose?() }.
 * Returns a ref holding the live controller so callers can poke uniforms.
 */
export function useThreeScene(containerRef, create, { fov = 40, cameraZ = 6, maxDpr = 1.75, deps = [] } = {}) {
  const controllerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch {
      container.dataset.webgl = 'unsupported';
      return undefined;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 100);
    camera.position.set(0, 0, cameraZ);

    // Pointer in normalised device coords, eased by each scene as it likes.
    const pointer = { x: 0, y: 0 };
    const onPointer = (e) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('pointermove', onPointer, { passive: true });

    const rect = container.getBoundingClientRect();
    const controller = create({
      renderer, scene, camera, pointer,
      width: Math.max(1, rect.width), height: Math.max(1, rect.height),
    }) || {};
    controllerRef.current = controller;

    const resize = () => {
      const { width, height } = container.getBoundingClientRect();
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      controller.resize?.(width, height);
      if (!running) renderer.render(scene, camera);
    };

    const reduced = prefersReducedMotion();
    const clock = new THREE.Clock();
    let running = false;
    let visible = true;
    let frame = 0;

    const loop = () => {
      frame = requestAnimationFrame(loop);
      const delta = Math.min(clock.getDelta(), 0.05);
      controller.update?.(clock.elapsedTime, delta);
      renderer.render(scene, camera);
    };
    const start = () => {
      if (running || reduced || !visible || document.hidden) return;
      running = true;
      clock.getDelta();
      loop();
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(frame);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(container);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start(); else stop();
    }, { threshold: 0 });
    io.observe(container);
    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener('visibilitychange', onVisibility);

    // Dev-only: lets tooling render a frame while the tab is hidden (rAF paused).
    let devRender;
    if (import.meta.env.DEV) {
      devRender = (t = clock.elapsedTime + 2) => { controller.update?.(t, 0.016); renderer.render(scene, camera); };
      (window.__threeScenes ||= new Set()).add(devRender);
    }

    resize();
    if (reduced) {
      controller.update?.(2.5, 0);
      renderer.render(scene, camera);
    } else {
      start();
    }

    return () => {
      stop();
      if (devRender) window.__threeScenes?.delete(devRender);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pointermove', onPointer);
      controller.dispose?.();
      scene.traverse((obj) => {
        obj.geometry?.dispose?.();
        const mats = Array.isArray(obj.material) ? obj.material : obj.material ? [obj.material] : [];
        mats.forEach((m) => m.dispose?.());
      });
      renderer.dispose();
      renderer.forceContextLoss?.();
      renderer.domElement.remove();
      controllerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return controllerRef;
}

/** Ashima Arts 3D simplex noise (MIT). */
export const SIMPLEX_GLSL = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
`;
