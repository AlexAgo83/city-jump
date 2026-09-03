import type { SelectionInfo } from "../render/drawTool";
import type { BuildingNeed } from "../sim/buildingKinds";
import type { CityResources, CityTerms } from "../sim/economy";
import { ledgerRows } from "./ledger";

const toast = document.getElementById("toast") as HTMLDivElement;
let toastTimer = 0;
const fpsCounter = document.getElementById("fps-counter") as HTMLDivElement;
const compass = document.getElementById("compass") as HTMLDivElement;
const compassNeedle = compass.querySelector(".compass-needle") as HTMLSpanElement;
const compassDirection = compass.querySelector(".compass-direction") as HTMLSpanElement;
const populationText = document.getElementById("population") as HTMLDivElement;
const moneyText = document.getElementById("money") as HTMLDivElement;
const workersText = document.getElementById("workers") as HTMLDivElement;
const foodText = document.getElementById("food") as HTMLDivElement;
const shortageText = document.getElementById("shortage") as HTMLDivElement;
const needsPanel = document.getElementById("needs-panel") as HTMLDivElement;
const cityStrip = document.getElementById("city-strip") as HTMLButtonElement;
const ledger = document.getElementById("ledger") as HTMLDivElement;
const ledgerLines = document.getElementById("ledger-lines") as HTMLDivElement;
const waveBanner = document.getElementById("wave-banner") as HTMLDivElement;
const runWave = document.getElementById("run-wave") as HTMLSpanElement;
const runScience = document.getElementById("run-science") as HTMLSpanElement;
const profilePrestige = document.getElementById("profile-prestige") as HTMLSpanElement;

cityStrip.addEventListener("click", () => {
  ledger.hidden = !ledger.hidden;
  cityStrip.setAttribute("aria-expanded", String(!ledger.hidden));
});

export function showRefusal(reason: string): void {
  showToast(reason, "refusal");
}

export function showAlert(message: string): void {
  showToast(message, "alert");
}

