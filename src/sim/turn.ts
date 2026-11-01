import { BALANCE } from "../data/balance";
import { BUILDINGS, PRIORITY_INDEX, buildCost, moraleEffect, powerNeed, upkeep, workerNeed } from "../data/buildings";
import { PLANET_BY_ID } from "../data/planets";
import { TOPIC_BY_ID } from "../data/research";
import { ORES, PROCESSED, smeltOre, type Ore, type Processed } from "../data/resources";
import { ENDINGS, EVENTS } from "../data/story";
import { STARSHIP_COMPONENT_COST, dozeTurns, starshipBlocked } from "./actions";
import {
  canAfford,
  computeConnectivity,
  countActive,
  countBuilt,
  difficultyOf,
  effectCount,
  hasEffect,
  housing,
  inCommRange,
  log,
  pay,
  population,
  resourceCap,
  robotCap,
  storageCap,
  structures,
  warehouseCap,
  warehouseUsed,
} from "./colony";
import { NEIGHBORS4, NEIGHBORS8, distance } from "./map";
import { addStructure } from "./newGame";
import { chance, nextRandom, pick, randInt, stochasticRound } from "./rng";
import type { FactoryProduct, GameState, Robot, Structure, TurnReport } from "./types";

const POWER_PRODUCERS = new Set(["seedPower", "tokamak", "shipTokamak", "geothermal", "solarReceiver"]);

export function endTurn(s: GameState): void {
  if (s.ending || s.story.pending) return;
  s.turn += 1;
  const report = blankReport();

  advanceConstruction(s);
  advanceRobots(s);
  computeConnectivity(s);
  if (s.turn === BALANCE.seedCollapseTurn) collapseSeed(s);
  allocate(s, report);
  produce(s, report);
  lifeSupport(s, report);
  populationStep(s, report);
  moraleStep(s, report);
  crimeStep(s);
  breakdowns(s);
  disasters(s);
  plagueStep(s, report);
  rebelStep(s);
  storyStep(s);
  checkEndings(s);

  report.storageCap = storageCap(s);
  report.warehouseCap = warehouseCap(s);
  report.warehouseUsed = warehouseUsed(s);
  report.robotCap = robotCap(s);
  report.housing = housing(s);
  s.lastReport = report;
  s.stats.peakPop = Math.max(s.stats.peakPop, population(s));
}

function blankReport(): TurnReport {
  return {
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
    moraleTarget: 0,
    moraleFactors: [],
    storageCap: 0,
    warehouseCap: 0,
    warehouseUsed: 0,
    robotCap: 0,
    atmosphere: false,
  };
}

function advanceConstruction(s: GameState) {
  for (const st of structures(s)) {
    st.age += 1;
    if (st.state !== "building") continue;
    st.buildLeft -= 1;
    if (st.buildLeft <= 0) {
      st.state = "active";
      st.age = 0;
      const def = BUILDINGS[st.type];
      if (!def.passive) log(s, `${def.name} completed.`, "good");
      if (st.type === "seedCommand") log(s, "The seed complex is complete. Colonist and cargo landers can now come down.", "story");
    }
  }
}

function releaseRobot(s: GameState, r: Robot) {
  const tile = s.levels[r.level][r.y][r.x];
  if (tile.robot === r.id) delete tile.robot;
  delete s.robots[r.id];
  s.idleRobots[r.kind] += 1;
}

function loseRobot(s: GameState, r: Robot, why: string) {
  const tile = s.levels[r.level][r.y][r.x];
  if (tile.robot === r.id) delete tile.robot;
  delete s.robots[r.id];
  log(s, `A robo${r.kind} was lost: ${why}.`, "bad");
}

function revealDug(s: GameState, level: number, x: number, y: number) {
  const t = s.levels[level]?.[y]?.[x];
  if (!t || t.terrain === "imposs") return false;
  t.dug = true;
  t.seen = true;
  return true;
}

