# Porting Cold Ledger to Godot

This guide is for an AI or developer building a Godot game from this project. Cold Ledger is a turn-based colony survival game. This version is a web + Electron game written in TypeScript. Its rules and data are separated from its user interface, so they can be carried over to Godot. The interface has to be rebuilt.

Project version at the time of writing: see `VERSION`. History: see `CHANGELOG.md`.

## 1. Quick start

1. Clone the repository (`git clone https://github.com/Zephino/ColdLedger.git`). Install Node.js 20+ and run `npm ci` once.
2. Run `npm run export:godot`. This writes JSON files to `export/godot/` (described in section 4). Copy that folder into the Godot project, for example as `res://data/`.
3. Run `npm run dev` and open the URL it prints, to play the original and see how it should look and behave.
4. Port the simulation (section 5) as plain GDScript or C# classes with no scene or node dependencies. Then build the Godot UI on top (section 7).
5. Check the port with the tests in section 6.

If Node is unavailable, the committed `export/godot/` folder can be used as-is. It reflects the version in `VERSION` at the time it was generated.

## 2. What to reuse, port, or replace

| Path | What it is | In Godot |
| --- | --- | --- |
| `src/data/*.ts` | Static game data: buildings, research, cargo, planets, story text, balance | **Load the JSON export.** Do not retype the numbers. |
| `src/data/structureTables.ts` | Raw structure build and operating tables (`RAW_BUILD`, `RAW_OPS`) | Exported as `structure_tables.json`. `buildings.json` already contains the resolved values. |
| `src/sim/*.ts` | All game rules: map generation, actions, turn processing, RNG | **Port line by line.** This is the game. |
| `src/save.ts` | JSON save format (`GameState`, `version: 1`) | Port: same JSON shape; use `FileAccess` in `user://` instead of localStorage. |
| `src/ui/*.ts`, `src/styles.css`, `index.html`, `src/main.ts` | DOM + Canvas2D interface | **Replace** with Godot scenes. Use as a functional reference only. |
| `electron/` | Desktop wrapper | Not needed; Godot exports desktop builds itself. |
| `tests/bot.ts` | Scripted player that follows the tutorial | Port it. It is the best automated check of the simulation (section 6). |
| `tests/sim.test.ts`, `tests/trace.ts` | Headless tests and a turn-by-turn trace printer | Reference for writing GUT/GdUnit tests. |
All of this project's art is drawn procedurally in code (`src/ui/iso.ts`), and all of its text is original. Keep it that way: do not add third-party game assets to the Godot project.

## 3. Architecture

- **One plain data object holds the whole game.** `GameState` (`src/sim/types.ts`) contains the map levels, structures, robots, stockpiles, population cohorts, research, story flags, messages, and the RNG state. It contains no functions, so it serialises directly to JSON. In Godot, use a `RefCounted` class with typed fields, or a `Dictionary` that mirrors the JSON exactly.
- **Rules are functions that take that state.** Player actions are in `src/sim/actions.ts` (`placeStructure`, `placeRobot`, `landLander`, `setResearch`, `trade`, `resolveEvent`, `launchSatellite`, …). Each returns `{ ok, reason }`, so the UI can show the reason when an action is refused. Queries such as storage capacity, housing and connectivity are in `src/sim/colony.ts`.
- **One function advances time.** `endTurn(state)` in `src/sim/turn.ts` runs these steps in order. Keep the order, because results depend on it:
  1. Construction progress
  2. Robots (fuel, comm range, dozing, digging, mining, exploring)
  3. Tube/building network connectivity
  4. Seed complex failure on `BALANCE.seedCollapseTurn`
  5. Allocation of power, workers, scientists and upkeep, in `PRIORITY` order
  6. Production: mines and trucks, smelting, food, factories, research, terraforming, the ark
  7. Life support: food and air
  8. Population: births, aging, graduation, deaths, defection, immigration
  9. Morale
  10. Crime
  11. Breakdowns and repairs
  12. Disasters
  13. Plague
  14. Rebels
  15. Story events
  16. Endings
- **Randomness is deterministic.** Every random decision goes through `src/sim/rng.ts` (mulberry32), and its state is stored in `GameState.rng`. The same seed and the same actions give the same game. Port the RNG exactly (section 5.1).
- **Story events pause the game.** When `storyStep` queues an event, `state.story.pending` is set and `endTurn` does nothing until the UI calls `resolveEvent(state, choiceIndex)`.

