import { ClusteredLightContainer } from "@babylonjs/core/Lights/Clustered/clusteredLightContainer";
import { SpotLight } from "@babylonjs/core/Lights/spotLight";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh";
import type { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3, Vector3 } from "@babylonjs/core/Maths/math";
import type { Scene } from "@babylonjs/core/scene";

type LampMaterials = {
  readonly head: StandardMaterial;
  readonly tail: StandardMaterial;
};

export function createVehicleHeadlights(scene: Scene, lampMaterials: LampMaterials) {
  const cluster = new ClusteredLightContainer("car_headlights", [], scene);
  cluster.maxRange = 42;
  const lights: SpotLight[] = [];

  function setLamps(on: boolean): void {
    lampMaterials.head.emissiveColor = on ? new Color3(1, 0.97, 0.86) : new Color3(0.5, 0.49, 0.44);
    lampMaterials.tail.emissiveColor = on ? new Color3(0.95, 0.13, 0.1) : new Color3(0.34, 0.07, 0.06);
    for (const light of lights) light.setEnabled(on);
    cluster.setEnabled(on);
  }

  function sync(count: number, on: boolean): void {
    while (lights.length > count) {
      const light = lights.pop()!;
      cluster.removeLight(light);
      light.dispose();
    }
    while (lights.length < count) {
      const beam = new SpotLight(`car_beam_${lights.length}`, Vector3.Zero(), Vector3.Down(), 1.15, 2.4, scene);
      beam.diffuse = new Color3(1, 0.96, 0.84);
      beam.specular = new Color3(0.3, 0.3, 0.28);
      beam.intensity = 9;
      beam.range = 38;
      cluster.addLight(beam);
      lights.push(beam);
    }
    setLamps(on);
  }

  function aim(beam: SpotLight | undefined, mover: { readonly mesh: Mesh | InstancedMesh; readonly heading: number }): void {
    if (!beam) return;
    const forward = { x: Math.sin(mover.heading), z: Math.cos(mover.heading) };
    beam.position.set(
      mover.mesh.position.x + forward.x * 2.6,
      mover.mesh.position.y + 1,
      mover.mesh.position.z + forward.z * 2.6,
    );
    beam.direction.set(forward.x, -0.42, forward.z);
  }

  return { lights, setLamps, sync, aim };
}
