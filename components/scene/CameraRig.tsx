"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { CarModel } from "@/lib/cars";
import type { ViewName } from "@/lib/store";
import { useCar, useSim } from "@/lib/store";

type Controls = THREE.EventDispatcher<{ start: object }> & { target: THREE.Vector3; update: () => void };

/** Kamera-Presets wie in einem Hersteller-Konfigurator. */
export function viewFor(name: ViewName, car: CarModel, aspect: number) {
  const L = car.length;
  const floor = car.trunk.floorY;
  const presets: Record<ViewName, { pos: [number, number, number]; target: [number, number, number] }> = {
    rear: { pos: [4.5, 3.2, L / 2 + 5.4], target: [0, floor - 0.12, L / 2 - 0.55] },
    top: { pos: [0, 8.8, L / 2 + 0.75], target: [0, 0, L / 2 + 0.2] },
    side: { pos: [9.4, 1.9, 0], target: [0, 0.72, 0] },
    front: { pos: [-5.6, 2.3, -L / 2 - 4.9], target: [0, 0.68, -0.15] },
  };
  // Hochformat: Heckansicht frontaler, damit das schmale Bild gut gefüllt ist
  if (aspect < 1) presets.rear.pos = [2.4, 3.4, L / 2 + 5.6];
  const p = presets[name];
  const target = new THREE.Vector3(...p.target);
  const pos = new THREE.Vector3(...p.pos);
  // Hochformat (Smartphone): Kamera weiter zurück, damit das Auto ins Bild passt
  if (aspect < 1.1)
    pos
      .sub(target)
      .multiplyScalar(Math.min(2.4, 1.1 / aspect))
      .add(target);
  return { pos, target };
}

export function CameraRig() {
  const view = useSim((s) => s.view);
  const car = useCar();
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const controls = useThree((s) => s.controls) as unknown as Controls | null;
  const anim = useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null);

  useEffect(() => {
    anim.current = viewFor(view.name, car, size.width / size.height);
    // Bewusst nur bei neuem Preset/Fahrzeug – nicht bei jedem Resize
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.nonce, car]);

  // Bildmitte neben die Seitenleiste (Desktop) bzw. über das Bottom-Sheet (Mobil) verschieben
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const { width, height } = size;
    if (width >= 1024) cam.setViewOffset(width, height, -Math.min(200, width * 0.14), 0, width, height);
    else cam.setViewOffset(width, height, 0, Math.round(-height * 0.04), width, height);
    cam.updateProjectionMatrix();
  }, [camera, size]);

  useEffect(() => {
    if (!controls) return;
    const cancel = () => (anim.current = null);
    controls.addEventListener("start", cancel);
    return () => controls.removeEventListener("start", cancel);
  }, [controls]);

  useFrame((_, dt) => {
    const a = anim.current;
    if (!a || !controls) return;
    const k = 1 - Math.exp(-dt * 2.8);
    camera.position.lerp(a.pos, k);
    controls.target.lerp(a.target, k);
    controls.update();
    if (camera.position.distanceTo(a.pos) < 0.004 && controls.target.distanceTo(a.target) < 0.004) anim.current = null;
  });

  return null;
}
