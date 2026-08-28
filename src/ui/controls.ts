export function bindControls(handlers: {
  onRoadMode(mode: "view" | "straight" | "curve"): void;
  onRoadType(type: "street" | "avenue"): void;
  onWorldGrid(visible: boolean): void;
  onGridSnap(enabled: boolean): void;
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

  document.getElementById("road-type")!.addEventListener("change", (event) => {
    handlers.onRoadType((event.currentTarget as HTMLSelectElement).value === "avenue" ? "avenue" : "street");
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
  const updateSun = (): void => {
    const hour = Number(sunHour.value);
    handlers.onSunHour(hour);
    const whole = Math.floor(hour) % 24;
    const minutes = Math.round((hour - Math.floor(hour)) * 60);
    sunTime.value = `${String(whole).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  };
  sunHour.addEventListener("input", updateSun);
  updateSun();
}
