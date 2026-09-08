import { PERFORMANCE_CATEGORIES, performanceCeiling, type FrameProfiler, type PerformanceSample } from "../render/frameProfiler";
import type { FpsMeter } from "../render/fps";
import { showFps } from "./hud";

/** A bounded 30-second canvas trace, redrawn only for a new 100 ms sample or an interaction. */
export function createPerformanceHud(fps: FpsMeter, profiler: FrameProfiler, setProfiling: (enabled: boolean) => void) {
  const panel = document.getElementById("performance-panel")!;
  const canvas = document.getElementById("performance-chart") as HTMLCanvasElement;
  const context = canvas.getContext("2d")!;
  const summary = document.getElementById("performance-summary")!;
  const legend = document.getElementById("performance-legend")!;
  const tooltip = document.getElementById("performance-tooltip")!;
  let showGraph = false;
  let stopFps: (() => void) | null = null;
  let hoverAt: number | null = null;
  let chartWidth = 380;
  const height = 180;
  const left = 36, right = 8, top = 12, bottom = 25;
  const values = PERFORMANCE_CATEGORIES.map(({ label, color }) => {
    const row = document.createElement("div");
    const swatch = document.createElement("i");
    swatch.style.backgroundColor = color;
    swatch.setAttribute("aria-hidden", "true");
    const name = document.createElement("span");
    name.textContent = label;
    const value = document.createElement("b");
    value.textContent = "—";
    row.append(swatch, name, value);
    legend.append(row);
    return value;
  });
  const ms = (value: number | null): string => value === null ? "unavailable" : `${value.toFixed(1)} ms`;
  const draw = profiler.wrap("ui", (): void => {
    if (!showGraph || !profiler.enabled) return;
    const history = profiler.history;
    const latest = history.at(-1);
    const width = canvas.clientWidth;
    if (!width) return;
    chartWidth = width;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
    }
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);
    const now = latest?.at ?? performance.now();
    const ceiling = performanceCeiling(history);
    const x = (at: number): number => left + ((at - now + 30_000) / 30_000) * (width - left - right);
    const y = (value: number): number => height - bottom - (value / ceiling) * (height - top - bottom);
    context.font = "10px system-ui";
    context.lineWidth = 1;
    const ticks = ceiling > 100 ? [0, ceiling / 2] : ceiling > 60 ? [0, 1000 / 60, 1000 / 30] : [0, 8, 1000 / 60, 1000 / 30];
    for (const tick of ticks) {
      context.strokeStyle = "#ffffff22";
      context.setLineDash(tick > 16 ? [4, 4] : []);
      context.beginPath(); context.moveTo(left, y(tick)); context.lineTo(width - right, y(tick)); context.stroke();
      context.fillStyle = "#aebbc5";
      context.textAlign = "right";
      context.fillText(tick === 0 || tick === 8 ? String(tick) : tick.toFixed(1), left - 5, y(tick) + 3);
    }
    if (ceiling > 36) context.fillText(String(ceiling), left - 5, top + 3);
    context.setLineDash([]);
    for (const seconds of [30, 20, 10, 0]) {
      const px = x(now - seconds * 1000);
      context.strokeStyle = "#ffffff0c";
      context.beginPath(); context.moveTo(px, top); context.lineTo(px, height - bottom); context.stroke();
      context.textAlign = seconds === 30 ? "left" : seconds === 0 ? "right" : "center";
      context.fillText(seconds ? `-${seconds}s` : "now", px, height - 7);
    }
    context.save();
    context.beginPath(); context.rect(left, top, width - left - right, height - top - bottom); context.clip();
    const cumulative = history.map(() => 0);
    for (const { id, color } of PERFORMANCE_CATEGORIES) {
      context.beginPath();
      for (let i = 0; i < history.length; i++) {
        const sample = history[i]!;
        const px = x(sample.at), py = y(cumulative[i]! + sample.costs[id]);
        if (i === 0) context.moveTo(px, py); else context.lineTo(px, py);
      }
      for (let i = history.length - 1; i >= 0; i--) context.lineTo(x(history[i]!.at), y(cumulative[i]!));
      context.closePath(); context.fillStyle = color; context.fill();
      for (let i = 0; i < history.length; i++) cumulative[i]! += history[i]!.costs[id];
    }
    const line = (read: (sample: PerformanceSample) => number | null, color: string, dash: number[] = []): void => {
      context.beginPath(); context.strokeStyle = color; context.setLineDash(dash);
      let connected = false;
      for (const sample of history) {
        const value = read(sample);
        if (value === null) { connected = false; continue; }
        if (connected) context.lineTo(x(sample.at), y(value)); else context.moveTo(x(sample.at), y(value));
        connected = true;
      }
      context.stroke(); context.setLineDash([]);
    };
    line((s) => s.cpuPeak, "#f4b777", [2, 3]);
    line((s) => s.framePeak, "#ffffff55", [1, 3]);
    line((s) => s.frame, "#f4f6f8");
    line((s) => s.gpu, "#43e4de", [4, 3]);
    context.restore();
    context.textAlign = "right"; context.fillStyle = "#dae4e9";
    if (ceiling <= 100) {
      for (const [label, threshold] of [["60 FPS", 1000 / 60], ["30 FPS", 1000 / 30]] as const) {
        context.fillStyle = "#11151a";
        context.fillRect(width - right - 38, y(threshold) - 14, 38, 12);
        context.fillStyle = "#dae4e9";
        context.fillText(label, width - right, y(threshold) - 4);
      }
    }
    const tallest = history.reduce<PerformanceSample | null>((best, sample) => !best || Math.max(sample.cpuPeak, sample.framePeak, sample.gpu ?? 0) > Math.max(best.cpuPeak, best.framePeak, best.gpu ?? 0) ? sample : best, null);
    if (tallest && Math.max(tallest.cpuPeak, tallest.framePeak, tallest.gpu ?? 0) > ceiling) {
      const px = Math.max(left + 40, Math.min(width - right - 92, x(tallest.at)));
      context.fillStyle = "#f4b777"; context.textAlign = "center";
      context.fillText(`↑ ${Math.max(tallest.cpuPeak, tallest.framePeak, tallest.gpu ?? 0).toFixed(0)} ms peak`, px, top + 7);
    }
    if (!latest) {
      context.textAlign = "center";
      context.fillText("Collecting frame timings…", width / 2, height / 2);
      return;
    }
    summary.textContent = `CPU ${ms(latest.cpu)} · GPU ${ms(latest.gpu)}`;
    PERFORMANCE_CATEGORIES.forEach(({ id }, index) => { values[index]!.textContent = ms(latest.costs[id]); });
    canvas.setAttribute("aria-label", `Last 30 seconds of CPU frame costs. CPU ${ms(latest.cpu)}, frame interval ${ms(latest.frame)}, GPU ${ms(latest.gpu)}. Focus and use arrow keys to inspect samples.`);
    if (hoverAt !== null) {
      const sample = history.reduce((best, next) => Math.abs(next.at - hoverAt!) < Math.abs(best.at - hoverAt!) ? next : best);
      context.strokeStyle = "#ffffff88";
      context.beginPath(); context.moveTo(x(sample.at), top); context.lineTo(x(sample.at), height - bottom); context.stroke();
      tooltip.hidden = false;
      tooltip.textContent = `${((sample.at - now) / 1000).toFixed(1)} s · CPU ${ms(sample.cpu)} · peak ${ms(sample.cpuPeak)}\nFrame ${ms(sample.frame)} · peak ${ms(sample.framePeak)} · GPU ${ms(sample.gpu)}\n${PERFORMANCE_CATEGORIES.map(({ id, label }) => `${label}: ${ms(sample.costs[id])}`).join("\n")}`;
    } else tooltip.hidden = true;
  });
  const resize = new ResizeObserver(() => draw());
  const pointer = (event: PointerEvent): void => {
    const latest = profiler.history.at(-1);
    if (!latest) return;
    const fraction = Math.max(0, Math.min(1, (event.clientX - canvas.getBoundingClientRect().left - left) / (chartWidth - left - right)));
    hoverAt = latest.at - (1 - fraction) * 30_000;
    draw();
  };
  const leave = (): void => { hoverAt = null; tooltip.hidden = true; draw(); };
  const keydown = (event: KeyboardEvent): void => {
    if (event.key === "Escape") {
      event.preventDefault(); event.stopPropagation();
      return leave();
    }
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault(); event.stopPropagation();
    const history = profiler.history;
    if (!history.length) return;
    const current = hoverAt === null ? history.length - 1 : history.findIndex((s) => s.at >= hoverAt!);
    hoverAt = history[Math.max(0, Math.min(history.length - 1, current + (event.key === "ArrowLeft" ? -1 : 1)))]!.at;
    draw();
  };
  canvas.addEventListener("pointermove", pointer);
  canvas.addEventListener("pointerleave", leave);
  canvas.addEventListener("keydown", keydown);
  canvas.addEventListener("blur", leave);
  const updateCapture = (): void => {
    setProfiling(showGraph && !document.hidden);
    hoverAt = null;
    tooltip.hidden = true;
    summary.textContent = "CPU — · GPU —";
    for (const value of values) value.textContent = "—";
    draw();
  };
  document.addEventListener("visibilitychange", updateCapture);
  profiler.onSample = draw;
  return {
    setGraphVisible(visible: boolean): void {
      showGraph = visible;
      panel.hidden = !visible;
      resize.disconnect();
      if (visible) resize.observe(canvas);
      updateCapture();
    },
    setFpsVisible(visible: boolean): void {
      if (visible === Boolean(stopFps)) return;
      stopFps?.();
      stopFps = visible ? fps.watch() : null;
      showFps(visible ? fps.display : null);
    },
    frame(): void {
      if (fps.active && fps.frame(performance.now()) && stopFps) showFps(fps.display);
    },
    dispose(): void {
      stopFps?.();
      resize.disconnect();
      profiler.onSample = null;
      setProfiling(false);
      panel.hidden = true;
      document.removeEventListener("visibilitychange", updateCapture);
      canvas.removeEventListener("pointermove", pointer);
      canvas.removeEventListener("pointerleave", leave);
      canvas.removeEventListener("keydown", keydown);
      canvas.removeEventListener("blur", leave);
      legend.replaceChildren();
    },
  };
}
