import { expect, it, vi } from "vitest";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Vector3 } from "@babylonjs/core/Maths/math";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { createKaijuRenderer } from "./kaiju";

it("follows body impact targets and switches between walking, idle and attack poses", async () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  const imported = new Mesh("imported", scene);
  const body = MeshBuilder.CreateSphere("kaiju_body", { diameter: 30 }, scene);
  const head = MeshBuilder.CreateSphere("head", { diameter: 10 }, scene);
  body.parent = head.parent = imported;
  body.position.y = 60;
  head.position.set(0, 90, 10);
  const limbs = ["left_leg", "right_leg", "left_arm", "right_arm", "tail", "jaw", "head"].map((name) => new TransformNode(`kaiju_${name}`, scene));
  for (const limb of limbs) limb.parent = imported;
  const load = vi.spyOn(SceneLoader, "ImportMeshAsync").mockResolvedValue({
    meshes: [imported, body, head], transformNodes: limbs, particleSystems: [], skeletons: [],
    animationGroups: [], geometries: [], lights: [], spriteManagers: [],
  });
  const shadows = new ShadowGenerator(64, new DirectionalLight("sun", Vector3.Down(), scene));
  const kaiju = createKaijuRenderer(scene, shadows);
  try {
    kaiju.show(new Vector3(100, 40, 200), 0, 0);
    expect(kaiju.impactPoint(0).y).toBe(95); // Loading fallback remains above the feet.
    await Promise.resolve();
    const points = [kaiju.impactPoint(0), kaiju.impactPoint(1)];
    expect(points[0]!.y).toBeGreaterThan(80);
    expect(points[1]!.y).toBeGreaterThan(points[0]!.y);
    expect(kaiju.impactPoint(1).asArray()).toEqual(points[1]!.asArray());
    kaiju.show(new Vector3(120, 60, 230), Math.PI, 1);
    const moved = kaiju.impactPoint(1);
    expect(moved.x).toBeCloseTo(120 - (points[1]!.x - 100));
    expect(moved.y).toBeCloseTo(points[1]!.y + 20);
    expect(moved.z).toBeCloseTo(230 - (points[1]!.z - 200));
    const pose = () => limbs.map((limb) => limb.rotationQuaternion!.asArray());
    const position = new Vector3(120, 60, 230);
    kaiju.show(position, Math.PI, 0.25, "walking");
    const walkStride = Math.abs(limbs[0]!.rotationQuaternion!.x);
    kaiju.show(position, Math.PI, 0.25, "running");
    expect(Math.abs(limbs[0]!.rotationQuaternion!.x)).toBeGreaterThan(walkStride * 2);
    const torso = scene.getTransformNodeByName("kaiju_torso")!;
    expect(torso.rotationQuaternion!.toEulerAngles().x).toBeGreaterThan(0.28);
    expect(body.parent).toBe(torso);
    expect(limbs[2]!.parent).toBe(torso);
    expect(limbs[0]!.parent).toBe(imported); // The lean must not tip the feet with the torso.
    expect(limbs[6]!.rotationQuaternion!.x).toBeLessThan(0); // Keep the gaze ahead.
    const runningPose = torso.rotationQuaternion!.asArray();
    kaiju.show(position, Math.PI, 0.25, "running");
    expect(torso.rotationQuaternion!.asArray()).toEqual(runningPose);
    kaiju.show(position, Math.PI, 1, "walking");
    expect(torso.rotationQuaternion!.x).toBe(0);
    expect(limbs[0]!.rotationQuaternion!.x).not.toBe(0);
    kaiju.show(position, 0, 1, "idle");
    const idle = pose();
    kaiju.show(position, 0, 2, "idle");
    expect(limbs[0]!.rotationQuaternion!.x).toBe(0);
    expect(limbs[1]!.rotationQuaternion!.x).toBeCloseTo(0);
    expect(pose()[4]).not.toEqual(idle[4]); // Tail moves gently without stepping.
    kaiju.show(position, 0, 2, "attacking", 0);
    const windup = pose();
    kaiju.show(position, 0, 2, "attacking", 2.5);
    expect(Math.abs(limbs[2]!.rotationQuaternion!.x)).toBeGreaterThan(0.5);
    expect(pose()[6]).not.toEqual(windup[6]); // The head follows the attack phase.
    expect(limbs[0]!.rotationQuaternion!.x).toBe(0);
    const attacking = pose();
    kaiju.show(position, 0, 2, "attacking", 2.5);
    expect(pose()).toEqual(attacking); // A paused simulation freezes the attack.
    expect(scene.getTransformNodeByName("kaiju")!.rotationQuaternion!.toEulerAngles().y).toBeCloseTo(Math.PI);
    expect(torso.rotationQuaternion!.toEulerAngles().x).toBeLessThan(-0.15); // Whole-body windup.
    kaiju.show(position, 0, 4.99, "attacking", 4.99);
    expect(torso.rotationQuaternion!.toEulerAngles().x).toBeGreaterThan(0.55);
    expect(Math.abs(limbs[2]!.rotationQuaternion!.x)).toBeLessThan(0.3); // Hands slam down.
    kaiju.show(position, 0, 5, "walking"); // The simulation destroys the building and changes mode here.
    expect(torso.rotationQuaternion!.toEulerAngles().x).toBeCloseTo(0.65);
    const impactPose = torso.rotationQuaternion!.asArray();
    kaiju.show(position, 0, 5, "walking");
    expect(torso.rotationQuaternion!.asArray()).toEqual(impactPose);
    kaiju.show(position, 0, 5.3, "walking");
    expect(torso.rotationQuaternion!.toEulerAngles().x).toBeGreaterThan(0);
    expect(torso.rotationQuaternion!.toEulerAngles().x).toBeLessThan(0.3);
    kaiju.show(position, 0, 6, "walking");
    expect(torso.rotationQuaternion!.x).toBe(0);
    expect(Math.abs(limbs[2]!.rotationQuaternion!.x)).toBeLessThan(0.1);
  } finally {
    kaiju.dispose();
    load.mockRestore();
    scene.dispose();
    engine.dispose();
  }
});
