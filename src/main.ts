import { startApp } from "./app/app";

const app = await startApp(performance.now());
(import.meta as ImportMeta & { hot?: { dispose(callback: () => void): void } }).hot?.dispose(() => app.dispose());
