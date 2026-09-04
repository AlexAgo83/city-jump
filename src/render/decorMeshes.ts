import type { Scene } from "@babylonjs/core/scene";
import type { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Color3 } from "@babylonjs/core/Maths/math";

export type PropKind = "ac" | "tank" | "antenna" | "chimney" | "hut" | "solar";
export type FootDecorKind =
  | "bench"
  | "bollard"
  | "planter"
  | "utility"
  | "trash"
  | "mail"
  | "sign"
  | "shrub"
  | "bikeRack"
  | "crate"
  | "barrier"
  | "wallLight"
  | "vending";

/** A box, positioned -- the one primitive every roof prop below is built out of. */
function box(scene: Scene, name: string, width: number, height: number, depth: number, x: number, y: number, z: number): Mesh {
  const mesh = MeshBuilder.CreateBox(name, { width, height, depth }, scene);
  mesh.position.set(x, y, z);
  return mesh;
}

/**
 * One prototype per prop kind, built from primitives the same way a car is -- and, like a car,
 * thin-instanced rather than loaded, since there is nothing here a box and a cylinder cannot
 * stand in for at the distance a roof is ever seen from.
 */
export function buildRoofProps(scene: Scene, shadows: ShadowGenerator): Record<PropKind, Mesh> {
  const material: Record<PropKind, StandardMaterial> = {
    ac: new StandardMaterial("roofprop_ac", scene),
    tank: new StandardMaterial("roofprop_tank", scene),
    antenna: new StandardMaterial("roofprop_antenna", scene),
    chimney: new StandardMaterial("roofprop_chimney", scene),
    hut: new StandardMaterial("roofprop_hut", scene),
    solar: new StandardMaterial("roofprop_solar", scene),
  };
  material.ac.diffuseColor = new Color3(0.55, 0.56, 0.58);
  material.tank.diffuseColor = new Color3(0.55, 0.36, 0.22);
  material.antenna.diffuseColor = material.ac.diffuseColor;
  material.chimney.diffuseColor = new Color3(0.42, 0.22, 0.16);
  material.hut.diffuseColor = new Color3(0.62, 0.58, 0.5);
  material.solar.diffuseColor = new Color3(0.08, 0.12, 0.22);
  material.solar.specularColor = new Color3(0.4, 0.42, 0.48);

  const finish = (mesh: Mesh, kind: PropKind): Mesh => {
    mesh.name = `roofprop_${kind}`;
    mesh.material = material[kind];
    mesh.isPickable = false;
    mesh.receiveShadows = true;
    mesh.alwaysSelectAsActiveMesh = true;
    mesh.bakeCurrentTransformIntoVertices();
    mesh.refreshBoundingInfo();
    mesh.position.y = -mesh.getBoundingInfo().boundingBox.minimum.y;
    mesh.bakeCurrentTransformIntoVertices();
    mesh.setEnabled(false);
    shadows.addShadowCaster(mesh);
    return mesh;
  };

  const ac = Mesh.MergeMeshes(
    [box(scene, "roofprop_ac_body", 1.1, 0.55, 0.9, 0, 0.275, 0), box(scene, "roofprop_ac_duct", 0.3, 0.4, 0.3, 0.75, 0.2, 0)],
    true,
    true,
    undefined,
    false,
    false,
  )!;

  const tankLegs = [-1, 1].flatMap((sx) =>
    [-1, 1].map((sz) => {
      const leg = MeshBuilder.CreateCylinder(`roofprop_tank_leg_${sx}_${sz}`, { diameter: 0.12, height: 0.7, tessellation: 6 }, scene);
      leg.position.set(sx * 0.55, 0.35, sz * 0.55);
      return leg;
    }),
  );
  const tankBody = MeshBuilder.CreateCylinder("roofprop_tank_body", { diameter: 1.6, height: 1.8, tessellation: 12 }, scene);
  tankBody.position.y = 1.6;
  const tank = Mesh.MergeMeshes([tankBody, ...tankLegs], true, true, undefined, false, false)!;

  const pole = MeshBuilder.CreateCylinder("roofprop_antenna_pole", { diameter: 0.06, height: 2.2, tessellation: 6 }, scene);
  pole.position.y = 1.1;
  const dish = MeshBuilder.CreateCylinder("roofprop_antenna_dish", { diameter: 0.5, height: 0.05, tessellation: 12 }, scene);
  dish.position.set(0, 1.9, 0.15);
  dish.rotation.x = Math.PI / 3;
  const antenna = Mesh.MergeMeshes([pole, dish], true, true, undefined, false, false)!;

  const chimney = Mesh.MergeMeshes(
    [
      box(scene, "roofprop_chimney_stack", 0.55, 1.2, 0.55, 0, 0.6, 0),
      box(scene, "roofprop_chimney_cap", 0.75, 0.16, 0.75, 0, 1.28, 0),
    ],
    true,
    true,
    undefined,
    false,
    false,
  )!;

  const hut = Mesh.MergeMeshes(
    [box(scene, "roofprop_hut_body", 1.8, 1.6, 1.6, 0, 0.8, 0), box(scene, "roofprop_hut_lid", 1.9, 0.12, 1.7, 0, 1.66, 0)],
    true,
    true,
    undefined,
    false,
    false,
  )!;

  const solar = box(scene, "roofprop_solar", 1, 0.05, 1.6, 0, 0.35, 0);
  solar.rotation.x = Math.PI / 9;

  return {
    ac: finish(ac, "ac"),
    tank: finish(tank, "tank"),
    antenna: finish(antenna, "antenna"),
    chimney: finish(chimney, "chimney"),
    hut: finish(hut, "hut"),
    solar: finish(solar, "solar"),
  };
}

