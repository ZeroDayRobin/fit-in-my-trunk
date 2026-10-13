"use client";

// Prozedural aufgebautes, stilisiertes Fahrzeug im Look eines Hersteller-Konfigurators.
// Karosserie = extrudierte Seitenprofile (Shape → ExtrudeGeometry) mit ausgeschnittenen
// Radhäusern, anschließend per Vertex-Deformation in der Draufsicht verjüngt (runde Ecken)
// und oben eingezogen (Tumblehome). Der Laderaum ist als offene Wanne modelliert.

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { toCreasedNormals } from "three/addons/utils/BufferGeometryUtils.js";
import type { CarModel as Car } from "@/lib/cars";
import { PAINT_BY_ID } from "@/lib/cars";
import { trunkBox } from "@/lib/packing";

const SKIN = 0.12; // Stärke der Seitenwände (inkl. gerundeter Schulter)
const TUMBLE = 0.1; // Einzug der Fenster gegenüber der Karosserieflanke

interface Props {
  car: Car;
  paintId: string;
  xray: boolean;
  seatsFolded: boolean;
}

export function CarModel({ car, paintId, xray, seatsFolded }: Props) {
  const g = useMemo(() => buildGeometry(car), [car]);
  useEffect(() => () => g.dispose(), [g]);
  const paint = PAINT_BY_ID[paintId];

  const materials = useMemo(() => {
    const body = new THREE.MeshPhysicalMaterial({
      color: paint.color,
      metalness: paint.metalness,
      roughness: paint.roughness,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      envMapIntensity: 1.3,
    });
    const glass = new THREE.MeshPhysicalMaterial({
      color: "#0a0d12",
      metalness: 0.4,
      roughness: 0.03,
      transparent: true,
      opacity: 0.85,
      envMapIntensity: 1.8,
    });
    const trim = new THREE.MeshStandardMaterial({ color: "#121417", roughness: 0.5, metalness: 0.3 });
    const interior = new THREE.MeshStandardMaterial({ color: "#3a3c41", roughness: 0.92 });
    const carpet = new THREE.MeshStandardMaterial({ color: "#2c2e33", roughness: 1 });
    const rubber = new THREE.MeshStandardMaterial({ color: "#141414", roughness: 0.85 });
    const rim = new THREE.MeshStandardMaterial({ color: "#c9cdd3", metalness: 1, roughness: 0.2 });
    const disc = new THREE.MeshStandardMaterial({ color: "#6c7076", metalness: 0.8, roughness: 0.45 });
    const lightFront = new THREE.MeshBasicMaterial({ color: "#f4f8ff", toneMapped: false });
    const lightRear = new THREE.MeshBasicMaterial({ color: "#d3101c", toneMapped: false });
    return { body, glass, trim, interior, carpet, rubber, rim, disc, lightFront, lightRear };
  }, [paint]);
  useEffect(() => () => Object.values(materials).forEach((m) => m.dispose()), [materials]);

  // Röntgenblick: Karosserie, Glas und Innenraum sanft ausblenden
  const fade = useRef({ body: 1, glass: 0.85, inner: 1 });
  useFrame((_, dt) => {
    const k = 1 - Math.exp(-dt * 8);
    const f = fade.current;
    f.body += ((xray ? 0.2 : 1) - f.body) * k;
    f.glass += ((xray ? 0.08 : 0.85) - f.glass) * k;
    f.inner += ((xray ? 0.35 : 1) - f.inner) * k;
    applyOpacity(materials.body, f.body);
    applyOpacity(materials.glass, f.glass, true);
    applyOpacity(materials.trim, f.inner);
    applyOpacity(materials.interior, f.inner);
  });

  // Heckklappe beim Laden des Modells aufklappen
  const tailgate = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    const t = tailgate.current;
    if (!t) return;
    t.rotation.x += (g.tailgateOpen - t.rotation.x) * (1 - Math.exp(-dt * 2.6));
  });

  // Rückbank umklappen
  const backrest = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    const b = backrest.current;
    if (!b) return;
    const k = 1 - Math.exp(-dt * 6);
    const targetRot = seatsFolded ? -Math.PI / 2 : 0;
    const targetY = seatsFolded ? g.floorY - g.backrestThickness : g.floorY;
    b.rotation.x += (targetRot - b.rotation.x) * k;
    b.position.y += (targetY - b.position.y) * k;
  });

  const shadow = !xray;
  const W = car.width;

  return (
    <group key={car.id}>
      {/* Karosserie */}
      {g.body.map((geo, i) => (
        <mesh key={`b${i}`} geometry={geo} material={materials.body} castShadow={shadow} receiveShadow />
      ))}
      {g.glass.map((geo, i) => (
        <mesh key={`g${i}`} geometry={geo} material={materials.glass} />
      ))}
      {g.trim.map((geo, i) => (
        <mesh key={`t${i}`} geometry={geo} material={materials.trim} />
      ))}
      {g.interior.map((geo, i) => (
        <mesh key={`i${i}`} geometry={geo} material={materials.interior} receiveShadow />
      ))}
      <mesh geometry={g.carpet} material={materials.carpet} receiveShadow />

      {/* Spiegel */}
      {[1, -1].map((side) => (
        <group key={side} position={[side * (W / 2 + 0.02), car.body.beltline + 0.06, g.zCowl + 0.3]}>
          <mesh material={materials.body} position={[side * 0.06, 0, 0]} castShadow={shadow}>
            <boxGeometry args={[0.15, 0.1, 0.08]} />
          </mesh>
          <mesh material={materials.trim} position={[-side * 0.03, -0.02, 0.01]}>
            <boxGeometry args={[0.08, 0.025, 0.04]} />
          </mesh>
        </group>
      ))}

      {/* Front: LED-Lichtband & Kühlergrill */}
      <mesh material={materials.lightFront} position={[0, car.body.noseHeight - 0.08, -car.length / 2 + 0.03]}>
        <boxGeometry args={[W * 0.74, 0.02, 0.03]} />
      </mesh>
      <mesh material={materials.trim} position={[0, car.groundClearance + 0.2, -car.length / 2 + 0.035]}>
        <boxGeometry args={[W * 0.52, 0.12, 0.05]} />
      </mesh>

      {/* Heck: Rückleuchten & Diffusor */}
      {[1, -1].map((side) => (
        <mesh key={side} material={materials.lightRear} position={[side * g.tailLightX, car.trunk.floorY - 0.07, car.length / 2 - 0.006]}>
          <boxGeometry args={[0.26, 0.035, 0.02]} />
        </mesh>
      ))}
      <mesh material={materials.trim} position={[0, car.groundClearance + 0.07, car.length / 2 - 0.1]}>
        <boxGeometry args={[W * 0.62, 0.07, 0.16]} />
      </mesh>

      {/* Heckklappe (am Dach angeschlagen, geöffnet) */}
      <group ref={tailgate} position={[0, g.hingeY, g.zHinge]}>
        <mesh material={materials.glass} position={g.gateGlass.position} rotation={[g.gateGlass.rotX, 0, 0]}>
          <boxGeometry args={[g.gateWidth - 0.08, 0.018, g.gateGlass.length]} />
        </mesh>
        <mesh material={materials.body} position={g.gateFrame.position} rotation={[g.gateFrame.rotX, 0, 0]} castShadow={shadow}>
          <boxGeometry args={[g.gateWidth, 0.012, g.gateFrame.length]} />
        </mesh>
        <mesh material={materials.body} position={g.gateBody.position} rotation={[g.gateBody.rotX, 0, 0]} castShadow={shadow}>
          <boxGeometry args={[g.gateWidth, 0.06, g.gateBody.length]} />
        </mesh>
        <mesh material={materials.lightRear} position={g.gateLight.position} rotation={[g.gateLight.rotX, 0, 0]}>
          <boxGeometry args={[g.gateWidth * 0.92, 0.02, 0.05]} />
        </mesh>
        <mesh material={materials.trim} position={[0, 0.015, 0.04]}>
          <boxGeometry args={[g.gateWidth, 0.03, 0.12]} />
        </mesh>
      </group>

      {/* Rückbank (klappbar) */}
      <group ref={backrest} position={[0, g.floorY, g.backrestPivotZ]}>
        <mesh material={materials.interior} position={[0, g.backrestHeight / 2, g.backrestThickness / 2]} castShadow receiveShadow>
          <boxGeometry args={[g.innerWidth - 0.04, g.backrestHeight, g.backrestThickness]} />
        </mesh>
        {[-0.45, 0, 0.45].map((x) => (
          <mesh key={x} material={materials.interior} position={[x, g.backrestHeight + 0.08, g.backrestThickness / 2]}>
            <boxGeometry args={[0.24, 0.13, 0.08]} />
          </mesh>
        ))}
      </group>

      {/* Vordersitze */}
      {[-0.38, 0.38].map((x) => (
        <group key={x} position={[x, g.floorY - 0.12, g.frontSeatZ]}>
          <mesh material={materials.interior} position={[0, 0.07, -0.25]}>
            <boxGeometry args={[0.5, 0.14, 0.5]} />
          </mesh>
          <mesh material={materials.interior} position={[0, g.seatBack / 2 + 0.06, 0]} rotation={[0.18, 0, 0]}>
            <boxGeometry args={[0.5, g.seatBack, 0.12]} />
          </mesh>
          <mesh material={materials.interior} position={[0, g.seatBack + 0.12, 0.06]} rotation={[0.18, 0, 0]}>
            <boxGeometry args={[0.26, 0.14, 0.1]} />
          </mesh>
        </group>
      ))}

      {/* Lenkrad */}
      <mesh material={materials.trim} position={[-0.38, car.body.beltline + 0.0, g.zCowl + 0.66]} rotation={[-0.45, 0, 0]}>
        <torusGeometry args={[0.18, 0.022, 12, 40]} />
      </mesh>

      {/* Räder */}
      {g.wheels.map((w, i) => (
        <Wheel key={i} position={w} radius={car.wheelRadius} side={w[0] > 0 ? 1 : -1} materials={materials} />
      ))}
    </group>
  );
}

