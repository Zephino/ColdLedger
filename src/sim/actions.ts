import { BALANCE } from "../data/balance";
import { BUILDINGS, buildCost, type BuildingId } from "../data/buildings";
import { CARGO_BY_ID } from "../data/cargo";
import { PLANET_BY_ID } from "../data/planets";
import { SPACE_PROGRAM_KEYS, TOPIC_BY_ID } from "../data/research";
import type { Processed } from "../data/resources";
import { ENDINGS, EVENT_BY_ID } from "../data/story";
import {
  activeRobots,
  canAfford,
  checkPlacement,
  computeConnectivity,
  countActive,
  countBuilt,
  difficultyOf,
  hasEffect,
  log,
  maxTier,
  pay,
  population,
  refund,
  robotCap,
  structureCost,
} from "./colony";
import { NEIGHBORS4, distance } from "./map";
import { addStructure } from "./newGame";
import type { Direction, FactoryProduct, GameState, LightProduct, RobotKind, RobotTask, SatelliteId } from "./types";

export interface ActionResult {
  ok: boolean;
  reason?: string;
}

const fail = (reason: string): ActionResult => ({ ok: false, reason });
const OK: ActionResult = { ok: true };

export function placeStructure(s: GameState, id: BuildingId, level: number, x: number, y: number): ActionResult {
  const check = checkPlacement(s, id, level, x, y);
  if (!check.ok) return check;
  const tier = maxTier(s, id);
  pay(s, structureCost(s, id, tier));
  if (id === "road") s.items.roadMaterial -= 1;
  const st = addStructure(s, id, level, x, y, false, tier);
  if (hasEffect(s, "build+")) st.buildLeft = Math.max(1, Math.round(st.buildLeft * Math.pow(0.75, Math.min(2, countBuildBonus(s)))));
  computeConnectivity(s);
  return OK;
}

function countBuildBonus(s: GameState) {
  return s.research.done.filter((t) => TOPIC_BY_ID[t]?.effects?.includes("build+")).length;
}

export interface RobotOrder {
  dir?: Direction;
  rect?: [number, number, number, number];
  selfDestruct?: boolean;
}

export function robotTaskFor(s: GameState, kind: RobotKind, level: number, x: number, y: number, order: RobotOrder = {}): RobotTask | string {
  const tile = s.levels[level]?.[y]?.[x];
  if (!tile) return "Off the map.";
  const here = tile.structure !== undefined ? s.structures[tile.structure] : undefined;
  if (kind === "dozer" || kind === "airbot") {
    const [x0, y0, x1, y1] = order.rect ?? [x, y, x, y];
    const tiles: Array<[number, number]> = [];
    for (let ty = Math.min(y0, y1); ty <= Math.max(y0, y1); ty++) {
      for (let tx = Math.min(x0, x1); tx <= Math.max(x0, x1); tx++) {
        const t = s.levels[level][ty]?.[tx];
        if (!t || t.dozed || t.structure !== undefined || t.beacon) continue;
        if (level === 0 && t.terrain === "impassable") continue;
        if (level > 0 && !t.dug) continue;
        tiles.push([tx, ty]);
      }
    }
    if (!tiles.length) return "Nothing to bulldoze there.";
    return { kind: "doze", tiles };
  }
  if (kind === "digger") {
    if (order.selfDestruct) return { kind: "selfDestruct" };
    if (level === 0) {
      if (here && here.type !== "airShaft") return "Tile occupied.";
      if (here?.type === "airShaft") return "There is already an air shaft here.";
      if (tile.terrain === "impassable" || tile.beacon) return "Cannot dig here.";
      if (PLANET_BY_ID[s.planetId].digDepth < 1) return "This world cannot be dug.";
      return { kind: "shaft" };
    }
    if (here?.type === "ugShaft") {
      if (level >= PLANET_BY_ID[s.planetId].digDepth) return "Maximum digging depth reached.";
      if (s.levels[level + 1][y][x].structure !== undefined) return "This shaft already reaches the next level.";
      return { kind: "shaft" };
    }
    if (!tile.dug) return "Place the digger on an excavated tile.";
    if (here) return "Tile occupied.";
    if (!order.dir) return "Choose a digging direction.";
    return { kind: "dig", dir: order.dir };
  }
  if (kind === "miner") {
    if (level !== 0) return "Robominers work on the surface.";
    if (here?.type === "mine") {
      const max = Math.min(BALANCE.maxMiningLevels, PLANET_BY_ID[s.planetId].digDepth);
      if ((here.mine?.levels ?? 1) >= max) return "This mine is as deep as it can go.";
      if (here.state === "building") return "Mine still under construction.";
      return { kind: "deepen", structure: here.id };
    }
    if (!tile.beacon) return "Place the robominer on a mining beacon.";
    if (!tile.beacon.known) return "No confirmed deposit here.";
    if (here) return "Tile occupied.";
    return { kind: "mine" };
  }
  if (kind === "explorer") {
    if (level !== 0) return "Explorers work on the surface.";
    if (tile.terrain === "impassable") return "Impassable terrain.";
    return { kind: "explore", radius: 8 };
  }
  return "This robot works on its own.";
}