## 4. The JSON export (`npm run export:godot`)

| File | Contents |
| --- | --- |
| `meta.json` | Version, title, newspaper name, star name |
| `balance.json` | Every tunable constant and the four difficulty levels. Source comments in `src/data/balance.ts` mark each value as manual, data or estimate. |
| `buildings.json` | All 49 buildings with their definition fields and, per tier, build cost, build turns, upkeep, power, workers and morale effect. Also the allocation `priority` list. |
| `structure_tables.json` | Raw structure build and operating tables |
| `resources.json` | The 12 processed resources, the 10 ores, and their display groups |
| `research.json` | Research fields and topics (parent, cost, hot-lab flag, effect keys, description) |
| `cargo.json` | Ship-packing cargo table and the recommended manifest |
| `planets.json` | The four planets of the Kestrel's Lamp system |
| `production.json` | Factory products, satellite costs, ark component costs |
| `story.json` | Briefing, factions, endings, and each event's id, title, choice labels and sample body text |
| `rng_vectors.json` | Expected RNG outputs used to test the port |
| `new_game_state.json` | A complete fresh `GameState` (seed 1, medium, Vigil): the reference shape for saves |
| `reference_runs.json` | Scripted-bot runs for seeds 1–3, 220 turns, sampled every 10 turns |

Some things are code rather than data, so they are **not** in the export and must be ported by hand:
- Story event conditions (`when`), bodies (`body`) and choice effects (`apply`) in `src/data/story.ts`.
- Research effect *behaviour*. The effect keys are data, but what each key does lives in `turn.ts`, `colony.ts` and `actions.ts`. Search for the key string, for example `"mine+"`.
- Derived helpers in `src/data/buildings.ts` and `resources.ts` (`smeltOre`, …). The export already contains their per-tier results.

After any balance change, re-run the export and re-copy the folder.

## 5. Porting notes

### 5.1 RNG (must match exactly)

GDScript `int` is 64-bit, but JavaScript does these operations in 32 bits, so mask to 32 bits after each step. This version was checked against `rng_vectors.json`:

```gdscript
const M32 := 0xFFFFFFFF

static func imul(a: int, b: int) -> int:
	a &= M32
	b &= M32
	var lo := (a & 0xFFFF) * b
	var hi := ((a >> 16) * b) & 0xFFFF
	return (lo + (hi << 16)) & M32

# state.rng is kept as an unsigned 32-bit int. JS saves may store it signed: if rng < 0, add 4294967296.
static func next_random(state) -> float:
	state.rng = (state.rng + 0x6D2B79F5) & M32
	var t: int = state.rng
	t = imul(t ^ (t >> 15), t | 1)
	t ^= (t + imul(t ^ (t >> 7), t | 61)) & M32
	return float((t ^ (t >> 14)) & M32) / 4294967296.0
```

Seeding from 12345, the first three values must be `0.9797282677609473`, `0.3067522644996643` and `0.484205421525985`. Port `chance`, `randInt`, `pick`, `stochasticRound` and `hashSeed` (FNV-1a over UTF-16 code units) the same way.

### 5.2 Keep the same iteration order

The simulation loops over `state.structures` and `state.robots`, which are objects keyed by id, in insertion order. Godot `Dictionary` also keeps insertion order, so use dictionaries keyed the same way, not arrays sorted by something else. Changing the order changes which random number each decision uses. The game still works, but it diverges from the reference runs.

### 5.3 Numbers

JavaScript has a single number type. Values such as food, ore and stock are floats in the original. Keep them as `float` in Godot and round only for display, as the original UI does with `fmt()`.

### 5.4 Map and rendering

- The map is 48×48 tiles (`MAP_SIZE`). `state.levels[0]` is the surface and `levels[1..n]` are underground levels, each indexed `[y][x]`.
- The view is isometric, with diamond tiles 64×32 (`TW`/`TH` in `src/ui/iso.ts`). Screen ↔ tile conversion is `tileToScreen` / `screenToTile` there. Godot's `TileMapLayer` with an isometric `TileSet` (64×32) matches this.
- Terrain colours, the night/day split on Vigil, and structure silhouettes (domes, tokamak ring, derricks, landers) are drawn in `iso.ts` and can be used as the art brief. The minimap uses the original's legend colours: black clear, red rough, green hostile, yellow-green impassable.

