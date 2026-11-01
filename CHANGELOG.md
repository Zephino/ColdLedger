# Changelog

## Version 00.01.04
Date: 11/01/2026
Time: 1:38 AM

### Changes
- Removed every mention of the earlier game and its publisher from the code, comments, title screen, `package.json`, `README.md` and this changelog.
- Renamed the structure table data file to `src/data/structureTables.ts`, and its export file to `structure_tables.json`.
- Deleted the one-time table decoder script and its `npm run tables` script.
- Regenerated `export/godot/`.

### Reason
Requested removal of all mentions of the earlier game and its publisher.

## Version 00.01.03
Date: 11/01/2026
Time: 1:34 AM

### Changes
- The Godot handoff guide is now `README.md`, the GitHub front page. Removed `GODOT_PORT.md`, pointed the guide's references at `README.md`, and added clone instructions.
- Added `.gitignore` (excludes `node_modules/`, `dist/`, `release/`, logs).
- Regenerated `export/godot/` for this version.
- Removed the scratch debugging file `tests/probe.ts`.
- Initialized git and pushed the project to https://github.com/Zephino/ColdLedger.

### Reason
Requested pushing everything to the GitHub repository, with the handoff guide as its README.

## Version 00.01.02
Date: 11/01/2026
Time: 1:29 AM

### Changes
- Added `GODOT_PORT.md`, a handoff guide for porting the game to Godot. It covers which files to reuse, port or replace; the architecture and turn order; an exact GDScript version of the random-number generator; verification steps; a UI map; known gaps; and a ready-to-paste prompt for another AI.
- Added `tools/export_godot.ts` and the `npm run export:godot` script. It writes all game data, a fresh game state, random-number test values and reference bot runs to `export/godot/` as JSON.
- Generated the `export/godot/` data folder.
- `tsconfig.json` now typechecks `tools/`.

### Reason
Requested instructions for handing the project to another AI that will build a Godot game from these files.

## Version 00.01.01
Date: 11/01/2026
Time: 1:17 AM

### Changes
- Added project rules `.cursor/rules/changelog.mdc` and `.cursor/rules/version.mdc`.
- Added the root `VERSION` file (canonical project version) and this `CHANGELOG.md`, backfilled with the work done so far.
- The title screen now shows the current version, read from `VERSION`.
- `package.json` version set to `0.1.1` to match `VERSION` in npm's semver format.

### Reason
Requested rules: every modifying request gets one version bump and one changelog entry, with the version kept in sync wherever it appears.

## Version 00.01.00
Date: 11/01/2026
Time: 12:31 AM

### Changes
- Created Cold Ledger, a turn-based colony survival game, as a Vite + TypeScript web game with an Electron desktop wrapper (`npm run dev`, `npm run desktop`, `npm run dist:win`).
- Added the structure tables (build turns, workers, power, resources); added building, research tree, cargo, planet and balance data, with every tunable value tagged as manual, data or estimate in `src/data/balance.ts`.
- Simulation: terrain and mining beacons, underground levels, tubes and connectivity, robots (dozer, digger, miner, explorer, airbot), mines with automatic trucking, smelting and storage, power, air and food, population cohorts, morale, crime, factories, research with hot labs, breakdowns and repairs, disasters, plague, rebels and trade, satellites, terraforming, ark construction, seed complex failure around turn 150, and save/load (local slots plus file export/import).
- Story "Cold Ledger": briefing, four factions, ledger evidence, story events, and endings (Second Ark, Green Horizon, Open Charter, Board Rule, Ghost Town).
- UI: title screen, briefing, difficulty, ship packing, planet and landing-site selection, isometric map with procedural art, tile picker, inspector, newspaper log, reports, event and ending dialogs.
- Play-test fixes: robots usable from turn 1 (the seed lander provides robot control), seed units can be damaged but not destroyed by disasters, no disasters before turn 40, selecting a tile no longer recentres the camera, and fixed garbled symbols in the game screen.
- Headless tests: data matches the original tables, the recommended manifest is valid, seed units finish in the manual's order, robots deploy on turn 1, scripted colonies survive 220 turns, and saves round-trip.

### Reason
Requested a colony survival game with deep, classic mechanics (to be rebalanced after play), for web and desktop, full scope, with an original "Cold Ledger" plot and all-original assets.
