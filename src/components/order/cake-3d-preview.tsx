"use client";

import { useRef, useMemo, useLayoutEffect, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, ContactShadows, Html, Environment, Lightformer } from "@react-three/drei";
import * as THREE from "three";
import { getCakeFont } from "@/lib/cake-fonts";
import { crownLabel, finishForColor, finishNameFor, VANILLA_LAYERS } from "@/lib/custom-design";

type Shape = "round" | "square" | "heart" | "number";

type Decoration = "pearls" | "macarons" | "flowers" | "sprinkles" | "none";

/** Warm fondant cream — cake board, and the default cap for custom colours. */
const CREAM = "#faf6ee";

const TAU = Math.PI * 2;

/** Half-angle of the wedge the cross-section reveal removes (30° → 60°). */
const GAP_HALF = Math.PI / 6;

/**
 * Gap centred on the default camera azimuth (x = 0.55, z = 0.835) so the cut
 * faces the viewer as soon as the slider moves.
 */
const GAP_PHI = Math.atan2(0.835, 0.55);

/** Same gap in cylinder theta (three.js: x = sinθ, z = cosθ): θ = π/2 − φ. */
const GAP_THETA = Math.PI / 2 - GAP_PHI;

/** Kept arc of every tier — thetaStart / thetaLength for the main body. */
const KEPT_START = GAP_THETA + GAP_HALF;
const KEPT_LEN = TAU - GAP_HALF * 2;

/** The removable slice itself — exactly fills the gap when cut is 0. */
const SLICE_START = GAP_THETA - GAP_HALF;
const SLICE_LEN = GAP_HALF * 2;

/** How far (world units) the slice slides out when the reveal is fully open. */
const PULL_DIST = 12;

/** True when a decoration at azimuth φ sits inside the removed wedge. */
function inGap(phi: number): boolean {
  const d = (((phi - GAP_PHI + Math.PI) % TAU) + TAU) % TAU - Math.PI;
  return Math.abs(d) < GAP_HALF;
}

