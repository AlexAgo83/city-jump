import type { Scene } from "@babylonjs/core/scene";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math";

import type { BuildingKind } from "../sim/buildingKinds";

/** The width a car is built to, which is what the lane spacing is measured against. */
const CAR_WIDTH = 3;
/** A motorcycle's own, much narrower, width -- it still rides the lane a car would. */
const MOTORCYCLE_WIDTH = 0.7;
const CAR_VISUAL_SCALE = 0.81;

const CAR_COLORS = [
  new Color3(0.86, 0.18, 0.14),
  new Color3(0.12, 0.38, 0.82),
  new Color3(0.93, 0.82, 0.18),
  new Color3(0.9, 0.92, 0.88),
];

const WALKER_COLORS = [
  new Color3(0.85, 0.4, 0.3),
  new Color3(0.3, 0.45, 0.7),
  new Color3(0.35, 0.6, 0.4),
  new Color3(0.75, 0.7, 0.5),
];

/**
 * A body shape, in metres. Everything a car is made of comes off these numbers, so a new kind of
 * vehicle is a row in the table below rather than another lump of mesh-building code.
 */
interface CarShape {
  readonly name: string;
  readonly length: number;
  readonly width: number;
  /** Height of the main body, whose underside sits clear of the road on the wheels. */
  readonly hull: number;
  /** Where the cabin sits along the car, and how long and tall it is; none for a motorcycle. */
  readonly cabin: { at: number; length: number; height: number } | null;
  /** Bonnet and boot ledges, each as a length; zero for a shape that has none. */
  readonly bonnet: number;
  readonly boot: number;
  readonly wheelBase: number;
  readonly wheel: number;
  /** One wheel per end, on the centreline, rather than a pair either side of it. */
  readonly singleTrack?: boolean;
  /** The frontage this vehicle belongs to, so a dirt road carries tractors and not saloons. */
  readonly theme?: BuildingKind;
  /** Its own paint, when the ordinary car colours would be wrong (a pink tractor, say). */
  readonly colors?: Color3[];
  /** What makes it that vehicle rather than a box: a stack, a drum, side boards, a turret. */
  readonly details?: CarDetail[];
}

/**
 * One extra piece bolted onto a shape. `y` is measured up from the road, `z` along the vehicle
 * (+ towards the front), `x` across it -- `mirrored` builds the same piece on the other side.
 * `round` makes it a cylinder along its own longest axis instead of a box, which is what tells a
 * tanker's drum and a tractor's exhaust from yet another slab.
 */
interface CarDetail {
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly depth: number;
  readonly x: number;
  readonly y: number;
  readonly z: number;
  /** Dark trim (stacks, tyres, stowage) rather than the vehicle's own paint. */
  readonly dark?: boolean;
  readonly mirrored?: boolean;
  readonly round?: boolean;
}

