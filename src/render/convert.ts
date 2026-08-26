import { Vector3 } from "@babylonjs/core/Maths/math";
import type { Vec3 } from "../sim/vec";

/** The one place the simulation's vectors become the engine's. */
export const toBabylon = (v: Vec3): Vector3 => new Vector3(v.x, v.y, v.z);
