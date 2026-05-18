import { RoundedBox } from "@react-three/drei";
import { RigidBody, type RapierRigidBody } from "@react-three/rapier";
import { forwardRef, useMemo } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";

const HALF = 0.275;
const PIP_RADIUS = 0.045;
const PIP_SPREAD = 0.14;

/** Pip layouts in face-local UV (u right, v up), centered on face. */
const PIP_LAYOUTS: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [
    [-1, -1],
    [1, 1],
  ],
  3: [
    [-1, -1],
    [0, 0],
    [1, 1],
  ],
  4: [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ],
  5: [
    [-1, -1],
    [1, -1],
    [0, 0],
    [-1, 1],
    [1, 1],
  ],
  6: [
    [-1, -1],
    [1, -1],
    [-1, 0],
    [1, 0],
    [-1, 1],
    [1, 1],
  ],
};

/** Standard die: opposite faces sum to 7. */
const FACE_VALUES: {
  axis: "x" | "y" | "z";
  sign: 1 | -1;
  value: number;
}[] = [
  { axis: "y", sign: 1, value: 1 },
  { axis: "y", sign: -1, value: 6 },
  { axis: "x", sign: 1, value: 2 },
  { axis: "x", sign: -1, value: 5 },
  { axis: "z", sign: 1, value: 3 },
  { axis: "z", sign: -1, value: 4 },
];

function facePipPosition(
  axis: "x" | "y" | "z",
  sign: 1 | -1,
  u: number,
  v: number,
): THREE.Vector3 {
  const offset = HALF + 0.012;
  const pu = u * PIP_SPREAD;
  const pv = v * PIP_SPREAD;
  switch (axis) {
    case "y":
      return new THREE.Vector3(pu, sign * offset, pv);
    case "x":
      return new THREE.Vector3(sign * offset, pv, pu);
    case "z":
      return new THREE.Vector3(pu, pv, sign * offset);
  }
}

type DieProps = {
  position: [number, number, number];
  rotation?: [number, number, number];
  onPointerDown?: (e: ThreeEvent<PointerEvent>) => void;
};

export const Die = forwardRef<RapierRigidBody, DieProps>(function Die(
  { position, rotation = [0, 0, 0], onPointerDown },
  ref,
) {
  const pips = useMemo(() => {
    const spheres: { key: string; pos: THREE.Vector3 }[] = [];
    for (const face of FACE_VALUES) {
      const layout = PIP_LAYOUTS[face.value];
      for (let i = 0; i < layout.length; i++) {
        const [u, v] = layout[i];
        spheres.push({
          key: `${face.axis}${face.sign}-${i}`,
          pos: facePipPosition(face.axis, face.sign, u, v),
        });
      }
    }
    return spheres;
  }, []);

  return (
    <RigidBody
      ref={ref}
      position={position}
      rotation={rotation}
      restitution={0.22}
      friction={1.05}
      mass={1}
      linearDamping={0.25}
      angularDamping={0.85}
      canSleep
      colliders="cuboid"
    >
      <RoundedBox
        args={[HALF * 2, HALF * 2, HALF * 2]}
        radius={0.04}
        smoothness={4}
        castShadow
        receiveShadow
        onPointerDown={onPointerDown}
      >
        <meshStandardMaterial color="#e8e6e3" roughness={0.45} metalness={0.05} />
      </RoundedBox>
      {pips.map(({ key, pos }) => (
        <mesh key={key} position={pos}>
          <sphereGeometry args={[PIP_RADIUS, 12, 12]} />
          <meshStandardMaterial color="#121212" roughness={0.6} />
        </mesh>
      ))}
    </RigidBody>
  );
});
