import { readFileSync } from "node:fs";
import { defineConfig } from "vite";

const version = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")).version;

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  test: {
    coverage: {
      /**
       * `src/sim/` only, and deliberately so. It is pure by construction -- no Babylon, no DOM --
       * so an executed line there means a rule was exercised. Over `src/render/` the same
       * percentage would only prove a Babylon call ran, which is not evidence a mesh is right;
       * that is what `test:visual` and `test:e2e` are for.
       */
      include: ["src/sim/**"],
      /**
       * Set from the measurement, not from a round number: at the time of writing the suite covers
       * 96.86% of lines, 94.62% of statements, 97.54% of functions and 87.5% of branches. These sit
       * just under that, so the gate catches a real regression without turning every honest
       * refactor into a threshold edit. Raise them when the measured figure has moved up and held.
       */
      thresholds: {
        lines: 95,
        statements: 93,
        functions: 96,
        branches: 85,
      },
    },
  },
});