export function placeRobot(s: GameState, kind: RobotKind, level: number, x: number, y: number, order: RobotOrder = {}): ActionResult {
  if (s.idleRobots[kind] < 1) return fail("No robot of that type is available.");
  if (activeRobots(s) >= robotCap(s)) return fail("Robot control capacity reached. Build a Robot Command.");
  const tile = s.levels[level]?.[y]?.[x];
  if (!tile) return fail("Off the map.");
  if (tile.robot !== undefined) return fail("A robot is already working here.");
  if (distance(s.center, { x, y }) > BALANCE.colonyRadius + 8) return fail("Too far from the colony.");
  const task = robotTaskFor(s, kind, level, x, y, order);
  if (typeof task === "string") return fail(task);
  const id = s.nextId++;
  let turns = 1;
  if (task.kind === "doze") turns = dozeTurns(s, level, task.tiles[0][0], task.tiles[0][1]);
  if (task.kind === "shaft") turns = BALANCE.shaftTurns;
  if (task.kind === "dig") turns = BALANCE.digTurns * (hasEffect(s, "dig+") ? 0.67 : 1);
  if (task.kind === "selfDestruct") turns = 1;
  if (task.kind === "mine") turns = 1;
  if (task.kind === "deepen") turns = 7;
  if (task.kind === "explore") turns = 10;
  s.robots[id] = { id, kind, level, x, y, task, turnsLeft: Math.max(1, Math.round(turns)), fuel: BALANCE.fuelCellLife * (hasEffect(s, "fuel+") ? 1.5 : 1) };
  s.idleRobots[kind] -= 1;
  tile.robot = id;
  if (task.kind === "mine" && tile.beacon) {
    const st = addStructure(s, "mine", 0, x, y, false);
    st.mine = {
      mix: { ...tile.beacon.mix },
      richness: tile.beacon.richness,
      levels: 1,
      life: Math.round(BALANCE.mineLifeMin + (BALANCE.mineLifeMax - BALANCE.mineLifeMin) * Math.min(1, tile.beacon.richness / 1.6)),
      extracted: 0,
      stock: 0,
      trucks: 0,
    };
    s.robots[id].turnsLeft = st.buildLeft;
  }
  return OK;
}

export function dozeTurns(s: GameState, level: number, x: number, y: number): number {
  const t = s.levels[level][y][x];
  const d = BALANCE.dozeTurns;
  if (level > 0) return t.terrain === "diff" ? d.ugDiff : d.ugEasy;
  if (t.terrain === "rough") return d.rough;
  if (t.terrain === "hostile") return d.hostile;
  return d.clear;
}

export function recallRobot(s: GameState, robotId: number): ActionResult {
  const r = s.robots[robotId];
  if (!r) return fail("No such robot.");
  const tile = s.levels[r.level][r.y][r.x];
  if (tile.robot === r.id) delete tile.robot;
  if (r.task.kind === "mine") return fail("The robominer is building a mine.");
  delete s.robots[robotId];
  s.idleRobots[r.kind] += 1;
  return OK;
}