const CAR_SHAPES: CarShape[] = [
  {
    name: "saloon",
    length: 5.8 * CAR_VISUAL_SCALE,
    width: CAR_WIDTH * CAR_VISUAL_SCALE,
    hull: 0.8 * CAR_VISUAL_SCALE,
    cabin: { at: -0.3 * CAR_VISUAL_SCALE, length: 2.8 * CAR_VISUAL_SCALE, height: 0.52 * CAR_VISUAL_SCALE },
    bonnet: 1.6 * CAR_VISUAL_SCALE,
    boot: 1.1 * CAR_VISUAL_SCALE,
    wheelBase: 1.85 * CAR_VISUAL_SCALE,
    wheel: 0.92 * CAR_VISUAL_SCALE,
  },
  {
    // Shorter, taller, all cabin and no boot: the small car that fills a city.
    name: "hatchback",
    length: 4.6 * CAR_VISUAL_SCALE,
    width: CAR_WIDTH * CAR_VISUAL_SCALE,
    hull: 0.86 * CAR_VISUAL_SCALE,
    cabin: { at: -0.5 * CAR_VISUAL_SCALE, length: 2.4 * CAR_VISUAL_SCALE, height: 0.6 * CAR_VISUAL_SCALE },
    bonnet: 1.2 * CAR_VISUAL_SCALE,
    boot: 0,
    wheelBase: 1.5 * CAR_VISUAL_SCALE,
    wheel: 0.86 * CAR_VISUAL_SCALE,
  },
  {
    // A cab at the front and a box behind it: a van, and the tallest thing on the road.
    name: "van",
    length: 6.6 * CAR_VISUAL_SCALE,
    width: CAR_WIDTH * CAR_VISUAL_SCALE,
    hull: 1.35 * CAR_VISUAL_SCALE,
    cabin: { at: 1.5 * CAR_VISUAL_SCALE, length: 2.4 * CAR_VISUAL_SCALE, height: 0.66 * CAR_VISUAL_SCALE },
    bonnet: 1.3 * CAR_VISUAL_SCALE,
    boot: 0,
    wheelBase: 2.2 * CAR_VISUAL_SCALE,
    wheel: 1 * CAR_VISUAL_SCALE,
  },
  {
    // No ledges, one wheel per end, and a tank-and-seat hump standing in for a cabin: everything
    // a car has, with most of it left out.
    name: "motorcycle",
    length: 2,
    width: MOTORCYCLE_WIDTH,
    hull: 0.5,
    cabin: { at: 0.15, length: 0.8, height: 0.2 },
    bonnet: 0,
    boot: 0,
    wheelBase: 0.75,
    wheel: 0.62,
    singleTrack: true,
  },
  {
    // Short, tall and narrow, sitting high on big wheels: a tractor, with the cab over the axle.
    name: "tractor",
    length: 4.4 * CAR_VISUAL_SCALE,
    width: CAR_WIDTH * 0.85 * CAR_VISUAL_SCALE,
    hull: 1.1 * CAR_VISUAL_SCALE,
    cabin: { at: -0.7 * CAR_VISUAL_SCALE, length: 1.6 * CAR_VISUAL_SCALE, height: 0.85 * CAR_VISUAL_SCALE },
    bonnet: 1.8 * CAR_VISUAL_SCALE,
    boot: 0,
    wheelBase: 1.5 * CAR_VISUAL_SCALE,
    wheel: 1.25 * CAR_VISUAL_SCALE,
    theme: "agricultural",
    colors: [new Color3(0.16, 0.42, 0.2), new Color3(0.85, 0.5, 0.12)],
    details: [
      // The exhaust standing up beside the bonnet, and the mudguards over the back wheels.
      { name: "stack", width: 0.22, height: 2.1, depth: 0.22, x: 0.9, y: 1.5, z: 1.1, dark: true, round: true },
      { name: "guard", width: 0.2, height: 0.24, depth: 2.1, x: 1.25, y: 1.75, z: -1.5, mirrored: true },
      { name: "weight", width: 1.5, height: 0.4, depth: 0.4, x: 0, y: 0.85, z: 2.2, dark: true },
      { name: "hitch", width: 0.4, height: 0.24, depth: 0.7, x: 0, y: 0.7, z: -2.3, dark: true },
    ],
  },
  {
    // Long, low and open: the trailer a tractor tows, hauling the harvest.
    name: "farm trailer",
    length: 7.4 * CAR_VISUAL_SCALE,
    width: CAR_WIDTH * CAR_VISUAL_SCALE,
    hull: 1 * CAR_VISUAL_SCALE,
    cabin: { at: 2.2 * CAR_VISUAL_SCALE, length: 1.5 * CAR_VISUAL_SCALE, height: 0.6 * CAR_VISUAL_SCALE },
    bonnet: 1 * CAR_VISUAL_SCALE,
    boot: 3.4 * CAR_VISUAL_SCALE,
    wheelBase: 2.4 * CAR_VISUAL_SCALE,
    wheel: 1 * CAR_VISUAL_SCALE,
    theme: "agricultural",
    colors: [new Color3(0.62, 0.55, 0.35), new Color3(0.5, 0.42, 0.28)],
    details: [
      // Side boards and a tailgate around the load bed, and the drawbar reaching forward.
      { name: "board", width: 0.18, height: 0.85, depth: 4.4, x: 1.4, y: 1.9, z: -1.4, mirrored: true },
      { name: "tailgate", width: 2.9, height: 0.85, depth: 0.18, x: 0, y: 1.9, z: -3.6 },
      { name: "load", width: 2.6, height: 0.5, depth: 4.0, x: 0, y: 2.1, z: -1.4, dark: true },
      { name: "drawbar", width: 0.3, height: 0.24, depth: 1.4, x: 0, y: 0.75, z: 3.6, dark: true },
    ],
  },
  {
    // A cab and a long drum behind it: the tanker that feeds a works.
    name: "tanker",
    length: 9 * CAR_VISUAL_SCALE,
    width: CAR_WIDTH * CAR_VISUAL_SCALE,
    hull: 1.6 * CAR_VISUAL_SCALE,
    cabin: { at: 3 * CAR_VISUAL_SCALE, length: 2 * CAR_VISUAL_SCALE, height: 0.7 * CAR_VISUAL_SCALE },
    bonnet: 0.9 * CAR_VISUAL_SCALE,
    boot: 0,
    wheelBase: 3 * CAR_VISUAL_SCALE,
    wheel: 1.05 * CAR_VISUAL_SCALE,
    theme: "industrial",
    colors: [new Color3(0.82, 0.83, 0.8), new Color3(0.75, 0.55, 0.2)],
    details: [
      // The drum itself, its end cap, the catwalk along the top and the hose locker under it.
      { name: "drum", width: 2.7, height: 2.7, depth: 5.4, x: 0, y: 2.3, z: -1.6, round: true },
      { name: "cap", width: 2.5, height: 2.5, depth: 0.3, x: 0, y: 2.3, z: -4.4, round: true, dark: true },
      { name: "walk", width: 0.9, height: 0.12, depth: 5.0, x: 0, y: 3.7, z: -1.6, dark: true },
      { name: "rail", width: 0.1, height: 0.4, depth: 5.0, x: 0.5, y: 3.95, z: -1.6, dark: true, mirrored: true },
      { name: "locker", width: 0.5, height: 0.7, depth: 1.6, x: 1.4, y: 1.2, z: -2.4, dark: true, mirrored: true },
    ],
  },
  {
    // Cab forward, flat deck behind: the truck that carries everything else.
    name: "flatbed",
    length: 8 * CAR_VISUAL_SCALE,
    width: CAR_WIDTH * CAR_VISUAL_SCALE,
    hull: 1.15 * CAR_VISUAL_SCALE,
    cabin: { at: 2.6 * CAR_VISUAL_SCALE, length: 2.2 * CAR_VISUAL_SCALE, height: 0.75 * CAR_VISUAL_SCALE },
    bonnet: 1 * CAR_VISUAL_SCALE,
    boot: 0,
    wheelBase: 2.8 * CAR_VISUAL_SCALE,
    wheel: 1 * CAR_VISUAL_SCALE,
    theme: "industrial",
    colors: [new Color3(0.3, 0.42, 0.55), new Color3(0.55, 0.28, 0.16)],
    details: [
      // Headboard behind the cab, low rails down the deck, and the load strapped to it.
      { name: "headboard", width: 2.9, height: 1.2, depth: 0.2, x: 0, y: 2.3, z: 0.9 },
      { name: "rail", width: 0.16, height: 0.4, depth: 4.4, x: 1.4, y: 1.9, z: -1.6, mirrored: true },
      { name: "crate", width: 2.2, height: 1.1, depth: 1.8, x: 0, y: 2.25, z: -0.6, dark: true },
      { name: "pipe", width: 0.6, height: 0.6, depth: 3.6, x: 0.6, y: 2.0, z: -2.8, dark: true, round: true },
    ],
  },
  {
    // Low, wide and blunt, with a squat turret-sized cabin: the armour.
    name: "apc",
    length: 7 * CAR_VISUAL_SCALE,
    width: CAR_WIDTH * 1.1 * CAR_VISUAL_SCALE,
    hull: 1.2 * CAR_VISUAL_SCALE,
    cabin: { at: -0.4 * CAR_VISUAL_SCALE, length: 1.8 * CAR_VISUAL_SCALE, height: 0.45 * CAR_VISUAL_SCALE },
    bonnet: 2.2 * CAR_VISUAL_SCALE,
    boot: 1.4 * CAR_VISUAL_SCALE,
    wheelBase: 2.4 * CAR_VISUAL_SCALE,
    wheel: 1 * CAR_VISUAL_SCALE,
    theme: "military",
    colors: [new Color3(0.3, 0.34, 0.24), new Color3(0.36, 0.36, 0.3)],
    details: [
      // A turret with a barrel out of it, skirts over the wheels, stowage on the back deck.
      { name: "turret", width: 1.8, height: 0.55, depth: 2.0, x: 0, y: 2.3, z: -0.4 },
      { name: "barrel", width: 0.22, height: 0.22, depth: 2.6, x: 0, y: 2.45, z: 1.4, dark: true, round: true },
      { name: "skirt", width: 0.16, height: 0.55, depth: 5.2, x: 1.6, y: 1.0, z: 0, dark: true, mirrored: true },
      { name: "stowage", width: 2.2, height: 0.45, depth: 1.0, x: 0, y: 2.1, z: -2.5, dark: true },
    ],
  },
  {
    // Canvas-backed troop truck: tall box behind a short cab.
    name: "troop truck",
    length: 7.6 * CAR_VISUAL_SCALE,
    width: CAR_WIDTH * CAR_VISUAL_SCALE,
    hull: 1.7 * CAR_VISUAL_SCALE,
    cabin: { at: 2.4 * CAR_VISUAL_SCALE, length: 1.8 * CAR_VISUAL_SCALE, height: 0.6 * CAR_VISUAL_SCALE },
    bonnet: 1.1 * CAR_VISUAL_SCALE,
    boot: 0,
    wheelBase: 2.7 * CAR_VISUAL_SCALE,
    wheel: 1.05 * CAR_VISUAL_SCALE,
    theme: "military",
    colors: [new Color3(0.26, 0.3, 0.2), new Color3(0.4, 0.42, 0.3)],
    details: [
      // Canvas back on its hoops, a tailgate, and the spare wheel behind the cab.
      { name: "canvas", width: 2.8, height: 1.5, depth: 4.2, x: 0, y: 2.6, z: -1.6 },
      { name: "hoop", width: 3.0, height: 0.14, depth: 0.14, x: 0, y: 3.35, z: -0.4, dark: true },
      { name: "hoop_mid", width: 3.0, height: 0.14, depth: 0.14, x: 0, y: 3.35, z: -1.8, dark: true },
      { name: "hoop_back", width: 3.0, height: 0.14, depth: 0.14, x: 0, y: 3.35, z: -3.2, dark: true },
      { name: "tailgate", width: 2.7, height: 0.9, depth: 0.16, x: 0, y: 1.9, z: -3.7, dark: true },
      { name: "spare", width: 0.34, height: 1.0, depth: 1.0, x: 1.5, y: 1.3, z: 1.0, dark: true, round: true },
    ],
  },
];

