'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * Ambient, abstract WebGL background for the landing page hero/scroll
 * sections. Not literal face/box detection — a soft, light-toned particle
 * field (pale teal + cream) that drifts and gently reacts to scroll
 * position, driven externally by ScrollStory (Theatre.js) via the
 * `scrollProgress` prop (0 -> 1 across the story).
 *
 * Kept deliberately restrained: pale gradients, soft "light" sources, no
 * moody dark-hero look, per the brief.
 */
export default function ThreeBackground({ scrollProgress = 0 }: { scrollProgress?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(scrollProgress);
  progressRef.current = scrollProgress;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.set(0, 0, 12);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // Soft ambient + a single warm "sun" light — pale, not moody
    scene.add(new THREE.AmbientLight(0xffffff, 0.9));
    const sun = new THREE.PointLight(0xfff2e6, 0.6);
    sun.position.set(5, 5, 8);
    scene.add(sun);

    // Particle field: small translucent spheres in pale teal / cream tones
    const PARTICLE_COUNT = 90;
    const group = new THREE.Group();
    const palette = [0xcfefec, 0xa8ded9, 0xfbe7da, 0xeef0f3];

    const particles: { mesh: THREE.Mesh; speed: number; offset: number }[] = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const size = 0.06 + Math.random() * 0.22;
      const geometry = new THREE.IcosahedronGeometry(size, 0);
      const material = new THREE.MeshStandardMaterial({
        color: palette[i % palette.length],
        transparent: true,
        opacity: 0.55 + Math.random() * 0.3,
        roughness: 0.6,
        metalness: 0.05,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        (Math.random() - 0.5) * 16,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10 - 4
      );
      group.add(mesh);
      particles.push({ mesh, speed: 0.2 + Math.random() * 0.4, offset: Math.random() * Math.PI * 2 });
    }
    scene.add(group);

    let raf = 0;
    let elapsed = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      raf = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      elapsed += delta;

      if (!prefersReducedMotion) {
        particles.forEach((p) => {
          p.mesh.position.y += Math.sin(elapsed * p.speed + p.offset) * 0.0015;
          p.mesh.rotation.x += delta * 0.05;
          p.mesh.rotation.y += delta * 0.04;
        });
        group.rotation.y = progressRef.current * 0.6 + Math.sin(elapsed * 0.05) * 0.02;
      }

      // camera drifts subtly with scroll progress (driven by Theatre.js sequence)
      camera.position.x = progressRef.current * 1.4;
      camera.position.y = -progressRef.current * 0.8;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', handleResize);
      container.removeChild(renderer.domElement);
      particles.forEach((p) => {
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
      });
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      style={{
        background:
          'radial-gradient(60% 50% at 50% 0%, #FDFCF9 0%, #F7F8FA 60%, #F3F5F6 100%)',
      }}
    />
  );
}
