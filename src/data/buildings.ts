import { RAW_BUILD, RAW_OPS, type RawBuild, type RawOps } from "./structureTables";
import { isProcessed, type Processed } from "./resources";
import { BALANCE } from "./balance";

export type Layer = "surface" | "underground";

export type BuildingId =
  | "seedLander"
  | "seedPower"
  | "seedSmelter"
  | "seedFactory"
  | "seedCommand"
  | "command"
  | "tube"
  | "ugTube"
  | "road"
  | "agridome"
  | "chap"
  | "smelter"
  | "mine"
  | "storage"
  | "warehouse"
  | "factory"
  | "roboCommand"
  | "commTower"
  | "tokamak"
  | "shipTokamak"
  | "solarReceiver"
  | "hotLab"
  | "spew"
  | "dirt"
  | "police"
  | "spaceport"
  | "massDriver"
  | "trade"
  | "nano"
  | "terraform"
  | "monorail"
  | "monoStation"
  | "monoTransformer"
  | "airShaft"
  | "ugShaft"
  | "residence"
  | "rec"
  | "university"
  | "commercial"
  | "park"
  | "lightIndustry"
  | "lab"
  | "redLight"
  | "admin"
  | "medical"
  | "ugPolice"
  | "geothermal"
  | "colonistLander"
  | "cargoLander";

export type Category = "seed" | "core" | "life" | "industry" | "power" | "science" | "society" | "transport" | "space" | "lander";

export interface BuildingDef {
  id: BuildingId;
  name: string;
  layer: Layer;
  category: Category;
  /** Raw keys per tier (tier 1 first). */
  rawKeys: string[];
  desc: string;
  /** Manual "chance of breakdown" column, in percent. */
  breakdown: number;
  /** Research effect key that unlocks building, if any. */
  requires?: string;
  /** Research effect key prefix that unlocks higher tiers: `tier:<id>:<n>`. */
  tiered?: boolean;
  needsTube: boolean;
  needsDozed: boolean;
  /** Placed by the player through the tile picker. */
  buildable: boolean;
  /** Operates without colonists (seed equipment, automated). */
  automated?: boolean;
  /** Does not participate in morale/power accounting (tubes, roads, shafts). */
  passive?: boolean;
  /** Draws scientists rather than workers. */
  scientists?: boolean;
  powerOutput?: number;
  color: string;
}

const D = (d: Omit<BuildingDef, "needsTube" | "needsDozed" | "buildable"> & Partial<Pick<BuildingDef, "needsTube" | "needsDozed" | "buildable">>): BuildingDef => ({
  needsTube: true,
  needsDozed: true,
  buildable: true,
  ...d,
});