function advanceRobots(s: GameState) {
  for (const r of Object.values(s.robots)) {
    r.fuel -= 1;
    if (r.fuel <= 0) {
      if (s.items.fuelCells > 0) {
        s.items.fuelCells -= 1;
        r.fuel = BALANCE.fuelCellLife;
      } else {
        loseRobot(s, r, "its fuel cell ran dry");
        continue;
      }
    }
    if (r.level === 0 && r.kind !== "airbot" && !inCommRange(s, r.x, r.y) && chance(s, BALANCE.robotLossChance)) {
      loseRobot(s, r, "it wandered out of communication range");
      continue;
    }
    r.turnsLeft -= 1;
    const task = r.task;
    if (task.kind === "doze") {
      if (r.turnsLeft > 0) continue;
      const [tx, ty] = task.tiles.shift()!;
      const t = s.levels[r.level][ty][tx];
      if (t.structure === undefined) t.dozed = true;
      if (!task.tiles.length) {
        releaseRobot(s, r);
        continue;
      }
      const [nx, ny] = task.tiles[0];
      const tile = s.levels[r.level][r.y][r.x];
      if (tile.robot === r.id) delete tile.robot;
      r.x = nx;
      r.y = ny;
      s.levels[r.level][ny][nx].robot = r.id;
      r.turnsLeft = dozeTurns(s, r.level, nx, ny);
      continue;
    }
    if (r.turnsLeft > 0) {
      if (task.kind === "explore") explore(s, r);
      continue;
    }
    if (task.kind === "shaft") {
      const below = r.level + 1;
      if (r.level === 0) {
        const t = s.levels[0][r.y][r.x];
        t.dozed = true;
        addStructure(s, "airShaft", 0, r.x, r.y, true);
      }
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) revealDug(s, below, r.x + dx, r.y + dy);
      const bt = s.levels[below][r.y][r.x];
      bt.terrain = "easy";
      bt.dug = true;
      bt.dozed = true;
      addStructure(s, "ugShaft", below, r.x, r.y, true);
      s.openLevels = Math.max(s.openLevels, below);
      log(s, `Air shaft open to underground level ${below}.`, "good");
      releaseRobot(s, r);
    } else if (task.kind === "dig") {
      const [dx, dy] = NEIGHBORS4[["n", "e", "s", "w"].indexOf(task.dir)];
      const px = -dy;
      const py = dx;
      const half = Math.floor(BALANCE.digStripWidth / 2);
      for (let w = -half; w <= half; w++) {
        for (let step = 1; step <= BALANCE.digStripLength; step++) {
          if (!revealDug(s, r.level, r.x + dx * step + px * w, r.y + dy * step + py * w)) {
            const t = s.levels[r.level][r.y + dy * step + py * w]?.[r.x + dx * step + px * w];
            if (t) t.seen = true;
            break;
          }
        }
      }
      releaseRobot(s, r);
    } else if (task.kind === "selfDestruct") {
      for (const [dx, dy] of [[0, 0], ...NEIGHBORS8]) {
        const t = s.levels[r.level][r.y + dy]?.[r.x + dx];
        if (!t) continue;
        if (r.level > 0) {
          t.terrain = "diff";
          t.dug = true;
          t.seen = true;
        } else if (t.terrain === "impassable") t.terrain = "rough";
        if (t.structure !== undefined) {
          const st = s.structures[t.structure];
          if (st && st.type !== "seedLander" && st.type !== "ugShaft" && st.type !== "airShaft") st.state = "destroyed";
        }
      }
      const tile = s.levels[r.level][r.y][r.x];
      if (tile.robot === r.id) delete tile.robot;
      delete s.robots[r.id];
      log(s, "The robodigger self-destructed, clearing the rock around it.", "warn");
    } else if (task.kind === "mine") {
      releaseRobot(s, r);
    } else if (task.kind === "deepen") {
      const st = s.structures[task.structure];
      if (st?.mine) {
        st.mine.levels += 1;
        st.mine.life += 80;
        log(s, `Mine deepened to ${st.mine.levels} levels.`, "good");
      }
      releaseRobot(s, r);
    } else if (task.kind === "explore") {
      explore(s, r);
      releaseRobot(s, r);
    }
  }
}

function explore(s: GameState, r: Robot) {
  const radius = r.task.kind === "explore" ? r.task.radius : 8;
  const p = BALANCE.explorerFindChance * (1 + 0.5 * effectCount(s, "explorer+"));
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const t = s.levels[0][r.y + dy]?.[r.x + dx];
      if (t?.beacon && !t.beacon.known && chance(s, p * 3)) {
        t.beacon.known = true;
        log(s, "The explorer confirmed a mineral deposit.", "good");
      }
    }
  }
  if (chance(s, p)) {
    const x = r.x + randInt(s, -radius, radius);
    const y = r.y + randInt(s, -radius, radius);
    const t = s.levels[0][y]?.[x];
    if (t && !t.beacon && t.structure === undefined && t.terrain !== "impassable") {
      const planet = PLANET_BY_ID[s.planetId];
      const mix: Partial<Record<Ore, number>> = {};
      for (const ore of ORES) if (chance(s, 0.6)) mix[ore] = 5 + nextRandom(s) * 25;
      mix.OreA = (mix.OreA ?? 0) + 15;
      t.beacon = { mix, richness: planet.richness * (0.7 + nextRandom(s) * 0.6), known: true };
      log(s, "The explorer found a new mineral deposit.", "good");
    }
  }
}

function collapseSeed(s: GameState) {
  for (const st of structures(s)) {
    if (st.type === "seedPower" || st.type === "seedSmelter" || st.type === "seedFactory") st.state = "destroyed";
  }
  s.seedCollapsed = true;
  const cap = resourceCap(s);
  for (const r of PROCESSED) s.stock[r] = Math.min(s.stock[r], cap);
  log(s, "The seed power unit, smelter and factory have failed. The seed command module no longer houses colonists.", "bad");
}

function strikeActive(s: GameState) {
  const until = s.story.flags.strikeUntil;
  return typeof until === "number" && s.turn <= until;
}

/**
 * Serves structures in manual priority order with power, staff and upkeep.
 * Producers are served first so their output is available to the rest.
 */
