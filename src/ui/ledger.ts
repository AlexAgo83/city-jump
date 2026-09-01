import type { CityResources, CityTerms } from "../sim/economy";

/** One resource, read as a balance sheet: what there is, what comes in, what goes out. */
export interface LedgerRow {
  readonly label: string;
  readonly value: string;
  readonly inflow: string;
  readonly outflow: string;
  /** True when what goes out is more than what comes in, so the row can say so. */
  readonly short: boolean;
}

const round = (value: number): string => (Math.abs(value) >= 100 ? Math.round(value).toLocaleString() : value.toFixed(1));
const flow = (value: number, sign: "+" | "-"): string => (value <= 0.005 ? "--" : `${sign}${round(value)}`);

/**
 * @param resources What the city holds right now, which is known before the simulation has ticked
 * once. The panel showed an empty box until the first tick otherwise, and a panel that is blank
 * when you open it reads as a broken button.
 */
export function ledgerRows(terms?: CityTerms, resources?: CityResources): LedgerRow[] {
  if (!terms) {
    if (!resources) return [];
    return [
      { label: "People", value: round(resources.population), inflow: "--", outflow: "--", short: false },
      { label: "Food", value: round(resources.food), inflow: "--", outflow: "--", short: false },
      { label: "Materials", value: round(resources.materials), inflow: "--", outflow: "--", short: false },
    ];
  }
  return [
    {
      label: "People",
      value: round(terms.population.value),
      inflow: flow(Math.max(0, terms.population.change), "+"),
      outflow: flow(Math.max(0, -terms.population.change), "-"),
      short: terms.population.change < 0,
    },
    { label: "Housing", value: round(terms.population.housing), inflow: "--", outflow: "--", short: terms.population.housing < terms.population.value },
    { label: "Food", value: round(terms.food.value), inflow: flow(terms.food.produced, "+"), outflow: flow(terms.food.consumed, "-"), short: terms.population.foodShortage > 0 },
    { label: "Materials", value: round(terms.materials.value), inflow: flow(terms.materials.produced, "+"), outflow: flow(terms.materials.consumed, "-"), short: terms.materials.shortage > 0 },
    { label: "Trade", value: `$${round(terms.trade)}/s`, inflow: "--", outflow: "--", short: false },
  ];
}