/** Stable32-bit hash so a given layout always seeds the same way. */
function hashSeed(...values: number[]): number {
  let h = 2166136261;
  for (const v of values) {
    h ^= Math.round(v * 1000) | 0;
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * mulberry32 — tiny deterministic PRNG.
 *
 * Decorations are built during render, so they must be reproducible: a plain
 * `Math.random()` would reshuffle every pearl/sprinkle on each re-render.
 */
function seededRandom(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Pearl decorations along tier edges. When the cross-section is open the
// beads over the missing wedge disappear instead of floating in mid-air.
function PearlString({
  radius,
  y,
  count = 24,
  gapOpen = false,
}: {
  radius: number;
  y: number;
  count?: number;
  gapOpen?: boolean;
}) {
  const pearls = useMemo(() => {
    const rand = seededRandom(hashSeed(radius, y, count));
    const items: { pos: [number, number, number]; scale: number; phi: number }[] = [];
    for (let i = 0; i < count; i++) {
      const phi = (i / count) * TAU;
      items.push({
        pos: [Math.cos(phi) * radius * 0.98, y, Math.sin(phi) * radius * 0.98],
        scale: 0.4 + rand() * 0.15,
        phi,
      });
    }
    return items;
  }, [radius, y, count]);

  return (
    <group>
      {pearls.map((pearl, i) =>
        gapOpen && inGap(pearl.phi) ? null : (
          <mesh key={i} position={pearl.pos} castShadow>
            <sphereGeometry args={[pearl.scale, 16, 16]} />
            <meshStandardMaterial color="#ffd700" roughness={0.2} metalness={0.8} />
          </mesh>
        ),
      )}
    </group>
  );
}

// Macaron decorations on top
function MacaronToppings({
  radius,
  count = 8,
  gapOpen = false,
  maxRadiusAt,
}: {
  radius: number;
  count?: number;
  gapOpen?: boolean;
  /** Heart tops are not circular — clamp to the outline at each azimuth. */
  maxRadiusAt?: (phi: number) => number;
}) {
  const macarons = useMemo(() => {
    const rand = seededRandom(hashSeed(radius, count));
    const items: { pos: [number, number, number]; color: string; rotation: number; phi: number }[] = [];
    const colors = ["#ff9ff3", "#54a0ff", "#5f27cd", "#00d2d3", "#ff6b6b", "#c8d6e5"];
    for (let i = 0; i < count; i++) {
      const phi = (i / count) * TAU + rand() * 0.3;
      const r = Math.min(
        radius * 0.5 + rand() * radius * 0.35,
        maxRadiusAt ? maxRadiusAt(phi) * 0.9 : Infinity,
      );
      items.push({
        pos: [Math.cos(phi) * r, 0.3, Math.sin(phi) * r],
        color: colors[i % colors.length],
        rotation: rand() * Math.PI,
        phi,
      });
    }
    return items;
  }, [radius, count, maxRadiusAt]);

  // No slow spin here: a rotating group would carry macarons across the
  // open wedge and leave them hovering over the cut.

  return (
    <group>
      {macarons.map((m, i) =>
        gapOpen && inGap(m.phi) ? null : (
          <group key={i} position={m.pos} rotation={[0, m.rotation, 0]}>
            {/* Bottom shell */}
            <mesh position={[0, 0, 0]} castShadow>
              <cylinderGeometry args={[0.7, 0.75, 0.4, 16]} />
              <meshStandardMaterial color={m.color} roughness={0.5} />
            </mesh>
            {/* Filling */}
            <mesh position={[0, 0.25, 0]}>
              <cylinderGeometry args={[0.55, 0.55, 0.2, 16]} />
              <meshStandardMaterial color="#ffeaa7" roughness={0.6} />
            </mesh>
            {/* Top shell */}
            <mesh position={[0, 0.45, 0]} castShadow>
              <cylinderGeometry args={[0.7, 0.6, 0.35, 16]} />
              <meshStandardMaterial color={m.color} roughness={0.5} />
            </mesh>
          </group>
        ),
      )}
    </group>
  );
}

// Flower decorations
function FlowerDecorations({
  radius,
  count = 6,
  gapOpen = false,
  maxRadiusAt,
}: {
  radius: number;
  count?: number;
  gapOpen?: boolean;
  /** Heart tops are not circular — clamp to the outline at each azimuth. */
  maxRadiusAt?: (phi: number) => number;
}) {
  const flowers = useMemo(() => {
    const rand = seededRandom(hashSeed(radius, count));
    const items: { pos: [number, number, number]; color: string; scale: number; phi: number }[] = [];
    const colors = ["#ff6b6b", "#fd79a8", "#fdcb6e", "#a29bfe", "#74b9ff"];
    for (let i = 0; i < count; i++) {
      const phi = (i / count) * TAU;
      const r = maxRadiusAt ? maxRadiusAt(phi) * 0.98 : radius * 1.05;
      items.push({
        pos: [Math.cos(phi) * r, 0.5 + rand() * 0.4, Math.sin(phi) * r],
        color: colors[i % colors.length],
        scale: 0.8 + rand() * 0.4,
        phi,
      });
    }
    return items;
  }, [radius, count, maxRadiusAt]);

  return (
    <group>
      {flowers.map((f, i) =>
        gapOpen && inGap(f.phi) ? null : (
          <group key={i} position={f.pos} scale={f.scale}>
            {/* Petals */}
            {[...Array(6)].map((_, j) => (
              <mesh key={j} position={[Math.cos((j / 6) * TAU) * 0.8, 0, Math.sin((j / 6) * TAU) * 0.8]} rotation={[Math.PI / 2, 0, (j / 6) * TAU]} castShadow>
                <sphereGeometry args={[0.5, 8, 8]} />
                <meshStandardMaterial color={f.color} roughness={0.6} />
              </mesh>
            ))}
            {/* Center */}
            <mesh position={[0, 0, 0]} castShadow>
              <sphereGeometry args={[0.45, 12, 12]} />
              <meshStandardMaterial color="#ffeaa7" roughness={0.5} />
            </mesh>
            {/* Stem */}
            <mesh position={[0, -1.2, 0]} castShadow>
              <cylinderGeometry args={[0.12, 0.15, 2, 8]} />
              <meshStandardMaterial color="#2d3436" roughness={0.7} />
            </mesh>
          </group>
        ),
      )}
    </group>
  );
}

// Sprinkle particles
function Sprinkles({
  radius,
  count = 80,
  gapOpen = false,
  maxRadiusAt,
}: {
  radius: number;
  count?: number;
  gapOpen?: boolean;
  /** Heart tops are not circular — clamp to the outline at each azimuth. */
  maxRadiusAt?: (phi: number) => number;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const sprinkleData = useMemo(() => {
    const rand = seededRandom(hashSeed(radius, count));
    const items: { pos: [number, number, number]; color: string; rotation: [number, number, number]; phi: number }[] = [];
    const colors = ["#ff6b6b", "#74b9ff", "#fdcb6e", "#55efc4", "#a29bfe", "#fd79a8"];
    for (let i = 0; i < count; i++) {
      const phi = rand() * TAU;
      const r = Math.min(rand() * radius * 0.9, maxRadiusAt ? maxRadiusAt(phi) * 0.85 : Infinity);
      const y = 0.2 + rand() * 0.4;
      items.push({
        pos: [Math.cos(phi) * r, y, Math.sin(phi) * r],
        color: colors[Math.floor(rand() * colors.length)],
        rotation: [rand() * Math.PI, rand() * Math.PI, rand() * Math.PI],
        phi,
      });
    }
    return items;
  }, [radius, count, maxRadiusAt]);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const tempObject = new THREE.Object3D();
    const tempColor = new THREE.Color();
    sprinkleData.forEach((sprinkle, i) => {
      // Sprinkles over the missing wedge collapse to zero scale.
      const hidden = gapOpen && inGap(sprinkle.phi);
      tempObject.position.set(...sprinkle.pos);
      tempObject.rotation.set(...sprinkle.rotation);
      tempObject.scale.set(hidden ? 0 : 0.15, hidden ? 0 : 0.4, hidden ? 0 : 0.15);
      tempObject.updateMatrix();
      mesh.setMatrixAt(i, tempObject.matrix);
      tempColor.set(sprinkle.color);
      mesh.setColorAt(i, tempColor);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [sprinkleData, gapOpen]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]} castShadow>
      <capsuleGeometry args={[1, 1, 4, 8]} />
      <meshStandardMaterial roughness={0.5} />
    </instancedMesh>
  );
}

/** Fondant cap shared by every tier shape. */
const CAP_HEIGHT = 1.1;

/** How far the cap overhangs the tier below, forming the stacking ledge. */
const CAP_OVERHANG = 0.7;

/** Edge bevel on the extruded heart body / its fondant cap. */
const HEART_BEVEL = 0.3;
const CAP_BEVEL = 0.2;

/**
 * Classic parametric heart (16sin³t …) — tip at −Y, notch at +Y — scaled and
 * re-centred on its bounding box. The extruded tier rotates it so the tip
 * points at the camera (+Z) and the notch sits at the back.
 */
function buildHeartPoints(scale: number, segments = 96): THREE.Vector2[] {
  const raw: THREE.Vector2[] = [];
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < segments; i++) {
    const t = (i / segments) * TAU;
    const x = 16 * Math.sin(t) ** 3;
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    raw.push(new THREE.Vector2(x, y));
  }
  const cy = (minY + maxY) / 2;
  return raw.map((p) => new THREE.Vector2(p.x * scale, (p.y - cy) * scale));
}

/**
 * Distance from the centre to the heart outline along world azimuth φ.
 * Outline space maps to the world as (x, y) → (x, −y), so the local ray
 * direction is (cosφ, −sinφ). Used to keep toppings inside the heart — its
 * back notch and front tip are much closer in than a circle of the same width.
 */
function heartRadiusAt(pts: THREE.Vector2[], phi: number): number {
  const lx = Math.cos(phi);
  const ly = -Math.sin(phi);
  let best = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    const det = -(lx * ey - ex * ly);
    if (Math.abs(det) < 1e-9) continue;
    const t = (-a.x * ey + ex * a.y) / det;
    const u = (lx * a.y - ly * a.x) / det;
    if (t > 0 && u >= 0 && u <= 1 && t > best) best = t;
  }
  return best;
}

/**
 * Flat heart tier — the outline extruded with a soft bevel, a fondant cap on
 * top and piped pearls following the heart edge (round tiers get cylinders,
 * so they use PearlString instead).
 */
function HeartTier({
  radius,
  height,
  color,
  capColor,
  decoration,
}: {
  radius: number;
  height: number;
  color: string;
  capColor: string;
  decoration: Decoration;
}) {
  const body = useMemo(() => {
    const shape = new THREE.Shape(buildHeartPoints(radius / 16));
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: height - HEART_BEVEL * 2,
      bevelEnabled: true,
      bevelThickness: HEART_BEVEL,
      bevelSize: 0.35,
      bevelSegments: 3,
    });
    geo.rotateX(-Math.PI / 2);
    // The bevel dips below the shape; lift it so the tier stands on y = 0.
    geo.translate(0, HEART_BEVEL, 0);
    geo.computeVertexNormals();
    return geo;
  }, [radius, height]);

  const cap = useMemo(() => {
    const shape = new THREE.Shape(buildHeartPoints((radius + CAP_OVERHANG) / 16));
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: CAP_HEIGHT - CAP_BEVEL * 2,
      bevelEnabled: true,
      bevelThickness: CAP_BEVEL,
      bevelSize: 0.3,
      bevelSegments: 3,
    });
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, CAP_BEVEL, 0);
    geo.computeVertexNormals();
    return geo;
  }, [radius]);

  useEffect(() => () => body.dispose(), [body]);
  useEffect(() => () => cap.dispose(), [cap]);

  const pearls = useMemo(() => {
    const rand = seededRandom(hashSeed(radius, height, decoration === "pearls" ? 2 : 1));
    const footPts = buildHeartPoints((radius + 0.45) / 16, 64);
    const capPts = buildHeartPoints((radius + CAP_OVERHANG - 0.55) / 16, 64);
    const items: { pos: [number, number, number]; scale: number }[] = [];
    const footCount = Math.max(16, Math.round(radius * 3.4));
    for (let i = 0; i < footCount; i++) {
      const p = footPts[Math.round((i * 64) / footCount) % 64];
      items.push({ pos: [p.x, 0.5, -p.y], scale: 0.4 + rand() * 0.15 });
    }
    if (decoration === "pearls") {
      const capCount = Math.max(16, Math.round((radius + CAP_OVERHANG) * 3.4));
      for (let i = 0; i < capCount; i++) {
        const p = capPts[Math.round((i * 64) / capCount) % 64];
        items.push({ pos: [p.x, height + 0.5, -p.y], scale: 0.4 + rand() * 0.15 });
      }
    }
    return items;
  }, [radius, height, decoration]);

  return (
    <group>
      <mesh geometry={body} castShadow receiveShadow>
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.02} />
      </mesh>
      <mesh geometry={cap} position={[0, height - CAP_HEIGHT, 0]} castShadow receiveShadow>
        <meshStandardMaterial color={capColor} roughness={0.65} />
      </mesh>
      {pearls.map((pearl, i) => (
        <mesh key={i} position={pearl.pos} castShadow>
          <sphereGeometry args={[pearl.scale, 16, 16]} />
          <meshStandardMaterial color="#ffd700" roughness={0.2} metalness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Flat interior wall closing one edge of the cross-section cut. Positioned in
 * world azimuths (outside the square tier's yaw group) so it always lines up
 * with the wedge the cylinders leave open.
 */
function CutFace({
  phi,
  radius,
  height,
  y,
  texture,
  color,
}: {
  phi: number;
  radius: number;
  height: number;
  y: number;
  texture?: THREE.Texture | null;
  color?: string;
}) {
  return (
    <mesh
      position={[(Math.cos(phi) * radius) / 2, y, (Math.sin(phi) * radius) / 2]}
      rotation={[0, -phi, 0]}
      receiveShadow
    >
      <planeGeometry args={[radius, height]} />
      {texture ? (
        <meshStandardMaterial map={texture} roughness={0.75} side={THREE.DoubleSide} />
      ) : (
        <meshStandardMaterial color={color ?? CREAM} roughness={0.65} side={THREE.DoubleSide} />
      )}
    </mesh>
  );
}

function CakeTier({
  shape,
  radius,
  height,
  color,
  decoration,
  part,
  gapOpen,
  interior,
  capColor,
}: {
  shape: Shape;
  radius: number;
  height: number;
  color: string;
  decoration: Decoration;
  /** "main" keeps the wedge open; "slice" is the removed piece itself. */
  part: "main" | "slice";
  gapOpen: boolean;
  interior: THREE.Texture | null;
  capColor: string;
}) {
  if (shape === "heart") {
    // Heart geometry has no cylindrical arc to slice — render it whole, with
    // its own extruded body, fondant cap and piped edge.
    return (
      <HeartTier
        radius={radius}
        height={height}
        color={color}
        capColor={capColor}
        decoration={decoration}
      />
    );
  }

  // Only cylinder-based shapes get the wedge: a 4-segment square would lose
  // its clean silhouette to the cut's uneven vertex spacing.
  const wedge = shape === "round" || shape === "number";
  const segments = shape === "square" ? 4 : 64;
  // A 4-segment cylinder puts its corners on the axes — yaw it so a flat face
  // points forward instead of presenting a knife-edge to the camera.
  const yaw = shape === "square" ? Math.PI / 4 : 0;
  const capHeight = CAP_HEIGHT;
  const capOverhang = CAP_OVERHANG;
  const sideHeight = height - capHeight;

  // The wedge lives in world azimuths; square tiers yaw their local frame, so
  // shift thetaStart to keep the gap facing the camera regardless.
  const thetaStart = wedge ? (part === "main" ? KEPT_START : SLICE_START) - yaw : 0;
  const thetaLength = wedge ? (part === "main" ? KEPT_LEN : SLICE_LEN) : TAU;

  const phiEdges: [number, number] = [GAP_PHI - GAP_HALF, GAP_PHI + GAP_HALF];

  return (
    <group>
      <group rotation={[0, yaw, 0]}>
        {/* Frosting side — the cream cap below hides its top edge */}
        <mesh position={[0, sideHeight / 2, 0]} castShadow receiveShadow>
          <cylinderGeometry
            args={[radius, radius * 0.985, sideHeight, segments, 1, false, thetaStart, thetaLength]}
          />
          <meshStandardMaterial color={color} roughness={0.5} metalness={0.02} />
        </mesh>

        {/* Fondant cap — overhangs to form the ledge the tier above rests on */}
        <mesh position={[0, height - capHeight / 2, 0]} castShadow receiveShadow>
          <cylinderGeometry
            args={[
              radius + capOverhang,
              radius + capOverhang,
              capHeight,
              segments,
              1,
              false,
              thetaStart,
              thetaLength,
            ]}
          />
          <meshStandardMaterial color={capColor} roughness={0.65} />
        </mesh>
      </group>

      {wedge && (
        <>
          {/* Sponge/cream/crunch interior on both cut walls */}
          {phiEdges.map((phi) => (
            <CutFace
              key={`side-${phi}`}
              phi={phi}
              radius={radius}
              height={sideHeight}
              y={sideHeight / 2}
              texture={interior}
            />
          ))}
          {/* The cap's own cut is solid fondant — no layers there */}
          {phiEdges.map((phi) => (
            <CutFace
              key={`cap-${phi}`}
              phi={phi}
              radius={radius + capOverhang}
              height={capHeight}
              y={height - capHeight / 2}
              color={capColor}
            />
          ))}
        </>
      )}

      {/* Gold pearl border resting on the foot of every tier (main body only —
          the slice keeps its own clean edge) */}
      {part === "main" && (
        <>
          <PearlString
            radius={radius + 0.45}
            y={0.5}
            count={Math.max(14, Math.round(radius * 3.4))}
            gapOpen={gapOpen}
          />
          {decoration === "pearls" && (
            // Second ring seated ON the cap surface near its edge — outside the
            // overhang or above the cap it would hang in mid-air.
            <PearlString
              radius={radius + capOverhang - 0.55}
              y={height + 0.5}
              count={Math.max(16, Math.round((radius + capOverhang) * 3.4))}
              gapOpen={gapOpen}
            />
          )}
        </>
      )}
    </group>
  );
}

function Candle({ position }: { position: [number, number, number] }) {
  const flameRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (flameRef.current) {
      flameRef.current.scale.set(1 + Math.sin(t * 9) * 0.08, 1 + Math.sin(t * 13) * 0.14, 1);
      flameRef.current.rotation.y = t * 2;
    }
    if (lightRef.current) {
      lightRef.current.intensity = 2.2 + Math.sin(t * 11) * 0.45 + Math.random() * 0.15;
    }
  });

  return (
    <group position={position}>
      <mesh position={[0, 3, 0]} castShadow>
        <cylinderGeometry args={[0.8, 1, 6, 16]} />
        <meshStandardMaterial color="#ffb6c1" roughness={0.6} />
      </mesh>
      <mesh position={[0, 6.4, 0]}>
        <cylinderGeometry args={[0.12, 0.12, 1, 8]} />
        <meshStandardMaterial color="#2a2a2a" />
      </mesh>
      <mesh ref={flameRef} position={[0, 7.6, 0]}>
        <coneGeometry args={[0.9, 2.8, 8]} />
        <meshBasicMaterial color="#ffa500" transparent opacity={0.92} />
      </mesh>
      <mesh position={[0, 7.2, 0]}>
        <coneGeometry args={[0.45, 1.4, 8]} />
        <meshBasicMaterial color="#ffff00" />
      </mesh>
      <pointLight ref={lightRef} position={[0, 8, 0]} color="#ffaa00" intensity={2} distance={18} />
    </group>
  );
}

type OrbitControlsLike = THREE.EventDispatcher & {
  target: THREE.Vector3;
  update: () => void;
};

/**
 * R3F applies the `camera` prop only on first mount, so a weight change (which
 * needs a different distance/target for the taller cake) would be ignored and
 * the cake would overflow the frame. Sync both explicitly instead.
 */
function CameraRig({
  position,
  target,
}: {
  position: [number, number, number];
  target: [number, number, number];
}) {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as OrbitControlsLike | null;

  const [px, py, pz] = position;
  const [tx, ty, tz] = target;

  useLayoutEffect(() => {
    camera.position.set(px, py, pz);
    if (controls) {
      controls.target.set(tx, ty, tz);
      controls.update();
    } else {
      camera.lookAt(tx, ty, tz);
    }
  }, [camera, controls, px, py, pz, tx, ty, tz]);

  return null;
}

export function Cake3DPreview({
  shape,
  color,
  tiers,
  message,
  font,
  textColor: inkColor,
  decoration = "none",
  cut = 0,
}: {
  shape: Shape;
  color: string;
  tiers: number;
  message: string;
  font: string;
  textColor: string;
  decoration?: Decoration;
  /** Cross-section reveal, 0 (closed) → 1 (slice fully pulled out). */
  cut?: number;
}) {
  const baseRadius = 14;
  const tierHeight = 7;
  const numTiers = Math.min(4, Math.max(1, Math.round(tiers)));
  const radiusStep = 3.6;
  /** Vertical offset of the whole cake assembly inside the scene. */
  const groupY = -6;

  const fontDef = getCakeFont(font);

  // Only cylinder-based shapes can carry the wedge cut (see CakeTier).
  const canCut = shape === "round" || shape === "number";
  const gapOpen = canCut && cut > 0.05;
  const cutOut = canCut ? cut * PULL_DIST : 0;

  const finish = finishForColor(color);
  const layers = finish?.layers ?? VANILLA_LAYERS;
  // The whole outside wears the chosen finish colour — cap included. Deriving
  // the cap from `layers.cream` left a white top on any custom colour, which
  // looked like two different frostings instead of one coated cake.
  const capColor = color;

  // Sponge/cream/crunch bands painted onto the cut walls — one small canvas
  // texture per finish so the reveal shows the recipe, not just the outside.
  const interior = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const bands: [string, number][] = [
      [layers.sponge, 0.34],
      [layers.cream, 0.14],
      [layers.crunch, 0.1],
      [layers.sponge, 0.28],
      [layers.cream, 0.14],
    ];
    let y = 0;
    for (const [bandColor, frac] of bands) {
      const h = Math.round(frac * 256);
      ctx.fillStyle = bandColor;
      ctx.fillRect(0, y, 32, h);
      y += h;
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, [layers.sponge, layers.cream, layers.crunch]);

  useEffect(() => () => interior?.dispose(), [interior]);

  const topRadius = useMemo(
    () => baseRadius - (numTiers - 1) * radiusStep,
    [baseRadius, numTiers, radiusStep],
  );
  const topY = useMemo(() => numTiers * tierHeight, [numTiers, tierHeight]);

  // A heart's top is not a circle — its tip and back notch come in much
  // closer than the width — so toppings are clamped to the real outline.
  const maxRadiusAt = useMemo(() => {
    if (shape !== "heart") return undefined;
    const outline = buildHeartPoints(topRadius / 16, 96);
    return (phi: number) => heartRadiusAt(outline, phi);
  }, [shape, topRadius]);

  // Aim at the visual centre of the assembly (board bottom → candle tip) so
  // neither the board nor the flame gets clipped at the frame edges.
  const targetY = groupY + (topY + 4) / 2;
  const distance = 39 + numTiers * 6;
  const camY = targetY + distance * 0.3;
  const camRadius = Math.sqrt(distance ** 2 - (distance * 0.3) ** 2);
  const cameraPosition: [number, number, number] = [camRadius * 0.55, camY, camRadius * 0.835];

  // Calculate dimensions for display
  const cakeHeight = numTiers * tierHeight + 8;
  const cakeWidth = baseRadius * 2;

  return (
    <div className="relative h-[420px] w-full overflow-hidden rounded-b-2xl bg-[radial-gradient(circle_at_50%_32%,#3b2a1c_0%,#1b130d_52%,#0b0806_100%)]">
      {/* UI Overlay */}
      <div className="absolute left-3 top-3 z-10 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-[10px] font-medium text-white ring-1 ring-white/10 backdrop-blur-sm">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        360° Drag to Orbit & Inspect
      </div>

      {/* Dimensions display */}
      <div className="absolute right-3 top-3 z-10 rounded-lg bg-black/60 px-3 py-2 text-[10px] font-medium text-white ring-1 ring-white/10 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="text-center">
            <div className="text-[8px] uppercase opacity-70">Height</div>
            <div>{cakeHeight.toFixed(0)} cm</div>
          </div>
          <div className="h-6 w-px bg-white/30" />
          <div className="text-center">
            <div className="text-[8px] uppercase opacity-70">Width</div>
            <div>{cakeWidth.toFixed(0)} cm</div>
          </div>
        </div>
      </div>

      {/* Bottom status bar — finish + crown, as on the reference configurator */}
      <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-center gap-3 rounded-full bg-black/60 px-4 py-1.5 text-[10px] font-semibold text-white ring-1 ring-white/10 backdrop-blur-sm">
        <span className="truncate">ফিনিশ: {finishNameFor(color)}</span>
        <span className="h-3 w-px shrink-0 bg-white/30" />
        <span className="truncate">ক্রাউন: {crownLabel(decoration)}</span>
      </div>

      <Canvas shadows camera={{ position: cameraPosition, fov: 45 }} gl={{ antialias: true }}>
        {/*
          Env map rendered locally from light formers. A `preset` would pull an
          HDR from a third-party CDN, which our CSP `connect-src` blocks — the
          rejected fetch threw inside <Canvas> and blanked the whole preview.
        */}
        <Environment resolution={256} frames={1}>
          <color attach="background" args={["#f7f3ec"]} />
          <Lightformer intensity={3} position={[0, 6, -9]} scale={[14, 7, 1]} color="#fff6e8" />
          <Lightformer
            intensity={2.2}
            position={[-9, 4, 3]}
            rotation-y={Math.PI / 2}
            scale={[9, 7, 1]}
            color="#eef4ff"
          />
          <Lightformer
            intensity={2.2}
            position={[9, 4, 3]}
            rotation-y={-Math.PI / 2}
            scale={[9, 7, 1]}
            color="#fff1e2"
          />
          <Lightformer intensity={1.6} position={[0, 9, 5]} rotation-x={Math.PI / 2} scale={[14, 9, 1]} />
        </Environment>

        <ambientLight intensity={0.8} />
        <directionalLight
          position={[22, 36, 20]}
          intensity={2.1}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0004}
          shadow-camera-left={-32}
          shadow-camera-right={32}
          shadow-camera-top={44}
          shadow-camera-bottom={-24}
          shadow-camera-far={140}
        />
        {/* Cool rim from behind keeps the tiers off the backdrop */}
        <directionalLight position={[-26, 20, -18]} intensity={0.9} color="#eef4ff" />
        <pointLight position={[0, 24, 34]} intensity={0.6} />
        <pointLight position={[-18, 8, 20]} intensity={0.35} color="#ffe4c4" />

        <group position={[0, groupY, 0]}>
          {/* Main body — the wedge is always cut into the geometry; the slice
              below fills it perfectly while the reveal is closed. */}
          {[...Array(numTiers)].map((_, i) => (
            <group key={i} position={[0, i * tierHeight, 0]}>
              {/* Bottom tier is the widest; each tier above steps in. */}
              <CakeTier
                shape={shape}
                radius={baseRadius - i * radiusStep}
                height={tierHeight}
                color={color}
                decoration={decoration}
                part="main"
                gapOpen={gapOpen}
                interior={interior}
                capColor={capColor}
              />
            </group>
          ))}

          {/* The removable slice — slides out along the gap bisector */}
          {canCut && (
            <group position={[Math.cos(GAP_PHI) * cutOut, 0, Math.sin(GAP_PHI) * cutOut]}>
              {[...Array(numTiers)].map((_, i) => (
                <group key={i} position={[0, i * tierHeight, 0]}>
                  <CakeTier
                    shape={shape}
                    radius={baseRadius - i * radiusStep}
                    height={tierHeight}
                    color={color}
                    decoration={decoration}
                    part="slice"
                    gapOpen={false}
                    interior={interior}
                    capColor={capColor}
                  />
                </group>
              ))}
            </group>
          )}

          {/* Top decorations — seated on the cap of the top tier */}
          <group position={[0, topY, 0]}>
            {decoration === "macarons" && (
              <MacaronToppings
                radius={topRadius}
                count={numTiers * 4}
                gapOpen={gapOpen}
                maxRadiusAt={maxRadiusAt}
              />
            )}
            {decoration === "flowers" && (
              <FlowerDecorations
                radius={topRadius}
                count={numTiers * 2}
                gapOpen={gapOpen}
                maxRadiusAt={maxRadiusAt}
              />
            )}
            {decoration === "sprinkles" && (
              <Sprinkles
                radius={topRadius}
                count={60}
                gapOpen={gapOpen}
                maxRadiusAt={maxRadiusAt}
              />
            )}
          </group>

          {/*
            Message piped flat ON the cap, like real icing writing — the Html
            is laid down with rotation-x = −90° so it shares the top surface
            instead of billboard-float in front of the cake. distanceFactor 40
            maps CSS pixels to world units at px/10 (see drei Html transform).
            It sits forward of the candle on round/square tops, but behind it
            on hearts, where the front tip narrows to a point.
          */}
          {message && (
            <Html
              position={[
                0,
                topY + 0.2,
                shape === "heart" ? -topRadius * 0.32 : topRadius * 0.35,
              ]}
              rotation={[-Math.PI / 2, 0, 0]}
              transform
              distanceFactor={40}
            >
              <div
                className="pointer-events-none select-none text-center"
                style={{
                  color: inkColor,
                  fontFamily: fontDef.family,
                  fontWeight: 700,
                  fontSize: `${Math.max(9, Math.min(20, topRadius * 1.35)) * fontDef.scale}px`,
                  lineHeight: 1.15,
                  textShadow: `0 1px 0 rgba(255,255,255,0.35), 0 2px 4px rgba(0,0,0,0.4)`,
                  maxWidth: Math.round(topRadius * 14),
                  wordBreak: "break-word",
                }}
              >
                {message}
              </div>
            </Html>
          )}

          <Candle position={[0, topY, 0]} />

          {/* Cake board — thin cream drum the tiers sit on */}
          <mesh receiveShadow position={[0, -0.5, 0]}>
            <cylinderGeometry args={[baseRadius + 4, baseRadius + 4, 1, 64]} />
            <meshStandardMaterial color={CREAM} roughness={0.7} metalness={0.02} />
          </mesh>

          <ContactShadows position={[0, 0.03, 0]} opacity={0.4} scale={70} blur={2.5} far={14} />
        </group>

        <CameraRig position={cameraPosition} target={[0, targetY, 0]} />

        <OrbitControls
          makeDefault
          enablePan={false}
          enableZoom
          target={[0, targetY, 0]}
          minPolarAngle={Math.PI / 7}
          maxPolarAngle={Math.PI / 2.15}
          minDistance={28}
          maxDistance={72}
          autoRotate
          autoRotateSpeed={0.45}
        />
      </Canvas>
    </div>
  );
}
