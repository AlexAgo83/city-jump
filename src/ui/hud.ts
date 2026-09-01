import type { SelectionInfo } from "../render/drawTool";
import type { BuildingNeed } from "../sim/buildingKinds";

const toast = document.getElementById("toast") as HTMLDivElement;
let toastTimer = 0;
const fpsCounter = document.getElementById("fps-counter") as HTMLDivElement;
const compass = document.getElementById("compass") as HTMLDivElement;
const compassNeedle = compass.querySelector(".compass-needle") as HTMLSpanElement;
const compassDirection = compass.querySelector(".compass-direction") as HTMLSpanElement;
const populationText = document.getElementById("population") as HTMLDivElement;
const moneyText = document.getElementById("money") as HTMLDivElement;
const needsPanel = document.getElementById("needs-panel") as HTMLDivElement;
const waveBanner = document.getElementById("wave-banner") as HTMLDivElement;

export function showRefusal(reason: string): void {
  toast.textContent = reason;
  toast.style.opacity = "1";
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (toast.style.opacity = "0"), 2200);
}

export function showFps(fps: number | null): void {
  fpsCounter.hidden = fps === null;
  if (fps === null) return;
  fpsCounter.textContent = `${fps} FPS`;
}

export function showCompass(alpha: number): void {
  const heading = (((-alpha - Math.PI / 2) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const names = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  compassNeedle.style.transform = `rotate(${heading}rad)`;
  compassDirection.textContent = names[Math.round(heading / (Math.PI / 4)) % names.length]!;
}

export function showCityStats(population: number, needs: readonly BuildingNeed[]): void {
  populationText.textContent = `${compact(Math.round(population))} residents`;
  needsPanel.replaceChildren(...needs.map((need) => {
    const row = document.createElement("div");
    row.className = "need-row";
    const value = needText(need);
    row.innerHTML =
      `<span>${needLabel(need.kind)}</span><meter min="0" max="1" value="${need.ratio.toFixed(3)}"></meter><b>${value}</b>`;
    return row;
  }));
}

export function showMoney(balance: number, perSecond: number, queue: { rising?: number; waiting?: number } = {}): void {
  moneyText.textContent = `$${Math.floor(balance).toLocaleString()} ${perSecond >= 0 ? "+" : ""}$${perSecond.toFixed(1)}/s | ${queue.rising ?? 0} rising, ${queue.waiting ?? 0} waiting`;
}

export function showWaveBanner(text: string, state: "waiting" | "active" | "held" | "breached" = "waiting"): void {
  if (waveBanner.textContent === text && waveBanner.dataset.state === state && waveBanner.hidden === (text === "")) return;
  waveBanner.hidden = text === "";
  waveBanner.dataset.state = state;
  waveBanner.textContent = text;
}

function label(kind: string): string {
  return kind === "residential" ? "Res" : kind === "commercial" ? "Com" : kind === "industrial" ? "Ind" : kind === "agricultural" ? "Agr" : "Mil";
}

function needLabel(kind: string): string {
  return kind === "residential" ? "Workers" : kind === "commercial" ? "Commerce" : kind === "industrial" ? "Industry" : kind === "agricultural" ? "Farming" : "Military";
}

function needText(need: BuildingNeed): string {
  // Compact: the panel is read at a glance, and stays visible with the settings folded away.
  if (need.kind === "military") return `${need.supply} of ${need.need}`;
  if (need.need === 0) return need.supply > 0 ? "OK" : "No demand";
  return need.supply >= need.need ? "OK" : `Need ${need.need - need.supply}`;
}

function compact(value: number): string {
  if (value < 1000) return String(value);
  return `${Math.round(value / 1000)}k`;
}

function stateLabel(state: string): string {
  return state === "waiting" ? "Waiting" : state === "rising" ? "Construction" : state === "idle" ? "Idle" : state === "rebuilding" ? "Rebuilding" : "Working";
}

const selectionPanel = document.getElementById("selection-panel") as HTMLDivElement;
const selectionKind = selectionPanel.querySelector(".selection-kind") as HTMLDivElement;
const selectionRows = selectionPanel.querySelector("dl") as HTMLDListElement;

function row(label: string, value: string): string {
  return `<dt>${label}</dt><dd>${value}</dd>`;
}

/** What the select tool put under the pointer, or null to hide the panel again. */
export function showSelection(info: SelectionInfo | null): void {
  selectionPanel.hidden = info === null;
  if (info === null) return;
  if (info.kind === "road") {
    selectionKind.textContent = "Road";
    selectionRows.innerHTML =
      row("Type", info.name) +
      row("Street", info.street) +
      row("Lanes", String(info.lanes)) +
      row("Direction", info.oneWay ? "One-way" : "Two-way") +
      row("Length", `${info.length.toFixed(0)} m`);
    return;
  }
  if (info.kind === "building") {
    selectionKind.textContent = "Building";
    selectionRows.innerHTML =
      row("Address", info.address) +
      row("Type", label(info.buildingKind)) +
      row("Footprint", info.footprint) +
      row("State", stateLabel(info.state)) +
      (info.reason ? row("Reason", info.reason === "workers" ? "No workers" : info.reason === "funds" ? "Waiting for funds" : "Under construction") : "");
    return;
  }
  if (info.kind === "vehicle") {
    selectionKind.textContent = info.name;
    // "saloon" -> "Saloon", "troop truck" -> "Troop truck".
    const model = info.model ? info.model.charAt(0).toUpperCase() + info.model.slice(1) : "";
    selectionRows.innerHTML = (model ? row("Type", model) : "") + row("Street", info.street);
    return;
  }
  if (info.kind === "roundabout") {
    selectionKind.textContent = "Roundabout";
    selectionRows.innerHTML = row("Lanes", String(info.lanes)) + row("Radius", `${info.radius.toFixed(0)} m`);
    return;
  }
  selectionKind.textContent = "Tree";
  selectionRows.innerHTML = "";
}
