"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Edges, Html } from "@react-three/drei";
import * as THREE from "three";
import type { Box } from "@/lib/packing";

const BLUE = "#3d9bff";

/** Hellblau-transparente Bounding-Box des nutzbaren Kofferraums inkl. 10-cm-Raster und Maßangaben. */
export function TrunkZone({ box, active, dark }: { box: Box; active: boolean; dark: boolean }) {
  // Html-Labels erst nach Verbindung der Event-Ebene mounten (sonst bleibt das erste Label leer)
  const eventsReady = useThree((s) => Boolean(s.events.connected));
  const group = useRef<THREE.Group>(null);
  const fill = useRef<THREE.MeshBasicMaterial>(null);

  const target = useMemo(() => {
    const size = new THREE.Vector3(box.max[0] - box.min[0], box.max[1] - box.min[1], box.max[2] - box.min[2]);
    const center = new THREE.Vector3((box.min[0] + box.max[0]) / 2, (box.min[1] + box.max[1]) / 2, (box.min[2] + box.max[2]) / 2);
    return { size, center };
  }, [box]);

  // Weiche Animation beim Umklappen der Rückbank / Fahrzeugwechsel
  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const k = 1 - Math.exp(-dt * 7);
    g.position.lerp(target.center, k);
    g.scale.lerp(target.size, k);
    if (fill.current) {
      const base = active ? 0.13 : 0.07;
      const pulse = active ? Math.sin(state.clock.elapsedTime * 4) * 0.03 : 0;
      fill.current.opacity += (base + pulse - fill.current.opacity) * k;
    }
  });

  const grid = useMemo(() => {
    const pts: number[] = [];
    const y = box.min[1] + 0.004;
    const step = 0.1;
    for (let x = box.min[0] + step; x < box.max[0] - 1e-3; x += step) pts.push(x, y, box.min[2], x, y, box.max[2]);
    for (let z = box.max[2] - step; z > box.min[2] + 1e-3; z -= step) pts.push(box.min[0], y, z, box.max[0], y, z);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return geo;
  }, [box]);

  const cm = (v: number) => `${Math.round(v * 100)} cm`;
  const labelClass =
    "pointer-events-none select-none whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide shadow-sm backdrop-blur " +
    (dark ? "bg-neutral-900/80 text-sky-300 ring-1 ring-white/10" : "bg-white/85 text-sky-700 ring-1 ring-sky-900/10");

  return (
    <>
      <group ref={group} position={target.center} scale={target.size}>
        <mesh renderOrder={2} raycast={() => null}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial ref={fill} color={BLUE} transparent opacity={0.07} depthWrite={false} side={THREE.DoubleSide} />
          <Edges color={BLUE} lineWidth={1.6} renderOrder={3} />
        </mesh>
      </group>
      <lineSegments geometry={grid} renderOrder={1} raycast={() => null}>
        <lineBasicMaterial color={BLUE} transparent opacity={0.28} depthWrite={false} />
      </lineSegments>

      {eventsReady && (
        <>
          <Html position={[box.max[0] + 0.02, box.min[1], target.center.z]} center zIndexRange={[10, 0]}>
            <div className={labelClass}>T {cm(target.size.z)}</div>
          </Html>
          <Html position={[box.min[0] - 0.02, target.center.y, box.max[2]]} center zIndexRange={[10, 0]}>
            <div className={labelClass}>H {cm(target.size.y)}</div>
          </Html>
          <Html position={[0, box.min[1], box.max[2] + 0.02]} center zIndexRange={[10, 0]}>
            <div className={labelClass}>B {cm(target.size.x)}</div>
          </Html>
        </>
      )}
    </>
  );
}
