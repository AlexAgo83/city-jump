export function bindControls(handlers: {
  onRoadMode(mode: "view" | "straight" | "curve" | "bulldoze"): void;
  onRoadType(type: "street" | "avenue" | "tunnel"): void;
  onWorldGrid(visible: boolean): void;
  onGridSnap(enabled: boolean): void;
  onBuildings(visible: boolean): void;
  onTerrain(preset: "rolling" | "rugged"): boolean;
  onSunHour(hour: number): void;
}): void {
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

  const roadOptions = document.getElementById("road-options")!;
  const toolButtons = [...document.querySelectorAll<HTMLButtonElement>("[data-tool]")];
  let roadMode: "straight" | "curve" = "straight";

  for (const button of toolButtons) {
    button.addEventListener("click", () => {
      for (const candidate of toolButtons) candidate.setAttribute("aria-pressed", String(candidate === button));
      const tool = button.dataset.tool;
      roadOptions.hidden = tool !== "roads";
      handlers.onRoadMode(tool === "roads" ? roadMode : tool === "bulldoze" ? "bulldoze" : "view");
    });
  }

  for (const input of document.querySelectorAll<HTMLInputElement>('input[name="road-shape"]')) {
    input.addEventListener("change", () => {
      if (!input.checked) return;
      roadMode = input.value === "curve" ? "curve" : "straight";
      handlers.onRoadMode(roadMode);
    });
  }

  document.getElementById("show-grid")!.addEventListener("change", (event) => {
    handlers.onWorldGrid((event.currentTarget as HTMLInputElement).checked);
  });

  document.getElementById("grid-snap")!.addEventListener("change", (event) => {
    handlers.onGridSnap((event.currentTarget as HTMLInputElement).checked);
  });

  document.getElementById("show-buildings")!.addEventListener("change", (event) => {
    handlers.onBuildings((event.currentTarget as HTMLInputElement).checked);
  });

  document.getElementById("road-type")!.addEventListener("change", (event) => {
    const value = (event.currentTarget as HTMLSelectElement).value;
    handlers.onRoadType(value === "avenue" ? "avenue" : value === "tunnel" ? "tunnel" : "street");
  });

  const terrain = document.getElementById("terrain") as HTMLSelectElement;
  let terrainPreset = terrain.value;
  terrain.addEventListener("change", () => {
    const next = terrain.value === "rugged" ? "rugged" : "rolling";
    if (handlers.onTerrain(next)) terrainPreset = next;
    else terrain.value = terrainPreset;
  });

  const sunHour = document.getElementById("sun-hour") as HTMLInputElement;
  const sunTime = document.getElementById("sun-time") as HTMLOutputElement;
  const sunAuto = document.getElementById("sun-auto") as HTMLInputElement;
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
    if (next >= 22) {
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
    if (!sunAuto.checked) return;
    autoStartHour = Number(sunHour.value);
    autoStartedAt = performance.now();
    sunFrame = requestAnimationFrame(tickSun);
  });
  updateSun();
}