export const BUILDINGS: Record<BuildingId, BuildingDef> = {
  seedLander: D({ id: "seedLander", name: "Seed Lander", layer: "surface", category: "seed", rawKeys: ["Seed"], desc: "Hub of the seed complex. Its four tubes connect the seed units.", breakdown: 0, automated: true, buildable: false, needsDozed: false, needsTube: false, color: "#b9c4cf" }),
  seedPower: D({ id: "seedPower", name: "Seed Power Unit", layer: "surface", category: "seed", rawKeys: ["SeedPower"], desc: "Automated power, 50 units per turn. Fails around turn 150.", breakdown: 0, automated: true, buildable: false, powerOutput: BALANCE.seedPower, color: "#e6c35c" }),
  seedSmelter: D({ id: "seedSmelter", name: "Seed Smelter", layer: "surface", category: "seed", rawKeys: ["SeedSmelter"], desc: "Automated ore processor with built-in storage. Fails around turn 150.", breakdown: 0, automated: true, buildable: false, color: "#d48a4a" }),
  seedFactory: D({ id: "seedFactory", name: "Seed Robot Factory", layer: "surface", category: "seed", rawKeys: ["SeedFact"], desc: "Automated factory for robots and trucks. Fails around turn 150.", breakdown: 0, automated: true, buildable: false, color: "#8fb3d9" }),
  seedCommand: D({ id: "seedCommand", name: "Seed Command Facility", layer: "surface", category: "seed", rawKeys: ["SeedCommand"], desc: "Controls robots and houses colonists until Residences exist.", breakdown: 0, automated: true, buildable: false, color: "#c9d6e3" }),
  command: D({ id: "command", name: "Command Center", layer: "surface", category: "core", rawKeys: ["Command"], desc: "Colony administration and robot control. Needed to start a colony.", breakdown: 50, needsDozed: false, needsTube: false, color: "#c9d6e3" }),
  tube: D({ id: "tube", name: "Tube", layer: "surface", category: "core", rawKeys: ["XPipe"], desc: "Carries air and power between structures.", breakdown: 0, passive: true, needsTube: false, color: "#6f7c88" }),
  ugTube: D({ id: "ugTube", name: "Tube", layer: "underground", category: "core", rawKeys: ["UGXPipe"], desc: "Carries air and power between underground structures.", breakdown: 0, passive: true, needsTube: false, color: "#6f7c88" }),
  road: D({ id: "road", name: "Road", layer: "surface", category: "transport", rawKeys: ["XRoad"], desc: "Paved route. Trucks move 5 tiles per turn. Uses road material.", breakdown: 0, passive: true, needsTube: false, color: "#55504a" }),
  agridome: D({ id: "agridome", name: "Agricultural Dome", layer: "surface", category: "life", rawKeys: ["AgriDome", "AgriDome2", "AgriDome3"], tiered: true, desc: "Grows food for 100 colonists per turn and stores 1000 units.", breakdown: 20, color: "#6fbf73" }),
  chap: D({ id: "chap", name: "CHAP Facility", layer: "surface", category: "life", rawKeys: ["Chap"], desc: "Closed Habitat Atmospheric Production. One supplies the whole connected colony.", breakdown: 10, color: "#7fd1d8" }),
  smelter: D({ id: "smelter", name: "Smelter", layer: "surface", category: "industry", rawKeys: ["Smelter", "Smelter2"], tiered: true, desc: "Turns mined ore into processed resources. Holds 1000 units of ore.", breakdown: 10, color: "#d48a4a" }),
  mine: D({ id: "mine", name: "Mine", layer: "surface", category: "industry", rawKeys: ["ActiveMine"], desc: "Built by a robominer on a beacon. Trucks haul its ore to smelters.", breakdown: 30, buildable: false, needsTube: false, needsDozed: false, color: "#a26f4f" }),
  storage: D({ id: "storage", name: "Storage Tanks", layer: "surface", category: "industry", rawKeys: ["Storage"], desc: "Holds 1000 units of processed resources.", breakdown: 0, color: "#9aa7b3" }),
  warehouse: D({ id: "warehouse", name: "Warehouse", layer: "surface", category: "industry", rawKeys: ["Warehouse"], desc: "Stores 100 mass units of goods: clothing, medicine, fuel cells, robots.", breakdown: 5, color: "#b89b72" }),
  factory: D({ id: "factory", name: "Factory", layer: "surface", category: "industry", rawKeys: ["Fact", "Fact2", "Fact3"], tiered: true, desc: "Builds robots, trucks, fuel cells and road material.", breakdown: 10, color: "#8fb3d9" }),
  roboCommand: D({ id: "roboCommand", name: "Robot Command", layer: "surface", category: "core", rawKeys: ["RoboCmd", "RoboCmd2"], tiered: true, desc: "Controls up to 10 more robots and orders repairs.", breakdown: 30, color: "#b4a3d6" }),
  commTower: D({ id: "commTower", name: "Communications Tower", layer: "surface", category: "core", rawKeys: ["CommTwr"], desc: "Extends robot communication range.", breakdown: 5, color: "#d6d6a3" }),
  tokamak: D({ id: "tokamak", name: "Tokamak Fusion Reactor", layer: "surface", category: "power", rawKeys: ["Tokamak"], requires: "unlock:tokamak", desc: "1000 power. Burns fusion fuels. Its containment hurts morale.", breakdown: 30, powerOutput: BALANCE.tokamakPower, color: "#f0d060" }),
  shipTokamak: D({ id: "shipTokamak", name: "Tokamak (brought)", layer: "surface", category: "power", rawKeys: ["MShipTokamak"], desc: "Starship reactor delivered by cargo lander. 1000 power.", breakdown: 5, buildable: false, powerOutput: BALANCE.tokamakPower, color: "#f0d060" }),
  solarReceiver: D({ id: "solarReceiver", name: "Solar Receiver Array", layer: "surface", category: "power", rawKeys: ["SolrPwrRecvr"], requires: "unlock:solarReceiver", desc: "Receives power from an orbiting Solar Power Satellite.", breakdown: 20, powerOutput: BALANCE.solarReceiverPower, color: "#e0b040" }),
  hotLab: D({ id: "hotLab", name: "Hot Laboratory", layer: "surface", category: "science", rawKeys: ["HotLab", "HotLab2"], desc: "Dangerous research. Needed for some topics.", breakdown: 20, scientists: true, color: "#e07a5f" }),
  spew: D({ id: "spew", name: "SPEW Facility", layer: "surface", category: "life", rawKeys: ["Spew"], desc: "Recycles waste into Multi-Purpose Goo, which substitutes for missing upkeep.", breakdown: 40, color: "#9bb56a" }),
  dirt: D({ id: "dirt", name: "DIRT Facility", layer: "surface", category: "life", rawKeys: ["Dirt"], desc: "Disaster Impact Reduction Team. Protects structures within 5 tiles.", breakdown: 0, color: "#c86b6b" }),
  police: D({ id: "police", name: "Police", layer: "surface", category: "society", rawKeys: ["Cops"], desc: "Reduces crime.", breakdown: 20, color: "#5d7bb0" }),
  spaceport: D({ id: "spaceport", name: "Spaceport", layer: "surface", category: "space", rawKeys: ["SpacePort"], requires: "unlock:spaceport", desc: "Launches satellites and starship components.", breakdown: 30, color: "#d0d8e0" }),
  massDriver: D({ id: "massDriver", name: "Mass Driver", layer: "surface", category: "space", rawKeys: ["MassDrv"], requires: "unlock:massDriver", desc: "Launches payloads cheaply. Required to assemble a starship.", breakdown: 20, color: "#a0a8b8" }),
  trade: D({ id: "trade", name: "Trade Mission", layer: "surface", category: "society", rawKeys: ["Trade"], desc: "Opens trade with the other colony.", breakdown: 0, color: "#d6b45d" }),
  nano: D({ id: "nano", name: "Nanotechnology Facility", layer: "surface", category: "industry", rawKeys: ["Nano"], requires: "unlock:nano", desc: "Removes resource upkeep from every structure.", breakdown: 20, color: "#c08bd6" }),
  terraform: D({ id: "terraform", name: "Terraforming Facility", layer: "surface", category: "space", rawKeys: ["TerraForm"], requires: "terraform", desc: "Builds a breathable atmosphere for the whole planet.", breakdown: 20, color: "#7fd18b" }),
  monorail: D({ id: "monorail", name: "Monorail", layer: "surface", category: "transport", rawKeys: ["XMono"], requires: "unlock:monorail", desc: "Fast ore route. Trucks treat it as 10 tiles per turn.", breakdown: 30, needsTube: false, color: "#8b8f99" }),
  monoStation: D({ id: "monoStation", name: "Monorail Station", layer: "surface", category: "transport", rawKeys: ["MonoStation"], requires: "unlock:monorail", desc: "Required terminal for monorail lines.", breakdown: 30, color: "#a6abb6" }),
  monoTransformer: D({ id: "monoTransformer", name: "Monorail Power", layer: "surface", category: "transport", rawKeys: ["MonoXFormer"], requires: "unlock:monorail", desc: "Powers the monorail.", breakdown: 30, color: "#a6abb6" }),
  airShaft: D({ id: "airShaft", name: "Air Shaft", layer: "surface", category: "core", rawKeys: ["Core"], desc: "Dug by a robodigger. Carries air and power underground.", breakdown: 0, passive: true, buildable: false, needsTube: false, color: "#7d8a96" }),
  ugShaft: D({ id: "ugShaft", name: "Air Shaft", layer: "underground", category: "core", rawKeys: ["UGCore"], desc: "Connects this level to the one above.", breakdown: 0, passive: true, buildable: false, needsTube: false, needsDozed: false, color: "#7d8a96" }),
  residence: D({ id: "residence", name: "Residential Unit", layer: "underground", category: "society", rawKeys: ["UGResident", "UGResident2", "UGResident3"], tiered: true, desc: "Houses colonists.", breakdown: 10, color: "#d9c27a" }),
  rec: D({ id: "rec", name: "Recreation Facility", layer: "underground", category: "society", rawKeys: ["UGRec"], desc: "Entertainment. Raises morale.", breakdown: 20, color: "#e3a0c8" }),
  university: D({ id: "university", name: "University", layer: "underground", category: "science", rawKeys: ["UGUniv"], desc: "Turns students into scientists.", breakdown: 20, color: "#a3c4e3" }),
  commercial: D({ id: "commercial", name: "Commercial", layer: "underground", category: "society", rawKeys: ["UGCommercial"], desc: "Retail outlet for luxuries. Raises morale while stocked.", breakdown: 10, color: "#e3c4a3" }),
  park: D({ id: "park", name: "Park / Reservoir", layer: "underground", category: "society", rawKeys: ["UGPark"], desc: "Needs no staff. Raises morale.", breakdown: 10, color: "#6fbf73" }),
  lightIndustry: D({ id: "lightIndustry", name: "Light Industry", layer: "underground", category: "industry", rawKeys: ["UGFact", "UGFact2"], desc: "Makes luxuries, clothing or medicine, one unit per turn.", breakdown: 20, color: "#b0a0d0" }),
  lab: D({ id: "lab", name: "Laboratory", layer: "underground", category: "science", rawKeys: ["UGLab", "UGLab2", "UGLab3"], tiered: true, desc: "Safe research.", breakdown: 20, scientists: true, color: "#a3d6e3" }),
  redLight: D({ id: "redLight", name: "Red Light District", layer: "underground", category: "society", rawKeys: ["UGRed"], desc: "Entertainment. Raises morale and crime. Draws luxuries.", breakdown: 0, color: "#d65d7b" }),
  admin: D({ id: "admin", name: "Administration", layer: "underground", category: "society", rawKeys: ["UGAdmin"], desc: "Raises productivity of a large colony.", breakdown: 10, color: "#c9d6e3" }),
  medical: D({ id: "medical", name: "Medical Facility", layer: "underground", category: "life", rawKeys: ["UGMed"], desc: "Reduces deaths and doubles the plague window.", breakdown: 20, color: "#e3e3e3" }),
  ugPolice: D({ id: "ugPolice", name: "Police", layer: "underground", category: "society", rawKeys: ["UGCops"], desc: "Reduces crime.", breakdown: 20, color: "#5d7bb0" }),
  geothermal: D({ id: "geothermal", name: "Geothermal Plant", layer: "underground", category: "power", rawKeys: ["UGGeoTherm"], requires: "unlock:geothermal", desc: "Clean power drawn from the planet's heat.", breakdown: 20, powerOutput: BALANCE.geothermalPower, color: "#e07a3a" }),
  colonistLander: D({ id: "colonistLander", name: "Colonist Lander", layer: "surface", category: "lander", rawKeys: ["ColonistLander"], desc: "Brings 50 colonists down from orbit.", breakdown: 0, passive: true, needsDozed: false, needsTube: false, buildable: false, color: "#e8e8f0" }),
  cargoLander: D({ id: "cargoLander", name: "Cargo Lander", layer: "surface", category: "lander", rawKeys: ["CargoLander"], desc: "Brings 20 weight of cargo down from orbit.", breakdown: 0, passive: true, needsDozed: false, needsTube: false, buildable: false, color: "#e8e8f0" }),
};

