import type { CitySave } from "../sim/save";
import { composeRoadTypeId } from "../sim/roadTypes";
import {
  listSaves,
  readSave,
  writeSave,
  deleteSave,
  readSettings,
  writeSettings,
  readActiveSave,
  writeActiveSave,
  type UiSettings,
} from "./saves";
import { showRefusal } from "./hud";

export function bindControls(handlers: {
  onRoadMode(mode: "view" | "straight" | "curve" | "bulldoze" | "plant" | "spray" | "roundabout"): void;
  onRoadType(type: string): void;
  onWorldGrid(visible: boolean): void;
  onGridSnap(enabled: boolean): void;
  onTreeSpecies(species: string): void;
  onBuildings(visible: boolean): void;
  onSelectView(view: "all" | "no-buildings" | "traffic"): void;
  onSunHour(hour: number): void;
  /** Current city as data, ready to store. */
  onSave(): CitySave;
  /** Replays a stored city. Returns false if it could not be replayed. */
  onLoad(city: CitySave): boolean;
}): { applyCity(city: CitySave): void; applyRoadType(baseId: string, lanes: 1 | 2, oneWay: boolean): void } {
  const toolbar = document.getElementById("toolbar")!;
  const toolbarContent = document.getElementById("toolbar-content")!;
  const toolbarToggle = document.getElementById("toolbar-toggle") as HTMLButtonElement;
  toolbarToggle.addEventListener("click", () => {
    const expanded = toolbarToggle.getAttribute("aria-expanded") === "true";
    toolbarToggle.setAttribute("aria-expanded", String(!expanded));
    toolbarToggle.title = expanded ? "Expand settings" : "Collapse settings";
    toolbar.classList.toggle("collapsed", expanded);
    toolbarContent.hidden = expanded;
  });

  const selectViewOptions = document.getElementById("select-view-options")!;
  const roadTypeOptions = document.getElementById("road-type-options")!;
  const roadOptions = document.getElementById("road-options")!;
  const natureOptions = document.getElementById("nature-options")!;
  const toolButtons = [...document.querySelectorAll<HTMLButtonElement>("[data-tool]")];
  let roadMode: "straight" | "curve" | "roundabout" = "straight";
  let plantMode: "plant" | "spray" = "plant";

  for (const button of toolButtons) {
    button.addEventListener("click", () => {
      for (const candidate of toolButtons) candidate.setAttribute("aria-pressed", String(candidate === button));
      const tool = button.dataset.tool;
      selectViewOptions.hidden = tool !== "select";
      roadTypeOptions.hidden = tool !== "roads";
      roadOptions.hidden = tool !== "roads";
      natureOptions.hidden = tool !== "nature";
      handlers.onRoadMode(
        tool === "roads" ? roadMode : tool === "nature" ? plantMode : tool === "bulldoze" ? "bulldoze" : "view",
      );
    });
  }

  for (const input of document.querySelectorAll<HTMLInputElement>('input[name="select-view"]')) {
    input.addEventListener("change", () => {
      if (!input.checked) return;
      handlers.onSelectView(input.value === "no-buildings" ? "no-buildings" : input.value === "traffic" ? "traffic" : "all");
    });
  }

  for (const input of document.querySelectorAll<HTMLInputElement>('input[name="plant-mode"]')) {
    input.addEventListener("change", () => {
      if (!input.checked) return;
      plantMode = input.value === "spray" ? "spray" : "plant";
      handlers.onRoadMode(plantMode);
    });
  }

  for (const input of document.querySelectorAll<HTMLInputElement>('input[name="road-shape"]')) {
    input.addEventListener("change", () => {
      if (!input.checked) return;
      roadMode = input.value === "curve" ? "curve" : input.value === "roundabout" ? "roundabout" : "straight";
      handlers.onRoadMode(roadMode);
    });
  }

  const showGrid = document.getElementById("show-grid") as HTMLInputElement;
  const gridSnap = document.getElementById("grid-snap") as HTMLInputElement;
  const showBuildings = document.getElementById("show-buildings") as HTMLInputElement;

  showGrid.addEventListener("change", () => {
    handlers.onWorldGrid(showGrid.checked);
    persistSettings();
  });

  gridSnap.addEventListener("change", () => {
    handlers.onGridSnap(gridSnap.checked);
    persistSettings();
  });

  showBuildings.addEventListener("change", () => {
    handlers.onBuildings(showBuildings.checked);
    persistSettings();
  });

  document.getElementById("tree-species")!.addEventListener("change", (event) => {
    handlers.onTreeSpecies((event.currentTarget as HTMLSelectElement).value);
  });

  const roadLanes = document.getElementById("road-lanes") as HTMLInputElement;
  const roadOneway = document.getElementById("road-oneway") as HTMLInputElement;
  let roadTypeValue = "street";

  /** Pedestrian paths stay exactly what they are -- one lane, two-way, no player choice. */
  function emitRoadType(): void {
    const isPedestrian = roadTypeValue === "pedestrian";
    roadLanes.disabled = isPedestrian;
    roadOneway.disabled = isPedestrian;
    handlers.onRoadType(composeRoadTypeId(roadTypeValue, roadLanes.checked ? 2 : 1, roadOneway.checked));
  }

  for (const input of document.querySelectorAll<HTMLInputElement>('input[name="road-type"]')) {
    input.addEventListener("change", () => {
      if (!input.checked) return;
      roadTypeValue = input.value;
      emitRoadType();
    });
  }
  roadLanes.addEventListener("change", emitRoadType);
  roadOneway.addEventListener("change", emitRoadType);

  const sunHour = document.getElementById("sun-hour") as HTMLInputElement;
  const sunTime = document.getElementById("sun-time") as HTMLOutputElement;
  const sunAuto = document.getElementById("sun-auto") as HTMLInputElement;
  const shortNight = document.getElementById("short-night") as HTMLInputElement;
  const AUTO_HOURS_PER_SECOND = 0.25;
  let sunFrame: number | null = null;
  let autoStartHour = 0;
  let autoStartedAt = 0;
  const updateSun = (next = Number(sunHour.value)): void => {
    const hour = ((next % 24) + 24) % 24;
    sunHour.value = String(hour);
    handlers.onSunHour(hour);
    const totalMinutes = Math.round(hour * 60) % (24 * 60);
    const whole = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    sunTime.value = `${String(whole).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  };
  const tickSun = (): void => {
    const now = performance.now();
    const next = autoStartHour + ((now - autoStartedAt) / 1000) * AUTO_HOURS_PER_SECOND;
    // Short night jumps 22:00 to 05:00, so a run of the cycle is mostly daylight. Turned off, the
    // clock simply wraps through 24 and you get the whole night. updateSun already takes the
    // modulo, so nothing else has to know which of the two is running.
    if (shortNight.checked && next >= 22) {
      autoStartHour = 5;
      autoStartedAt = now;
      updateSun(5);
    } else {
      updateSun(next);
    }
    sunFrame = requestAnimationFrame(tickSun);
  };
  sunHour.addEventListener("input", () => {
    updateSun();
    autoStartHour = Number(sunHour.value);
    autoStartedAt = performance.now();
  });
  sunAuto.addEventListener("change", () => {
    if (sunFrame) cancelAnimationFrame(sunFrame);
    sunFrame = null;
    if (sunAuto.checked) {
      autoStartHour = Number(sunHour.value);
      autoStartedAt = performance.now();
      sunFrame = requestAnimationFrame(tickSun);
    }
    persistSettings();
  });
  shortNight.addEventListener("change", persistSettings);

  /** Points the toolbar at a city that was just loaded, without re-firing its handlers. */
  const applyCity = (city: CitySave): void => {
    sunHour.value = String(city.hour);
    updateSun(city.hour);
  };

  /**
   * The eyedropper: picking a road in Select mode sets the Roads tab up to match it, so
   * switching to Roads and drawing continues in the same style instead of back to the default.
   */
  const applyRoadType = (baseId: string, lanes: 1 | 2, oneWay: boolean): void => {
    const radio = document.querySelector<HTMLInputElement>(`input[name="road-type"][value="${baseId}"]`);
    if (!radio) return;
    radio.checked = true;
    roadTypeValue = baseId;
    roadLanes.checked = lanes === 2;
    roadOneway.checked = oneWay;
    emitRoadType();
  };

  // The toolbar's own checkboxes, not the city -- restored once at startup so a reload comes
  // back exactly as it was left, instead of resetting to whatever the markup defaults to.
  function persistSettings(): void {
    writeSettings({
      grid: showGrid.checked,
      buildings: showBuildings.checked,
      gridSnap: gridSnap.checked,
      sunAuto: sunAuto.checked,
      shortNight: shortNight.checked,
    });
  }
  function applySetting(checkbox: HTMLInputElement, value: boolean | undefined): void {
    if (value === undefined || checkbox.checked === value) return;
    checkbox.checked = value;
    checkbox.dispatchEvent(new Event("change"));
  }
  const stored: UiSettings = readSettings();
  applySetting(showGrid, stored.grid);
  applySetting(showBuildings, stored.buildings);
  applySetting(gridSnap, stored.gridSnap);
  applySetting(shortNight, stored.shortNight);
  applySetting(sunAuto, stored.sunAuto); // last: starting the auto-cycle reads the others' state

  bindSaves(handlers, applyCity);
  updateSun();
  return { applyCity, applyRoadType };
}

/**
 * The saved-city picker. Names live in localStorage; the select is rebuilt from that list rather
 * than kept in sync, so a save made in another tab shows up on the next refresh.
 * ponytail: window.prompt for the name. A modal is a lot of markup for one string.
 */
function bindSaves(
  handlers: { onSave(): CitySave; onLoad(city: CitySave): boolean },
  applyCity: (city: CitySave) => void,
): void {
  const slot = document.getElementById("save-slot") as HTMLSelectElement;
  const store = document.getElementById("save-store") as HTMLButtonElement;
  const load = document.getElementById("save-load") as HTMLButtonElement;
  const remove = document.getElementById("save-delete") as HTMLButtonElement;

  const refresh = (selected?: string): void => {
    const names = listSaves();
    slot.replaceChildren(
      ...names.map((name) => {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        return option;
      }),
    );
    if (names.length === 0) {
      const empty = document.createElement("option");
      empty.textContent = "No saved cities";
      empty.value = "";
      slot.append(empty);
    }
    if (selected && names.includes(selected)) slot.value = selected;
    load.disabled = names.length === 0;
    remove.disabled = names.length === 0;
  };

  store.addEventListener("click", () => {
    const suggested = slot.value || "My city";
    const name = window.prompt("Save the city as:", suggested)?.trim();
    if (!name) return;
    if (listSaves().includes(name) && !window.confirm(`Overwrite "${name}"?`)) return;
    if (!writeSave(name, handlers.onSave())) {
      showRefusal("Could not save: browser storage is full or unavailable.");
      return;
    }
    writeActiveSave(name);
    refresh(name);
    showRefusal(`Saved "${name}".`);
  });

  load.addEventListener("click", () => {
    const name = slot.value;
    const city = name ? readSave(name) : null;
    if (!city) {
      showRefusal(`Could not read "${name}".`);
      return;
    }
    if (!handlers.onLoad(city)) return;
    writeActiveSave(name);
    applyCity(city);
    showRefusal(`Loaded "${name}".`);
  });

  remove.addEventListener("click", () => {
    const name = slot.value;
    if (!name || !window.confirm(`Delete "${name}"?`)) return;
    deleteSave(name);
    if (readActiveSave() === name) writeActiveSave(null);
    refresh();
    showRefusal(`Deleted "${name}".`);
  });

  // Picks up wherever a previous session left off, so the picker points at the city that is
  // actually loaded instead of whichever name happens to sort first.
  refresh(readActiveSave() ?? undefined);
}
