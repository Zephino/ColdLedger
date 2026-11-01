import { BALANCE, DIFFICULTY } from "../data/balance";
import { BUILDINGS, buildCost, powerNeed, workerNeed, type BuildingId } from "../data/buildings";
import { TOPIC_BY_ID } from "../data/research";
import { PROCESSED, type Processed } from "../data/resources";
import { NEIGHBORS4, distance } from "./map";
import type { GameState, Robot, Structure } from "./types";
import { POP_TOTAL } from "./types";

export const structures = (s: GameState): Structure[] => Object.values(s.structures);
export const robots = (s: GameState): Robot[] => Object.values(s.robots);

export function isOperating(st: Structure): boolean {
  return st.state === "active";
}

export function isBuilt(st: Structure): boolean {
  return st.state === "active" || st.state === "idle" || st.state === "broken";
}

export function countActive(s: GameState, ...types: BuildingId[]): number {
  let n = 0;
  for (const st of structures(s)) if (st.state === "active" && types.includes(st.type)) n++;
  return n;
}

export function countBuilt(s: GameState, ...types: BuildingId[]): number {
  let n = 0;
  for (const st of structures(s)) if (isBuilt(st) && types.includes(st.type)) n++;
  return n;
}

let effectCache: { done: string[]; len: number; map: Map<string, number> } | null = null;

export function effectCount(s: GameState, key: string): number {
  if (!effectCache || effectCache.done !== s.research.done || effectCache.len !== s.research.done.length) {
    const map = new Map<string, number>();
    for (const id of s.research.done) for (const e of TOPIC_BY_ID[id]?.effects ?? []) map.set(e, (map.get(e) ?? 0) + 1);
    effectCache = { done: s.research.done, len: s.research.done.length, map };
  }
  return effectCache.map.get(key) ?? 0;
}

export const hasEffect = (s: GameState, key: string) => effectCount(s, key) > 0;

export function isUnlocked(s: GameState, id: BuildingId): boolean {
  const req = BUILDINGS[id].requires;
  if (!req) return true;
  if (req === "terraform") return hasEffect(s, "terraform:atmo") && hasEffect(s, "terraform:rep");
  return hasEffect(s, req);
}

export function maxTier(s: GameState, id: BuildingId): number {
  const def = BUILDINGS[id];
  if (!def.tiered) return 1;
  let tier = 1;
  for (let n = 2; n <= def.rawKeys.length; n++) if (hasEffect(s, `tier:${id}:${n}`)) tier = n;
  return tier;
}

export function population(s: GameState): number {
  return POP_TOTAL(s.pop);
}

export function storageCap(s: GameState): number {
  return (countActive(s, "seedSmelter") > 0 ? BALANCE.seedStorageCapacity : 0) + countBuilt(s, "storage") * BALANCE.storageTankCapacity;
}

/** Each processed resource may fill at most this share of tank capacity. */
export const RESOURCE_SHARE = 1 / 6;

export function resourceCap(s: GameState): number {
  return Math.floor(storageCap(s) * RESOURCE_SHARE);
}

export function storedTotal(s: GameState): number {
  let total = 0;
  for (const r of PROCESSED) total += s.stock[r];
  return total;
}

export function warehouseCap(s: GameState): number {
  return 60 + countBuilt(s, "warehouse") * BALANCE.warehouseCapacity;
}

export function warehouseUsed(s: GameState): number {
  const m = BALANCE.massUnits;
  return Math.ceil(s.items.clothing * m.clothing + s.items.luxury * m.luxury + s.items.medicine * m.medicine + s.items.fuelCells * m.fuelCells + s.items.roadMaterial * m.roadMaterial);
}

export function housing(s: GameState): number {
  let cap = 0;
  if (!s.seedCollapsed && countBuilt(s, "seedCommand") > 0) cap += BALANCE.seedHousing;
  for (const st of structures(s)) {
    if (st.type === "residence" && st.state === "active") cap += BALANCE.residenceCapacity[st.tier - 1] ?? 25;
  }
  return cap;
}

