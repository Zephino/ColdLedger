import type { BuildingId } from "../src/data/buildings";
import { recommendedManifest } from "../src/data/cargo";
import { availableTopics, landLander, placeKit, placeRobot, placeStructure, resolveEvent, setFactoryProduct, setResearch } from "../src/sim/actions";
import { checkPlacement, countBuilt, population, structures } from "../src/sim/colony";
import { NEIGHBORS4, distance } from "../src/sim/map";
import { newGame } from "../src/sim/newGame";
import { endTurn } from "../src/sim/turn";
import type { GameState } from "../src/sim/types";
import type { Difficulty } from "../src/data/balance";

/** A simple scripted player that follows the manual's tutorial build order. */
export function botGame(seed: number, difficulty: Difficulty = "medium", planetId = "vigil") {
  return newGame({ seed, difficulty, planetId, site: 0, manifest: recommendedManifest(), colonyName: "Bot" });
}

function tilesByDistance(s: GameState) {
  const out: Array<[number, number]> = [];
  for (let y = 0; y < s.height; y++) for (let x = 0; x < s.width; x++) out.push([x, y]);
  return out.sort((a, b) => distance(s.center, { x: a[0], y: a[1] }) - distance(s.center, { x: b[0], y: b[1] }));
}

function tryBuild(s: GameState, id: BuildingId, level: number): boolean {
  for (const [x, y] of tilesByDistance(s)) {
    if (checkPlacement(s, id, level, x, y).ok) return placeStructure(s, id, level, x, y).ok;
  }
  const tube = level === 0 ? "tube" : "ugTube";
  for (const [x, y] of tilesByDistance(s)) {
    const t = s.levels[level][y][x];
    if (!t.dozed || t.structure !== undefined) continue;
    const hasFreeNeighbor = NEIGHBORS4.some(([dx, dy]) => {
      const n = s.levels[level][y + dy]?.[x + dx];
      return n && n.dozed && n.structure === undefined && !n.beacon;
    });
    if (hasFreeNeighbor && checkPlacement(s, tube, level, x, y).ok) {
      placeStructure(s, tube, level, x, y);
      break;
    }
  }
  return false;
}

function keepRobotsBusy(s: GameState) {
  const c = s.center;
  if (s.idleRobots.miner > 0 && countBuilt(s, "mine") + structures(s).filter((st) => st.type === "mine" && st.state === "building").length < 3 + Math.floor(s.turn / 50)) {
    for (const [x, y] of tilesByDistance(s)) {
      const t = s.levels[0][y][x];
      if (t.beacon?.known && t.structure === undefined && placeRobot(s, "miner", 0, x, y).ok) break;
    }
  }
  if (s.idleRobots.digger > 0) {
    if (s.openLevels === 0) placeRobot(s, "digger", 0, c.x, c.y - 2);
    else {
      for (let level = 1; level <= s.openLevels && s.idleRobots.digger > 0; level++) {
        for (const [x, y] of tilesByDistance(s)) {
          const t = s.levels[level][y][x];
          if (!t.dug || t.structure !== undefined || t.robot !== undefined) continue;
          const dirs = (["n", "e", "s", "w"] as const).filter((d, i) => {
            const [dx, dy] = NEIGHBORS4[i];
            const n = s.levels[level][y + dy]?.[x + dx];
            return n && !n.dug && n.terrain !== "imposs";
          });
          if (dirs.length && placeRobot(s, "digger", level, x, y, { dir: dirs[0] }).ok) break;
        }
      }
    }
  }
  for (let i = 0; i < 3 && s.idleRobots.dozer > 0; i++) {
    let placed = false;
    const ugDozed = s.openLevels > 0 ? s.levels[1].flat().filter((t) => t.dozed && t.structure === undefined).length : 99;
    const surfaceFree = s.levels[0].flat().filter((t) => t.dozed && t.structure === undefined).length;
    const order = ugDozed < 10 && surfaceFree > 4 ? [...Array(s.openLevels).keys()].map((l) => l + 1).concat([0]) : [...Array(s.openLevels + 1).keys()];
    for (const level of order) {
      if (placed) break;
      for (const [x, y] of tilesByDistance(s)) {
        const t = s.levels[level][y][x];
        if (t.dozed || t.structure !== undefined || t.robot !== undefined || t.beacon) continue;
        if (level > 0 && !t.dug) continue;
        if (level === 0 && (t.terrain === "impassable" || t.terrain === "hostile")) continue;
        if (distance(c, { x, y }) > 12) continue;
        if (placeRobot(s, "dozer", level, x, y, { rect: [x, y, Math.min(s.width - 1, x + 2), Math.min(s.height - 1, y + 2)] }).ok) {
          placed = true;
          break;
        }
      }
    }
    if (!placed) break;
  }
}

const SURFACE_PLAN: BuildingId[] = ["chap", "agridome", "storage", "smelter", "agridome", "factory", "spew", "roboCommand", "warehouse", "agridome", "commTower", "dirt", "storage", "agridome"];
const UG_PLAN: BuildingId[] = ["residence", "residence", "lab", "residence", "university", "park", "medical", "residence", "rec", "lightIndustry", "residence", "commercial", "ugPolice", "residence", "lab", "residence", "residence"];

export function botTurn(s: GameState) {
  if (s.story.pending) resolveEvent(s, 0);
  keepRobotsBusy(s);
  const mines = countBuilt(s, "mine");
  for (const st of structures(s)) {
    if (!st.factory) continue;
    const want = s.idleRobots.dozer + Object.values(s.robots).filter((r) => r.kind === "dozer").length < 3 ? "dozer" : s.trucks < mines ? "truck" : "none";
    if (st.factory.product !== want && st.factory.progress === 0) setFactoryProduct(s, st.id, want);
  }
  if (countBuilt(s, "seedCommand") > 0) {
    const c = s.center;
    const spots: Array<[number, number]> = [
      [c.x + 3, c.y + 3],
      [c.x - 3, c.y + 3],
      [c.x + 3, c.y - 3],
      [c.x - 3, c.y - 3],
      [c.x + 4, c.y],
    ];
    for (const [x, y] of spots) {
      if (s.orbit.colonistLanders > 0 && s.orbit.colonists > 0) landLander(s, "colonist", x, y);
      else if (s.orbit.cargoLanders > 0) landLander(s, "cargo", x, y);
    }
  }
  if (s.kits.shipTokamak > 0) {
    for (const [x, y] of tilesByDistance(s)) if (placeKit(s, "shipTokamak", x, y).ok) break;
  }
  const builtSurface = SURFACE_PLAN.slice(0, Math.min(SURFACE_PLAN.length, 1 + Math.floor(s.turn / 8)));
  for (const id of new Set(builtSurface)) {
    const want = builtSurface.filter((b) => b === id).length;
    if (countBuilt(s, id) + structures(s).filter((st) => st.type === id && st.state === "building").length < want) tryBuild(s, id, 0);
  }
  if (s.openLevels > 0) {
    const pop = population(s);
    const ugWant = UG_PLAN.slice(0, Math.min(UG_PLAN.length, 1 + Math.floor(pop / 30) + Math.floor(s.turn / 25)));
    for (const id of new Set(ugWant)) {
      const want = ugWant.filter((b) => b === id).length;
      if (countBuilt(s, id) + structures(s).filter((st) => st.type === id && st.state === "building").length < want) tryBuild(s, id, 1);
    }
  }
  if (!s.research.current) {
    const topics = availableTopics(s).filter((t) => !t.hot);
    if (topics.length) setResearch(s, topics.sort((a, b) => a.cost - b.cost)[0].id);
  }
  endTurn(s);
}
