import type { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math";
import type { BuildingKind } from "../sim/buildingKinds";

const PROFILES = ["casual", "backpacker", "office", "worker", "farmer", "soldier"] as const;
const SKIN = ["#edbe98", "#c58a60", "#855238", "#57392c"];
const CLOTHES = ["#b85543", "#41698b", "#508267", "#c3a154"];
const HAIR = ["#352822", "#724730", "#c5a36d", "#595650"];
const SPECIALISTS = { commercial: 2, industrial: 3, agricultural: 4, military: 5 };

/** Stable local mix: three quarters specialists on their frontage, civilians elsewhere. */
export function pedestrianProfile(frontage: BuildingKind | null | undefined, seed: number): number {
  const specialist = SPECIALISTS[frontage as keyof typeof SPECIALISTS];
  return specialist !== undefined && seed % 4 !== 3 ? specialist : seed % 3;
}

export function animatePedestrian(limbs: readonly AbstractMesh[], phase: number, moving: boolean): void {
  const swing = moving ? Math.sin(phase) * 0.48 : 0;
  for (const [i, limb] of limbs.entries()) limb.rotation.x = (i === 0 || i === 3 ? 1 : -1) * swing;
}

export function createPedestrianModels(scene: Scene) {
  const material = new StandardMaterial("pedestrian_palette", scene);
  material.diffuseColor = Color3.White();
  material.specularColor = Color3.Black();
  const prototypes = PROFILES.map((profile, profileIndex) => SKIN.map((skin, variant) => {
    const shirt = profileIndex === 3 ? "#dba52e" : profileIndex === 4 ? "#617748"
      : profileIndex === 5 ? "#626a46" : profileIndex === 2 ? "#414d61" : CLOTHES[variant]!;
    const trousers = profileIndex === 5 ? "#484e35" : variant % 2 ? "#384351" : "#51463c";
    let pieces: Mesh[] = [];
    const paint = (mesh: Mesh, color: string, x: number, y: number, z: number) => {
      mesh.position.set(x, y, z);
      const data = VertexData.ExtractFromMesh(mesh);
      const rgb = Color3.FromHexString(color).asArray();
      data.colors = Array.from({ length: mesh.getTotalVertices() }, () => [...rgb, 1]).flat();
      data.applyToMesh(mesh);
      pieces.push(mesh);
      return mesh;
    };
    const box = (color: string, w: number, h: number, d: number, x: number, y: number, z = 0) =>
      paint(MeshBuilder.CreateBox("pedestrian_piece", { width: w, height: h, depth: d }, scene), color, x, y, z);
    const round = (color: string, top: number, bottom: number, height: number, x: number, y: number, z = 0) =>
      paint(MeshBuilder.CreateCylinder("pedestrian_piece", { diameterTop: top, diameterBottom: bottom, height, tessellation: 8 }, scene), color, x, y, z);
    const merge = (part: string) => {
      const mesh = Mesh.MergeMeshes(pieces, true, true, undefined, false, false)!;
      pieces = [];
      mesh.name = `walker_${profile}_${variant}_${part}`;
      mesh.material = material;
      mesh.isVisible = false;
      mesh.isPickable = false;
      mesh.hasVertexAlpha = false;
      return mesh;
    };

    const torso = round(shirt, 0.52, 0.43, 0.56, 0, 1.02);
    torso.scaling.z = 0.62;
    round(skin, 0.16, 0.18, 0.12, 0, 1.35);
    const head = round(skin, 0.35, 0.29, 0.35, 0, 1.56, 0.015);
    head.scaling.z = 0.9;
    round(HAIR[variant]!, 0.3, 0.36, 0.13, 0, 1.75);
    box(HAIR[variant]!, 0.3, variant % 2 ? 0.24 : 0.13, 0.1, 0, 1.62, -0.13);
    box(trousers, 0.39, 0.16, 0.29, 0, 0.75);
    if (profile === "backpacker" || profile === "soldier") {
      box(profile === "soldier" ? "#424a32" : "#ba753e", 0.36, 0.44, 0.2, 0, 1.04, -0.24);
      for (const x of [-0.16, 0.16]) box("#393c32", 0.045, 0.48, 0.045, x, 1.05, 0.16);
    }
    if (profile === "office") {
      box("#e5dfcf", 0.15, 0.26, 0.025, 0, 1.16, 0.17);
      box("#9a493b", 0.05, 0.25, 0.03, 0, 1.12, 0.19);
    }
    if (profile === "worker" || profile === "soldier" || profile === "farmer") {
      const hat = profile === "worker" ? "#efbf36" : profile === "farmer" ? "#c2a26c" : "#626a46";
      round(hat, 0.3, 0.42, 0.18, 0, 1.79);
      round(hat, profile === "farmer" ? 0.62 : 0.45, profile === "farmer" ? 0.62 : 0.45, 0.045, 0, 1.71);
    }
    if (profile === "worker") {
      for (const x of [-0.14, 0.14]) box("#f5e8a5", 0.06, 0.48, 0.035, x, 1.02, 0.165);
    }
    const body = merge("body");
    const limbs = [-1, 1].map((side) => {
      box(shirt, 0.17, 0.4, 0.2, 0, -0.18);
      round(skin, 0.13, 0.12, 0.18, 0, -0.46);
      if (profile === "office" && side === 1) {
        box("#3b302a", 0.12, 0.25, 0.34, 0, -0.65);
        box("#3b302a", 0.08, 0.08, 0.12, 0, -0.5);
      }
      const arm = merge(side < 0 ? "left_arm" : "right_arm");
      arm.position.set(side * 0.32, 1.24, 0);
      return arm;
    });
    for (const side of [-1, 1]) {
      box(trousers, 0.17, 0.57, 0.21, 0, -0.28);
      box("#302e2c", 0.19, 0.13, 0.32, 0, -0.605, 0.045);
      const leg = merge(side < 0 ? "left_leg" : "right_leg");
      leg.position.set(side * 0.115, 0.67, 0);
      limbs.push(leg);
    }
    body.metadata = { pedestrianProfile: profile, variant };
    return { body, limbs };
  }));
  return {
    prototypes,
    create(name: string, frontage: BuildingKind | null | undefined, seed: number) {
      const model = prototypes[pedestrianProfile(frontage, seed)]![Math.floor(seed / 3) % SKIN.length]!;
      const body = model.body.createInstance(name);
      body.isPickable = false;
      for (const prototype of model.limbs) {
        const limb = prototype.createInstance(`pedestrianpart_${name}_${prototype.name}`);
        limb.parent = body;
        limb.isPickable = false;
      }
      return body;
    },
    dispose() {
      for (const model of prototypes.flat()) for (const mesh of [model.body, ...model.limbs]) mesh.dispose();
      material.dispose();
    },
  };
}
