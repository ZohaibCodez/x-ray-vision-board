import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, ContactShadows } from "@react-three/drei";
import * as THREE from "three";

/**
 * Abstract DNA double-helix — a clean, recognizable health-tech motif built
 * entirely from primitives (no external GLTF/HDR assets, so it works offline).
 * Default export so it can be lazy-loaded only on the client (avoids SSR/WebGL).
 */

const COUNT = 24;
const RADIUS = 1.45;
const HEIGHT = 7.2;
const TURNS = 2.25;

const CYAN = new THREE.Color("#22d3ee");
const BLUE = new THREE.Color("#4f46e5");

function Rung({ a, b, color }: { a: [number, number, number]; b: [number, number, number]; color: string }) {
  const { mid, quaternion, len } = useMemo(() => {
    const start = new THREE.Vector3(...a);
    const end = new THREE.Vector3(...b);
    const dir = new THREE.Vector3().subVectors(end, start);
    const length = dir.length();
    const center = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    const q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.clone().normalize(),
    );
    return { mid: center, quaternion: q, len: length };
  }, [a, b]);

  return (
    <mesh position={mid} quaternion={quaternion}>
      <cylinderGeometry args={[0.045, 0.045, len, 10]} />
      <meshStandardMaterial color={color} roughness={0.5} metalness={0.1} transparent opacity={0.55} />
    </mesh>
  );
}

function Helix() {
  const group = useRef<THREE.Group>(null);

  const nodes = useMemo(() => {
    return Array.from({ length: COUNT }, (_, i) => {
      const t = i / (COUNT - 1);
      const angle = t * Math.PI * 2 * TURNS;
      const y = (t - 0.5) * HEIGHT;
      const color = CYAN.clone().lerp(BLUE, t).getStyle();
      return { angle, y, color };
    });
  }, []);

  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.35;
  });

  return (
    <group ref={group}>
      {nodes.map((n, i) => {
        const x1 = Math.cos(n.angle) * RADIUS;
        const z1 = Math.sin(n.angle) * RADIUS;
        const x2 = Math.cos(n.angle + Math.PI) * RADIUS;
        const z2 = Math.sin(n.angle + Math.PI) * RADIUS;
        const a: [number, number, number] = [x1, 0, z1];
        const b: [number, number, number] = [x2, 0, z2];
        return (
          <group key={i} position={[0, n.y, 0]}>
            <mesh position={a} castShadow>
              <sphereGeometry args={[0.27, 32, 32]} />
              <meshStandardMaterial color={n.color} roughness={0.22} metalness={0.15} />
            </mesh>
            <mesh position={b} castShadow>
              <sphereGeometry args={[0.27, 32, 32]} />
              <meshStandardMaterial color={n.color} roughness={0.22} metalness={0.15} />
            </mesh>
            <Rung a={a} b={b} color={n.color} />
          </group>
        );
      })}
    </group>
  );
}

export default function Hero3DScene() {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 0, 9.5], fov: 42 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.85} />
      <directionalLight
        position={[5, 8, 6]}
        intensity={2.4}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[-7, -1, -4]} intensity={45} color="#22d3ee" />
      <pointLight position={[7, 4, 5]} intensity={30} color="#6366f1" />
      <Float speed={1.4} rotationIntensity={0.35} floatIntensity={0.7}>
        <Helix />
      </Float>
      <ContactShadows
        position={[0, -4.2, 0]}
        opacity={0.3}
        scale={16}
        blur={2.6}
        far={7}
        color="#1e3a8a"
      />
    </Canvas>
  );
}
