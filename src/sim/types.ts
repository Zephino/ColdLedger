import type { BuildingId } from "../data/buildings";
import type { Difficulty } from "../data/balance";
import type { Manifest } from "../data/cargo";
import type { Ore, Processed, Stock } from "../data/resources";

export type SurfaceTerrain = "clear" | "rough" | "hostile" | "impassable";
export type UgTerrain = "easy" | "diff" | "imposs";

export interface Tile {
  /** Surface: SurfaceTerrain. Underground: UgTerrain hardness of the rock. */
  terrain: SurfaceTerrain | UgTerrain;
  dozed: boolean;
  /** Underground only: excavated by a digger. Surface tiles are always open. */
  dug: boolean;
  /** Known to the player. Surface tiles are visible; underground needs digging. */
  seen: boolean;
  beacon?: Deposit;
  structure?: number;
  robot?: number;
}

export interface Deposit {
  /** Ore mix weights; normalized when mined. */
  mix: Partial<Record<Ore, number>>;
  richness: number;
  known: boolean;
}

export type StructureState = "building" | "active" | "idle" | "broken" | "destroyed" | "exhausted";

export type IdleReason = "power" | "workers" | "scientists" | "resources" | "tube" | "air" | "disabled" | "output";

export interface Structure {
  id: number;
  type: BuildingId;
  tier: number;
  level: number;
  x: number;
  y: number;
  state: StructureState;
  buildLeft: number;
  buildTotal: number;
  idleReason?: IdleReason;
  disabled?: boolean;
  repairLeft?: number;
  connected?: boolean;
  age: number;
  mine?: MineState;
  factory?: FactoryState;
  light?: LightState;
}

export interface MineState {
  mix: Partial<Record<Ore, number>>;
  richness: number;
  levels: number;
  life: number;
  extracted: number;
  stock: number;
  trucks: number;
  deepening?: number;
}

export type FactoryProduct = "none" | "dozer" | "digger" | "miner" | "explorer" | "truck" | "fuelCells" | "roadMaterial" | "repairbot" | "airbot" | "humanoid";

export interface FactoryState {
  product: FactoryProduct;
  progress: number;
  produced: number;
}

export type LightProduct = "luxury" | "clothing" | "medicine";
export interface LightState {
  product: LightProduct;
}

export type RobotKind = "dozer" | "digger" | "miner" | "explorer" | "repairbot" | "airbot" | "humanoid";

export interface Robot {
  id: number;
  kind: RobotKind;
  level: number;
  x: number;
  y: number;
  task: RobotTask;
  turnsLeft: number;
  fuel: number;
}

export type Direction = "n" | "e" | "s" | "w";

export type RobotTask =
  | { kind: "doze"; tiles: Array<[number, number]> }
  | { kind: "shaft" }
  | { kind: "dig"; dir: Direction }
  | { kind: "selfDestruct" }
  | { kind: "mine" }
  | { kind: "deepen"; structure: number }
  | { kind: "explore"; radius: number };

export type ItemId = "food" | "luxury" | "clothing" | "medicine" | "fuelCells" | "roadMaterial" | "mpg";

export interface Population {
  children: number;
  students: number;
  workers: number;
  scientists: number;
  retired: number;
}

export interface Plague {
  turnsLeft: number;
  cure: number;
  cureNeeded: number;
}

export type SatelliteId = "solarSat" | "geoProbe" | "weatherSat" | "comsat" | "observer" | "meteorsat" | "interstellarProbe" | "ulbi";

export interface Rebels {
  population: number;
  hostility: number;
  tradeOpen: boolean;
  morale: number;
  stock: Partial<Stock<Processed>>;
  lastTrade: number;
}

export type FactionId = "faculty" | "crews" | "wardens" | "board";

export interface StoryState {
  trust: Record<FactionId, number>;
  evidence: number;
  evidenceSeen: string[];
  nextEvent: number;
  pending?: PendingEvent;
  history: string[];
  flags: Record<string, boolean | number>;
}

export interface PendingEvent {
  id: string;
  turn: number;
}

export type EndingId = "secondArk" | "greenHorizon" | "openCharter" | "ghostTown" | "boardRule";

export interface Ending {
  id: EndingId;
  turn: number;
  won: boolean;
}

export interface Message {
  turn: number;
  text: string;
  kind: "info" | "good" | "warn" | "bad" | "story";
}

export interface Orbit {
  colonists: number;
  colonistLanders: number;
  cargoLanders: number;
  food: number;
  lifeSupport: number;
  tokamak: number;
  solarReceiver: number;
}

export interface Kits {
  shipTokamak: number;
  solarReceiver: number;
}

export interface GameState {
  version: 1;
  seed: number;
  rng: number;
  turn: number;
  difficulty: Difficulty;
  planetId: string;
  site: number;
  colonyName: string;
  width: number;
  height: number;
  levels: Tile[][][];
  /** Deepest underground level opened so far. */
  openLevels: number;
  structures: Record<number, Structure>;
  robots: Record<number, Robot>;
  idleRobots: Record<RobotKind, number>;
  trucks: number;
  nextId: number;
  stock: Stock<Processed>;
  ore: number;
  oreMix: Partial<Record<Ore, number>>;
  items: Record<ItemId, number>;
  air: number;
  pop: Population;
  morale: number;
  moraleBoost: number;
  crime: number;
  research: { done: string[]; current: string | null; progress: number; hotCurrent: string | null; hotProgress: number };
  plague: Plague | null;
  terraform: number;
  starship: { components: number; progress: number; launched: boolean };
  satellites: SatelliteId[];
  orbit: Orbit;
  kits: Kits;
  manifest: Manifest;
  rebels: Rebels;
  story: StoryState;
  messages: Message[];
  ending: Ending | null;
  center: { x: number; y: number };
  seedCollapsed: boolean;
  colonistsLanded: boolean;
  lastReport: TurnReport;
  stats: { births: number; deaths: number; peakPop: number };
}

export interface TurnReport {
  powerMade: number;
  powerUsed: number;
  workersNeeded: number;
  workersAvailable: number;
  scientistsNeeded: number;
  foodMade: number;
  foodEaten: number;
  housing: number;
  oreMined: number;
  oreSmelted: number;
  research: number;
  births: number;
  deaths: number;
  moraleTarget: number;
  moraleFactors: Array<[string, number]>;
  storageCap: number;
  warehouseCap: number;
  warehouseUsed: number;
  robotCap: number;
  atmosphere: boolean;
}

export const POP_TOTAL = (p: Population) => p.children + p.students + p.workers + p.scientists + p.retired;