function applyOpacity(m: THREE.Material, opacity: number, alwaysTransparent = false) {
  const transparent = alwaysTransparent || opacity < 0.995;
  if (m.transparent !== transparent) {
    m.transparent = transparent;
    m.needsUpdate = true;
  }
  m.opacity = opacity;
  m.depthWrite = opacity > 0.6;
}

function Wheel({
  position,
  radius,
  side,
  materials,
}: {
  position: [number, number, number];
  radius: number;
  side: number;
  materials: Record<string, THREE.Material>;
}) {
  const tireWidth = 0.22;
  const spokes = [0, 1, 2, 3, 4];
  return (
    <group position={position}>
      <mesh material={materials.rubber} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[radius - 0.01, radius - 0.01, tireWidth - 0.04, 48]} />
      </mesh>
      {[1, -1].map((s) => (
        <mesh key={s} material={materials.rubber} rotation={[0, Math.PI / 2, 0]} position={[s * (tireWidth / 2 - 0.035), 0, 0]}>
          <torusGeometry args={[radius - 0.035, 0.035, 14, 56]} />
        </mesh>
      ))}
      <mesh material={materials.disc} rotation={[0, 0, Math.PI / 2]} position={[side * 0.02, 0, 0]}>
        <cylinderGeometry args={[radius * 0.55, radius * 0.55, 0.16, 32]} />
      </mesh>
      <group position={[side * (tireWidth / 2 - 0.01), 0, 0]}>
        <mesh material={materials.rim} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[radius * 0.66, 0.02, 10, 56]} />
        </mesh>
        <mesh material={materials.rim} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.06, 0.06, 0.03, 24]} />
        </mesh>
        {spokes.map((i) => (
          <group key={i} rotation={[(i / spokes.length) * Math.PI * 2, 0, 0]}>
            <mesh material={materials.rim} position={[0, radius * 0.35, 0]}>
              <boxGeometry args={[0.025, radius * 0.62, 0.055]} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

// ---------------------------------------------------------------------------
// Geometrie

function extrude(shape: THREE.Shape, width: number, bevel = 0) {
  const depth = Math.max(0.001, width - 2 * bevel);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    curveSegments: 40,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: 6,
  });
  geo.translate(0, 0, -depth / 2);
  // Shape-Ebene (u = Fahrzeuglänge, v = Höhe) → Welt (z, y); Extrusion → Breite (x)
  geo.rotateY(-Math.PI / 2);
  return geo;
}

function segment(from: [number, number], to: [number, number]) {
  const dz = to[0] - from[0];
  const dy = to[1] - from[1];
  return {
    position: [0, (from[1] + to[1]) / 2, (from[0] + to[0]) / 2] as [number, number, number],
    rotX: -Math.atan2(dy, dz),
    length: Math.hypot(dz, dy),
  };
}

function buildGeometry(car: Car) {
  const L = car.length;
  const W = car.width;
  const H = car.height;
  const b = car.body;
  const r = car.wheelRadius;
  const ra = r * 1.1;
  const gc = car.groundClearance;
  const zF = -L / 2;
  const zR = L / 2;
  const zFW = zF + car.frontOverhang;
  const zRW = zFW + car.wheelbase;
  const zCowl = zF + b.cowl;
  const zRoofStart = zF + b.roofStart;
  const zHinge = zR - b.roofEnd;
  const zRearBelt = zR - b.rearBeltInset;
  const floorY = car.trunk.floorY;
  const roofFrontY = H - 0.05;
  const roofRearY = car.style === "hatchback" ? H - 0.07 : H - 0.04;
  const roofMid: [number, number] = [(zRoofStart + zHinge) / 2, H + 0.02];
  const noseLow = gc + 0.26;

  // Draufsicht: Enden verjüngen, Dach einziehen, Unterkante leicht runden
  const taper = (y: number, z: number) => {
    const u = Math.abs(z) / (L / 2);
    const sz = u > 0.6 ? 1 - 0.11 * ((u - 0.6) / 0.4) ** 2 : 1;
    const t = THREE.MathUtils.clamp((y - b.beltline) / (H - b.beltline), 0, 1);
    const sy = 1 - 0.09 * t;
    const lb = THREE.MathUtils.clamp((0.42 - y) / 0.3, 0, 1);
    return sz * sy * (1 - 0.025 * lb * lb);
  };
  const finish = (geo: THREE.BufferGeometry, smooth = true) => {
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setX(i, pos.getX(i) * taper(pos.getY(i), pos.getZ(i)));
    pos.needsUpdate = true;
    if (!smooth) {
      geo.computeVertexNormals();
      return geo;
    }
    const creased = toCreasedNormals(geo, Math.PI / 4.5);
    geo.dispose();
    return creased;
  };
  const placed = (geo: THREE.BufferGeometry, x: number, y = 0, z = 0) => geo.translate(x, y, z);

  // Gemeinsamer Unterbau inkl. Radhäuser (von vorne nach hinten)
  const lowerPath = (s: THREE.Shape) => {
    s.moveTo(zF, noseLow);
    s.quadraticCurveTo(zF + 0.02, gc + 0.01, zF + 0.24, gc);
    for (const zw of [zFW, zRW]) {
      s.lineTo(zw - ra, gc);
      s.lineTo(zw - ra, r);
      s.absarc(zw, r, ra, Math.PI, 0, true);
      s.lineTo(zw + ra, gc);
    }
    s.lineTo(zR - 0.22, gc);
    s.quadraticCurveTo(zR - 0.005, gc + 0.01, zR, gc + 0.26);
    s.lineTo(zR, floorY);
  };
  const hoodAndNose = (s: THREE.Shape) => {
    s.lineTo(zCowl, b.beltline - 0.03);
    s.quadraticCurveTo(zF + 0.5, b.noseHeight + 0.08, zF + 0.1, b.noseHeight);
    s.quadraticCurveTo(zF - 0.005, b.noseHeight - 0.03, zF, b.noseHeight - 0.2);
    s.lineTo(zF, noseLow);
  };

  // Seitenwand: geschlossenes Profil bis zur Fensterlinie
  const skinShape = new THREE.Shape();
  lowerPath(skinShape);
  skinShape.quadraticCurveTo(zR + 0.005, b.rearBeltline - 0.05, zRearBelt, b.rearBeltline);
  skinShape.lineTo(zCowl, b.beltline);
  hoodAndNose(skinShape);

  // Kern: Profil mit offener Wanne für Innenraum + Kofferraum
  const coreShape = new THREE.Shape();
  lowerPath(coreShape);
  coreShape.lineTo(zCowl + 0.02, floorY);
  coreShape.lineTo(zCowl + 0.02, b.beltline - 0.03);
  hoodAndNose(coreShape);

  // Seitenscheiben
  const glassShape = new THREE.Shape();
  glassShape.moveTo(zCowl + 0.05, b.beltline);
  glassShape.quadraticCurveTo(zRoofStart - 0.25, roofFrontY - 0.12, zRoofStart, roofFrontY - 0.015);
  glassShape.quadraticCurveTo(roofMid[0], roofMid[1] - 0.025, zHinge, roofRearY - 0.015);
  glassShape.lineTo(zRearBelt, b.rearBeltline);
  glassShape.lineTo(zCowl + 0.05, b.beltline);

  // B-Säule als dunkle Blende
  const beltAt = (z: number) => b.beltline + ((b.rearBeltline - b.beltline) * (z - zCowl)) / (zRearBelt - zCowl);
  const pillarShape = new THREE.Shape();
  const bz = zRoofStart + (zHinge - zRoofStart) * 0.36;
  pillarShape.moveTo(bz - 0.04, beltAt(bz - 0.04));
  pillarShape.lineTo(bz - 0.04, H - 0.04);
  pillarShape.lineTo(bz + 0.05, H - 0.04);
  pillarShape.lineTo(bz + 0.05, beltAt(bz + 0.05));
  pillarShape.closePath();

  // Dach
  const roofShape = new THREE.Shape();
  roofShape.moveTo(zRoofStart - 0.04, roofFrontY - 0.005);
  roofShape.quadraticCurveTo(roofMid[0], roofMid[1] + 0.005, zHinge + 0.02, roofRearY);
  roofShape.lineTo(zHinge + 0.02, roofRearY - 0.06);
  roofShape.quadraticCurveTo(roofMid[0], roofMid[1] - 0.06, zRoofStart - 0.04, roofFrontY - 0.065);
  roofShape.closePath();

  const glassX = W / 2 - TUMBLE;
  const body = [
    finish(extrude(coreShape, W - 2 * SKIN + 0.04)),
    finish(placed(extrude(skinShape, SKIN, 0.05), W / 2 - SKIN / 2)),
    finish(placed(extrude(skinShape, SKIN, 0.05), -W / 2 + SKIN / 2)),
    finish(extrude(roofShape, 2 * glassX + 0.05, 0.012)),
  ];

  // Windschutzscheibe als Quader, danach ebenfalls verjüngt
  const ws = segment([zCowl + 0.05, b.beltline - 0.01], [zRoofStart, roofFrontY - 0.02]);
  const windshield = new THREE.BoxGeometry(2 * glassX, 0.014, ws.length, 1, 1, 1);
  windshield.rotateX(ws.rotX);
  windshield.translate(...ws.position);

  const glass = [
    finish(placed(extrude(glassShape, 0.016), glassX), false),
    finish(placed(extrude(glassShape, 0.016), -glassX), false),
    finish(windshield, false),
  ];
  const trim = [
    finish(placed(extrude(pillarShape, 0.02), glassX + 0.004), false),
    finish(placed(extrude(pillarShape, 0.02), -glassX - 0.004), false),
  ];

  // Innenraum
  const trunk = trunkBox(car, false);
  const folded = trunkBox(car, true);
  const innerWidth = W - 2 * SKIN;
  const carpetStart = folded.min[2] - 0.02;
  const carpetEnd = zR - 0.04;
  const carpetLen = carpetEnd - carpetStart;
  const carpetZ = (carpetStart + carpetEnd) / 2;
  const liningH = b.beltline - floorY;
  const interior = [1, -1].map((side) =>
    finish(new THREE.BoxGeometry(0.02, liningH, carpetLen).translate(side * (W / 2 - SKIN - 0.008), floorY + liningH / 2, carpetZ), false),
  );
  const dashH = b.beltline - 0.02 - (floorY - 0.1);
  interior.push(finish(new THREE.BoxGeometry(innerWidth, dashH, 0.42).translate(0, floorY - 0.1 + dashH / 2, zCowl + 0.27), false));
  const carpet = finish(new THREE.BoxGeometry(innerWidth + 0.01, 0.006, carpetLen).translate(0, floorY + 0.003, carpetZ), false);

  // Heckklappe in lokalen Koordinaten relativ zum Scharnier
  const hingeY = roofRearY - 0.02;
  const p1: [number, number] = [zRearBelt - zHinge, b.rearBeltline - hingeY];
  const p2: [number, number] = [zR - zHinge + 0.01, floorY + 0.01 - hingeY];
  const gateGlass = segment([0, 0], p1);
  const gateFrame = { ...gateGlass, position: [0, gateGlass.position[1] - 0.012, gateGlass.position[2]] as [number, number, number] };
  const gateBody = segment(p1, p2);
  const lt = 0.25;
  const gateLight = {
    position: [0, p1[1] + (p2[1] - p1[1]) * lt, p1[0] + (p2[0] - p1[0]) * lt + 0.035] as [number, number, number],
    rotX: gateBody.rotX,
  };
  const closedAngle = Math.atan2(p1[1], p1[0]);
  const tailgateOpen = closedAngle - 0.24;
  const gateWidth = W * taper(b.rearBeltline, zR - 0.1) - 2 * 0.07;

  const backrestThickness = 0.14;
  const backrestPivotZ = trunk.min[2] - backrestThickness;
  const backrestHeight = Math.min(0.58, roofRearY - floorY - 0.3);
  const frontSeatZ = folded.min[2] - 0.2;
  const seatBack = Math.min(0.55, H - floorY - 0.3);

  const wheelX = W / 2 - 0.14;
  const wheels: [number, number, number][] = [
    [wheelX, r, zFW],
    [-wheelX, r, zFW],
    [wheelX, r, zRW],
    [-wheelX, r, zRW],
  ];

  const all = [...body, ...glass, ...trim, ...interior, carpet];
  return {
    body,
    glass,
    trim,
    interior,
    carpet,
    gateGlass,
    gateFrame,
    gateBody,
    gateLight,
    gateWidth,
    hingeY,
    zHinge,
    zCowl,
    tailgateOpen,
    tailLightX: (W / 2 - 0.16) * taper(floorY, zR),
    floorY,
    innerWidth,
    backrestThickness,
    backrestPivotZ,
    backrestHeight,
    frontSeatZ,
    seatBack,
    wheels,
    dispose: () => all.forEach((geo) => geo.dispose()),
  };
}
