import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { RigidBodyType } from "@dimforge/rapier3d-compat";
import { CuboidCollider, Physics, RigidBody } from "@react-three/rapier";
import type { RapierRigidBody } from "@react-three/rapier";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { Die } from "./Die.js";
import {
  hasHubDiceIntro,
  markHubDiceIntro,
} from "../hubDiceSession.js";

const DIE_COUNT = 3;
/** Screen distance from die center where push begins (px). */
const PUSH_START_PX = 64;
const PUSH_STRENGTH = 0.26;
const PUSH_SPIN = 0.14;
/** Inward shove when a die crosses the viewport floor bounds. */
const BOUNDARY_PUSH = 0.22;
const BOUNDARY_MARGIN = 0.52;
const WALL_THICKNESS = 0.18;
const WALL_HEIGHT = 3;
const REST_Y = 0.28;
const INTRO_Y_MIN = 3.8;
const INTRO_Y_MAX = 5.2;

/** Six axis-aligned orientations (one face flat on the floor). */
const FLAT_ROTATIONS: [number, number, number][] = [
  [0, 0, 0],
  [Math.PI, 0, 0],
  [Math.PI / 2, 0, 0],
  [-Math.PI / 2, 0, 0],
  [0, 0, Math.PI / 2],
  [0, 0, -Math.PI / 2],
];

const SETTLE_LIN = 0.2;
const SETTLE_ANG = 0.55;
const SETTLE_Y_MAX = 0.45;
const SETTLE_SLERP = 0.14;
const SETTLE_ANGLE_DONE = 0.04;

type DieSpawn = {
  position: [number, number, number];
  rotation: [number, number, number];
  introLinvel?: [number, number, number];
  introAngvel?: [number, number, number];
};

