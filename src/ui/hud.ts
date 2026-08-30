import type { SelectionInfo } from "../render/drawTool";

const toast = document.getElementById("toast") as HTMLDivElement;
let toastTimer = 0;

export function showRefusal(reason: string): void {
  toast.textContent = reason;
  toast.style.opacity = "1";
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => (toast.style.opacity = "0"), 2200);
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
    selectionRows.innerHTML = row("Address", info.address) + row("Footprint", info.footprint);
    return;
  }
  if (info.kind === "vehicle") {
    selectionKind.textContent = info.name;
    selectionRows.innerHTML = row("Street", info.street);
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