function allocate(s: GameState, report: TurnReport) {
  const list = structures(s)
    .filter((st) => st.state === "active" || st.state === "idle")
    .sort((a, b) => (PRIORITY_INDEX[a.type] ?? 99) - (PRIORITY_INDEX[b.type] ?? 99) || a.id - b.id);
  const humanoids = s.idleRobots.humanoid * 5;
  let workers = s.pop.workers + humanoids;
  let scientists = s.pop.scientists;
  if (strikeActive(s)) workers = Math.floor(workers / 2);
  report.workersAvailable = workers + scientists;
  const nanoFree = difficultyOf(s).nanoFree;
  let power = 0;
  let usedPower = 0;
  const solarSats = s.satellites.filter((x) => x === "solarSat").length;
  let receiversLeft = solarSats * BALANCE.receiversPerSolarSat;
  const planet = PLANET_BY_ID[s.planetId];
  let workersNeeded = 0;
  let scientistsNeeded = 0;

  const serve = (st: Structure, producer: boolean) => {
    const def = BUILDINGS[st.type];
    if (def.passive) {
      st.state = "active";
      return;
    }
    if (st.disabled) {
      st.state = "idle";
      st.idleReason = "disabled";
      return;
    }
    if (!st.connected) {
      st.state = "idle";
      st.idleReason = "tube";
      return;
    }
    const need = workerNeed(st.type, st.tier);
    if (def.scientists) scientistsNeeded += need;
    else workersNeeded += need;
    const p = producer ? 0 : powerNeed(st.type, st.tier);
    if (p > power - usedPower) {
      st.state = "idle";
      st.idleReason = "power";
      return;
    }
    if (def.scientists) {
      if (need > scientists) {
        st.state = "idle";
        st.idleReason = "scientists";
        return;
      }
    } else if (need > workers + scientists) {
      st.state = "idle";
      st.idleReason = "workers";
      return;
    }
    if (st.type === "solarReceiver" && receiversLeft <= 0) {
      st.state = "idle";
      st.idleReason = "power";
      return;
    }
    const upk = nanoFree || countActive(s, "nano") > 0 ? [] : upkeep(st.type, st.tier);
    const lacking = upk.filter((r) => s.stock[r] < BALANCE.upkeepPerResource);
    if (lacking.length > s.items.mpg) {
      st.state = "idle";
      st.idleReason = "resources";
      return;
    }
    for (const r of upk) {
      if (s.stock[r] >= BALANCE.upkeepPerResource) s.stock[r] -= BALANCE.upkeepPerResource;
      else s.items.mpg -= 1;
    }
    usedPower += p;
    if (def.scientists) scientists -= need;
    else {
      const fromWorkers = Math.min(workers, need);
      workers -= fromWorkers;
      scientists -= need - fromWorkers;
    }
    st.state = "active";
    delete st.idleReason;
    if (producer) {
      let out = def.powerOutput ?? 0;
      if (st.type === "solarReceiver") {
        out *= planet.solar;
        receiversLeft -= 1;
      }
      power += out;
    }
  };

  for (const st of list) if (POWER_PRODUCERS.has(st.type)) serve(st, true);
  for (const st of list) if (!POWER_PRODUCERS.has(st.type)) serve(st, false);
  report.powerMade = power;
  report.powerUsed = usedPower;
  report.workersNeeded = workersNeeded + scientistsNeeded;
  report.scientistsNeeded = scientistsNeeded;
  report.atmosphere = structures(s).some((st) => st.type === "chap" && st.state === "active");
}

/** Production efficiency from morale (manual: morale directly affects factory output). */
function moraleFactor(s: GameState) {
  return Math.max(0.5, Math.min(1.25, 0.5 + s.morale / 800));
}

