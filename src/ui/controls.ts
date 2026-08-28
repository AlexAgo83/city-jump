export function bindControls(handlers: {
  onRoadMode(mode: "view" | "straight" | "curve"): void;
  onRoadType(type: "street" | "avenue" | "tunnel"): void;
  onWorldGrid(visible: boolean): void;
  onGridSnap(enabled: boolean): void;
  onBuildings(visible: boolean): void;
  onTerrain(preset: "rolling" | "rugged"): boolean;
  onSunHour(hour: number): void;
}): void {
  for (const input of document.querySelectorAll<HTMLInputElement>('input[name="road-mode"]')) {
    input.addEventListener("change", () => {
      if (input.checked) handlers.onRoadMode(input.value === "view" ? "view" : input.value === "straight" ? "straight" : "curve");
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
      autoStartHour = 4;
      autoStartedAt = now;
      updateSun(4);
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