function randomIn(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randomFlatRotation(): [number, number, number] {
  return FLAT_ROTATIONS[Math.floor(Math.random() * FLAT_ROTATIONS.length)];
}

/** Intro: ring of spawns with velocities converging on a shared point. */
function buildIntroSpawns(): DieSpawn[] {
  const meetX = randomIn(-1.2, 1.2);
  const meetZ = randomIn(-0.8, 1.2);
  const ringRadius = randomIn(5.5, 7.5);
  const baseAngle = randomIn(0, Math.PI * 2);
  const spawns: DieSpawn[] = [];

  for (let i = 0; i < DIE_COUNT; i++) {
    const angle = baseAngle + (i / DIE_COUNT) * Math.PI * 2 + randomIn(-0.35, 0.35);
    const x = meetX + Math.cos(angle) * ringRadius;
    const z = meetZ + Math.sin(angle) * ringRadius;
    const y = randomIn(INTRO_Y_MIN, INTRO_Y_MAX);

    let dirX = meetX - x;
    let dirZ = meetZ - z;
    const horizLen = Math.hypot(dirX, dirZ) || 1;
    dirX /= horizLen;
    dirZ /= horizLen;
    dirX += randomIn(-0.12, 0.12);
    dirZ += randomIn(-0.12, 0.12);
    const aimLen = Math.hypot(dirX, dirZ) || 1;
    dirX /= aimLen;
    dirZ /= aimLen;

    const speed = randomIn(4.5, 8.5);

    spawns.push({
      position: [x, y, z],
      rotation: [
        randomIn(0, Math.PI * 2),
        randomIn(0, Math.PI * 2),
        randomIn(0, Math.PI * 2),
      ],
      introLinvel: [
        dirX * speed,
        randomIn(-2.2, -0.4),
        dirZ * speed,
      ],
      introAngvel: [
        randomIn(-10, 10),
        randomIn(-10, 10),
        randomIn(-10, 10),
      ],
    });
  }

  return spawns;
}

function buildSpawns(introThrow: boolean): DieSpawn[] {
  if (introThrow) return buildIntroSpawns();

  const spawns: DieSpawn[] = [];
  for (let i = 0; i < DIE_COUNT; i++) {
    spawns.push({
      position: [randomIn(-4, 4), REST_Y, randomIn(-2, 3)],
      rotation: randomFlatRotation(),
    });
  }
  return spawns;
}

const LOCAL_FACE_AXES = [
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(0, -1, 0),
  new THREE.Vector3(1, 0, 0),
  new THREE.Vector3(-1, 0, 0),
  new THREE.Vector3(0, 0, 1),
  new THREE.Vector3(0, 0, -1),
];

const WORLD_UP = new THREE.Vector3(0, 1, 0);

function flatTargetQuaternion(body: RapierRigidBody): THREE.Quaternion {
  const q = body.rotation();
  const quat = new THREE.Quaternion(q.x, q.y, q.z, q.w);
  let bestDot = -Infinity;
  let bestAxis = LOCAL_FACE_AXES[0];

  for (const axis of LOCAL_FACE_AXES) {
    const world = axis.clone().applyQuaternion(quat);
    const dot = world.dot(WORLD_UP);
    if (dot > bestDot) {
      bestDot = dot;
      bestAxis = axis;
    }
  }

  const from = bestAxis.clone().applyQuaternion(quat);
  const align = new THREE.Quaternion().setFromUnitVectors(from, WORLD_UP);
  return align.multiply(quat);
}

type SettlePhase = "free" | "aligning" | "locked";

type SettleTrack = {
  phase: SettlePhase;
  target: THREE.Quaternion;
  current: THREE.Quaternion;
  lockX: number;
  lockZ: number;
};

function newSettleTrack(): SettleTrack {
  return {
    phase: "free",
    target: new THREE.Quaternion(),
    current: new THREE.Quaternion(),
    lockX: 0,
    lockZ: 0,
  };
}

function wakeDie(body: RapierRigidBody, track: SettleTrack) {
  if (track.phase !== "free") {
    track.phase = "free";
    body.setBodyType(RigidBodyType.Dynamic, true);
    body.wakeUp();
  }
}

function TableCamera() {
  const { camera } = useThree();

  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    camera.fov = 42;
    camera.near = 0.1;
    camera.far = 60;
    const dist = 20;
    const pitch = 1.22;
    camera.position.set(0, Math.sin(pitch) * dist, Math.cos(pitch) * dist);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera]);

  return null;
}

function rollDie(body: RapierRigidBody) {
  body.applyImpulse(
    {
      x: randomIn(-1.5, 1.5),
      y: randomIn(4, 6.5),
      z: randomIn(-1.5, 1.5),
    },
    true,
  );
  body.applyTorqueImpulse(
    {
      x: randomIn(-3, 3),
      y: randomIn(-3, 3),
      z: randomIn(-3, 3),
    },
    true,
  );
}

type FloorBounds = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

const NDC_CORNERS = [
  new THREE.Vector2(-1, -1),
  new THREE.Vector2(1, -1),
  new THREE.Vector2(1, 1),
  new THREE.Vector2(-1, 1),
];

function computeViewportFloorBounds(
  camera: THREE.Camera,
  size: { width: number; height: number },
  floorY: number,
): FloorBounds {
  const raycaster = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -floorY);
  const hit = new THREE.Vector3();
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (const ndc of NDC_CORNERS) {
    raycaster.setFromCamera(ndc, camera);
    if (!raycaster.ray.intersectPlane(plane, hit)) continue;
    minX = Math.min(minX, hit.x);
    maxX = Math.max(maxX, hit.x);
    minZ = Math.min(minZ, hit.z);
    maxZ = Math.max(maxZ, hit.z);
  }

  if (!Number.isFinite(minX)) {
    return { minX: -7, maxX: 7, minZ: -4.5, maxZ: 4.5 };
  }

  const inset = BOUNDARY_MARGIN;
  return {
    minX: minX + inset,
    maxX: maxX - inset,
    minZ: minZ + inset,
    maxZ: maxZ - inset,
  };
}