export function landLander(s: GameState, kind: "colonist" | "cargo", x: number, y: number): ActionResult {
  if (countBuilt(s, "seedCommand") === 0 && countBuilt(s, "command") === 0) return fail("Landers wait for the Seed Command Facility.");
  const tile = s.levels[0][y]?.[x];
  if (!tile) return fail("Off the map.");
  if (tile.structure !== undefined || tile.robot !== undefined) return fail("Tile occupied.");
  if (tile.terrain === "impassable" || tile.beacon) return fail("Cannot land there.");
  if (distance(s.center, { x, y }) > BALANCE.colonyRadius) return fail("Outside the colony radius.");
  if (kind === "colonist") {
    if (s.orbit.colonistLanders < 1 || s.orbit.colonists < 1) return fail("No colonist landers or colonists left in orbit.");
    const n = Math.min(50, s.orbit.colonists);
    s.orbit.colonistLanders -= 1;
    s.orbit.colonists -= n;
    const scientists = Math.round(n * 0.2);
    const children = Math.round(n * 0.1);
    const students = Math.round(n * 0.06);
    s.pop.scientists += scientists;
    s.pop.children += children;
    s.pop.students += students;
    s.pop.workers += n - scientists - children - students;
    addStructure(s, "colonistLander", 0, x, y, true);
    if (!s.colonistsLanded) {
      s.colonistsLanded = true;
      log(s, "The first colonists are on the ground. Build a CHAP before their air runs out.", "story");
    } else log(s, `${n} more colonists have landed.`, "good");
    return OK;
  }
  if (s.orbit.cargoLanders < 1) return fail("No cargo landers left in orbit.");
  s.orbit.cargoLanders -= 1;
  let room = 20;
  const unloaded: string[] = [];
  const take = (key: "lifeSupport" | "food" | "tokamak" | "solarReceiver", weight: number) => {
    let n = 0;
    while (s.orbit[key] > 0 && room >= weight) {
      s.orbit[key] -= 1;
      room -= weight;
      n++;
    }
    return n;
  };
  const ls = take("lifeSupport", CARGO_BY_ID.lifeSupport.weight);
  const food = take("food", CARGO_BY_ID.food.weight);
  const tok = take("tokamak", CARGO_BY_ID.tokamak.weight);
  const rec = take("solarReceiver", CARGO_BY_ID.solarReceiver.weight);
  s.air += ls * BALANCE.cargoAirPersonTurns;
  s.items.food += food * BALANCE.cargoFoodUnits;
  s.kits.shipTokamak += tok;
  s.kits.solarReceiver += rec;
  if (ls) unloaded.push(`${ls} life support`);
  if (food) unloaded.push(`${food} food`);
  if (tok) unloaded.push("a Tokamak reactor");
  if (rec) unloaded.push(`${rec} solar receiver${rec > 1 ? "s" : ""}`);
  addStructure(s, "cargoLander", 0, x, y, true);
  log(s, unloaded.length ? `Cargo lander unloaded ${unloaded.join(", ")}.` : "The cargo lander was empty.", "good");
  return OK;
}

export function placeKit(s: GameState, kit: "shipTokamak" | "solarReceiver", x: number, y: number): ActionResult {
  if (s.kits[kit] < 1) return fail("No kit available.");
  const tile = s.levels[0][y]?.[x];
  if (!tile) return fail("Off the map.");
  if (tile.structure !== undefined) return fail("Tile occupied.");
  if (!tile.dozed) return fail("Bulldoze first.");
  const touches = NEIGHBORS4.some(([dx, dy]) => {
    const n = s.levels[0][y + dy]?.[x + dx];
    const other = n?.structure !== undefined ? s.structures[n.structure] : undefined;
    return other && (other.type === "tube" || other.type === "seedLander");
  });
  if (!touches) return fail("Must sit beside a tube.");
  s.kits[kit] -= 1;
  addStructure(s, kit, 0, x, y, false);
  computeConnectivity(s);
  return OK;
}

export function demolish(s: GameState, structureId: number): ActionResult {
  const st = s.structures[structureId];
  if (!st) return fail("Nothing there.");
  if (st.type === "seedLander" || st.type === "airShaft" || st.type === "ugShaft") return fail("That cannot be bulldozed.");
  if (st.type.startsWith("seed") && st.state !== "destroyed") return fail("The seed units cannot be bulldozed.");
  if (countActive(s, "spew") > 0 && st.state !== "destroyed") {
    refund(s, buildCost(st.type, st.tier), BALANCE.recycleFraction);
  }
  const tile = s.levels[st.level][st.y][st.x];
  delete tile.structure;
  tile.dozed = true;
  delete s.structures[structureId];
  computeConnectivity(s);
  log(s, `${BUILDINGS[st.type].name} bulldozed.`);
  return OK;
}

export function toggleDisabled(s: GameState, structureId: number): ActionResult {
  const st = s.structures[structureId];
  if (!st) return fail("Nothing there.");
  st.disabled = !st.disabled;
  return OK;
}

