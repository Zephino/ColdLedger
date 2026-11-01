import { BALANCE, DIFFICULTY, type Difficulty } from "../data/balance";
import { buildTurns } from "../data/buildings";
import type { Manifest } from "../data/cargo";
import { PLANET_BY_ID } from "../data/planets";
import { emptyProcessed } from "../data/resources";
import { MAP_SIZE, generateMap, siteSeed } from "./map";
import type { GameState, SatelliteId, Structure } from "./types";
import type { BuildingId } from "../data/buildings";

export interface NewGameOptions {
  seed: number;
  difficulty: Difficulty;
  planetId: string;
  site: number;
  manifest: Manifest;
  colonyName: string;
}

export function newGame(o: NewGameOptions): GameState {
  const planet = PLANET_BY_ID[o.planetId];
  const map = generateMap(siteSeed(o.seed, o.planetId, o.site), planet, o.manifest.geoProbe > 0);
  const satellites: SatelliteId[] = [];
  for (const id of ["solarSat", "geoProbe", "weatherSat", "comsat", "observer", "interstellarProbe", "ulbi"] as const) {
    if (o.manifest[id] > 0) satellites.push(id);
  }
  const colonists = BALANCE.baseColonists + 50 * o.manifest.colonists;
  const diff = DIFFICULTY[o.difficulty];
  const rebelShare = diff.rebelShare;
  const s: GameState = {
    version: 1,
    seed: o.seed,
    rng: (o.seed ^ 0x9e3779b9) >>> 0,
    turn: 0,
    difficulty: o.difficulty,
    planetId: o.planetId,
    site: o.site,
    colonyName: o.colonyName,
    width: MAP_SIZE,
    height: MAP_SIZE,
    levels: map.levels,
    openLevels: 0,
    structures: {},
    robots: {},
    idleRobots: { dozer: 1, digger: 1, miner: 1, explorer: 1, repairbot: 0, airbot: 0, humanoid: 0 },
    trucks: BALANCE.seedTrucks,
    nextId: 1,
    stock: { ...emptyProcessed(), ...BALANCE.seedStock },
    ore: 0,
    oreMix: {},
    items: { food: 0, luxury: 0, clothing: 0, medicine: 0, fuelCells: 0, roadMaterial: 0, mpg: 0 },
    air: 0,
    pop: { children: 0, students: 0, workers: 0, scientists: 0, retired: 0 },
    morale: BALANCE.startingMorale,
    moraleBoost: 0,
    crime: 0,
    research: { done: [], current: null, progress: 0, hotCurrent: null, hotProgress: 0 },
    plague: null,
    terraform: 0,
    starship: { components: 0, progress: 0, launched: false },
    satellites,
    orbit: {
      colonists,
      colonistLanders: o.manifest.colonistLander,
      cargoLanders: o.manifest.cargoLander,
      food: o.manifest.food,
      lifeSupport: o.manifest.lifeSupport,
      tokamak: o.manifest.tokamak,
      solarReceiver: o.manifest.solarReceiver,
    },
    kits: { shipTokamak: 0, solarReceiver: 0 },
    manifest: o.manifest,
    rebels: {
      population: Math.round(colonists * rebelShare * 1.5),
      hostility: 40 + diff.hostilityShift * 10,
      tradeOpen: false,
      morale: 550,
      stock: { MetalA: 200, MetalB: 150, MinA: 150, MinB: 120, PrecA: 40, FusionA: 60 },
      lastTrade: -99,
    },
    story: {
      trust: { faculty: 50, crews: 50, wardens: 50, board: 50 },
      evidence: 0,
      evidenceSeen: [],
      nextEvent: 3,
      history: [],
      flags: {},
    },
    messages: [],
    ending: null,
    center: map.center,
    seedCollapsed: false,
    colonistsLanded: false,
    lastReport: {
      powerMade: 0,
      powerUsed: 0,
      workersNeeded: 0,
      workersAvailable: 0,
      scientistsNeeded: 0,
      foodMade: 0,
      foodEaten: 0,
      housing: 0,
      oreMined: 0,
      oreSmelted: 0,
      research: 0,
      births: 0,
      deaths: 0,
      moraleTarget: BALANCE.startingMorale,
      moraleFactors: [],
      storageCap: 0,
      warehouseCap: 0,
      warehouseUsed: 0,
      robotCap: 0,
      atmosphere: false,
    },
    stats: { births: 0, deaths: 0, peakPop: 0 },
  };

  // Seed complex (manual tutorial): lander hub, four tubes, four seed units on the diagonals.
  const { x, y } = map.center;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const t = s.levels[0][y + dy][x + dx];
      t.terrain = "clear";
      t.dozed = true;
      delete t.beacon;
    }
  }
  addStructure(s, "seedLander", 0, x, y, true);
  for (const [dx, dy] of [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ]) {
    addStructure(s, "tube", 0, x + dx, y + dy, true);
  }
  addStructure(s, "seedPower", 0, x - 1, y - 1, false);
  addStructure(s, "seedSmelter", 0, x + 1, y - 1, false);
  addStructure(s, "seedFactory", 0, x + 1, y + 1, false);
  addStructure(s, "seedCommand", 0, x - 1, y + 1, false);

  s.messages.push({ turn: 0, kind: "story", text: `The seed lander is down on ${planet.name}. The seed units are unpacking.` });
  return s;
}

export function addStructure(s: GameState, type: BuildingId, level: number, x: number, y: number, complete: boolean, tier = 1): Structure {
  const id = s.nextId++;
  const turns = buildTurns(type, tier);
  const st: Structure = {
    id,
    type,
    tier,
    level,
    x,
    y,
    state: complete ? "active" : "building",
    buildLeft: complete ? 0 : turns,
    buildTotal: turns,
    age: 0,
  };
  if (type === "seedFactory" || type === "factory") st.factory = { product: "none", progress: 0, produced: 0 };
  if (type === "lightIndustry") st.light = { product: "luxury" };
  s.structures[id] = st;
  s.levels[level][y][x].structure = id;
  return st;
}
