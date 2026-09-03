import { readFileSync } from "node:fs";
import { defineConfig } from "vite";

const version = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")).version;

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
});
