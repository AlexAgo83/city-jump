import { buyUpgrade, isTalentOpen, TALENT_WEB, type PrestigeUpgrade, type ProfileState } from "../sim/run";

const SVG = "http://www.w3.org/2000/svg";
const CENTRE = 120;
/** One ring is one step out from the centre, which is also one step out from an owned node. */
const RING_RADIUS = 52;

/**
 * A radial layout computed from the data rather than stored with it: nodes of a ring are spread
 * evenly, and a branch keeps the same angle at every ring, so the web reads as spokes. Adding a
 * node to `TALENT_WEB` is enough -- there is no second place holding its position.
 */
function positionOf(upgrade: PrestigeUpgrade, web: readonly PrestigeUpgrade[]): { x: number; y: number } {
  if (upgrade.ring === 0) return { x: CENTRE, y: CENTRE };
  const branches = [...new Set(web.filter((node) => node.ring > 0).map((node) => node.branch))];
  const angle = (branches.indexOf(upgrade.branch) / branches.length) * Math.PI * 2 - Math.PI / 2;
  return { x: CENTRE + Math.cos(angle) * upgrade.ring * RING_RADIUS, y: CENTRE + Math.sin(angle) * upgrade.ring * RING_RADIUS };
}

export interface TalentWeb {
  render(): void;
  dispose(): void;
}

export function bindTalentWeb(options: {
  getProfile(): ProfileState;
  setProfile(profile: ProfileState): void;
  onBought(): void;
  showRefusal(reason: string): void;
  web?: readonly PrestigeUpgrade[];
}): TalentWeb {
  const web = options.web ?? TALENT_WEB;
  const svg = document.getElementById("talent-web") as unknown as SVGSVGElement;
  const points = document.getElementById("talent-points") as HTMLElement;
  const detail = document.getElementById("talent-detail") as HTMLElement;
  let selected: string | null = null;

  const stateOf = (upgrade: PrestigeUpgrade, profile: ProfileState): "owned" | "open" | "locked" =>
    profile.upgrades.includes(upgrade.id) ? "owned" : isTalentOpen(profile, upgrade) ? "open" : "locked";

  const buy = (upgrade: PrestigeUpgrade): void => {
    const profile = options.getProfile();
    const next = buyUpgrade(profile, upgrade.id, web);
    if (next === profile) return options.showRefusal(profile.prestige < upgrade.cost ? "Not enough science." : "Unlock a neighbouring talent first.");
    options.setProfile(next);
    options.onBought();
    panel.render();
  };

  const renderDetail = (profile: ProfileState): void => {
    const upgrade = web.find((node) => node.id === selected);
    if (!upgrade) {
      detail.textContent = "Pick a node.";
      return;
    }
    const state = stateOf(upgrade, profile);
    detail.replaceChildren();
    const name = document.createElement("b");
    name.textContent = upgrade.name;
    detail.append(name, document.createElement("br"), `${upgrade.description} `);
    if (state === "owned") {
      detail.append("Owned.");
      return;
    }
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = `Unlock for ${upgrade.cost}`;
    button.disabled = state === "locked" || profile.prestige < upgrade.cost;
    button.title = state === "locked" ? "Unlock a neighbouring talent first." : "";
    button.addEventListener("click", () => buy(upgrade));
    detail.append(document.createElement("br"), button);
  };

  const panel: TalentWeb = {
    render() {
      const profile = options.getProfile();
      points.textContent = String(Math.floor(profile.prestige));
      const at = new Map(web.map((upgrade) => [upgrade.id, positionOf(upgrade, web)]));
      svg.replaceChildren();
      for (const upgrade of web)
        for (const id of upgrade.requires) {
          const from = at.get(id);
          const to = at.get(upgrade.id);
          if (!from || !to) continue;
          const edge = document.createElementNS(SVG, "line");
          edge.setAttribute("class", "talent-edge");
          edge.dataset.state = profile.upgrades.includes(upgrade.id) ? "owned" : "pending";
          edge.setAttribute("x1", String(from.x));
          edge.setAttribute("y1", String(from.y));
          edge.setAttribute("x2", String(to.x));
          edge.setAttribute("y2", String(to.y));
          svg.append(edge);
        }
      for (const upgrade of web) {
        const { x, y } = at.get(upgrade.id)!;
        const group = document.createElementNS(SVG, "g");
        group.setAttribute("class", "talent-node");
        group.dataset.state = stateOf(upgrade, profile);
        group.dataset.selected = String(upgrade.id === selected);
        group.dataset.id = upgrade.id;
        const circle = document.createElementNS(SVG, "circle");
        circle.setAttribute("cx", String(x));
        circle.setAttribute("cy", String(y));
        circle.setAttribute("r", "17");
        const label = document.createElementNS(SVG, "text");
        label.setAttribute("x", String(x));
        label.setAttribute("y", String(y + 3));
        label.textContent = String(upgrade.cost);
        const title = document.createElementNS(SVG, "title");
        title.textContent = `${upgrade.name} -- ${upgrade.description}`;
        group.append(circle, label, title);
        group.addEventListener("click", () => {
          selected = upgrade.id;
          panel.render();
        });
        svg.append(group);
      }
      renderDetail(profile);
    },
    dispose() {
      svg.replaceChildren();
      detail.replaceChildren();
    },
  };
  panel.render();
  return panel;
}