export const BUILDING_IDS = Object.keys(BUILDINGS) as BuildingId[];

const EMPTY_BUILD: RawBuild = { resources: [], resourceUnits: 0, crew: 0, turns: 1, field38: 0 };
const EMPTY_OPS: RawOps = { resources: [], power: 0, workers: 0, morale: 0 };

export function rawKey(id: BuildingId, tier: number): string {
  const keys = BUILDINGS[id].rawKeys;
  return keys[Math.min(keys.length, Math.max(1, tier)) - 1];
}

export function buildData(id: BuildingId, tier = 1): RawBuild {
  return RAW_BUILD[rawKey(id, tier)] ?? EMPTY_BUILD;
}

export function opsData(id: BuildingId, tier = 1): RawOps {
  return RAW_OPS[rawKey(id, tier)] ?? EMPTY_OPS;
}

/** Construction cost: resourceUnits × scale of each listed processed resource. */
export function buildCost(id: BuildingId, tier = 1): Partial<Record<Processed, number>> {
  const b = buildData(id, tier);
  const cost: Partial<Record<Processed, number>> = {};
  const units = Math.max(1, b.resourceUnits) * BALANCE.buildUnitScale;
  for (const r of b.resources) if (isProcessed(r)) cost[r] = units;
  return cost;
}

