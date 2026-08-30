import type { Scene } from "@babylonjs/core/scene";
import type { Camera } from "@babylonjs/core/Cameras/camera";
import type { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { DefaultRenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline";
import { DepthOfFieldEffectBlurLevel } from "@babylonjs/core/PostProcesses/depthOfFieldEffect";
import { SSAO2RenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/ssao2RenderingPipeline";
import { ImageProcessingConfiguration } from "@babylonjs/core/Materials/imageProcessingConfiguration";
import "@babylonjs/core/Rendering/depthRendererSceneComponent";
import "@babylonjs/core/Rendering/geometryBufferRendererSceneComponent";

/** Which of the screen-space passes are on. Colour grading is not here: it is free, so it stays. */
export interface LookSettings {
  antialias: boolean;
  bloom: boolean;
  ao: boolean;
  tiltShift: boolean;
}

/** Circle of confusion, in millimetres, a third of the way past the focus. Two reads as a model;
 * four is a photograph of a model taken by someone who was showing off. */
const MINIATURE_BLUR = 2;

export const DEFAULT_LOOK: LookSettings = { antialias: true, bloom: true, ao: false, tiltShift: false };

/**
 * Everything that happens to the picture after the city is drawn.
 *
 * Each pass costs fill rate rather than draw calls, which is the one budget a city of thin
 * instances still has to spare -- but it is the player's screen, not ours, so all of it is
 * switchable and only the free part (tone mapping and a little contrast) is always on.
 *
 * ponytail: one Babylon pipeline plus SSAO, no effect framework. Bloom follows the clock rather
 * than a second switch, because a bloom that costs a pass at noon and shows nothing is waste.
 */
export function createPostFx(scene: Scene, camera: ArcRotateCamera) {
  const pipeline = new DefaultRenderingPipeline("look", true, scene, [camera as Camera]);
  // The pipeline renders the scene into its own target, which does not inherit the canvas's own
  // multisampling -- without this the city comes back through the post-processing with every edge
  // stepped, which is worse than having no pipeline at all. FXAA on top smooths what MSAA cannot
  // (the inside of a texture), and is the part the player can switch off.
  pipeline.samples = 4;

  // Free, and the reason the greens stopped reading as flat paint: filmic tone mapping, a touch of
  // contrast, and a vignette dark enough to frame the view without being noticed.
  pipeline.imageProcessingEnabled = true;
  pipeline.imageProcessing.toneMappingEnabled = true;
  pipeline.imageProcessing.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
  pipeline.imageProcessing.contrast = 1.12;
  pipeline.imageProcessing.exposure = 1.05;
  pipeline.imageProcessing.vignetteEnabled = true;
  pipeline.imageProcessing.vignetteWeight = 1.4;
  pipeline.imageProcessing.vignetteStretch = 0.4;

  pipeline.bloomThreshold = 0.72;
  pipeline.bloomWeight = 0.28;
  pipeline.bloomKernel = 48;
  pipeline.bloomScale = 0.5;

  // Tilt-shift: a city seen from above through a shallow focus reads as a model of itself. The
  // focus sits on whatever the camera is pointed at, so the middle of the screen is always sharp.
  pipeline.depthOfFieldBlurLevel = DepthOfFieldEffectBlurLevel.Medium;
  pipeline.depthOfField.fStop = 1.4;
  pipeline.depthOfField.focalLength = 900;

  let ssao: SSAO2RenderingPipeline | null = null;
  let look: LookSettings = { ...DEFAULT_LOOK };
  let night = false;

  const applyBloom = (): void => {
    // Bloom only earns its pass once the lamps are the brightest thing in the frame.
    pipeline.bloomEnabled = look.bloom && night;
  };

  function setLook(next: LookSettings): void {
    look = { ...next };
    pipeline.fxaaEnabled = look.antialias;
    pipeline.depthOfFieldEnabled = look.tiltShift;
    applyBloom();
    if (look.ao && !ssao) {
      // Half-resolution: the occlusion is a soft contact shadow, and nobody reads it pixel by
      // pixel. Full resolution roughly doubles the cost for a difference this scene cannot show.
      ssao = new SSAO2RenderingPipeline("ao", scene, { ssaoRatio: 0.5, blurRatio: 1 }, [camera as Camera]);
      ssao.radius = 6;
      ssao.totalStrength = 1.1;
      ssao.expensiveBlur = false;
      ssao.samples = 8;
      ssao.maxZ = 900;
    } else if (!look.ao && ssao) {
      ssao.dispose();
      ssao = null;
    }
  }

  /** The clock, so bloom can come on with the streetlights and cost nothing by day. */
  function setNight(isNight: boolean): void {
    night = isNight;
    applyBloom();
  }

  /**
   * Focus follows the camera: what the player is looking at stays sharp, and the blur grows with
   * height so the miniature effect only appears when the city is small enough to be one.
   */
  function update(): void {
    if (!look.tiltShift) return;
    // Focus on what the camera is actually pointed at, so the middle of the screen is sharp; the
    // ground falls away from it towards the top and the bottom of the picture, and that is where
    // the blur comes from. An ordinary lens focused hundreds of metres out holds a whole city in
    // focus, so the focal length is derived instead of chosen: for a circle of confusion of about
    // MINIATURE_BLUR at a third past the focus, f = sqrt(8.7 * D * N). It grows with distance,
    // which is why the effect stays the same strength at every height.
    const distanceMm = camera.radius * 1000;
    const fStop = 1.4;
    pipeline.depthOfField.focusDistance = distanceMm;
    pipeline.depthOfField.fStop = fStop;
    pipeline.depthOfField.focalLength = Math.min(9000, Math.sqrt(8.7 * distanceMm * fStop * MINIATURE_BLUR));
  }

  return { setLook, setNight, update, get pipeline() { return pipeline; } };
}
