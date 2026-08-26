import { createScene } from "./render/scene";
import { setHud } from "./render/hud";

const canvas = document.getElementById("app") as HTMLCanvasElement;
const { scene } = createScene(canvas);

setHud("city-jump");
void scene;
