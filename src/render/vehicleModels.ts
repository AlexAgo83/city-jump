import type { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math";
import "@babylonjs/loaders/glTF";

import { createPedestrianModels } from "./pedestrianModels";

import catalog from "../../public/vehicles/manifest.json";
import type { BuildingKind } from "../sim/buildingKinds";
import { ASSET_VERSION } from "./assets";

const CAR_COLORS = [
  new Color3(0.72, 0.16, 0.12), new Color3(0.16, 0.34, 0.56),
  new Color3(0.86, 0.72, 0.3), new Color3(0.82, 0.84, 0.8),
];
const THEME_COLORS = {
  agricultural: [new Color3(0.2, 0.4, 0.19), new Color3(0.78, 0.5, 0.15)],
  industrial: [new Color3(0.65, 0.69, 0.68), new Color3(0.3, 0.42, 0.55)],
  military: [new Color3(0.3, 0.34, 0.24), new Color3(0.4, 0.39, 0.3)],
};
const CAR_SHAPES = catalog.map((shape) => ({ ...shape, theme: shape.theme as BuildingKind | null }));
const THEMED_SHAPES = new Map<BuildingKind, number[]>();
CAR_SHAPES.forEach((shape, index) => {
  if (shape.theme) THEMED_SHAPES.set(shape.theme, [...(THEMED_SHAPES.get(shape.theme) ?? []), index]);
});
const PLAIN_SHAPES = CAR_SHAPES.map((_, index) => index).filter((index) => !CAR_SHAPES[index]!.theme);

export function createVehicleModels(scene: Scene) {
  let disposed = false;
  let loading: Promise<boolean[]> | undefined;
  const material = (name: string, color: Color3) => {
    const result = new StandardMaterial(name, scene);
    result.diffuseColor = color;
    result.specularColor = new Color3(0.18, 0.18, 0.18);
    return result;
  };
  // Small, immediately usable fallbacks also keep traffic alive if an asset cannot load.
  // Geometry is replaced in place so moving instances, lights and selections survive arrival.
  const prototype = (name: string, width: number, height: number, depth: number, y: number, z: number, surface: StandardMaterial) => {
    const mesh = MeshBuilder.CreateBox(name, { width, height, depth }, scene);
    mesh.position.set(0, y, z);
    mesh.bakeCurrentTransformIntoVertices();
    mesh.material = surface;
    mesh.isVisible = false;
    mesh.isPickable = false;
    return mesh;
  };
  const carBodies = CAR_SHAPES.map((shape) => {
    const colors = THEME_COLORS[shape.theme as keyof typeof THEME_COLORS] ?? CAR_COLORS;
    return colors.map((color, i) => prototype(`car_body_${shape.name}_${i}`, shape.width * 0.9, shape.height * 0.65,
      shape.length, shape.height * 0.325 + 0.15, 0, material(`car_${shape.name}_${i}`, color)));
  });
  const trimMaterial = material("car_trim", Color3.White());
  const carParts = CAR_SHAPES.map((shape) => {
    const mesh = prototype(`car_parts_${shape.name}`, shape.width * 0.7, 0.2, shape.length * 0.7, 0.25, 0, trimMaterial);
    const data = VertexData.ExtractFromMesh(mesh);
    data.colors = Array.from({ length: mesh.getTotalVertices() }, () => [0.06, 0.07, 0.08, 1]).flat();
    data.applyToMesh(mesh);
    return mesh;
  });
  const lampMaterials = {
    head: material("car_head_lamps", Color3.White()),
    tail: material("car_tail_lamps", Color3.White()),
  };
  lampMaterials.head.disableLighting = true;
  lampMaterials.tail.disableLighting = true;
  const carLamps = CAR_SHAPES.map((shape) => ({
    head: prototype(`car_head_${shape.name}`, shape.width * 0.6, 0.16, 0.12, 0.6, shape.length/2, lampMaterials.head),
    tail: prototype(`car_tail_${shape.name}`, shape.width * 0.6, 0.16, 0.12, 0.6, -shape.length/2, lampMaterials.tail),
  }));

  async function loadShape(index: number): Promise<boolean> {
    const shape = CAR_SHAPES[index]!;
    try {
      const container = await SceneLoader.LoadAssetContainerAsync("/vehicles/", `${shape.file}?v=${ASSET_VERSION}`, scene);
      try {
        if (disposed || scene.isDisposed) return false;
        const targets = { body: carBodies[index]!, trim: [carParts[index]!], head: [carLamps[index]!.head], tail: [carLamps[index]!.tail] };
        // Validate and prepare every part before replacing any fallback geometry.
        const prepared = Object.entries(targets).map(([name, meshes]) => {
          const source = container.meshes.find((mesh) => mesh.name === name);
          if (!(source instanceof Mesh) || !source.getTotalVertices()) throw new Error(`missing ${name}`);
          source.bakeTransformIntoVertices(source.computeWorldMatrix(true));
          return { meshes, data: VertexData.ExtractFromMesh(source), sideOrientation: source.sideOrientation };
        });
        for (const { meshes, data, sideOrientation } of prepared) {
          data.applyToMesh(meshes[0]!);
          for (const mesh of meshes) {
            // Discard the fallback box draw range before sharing the larger geometry.
            if (mesh !== meshes[0]) mesh.releaseSubMeshes();
            meshes[0]!.geometry!.applyToMesh(mesh);
            mesh.sideOrientation = sideOrientation;
            mesh.hasVertexAlpha = false;
            mesh.refreshBoundingInfo();
            mesh.synchronizeInstances();
            for (const instance of mesh.instances) instance.refreshBoundingInfo();
            mesh.metadata = { vehicleAsset: shape.file };
          }
        }
        return true;
      } finally {
        container.dispose();
      }
    } catch (error) {
      if (!disposed && !scene.isDisposed) console.warn(`could not load vehicle "${shape.name}"; keeping fallback`, error);
      return false;
    }
  }

  const walkers = createPedestrianModels(scene);

  return {
    shapes: CAR_SHAPES, themedShapes: THEMED_SHAPES, plainShapes: PLAIN_SHAPES,
    carBodies, carLamps, carParts, walkers, lampMaterials,
    load(): Promise<boolean[]> {
      loading ??= disposed ? Promise.resolve([]) : Promise.all(CAR_SHAPES.map((_, index) => loadShape(index)));
      return loading;
    },
    dispose(): void {
      disposed = true;
      walkers.dispose();
      const meshes = [...carBodies.flat(), ...carParts, ...carLamps.flatMap((pair) => [pair.head, pair.tail])];
      const materials = new Set(meshes.map((mesh) => mesh.material));
      for (const mesh of meshes) mesh.dispose();
      for (const surface of materials) surface?.dispose();
    },
  };
}