function produce(s: GameState, report: TurnReport) {
  const planet = PLANET_BY_ID[s.planetId];
  const all = structures(s);
  const active = all.filter((st) => st.state === "active");

  // Mining
  const mineBonus = 1 + 0.15 * effectCount(s, "mine+");
  for (const st of active) {
    if (st.type !== "mine" || !st.mine) continue;
    const m = st.mine;
    const out = Math.min(BALANCE.mineOreStorage - m.stock, BALANCE.mineOrePerLevel * m.levels * m.richness * mineBonus);
    if (out > 0) {
      m.stock += out;
      m.extracted += 1;
      report.oreMined += out;
    }
    if (m.extracted >= m.life) {
      st.state = "exhausted";
      log(s, "A mine has been exhausted.", "warn");
    }
  }

  // Trucking: each mine has its internal truck plus trucks from the pool.
  const smelters = active.filter((st) => st.type === "smelter" || st.type === "seedSmelter");
  const yardCap = smelters.length * BALANCE.smelterCapacity;
  const mines = all.filter((st) => st.type === "mine" && st.mine && (st.state === "active" || st.state === "idle" || st.state === "exhausted") && st.mine.stock > 0);
  if (smelters.length && mines.length) {
    const cost = travelCost(s, smelters);
    let spare = s.trucks;
    for (const st of mines) {
      st.mine!.trucks = 1;
    }
    while (spare > 0) {
      for (const st of mines) {
        if (spare <= 0) break;
        st.mine!.trucks += 1;
        spare--;
      }
    }
    for (const st of mines) {
      const m = st.mine!;
      const oneWay = cost[st.y * s.width + st.x];
      if (!Number.isFinite(oneWay)) continue;
      const roundTrip = Math.max(1, 2 * oneWay);
      const capacity = (m.trucks * BALANCE.truckLoad) / roundTrip;
      const moved = Math.min(m.stock, capacity, Math.max(0, yardCap - s.ore));
      if (moved <= 0) continue;
      m.stock -= moved;
      s.ore += moved;
      const total = Object.values(m.mix).reduce((a, b) => a + (b ?? 0), 0) || 1;
      for (const [ore, w] of Object.entries(m.mix) as Array<[Ore, number]>) s.oreMix[ore] = (s.oreMix[ore] ?? 0) + (moved * w) / total;
    }
  }

  // Smelting. Output beyond a resource's tank share is lost as slag.
  const cap = resourceCap(s);
  let smeltable = 0;
  for (const st of smelters) smeltable += BALANCE.smelterOrePerTurn * (st.type === "smelter" ? (st.tier >= 2 ? 1.5 : 1) : 1);
  smeltable = cap > 0 ? Math.min(smeltable, s.ore) : 0;
  if (smeltable > 0) {
    const fraction = smeltable / s.ore;
    for (const ore of ORES) {
      const amount = (s.oreMix[ore] ?? 0) * fraction;
      if (amount <= 0) continue;
      s.oreMix[ore] = (s.oreMix[ore] ?? 0) - amount;
      const out = smeltOre(ore, amount, BALANCE.metalYield, BALANCE.preciousFraction);
      for (const [r, n] of Object.entries(out) as Array<[Processed, number]>) s.stock[r] = Math.max(s.stock[r], Math.min(cap, s.stock[r] + n));
    }
    s.ore -= smeltable;
    report.oreSmelted = smeltable;
  }
  for (const r of PROCESSED) s.stock[r] = Math.round(s.stock[r] * 100) / 100;

  // Food
  const foodBonus = 1 + 0.15 * effectCount(s, "food+");
  let food = 0;
  let domes = 0;
  for (const st of active) {
    if (st.type !== "agridome") continue;
    domes++;
    food += BALANCE.agriFoodPerTurn * [1, 1.5, 2][st.tier - 1] * foodBonus;
  }
  s.items.food = Math.min(s.items.food + food, Math.max(s.items.food, domes * BALANCE.agriStorage + 200));
  report.foodMade = food;

  // Factories
  const mf = moraleFactor(s);
  const robotRoom = () => {
    const factoryCount = countBuilt(s, "factory", "seedFactory");
    const stored = Object.values(s.idleRobots).reduce((a, b) => a + b, 0) + s.trucks;
    return factoryCount * BALANCE.factoryRobotStorage + 10 - stored;
  };
  for (const st of active) {
    const f = st.factory;
    if (!f) continue;
    const product = f.product;
    if (product === "none") continue;
    const spec = FACTORY_PRODUCTS[product];
    if (!spec) continue;
    if (f.progress === 0) {
      if (spec.robot && robotRoom() <= 0) {
        st.idleReason = "output";
        continue;
      }
      if (!canAfford(s, spec.cost)) {
        st.idleReason = "resources";
        continue;
      }
      pay(s, spec.cost);
    }
    const speed = (st.type === "factory" ? [1, 1.25, 1.5][st.tier - 1] : 1) * mf;
    f.progress += speed;
    if (f.progress >= spec.turns) {
      f.progress = 0;
      f.produced += 1;
      if (f.product === "truck") s.trucks += 1;
      else if (f.product === "fuelCells") s.items.fuelCells += 1;
      else if (f.product === "roadMaterial") s.items.roadMaterial += 5;
      else s.idleRobots[f.product as keyof typeof s.idleRobots] += 1;
    }
  }

  // Light industry
  for (const st of active) {
    if (st.type !== "lightIndustry" || !st.light) continue;
    if (warehouseUsed(s) + 3 > warehouseCap(s)) {
      st.idleReason = "output";
      continue;
    }
    const cost: Partial<Record<Processed, number>> = st.light.product === "medicine" ? { MinC: 1, PrecB: 1 } : st.light.product === "luxury" ? { PrecA: 1, MinB: 1 } : { MinA: 2 };
    if (!canAfford(s, cost)) continue;
    pay(s, cost);
    s.items[st.light.product] += BALANCE.lightIndustryPerTurn * (st.tier >= 2 ? 2 : 1);
  }

  // SPEW makes multi-purpose goo from colony waste.
  const spews = countActive(s, "spew");
  if (spews) {
    const residences = countActive(s, "residence");
    s.items.mpg = Math.min(200 * spews, s.items.mpg + Math.min(residences * BALANCE.mpgPerResidence + 2, 10 * spews));
  }

  // Research
  let points = 0;
  let hotPoints = 0;
  const basic = s.turn > BALANCE.basicResearchTurns ? 1 + BALANCE.basicResearchBonus : 1;
  const bonus = basic * (1 + 0.05 * effectCount(s, "research+")) * mf;
  for (const st of active) {
    if (st.type === "lab") points += BALANCE.labPointsPerTurn * st.tier * bonus;
    if (st.type === "hotLab") hotPoints += BALANCE.labPointsPerTurn * (st.tier + 1) * bonus;
  }
  if (s.plague && points + hotPoints > 0) {
    const toCure = Math.min(s.plague.cureNeeded - s.plague.cure, points + hotPoints);
    s.plague.cure += toCure;
    const fromLabs = Math.min(points, toCure);
    points -= fromLabs;
    hotPoints -= toCure - fromLabs;
  }
  if (s.research.current && points > 0) {
    s.research.progress += points;
    const t = TOPIC_BY_ID[s.research.current];
    if (s.research.progress >= t.cost) completeTopic(s, t.id, false);
  } else if (!s.research.current && points > 0 && s.research.hotCurrent) {
    hotPoints += points * 0.5;
  }
  if (s.research.hotCurrent && hotPoints > 0) {
    s.research.hotProgress += hotPoints;
    const t = TOPIC_BY_ID[s.research.hotCurrent];
    if (s.research.hotProgress >= t.cost) completeTopic(s, t.id, true);
  } else if (!s.research.hotCurrent && hotPoints > 0 && s.research.current) {
    s.research.progress += hotPoints;
    const t = TOPIC_BY_ID[s.research.current];
    if (s.research.progress >= t.cost) completeTopic(s, t.id, false);
  }
  report.research = points + hotPoints;

  // Terraforming
  const tf = countActive(s, "terraform");
  if (tf) s.terraform = Math.min(100, s.terraform + tf * BALANCE.terraformPerFacility * planet.terraform);

  // Starship assembly at the spaceport.
  if (s.story.flags.arkProgram && !starshipBlocked(s) && s.starship.components < BALANCE.starshipComponents) {
    if (s.starship.progress === 0) {
      if (canAfford(s, STARSHIP_COMPONENT_COST)) {
        pay(s, STARSHIP_COMPONENT_COST);
        s.starship.progress = 0.001;
      }
    } else {
      s.starship.progress += 1;
      if (s.starship.progress >= BALANCE.starshipComponentTurns) {
        s.starship.progress = 0;
        s.starship.components += 1;
        log(s, `Ark component ${s.starship.components} of ${BALANCE.starshipComponents} is in orbit.`, "good");
      }
    }
  }
}

function completeTopic(s: GameState, id: string, hot: boolean) {
  const t = TOPIC_BY_ID[id];
  s.research.done = [...s.research.done, id];
  if (hot) {
    s.research.hotCurrent = null;
    s.research.hotProgress = 0;
  } else {
    s.research.current = null;
    s.research.progress = 0;
  }
  s.moraleBoost += BALANCE.moraleResearchGain;
  log(s, `Research complete: ${t.name}. ${t.desc}`, "good");
  if (t.effects?.includes("ledger")) {
    if (!s.story.evidenceSeen.includes(`research:${id}`)) {
      s.story.evidenceSeen.push(`research:${id}`);
      s.story.evidence += 1;
      log(s, `${t.name} exposed a discrepancy in the ship's accounts. The Ledger grows.`, "story");
    }
  }
  if (t.effects?.includes("plague-cure") && s.plague) s.plague.cure = s.plague.cureNeeded;
}