function applyBoundaryForces(
  body: RapierRigidBody,
  t: { x: number; y: number; z: number },
  bounds: FloorBounds,
) {
  let ix = 0;
  let iz = 0;
  if (t.x < bounds.minX) ix += (bounds.minX - t.x) * BOUNDARY_PUSH;
  if (t.x > bounds.maxX) ix -= (t.x - bounds.maxX) * BOUNDARY_PUSH;
  if (t.z < bounds.minZ) iz += (bounds.minZ - t.z) * BOUNDARY_PUSH;
  if (t.z > bounds.maxZ) iz -= (t.z - bounds.maxZ) * BOUNDARY_PUSH;
  if (ix === 0 && iz === 0) return;
  body.applyImpulse({ x: ix, y: 0, z: iz }, true);
}

function ViewportWalls({ bounds }: { bounds: FloorBounds }) {
  const depthZ = Math.max(0.5, (bounds.maxZ - bounds.minZ) / 2);
  const widthX = Math.max(0.5, (bounds.maxX - bounds.minX) / 2);
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerZ = (bounds.minZ + bounds.maxZ) / 2;
  const halfT = WALL_THICKNESS / 2;
  const halfH = WALL_HEIGHT / 2;

  return (
    <RigidBody type="fixed" friction={1.05} restitution={0.08}>
      <CuboidCollider
        args={[halfT, halfH, depthZ]}
        position={[bounds.minX - halfT, halfH, centerZ]}
      />
      <CuboidCollider
        args={[halfT, halfH, depthZ]}
        position={[bounds.maxX + halfT, halfH, centerZ]}
      />
      <CuboidCollider
        args={[widthX, halfH, halfT]}
        position={[centerX, halfH, bounds.minZ - halfT]}
      />
      <CuboidCollider
        args={[widthX, halfH, halfT]}
        position={[centerX, halfH, bounds.maxZ + halfT]}
      />
    </RigidBody>
  );
}

