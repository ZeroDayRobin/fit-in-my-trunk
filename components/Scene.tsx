"use client";

import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useCar, usePackEnv, useSim, useStatuses } from "@/lib/store";
import { CarModel } from "./scene/CarModel";
import { TrunkZone } from "./scene/TrunkZone";
import { LuggageItem } from "./scene/LuggageItem";
import { DragController } from "./scene/DragController";
import { CameraRig, viewFor } from "./scene/CameraRig";
import { Stage } from "./scene/Stage";

/** 3D-Viewer. Wird nur im Browser geladen (siehe Simulator.tsx → next/dynamic, ssr: false). */
export default function Scene() {
  const car = useCar();
  const env = usePackEnv();
  const statuses = useStatuses();
  const items = useSim((s) => s.items);
  const selectedId = useSim((s) => s.selectedId);
  const draggingId = useSim((s) => s.draggingId);
  const paintId = useSim((s) => s.paintId);
  const xray = useSim((s) => s.xray);
  const seatsFolded = useSim((s) => s.seatsFolded);
  const theme = useSim((s) => s.theme);
  const select = useSim((s) => s.select);

  // Start-Perspektive: Frontansicht, danach fährt die Kamera zum Heck (CameraRig)
  const [initial] = useState(() => viewFor("front", car, typeof window === "undefined" ? 1.6 : window.innerWidth / window.innerHeight));

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ fov: 30, near: 0.1, far: 120, position: initial.pos.toArray() }}
      gl={{ antialias: true }}
      onPointerMissed={() => select(null)}
      className="touch-none"
    >
      <Stage theme={theme} />
      <CarModel car={car} paintId={paintId} xray={xray} seatsFolded={seatsFolded} />
      <TrunkZone box={env.trunk} active={draggingId !== null} dark={theme === "dark"} />
      {items.map((item) => (
        <LuggageItem
          key={item.id}
          item={item}
          status={statuses[item.id] ?? "idle"}
          selected={item.id === selectedId}
          dragging={item.id === draggingId}
        />
      ))}
      <DragController />
      <CameraRig />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={2}
        maxDistance={20}
        maxPolarAngle={Math.PI / 2 - 0.04}
        target={initial.target.toArray()}
      />
    </Canvas>
  );
}