/** The shapes a road's own frontage puts on it, by kind; anything else draws from all of them. */
const THEMED_SHAPES = new Map<BuildingKind, number[]>();
CAR_SHAPES.forEach((shape, index) => {
  if (!shape.theme) return;
  THEMED_SHAPES.set(shape.theme, [...(THEMED_SHAPES.get(shape.theme) ?? []), index]);
});
/** Ordinary traffic never gets handed a tanker or an APC. */
const PLAIN_SHAPES = CAR_SHAPES.map((_, index) => index).filter((index) => !CAR_SHAPES[index]!.theme);

export function createVehicleModels(scene: Scene) {
  /**
   * Every shape in every colour, each built out of boxes and four wheels and merged into a
   * single mesh, so a car on the map is one instance of one of them. Glass and wheels are a
   * second prototype per shape in their own dark material -- a merged mesh carries one material,
   * and two instances per car is cheaper than a multi-material one.
   * ponytail: primitives, not a loaded model. It reads as a car at the distance a city is looked
   * at from; swap in a glTF if the camera ever gets down to street level.
   */
  const carBodies = CAR_SHAPES.map((shape) =>
    (shape.colors ?? CAR_COLORS).map((color, i) => {
      const material = new StandardMaterial(`car_${shape.name}_${i}`, scene);
      material.diffuseColor = color;
      material.specularColor = new Color3(0.25, 0.25, 0.25);

      const floor = shape.wheel / 2;
      const parts = shape.singleTrack
        ? [
            slab(`bike_tank_${shape.name}_${i}`, shape.width * 0.92, shape.hull * 0.42, shape.length * 0.34, 0, floor + shape.hull * 0.78, 0.18, 0.16),
            slab(`bike_tail_${shape.name}_${i}`, shape.width * 0.7, shape.hull * 0.22, shape.length * 0.28, 0, floor + shape.hull * 0.62, -0.45, 0.1),
            slab(`bike_front_fender_${shape.name}_${i}`, shape.width * 0.6, shape.hull * 0.16, shape.length * 0.2, 0, floor + shape.hull * 0.34, shape.wheelBase, 0.08),
            slab(`bike_rear_fender_${shape.name}_${i}`, shape.width * 0.68, shape.hull * 0.16, shape.length * 0.24, 0, floor + shape.hull * 0.34, -shape.wheelBase, 0.08),
          ]
        : [slab(`car_hull_${shape.name}_${i}`, shape.width - 0.1, shape.hull, shape.length, 0, floor + shape.hull / 2, 0)];
      // Wider than the glass under it, so the roof caps the cabin instead of sitting inside it.
      // A motorcycle has no cabin to roof over -- its hull is the whole body.
      if (shape.cabin && !shape.singleTrack) {
        parts.push(
          slab(
            `car_roof_${shape.name}_${i}`,
            shape.width - 0.48,
            0.16,
            shape.cabin.length + 0.1,
            0,
            floor + shape.hull + shape.cabin.height + 0.08,
            shape.cabin.at,
          ),
        );
      }
      // The ledges fore and aft, which is what tells the front of a car from its back from above.
      const ledge = (name: string, depth: number, at: number) =>
        slab(name, shape.width - 0.22, 0.16, depth, 0, floor + shape.hull + 0.08, at);
      if (shape.bonnet > 0) parts.push(ledge(`car_bonnet_${shape.name}_${i}`, shape.bonnet, (shape.length - shape.bonnet) / 2));
      if (shape.boot > 0) parts.push(ledge(`car_boot_${shape.name}_${i}`, shape.boot, -(shape.length - shape.boot) / 2));
      parts.push(...detailParts(shape, false, `_${i}`));

      const car = Mesh.MergeMeshes(parts, true, true, undefined, false, false);
      if (!car) throw new Error("car failed to merge");
      car.name = `car_body_${shape.name}_${i}`;
      car.material = material;
      car.isPickable = false;
      car.isVisible = false;
      return car;
    }),
  );

  /**
   * The lamps, one prototype per shape and per end. They light themselves rather than being lit,
   * so they read as lamps at any hour, and the shared material is dimmed by day and turned up at
   * night with everything else.
   */
  const lampMaterials = {
    head: new StandardMaterial("car_head_lamps", scene),
    tail: new StandardMaterial("car_tail_lamps", scene),
  };
  lampMaterials.head.disableLighting = true;
  lampMaterials.tail.disableLighting = true;

  const carLamps = CAR_SHAPES.map((shape) => {
    const floor = shape.wheel / 2;
    const lens = (end: "head" | "tail") => {
      const at = end === "head" ? shape.length / 2 - 0.12 : -(shape.length / 2 - 0.12);
      // One lamp on the centreline for a motorcycle, a pair either side for anything with a
      // second wheel track to put them over.
      const sides = shape.singleTrack ? [0] : [-1, 1];
      const lamps = sides.map((side) =>
        slab(
          `car_${end}_${shape.name}_${side}`,
          shape.singleTrack ? 0.3 : 0.62,
          0.3,
          0.3,
          side * (shape.width / 2 - 0.55),
          floor + shape.hull * 0.72,
          at,
          0.1,
        ),
      );
      const merged = Mesh.MergeMeshes(lamps, true, true, undefined, false, false);
      if (!merged) throw new Error("car lamps failed to merge");
      merged.name = `car_${end}_${shape.name}`;
      merged.material = lampMaterials[end];
      merged.isPickable = false;
      merged.isVisible = false;
      return merged;
    };
    return { head: lens("head"), tail: lens("tail") };
  });

  /** Wheels and glass for each shape: one prototype whatever colour the body it rides on is. */
  const carParts = CAR_SHAPES.map((shape) => {
    const dark = new StandardMaterial(`car_parts_${shape.name}`, scene);
    dark.diffuseColor = new Color3(0.09, 0.1, 0.12);
    dark.specularColor = new Color3(0.35, 0.35, 0.4);

    const floor = shape.wheel / 2;
    // Its hump is a tank and seat rather than a cabin, so there's nothing to glaze -- a
    // motorcycle rider sits in the open.
    const glass =
      shape.cabin && !shape.singleTrack
        ? [
            slab(
              `car_glass_${shape.name}_side`,
              shape.width - 0.62,
              shape.cabin.height * 0.74,
              shape.cabin.length * 0.72,
              0,
              floor + shape.hull + shape.cabin.height * 0.37,
              shape.cabin.at,
              0.08,
            ),
            slab(
              `car_glass_${shape.name}_front`,
              shape.width - 0.78,
              shape.cabin.height * 0.55,
              0.18,
              0,
              floor + shape.hull + shape.cabin.height * 0.36,
              shape.cabin.at + shape.cabin.length * 0.43,
              0.05,
            ),
            slab(
              `car_glass_${shape.name}_rear`,
              shape.width - 0.84,
              shape.cabin.height * 0.46,
              0.16,
              0,
              floor + shape.hull + shape.cabin.height * 0.34,
              shape.cabin.at - shape.cabin.length * 0.42,
              0.05,
            ),
          ]
        : [];
    const sides = shape.singleTrack ? [0] : [-1, 1];
    const wheels = sides.flatMap((side) =>
      [shape.wheelBase, -shape.wheelBase].map((z) => {
        const wheel = MeshBuilder.CreateCylinder(
          `car_wheel_${shape.name}_${side}_${z}`,
          { diameter: shape.wheel, height: shape.singleTrack ? 0.16 : 0.36, tessellation: 10 },
          scene,
        );
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(side * (shape.width / 2 - 0.1), floor, z);
        return wheel;
      }),
    );
    const trim =
      shape.singleTrack
        ? []
        : [
            slab(`car_front_bumper_${shape.name}`, shape.width - 0.4, 0.18, 0.16, 0, floor + shape.hull * 0.26, shape.length / 2 - 0.08, 0.05),
            slab(`car_rear_bumper_${shape.name}`, shape.width - 0.4, 0.18, 0.16, 0, floor + shape.hull * 0.26, -shape.length / 2 + 0.08, 0.05),
            ...sides.flatMap((side) =>
              [shape.wheelBase, -shape.wheelBase].map((z) =>
                slab(
                  `car_arch_${shape.name}_${side}_${z}`,
                  0.16,
                  0.24,
                  shape.wheel * 0.9,
                  side * (shape.width / 2 - 0.03),
                  floor + shape.hull * 0.36,
                  z,
                  0.05,
                ),
              ),
            ),
            ...sides.map((side) =>
              slab(
                `car_mirror_${shape.name}_${side}`,
                0.16,
                0.1,
                0.28,
                side * (shape.width / 2 + 0.03),
                floor + shape.hull + shape.cabin!.height * 0.42,
                shape.cabin!.at + shape.cabin!.length * 0.22,
                0.04,
              ),
            ),
          ];
    // A rider, sitting where the seat is: a body and a head, the same two primitives a
    // pedestrian is built from, just smaller and bolted to the bike instead of walking.
    const rider: Mesh[] = [];
    if (shape.singleTrack) {
      const seatY = floor + shape.hull + shape.cabin!.height;
      const at = shape.cabin!.at - 0.35;
      rider.push(
        slab(`bike_seat_${shape.name}`, 0.44, 0.14, 0.72, 0, seatY - 0.06, at, 0.08),
        slab(`bike_handlebar_${shape.name}`, 0.82, 0.08, 0.08, 0, seatY + 0.22, shape.wheelBase - 0.18, 0.03),
        slab(`bike_front_fork_${shape.name}`, 0.12, 0.62, 0.12, -0.16, floor + 0.42, shape.wheelBase - 0.06, 0.03),
        slab(`bike_front_fork_2_${shape.name}`, 0.12, 0.62, 0.12, 0.16, floor + 0.42, shape.wheelBase - 0.06, 0.03),
        slab(`bike_frame_${shape.name}`, 0.14, 0.18, 1.18, 0, floor + 0.42, 0, 0.04),
        slab(`bike_exhaust_${shape.name}`, 0.14, 0.14, 0.84, shape.width * 0.48, floor + 0.24, -0.28, 0.04),
      );
      const torso = MeshBuilder.CreateCylinder(`car_rider_torso_${shape.name}`, { height: 0.58, diameter: 0.32, tessellation: 8 }, scene);
      torso.position.set(0, seatY + 0.29, at);
      const head = MeshBuilder.CreateSphere(`car_rider_head_${shape.name}`, { diameter: 0.28, segments: 6 }, scene);
      head.position.set(0, seatY + 0.58 + 0.1, at);
      rider.push(torso, head);
    }
    const parts = Mesh.MergeMeshes([...glass, ...wheels, ...trim, ...rider, ...detailParts(shape, true, "")], true, true, undefined, false, false);
    if (!parts) throw new Error("car parts failed to merge");
    parts.name = `car_parts_${shape.name}`;
    parts.material = dark;
    parts.isPickable = false;
    parts.isVisible = false;
    return parts;
  });

  /**
   * A box with its corners taken off: two boxes crossed, plus a cylinder standing in each corner,
   * merged into one. Flat sides, flat roof, soft corners. A plain box reads as a brick at this
   * size, and rounding the whole body instead reads as a bar of soap.
   * ponytail: built out of primitives rather than extruded, because an extrusion has to be
   * oriented and this cannot be got wrong.
   */
  /**
   * The pieces a shape declares for itself, in one of the two prototypes a vehicle is built from
   * (its painted body, or the dark trim that rides along). A round piece becomes a cylinder along
   * whichever of its dimensions is longest, so one spec covers a drum, an exhaust and a barrel.
   */
  function detailParts(shape: CarShape, dark: boolean, suffix: string): Mesh[] {
    return (shape.details ?? [])
      .filter((detail) => (detail.dark ?? false) === dark)
      .flatMap((detail) => (detail.mirrored ? [1, -1] : [1]).map((side) => {
        const name = `car_${shape.name}_${detail.name}${side < 0 ? "_l" : ""}${suffix}`;
        const x = detail.x * side * CAR_VISUAL_SCALE;
        const y = detail.y * CAR_VISUAL_SCALE;
        const z = detail.z * CAR_VISUAL_SCALE;
        const w = detail.width * CAR_VISUAL_SCALE;
        const h = detail.height * CAR_VISUAL_SCALE;
        const d = detail.depth * CAR_VISUAL_SCALE;
        if (!detail.round) return slab(name, w, h, d, x, y, z, 0.08);
        const longest = Math.max(w, h, d);
        const mesh = MeshBuilder.CreateCylinder(name, { diameter: Math.min(w, h, d), height: longest, tessellation: 10 }, scene);
        if (longest === d) mesh.rotation.x = Math.PI / 2;
        else if (longest === w) mesh.rotation.z = Math.PI / 2;
        mesh.position.set(x, y, z);
        return mesh;
      }));
  }

  function slab(
    name: string,
    width: number,
    height: number,
    depth: number,
    x: number,
    y: number,
    z: number,
    corner = 0.4,
  ): Mesh {
    const r = Math.min(corner, width / 2 - 0.01, depth / 2 - 0.01);
    const parts = [
      MeshBuilder.CreateBox(`${name}_x`, { width, height, depth: depth - 2 * r }, scene),
      MeshBuilder.CreateBox(`${name}_z`, { width: width - 2 * r, height, depth }, scene),
    ];
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const post = MeshBuilder.CreateCylinder(`${name}_${sx}_${sz}`, { diameter: r * 2, height, tessellation: 10 }, scene);
        post.position.set(sx * (width / 2 - r), 0, sz * (depth / 2 - r));
        parts.push(post);
      }
    }
    const mesh = Mesh.MergeMeshes(parts, true, true, undefined, false, false);
    if (!mesh) throw new Error(`${name} failed to merge`);
    mesh.name = name;
    mesh.position.set(x, y, z);
    return mesh;
  }

  /**
   * One prototype per colour, each a body and a head merged together, and every walker on the map
   * is an instance of one of them.
   * ponytail: instances of four prototypes, rather than merging two primitives per person.
   */
  const walkerPrototypes = WALKER_COLORS.map((color, i) => {
    const body = MeshBuilder.CreateCylinder(`walker_body_${i}`, { height: 1.15, diameter: 0.5, tessellation: 6 }, scene);
    const head = MeshBuilder.CreateSphere(`walker_head_${i}`, { diameter: 0.46, segments: 5 }, scene);
    head.position.y = 0.78;
    const walker = Mesh.MergeMeshes([body, head], true, true, undefined, false, false);
    if (!walker) throw new Error("walker failed to merge");
    walker.name = `walker_${i}`;
    const material = new StandardMaterial(`walker_${i}`, scene);
    material.diffuseColor = color;
    material.specularColor = Color3.Black();
    walker.material = material;
    walker.isPickable = false;
    // The prototype itself is never seen; hiding it this way still draws its instances.
    walker.isVisible = false;
    return walker;
  });


  return {
    shapes: CAR_SHAPES,
    themedShapes: THEMED_SHAPES,
    plainShapes: PLAIN_SHAPES,
    carBodies,
    carLamps,
    carParts,
    walkerPrototypes,
    lampMaterials,
  };
}
