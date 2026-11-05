"use client";

import { Component, Suspense, useEffect, useMemo, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

import { SILHOUETTES } from "@/components/product/GarmentArt";
import { frameFor, placementFor, surfaceZ, type Frame, type GarmentDimensions } from "./garmentModel";

export interface PreviewZone {
  code: string;
  widthMm: number;
  heightMm: number;
}

export type ZoneTextures = Record<string, HTMLCanvasElement | null>;
export type View = "front" | "back" | "side";

// ------------------------------------------------------------------------------------------------ textures

function silhouetteMask(garmentType: string): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = Math.round((512 * 230) / 240);
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.scale(c.width / 240, c.height / 230);
  ctx.fillStyle = "#fff";
  ctx.fill(new Path2D(SILHOUETTES[garmentType] ?? SILHOUETTES.TSHIRT), "evenodd");
  return new THREE.CanvasTexture(c);
}

/** Fine rib-knit bump texture so the fabric catches light like cotton jersey. */
function knitTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  for (let x = 0; x < 128; x++) {
    for (let y = 0; y < 128; y++) {
      const rib = Math.sin((x / 128) * Math.PI * 32) * 22;
      const v = 128 + rib + (Math.random() - 0.5) * 30;
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// ------------------------------------------------------------------------------------------------ geometry

/** A grid over the whole silhouette, bent around the body; the alpha mask cuts out the garment shape. */
function panelGeometry(f: Frame, side: "front" | "back"): THREE.PlaneGeometry {
  const width = 240 * f.sx;
  const height = 230 * f.sy;
  const g = new THREE.PlaneGeometry(width, height, 96, 96);
  g.translate(0, -(115 - f.torso.yShoulder) * f.sy, 0);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setZ(i, surfaceZ(f, pos.getX(i)));
  if (side === "back") g.rotateY(Math.PI);
  g.computeVertexNormals();
  return g;
}

/** A print area as its own surface patch following the same curvature (slightly in front of the fabric). */
function printGeometry(f: Frame, p: { side: "front" | "back"; centerX: number; topY: number; width: number; height: number }) {
  const g = new THREE.PlaneGeometry(p.width, p.height, 40, 40);
  g.translate(p.centerX, p.topY - p.height / 2, 0);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setZ(i, surfaceZ(f, pos.getX(i)) + 0.0015);
  if (p.side === "back") g.rotateY(Math.PI);
  g.computeVertexNormals();
  return g;
}

// ------------------------------------------------------------------------------------------------ scene

function GarmentMesh({ garmentType, colorHex, dims, zones, textures }: {
  garmentType: string; colorHex: string; dims: GarmentDimensions; zones: PreviewZone[]; textures: ZoneTextures;
}) {
  const frame = useMemo(() => frameFor(garmentType, dims), [garmentType, dims]);
  const mask = useMemo(() => silhouetteMask(garmentType), [garmentType]);
  const knit = useMemo(() => knitTexture(), []);
  useEffect(() => { knit.repeat.set(dims.width * 60, dims.length * 60); }, [knit, dims]);
  const front = useMemo(() => panelGeometry(frame, "front"), [frame]);
  const back = useMemo(() => panelGeometry(frame, "back"), [frame]);
  const prints = useMemo(() => zones
    .filter((z) => textures[z.code])
    .map((z) => {
      const tex = new THREE.CanvasTexture(textures[z.code]!);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      return { code: z.code, geometry: printGeometry(frame, placementFor(garmentType, z, frame)), texture: tex };
    }), [zones, textures, frame, garmentType]);
  useEffect(() => () => prints.forEach((p) => { p.geometry.dispose(); p.texture.dispose(); }), [prints]);

  const fabric = (
    <meshStandardMaterial color={colorHex} roughness={0.93} metalness={0} alphaMap={mask} alphaTest={0.5}
      bumpMap={knit} bumpScale={0.6} side={THREE.DoubleSide} />
  );
  return (
    // Shoulder line sits at the garment's length so the hem rests on the floor (y = 0).
    <group position={[0, dims.length + 0.01, 0]}>
      <mesh geometry={front} castShadow receiveShadow>{fabric}</mesh>
      <mesh geometry={back} castShadow receiveShadow>{fabric}</mesh>
      {prints.map((p) => (
        <mesh key={p.code} geometry={p.geometry}>
          <meshStandardMaterial map={p.texture} transparent roughness={0.8} polygonOffset polygonOffsetFactor={-2} />
        </mesh>
      ))}
    </group>
  );
}

function StickerMesh({ zones, textures }: { zones: PreviewZone[]; textures: ZoneTextures }) {
  const zone = zones[0];
  const aspect = zone ? zone.heightMm / zone.widthMm : 1;
  const w = 0.12;
  const h = w * aspect;
  const backing = useMemo(() => {
    const s = new THREE.Shape();
    const r = 0.012, x = -w / 2 - 0.006, y = -h / 2 - 0.006, W = w + 0.012, H = h + 0.012;
    s.moveTo(x + r, y); s.lineTo(x + W - r, y); s.quadraticCurveTo(x + W, y, x + W, y + r); s.lineTo(x + W, y + H - r);
    s.quadraticCurveTo(x + W, y + H, x + W - r, y + H); s.lineTo(x + r, y + H); s.quadraticCurveTo(x, y + H, x, y + H - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    return new THREE.ExtrudeGeometry(s, { depth: 0.0015, bevelEnabled: false });
  }, [w, h]);
  const texture = useMemo(() => {
    const c = zone && textures[zone.code];
    if (!c) return null;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [zone, textures]);
  return (
    <group position={[0, h / 2 + 0.03, 0]} rotation={[-0.25, 0.35, 0.05]}>
      <mesh geometry={backing} castShadow><meshStandardMaterial color="#ffffff" roughness={0.35} /></mesh>
      {texture && (
        <mesh position={[0, 0, 0.0017]}>
          <planeGeometry args={[w, h]} />
          <meshStandardMaterial map={texture} transparent roughness={0.25} metalness={0.05} />
        </mesh>
      )}
    </group>
  );
}

/** Moves the camera to a preset view; users can still orbit freely afterwards. */
function CameraRig({ view, distance, targetY }: { view: View; distance: number; targetY: number }) {
  const { camera, controls } = useThree() as unknown as { camera: THREE.PerspectiveCamera; controls: { target: THREE.Vector3; update: () => void } | null };
  useEffect(() => {
    // "Side" is a three-quarter view: the placeholder model is two curved panels, which a pure profile would expose.
    const angle = view === "front" ? 0 : view === "back" ? Math.PI : Math.PI / 6;
    camera.position.set(Math.sin(angle) * distance, targetY + distance * 0.08, Math.cos(angle) * distance);
    if (controls) {
      controls.target.set(0, targetY, 0);
      controls.update();
    } else {
      camera.lookAt(0, targetY, 0);
    }
  }, [view, distance, targetY, camera, controls]);
  return null;
}

export function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

class Boundary extends Component<{ fallback: React.ReactNode; children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function Garment3D({ garmentType, colorHex, dims, zones, textures, view, fallback, label }: {
  garmentType: string;
  colorHex: string;
  dims: GarmentDimensions;
  zones: PreviewZone[];
  textures: ZoneTextures;
  view: View;
  fallback: React.ReactNode;
  label: string;
}) {
  const [supported] = useState(() => webglAvailable());
  const sticker = garmentType.startsWith("STICKER");
  const spanW = sticker ? 0.2 : dims.width * 2.2;
  const targetY = sticker ? 0.08 : dims.length * 0.55;
  const distance = Math.max(spanW, sticker ? 0.25 : dims.length * 1.3) * 1.9;
  if (!supported) return <>{fallback}</>;
  return (
    <Boundary fallback={fallback}>
      <div className="h-full w-full" role="img" aria-label={label}>
        <Canvas shadows dpr={[1, 2]} camera={{ fov: 32, near: 0.01, far: 20 }} gl={{ preserveDrawingBuffer: false, antialias: true }}>
          <color attach="background" args={["#F4EEE4"]} />
          <hemisphereLight args={["#ffffff", "#c9bfae", 0.9]} />
          <directionalLight position={[1.5, 2.5, 2]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} />
          <directionalLight position={[-2, 1, -1.5]} intensity={0.45} />
          <Suspense fallback={null}>
            {sticker ? <StickerMesh zones={zones} textures={textures} /> : (
              <GarmentMesh garmentType={garmentType} colorHex={colorHex} dims={dims} zones={zones} textures={textures} />
            )}
          </Suspense>
          <ContactShadows position={[0, 0, 0]} opacity={0.35} scale={sticker ? 0.6 : 2} blur={2.4} far={1.2} />
          <OrbitControls makeDefault enableDamping minDistance={distance * 0.35} maxDistance={distance * 2.5}
            minPolarAngle={0.2} maxPolarAngle={Math.PI / 2} />
          <CameraRig view={view} distance={distance} targetY={targetY} />
        </Canvas>
      </div>
    </Boundary>
  );
}
