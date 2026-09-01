import type { CityTerms } from "../sim/economy";

export function ledgerText(terms?: CityTerms): string[] {
  if (!terms) return ["Population: no tick yet", "Food: no tick yet", "Materials: no tick yet", "Services: no tick yet"];
  return [
    `Population: ${terms.population.value.toFixed(1)} = housing ${terms.population.housing} + change ${terms.population.change.toFixed(2)} - shortage ${terms.population.foodShortage.toFixed(2)}`,
    `Food: ${terms.food.value.toFixed(1)} = +${terms.food.produced.toFixed(2)} - ${terms.food.consumed.toFixed(2)}`,
    `Materials: ${terms.materials.value.toFixed(1)} = +${terms.materials.produced.toFixed(2)}`,
    `Services: ${terms.services.value.toFixed(1)} = +${terms.services.produced.toFixed(2)}`,
    `Trade: ${terms.trade.toFixed(2)}`,
  ];
}
