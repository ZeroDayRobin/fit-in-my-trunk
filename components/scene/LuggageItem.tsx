"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Edges, RoundedBox, useCursor } from "@react-three/drei";
import * as THREE from "three";
import { LUGGAGE, type LuggageType } from "@/lib/luggage";
import { orientedSize, type Item, type ItemStatus } from "@/lib/packing";
import { useSim } from "@/lib/store";
import { dragSession } from "@/lib/dragSession";

const STATUS_COLOR: Record<ItemStatus, string> = {
  packed: "#22c55e",
  outside: "#ff2d2d",
  collision: "#ff2d2d",
  idle: "#ffffff",
};

interface Props {
  item: Item;
  status: ItemStatus;
  selected: boolean;
  dragging: boolean;
}

export function LuggageItem({ item, status, selected, dragging }: Props) {
  const spec = LUGGAGE[item.type];
  const size = orientedSize(item.type, item.quaternion);
  const group = useRef<THREE.Group>(null);
  const glow = useRef<THREE.MeshBasicMaterial>(null);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered && !dragging, "grab", "auto");

  const startDrag = useSim((s) => s.startDrag);

  const mats = useMemo(() => {
    const base = new THREE.Color(spec.color);
    return {
      shell: new THREE.MeshStandardMaterial({ color: base, roughness: 0.42, metalness: 0.05 }),
      accent: new THREE.MeshStandardMaterial({ color: base.clone().multiplyScalar(0.72), roughness: 0.55 }),
      trim: new THREE.MeshStandardMaterial({ color: "#1d1f23", roughness: 0.6, metalness: 0.3 }),
    };
  }, [spec.color]);
  useEffect(() => () => Object.values(mats).forEach((m) => m.dispose()), [mats]);

  const targetPos = useMemo(
    () => new THREE.Vector3(item.position[0], item.position[1] + size[1] / 2 + (dragging ? 0.025 : 0), item.position[2]),
    [item.position, size, dragging],
  );
  const targetQuat = useMemo(() => new THREE.Quaternion(...item.quaternion), [item.quaternion]);

  // Spawn-Animation: von oben hineinfallen
  const spawned = useRef(false);
  useEffect(() => {
    if (group.current && !spawned.current) {
      group.current.position.set(targetPos.x, targetPos.y + 0.6, targetPos.z);
      group.current.quaternion.copy(targetQuat);
      spawned.current = true;
    }
  }, [targetPos, targetQuat]);

  const statusColor = useMemo(() => new THREE.Color(STATUS_COLOR[status]), [status]);

  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const k = 1 - Math.exp(-dt * (dragging ? 30 : 14));
    g.position.lerp(targetPos, k);
    g.quaternion.slerp(targetQuat, 1 - Math.exp(-dt * 12));

    // Leuchten je nach Status
    const t = state.clock.elapsedTime;
    const error = status === "outside" || status === "collision";
    const intensity = status === "packed" ? 0.22 : error ? 0.32 + Math.sin(t * 6) * 0.18 : 0;
    for (const m of [mats.shell, mats.accent]) {
      m.emissive.copy(statusColor);
      m.emissiveIntensity += (intensity - m.emissiveIntensity) * (1 - Math.exp(-dt * 10));
    }
    if (glow.current) {
      const target = status === "packed" ? 0.14 : error ? 0.2 + Math.sin(t * 6) * 0.08 : selected ? 0.06 : 0;
      glow.current.opacity += (target - glow.current.opacity) * (1 - Math.exp(-dt * 10));
    }
  });

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.stopPropagation();
    // Greif-Versatz: Abstand zwischen Klickpunkt (auf Höhe der Oberseite) und Mittelpunkt
    const topY = item.position[1] + size[1];
    const { origin, direction } = e.ray;
    let ox = 0;
    let oz = 0;
    if (Math.abs(direction.y) > 1e-4) {
      const tHit = (topY - origin.y) / direction.y;
      const px = origin.x + direction.x * tHit;
      const pz = origin.z + direction.z * tHit;
      ox = THREE.MathUtils.clamp(item.position[0] - px, -size[0] / 2, size[0] / 2);
      oz = THREE.MathUtils.clamp(item.position[2] - pz, -size[2] / 2, size[2] / 2);
    }
    dragSession.offset = [ox, oz];
    startDrag(item.id);
  };

  const edgeColor = status === "idle" ? (selected ? "#ffffff" : "#0f172a") : STATUS_COLOR[status];
  const [w, h, d] = spec.size;

  return (
    <group ref={group}>
      <LuggageModel type={item.type} mats={mats} />
      {/* Hitbox + Status-Leuchten */}
      <mesh
        scale={[w + 0.012, h + 0.012, d + 0.012]}
        onPointerDown={onPointerDown}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial ref={glow} color={STATUS_COLOR[status]} transparent opacity={0} depthWrite={false} />
        <Edges
          color={edgeColor}
          lineWidth={selected ? 3 : status === "idle" ? 1 : 2.2}
          transparent
          opacity={status === "idle" && !selected ? (hovered ? 0.55 : 0.18) : 1}
        />
      </mesh>
    </group>
  );
}

