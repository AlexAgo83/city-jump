import { buyUpgrade, FIRST_UPGRADE_WEB, type ProfileState, type RunState } from "../sim/run";

export interface RunPanel {
  renderGameplayRules(): void;
  renderUpgradeWeb(): void;
}

export function bindRunPanel(options: {
  getRun(): RunState;
  setRun(run: RunState): void;
  getProfile(): ProfileState;
  setProfile(profile: ProfileState): void;
  updateRunHud(): void;
  onRulesChanged(): void;
  onNewRun(): void;
  onEvacuate(): void;
  onCallWave(): void;
  setToolEnabled(tool: string, enabled: boolean): void;
  showRefusal(reason: string): void;
}): RunPanel {
  const evacuateButton = document.getElementById("evacuate-run") as HTMLButtonElement;
  const callWaveButton = document.getElementById("call-wave") as HTMLButtonElement;
  const hardcoreBox = document.getElementById("hardcore-run") as HTMLInputElement;
  const kaijuBox = document.getElementById("kaiju-spawns") as HTMLInputElement;
  const instantBox = document.getElementById("instant-construction") as HTMLInputElement;
  const freeBuildBox = document.getElementById("free-building") as HTMLInputElement;
  const ignorePowerBox = document.getElementById("ignore-power") as HTMLInputElement;
  const ignoreWaterBox = document.getElementById("ignore-water") as HTMLInputElement;
  const gameplayNote = document.getElementById("gameplay-note") as HTMLSpanElement;
  const betweenRuns = document.getElementById("between-runs") as HTMLDivElement;
  const upgradeWeb = document.getElementById("upgrade-web") as HTMLSpanElement;
  const runOutcome = document.getElementById("run-outcome") as HTMLSpanElement;
  const newRunButton = document.getElementById("new-run") as HTMLButtonElement;

  const panel: RunPanel = {
    renderGameplayRules() {
      const run = options.getRun();
      kaijuBox.checked = run.rules.kaijuSpawns;
      instantBox.checked = run.rules.instantConstruction;
      freeBuildBox.checked = run.rules.freeBuilding;
      ignorePowerBox.checked = run.rules.ignorePower;
      ignoreWaterBox.checked = run.rules.ignoreWater;
      // Only say something when a switch has taken something away.
      gameplayNote.textContent = run.rules.kaijuSpawns ? "" : "Pacifist: no waves, so no science and no prestige.";
      options.setToolEnabled("power", !run.rules.ignorePower);
      options.setToolEnabled("water", !run.rules.ignoreWater);
    },
    renderUpgradeWeb() {
      const run = options.getRun();
      const profile = options.getProfile();
      upgradeWeb.replaceChildren(...FIRST_UPGRADE_WEB.map((upgrade) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = `${upgrade.name} ${upgrade.cost}`;
        button.title = upgrade.description;
        button.dataset.owned = String(profile.upgrades.includes(upgrade.id));
        button.addEventListener("click", () => {
          const current = options.getProfile();
          const next = buyUpgrade(current, upgrade.id);
          if (next === current) return options.showRefusal("Not enough prestige.");
          options.setProfile(next);
          options.updateRunHud();
          panel.renderUpgradeWeb();
        });
        return button;
      }));
      betweenRuns.hidden = !run.ended;
      runOutcome.textContent = run.ended === "evacuated" ? `Evacuated with ${Math.floor(run.science)} science.`
        : run.ended === "population_zero" ? "The island emptied."
        : run.ended === "defeated" ? "The city fell." : "";
    },
  };

  const setRunRules = (): void => {
    const run = options.getRun();
    options.setRun({ ...run, rules: { kaijuSpawns: kaijuBox.checked, instantConstruction: instantBox.checked, freeBuilding: freeBuildBox.checked, ignorePower: ignorePowerBox.checked, ignoreWater: ignoreWaterBox.checked } });
    panel.renderGameplayRules();
    options.onRulesChanged();
  };

  hardcoreBox.checked = options.getProfile().hardcore;
  hardcoreBox.addEventListener("change", () => {
    options.setProfile({ ...options.getProfile(), hardcore: hardcoreBox.checked });
  });
  for (const box of [kaijuBox, instantBox, freeBuildBox, ignorePowerBox, ignoreWaterBox]) box.addEventListener("change", setRunRules);
  newRunButton.addEventListener("click", () => {
    if (!window.confirm("Leave for a new island?")) return;
    options.onNewRun();
  });
  evacuateButton.addEventListener("click", () => {
    if (!window.confirm("Evacuate this run?")) return;
    options.onEvacuate();
  });
  callWaveButton.addEventListener("click", options.onCallWave);
  panel.renderGameplayRules();
  panel.renderUpgradeWeb();
  return panel;
}