export function buildFootDecor(scene: Scene): Record<FootDecorKind, Mesh> {
  const material: Record<FootDecorKind, StandardMaterial> = {
    bench: new StandardMaterial("footdecor_bench", scene),
    bollard: new StandardMaterial("footdecor_bollard", scene),
    planter: new StandardMaterial("footdecor_planter", scene),
    utility: new StandardMaterial("footdecor_utility", scene),
    trash: new StandardMaterial("footdecor_trash", scene),
    mail: new StandardMaterial("footdecor_mail", scene),
    sign: new StandardMaterial("footdecor_sign", scene),
    shrub: new StandardMaterial("footdecor_shrub", scene),
    bikeRack: new StandardMaterial("footdecor_bikeRack", scene),
    crate: new StandardMaterial("footdecor_crate", scene),
    barrier: new StandardMaterial("footdecor_barrier", scene),
    wallLight: new StandardMaterial("footdecor_wallLight", scene),
    vending: new StandardMaterial("footdecor_vending", scene),
  };
  material.bench.diffuseColor = new Color3(0.34, 0.2, 0.12);
  material.bollard.diffuseColor = new Color3(0.82, 0.72, 0.42);
  material.planter.diffuseColor = new Color3(0.18, 0.38, 0.2);
  material.utility.diffuseColor = new Color3(0.32, 0.34, 0.34);
  material.trash.diffuseColor = new Color3(0.12, 0.26, 0.24);
  material.mail.diffuseColor = new Color3(0.14, 0.28, 0.68);
  material.sign.diffuseColor = new Color3(0.78, 0.72, 0.52);
  material.shrub.diffuseColor = new Color3(0.12, 0.36, 0.16);
  material.bikeRack.diffuseColor = new Color3(0.58, 0.6, 0.62);
  material.crate.diffuseColor = new Color3(0.5, 0.3, 0.16);
  material.barrier.diffuseColor = new Color3(0.86, 0.28, 0.12);
  material.wallLight.diffuseColor = new Color3(0.92, 0.78, 0.42);
  material.wallLight.emissiveColor = new Color3(0.25, 0.18, 0.06);
  material.vending.diffuseColor = new Color3(0.7, 0.12, 0.16);
  for (const mat of Object.values(material)) mat.specularColor = Color3.Black();

  const finish = (mesh: Mesh, kind: FootDecorKind): Mesh => {
    mesh.name = `footdecor_${kind}`;
    mesh.material = material[kind];
    mesh.isPickable = false;
    mesh.receiveShadows = true;
    mesh.alwaysSelectAsActiveMesh = true;
    mesh.setEnabled(false);
    return mesh;
  };

  const bench = Mesh.MergeMeshes(
    [
      box(scene, "footdecor_bench_seat", 2.6, 0.22, 0.7, 0, 0.48, 0),
      box(scene, "footdecor_bench_back", 2.6, 0.68, 0.18, 0, 0.82, -0.36),
      box(scene, "footdecor_bench_leg_l", 0.16, 0.48, 0.16, -0.9, 0.24, 0.2),
      box(scene, "footdecor_bench_leg_r", 0.16, 0.48, 0.16, 0.9, 0.24, 0.2),
      box(scene, "footdecor_bench_arm_l", 0.12, 0.5, 0.8, -1.36, 0.62, 0),
      box(scene, "footdecor_bench_arm_r", 0.12, 0.5, 0.8, 1.36, 0.62, 0),
    ],
    true,
    true,
    undefined,
    false,
    false,
  )!;
  const bollardPost = MeshBuilder.CreateCylinder("footdecor_bollard_post", { diameter: 0.42, height: 0.9, tessellation: 8 }, scene);
  bollardPost.position.y = 0.55;
  const bollardCap = MeshBuilder.CreateCylinder("footdecor_bollard_cap", { diameter: 0.5, height: 0.12, tessellation: 8 }, scene);
  bollardCap.position.y = 1.06;
  const bollard = Mesh.MergeMeshes([bollardPost, bollardCap, box(scene, "footdecor_bollard_base", 0.68, 0.12, 0.68, 0, 0.06, 0)], true, true, undefined, false, false)!;
  const planter = Mesh.MergeMeshes(
    [
      box(scene, "footdecor_planter_box", 2.2, 0.55, 0.75, 0, 0.275, 0),
      box(scene, "footdecor_planter_lip", 2.35, 0.12, 0.9, 0, 0.61, 0),
      box(scene, "footdecor_planter_soil", 1.85, 0.08, 0.5, 0, 0.71, 0),
    ],
    true,
    true,
    undefined,
    false,
    false,
  )!;
  const utility = Mesh.MergeMeshes(
    [
      box(scene, "footdecor_utility_body", 1.15, 1.05, 0.7, 0, 0.525, 0),
      box(scene, "footdecor_utility_door", 0.78, 0.72, 0.05, 0, 0.56, -0.38),
      box(scene, "footdecor_utility_vent", 0.7, 0.08, 0.06, 0, 0.9, -0.4),
      box(scene, "footdecor_utility_handle", 0.08, 0.18, 0.08, 0.36, 0.55, -0.43),
    ],
    true,
    true,
    undefined,
    false,
    false,
  )!;
  const trashBody = MeshBuilder.CreateCylinder("footdecor_trash_body", { diameterTop: 0.68, diameterBottom: 0.78, height: 1, tessellation: 10 }, scene);
  trashBody.position.y = 0.5;
  const trashLid = MeshBuilder.CreateCylinder("footdecor_trash_lid", { diameter: 0.82, height: 0.12, tessellation: 10 }, scene);
  trashLid.position.y = 1.06;
  const trash = Mesh.MergeMeshes([trashBody, trashLid, box(scene, "footdecor_trash_handle", 0.42, 0.08, 0.12, 0, 1.18, 0)], true, true, undefined, false, false)!;
  const mail = Mesh.MergeMeshes(
    [
      box(scene, "footdecor_mail_post", 0.16, 0.8, 0.16, 0, 0.4, 0),
      box(scene, "footdecor_mail_box", 0.9, 0.42, 0.55, 0, 0.95, 0),
      box(scene, "footdecor_mail_door", 0.08, 0.35, 0.45, 0.5, 0.95, 0),
      box(scene, "footdecor_mail_flag", 0.08, 0.42, 0.3, -0.5, 1.08, 0),
    ],
    true,
    true,
    undefined,
    false,
    false,
  )!;
  const sign = Mesh.MergeMeshes(
    [
      box(scene, "footdecor_sign_board", 1, 0.72, 0.08, 0, 0.78, 0),
      box(scene, "footdecor_sign_trim", 1.12, 0.08, 0.1, 0, 1.18, 0),
      box(scene, "footdecor_sign_leg_l", 0.1, 0.58, 0.08, -0.32, 0.35, 0),
      box(scene, "footdecor_sign_leg_r", 0.1, 0.58, 0.08, 0.32, 0.35, 0),
      box(scene, "footdecor_sign_feet", 1.1, 0.12, 0.5, 0, 0.06, 0),
    ],
    true,
    true,
    undefined,
    false,
    false,
  )!;
  const shrubTop = MeshBuilder.CreateSphere("footdecor_shrub_top", { diameter: 1.15, segments: 8 }, scene);
  shrubTop.position.y = 0.95;
  const shrubSide = MeshBuilder.CreateSphere("footdecor_shrub_side", { diameter: 0.75, segments: 8 }, scene);
  shrubSide.position.set(0.35, 0.78, 0.08);
  const shrub = Mesh.MergeMeshes([box(scene, "footdecor_shrub_pot", 0.8, 0.45, 0.8, 0, 0.225, 0), box(scene, "footdecor_shrub_lip", 0.95, 0.12, 0.95, 0, 0.5, 0), shrubTop, shrubSide], true, true, undefined, false, false)!;
  const bikeRack = Mesh.MergeMeshes(
    [
      ...[-0.45, 0, 0.45].map((x) => box(scene, `footdecor_bikeRack_${x}`, 0.08, 0.75, 0.55, x, 0.375, 0)),
      box(scene, "footdecor_bikeRack_bar_f", 1.05, 0.08, 0.08, 0, 0.75, -0.25),
      box(scene, "footdecor_bikeRack_bar_b", 1.05, 0.08, 0.08, 0, 0.75, 0.25),
      box(scene, "footdecor_bikeRack_rail", 1.3, 0.08, 0.08, 0, 0.08, 0),
    ],
    true,
    true,
    undefined,
    false,
    false,
  )!;
  const crate = Mesh.MergeMeshes(
    [
      box(scene, "footdecor_crate_a", 0.85, 0.55, 0.75, -0.25, 0.275, 0),
      box(scene, "footdecor_crate_b", 0.7, 0.45, 0.65, 0.45, 0.225, 0.05),
      box(scene, "footdecor_crate_slat_a", 1.75, 0.08, 0.08, 0.1, 0.58, -0.36),
      box(scene, "footdecor_crate_slat_b", 1.55, 0.08, 0.08, 0.05, 0.3, -0.38),
      box(scene, "footdecor_crate_top", 0.72, 0.08, 0.62, 0.45, 0.49, 0.05),
    ],
    true,
    true,
    undefined,
    false,
    false,
  )!;
  const barrier = Mesh.MergeMeshes(
    [
      box(scene, "footdecor_barrier_bar", 1.6, 0.18, 0.12, 0, 0.7, 0),
      box(scene, "footdecor_barrier_lower", 1.35, 0.14, 0.1, 0, 0.38, 0),
      box(scene, "footdecor_barrier_l", 0.14, 0.9, 0.14, -0.65, 0.45, 0),
      box(scene, "footdecor_barrier_r", 0.14, 0.9, 0.14, 0.65, 0.45, 0),
      box(scene, "footdecor_barrier_foot_l", 0.55, 0.1, 0.28, -0.65, 0.05, 0),
      box(scene, "footdecor_barrier_foot_r", 0.55, 0.1, 0.28, 0.65, 0.05, 0),
    ],
    true,
    true,
    undefined,
    false,
    false,
  )!;
  const wallLightGlobe = MeshBuilder.CreateSphere("footdecor_wallLight_globe", { diameter: 0.45, segments: 8 }, scene);
  wallLightGlobe.position.y = 1;
  const wallLight = Mesh.MergeMeshes(
    [box(scene, "footdecor_wallLight_stem", 0.14, 0.8, 0.14, 0, 0.4, 0), box(scene, "footdecor_wallLight_plate", 0.55, 0.85, 0.08, 0, 0.58, 0.12), wallLightGlobe],
    true,
    true,
    undefined,
    false,
    false,
  )!;
  const vending = Mesh.MergeMeshes(
    [
      box(scene, "footdecor_vending_body", 0.95, 1.8, 0.65, 0, 0.9, 0),
      box(scene, "footdecor_vending_screen", 0.32, 0.34, 0.05, 0.2, 1.15, -0.36),
      box(scene, "footdecor_vending_slot", 0.55, 0.16, 0.05, -0.08, 0.52, -0.36),
      box(scene, "footdecor_vending_top", 1.05, 0.12, 0.72, 0, 1.86, 0),
    ],
    true,
    true,
    undefined,
    false,
    false,
  )!;

  return {
    bench: finish(bench, "bench"),
    bollard: finish(bollard, "bollard"),
    planter: finish(planter, "planter"),
    utility: finish(utility, "utility"),
    trash: finish(trash, "trash"),
    mail: finish(mail, "mail"),
    sign: finish(sign, "sign"),
    shrub: finish(shrub, "shrub"),
    bikeRack: finish(bikeRack, "bikeRack"),
    crate: finish(crate, "crate"),
    barrier: finish(barrier, "barrier"),
    wallLight: finish(wallLight, "wallLight"),
    vending: finish(vending, "vending"),
  };
}