export const FACTORY_PRODUCTS: Record<Exclude<FactoryProduct, "none">, { name: string; turns: number; cost: Partial<Record<Processed, number>>; robot?: boolean }> = {
  dozer: { name: "Robodozer", turns: BALANCE.robotBuildTurns, cost: { MetalA: 8, MetalB: 10, PrecA: 2 }, robot: true },
  digger: { name: "Robodigger", turns: BALANCE.robotBuildTurns, cost: { MetalA: 8, MetalB: 10, PrecA: 2 }, robot: true },
  miner: { name: "Robominer", turns: BALANCE.robotBuildTurns, cost: { MetalA: 8, MetalB: 10, PrecA: 2 }, robot: true },
  explorer: { name: "Roboexplorer", turns: BALANCE.robotBuildTurns, cost: { MetalA: 10, MetalC: 5, PrecA: 2 }, robot: true },
  truck: { name: "Truck", turns: BALANCE.truckBuildTurns, cost: { MetalA: 10, MetalB: 10, MetalD: 5 }, robot: true },
  fuelCells: { name: "Fuel Cell", turns: BALANCE.fuelCellBuildTurns, cost: { FusionA: 5, MinA: 2 } },
  roadMaterial: { name: "Road Material (5)", turns: 3, cost: { MinA: 10, MinB: 5 } },
  repairbot: { name: "Repairbot", turns: BALANCE.robotBuildTurns, cost: { MetalA: 15, PrecA: 5, PrecB: 3 }, robot: true },
  airbot: { name: "Airbot", turns: BALANCE.robotBuildTurns, cost: { MetalA: 15, MetalC: 10, PrecA: 5 }, robot: true },
  humanoid: { name: "Humanoid Worker", turns: 8, cost: { MetalA: 20, PrecA: 10, PrecB: 10 }, robot: true },
};

/** Multi-source Dijkstra from smelters; cost is turns per tile by terrain and roads. */
function travelCost(s: GameState, sources: Structure[]): Float64Array {
  const n = s.width * s.height;
  const dist = new Float64Array(n).fill(Infinity);
  const speed = BALANCE.truckTilesPerTurn;
  const tileCost = (x: number, y: number) => {
    const t = s.levels[0][y][x];
    if (t.structure !== undefined) {
      const st = s.structures[t.structure];
      if (st.type === "road" && st.state === "active") return 1 / speed.paved;
      if (st.type === "monorail" && st.state === "active") return 1 / 10;
    }
    if (t.terrain === "impassable") return Infinity;
    if (t.dozed) return 1 / speed.dirt;
    if (t.terrain === "clear") return 1 / speed.clear;
    if (t.terrain === "rough") return 1 / speed.rough;
    return 1 / 0.5;
  };
  const heap: Array<[number, number]> = [];
  const push = (d: number, i: number) => {
    heap.push([d, i]);
    let k = heap.length - 1;
    while (k > 0) {
      const p = (k - 1) >> 1;
      if (heap[p][0] <= heap[k][0]) break;
      [heap[p], heap[k]] = [heap[k], heap[p]];
      k = p;
    }
  };
  const pop = (): [number, number] => {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      let k = 0;
      for (;;) {
        const l = 2 * k + 1;
        const r = l + 1;
        let m = k;
        if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
        if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
        if (m === k) break;
        [heap[m], heap[k]] = [heap[k], heap[m]];
        k = m;
      }
    }
    return top;
  };
  for (const st of sources) {
    const i = st.y * s.width + st.x;
    dist[i] = 0;
    push(0, i);
  }
  while (heap.length) {
    const [d, i] = pop();
    if (d > dist[i]) continue;
    const x = i % s.width;
    const y = (i - x) / s.width;
    for (const [dx, dy] of NEIGHBORS4) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= s.width || ny >= s.height) continue;
      const c = tileCost(nx, ny);
      if (!Number.isFinite(c)) continue;
      const j = ny * s.width + nx;
      const nd = d + c;
      if (nd < dist[j]) {
        dist[j] = nd;
        push(nd, j);
      }
    }
  }
  return dist;
}

function lifeSupport(s: GameState, report: TurnReport) {
  const pop = population(s);
  if (!s.colonistsLanded || pop === 0) return;
  const eaten = pop / BALANCE.colonistsPerFood;
  report.foodEaten = eaten;
  if (s.items.food >= eaten) s.items.food -= eaten;
  else {
    const unfed = 1 - s.items.food / eaten;
    s.items.food = 0;
    const deaths = stochasticRound(s, pop * unfed * 0.06);
    if (deaths > 0) {
      kill(s, deaths, report);
      log(s, `${deaths} colonists starved. Build more AgriDomes.`, "bad");
      s.moraleBoost -= 20;
    }
  }
  if (!report.atmosphere) {
    if (s.air >= pop) s.air -= pop;
    else {
      s.air = 0;
      const deaths = stochasticRound(s, pop * 0.12);
      if (deaths > 0) {
        kill(s, deaths, report);
        log(s, `${deaths} colonists suffocated. The colony needs a working CHAP.`, "bad");
        s.moraleBoost -= 40;
      }
    }
  }
}

/** Removes colonists across age groups in proportion to their size. */
function kill(s: GameState, n: number, report: TurnReport) {
  const groups = ["retired", "workers", "scientists", "students", "children"] as const;
  let left = Math.min(n, population(s));
  report.deaths += left;
  s.stats.deaths += left;
  const total = population(s);
  for (const g of groups) {
    if (left <= 0) break;
    const take = Math.min(s.pop[g], Math.ceil((n * s.pop[g]) / Math.max(1, total)), left);
    s.pop[g] -= take;
    left -= take;
  }
  for (const g of groups) {
    if (left <= 0) break;
    const take = Math.min(s.pop[g], left);
    s.pop[g] -= take;
    left -= take;
  }
}