function showToast(reason: string, kind: "refusal" | "alert"): void {
  toast.textContent = reason;
  toast.dataset.kind = kind;
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

export function showCityStats(population: number, needs: readonly BuildingNeed[], resources?: CityResources, terms?: CityTerms): void {
  populationText.textContent = compact(Math.round(population));
  const workers = needs.find((need) => need.kind === "residential");
  workersText.textContent = workers ? `${workers.supply}/${workers.need}` : "0/0";
  foodText.textContent = compact(Math.floor(resources?.food ?? 0));
  shortageText.textContent = shortage(needs);
  needsPanel.replaceChildren(...needs.map((need) => {
    const row = document.createElement("div");
    row.className = "need-row";
    const name = document.createElement("span");
    const meter = document.createElement("meter");
    const value = document.createElement("b");
    name.textContent = needLabel(need.kind);
    meter.min = 0;
    meter.max = 1;
    meter.value = Number(need.ratio.toFixed(3));
    value.textContent = needText(need);
    row.replaceChildren(name, meter, value);
    return row;
  }));
  ledgerLines.replaceChildren(...ledgerRows(terms, resources).map((row) => {
    const line = document.createElement("div");
    line.className = "ledger-row";
    if (row.short) line.dataset.short = "true";
    const label = document.createElement("span");
    const value = document.createElement("b");
    const inflow = document.createElement("i");
    const outflow = document.createElement("i");
    label.textContent = row.label;
    value.textContent = row.value;
    inflow.textContent = row.inflow;
    outflow.textContent = row.outflow;
    line.replaceChildren(label, value, inflow, outflow);
    return line;
  }));
  ledgerLines.dataset.empty = String(!terms && !resources);
}

export function showMoney(balance: number, perSecond: number, queue: { rising?: number; rebuilding?: number } = {}): void {
  moneyText.textContent = `$${compact(Math.floor(balance))} ${perSecond >= 0 ? "+" : ""}${perSecond.toFixed(1)}/s`;
  moneyText.title = `${queue.rising ?? 0} rising, ${queue.rebuilding ?? 0} rebuilding`;
}

export function showWaveBanner(text: string, state: "waiting" | "active" | "held" | "breached" = "waiting"): void {
  if (waveBanner.textContent === text && waveBanner.dataset.state === state && waveBanner.hidden === (text === "")) return;
  waveBanner.hidden = text === "";
  waveBanner.dataset.state = state;
  waveBanner.textContent = text;
}

export function showRunStats(wave: number, science: number, prestige: number): void {
  runWave.textContent = String(wave);
  runScience.textContent = String(Math.floor(science));
  profilePrestige.textContent = String(Math.floor(prestige));
}

function label(kind: string): string {
  return kind === "residential" ? "Res" : kind === "commercial" ? "Com" : kind === "industrial" ? "Ind" : kind === "agricultural" ? "Agr" : "Mil";
}

function needLabel(kind: string): string {
  return kind === "residential" ? "Workers" : kind === "commercial" ? "Commerce" : kind === "industrial" ? "Industry" : kind === "agricultural" ? "Farming" : "Military";
}

function needText(need: BuildingNeed): string {
  if (need.kind === "military") return `${compact(Math.round(need.supply))}/${compact(Math.round(need.need))}`;
  if (need.need === 0) return need.supply > 0 ? "OK" : "--";
  return need.supply >= need.need ? "OK" : `Need ${compact(Math.ceil(need.need - need.supply))}`;
}


/**
 * The worst shortage, not the first one in the list.
 *
 * Reading in array order meant this always said "Workers": jobs demanded outrun the workforce from
 * the first minute and never stop, so no other shortage was ever shown -- not food, not defence.
 * Ranking by ratio surfaces whichever gauge is actually furthest from being met.
 */
function shortage(needs: readonly BuildingNeed[]): string {
  const short = needs.filter((need) => need.need > need.supply).sort((a, b) => a.ratio - b.ratio)[0];
  return short ? `${needLabel(short.kind)} ${compact(Math.round(short.need - short.supply))}` : "None";
}

function compact(value: number): string {
  if (value < 1000) return String(value);
  return `${Math.round(value / 1000)}k`;
}

function stateLabel(state: string): string {
  return state === "rising" ? "Construction" : state === "idle" ? "Idle" : state === "rebuilding" ? "Rebuilding" : "Working";
}

const selectionPanel = document.getElementById("selection-panel") as HTMLDivElement;
const selectionKind = selectionPanel.querySelector(".selection-kind") as HTMLDivElement;
const selectionRows = selectionPanel.querySelector("dl") as HTMLDListElement;

function row(label: string, value: string): [HTMLElement, HTMLElement] {
  const term = document.createElement("dt");
  const description = document.createElement("dd");
  term.textContent = label;
  description.textContent = value;
  return [term, description];
}

/** What the select tool put under the pointer, or null to hide the panel again. */
export function showSelection(info: SelectionInfo | null): void {
  selectionPanel.hidden = info === null;
  if (info === null) return;
  if (info.kind === "road") {
    selectionKind.textContent = "Road";
    selectionRows.replaceChildren(
      ...row("Type", info.name),
      ...row("Street", info.street),
      ...row("Lanes", String(info.lanes)),
      ...row("Direction", info.oneWay ? "One-way" : "Two-way"),
      ...row("Length", `${info.length.toFixed(0)} m`),
    );
    return;
  }
  if (info.kind === "building") {
    selectionKind.textContent = "Building";
    const construction = info.state === "rising" || info.state === "rebuilding"
      ? `${stateLabel(info.state)} -- ${Math.round(info.progress * 100)} % -- ${Math.ceil(info.remainingSeconds)} s remaining`
      : stateLabel(info.state);
    const rows = [
      ...row("Address", info.address),
      ...row("Type", label(info.buildingKind)),
      ...row("Footprint", info.footprint),
      // A lot is staffed whole or not at all, so this is either the full shift or none of it. A
      // home asks for nobody, and says so rather than showing an empty pair of zeroes.
      ...row("Workers", info.workers === 0 ? "None needed" : `${info.staffed ? info.workers : 0}/${info.workers}`),
      ...row("State", construction),
    ];
    if (info.reason) {
      rows.push(...row("Reason", info.reason === "workers" ? "No workers" : info.reason === "power" ? "No power" : info.reason === "water" ? "No water" : "Under construction"));
    }
    selectionRows.replaceChildren(...rows);
    return;
  }
  if (info.kind === "utility") {
    selectionKind.textContent = info.utility === "power" ? "Power" : "Water";
    selectionRows.replaceChildren(
      ...row("Role", info.role === "producer" ? "Producer" : "Diffuser"),
      ...row("Staff", String(info.staff)),
    );
    return;
  }
  if (info.kind === "vehicle") {
    selectionKind.textContent = info.name;
    // "saloon" -> "Saloon", "troop truck" -> "Troop truck".
    const model = info.model ? info.model.charAt(0).toUpperCase() + info.model.slice(1) : "";
    selectionRows.replaceChildren(...(model ? row("Type", model) : []), ...row("Street", info.street));
    return;
  }
  if (info.kind === "roundabout") {
    selectionKind.textContent = "Roundabout";
    selectionRows.replaceChildren(...row("Lanes", String(info.lanes)), ...row("Radius", `${info.radius.toFixed(0)} m`));
    return;
  }
  selectionKind.textContent = "Tree";
  selectionRows.replaceChildren();
}
