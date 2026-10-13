"use client";

import { ContactShadows, Environment, Lightformer, MeshReflectorMaterial } from "@react-three/drei";
import type { Theme } from "@/lib/store";

export const BACKGROUND: Record<Theme, string> = {
  light: "#ecedef",
  dark: "#0b0c0f",
};

/** Studio-Umgebung: hell (nahtloser Hintergrund) oder dunkler Showroom mit Spiegelboden. */
export function Stage({ theme }: { theme: Theme }) {
  const dark = theme === "dark";
  const bg = BACKGROUND[theme];

  return (
    <>
      <color attach="background" args={[bg]} />
      <fog attach="fog" args={[bg, dark ? 11 : 13, dark ? 26 : 32]} />

      <ambientLight intensity={dark ? 0.25 : 0.75} />
      <directionalLight
        position={[3, 10, 5]}
        intensity={dark ? 1.1 : 2.1}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      >
        <orthographicCamera attach="shadow-camera" args={[-6, 6, 6, -6, 0.5, 30]} />
      </directionalLight>
      <directionalLight position={[-6, 4, -5]} intensity={dark ? 0.6 : 0.45} />
      {dark && <spotLight position={[0, 7.5, 0.6]} angle={0.6} penumbra={1} intensity={90} color="#e6edff" />}

      {/* Reflexionen im Lack – ohne externe HDRI, damit keine Netzwerkabhängigkeit entsteht */}
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={dark ? 2.2 : 3} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[12, 4, 1]} />
        <Lightformer form="rect" intensity={dark ? 1.4 : 2} position={[-6, 2, 1]} rotation-y={Math.PI / 2} scale={[10, 1.2, 1]} />
        <Lightformer form="rect" intensity={dark ? 1.4 : 2} position={[6, 2, -1]} rotation-y={-Math.PI / 2} scale={[10, 1.2, 1]} />
        <Lightformer form="ring" intensity={dark ? 1.5 : 1.8} position={[0, 3, 8]} scale={3} />
        <Lightformer
          form="rect"
          color={dark ? "#1b2a44" : "#ffffff"}
          intensity={dark ? 1 : 0.8}
          position={[0, -1, 0]}
          rotation-x={-Math.PI / 2}
          scale={[20, 20, 1]}
        />
      </Environment>

      <mesh rotation-x={-Math.PI / 2} receiveShadow raycast={() => null}>
        <circleGeometry args={[40, 64]} />
        {dark ? (
          <MeshReflectorMaterial
            blur={[400, 120]}
            resolution={1024}
            mixBlur={1}
            mixStrength={18}
            roughness={0.9}
            depthScale={1}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.4}
            color="#101115"
            metalness={0.6}
            mirror={0.6}
          />
        ) : (
          <meshStandardMaterial color="#e9eaec" roughness={1} />
        )}
      </mesh>

      <ContactShadows
        position={[0, 0.002, 0]}
        opacity={dark ? 0.75 : 0.5}
        scale={16}
        blur={2.4}
        far={2.5}
        resolution={1024}
        color="#000000"
      />
    </>
  );
}