export function setFactoryProduct(s: GameState, structureId: number, product: FactoryProduct): ActionResult {
  const st = s.structures[structureId];
  if (!st?.factory) return fail("Not a factory.");
  if (st.type === "seedFactory" && !["none", "dozer", "digger", "miner", "explorer", "truck"].includes(product)) return fail("The seed factory only builds robots and trucks.");
  if (product === "repairbot" && !hasEffect(s, "robot:repairbot")) return fail("Requires Repairbots research.");
  if (product === "airbot" && !hasEffect(s, "robot:airbot")) return fail("Requires Airbots research.");
  if (product === "humanoid" && !hasEffect(s, "robot:humanoid")) return fail("Requires Humanoid Workers research.");
  if (st.factory.product !== product) st.factory.progress = 0;
  st.factory.product = product;
  return OK;
}

export function setLightProduct(s: GameState, structureId: number, product: LightProduct): ActionResult {
  const st = s.structures[structureId];
  if (!st?.light) return fail("Not a light industry.");
  st.light.product = product;
  return OK;
}

export function availableTopics(s: GameState) {
  return Object.values(TOPIC_BY_ID).filter((t) => !s.research.done.includes(t.id) && (!t.parent || s.research.done.includes(t.parent)));
}

export function setResearch(s: GameState, topicId: string | null, hot = false): ActionResult {
  if (topicId === null) {
    if (hot) s.research.hotCurrent = null;
    else s.research.current = null;
    return OK;
  }
  const t = TOPIC_BY_ID[topicId];
  if (!t) return fail("Unknown topic.");
  if (!availableTopics(s).includes(t)) return fail("Prerequisites not met.");
  if (t.hot) {
    if (s.research.hotCurrent !== t.id) s.research.hotProgress = 0;
    s.research.hotCurrent = t.id;
  } else {
    if (s.research.current !== t.id) s.research.progress = 0;
    s.research.current = t.id;
  }
  return OK;
}

export function tradeRate(s: GameState): number {
  return difficultyOf(s).tradeRate * (1 + 0.08 * Math.min(3, s.research.done.filter((t) => TOPIC_BY_ID[t]?.effects?.includes("trade+")).length)) * (1 - Math.max(0, s.rebels.hostility - 50) / 200);
}

export function canTrade(s: GameState): string | null {
  if (countActive(s, "trade") === 0) return "Build and staff a Trade Mission.";
  if (s.rebels.population <= 0) return "There is no one to trade with.";
  if (s.rebels.hostility >= 75) return "Free Berth refuses to trade.";
  if (s.rebels.lastTrade === s.turn) return "One trade per turn.";
  return null;
}

/** Barter: give `amount` of one resource for `amount × rate` of another. */
export function trade(s: GameState, give: Processed, get: Processed, amount: number): ActionResult {
  const blocked = canTrade(s);
  if (blocked) return fail(blocked);
  if (give === get) return fail("Choose two different resources.");
  if (amount <= 0 || s.stock[give] < amount) return fail("Not enough to trade.");
  const receive = Math.floor(amount * tradeRate(s) * 0.8);
  const theirs = s.rebels.stock[get] ?? 0;
  if (theirs < receive) return fail(`Free Berth only has ${Math.floor(theirs)} to spare.`);
  s.stock[give] -= amount;
  s.stock[get] += receive;
  s.rebels.stock[give] = (s.rebels.stock[give] ?? 0) + amount;
  s.rebels.stock[get] = theirs - receive;
  s.rebels.hostility = Math.max(0, s.rebels.hostility - 2);
  s.rebels.lastTrade = s.turn;
  log(s, `Traded ${amount} ${give} for ${receive} ${get}.`, "good");
  return OK;
}

export function giftRebels(s: GameState, give: Processed, amount: number): ActionResult {
  if (s.stock[give] < amount || amount <= 0) return fail("Not enough to give.");
  s.stock[give] -= amount;
  s.rebels.stock[give] = (s.rebels.stock[give] ?? 0) + amount;
  s.rebels.hostility = Math.max(0, s.rebels.hostility - Math.ceil(amount / 20));
  log(s, `Sent ${amount} ${give} to Free Berth.`, "info");
  return OK;
}

export function resolveEvent(s: GameState, choice: number): ActionResult {
  const pending = s.story.pending;
  if (!pending) return fail("No event pending.");
  const ev = EVENT_BY_ID[pending.id];
  const c = ev?.choices[choice];
  if (!c) return fail("Invalid choice.");
  if (c.available && !c.available(s)) return fail("That option isn't available.");
  const result = c.apply(s);
  s.story.history.push(pending.id);
  delete s.story.pending;
  log(s, `${ev.title}: ${result}`, "story");
  return OK;
}

