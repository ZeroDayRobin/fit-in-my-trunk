"use client";

import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { clampToStage, itemBox, makeEnv, orientedSize, pickSurface, snapXZ } from "@/lib/packing";
import { useSim } from "@/lib/store";
import { dragSession } from "@/lib/dragSession";

/**
 * Drag & Drop per Raycasting: Der Maus-/Touch-Strahl wird mit Boden, Ladeboden und
 * dem übrigen Gepäck geschnitten. Die Höhe ergibt sich automatisch (Auto-Stapeln).
 */
export function DragController() {
  const draggingId = useSim((s) => s.draggingId);
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const get = useThree((s) => s.get);

  useEffect(() => {
    if (!draggingId) return;
    // OrbitControls während des Ziehens deaktivieren
    const controls = get().controls as unknown as { enabled: boolean } | null;
    if (controls) controls.enabled = false;
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();

    const onMove = (e: PointerEvent) => {
      const s = useSim.getState();
      const dragged = s.items.find((i) => i.id === draggingId);
      if (!dragged) return;
      const rect = gl.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);

      const env = makeEnv(s.car, s.seatsFolded);
      const others = s.items.filter((i) => i.id !== draggingId).map(itemBox);
      const hit = pickSurface(raycaster.ray, others, env);
      if (!hit) return;

      const size = orientedSize(dragged, dragged.quaternion);
      let [x, z] = clampToStage(hit.x + dragSession.offset[0], hit.z + dragSession.offset[1], env);
      [x, z] = snapXZ(x, z, size, others, env);
      s.dragTo(x, z);
    };
    const onUp = () => useSim.getState().endDrag();

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    document.body.style.cursor = "grabbing";
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      document.body.style.cursor = "";
      if (controls) controls.enabled = true;
    };
  }, [draggingId, camera, gl, get]);

  return null;
}
