/** Cargo chart: weight and cost per unit. */
export type CargoId =
  | "colonists"
  | "food"
  | "lifeSupport"
  | "colonistLander"
  | "cargoLander"
  | "seedFactory"
  | "tokamak"
  | "solarSat"
  | "solarReceiver"
  | "geoProbe"
  | "weatherSat"
  | "interstellarProbe"
  | "comsat"
  | "observer"
  | "ulbi";

export interface CargoDef {
  id: CargoId;
  name: string;
  weight: number;
  cost: number;
  /** Must ride a cargo lander to reach the surface. */
  landed: boolean;
  max: number;
  desc: string;
}

export const CARGO: CargoDef[] = [
  { id: "colonists", name: "Colonists (50)", weight: 1, cost: 1, landed: false, max: 10, desc: "Fifty more colonists. Each fifty need a Colonist Lander." },
  { id: "food", name: "Food", weight: 1, cost: 1, landed: true, max: 20, desc: "Feeds the colony while the first AgriDome is built." },
  { id: "lifeSupport", name: "Life Support", weight: 1, cost: 3, landed: true, max: 20, desc: "Keeps colonists breathing until a CHAP is built." },
  { id: "colonistLander", name: "Colonist Lander", weight: 9, cost: 16, landed: false, max: 6, desc: "Carries 50 colonists one way to the surface." },
  { id: "cargoLander", name: "Cargo Lander", weight: 10, cost: 17, landed: false, max: 4, desc: "Carries a cargo weight of 20 one way to the surface." },
  { id: "seedFactory", name: "Seed Factory", weight: 10, cost: 18, landed: false, max: 1, desc: "Power, robots, ore processing and temporary housing. Required." },
  { id: "tokamak", name: "Tokamak Reactor", weight: 10, cost: 20, landed: true, max: 1, desc: "Covers most power needs on most worlds." },
  { id: "solarSat", name: "Solar Power Satellite", weight: 8, cost: 15, landed: false, max: 1, desc: "Safe orbital power for worlds near their star. Needs receivers." },
  { id: "solarReceiver", name: "Solar Receiver Array", weight: 5, cost: 10, landed: true, max: 2, desc: "Receives power from the Solar Power Satellite." },
  { id: "geoProbe", name: "Geological Probe", weight: 4, cost: 14, landed: false, max: 1, desc: "Shows mining sites and digging depth before landing." },
  { id: "weatherSat", name: "Weather Satellite", weight: 4, cost: 12, landed: false, max: 1, desc: "Warns of storms. Reduces storm damage." },
  { id: "interstellarProbe", name: "Interstellar Probe", weight: 0, cost: 15, landed: false, max: 1, desc: "Detailed data on every planet in the system." },
  { id: "comsat", name: "Communications Satellite", weight: 4, cost: 11, landed: false, max: 1, desc: "Robots never lose contact." },
  { id: "observer", name: "Orbital Observer", weight: 6, cost: 13, landed: false, max: 1, desc: "Keeps watch on the other colony." },
  { id: "ulbi", name: "ULBI Probe", weight: 0, cost: 14, landed: false, max: 1, desc: "Specific data about the target system's planets." },
];

export const CARGO_BY_ID: Record<CargoId, CargoDef> = Object.fromEntries(CARGO.map((c) => [c.id, c])) as Record<CargoId, CargoDef>;

export type Manifest = Record<CargoId, number>;

export function emptyManifest(): Manifest {
  return Object.fromEntries(CARGO.map((c) => [c.id, 0])) as Manifest;
}

/** The tutorial's recommended load, adjusted to fit the budget. */
export function recommendedManifest(): Manifest {
  return {
    ...emptyManifest(),
    seedFactory: 1,
    colonistLander: 2,
    cargoLander: 1,
    food: 6,
    lifeSupport: 4,
    tokamak: 1,
    geoProbe: 1,
    comsat: 1,
    weatherSat: 1,
    ulbi: 1,
  };
}

export interface ManifestCheck {
  weight: number;
  cost: number;
  colonists: number;
  colonistSeats: number;
  landedWeight: number;
  landerCapacity: number;
  errors: string[];
}

export function checkManifest(m: Manifest, funds: number, weightLimit: number, baseColonists: number): ManifestCheck {
  let weight = 0;
  let cost = 0;
  let landedWeight = 0;
  for (const c of CARGO) {
    weight += c.weight * m[c.id];
    cost += c.cost * m[c.id];
    if (c.landed) landedWeight += c.weight * m[c.id];
  }
  const colonists = baseColonists + 50 * m.colonists;
  const colonistSeats = 50 * m.colonistLander;
  const landerCapacity = 20 * m.cargoLander;
  const errors: string[] = [];
  if (m.seedFactory < 1) errors.push("A Seed Factory is required.");
  if (cost > funds) errors.push(`Over budget by ${cost - funds}.`);
  if (weight > weightLimit) errors.push(`Over weight by ${weight - weightLimit}.`);
  if (colonistSeats < colonists) errors.push(`${colonists} colonists need ${Math.ceil(colonists / 50)} Colonist Landers.`);
  if (landedWeight > landerCapacity) errors.push(`Surface cargo weighs ${landedWeight}; landers carry ${landerCapacity}.`);
  if (m.solarReceiver > 0 && m.solarSat < 1) errors.push("Solar Receivers need a Solar Power Satellite.");
  return { weight, cost, colonists, colonistSeats, landedWeight, landerCapacity, errors };
}
