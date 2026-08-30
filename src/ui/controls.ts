import type { CitySave } from "../sim/save";
import { composeRoadTypeId } from "../sim/roadTypes";
import { decodeShare, encodeShare } from "../sim/share";
import type { ZoneKind } from "../sim/zones";
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
  onRoadMode(mode: "view" | "straight" | "curve" | "bulldoze" | "plant" | "spray" | "roundabout" | "zone"): void;
  onRoadType(type: string): void;
  onWorldGrid(visible: boolean): void;
  onFps(visible: boolean): void;
  onShadows(visible: boolean): void;
  onLights(visible: boolean): void;
  onTraffic(enabled: boolean): void;
  onTrafficDensity(density: number): void;
  onGridSnap(enabled: boolean): void;
  onTreeSpecies(species: string): void;
  onSprayRadius(radius: number): void;
  onZoneKind(kind: ZoneKind | "clear"): void;
  onZoneRadius(radius: number): void;
  onBuildings(visible: boolean): void;
  onSelectView(view: "all" | "no-buildings" | "traffic"): void;
  onSunHour(hour: number): void;
  onCameraMode(mode: "free" | "orbit" | "follow"): void;
  onUndo(): void;
  onRedo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
  /** Current city as data, ready to store. */
  onSave(): CitySave;
  /** Replays a stored city. Returns false if it could not be replayed. */
  onLoad(city: CitySave): boolean;
}): { applyCity(city: CitySave): void; applyRoadType(baseId: string, lanes: 1 | 2, oneWay: boolean): void; setPaused(paused: boolean): void; updateUndoRedo(): void } {
  const toolbar = document.getElementById("toolbar")!;
  const toolbarContent = document.getElementById("toolbar-content")!;
  const toolbarToggle = document.getElementById("toolbar-toggle") as HTMLButtonElement;
  const setToolbarOpen = (open: boolean): void => {
    toolbarToggle.setAttribute("aria-expanded", String(open));
    toolbarToggle.title = open ? "Collapse settings" : "Expand settings";
    toolbar.classList.toggle("collapsed", !open);
    toolbarContent.hidden = false;
  };
  toolbarToggle.addEventListener("click", () => {
    setToolbarOpen(toolbarToggle.getAttribute("aria-expanded") !== "true");
    persistSettings();
  });

  const selectViewOptions = document.getElementById("select-view-options")!;
  const roadTypeOptions = document.getElementById("road-type-options")!;
  const roadOptions = document.getElementById("road-options")!;
  const natureOptions = document.getElementById("nature-options")!;
  const zoneOptions = document.getElementById("zone-options")!;
  const toolButtons = [...document.querySelectorAll<HTMLButtonElement>("[data-tool]")];
  let roadMode: "straight" | "curve" | "roundabout" = "straight";
  let plantMode: "plant" | "spray" = "plant";
  const undo = document.getElementById("undo-city") as HTMLButtonElement;
  const redo = document.getElementById("redo-city") as HTMLButtonElement;
  const updateUndoRedo = (): void => {
    undo.dataset.available = String(handlers.canUndo());
    redo.dataset.available = String(handlers.canRedo());
  };
  undo.addEventListener("click", handlers.onUndo);
  redo.addEventListener("click", handlers.onRedo);
  window.addEventListener("keydown", (event) => {
    if ((event.target as HTMLElement | null)?.closest("input, textarea, select, [contenteditable='true']")) return;
    if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "z") return;
    event.preventDefault();
    if (event.shiftKey) handlers.onRedo();
    else handlers.onUndo();
  });
  for (const button of toolButtons) {
    button.addEventListener("click", () => {
      for (const candidate of toolButtons) candidate.setAttribute("aria-pressed", String(candidate === button));
      const tool = button.dataset.tool;
      selectViewOptions.hidden = tool !== "select";
      roadTypeOptions.hidden = tool !== "roads";
      roadOptions.hidden = tool !== "roads";
      natureOptions.hidden = tool !== "nature";
      zoneOptions.hidden = tool !== "zones";
      handlers.onRoadMode(
        tool === "roads" ? roadMode : tool === "nature" ? plantMode : tool === "zones" ? "zone" : tool === "bulldoze" ? "bulldoze" : "view",
      );
      // Zones checks "no-buildings" on the shared select-view radio to reuse its render path.
      // Select tool coming back after that must not just read the radio -- it would inherit
      // "no-buildings" and leave buildings stuck hidden -- so it resets to "all" on every entry.
      if (tool === "select") {
        const allView = document.querySelector<HTMLInputElement>('input[name="select-view"][value="all"]');
        if (allView) allView.checked = true;
        handlers.onSelectView("all");
      }
      if (tool === "zones") {
        const zonesView = document.querySelector<HTMLInputElement>('input[name="select-view"][value="no-buildings"]');
        if (zonesView) zonesView.checked = true;
        handlers.onSelectView("no-buildings");
      }
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
  const showFps = document.getElementById("show-fps") as HTMLInputElement;
  const showShadows = document.getElementById("show-shadows") as HTMLInputElement;
  const showLights = document.getElementById("show-lights") as HTMLInputElement;
  const showTraffic = document.getElementById("show-traffic") as HTMLInputElement;
  const trafficDensity = document.getElementById("traffic-density") as HTMLInputElement;

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

  showFps.addEventListener("change", () => {
    handlers.onFps(showFps.checked);
    persistSettings();
  });

  showShadows.addEventListener("change", () => {
    handlers.onShadows(showShadows.checked);
    persistSettings();
  });

  showLights.addEventListener("change", () => {
    handlers.onLights(showLights.checked);
    persistSettings();
  });

  showTraffic.addEventListener("change", () => {
    trafficDensity.disabled = !showTraffic.checked;
    handlers.onTraffic(showTraffic.checked);
    persistSettings();
  });

  let densityTimer = 0;
  trafficDensity.addEventListener("input", () => {
    persistSettings();
    window.clearTimeout(densityTimer);
    densityTimer = window.setTimeout(() => handlers.onTrafficDensity(Number(trafficDensity.value)), 250);
  });

  document.getElementById("tree-species")!.addEventListener("change", (event) => {
    handlers.onTreeSpecies((event.currentTarget as HTMLSelectElement).value);
  });
  document.getElementById("spray-radius")!.addEventListener("input", (event) => {
    handlers.onSprayRadius(Number((event.currentTarget as HTMLInputElement).value));
  });
  for (const input of document.querySelectorAll<HTMLInputElement>('input[name="zone-kind"]')) {
    input.addEventListener("change", () => {
      if (input.checked) handlers.onZoneKind(input.value === "commercial" ? "commercial" : input.value === "clear" ? "clear" : "residential");
    });
  }
  document.getElementById("zone-radius")!.addEventListener("input", (event) => {
    handlers.onZoneRadius(Number((event.currentTarget as HTMLInputElement).value));
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
  let restoringSettings = true;
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
    persistSettings();
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
  const setPaused = (paused: boolean): void => {
    if (sunFrame) cancelAnimationFrame(sunFrame);
    sunFrame = null;
    if (!paused && sunAuto.checked) {
      autoStartHour = Number(sunHour.value);
      autoStartedAt = performance.now();
      sunFrame = requestAnimationFrame(tickSun);
    }
  };
  shortNight.addEventListener("change", persistSettings);
  for (const input of document.querySelectorAll<HTMLInputElement>('input[name="camera-mode"]')) {
    input.addEventListener("change", () => {
      if (!input.checked) return;
      handlers.onCameraMode(input.value === "follow" ? "follow" : input.value === "orbit" ? "orbit" : "free");
      persistSettings();
    });
  }

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
    if (restoringSettings) return;
    writeSettings({
      grid: showGrid.checked,
      buildings: showBuildings.checked,
      gridSnap: gridSnap.checked,
      fps: showFps.checked,
      shadows: showShadows.checked,
      lights: showLights.checked,
      settingsOpen: !toolbar.classList.contains("collapsed"),
      traffic: showTraffic.checked,
      trafficDensity: Number(trafficDensity.value),
      sunHour: Number(sunHour.value),
      sunAuto: sunAuto.checked,
      shortNight: shortNight.checked,
      cameraMode: document.querySelector<HTMLInputElement>('input[name="camera-mode"]:checked')?.value as UiSettings["cameraMode"],
    });
  }
  function applySetting(checkbox: HTMLInputElement, value: boolean | undefined): void {
    if (value === undefined || checkbox.checked === value) return;
    checkbox.checked = value;
    checkbox.dispatchEvent(new Event("change"));
  }
  const stored: UiSettings = readSettings();
  if (stored.settingsOpen !== undefined) setToolbarOpen(stored.settingsOpen);
  applySetting(showGrid, stored.grid);
  applySetting(showBuildings, stored.buildings);
  applySetting(showFps, stored.fps);
  applySetting(showShadows, stored.shadows);
  applySetting(showLights, stored.lights);
  applySetting(showTraffic, stored.traffic);
  if (stored.trafficDensity !== undefined && Number.isFinite(stored.trafficDensity)) {
    trafficDensity.value = String(stored.trafficDensity);
    handlers.onTrafficDensity(stored.trafficDensity);
  }
  trafficDensity.disabled = !showTraffic.checked;
  applySetting(gridSnap, stored.gridSnap);
  applySetting(shortNight, stored.shortNight);
  if (stored.sunHour !== undefined && Number.isFinite(stored.sunHour)) sunHour.value = String(stored.sunHour);
  const cameraMode = stored.cameraMode && document.querySelector<HTMLInputElement>(`input[name="camera-mode"][value="${stored.cameraMode}"]`);
  if (cameraMode) {
    cameraMode.checked = true;
    handlers.onCameraMode(stored.cameraMode!);
  }
  applySetting(sunAuto, stored.sunAuto); // last: starting the auto-cycle reads the others' state
  restoringSettings = false;

  bindSaves(handlers, applyCity);
  updateSun();
  return { applyCity, applyRoadType, setPaused, updateUndoRedo };
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
  const share = document.getElementById("save-share") as HTMLButtonElement;
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

  share.addEventListener("click", async () => {
    const name = window.prompt("Name this shared city:", readActiveSave() ?? "Shared city")?.trim();
    if (!name) return;
    let fragment: string | null;
    try {
      fragment = await encodeShare({ name, city: handlers.onSave() });
    } catch (error) {
      showRefusal(`This city could not be shared: ${(error as Error).message}.`);
      return;
    }
    if (!fragment) return showRefusal("This city is too large to share as a link.");
    const link = `${location.origin}${location.pathname}#${fragment}`;
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(link);
        showRefusal("Share link copied.");
        return;
      } catch {
        // Fall through to the manual copy prompt.
      }
    }
    window.prompt("Share link:", link);
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
  void importSharedCity(handlers, applyCity, refresh);
}

async function importSharedCity(
  handlers: { onLoad(city: CitySave): boolean },
  applyCity: (city: CitySave) => void,
  refresh: (selected?: string) => void,
): Promise<void> {
  if (!location.hash.startsWith("#city=")) return;
  const hash = location.hash;
  const url = new URL(location.href);
  url.hash = "";
  history.replaceState(null, "", url);
  let shared;
  try {
    shared = await decodeShare(hash);
  } catch (error) {
    showRefusal(`This share link could not be used: ${(error as Error).message}.`);
    return;
  }
  if (!window.confirm(`Import "${shared.name}"?`)) return;
  let name = shared.name;
  if (listSaves().includes(name) && !window.confirm(`Replace "${name}"?`)) {
    name = window.prompt("Save shared city as:", `${name} copy`)?.trim() ?? "";
    if (!name) return;
  }
  if (!writeSave(name, shared.city)) return showRefusal("Shared city could not be saved. Browser storage may be full or disabled.");
  writeActiveSave(name);
  refresh(name);
  if (window.confirm(`Load "${name}" now?`) && handlers.onLoad(shared.city)) applyCity(shared.city);
  history.replaceState(null, "", url);
}