function DiceScene() {
  const introThrow = useMemo(() => !hasHubDiceIntro(), []);
  const spawns = useMemo(() => buildSpawns(introThrow), [introThrow]);
  const dieRefs = useRef<(RapierRigidBody | null)[]>([]);
  const settleRefs = useRef<SettleTrack[]>(
    Array.from({ length: DIE_COUNT }, newSettleTrack),
  );
  const introAppliedRef = useRef(false);
  const pointerRef = useRef({ x: 0, y: 0, hasPointer: false });
  const { camera, size, gl } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);
  const hitPoint = useMemo(() => new THREE.Vector3(), []);
  const worldPos = useMemo(() => new THREE.Vector3(), []);
  const boundsRef = useRef<FloorBounds>({
    minX: -7,
    maxX: 7,
    minZ: -4.5,
    maxZ: 4.5,
  });
  const [boundsVersion, bumpBounds] = useState(0);

  useEffect(() => {
    const canvas = gl.domElement;
    const onPointerMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const inside =
        x >= 0 && x <= rect.width && y >= 0 && y <= rect.height;
      pointerRef.current = { x, y, hasPointer: inside };
    };
    window.addEventListener("pointermove", onPointerMove);
    return () => window.removeEventListener("pointermove", onPointerMove);
  }, [gl]);

  useEffect(() => {
    if (introAppliedRef.current) return;
    introAppliedRef.current = true;

    requestAnimationFrame(() => {
      if (!introThrow) return;

      for (let i = 0; i < dieRefs.current.length; i++) {
        const body = dieRefs.current[i];
        const spawn = spawns[i];
        if (!body || !spawn?.introLinvel) continue;

        body.setLinvel(
          {
            x: spawn.introLinvel[0],
            y: spawn.introLinvel[1],
            z: spawn.introLinvel[2],
          },
          true,
        );
        if (spawn.introAngvel) {
          body.setAngvel(
            {
              x: spawn.introAngvel[0],
              y: spawn.introAngvel[1],
              z: spawn.introAngvel[2],
            },
            true,
          );
        }
        body.wakeUp();
      }
      markHubDiceIntro();
    });
  }, [introThrow, spawns]);

  useFrame((_, delta) => {
    const pointer = pointerRef.current;
    const dt = Math.min(delta, 0.05);

    const nextBounds = computeViewportFloorBounds(camera, size, 0);
    const prev = boundsRef.current;
    if (
      Math.abs(nextBounds.minX - prev.minX) > 0.05 ||
      Math.abs(nextBounds.maxX - prev.maxX) > 0.05 ||
      Math.abs(nextBounds.minZ - prev.minZ) > 0.05 ||
      Math.abs(nextBounds.maxZ - prev.maxZ) > 0.05
    ) {
      boundsRef.current = nextBounds;
      bumpBounds((n) => n + 1);
    }

    for (let i = 0; i < dieRefs.current.length; i++) {
      const body = dieRefs.current[i];
      if (!body) continue;

      const track = settleRefs.current[i];
      const t = body.translation();
      const lv = body.linvel();
      const av = body.angvel();
      const linSpd = Math.hypot(lv.x, lv.y, lv.z);
      const angSpd = Math.hypot(av.x, av.y, av.z);

      let nearPointer = false;
      if (pointer.hasPointer) {
        worldPos.set(t.x, t.y, t.z);
        worldPos.project(camera);
        const sx = (worldPos.x * 0.5 + 0.5) * size.width;
        const sy = (-worldPos.y * 0.5 + 0.5) * size.height;
        const dist = Math.hypot(pointer.x - sx, pointer.y - sy);
        nearPointer = dist < PUSH_START_PX * 1.15;
      }

      if (track.phase === "free" || track.phase === "aligning") {
        applyBoundaryForces(body, t, boundsRef.current);
      }

      const canSettle =
        !nearPointer &&
        t.y <= SETTLE_Y_MAX &&
        linSpd < SETTLE_LIN &&
        angSpd < SETTLE_ANG;

      if (track.phase === "locked") {
        const b = boundsRef.current;
        const cx = THREE.MathUtils.clamp(track.lockX, b.minX, b.maxX);
        const cz = THREE.MathUtils.clamp(track.lockZ, b.minZ, b.maxZ);
        if (cx !== track.lockX) track.lockX = cx;
        if (cz !== track.lockZ) track.lockZ = cz;
        body.setNextKinematicTranslation({
          x: track.lockX,
          y: REST_Y,
          z: track.lockZ,
        });
        body.setNextKinematicRotation({
          x: track.target.x,
          y: track.target.y,
          z: track.target.z,
          w: track.target.w,
        });
        continue;
      }

      if (!canSettle) {
        if (track.phase === "aligning") {
          track.phase = "free";
          body.setBodyType(RigidBodyType.Dynamic, true);
        }
        continue;
      }

      if (track.phase === "free") {
        track.phase = "aligning";
        track.target.copy(flatTargetQuaternion(body));
        track.lockX = t.x;
        track.lockZ = t.z;
        const rq = body.rotation();
        track.current.set(rq.x, rq.y, rq.z, rq.w);
        body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        body.setAngvel({ x: 0, y: 0, z: 0 }, true);
        body.setBodyType(RigidBodyType.KinematicPositionBased, true);
      }

      if (track.phase === "aligning") {
        const blend = 1 - Math.pow(1 - SETTLE_SLERP, dt * 60);
        track.current.slerp(track.target, blend);
        const y = THREE.MathUtils.lerp(t.y, REST_Y, blend);

        body.setNextKinematicTranslation({
          x: track.lockX,
          y,
          z: track.lockZ,
        });
        body.setNextKinematicRotation({
          x: track.current.x,
          y: track.current.y,
          z: track.current.z,
          w: track.current.w,
        });

        const angle = track.current.angleTo(track.target);
        if (angle < SETTLE_ANGLE_DONE && Math.abs(y - REST_Y) < 0.01) {
          track.phase = "locked";
          body.setNextKinematicTranslation({
            x: track.lockX,
            y: REST_Y,
            z: track.lockZ,
          });
          body.setNextKinematicRotation({
            x: track.target.x,
            y: track.target.y,
            z: track.target.z,
            w: track.target.w,
          });
        }
      }
    }

    if (!pointer.hasPointer) return;

    const ndc = new THREE.Vector2(
      (pointerRef.current.x / size.width) * 2 - 1,
      -(pointerRef.current.y / size.height) * 2 + 1,
    );

    for (let i = 0; i < dieRefs.current.length; i++) {
      const body = dieRefs.current[i];
      if (!body) continue;

      const t = body.translation();
      worldPos.set(t.x, t.y, t.z);
      worldPos.project(camera);
      const sx = (worldPos.x * 0.5 + 0.5) * size.width;
      const sy = (-worldPos.y * 0.5 + 0.5) * size.height;
      const dx = pointerRef.current.x - sx;
      const dy = pointerRef.current.y - sy;
      const dist = Math.hypot(dx, dy);
      if (dist >= PUSH_START_PX) continue;

      const falloff = 1 - dist / PUSH_START_PX;
      const strength = PUSH_STRENGTH * falloff * falloff;
      if (strength < 0.015) continue;

      plane.constant = -t.y;
      raycaster.setFromCamera(ndc, camera);
      if (!raycaster.ray.intersectPlane(plane, hitPoint)) continue;

      const awayX = t.x - hitPoint.x;
      const awayZ = t.z - hitPoint.z;
      const len = Math.hypot(awayX, awayZ) || 1;
      const nx = awayX / len;
      const nz = awayZ / len;

      wakeDie(body, settleRefs.current[i]);

      body.applyImpulse(
        { x: nx * strength, y: 0, z: nz * strength },
        true,
      );
      body.applyTorqueImpulse(
        {
          x: -nz * strength * PUSH_SPIN,
          y: 0,
          z: nx * strength * PUSH_SPIN,
        },
        true,
      );
    }
  });

  const handleDieClick = useCallback(
    (index: number) => (e: ThreeEvent<PointerEvent>) => {
      const target = e.nativeEvent.target;
      if (
        target instanceof Element &&
        target.closest("a, button, [role='button']")
      ) {
        return;
      }
      e.stopPropagation();
      const body = dieRefs.current[index];
      if (!body) return;
      wakeDie(body, settleRefs.current[index]);
      rollDie(body);
    },
    [],
  );

  const setDieRef = useCallback((index: number, body: RapierRigidBody | null) => {
    dieRefs.current[index] = body;
  }, []);

  return (
    <>
      <TableCamera />
      <ambientLight intensity={0.55} />
      <directionalLight position={[6, 14, 8]} intensity={1.1} castShadow />
      <directionalLight position={[-5, 8, -4]} intensity={0.35} />

      <Physics gravity={[0, -9.81, 0]} timeStep="vary" interpolate>
        <RigidBody type="fixed" friction={1.1} restitution={0.12}>
          <CuboidCollider args={[25, 0.08, 25]} position={[0, -0.04, 0]} />
        </RigidBody>
        <ViewportWalls key={boundsVersion} bounds={boundsRef.current} />

        {spawns.map((spawn, i) => (
          <Die
            key={i}
            ref={(body) => setDieRef(i, body)}
            position={spawn.position}
            rotation={spawn.rotation}
            onPointerDown={handleDieClick(i)}
          />
        ))}
      </Physics>
    </>
  );
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

export function HubDiceCanvas() {
  const reducedMotion = usePrefersReducedMotion();
  if (reducedMotion) return null;

  const eventSource =
    typeof document !== "undefined" ? document.body : undefined;

  return (
    <div className="hub-dice-canvas" aria-hidden>
      <Canvas
        dpr={[1, 1.5]}
        shadows
        eventSource={eventSource}
        gl={{ alpha: true, antialias: true }}
        onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
        camera={{ position: [0, 18.5, 5.5], fov: 42, near: 0.1, far: 60 }}
      >
        <DiceScene />
      </Canvas>
    </div>
  );
}