export function buildTurns(id: BuildingId, tier = 1): number {
  const t = buildData(id, tier).turns;
  return Math.max(1, t);
}

export function upkeep(id: BuildingId, tier = 1): Processed[] {
  return opsData(id, tier).resources.filter(isProcessed);
}

export function powerNeed(id: BuildingId, tier = 1): number {
  return opsData(id, tier).power;
}

export function workerNeed(id: BuildingId, tier = 1): number {
  if (BUILDINGS[id].automated) return 0;
  return opsData(id, tier).workers;
}

export function moraleEffect(id: BuildingId, tier = 1): number {
  return opsData(id, tier).morale;
}

/**
 * Allocation priority when power, workers or resources run short
 * (manual, Resource Allocation Priority). Earlier entries are served first.
 */
export const PRIORITY: BuildingId[] = [
  "seedLander",
  "seedPower",
  "seedCommand",
  "seedSmelter",
  "seedFactory",
  "nano",
  "solarReceiver",
  "chap",
  "smelter",
  "warehouse",
  "agridome",
  "command",
  "shipTokamak",
  "tokamak",
  "geothermal",
  "spew",
  "storage",
  "mine",
  "residence",
  "roboCommand",
  "commTower",
  "hotLab",
  "redLight",
  "park",
  "rec",
  "university",
  "medical",
  "monoTransformer",
  "monorail",
  "massDriver",
  "trade",
  "lab",
  "factory",
  "police",
  "ugPolice",
  "lightIndustry",
  "commercial",
  "admin",
  "dirt",
  "monoStation",
  "spaceport",
  "terraform",
  "tube",
  "ugTube",
  "road",
  "airShaft",
  "ugShaft",
  "colonistLander",
  "cargoLander",
];
export const PRIORITY_INDEX: Record<string, number> = Object.fromEntries(PRIORITY.map((id, i) => [id, i]));