function populationStep(s: GameState, report: TurnReport) {
  const p = s.pop;
  const pop = population(s);
  if (pop === 0) return;
  const planet = PLANET_BY_ID[s.planetId];
  const mood = Math.max(0.2, Math.min(1.4, s.morale / 600));
  const cap = housing(s);
  const crowd = cap > 0 ? pop / cap : 3;
  const adults = p.workers + p.scientists;

  const rate = (s.turn <= BALANCE.fertileTurns ? BALANCE.birthRateEarly : BALANCE.birthRateLate) * (1 + 0.1 * effectCount(s, "births+")) * (countActive(s, "redLight") ? 1.1 : 1);
  const births = stochasticRound(s, adults * rate * mood * (crowd > 2 ? 0.4 : crowd > 1 ? 0.8 : 1));
  p.children += births;
  report.births = births;
  s.stats.births += births;

  const grow = stochasticRound(s, p.children / BALANCE.childTurns);
  p.children -= grow;
  p.students += grow;
  const uniCap = countActive(s, "university") * BALANCE.universityCapacity * (hasEffect(s, "school+") ? 1.5 : 1);
  const graduates = stochasticRound(s, p.students / BALANCE.studentTurns);
  p.students -= graduates;
  const sciShare = uniCap > 0 ? Math.min(0.7, 0.2 + uniCap / Math.max(1, p.students + graduates)) : 0.08;
  const sci = stochasticRound(s, graduates * sciShare);
  p.scientists += sci;
  p.workers += graduates - sci;

  // When workers run out, students step in (manual: Why People Die).
  if (p.workers < 1 && p.students > 0) {
    const n = Math.min(p.students, 5);
    p.students -= n;
    p.workers += n;
  }

  const retireW = stochasticRound(s, p.workers * BALANCE.retireRate);
  const retireS = stochasticRound(s, p.scientists * BALANCE.retireRate);
  p.workers -= retireW;
  p.scientists -= retireS;
  p.retired += retireW + retireS;

  const medical = countActive(s, "medical");
  const medFactor = 1 / (1 + 0.3 * Math.min(3, medical) + 0.1 * effectCount(s, "deaths-") + 0.1 * effectCount(s, "lifespan"));
  const early = s.turn <= BALANCE.fertileTurns ? BALANCE.deathRateEarlyMultiplier : 1;
  const hostile = 1 + 0.4 * planet.hostility + 0.25 * difficultyOf(s).hostilityShift;
  const moodDeath = 1.6 - Math.min(1.2, mood);
  const elder = stochasticRound(s, p.retired * BALANCE.elderDeathRate * medFactor);
  p.retired -= elder;
  const base = stochasticRound(s, (pop - p.retired) * BALANCE.deathRateBase * early * hostile * moodDeath * medFactor);
  report.deaths += elder;
  s.stats.deaths += elder;
  if (base > 0) kill(s, base, report);
  if (report.deaths > 0) log(s, `${s.colonyName} has lost ${report.deaths} colonist${report.deaths > 1 ? "s" : ""}.`, "warn");
  if (births > 0) log(s, `${births} birth${births > 1 ? "s" : ""} this turn.`, "good");
  s.moraleBoost += births * BALANCE.moraleBirthGain - report.deaths * BALANCE.moraleDeathHit;

  // Defection and immigration (manual, Morale).
  if (s.rebels.population > 0 || s.morale < BALANCE.defectionMorale) {
    if (s.morale < BALANCE.defectionMorale && pop > 5) {
      const n = stochasticRound(s, pop * 0.01 * (1 + (BALANCE.defectionMorale - s.morale) / 100));
      const moved = Math.min(n, p.workers);
      if (moved > 0) {
        p.workers -= moved;
        s.rebels.population += moved;
        log(s, `${moved} colonists defected to Free Berth.`, "bad");
      }
    } else if (s.morale > BALANCE.immigrationMorale && s.rebels.population > 5) {
      const n = Math.min(s.rebels.population, stochasticRound(s, s.rebels.population * 0.01 + 0.5));
      if (n > 0) {
        s.rebels.population -= n;
        p.workers += n;
        log(s, `${n} people left Free Berth to join ${s.colonyName}.`, "good");
      }
    }
  }
}

