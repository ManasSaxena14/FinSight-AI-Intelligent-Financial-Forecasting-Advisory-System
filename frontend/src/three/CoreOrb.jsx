import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { buildCore } from './core';
import { useThreeScene } from './useThreeScene';

/**
 * The "AI core": a noise-displaced, fresnel-lit orb wrapped in orbit rings and
 * a particle halo. `color` tints it (e.g. by health score) and `energy` (0..1)
 * drives how alive it looks -- raise it while the advisor is thinking.
 */
export default function CoreOrb({ color = '#d4af37', energy = 0.35, className = '', rings = true, halo = true, scale = 1 }) {
  const ref = useRef(null);

  const controller = useThreeScene(ref, ({ scene, camera, pointer }) => {
    const core = buildCore({ color, energy, rings, halo, scale });
    scene.add(core.group);
    camera.position.set(0, 0, 7);
    const tilt = new THREE.Vector2();
    return {
      setColor: core.setColor,
      setEnergy: core.setEnergy,
      update(time) {
        tilt.x += (pointer.y * 0.35 - tilt.x) * 0.05;
        tilt.y += (pointer.x * 0.5 - tilt.y) * 0.05;
        core.update(time, tilt);
      },
    };
  }, { fov: 35, cameraZ: 7 });

  useEffect(() => { controller.current?.setColor(color); }, [color, controller]);
  useEffect(() => { controller.current?.setEnergy(energy); }, [energy, controller]);

  return <div ref={ref} aria-hidden="true" className={className} />;
}
