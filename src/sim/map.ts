import type { PlanetDef } from "../data/planets";
import type { Ore } from "../data/resources";
import { hashSeed, nextRandom } from "./rng";
import type { Deposit, GameState, SurfaceTerrain, Tile, UgTerrain } from "./types";

export const MAP_SIZE = 48;

function lattice(seed: number, x: number, y: number): number {
  let h = seed ^ Math.imul(x, 374761393) ^ Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function smooth(t: number) {
  return t * t * (3 - 2 * t);
}

function valueNoise(seed: number, x: number, y: number, scale: number): number {
  const fx = x / scale;
  const fy = y / scale;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const tx = smooth(fx - x0);
  const ty = smooth(fy - y0);
  const a = lattice(seed, x0, y0);
  const b = lattice(seed, x0 + 1, y0);
  const c = lattice(seed, x0, y0 + 1);
  const d = lattice(seed, x0 + 1, y0 + 1);
  return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
}

function fbm(seed: number, x: number, y: number): number {
  return valueNoise(seed, x, y, 11) * 0.6 + valueNoise(seed + 17, x, y, 5) * 0.3 + valueNoise(seed + 31, x, y, 2.3) * 0.1;
}

/** Converts a noise field into terrain classes matching the planet's terrain shares. */
function classify(values: number[], shares: number[]): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  const cuts: number[] = [];
  let acc = 0;
  for (let i = 0; i < shares.length - 1; i++) {
    acc += shares[i];
    cuts.push(sorted[Math.min(sorted.length - 1, Math.floor(acc * sorted.length))]);
  }
  return values.map((v) => {
    let k = 0;
    while (k < cuts.length && v > cuts[k]) k++;
    return k;
  });
}

const ORE_TABLE: Array<[Ore, number]> = [
  ["OreA", 60],
  ["OreB", 22],
  ["OreC", 18],
  ["OreD", 16],
  ["OreMinA", 18],
  ["OreMinB", 22],
  ["OreMinC", 20],
  ["OreFusionA", 10],
  ["OreFusionB", 8],
  ["OreFusionC", 7],
];

function makeDeposit(rng: { rng: number }, planet: PlanetDef, known: boolean): Deposit {
  const mix: Partial<Record<Ore, number>> = {};
  for (const [ore, w] of ORE_TABLE) {
    if (nextRandom(rng) < 0.6) mix[ore] = w * (0.4 + nextRandom(rng) * 1.2);
  }
  if (!mix.OreA) mix.OreA = 35;
  if (!mix.OreMinA) mix.OreMinA = 12;
  return { mix, richness: planet.richness * (0.7 + nextRandom(rng) * 0.6), known };
}

export function siteSeed(gameSeed: number, planetId: string, site: number): number {
  return hashSeed(`${gameSeed}:${planetId}:${site}`);
}

export interface GeneratedMap {
  levels: Tile[][][];
  center: { x: number; y: number };
}

export function generateMap(seed: number, planet: PlanetDef, geoProbe: boolean): GeneratedMap {
  const rng = { rng: seed };
  const n = MAP_SIZE;
  const values: number[] = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) values.push(fbm(seed, x, y));
  const t = planet.terrain;
  const classes = classify(values, [t.clear, t.rough, t.hostile, t.impassable]);
  const kinds: SurfaceTerrain[] = ["clear", "rough", "hostile", "impassable"];
  const center = { x: Math.floor(n / 2), y: Math.floor(n / 2) };

  const surface: Tile[][] = [];
  for (let y = 0; y < n; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < n; x++) {
      let k = classes[y * n + x];
      const d = Math.max(Math.abs(x - center.x), Math.abs(y - center.y));
      if (d <= 3) k = 0;
      else if (d <= 5 && k > 1) k = 1;
      row.push({ terrain: kinds[k], dozed: false, dug: true, seen: true });
    }
    surface.push(row);
  }

  const beaconCount = Math.max(4, Math.round((planet.beacons * n * n) / 1000));
  let placed = 0;
  let guard = 0;
  while (placed < beaconCount && guard++ < 5000) {
    const x = 2 + Math.floor(nextRandom(rng) * (n - 4));
    const y = 2 + Math.floor(nextRandom(rng) * (n - 4));
    const tile = surface[y][x];
    const d = Math.max(Math.abs(x - center.x), Math.abs(y - center.y));
    if (tile.beacon || tile.terrain === "impassable" || d < 3) continue;
    const nearbyBeacon = surface.slice(Math.max(0, y - 2), y + 3).some((r) => r.slice(Math.max(0, x - 2), x + 3).some((c) => c.beacon));
    if (nearbyBeacon) continue;
    const near = d < 9;
    tile.beacon = makeDeposit(rng, planet, near || geoProbe || nextRandom(rng) < 0.35);
    placed++;
  }
  // Guarantee two workable beacons close to the seed site.
  const starters: Array<[number, number, Partial<Record<Ore, number>>]> = [
    [5, -2, { OreA: 40, OreB: 25, OreC: 20, OreD: 20, OreMinA: 10 }],
    [-4, 5, { OreMinA: 18, OreMinB: 25, OreMinC: 25, OreFusionA: 12, OreFusionB: 8, OreFusionC: 8, OreA: 10 }],
  ];
  for (const [dx, dy, mix] of starters) {
    const tile = surface[center.y + dy][center.x + dx];
    tile.beacon = { mix, richness: planet.richness, known: true };
    if (tile.terrain === "impassable") tile.terrain = "rough";
  }

  const levels: Tile[][][] = [surface];
  for (let l = 1; l <= planet.digDepth; l++) {
    const ug: Tile[][] = [];
    for (let y = 0; y < n; y++) {
      const row: Tile[] = [];
      for (let x = 0; x < n; x++) {
        const v = fbm(seed + 1000 * l, x, y);
        const hardness: UgTerrain = v < 0.55 - l * 0.03 ? "easy" : v < 0.8 - l * 0.02 ? "diff" : "imposs";
        row.push({ terrain: hardness, dozed: false, dug: false, seen: false });
      }
      ug.push(row);
    }
    levels.push(ug);
  }
  return { levels, center };
}

export function inBounds(state: Pick<GameState, "width" | "height">, x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < state.width && y < state.height;
}

export function tileAt(state: GameState, level: number, x: number, y: number): Tile | undefined {
  if (!inBounds(state, x, y)) return undefined;
  return state.levels[level]?.[y]?.[x];
}

export const NEIGHBORS4: Array<[number, number]> = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

export const NEIGHBORS8: Array<[number, number]> = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
];

export function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

/** Low-resolution terrain preview for the site chooser. */
export function previewSurface(seed: number, planet: PlanetDef): SurfaceTerrain[][] {
  return generateMap(seed, planet, true).levels[0].map((row) => row.map((t) => t.terrain as SurfaceTerrain));
}
