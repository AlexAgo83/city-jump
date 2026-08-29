import { spawn } from "node:child_process";

const [script, ...args] = process.argv.slice(2);
const url = process.env.CITY_JUMP_URL ?? "http://127.0.0.1:5173";
if (!script) throw new Error("usage: node scripts/with-dev-server.mjs <script> [...args]");

const up = async () => {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
    return response.ok;
  } catch {
    return false;
  }
};

let server = null;
if (!(await up())) {
  server = spawn("npm", ["run", "dev", "--", "--host", "127.0.0.1"], { stdio: "inherit" });
  for (let i = 0; i < 60 && !(await up()); i++) await new Promise((resolve) => setTimeout(resolve, 500));
  if (!(await up())) throw new Error(`dev server did not start at ${url}`);
}

const child = spawn(process.execPath, [script, url, ...args], { stdio: "inherit" });
process.on("exit", () => server?.kill());
process.on("SIGINT", () => {
  server?.kill();
  child.kill("SIGINT");
});

const code = await new Promise((resolve) => child.on("exit", resolve));
server?.kill();
process.exit(code ?? 1);