export const SATELLITES: Record<Exclude<SatelliteId, "interstellarProbe" | "ulbi">, { name: string; effect: string; cost: Partial<Record<Processed, number>> }> = {
  comsat: { name: "Comsat", effect: "sat:comsat", cost: { MetalA: 60, PrecA: 30, PrecB: 20, FusionA: 30 } },
  weatherSat: { name: "Weathersat", effect: "sat:weathersat", cost: { MetalA: 50, PrecA: 20, MinB: 20, FusionA: 30 } },
  meteorsat: { name: "Meteorsat", effect: "sat:meteorsat", cost: { MetalA: 50, PrecA: 20, MinB: 20, FusionA: 30 } },
  solarSat: { name: "Solar Power Satellite", effect: "sat:solarSat", cost: { MetalA: 120, MetalB: 80, PrecA: 60, PrecB: 40, FusionA: 60 } },
  geoProbe: { name: "Geological Probe", effect: "sat:geoProbe", cost: { MetalA: 40, PrecB: 20, FusionA: 30 } },
  observer: { name: "Orbital Observer", effect: "sat:observer", cost: { MetalA: 60, PrecA: 30, FusionA: 30 } },
};

export function launchSatellite(s: GameState, sat: keyof typeof SATELLITES): ActionResult {
  const def = SATELLITES[sat];
  if (!hasEffect(s, def.effect)) return fail("Requires research.");
  if (countActive(s, "spaceport") === 0) return fail("Needs an operating Spaceport.");
  if (sat !== "solarSat" && s.satellites.includes(sat)) return fail("Already in orbit.");
  if (!canAfford(s, def.cost)) return fail("Not enough resources.");
  pay(s, def.cost);
  s.satellites.push(sat);
  if (sat === "geoProbe") for (const row of s.levels[0]) for (const t of row) if (t.beacon) t.beacon.known = true;
  log(s, `${def.name} launched.`, "good");
  return OK;
}

export function spaceProgramMissing(s: GameState): string[] {
  return SPACE_PROGRAM_KEYS.filter((k) => !hasEffect(s, k)).map((k) => k.replace("space:", ""));
}

export const STARSHIP_COMPONENT_COST: Partial<Record<Processed, number>> = {
  MetalA: 300,
  MetalB: 200,
  MetalC: 150,
  MetalD: 150,
  PrecA: 80,
  PrecB: 80,
  MinB: 100,
  FusionA: 150,
  FusionB: 100,
  FusionC: 100,
};

export function starshipBlocked(s: GameState): string | null {
  const missing = spaceProgramMissing(s);
  if (missing.length) return `Space program research missing: ${missing.join(", ")}.`;
  if (countActive(s, "spaceport") === 0) return "Needs an operating Spaceport.";
  if (countActive(s, "massDriver") === 0) return "Needs an operating Mass Driver.";
  return null;
}

export function startArkProgram(s: GameState): ActionResult {
  const blocked = starshipBlocked(s);
  if (blocked) return fail(blocked);
  s.story.flags.arkProgram = true;
  log(s, "Ark assembly has begun at the spaceport.", "story");
  return OK;
}

export function launchArk(s: GameState): ActionResult {
  const blocked = starshipBlocked(s);
  if (blocked) return fail(blocked);
  if (s.starship.components < BALANCE.starshipComponents) return fail(`The ark needs ${BALANCE.starshipComponents} components in orbit.`);
  s.starship.launched = true;
  const id = s.story.flags.boardDeal ? "boardRule" : "secondArk";
  s.ending = { id, turn: s.turn, won: id === "secondArk" };
  log(s, ENDINGS[id].title, "story");
  return OK;
}

export function broadcastBlocked(s: GameState): string | null {
  if (s.story.evidence < 6) return `The Ledger has ${s.story.evidence} of 6 entries needed.`;
  if (!s.story.flags.charterDrafted) return "No charter has been drafted. (Political Science, then endorse the Faculty's draft.)";
  if (!hasEffect(s, "broadcast")) return "Requires Harsh Environment Signals Processing.";
  if (countActive(s, "commTower") === 0) return "Needs an operating Communications Tower.";
  if (s.story.trust.faculty < 50 || s.story.trust.crews < 50) return "The Faculty and the Crews must both trust you (50+).";
  return null;
}

export function broadcastLedger(s: GameState): ActionResult {
  const blocked = broadcastBlocked(s);
  if (blocked) return fail(blocked);
  s.ending = { id: "openCharter", turn: s.turn, won: true };
  log(s, ENDINGS.openCharter.title, "story");
  return OK;
}

export function populationOf(s: GameState) {
  return population(s);
}