function moraleStep(s: GameState, report: TurnReport) {
  const pop = population(s);
  const factors: Array<[string, number]> = [];
  const add = (name: string, v: number) => {
    if (Math.abs(v) >= 0.5) factors.push([name, Math.round(v)]);
  };
  const planet = PLANET_BY_ID[s.planetId];
  let buildingPoints = 0;
  for (const st of structures(s)) if (st.state === "active" && !BUILDINGS[st.type].passive) buildingPoints += moraleEffect(st.type, st.tier);
  const scale = Math.max(1, pop / 100);
  add("Facilities", Math.max(-250, Math.min(250, (buildingPoints * BALANCE.moralePerBuildingPoint) / Math.sqrt(scale))));

  const cap = housing(s);
  const occupancy = cap > 0 ? pop / cap : pop > 0 ? 3 : 0;
  if (occupancy > BALANCE.occupancyMoraleLimit / 100) add("Overcrowding", -150 - (occupancy - 2) * 100);
  else if (occupancy > 1) add("Crowding", -(occupancy - 1) * 80);
  else if (pop > 0) add("Housing", 20);

  if (report.foodMade < report.foodEaten * 0.95 && s.items.food < report.foodEaten * 5) add("Food shortage", -120);
  if (s.colonistsLanded && !report.atmosphere) add("No CHAP", -60);

  const commercial = countActive(s, "commercial");
  let luxuryUsed = 0;
  if (commercial && s.items.luxury > 0) {
    luxuryUsed = Math.min(s.items.luxury, commercial * BALANCE.commercialLuxuryDraw);
    s.items.luxury -= luxuryUsed;
  }
  const red = countActive(s, "redLight");
  if (red && s.items.luxury > 0) s.items.luxury -= Math.min(s.items.luxury, red * BALANCE.redLightLuxuryDraw);
  if (luxuryUsed) add("Luxuries", Math.min(200, (luxuryUsed * BALANCE.moralePerLuxury * 4) / Math.sqrt(scale)));
  if (s.items.clothing > 0 && pop > 0) {
    s.items.clothing -= Math.min(s.items.clothing, pop / 200);
    add("Clothing", 25);
  }

  add("Crime", -s.crime * 2);
  add("Planet hostility", -(planet.hostility + difficultyOf(s).hostilityShift) * BALANCE.moraleHostilityPenalty);
  add("Culture & research", effectCount(s, "morale+") * 20);
  if (s.terraform > 0) add("Terraforming", s.terraform * 2);
  const robotsWorking = Object.keys(s.robots).length;
  if (pop > 0 && robotsWorking === 0 && s.idleRobots.dozer + s.idleRobots.digger === 0) add("Menial labor", -30);
  if (s.plague) add("Plague", -100);
  const t = s.story.trust;
  add("Factions", ((t.faculty + t.crews + t.wardens + t.board) / 4 - 50) * 1.5);
  if (s.story.flags.contractsHonored) add("Sealed contracts", -40);

  const target = Math.max(0, Math.min(BALANCE.moraleMax, 500 + factors.reduce((a, [, v]) => a + v, 0)));
  report.moraleTarget = target;
  report.moraleFactors = factors;
  s.morale += (target - s.morale) * BALANCE.moraleApproach + s.moraleBoost;
  s.moraleBoost *= 0.25;
  if (Math.abs(s.moraleBoost) < 1) s.moraleBoost = 0;
  s.morale = Math.max(0, Math.min(BALANCE.moraleMax, s.morale));
}

function crimeStep(s: GameState) {
  const pop = population(s);
  const raw = (pop / 25) * (1.3 - s.morale / 1000) + countActive(s, "redLight") * 4;
  const policing = (countActive(s, "police") + countActive(s, "ugPolice")) * BALANCE.crimePerPolice * (hasEffect(s, "police+") ? 1.4 : 1);
  s.crime = Math.max(0, Math.min(100, s.crime + (Math.max(0, raw - policing) - s.crime) * 0.2));
  // Manual: high crime spawns Red Light Districts in residential areas.
  if (s.crime > BALANCE.redLightCrime && chance(s, 0.03)) {
    const res = structures(s).filter((st) => st.type === "residence" && st.state === "active");
    if (res.length) {
      const st = pick(s, res);
      st.type = "redLight";
      st.tier = 1;
      log(s, "Crime has turned a residential block into a Red Light District.", "warn");
    }
  }
}

function breakdowns(s: GameState) {
  const repairers = countActive(s, "roboCommand") + countActive(s, "command") + countActive(s, "seedCommand") + s.idleRobots.repairbot;
  const sociology = hasEffect(s, "breakdown-") ? 0.6 : 1;
  for (const st of structures(s)) {
    const def = BUILDINGS[st.type];
    if (st.state === "broken") {
      if (repairers === 0) continue;
      if (st.repairLeft === undefined) {
        // Without parts in storage, crews scavenge and the repair takes twice as long.
        const cost = Object.fromEntries(Object.entries(buildCost(st.type, st.tier)).map(([r, n]) => [r, Math.ceil((n ?? 0) * BALANCE.repairCostFraction)]));
        if (canAfford(s, cost)) {
          pay(s, cost);
          st.repairLeft = BALANCE.repairTurns;
        } else st.repairLeft = BALANCE.repairTurns * 2;
      }
      st.repairLeft -= 1;
      if (st.repairLeft <= 0) {
        st.state = "active";
        delete st.repairLeft;
        log(s, `${def.name} repaired.`, "good");
      }
      continue;
    }
    if (st.state !== "active" || def.breakdown === 0) continue;
    let p = def.breakdown * BALANCE.breakdownScale * sociology;
    if (st.type === "tokamak" && hasEffect(s, "tokamak-safe")) p *= 0.5;
    if (chance(s, p)) {
      st.state = "broken";
      log(s, `${def.name} has broken down.`, "warn");
    }
  }
}

function disasters(s: GameState) {
  const d = difficultyOf(s).disaster;
  if (s.turn < BALANCE.disasterGraceTurns || d === 0 || !chance(s, d * 10)) return;
  const planet = PLANET_BY_ID[s.planetId];
  const w = planet.disasters;
  const roll = nextRandom(s) * (w.meteor + w.quake + w.storm + w.vent);
  const kind = roll < w.meteor ? "meteor" : roll < w.meteor + w.quake ? "quake" : roll < w.meteor + w.quake + w.storm ? "storm" : "vent";
  const radius = { meteor: 1, quake: 3, storm: 4, vent: 1 }[kind];
  const x = s.center.x + randInt(s, -12, 12);
  const y = s.center.y + randInt(s, -12, 12);
  let warned = 0;
  if (kind === "storm" && (s.satellites.includes("weatherSat") || hasEffect(s, "sat:weathersat"))) warned += 0.35;
  if (kind === "meteor" && s.satellites.includes("meteorsat")) warned += 0.35;
  warned += 0.08 * effectCount(s, "warning");
  if (kind === "quake") warned += 0.25 * effectCount(s, "quake-");
  const shelter = s.story.flags.stormShelter;
  if (kind === "storm" && typeof shelter === "number" && s.turn <= shelter) warned += 0.3;
  const dirt = structures(s).filter((st) => st.type === "dirt" && st.state === "active");
  const names = { meteor: "A meteor strike", quake: "An earthquake", storm: "A terminator storm", vent: "A volcanic vent eruption" };
  let damaged = 0;
  for (const st of structures(s)) {
    const level = kind === "quake" ? st.level : 0;
    if (st.level !== level || distance(st, { x, y }) > radius) continue;
    if (st.type === "seedLander" || st.type === "ugShaft") continue;
    if (st.state === "destroyed") continue;
    if (kind !== "quake" && st.level > 0) continue;
    const protectedBy = dirt.some((dd) => distance(dd, st) <= 5);
    let p = 0.55 * (1 - Math.min(0.8, warned)) * (protectedBy ? 0.4 : 1);
    if (BUILDINGS[st.type].passive) p *= 0.5;
    if (!chance(s, p)) continue;
    damaged++;
    const seedUnit = BUILDINGS[st.type].category === "seed";
    if (!seedUnit && chance(s, 0.45)) st.state = "destroyed";
    else if (st.state !== "building") st.state = "broken";
  }
  const pop = population(s);
  const deaths = stochasticRound(s, Math.min(pop, damaged * 1.5 * (countActive(s, "medical") ? 0.5 : 1)));
  if (deaths) kill(s, deaths, blankReport());
  s.moraleBoost -= 30 + damaged * 5;
  if (kind === "vent" && hasEffect(s, "unlock:geothermal")) s.story.flags.ventSeen = true;
  log(s, `${names[kind]} hit near (${x}, ${y}). ${damaged} structure${damaged === 1 ? "" : "s"} damaged${deaths ? `, ${deaths} dead` : ""}.`, "bad");
}