export function robotCap(s: GameState): number {
  let cap = 0;
  if (countActive(s, "seedCommand") > 0 || countBuilt(s, "seedLander") > 0) cap += BALANCE.robotControlBase;
  cap += countActive(s, "command") * BALANCE.robotControlBase;
  for (const st of structures(s)) {
    if (st.type === "roboCommand" && st.state === "active") cap += BALANCE.robotsPerCommand * st.tier;
  }
  return cap;
}

export function activeRobots(s: GameState): number {
  return robots(s).length;
}

export function commRange(s: GameState): number {
  return BALANCE.commRangeBase + BALANCE.commRangePerTower * countActive(s, "commTower") + 3 * effectCount(s, "comm+");
}

export function inCommRange(s: GameState, x: number, y: number): boolean {
  if (s.satellites.includes("comsat")) return true;
  const range = commRange(s);
  for (const st of structures(s)) {
    if ((st.type === "seedCommand" || st.type === "command" || st.type === "seedLander") && isBuilt(st) && st.level === 0 && distance(st, { x, y }) <= range) return true;
    if (st.type === "commTower" && st.state === "active" && distance(st, { x, y }) <= BALANCE.commRangeBase) return true;
  }
  return false;
}

export function canAfford(s: GameState, cost: Partial<Record<Processed, number>>): boolean {
  for (const [r, n] of Object.entries(cost) as Array<[Processed, number]>) if (s.stock[r] < n) return false;
  return true;
}

export function pay(s: GameState, cost: Partial<Record<Processed, number>>) {
  for (const [r, n] of Object.entries(cost) as Array<[Processed, number]>) s.stock[r] -= n;
}

export function refund(s: GameState, cost: Partial<Record<Processed, number>>, fraction: number) {
  const cap = resourceCap(s);
  for (const [r, n] of Object.entries(cost) as Array<[Processed, number]>) {
    s.stock[r] = Math.max(s.stock[r], Math.min(cap, s.stock[r] + Math.floor(n * fraction)));
  }
}

export function structureCost(s: GameState, id: BuildingId, tier: number) {
  if (id === "road" || id === "tube" || id === "ugTube") return id === "road" ? {} : buildCost(id, tier);
  return buildCost(id, tier);
}

/**
 * Network connectivity across levels (manual: "your existing network of
 * buildings and tubes"). Built tube-connected structures conduct air and power
 * to their neighbours; shafts link levels vertically.
 */
export function computeConnectivity(s: GameState) {
  const key = (l: number, x: number, y: number) => `${l}:${x}:${y}`;
  const nodes = new Map<string, Structure>();
  const roots: Structure[] = [];
  for (const st of structures(s)) {
    if (!isBuilt(st)) continue;
    const t = st.type;
    if (t === "tube" || t === "ugTube" || t === "airShaft" || t === "ugShaft" || BUILDINGS[t].needsTube) nodes.set(key(st.level, st.x, st.y), st);
    if (t === "seedLander" || t === "command") roots.push(st);
  }
  const reached = new Set<string>();
  const queue: Array<[number, number, number]> = [];
  for (const r of roots) {
    reached.add(key(r.level, r.x, r.y));
    queue.push([r.level, r.x, r.y]);
  }
  while (queue.length) {
    const [l, x, y] = queue.pop()!;
    const here = s.levels[l][y][x].structure;
    const hereSt = here !== undefined ? s.structures[here] : undefined;
    const next: Array<[number, number, number]> = NEIGHBORS4.map(([dx, dy]) => [l, x + dx, y + dy]);
    if (hereSt && (hereSt.type === "airShaft" || hereSt.type === "ugShaft")) {
      next.push([l + 1, x, y]);
      if (l > 0) next.push([l - 1, x, y]);
    }
    for (const [nl, nx, ny] of next) {
      const k = key(nl, nx, ny);
      if (reached.has(k) || !nodes.has(k)) continue;
      reached.add(k);
      queue.push([nl, nx, ny]);
    }
  }
  for (const st of structures(s)) {
    const def = BUILDINGS[st.type];
    if (!def.needsTube) {
      st.connected = true;
      continue;
    }
    if (reached.has(key(st.level, st.x, st.y))) {
      st.connected = true;
      continue;
    }
    st.connected = NEIGHBORS4.some(([dx, dy]) => reached.has(key(st.level, st.x + dx, st.y + dy)));
  }
}

