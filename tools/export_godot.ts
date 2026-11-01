// Writes the game's data tables and reference simulation runs to export/godot/ as JSON,
// so a port (Godot or otherwise) can load exact values and check its simulation against this one.
// Run: npm run export:godot
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { BALANCE, DIFFICULTIES } from "../src/data/balance";
import { BUILDINGS, BUILDING_IDS, PRIORITY, buildCost, buildTurns, moraleEffect, powerNeed, upkeep, workerNeed } from "../src/data/buildings";
import { CARGO, recommendedManifest } from "../src/data/cargo";
import { RAW_BUILD, RAW_OPS } from "../src/data/structureTables";
import { PLANETS, STAR_NAME } from "../src/data/planets";
import { FIELDS, SPACE_PROGRAM_KEYS, TOPICS } from "../src/data/research";
import { ORES, PROCESSED, RESOURCE_GROUPS } from "../src/data/resources";
import { BRIEFING, ENDINGS, EVENTS, FACTIONS, NEWSPAPER, TITLE } from "../src/data/story";
import { SATELLITES, STARSHIP_COMPONENT_COST } from "../src/sim/actions";
import { countBuilt, population } from "../src/sim/colony";
import { newGame } from "../src/sim/newGame";
import { hashSeed, nextRandom } from "../src/sim/rng";
import { FACTORY_PRODUCTS } from "../src/sim/turn";
import { VERSION } from "../src/version";
import { botGame, botTurn } from "../tests/bot";

const out = join(process.cwd(), "export", "godot");
mkdirSync(out, { recursive: true });
const write = (name: string, data: unknown, indent = 2) => writeFileSync(join(out, name), JSON.stringify(data, null, indent));

const buildings = BUILDING_IDS.map((id) => {
  const def = BUILDINGS[id];
  const tiers = def.rawKeys.map((_, i) => {
    const tier = i + 1;
    return {
      tier,
      buildCost: buildCost(id, tier),
      buildTurns: buildTurns(id, tier),
      upkeep: upkeep(id, tier),
      power: powerNeed(id, tier),
      workers: workerNeed(id, tier),
      morale: moraleEffect(id, tier),
    };
  });
  return { ...def, tiers };
});

write("meta.json", { version: VERSION, title: TITLE, newspaper: NEWSPAPER, star: STAR_NAME, exportedFor: "Godot port" });
write("balance.json", { balance: BALANCE, difficulties: DIFFICULTIES });
write("buildings.json", { buildings, priority: PRIORITY });
write("structure_tables.json", { build: RAW_BUILD, ops: RAW_OPS });
write("resources.json", { processed: PROCESSED, ores: ORES, groups: RESOURCE_GROUPS });
write("research.json", { fields: FIELDS, spaceProgramKeys: SPACE_PROGRAM_KEYS, topics: TOPICS });
write("cargo.json", { cargo: CARGO, recommended: recommendedManifest() });
write("planets.json", { planets: PLANETS });
write("production.json", { factoryProducts: FACTORY_PRODUCTS, satellites: SATELLITES, starshipComponentCost: STARSHIP_COMPONENT_COST });

// Event bodies and choice effects are code; the text below is rendered against a fresh colony.
const sample = newGame({ seed: 1, difficulty: "medium", planetId: "vigil", site: 0, manifest: recommendedManifest(), colonyName: "Lamplight" });
write("story.json", {
  briefing: BRIEFING,
  factions: FACTIONS,
  endings: ENDINGS,
  events: EVENTS.map((e) => ({ id: e.id, title: e.title, repeatable: !!e.repeatable, sampleBody: e.body(sample), choices: e.choices.map((c) => c.label) })),
});

// RNG test vectors: a port of mulberry32 must reproduce these exactly.
const rng = { rng: 12345 };
write("rng_vectors.json", {
  algorithm: "mulberry32, state stored in GameState.rng",
  seed: 12345,
  first10: Array.from({ length: 10 }, () => nextRandom(rng)),
  hashSeed: { input: "Lamplight", output: hashSeed("Lamplight") },
});

write("new_game_state.json", sample, 0);

// Reference runs of the scripted bot (tests/bot.ts). Compare trends, not exact values.
const runs = [1, 2, 3].map((seed) => {
  const s = botGame(seed);
  const turns = [];
  for (let t = 0; t < 220 && !s.ending; t++) {
    botTurn(s);
    if (s.turn % 10 === 0) {
      const r = s.lastReport;
      turns.push({
        turn: s.turn,
        population: population(s),
        morale: Math.round(s.morale),
        food: Math.round(s.items.food),
        power: [r.powerMade, r.powerUsed],
        workers: [r.workersNeeded, r.workersAvailable],
        housing: r.housing,
        stock: Object.fromEntries(Object.entries(s.stock).map(([k, v]) => [k, Math.round(v)])),
        built: { residence: countBuilt(s, "residence"), agridome: countBuilt(s, "agridome"), mine: countBuilt(s, "mine"), smelter: countBuilt(s, "smelter") },
        research: s.research.done.length,
      });
    }
  }
  return { seed, difficulty: "medium", planet: "vigil", ending: s.ending?.id ?? null, turns };
});
write("reference_runs.json", runs);

console.log(`Wrote ${out}`);