### 5.5 Saves

A save is `JSON.stringify(GameState)` with `version: 1`. Keep that shape and saves can move between the web and Godot versions. That makes cross-checking easy: export a save from the web game (Save / Menu → Export save file), load it in Godot, end a turn in both, and compare.

## 6. Verifying the port

1. **RNG:** reproduce `rng_vectors.json` exactly.
2. **Data:** the Godot loader must produce the same per-tier values as `buildings.json`. These are spot checks from the original manual and tests:
   - AgriDome builds in 5 turns; CHAP in 6.
   - Mine: 5 power, 1 worker.
   - Tokamak upkeep: Fusion A, B and C.
3. **New game:** `newGame` with seed 1, medium, Vigil, site 0, the recommended manifest and colony name "Lamplight" should match `new_game_state.json`. The map, beacons and seed complex should be identical.
4. **Behaviour:** port `tests/bot.ts` and run seeds 1–3 for 220 turns on medium. Compare with `reference_runs.json`. With an exact port the numbers match. If they differ, check that population stays well above 50, colonists land, and the economy follows the same trend. The current values are:

   | Seed | Population at turn 220 |
   | --- | --- |
   | 1 | 147 |
   | 2 | 156 |
   | 3 | 172 |

5. **Seed order:** the seed units finish in the order power, smelter, factory, command (see `tests/sim.test.ts`).
6. **Turn 1:** a robominer can be placed on the starter beacon at `center + (5, -2)` on turn 1.

When values diverge, `npx vite-node tests/trace.ts <seed> <turns> <every>` prints a detailed turn-by-turn trace from the original, to compare against a matching Godot trace.

## 7. Building the Godot UI

The screens, and what each one calls:

- **Title:** New Colony, Load Colony, Import Save File.
- **Setup flow** (`src/ui/setup.ts`):
  1. Briefing (`BRIEFING`)
  2. Difficulty
  3. Ship packing (`CARGO`, `checkManifest`)
  4. Planet choice. The data shown depends on which probes were packed.
  5. Four landing sites with minimaps (`generateMap` + `previewSurface`)
  6. Colony name, then `newGame(...)`
- **Game screen** (`src/ui/game.ts`):
  - **Top bar:** turn, morale, population, power, staff, food, air, housing, robots, ledger.
  - **Left panel:** level switcher and tile picker. The picker has robots, items from orbit, and buildings grouped by category, with buildings greyed out when unaffordable (`checkPlacement`, `spareCapacity`).
  - **Map:** select or place. Drag to bulldoze a rectangle. Right-drag or WASD to pan, wheel to zoom.
  - **Right panel:** report buttons and a tile/structure inspector.
  - **Bottom panel:** the newspaper log (`state.messages`), plus End Turn, Run 5 and Run 20.
  - **Keys:** Enter ends the turn, Q/E change level, Esc cancels.
  - The game autosaves every 10 turns.
- **Reports** (`src/ui/reports.ts`): summary, population, resources, research tree, factories, rebels/trade, the Ledger (factions, evidence, ending paths), space program, and a system menu.
- **Dialogs:** story events (choices cannot be dismissed) and endings.

## 8. Not finished in the original

- Secondary colonies and AI managers. Their research topics exist, but the effects do nothing yet.
- Only Medium difficulty on the planet Vigil has been play-tested. Hard and the other planets have not been tuned.
- Balance values marked "estimate" in `balance.ts` are first guesses awaiting play-testing.

## 9. Prompt to give the other AI

> You are porting the game in this folder, "Cold Ledger" (TypeScript, web), to Godot 4. Read `README.md` first and follow it.
> - Load all game data from `export/godot/*.json`. Never retype the numbers.
> - Port `src/sim/` faithfully into scene-independent GDScript (or C#) classes, keeping the turn order, iteration order and the mulberry32 RNG exactly as described.
> - Rebuild the interface as Godot scenes, using `src/ui/` only as a functional reference.
> - Verify the port with the checks in section 6 before adding features. Report any value that does not match the reference files.
> - Do not add third-party game assets; all art and text must stay original.
