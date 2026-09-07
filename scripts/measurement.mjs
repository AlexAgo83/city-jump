// What the measurement scripts have to agree on: how an ablation ratio is taken, and what has to
// travel with every number so a later run can be compared against a like measurement.

/**
 * An ablation is worth a ratio, not a difference in fps: this machine's absolute frame rate
 * wanders far more over a run than most ablations move it. The baselines that bracket the
 * ablation are the ones to divide by -- a single baseline taken at the top of the round is
 * minutes and a thermal state away by the time the last ablation is measured, and its drift
 * lands in the answer as if it were the feature's cost.
 */
export const ablationRatio = (fpsWithFeatureOff, baselineBefore, baselineAfter) => {
  const baseline = (baselineBefore + baselineAfter) / 2;
  if (!(baseline > 0)) throw new Error("ablation baseline must be a positive frame rate");
  return fpsWithFeatureOff / baseline;
};

/**
 * Two frame rates only mean something next to each other if they were taken under the same
 * conditions. A paused city renders the same scene for a fraction of the cost of a running one,
 * a software rasteriser prices triangles nothing like a GPU, and a street-level camera is a
 * different scene from an overview -- so each of those travels with the number.
 */
export const conditions = ({ workload, simRate, renderer, camera }) => ({
  workload,
  simRate,
  renderer,
  camera,
});

/**
 * Starts the simulated clock and proves it took: the app boots paused, and until this ran every
 * frame rate these scripts recorded described a still city that neither script said so. A paused
 * scene is worth measuring on purpose -- `--paused` does that, and labels it -- but not by
 * accident.
 */
export const runGameplay = async (page, { rate = 1, settleMs = 1500 } = {}) => {
  const sample = () => page.evaluate(() => {
    const { simSeconds, moverPositions, cars } = window.cityjump.stats();
    return { simSeconds, moverPositions, cars };
  });
  const before = await sample();
  await page.evaluate((value) => window.cityjump.setTimeRate(value), rate);
  await page.waitForTimeout(settleMs);
  const after = await sample();
  if (!(after.simSeconds > before.simSeconds)) {
    throw new Error(`the simulated clock did not advance at rate ${rate}: ${before.simSeconds} -> ${after.simSeconds}`);
  }
  if (after.cars > 0 && after.moverPositions === before.moverPositions) {
    throw new Error(`${after.cars} vehicles never moved while the clock ran; this is a paused workload`);
  }
  return { workload: "running", simRate: rate, simSeconds: after.simSeconds };
};

/** The paused counterpart, so the still scene stays measurable and labelled as such. */
export const pauseGameplay = async (page) => {
  await page.evaluate(() => window.cityjump.setTimeRate(0));
  await page.waitForTimeout(300);
  return { workload: "paused", simRate: 0 };
};

/** Headless Chromium renders on SwiftShader, which prices triangles nothing like a real driver. */
export const rendererOf = (onGpu) => (onGpu ? "gpu" : "swiftshader");