type Mats = { shell: THREE.Material; accent: THREE.Material; trim: THREE.Material };

/** Stilisierte Gepäckmodelle im aufrechten Zustand, zentriert im Ursprung. */
function LuggageModel({ type, mats }: { type: LuggageType; mats: Mats }) {
  const [w, h, d] = LUGGAGE[type].size;

  if (type === "small") {
    return (
      <group>
        <RoundedBox
          args={[w * 0.94, h * 0.9, d * 0.68]}
          radius={0.06}
          smoothness={4}
          position={[0, -h * 0.04, -d * 0.14]}
          material={mats.shell}
          castShadow
          receiveShadow
        />
        <RoundedBox
          args={[w * 0.74, h * 0.44, d * 0.3]}
          radius={0.045}
          smoothness={4}
          position={[0, -h * 0.2, d * 0.33]}
          material={mats.accent}
          castShadow
        />
        <mesh position={[0, h * 0.4, -d * 0.14]} material={mats.trim}>
          <torusGeometry args={[0.045, 0.008, 8, 24, Math.PI]} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * w * 0.24, -h * 0.03, -d * 0.49]} material={mats.trim}>
            <boxGeometry args={[0.045, h * 0.74, 0.016]} />
          </mesh>
        ))}
        <mesh position={[0, h * 0.02, d * 0.2 + 0.001]} material={mats.trim}>
          <boxGeometry args={[w * 0.6, 0.008, 0.008]} />
        </mesh>
      </group>
    );
  }

  const ribs = type === "large" ? 4 : 3;
  const wheelR = 0.03;
  const shellH = h - 2 * wheelR - 0.03;
  const shellY = -h / 2 + 2 * wheelR + shellH / 2;
  return (
    <group>
      <RoundedBox
        args={[w, shellH, d]}
        radius={0.035}
        smoothness={4}
        position={[0, shellY, 0]}
        material={mats.shell}
        castShadow
        receiveShadow
      />
      {/* Rillen */}
      {Array.from({ length: ribs }, (_, i) => {
        const x = -w / 2 + (w / (ribs + 1)) * (i + 1);
        return (
          <group key={i}>
            <mesh position={[x, shellY, d / 2 + 0.002]} material={mats.accent}>
              <boxGeometry args={[0.022, shellH * 0.84, 0.01]} />
            </mesh>
            <mesh position={[x, shellY, -d / 2 - 0.002]} material={mats.accent}>
              <boxGeometry args={[0.022, shellH * 0.84, 0.01]} />
            </mesh>
          </group>
        );
      })}
      {/* Reißverschluss-Naht */}
      <mesh position={[0, shellY, 0]} material={mats.trim}>
        <boxGeometry args={[w + 0.004, shellH - 0.05, 0.012]} />
      </mesh>
      {/* Teleskopgriff (eingefahren) */}
      <mesh position={[0, h / 2 - 0.012, -d * 0.18]} material={mats.trim}>
        <boxGeometry args={[w * 0.6, 0.024, 0.035]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * w * 0.27, h / 2 - 0.03, -d * 0.18]} material={mats.trim}>
          <boxGeometry args={[0.025, 0.03, 0.03]} />
        </mesh>
      ))}
      {/* Seitengriff */}
      <mesh position={[w / 2 + 0.006, shellY + shellH * 0.1, 0]} material={mats.trim}>
        <boxGeometry args={[0.014, 0.024, d * 0.45]} />
      </mesh>
      {/* Rollen */}
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <group key={`${sx}${sz}`} position={[sx * (w / 2 - 0.05), -h / 2 + wheelR, sz * (d / 2 - 0.045)]}>
            <mesh rotation={[0, 0, Math.PI / 2]} material={mats.trim}>
              <cylinderGeometry args={[wheelR, wheelR, 0.026, 16]} />
            </mesh>
            <mesh position={[0, wheelR, 0]} material={mats.trim}>
              <boxGeometry args={[0.05, 0.03, 0.05]} />
            </mesh>
          </group>
        )),
      )}
    </group>
  );
}
