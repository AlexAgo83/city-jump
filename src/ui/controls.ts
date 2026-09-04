import { parseCity, type CitySave } from "../sim/save";
import { composeRoadTypeId } from "../sim/roadTypes";
import { decodeShare, encodeShare, type SharedCity } from "../sim/share";
import { UTILITY_CATALOG, type UtilityKind, type UtilityRole } from "../sim/utilities";
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

// ponytail: module-size is one static settings panel wired to DOM ids in index.html; split when a
// sub-panel has an independent state model instead of forwarding handlers.
export function bindControls(handlers: {
  onRoadMode(mode: "view" | "straight" | "curve" | "bulldoze" | "plant" | "spray" | "roundabout" | "zone" | "utility"): void;
  onRoadType(type: string): void;
  roadPrice(type: string): number;
  onUtility(kind: UtilityKind, role: UtilityRole): void;
  onWorldGrid(visible: boolean): void;
  onFps(visible: boolean): void;
  onShadows(visible: boolean): void;
  onLights(visible: boolean): void;
  onLook(look: { antialias: boolean; bloom: boolean; ao: boolean; tiltShift: boolean }): void;
  onDestructionEffects(effects: { fire: boolean; explosion: boolean }): void;
  onFrameCap(fps: number): void;
  onTraffic(enabled: boolean): void;
  onTrafficDensity(density: number): void;
  onGridSnap(enabled: boolean): void;
  onTreeSpecies(species: string): void;
  onSprayRadius(radius: number): void;
  onZoneTool(tool: "brush" | "fill"): void;
  onZoneKind(kind: ZoneKind | "clear"): void;
  onZoneRadius(radius: number): void;
  onBuildings(visible: boolean): void;
  /** Street furniture and roof clutter: everything a building wears once it is finished. */
  onDecor(visible: boolean): void;
  /** Draw the city as coloured boxes rather than models, whatever the camera is doing. */
  onBoxes(boxes: boolean): void;
  onSelectView(view: "all" | "no-buildings" | "traffic" | "utilities" | "state"): void;
  onSunHour(hour: number): void;
  onTimeRate(rate: 0 | 1 | 2 | 4): void;
  onCameraMode(mode: "free" | "orbit" | "follow"): void;
  onUndo(): void;
  onRedo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
  /** Current city as data, ready to store. */
  onSave(): CitySave;
  /** Replays a stored city. Returns false if it could not be replayed. */
  onLoad(city: CitySave): boolean;
  onNew(): void;
}): { applyCity(city: CitySave): void; applyRoadType(baseId: string, lanes: 1 | 2, oneWay: boolean): void; setClock(hour: number, day: number, rate: 0 | 1 | 2 | 4): void; setPaused(paused: boolean): void; setToolEnabled(tool: string, enabled: boolean): void; updateUndoRedo(): void; dispose(): void } {
  const disposers: (() => void)[] = [];
  const on = (target: EventTarget, type: string, listener: EventListenerOrEventListenerObject): void => {
    target.addEventListener(type, listener);
    disposers.push(() => target.removeEventListener(type, listener));
  };
  const toolbar = document.getElementById("toolbar")!;
  const toolbarContent = document.getElementById("toolbar-content")!;
  const toolbarToggle = document.getElementById("toolbar-toggle") as HTMLButtonElement;
  const setToolbarOpen = (open: boolean): void => {
    toolbarToggle.setAttribute("aria-expanded", String(open));
    toolbarToggle.title = open ? "Collapse settings" : "Expand settings";
    toolbar.classList.toggle("collapsed", !open);
    toolbarContent.hidden = false;
  };
  on(toolbarToggle, "click", () => {
    setToolbarOpen(toolbarToggle.getAttribute("aria-expanded") !== "true");
    persistSettings();
  });

  const selectViewOptions = document.getElementById("select-view-options")!;
  const roadTypeOptions = document.getElementById("road-type-options")!;
  const roadOptions = document.getElementById("road-options")!;
  const natureOptions = document.getElementById("nature-options")!;
  const zoneToolOptions = document.getElementById("zone-tool-options")!;
  const zoneOptions = document.getElementById("zone-options")!;
  const utilityOptions = document.getElementById("utility-options")!;
  const toolButtons = [...document.querySelectorAll<HTMLButtonElement>("[data-tool]")];
  let roadMode: "straight" | "curve" | "roundabout" = "straight";
  let plantMode: "plant" | "spray" = "plant";
  let utilityKind: UtilityKind = "power";
  let utilityRole: UtilityRole = "producer";
  const undo = document.getElementById("undo-city") as HTMLButtonElement;
  const redo = document.getElementById("redo-city") as HTMLButtonElement;
  const updateUndoRedo = (): void => {
    undo.dataset.available = String(handlers.canUndo());
    redo.dataset.available = String(handlers.canRedo());
  };
  on(undo, "click", handlers.onUndo as EventListener);
  on(redo, "click", handlers.onRedo as EventListener);
  on(window, "keydown", (event) => {
    const key = event as KeyboardEvent;
    if ((key.target as HTMLElement | null)?.closest("input, textarea, select, [contenteditable='true']")) return;
    if (!(key.metaKey || key.ctrlKey) || key.key.toLowerCase() !== "z") return;
    key.preventDefault();
    if (key.shiftKey) handlers.onRedo();
    else handlers.onUndo();
  });
  /** A tool the run's rules have switched off is not a tool the player should be able to pick. */
  const setToolEnabled = (tool: string, enabled: boolean): void => {
    const button = toolButtons.find((candidate) => candidate.dataset.tool === tool);
    if (!button) return;
    button.disabled = !enabled;
    button.title = enabled ? "" : `Turned off in Settings > Gameplay ("Ignore ${tool}").`;
    if (!enabled && button.getAttribute("aria-pressed") === "true") toolButtons.find((candidate) => candidate.dataset.tool === "select")?.click();
  };
  for (const button of toolButtons) {
    on(button, "click", () => {
      if (button.disabled) return;
      for (const candidate of toolButtons) candidate.setAttribute("aria-pressed", String(candidate === button));
      const tool = button.dataset.tool;
      selectViewOptions.hidden = tool !== "select";
      roadTypeOptions.hidden = tool !== "roads";
      roadOptions.hidden = tool !== "roads";
      natureOptions.hidden = tool !== "nature";
      zoneToolOptions.hidden = tool !== "zones";
      zoneOptions.hidden = tool !== "zones";
      utilityOptions.hidden = tool !== "power" && tool !== "water";
      if (tool === "power" || tool === "water") {
        utilityKind = tool;
        emitUtility();
      }
      handlers.onRoadMode(
        tool === "roads" ? roadMode : tool === "nature" ? plantMode : tool === "zones" ? "zone" : tool === "power" || tool === "water" ? "utility" : tool === "bulldoze" ? "bulldoze" : "view",
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
    on(input, "change", () => {
      if (!input.checked) return;
      handlers.onSelectView(input.value === "no-buildings" ? "no-buildings" : input.value === "traffic" ? "traffic" : input.value === "utilities" ? "utilities" : input.value === "state" ? "state" : "all");
    });
  }

  for (const input of document.querySelectorAll<HTMLInputElement>('input[name="plant-mode"]')) {
    on(input, "change", () => {
      if (!input.checked) return;
      plantMode = input.value === "spray" ? "spray" : "plant";
      handlers.onRoadMode(plantMode);
    });
  }

  for (const input of document.querySelectorAll<HTMLInputElement>('input[name="road-shape"]')) {
    on(input, "change", () => {
      if (!input.checked) return;
      roadMode = input.value === "curve" ? "curve" : input.value === "roundabout" ? "roundabout" : "straight";
      handlers.onRoadMode(roadMode);
    });
  }

  const showGrid = document.getElementById("show-grid") as HTMLInputElement;
  const gridSnap = document.getElementById("grid-snap") as HTMLInputElement;
  const showBuildings = document.getElementById("show-buildings") as HTMLInputElement;
  const showDecor = document.getElementById("show-decor") as HTMLInputElement;
  const showBoxes = document.getElementById("show-boxes") as HTMLInputElement;
  const showFps = document.getElementById("show-fps") as HTMLInputElement;
  const showShadows = document.getElementById("show-shadows") as HTMLInputElement;
  const showLights = document.getElementById("show-lights") as HTMLInputElement;
  const showTraffic = document.getElementById("show-traffic") as HTMLInputElement;
  const trafficDensity = document.getElementById("traffic-density") as HTMLInputElement;

  on(showGrid, "change", () => {
    handlers.onWorldGrid(showGrid.checked);
    persistSettings();
  });

  on(gridSnap, "change", () => {
    handlers.onGridSnap(gridSnap.checked);
    persistSettings();
  });

  on(showBuildings, "change", () => {
    handlers.onBuildings(showBuildings.checked);
    persistSettings();
  });

  on(showDecor, "change", () => {
    handlers.onDecor(showDecor.checked);
    persistSettings();
  });

  on(showBoxes, "change", () => {
    handlers.onBoxes(showBoxes.checked);
    persistSettings();
  });

  on(showFps, "change", () => {
    handlers.onFps(showFps.checked);
    persistSettings();
  });

  on(showShadows, "change", () => {
    handlers.onShadows(showShadows.checked);
    persistSettings();
  });

  on(showLights, "change", () => {
    handlers.onLights(showLights.checked);
    persistSettings();
  });

  on(showTraffic, "change", () => {
    trafficDensity.disabled = !showTraffic.checked;
    handlers.onTraffic(showTraffic.checked);
    persistSettings();
  });

  let densityTimer = 0;
  on(trafficDensity, "input", () => {
    persistSettings();
    window.clearTimeout(densityTimer);
    densityTimer = window.setTimeout(() => handlers.onTrafficDensity(Number(trafficDensity.value)), 250);
  });

  on(document.getElementById("tree-species")!, "change", (event) => {
    handlers.onTreeSpecies((event.currentTarget as HTMLSelectElement).value);
  });
  on(document.getElementById("spray-radius")!, "input", (event) => {
    handlers.onSprayRadius(Number((event.currentTarget as HTMLInputElement).value));
  });
  for (const input of document.querySelectorAll<HTMLInputElement>('input[name="zone-tool"]')) {
    on(input, "change", () => {
      if (!input.checked) return;
      handlers.onZoneTool(input.value === "fill" ? "fill" : "brush");
    });
  }
  const zonePrice = document.getElementById("zone-price") as HTMLOutputElement;
  const updateZonePrice = (kind: ZoneKind | "clear"): void => {
    zonePrice.value = kind === "clear" ? "Clear" : "Zone";
  };
  for (const input of document.querySelectorAll<HTMLInputElement>('input[name="zone-kind"]')) {
    on(input, "change", () => {
      if (!input.checked) return;
      const kind = input.value === "clear" ? "clear" : input.value as ZoneKind;
      handlers.onZoneKind(kind);
      updateZonePrice(kind);
    });
  }
  const zoneRadius = document.getElementById("zone-radius") as HTMLInputElement;
  zoneRadius.defaultValue = zoneRadius.min;
  zoneRadius.value = zoneRadius.min;
  on(zoneRadius, "input", (event) => {
    handlers.onZoneRadius(Number((event.currentTarget as HTMLInputElement).value));
  });

  const utilityPrice = document.getElementById("utility-price") as HTMLOutputElement;
  function emitUtility(): void {
    const spec = UTILITY_CATALOG[utilityKind][utilityRole];
    utilityPrice.value = `$${spec.cost.toLocaleString()} | ${spec.staff} staff`;
    handlers.onUtility(utilityKind, utilityRole);
  }
  for (const input of document.querySelectorAll<HTMLInputElement>('input[name="utility-role"]')) {
    on(input, "change", () => {
      if (!input.checked) return;
      utilityRole = input.value === "diffuser" ? "diffuser" : "producer";
      emitUtility();
    });
  }

  const roadLanes = document.getElementById("road-lanes") as HTMLInputElement;
  const roadOneway = document.getElementById("road-oneway") as HTMLInputElement;
  const roadPrice = document.getElementById("road-price") as HTMLOutputElement;
  let roadTypeValue = "street";

  /** Pedestrian paths stay exactly what they are -- one lane, two-way, no player choice. */
  function emitRoadType(): void {
    const isPedestrian = roadTypeValue === "pedestrian";
    roadLanes.disabled = isPedestrian;
    roadOneway.disabled = isPedestrian;
    const type = composeRoadTypeId(roadTypeValue, roadLanes.checked ? 2 : 1, roadOneway.checked);
    handlers.onRoadType(type);
    roadPrice.value = `$${handlers.roadPrice(type)}/m`;
  }

  for (const input of document.querySelectorAll<HTMLInputElement>('input[name="road-type"]')) {
    on(input, "change", () => {
      if (!input.checked) return;
      roadTypeValue = input.value;
      emitRoadType();
    });
  }
  on(roadLanes, "change", emitRoadType);
  on(roadOneway, "change", emitRoadType);

  const sunHour = document.getElementById("sun-hour") as HTMLInputElement;
  const sunTime = document.getElementById("sun-time") as HTMLOutputElement;
  const simTime = document.getElementById("sim-time") as HTMLOutputElement;
  const timeButtons = [...document.querySelectorAll<HTMLButtonElement>("[data-time-rate]")];
  const sunAuto = document.getElementById("sun-auto") as HTMLInputElement;
  const shortNight = document.getElementById("short-night") as HTMLInputElement;
  const AUTO_HOURS_PER_SECOND = 0.25;
  let sunFrame: number | null = null;
  let autoStartHour = 0;
  let autoStartedAt = 0;
  let restoringSettings = true;
  let clockKey = "";
  const updateSun = (next = Number(sunHour.value)): void => {
    const hour = ((next % 24) + 24) % 24;
    sunHour.value = String(hour);
    handlers.onSunHour(hour);
    const totalMinutes = Math.round(hour * 60) % (24 * 60);
    const whole = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    sunTime.value = `${String(whole).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  };
  const setClock = (hour: number, day: number, rate: 0 | 1 | 2 | 4): void => {
    const totalMinutes = Math.round(hour * 60) % (24 * 60);
    const nextKey = `${day}:${totalMinutes}:${rate}`;
    if (nextKey === clockKey) return;
    clockKey = nextKey;
    const text = `${String(Math.floor(totalMinutes / 60)).padStart(2, "0")}:${String(totalMinutes % 60).padStart(2, "0")}`;
    sunHour.value = String(hour);
    sunTime.value = text;
    simTime.value = `Day ${day} ${text}`;
    sunHour.disabled = rate !== 0;
    sunAuto.disabled = rate !== 0;
    shortNight.disabled = rate !== 0;
    for (const button of timeButtons) button.setAttribute("aria-pressed", String(Number(button.dataset.timeRate) === rate));
  };
  for (const button of timeButtons) {
    on(button, "click", () => {
      const rate = Number(button.dataset.timeRate) as 0 | 1 | 2 | 4;
      handlers.onTimeRate(rate);
      if (rate === 1 || rate === 2 || rate === 4) {
        const settings = readSettings();
        writeSettings({ ...settings, timeRate: rate });
      }
    });
  }
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
  on(sunHour, "input", () => {
    updateSun();
    autoStartHour = Number(sunHour.value);
    autoStartedAt = performance.now();
    persistSettings();
  });
  on(sunAuto, "change", () => {
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
  on(shortNight, "change", persistSettings);
  for (const input of document.querySelectorAll<HTMLInputElement>('input[name="camera-mode"]')) {
    on(input, "change", () => {
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
      decor: showDecor.checked,
      boxes: showBoxes.checked,
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
      fxAntialias: fxAntialias.checked,
      fxBloom: fxBloom.checked,
      fxAo: fxAo.checked,
      fxTilt: fxTilt.checked,
      fxExplosion: fxExplosion.checked,
      fxFire: fxFire.checked,
      frameCap: Number(frameCap.value),
      timeRate: readSettings().timeRate,
    });
  }
  function applySetting(checkbox: HTMLInputElement, value: boolean | undefined): void {
    if (value === undefined || checkbox.checked === value) return;
    checkbox.checked = value;
    checkbox.dispatchEvent(new Event("change"));
  }
  const fxAntialias = document.getElementById("fx-antialias") as HTMLInputElement;
  const fxBloom = document.getElementById("fx-bloom") as HTMLInputElement;
  const fxAo = document.getElementById("fx-ao") as HTMLInputElement;
  const fxTilt = document.getElementById("fx-tilt") as HTMLInputElement;
  const fxExplosion = document.getElementById("fx-explosion") as HTMLInputElement;
  const fxFire = document.getElementById("fx-fire") as HTMLInputElement;
  const emitLook = (): void => {
    handlers.onLook({ antialias: fxAntialias.checked, bloom: fxBloom.checked, ao: fxAo.checked, tiltShift: fxTilt.checked });
    persistSettings();
  };
  for (const box of [fxAntialias, fxBloom, fxAo, fxTilt]) on(box, "change", emitLook);
  const emitDestructionEffects = (): void => {
    handlers.onDestructionEffects({ fire: fxFire.checked, explosion: fxExplosion.checked });
    persistSettings();
  };
  for (const box of [fxExplosion, fxFire]) on(box, "change", emitDestructionEffects);

  const frameCap = document.getElementById("frame-cap") as HTMLSelectElement;
  on(frameCap, "change", () => {
    handlers.onFrameCap(Number(frameCap.value));
    persistSettings();
  });

  /**
   * Every setting back to what the markup says it should be. The defaults live in `index.html`
   * as `checked`, `value` and `selected` attributes, and the browser keeps them for us as
   * `defaultChecked` / `defaultValue` / `defaultSelected` -- so there is no second list of
   * defaults here to fall out of step with the first. Dispatching the event each control already
   * listens to means this reuses every handler rather than repeating what they do.
   */
  on(document.getElementById("settings-reset")!, "click", () => {
    for (const control of document.querySelectorAll<HTMLInputElement | HTMLSelectElement>("#toolbar-content input, #toolbar-content select")) {
      if (control.id.startsWith("save-")) continue; // the saved-city picker is not a setting
      if (control instanceof HTMLSelectElement) {
        const fallback = [...control.options].find((option) => option.defaultSelected) ?? control.options[0];
        if (!fallback || control.value === fallback.value) continue;
        control.value = fallback.value;
      } else if (control.type === "checkbox" || control.type === "radio") {
        if (control.checked === control.defaultChecked) continue;
        control.checked = control.defaultChecked;
      } else {
        if (control.value === control.defaultValue) continue;
        control.value = control.defaultValue;
      }
      control.dispatchEvent(new Event(control instanceof HTMLInputElement && control.type === "range" ? "input" : "change", { bubbles: true }));
    }
    setToolbarOpen(true);
    showRefusal("Settings reset.");
  });

  const stored: UiSettings = readSettings();
  // Always closed on load. A run opens on the city, not on the settings menu.
  setToolbarOpen(false);
  applySetting(showGrid, stored.grid);
  applySetting(showBuildings, stored.buildings);
  applySetting(showDecor, stored.decor);
  applySetting(showBoxes, stored.boxes);
  applySetting(showFps, stored.fps);
  applySetting(showShadows, stored.shadows);
  applySetting(showLights, stored.lights);
  for (const [box, value] of [[fxAntialias, stored.fxAntialias], [fxBloom, stored.fxBloom], [fxAo, stored.fxAo], [fxTilt, stored.fxTilt], [fxExplosion, stored.fxExplosion], [fxFire, stored.fxFire]] as const) {
    if (value !== undefined) box.checked = value;
  }
  if (stored.frameCap !== undefined) frameCap.value = String(stored.frameCap);
  handlers.onFrameCap(Number(frameCap.value));
  emitLook();
  emitDestructionEffects();
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

  const saves = bindSaves(handlers, applyCity, on);
  emitRoadType();
  handlers.onZoneRadius(Number(zoneRadius.value));
  updateSun();
  setClock(Number(sunHour.value), 1, 0);
  return {
    setToolEnabled,
    applyCity,
    applyRoadType,
    setClock,
    setPaused,
    updateUndoRedo,
    dispose() {
      if (sunFrame) cancelAnimationFrame(sunFrame);
      window.clearTimeout(densityTimer);
      saves.dispose();
      for (const dispose of disposers.splice(0)) dispose();
    },
  };
}

/**
 * The saved-city picker. Names live in localStorage; the select is rebuilt from that list rather
 * than kept in sync, so a save made in another tab shows up on the next refresh.
 * ponytail: window.prompt for the name. A modal is a lot of markup for one string.
 */
function bindSaves(
  handlers: { onSave(): CitySave; onLoad(city: CitySave): boolean; onNew(): void },
  applyCity: (city: CitySave) => void,
  on: (target: EventTarget, type: string, listener: EventListenerOrEventListenerObject) => void,
): { dispose(): void } {
  const slot = document.getElementById("save-slot") as HTMLSelectElement;
  const create = document.getElementById("save-new") as HTMLButtonElement;
  const store = document.getElementById("save-store") as HTMLButtonElement;
  const load = document.getElementById("save-load") as HTMLButtonElement;
  const share = document.getElementById("save-share") as HTMLButtonElement;
  const exportCity = document.getElementById("save-export") as HTMLButtonElement;
  const importCity = document.getElementById("save-import") as HTMLButtonElement;
  const importFile = document.getElementById("save-import-file") as HTMLInputElement;
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

  const startNewCity = (): void => {
    // Nothing here is recoverable through undo -- a new city is not a city change, it is another
    // city -- so this is the one place that asks before throwing work away.
    if (!window.confirm("Start a new city? Anything not saved is lost.")) return;
    handlers.onNew();
    writeActiveSave(null);
    refresh();
    showRefusal("New city.");
  };
  on(create, "click", startNewCity);

  on(store, "click", () => {
    // The city being edited, not whichever name the picker happens to be showing -- suggesting
    // that one is how a new city gets saved over the demo.
    const suggested = readActiveSave() ?? slot.value ?? "My city";
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

  on(load, "click", () => {
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

  on(share, "click", async () => {
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

  // A link carries a whole city in its fragment, which browsers and chat apps cut off well before
  // a big city fits. A file has no such ceiling, and is what you hand someone to compare cities.
  on(exportCity, "click", () => {
    const name = window.prompt("Export the city as:", readActiveSave() ?? "My city")?.trim();
    if (!name) return;
    const blob = new Blob([JSON.stringify(handlers.onSave())], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${name.replace(/[^\w.-]+/g, "-")}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    showRefusal(`Exported "${name}".`);
  });

  on(importCity, "click", () => {
    importFile.value = ""; // so picking the same file twice still fires a change
    importFile.click();
  });

  on(importFile, "change", async () => {
    const file = importFile.files?.[0];
    if (!file) return;
    const city = parseCity(await file.text());
    if (!city) return showRefusal("That file is not a city this build can read.");
    const name = window.prompt("Save the imported city as:", file.name.replace(/\.json$/i, ""))?.trim();
    if (!name) return;
    if (listSaves().includes(name) && !window.confirm(`Overwrite "${name}"?`)) return;
    if (!writeSave(name, city)) return showRefusal("Could not save the imported city: browser storage is full or unavailable.");
    writeActiveSave(name);
    refresh(name);
    if (handlers.onLoad(city)) applyCity(city);
    showRefusal(`Imported "${name}".`);
  });

  on(remove, "click", () => {
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
  return {
    dispose(): void {
      slot.replaceChildren();
    },
  };
}

export async function importSharedCity(
  handlers: { onLoad(city: CitySave): boolean },
  applyCity: (city: CitySave) => void,
  refresh: (selected?: string) => void,
): Promise<void> {
  if (!location.hash.startsWith("#city=")) return;
  const hash = location.hash;
  const url = new URL(location.href);
  url.hash = "";
  const clearHash = () => history.replaceState(null, "", url);
  let shared: SharedCity;
  try {
    shared = await decodeShare(hash);
  } catch (error) {
    showRefusal(`This share link could not be used: ${(error as Error).message}.`);
    clearHash();
    return;
  }
  if (!window.confirm(`Import "${shared.name}"?`)) {
    clearHash();
    return;
  }
  let name = shared.name;
  if (listSaves().includes(name) && !window.confirm(`Replace "${name}"?`)) {
    name = window.prompt("Save shared city as:", `${name} copy`)?.trim() ?? "";
    if (!name) {
      clearHash();
      return;
    }
  }
  if (!writeSave(name, shared.city)) {
    showRefusal("Shared city could not be saved. Browser storage may be full or disabled.");
    clearHash();
    return;
  }
  writeActiveSave(name);
  refresh(name);
  if (window.confirm(`Load "${name}" now?`) && handlers.onLoad(shared.city)) applyCity(shared.city);
  clearHash();
}