export interface PlacementCheck {
  ok: boolean;
  reason?: string;
}

/** Tile-picker rule: affordable, enough spare power and workers, right terrain, beside a tube. */
export function checkPlacement(s: GameState, id: BuildingId, level: number, x: number, y: number): PlacementCheck {
  const def = BUILDINGS[id];
  const tile = s.levels[level]?.[y]?.[x];
  if (!tile) return { ok: false, reason: "Off the map." };
  if (!def.buildable) return { ok: false, reason: "Cannot be placed directly." };
  if (!isUnlocked(s, id)) return { ok: false, reason: "Requires research." };
  if ((def.layer === "surface") !== (level === 0)) return { ok: false, reason: def.layer === "surface" ? "Surface structure." : "Underground structure." };
  if (s.seedCollapsed && countBuilt(s, "command", "seedCommand") === 0 && id !== "command") return { ok: false, reason: "Needs a Command Center." };
  if (tile.structure !== undefined) return { ok: false, reason: "Tile occupied." };
  if (tile.robot !== undefined) return { ok: false, reason: "A robot is working here." };
  if (level > 0 && !tile.dug) return { ok: false, reason: "Not excavated." };
  if (def.needsDozed && !tile.dozed) return { ok: false, reason: "Bulldoze first." };
  if (level === 0 && tile.terrain === "impassable") return { ok: false, reason: "Impassable terrain." };
  if (level === 0 && tile.beacon && id !== "road") return { ok: false, reason: "Mining beacon." };
  if (distance(s.center, { x, y }) > BALANCE.colonyRadius) return { ok: false, reason: "Outside the colony radius." };
  if (id === "tube" || id === "ugTube" || def.needsTube) {
    const touches = NEIGHBORS4.some(([dx, dy]) => {
      const n = s.levels[level][y + dy]?.[x + dx];
      if (n?.structure === undefined) return false;
      const other = s.structures[n.structure];
      if (id === "tube" || id === "ugTube") return other.state !== "destroyed";
      return other.type === "tube" || other.type === "ugTube" || other.type === "airShaft" || other.type === "ugShaft" || other.type === "seedLander";
    });
    if (!touches) return { ok: false, reason: id === "tube" || id === "ugTube" ? "Tubes must touch a structure or tube." : "Must sit beside a tube." };
  }
  if (id === "road" && s.items.roadMaterial < 1) return { ok: false, reason: "No road material." };
  const tier = maxTier(s, id);
  const cost = structureCost(s, id, tier);
  if (!canAfford(s, cost)) return { ok: false, reason: "Not enough resources." };
  const spare = spareCapacity(s);
  if (!def.passive && !def.powerOutput && powerNeed(id, tier) > spare.power) return { ok: false, reason: "Not enough spare power." };
  if (!def.passive && s.colonistsLanded && workerNeed(id, tier) > spare.people) return { ok: false, reason: "Not enough spare workers." };
  return { ok: true };
}

/** Power and staff left over after last turn's operations and everything under construction. */
export function spareCapacity(s: GameState): { power: number; people: number } {
  const r = s.lastReport;
  let power = r.powerMade - r.powerUsed;
  let people = r.workersAvailable - r.workersNeeded;
  for (const st of structures(s)) {
    if (st.state !== "building" || BUILDINGS[st.type].passive) continue;
    const def = BUILDINGS[st.type];
    if (def.powerOutput) power += st.type === "solarReceiver" ? 0 : def.powerOutput;
    else power -= powerNeed(st.type, st.tier);
    people -= workerNeed(st.type, st.tier);
  }
  return { power: Math.max(0, power), people: Math.max(0, people) };
}

export function difficultyOf(s: GameState) {
  return DIFFICULTY[s.difficulty];
}

export function log(s: GameState, text: string, kind: GameState["messages"][number]["kind"] = "info") {
  s.messages.push({ turn: s.turn, text, kind });
  if (s.messages.length > 300) s.messages.splice(0, s.messages.length - 300);
}