function plagueStep(s: GameState, report: TurnReport) {
  const pop = population(s);
  if (!s.plague) {
    if (pop < 20 || s.turn < 30) return;
    const p = difficultyOf(s).plague * Math.pow(0.75, effectCount(s, "plague-chance-")) * (1 + PLANET_BY_ID[s.planetId].hostility * 0.3);
    if (!chance(s, p)) return;
    const medical = countActive(s, "medical") > 0;
    let need = BALANCE.plagueCureLabTurns * Math.max(1, Math.round(pop / 150));
    if (hasEffect(s, "plague-half")) need = Math.ceil(need / 2);
    s.plague = { turnsLeft: medical ? BALANCE.plagueWindowMedical : BALANCE.plagueWindow, cure: 0, cureNeeded: need };
    if (hasEffect(s, "plague-cure")) s.plague.cure = need;
    log(s, `Plague! Labs must research an antidote within ${s.plague.turnsLeft} turns.`, "bad");
    return;
  }
  const pl = s.plague;
  if (pl.cure >= pl.cureNeeded) {
    log(s, "An antidote has been found. The plague is over.", "good");
    s.plague = null;
    s.moraleBoost += 40;
    return;
  }
  pl.turnsLeft -= 1;
  const sick = stochasticRound(s, pop * 0.004 * (s.items.medicine > 0 ? 0.5 : 1));
  if (s.items.medicine > 0) s.items.medicine = Math.max(0, s.items.medicine - 2);
  if (sick) kill(s, sick, report);
  if (pl.turnsLeft <= 0) {
    const lethal = BALANCE.plagueLethality * (countActive(s, "medical") ? 0.6 : 1);
    const dead = stochasticRound(s, population(s) * lethal * 0.5);
    kill(s, dead, report);
    log(s, `The plague ran its course untreated. ${dead} colonists died.`, "bad");
    s.plague = null;
    s.moraleBoost -= 150;
  }
}

function rebelStep(s: GameState) {
  const r = s.rebels;
  if (r.population <= 0) return;
  r.population += r.population * 0.003 * (r.morale / 600);
  for (const res of ["MetalA", "MetalB", "MinA", "MinB", "FusionA", "PrecA"] as Processed[]) {
    r.stock[res] = Math.min(2000, (r.stock[res] ?? 0) + r.population / 60);
  }
  const drift = s.morale < 400 ? 0.3 : s.morale > 700 ? -0.3 : 0;
  r.hostility = Math.max(0, Math.min(100, r.hostility + drift + (difficultyOf(s).hostilityShift * 0.05)));
  if (r.hostility > 70 && chance(s, 0.02 + (r.hostility - 70) / 1000)) {
    const targets = structures(s).filter((st) => st.state === "active" && st.level === 0 && !BUILDINGS[st.type].passive && !st.type.startsWith("seed"));
    if (targets.length) {
      const st = pick(s, targets);
      st.state = "broken";
      log(s, `Saboteurs from Free Berth damaged the ${BUILDINGS[st.type].name}.`, "bad");
      s.moraleBoost -= 20;
    }
  }
}

function storyStep(s: GameState) {
  if (s.story.pending || s.turn < s.story.nextEvent) return;
  const candidates = EVENTS.filter((e) => (e.repeatable || !s.story.history.includes(e.id)) && e.when(s));
  if (!candidates.length) {
    s.story.nextEvent = s.turn + 3;
    return;
  }
  // Earliest-defined unseen events take precedence so the narrative advances in order.
  const unseen = candidates.filter((e) => !s.story.history.includes(e.id));
  const ev = unseen.length ? unseen[0] : pick(s, candidates);
  s.story.pending = { id: ev.id, turn: s.turn };
  s.story.nextEvent = s.turn + randInt(s, 12, 25);
}

function checkEndings(s: GameState) {
  if (s.ending) return;
  const pop = population(s);
  if (s.colonistsLanded && pop === 0 && s.orbit.colonists === 0) {
    s.ending = { id: "ghostTown", turn: s.turn, won: false };
    log(s, ENDINGS.ghostTown.title, "story");
    return;
  }
  if (s.colonistsLanded && pop === 0 && s.orbit.colonistLanders === 0) {
    s.ending = { id: "ghostTown", turn: s.turn, won: false };
    log(s, ENDINGS.ghostTown.title, "story");
    return;
  }
  if (s.terraform >= 100) {
    s.ending = { id: "greenHorizon", turn: s.turn, won: true };
    log(s, ENDINGS.greenHorizon.title, "story");
  }
}
