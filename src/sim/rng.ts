import type { GameState } from "./types";

/** mulberry32 step; state lives in GameState.rng so saves replay identically. */
export function nextRandom(state: { rng: number }): number {
  let t = (state.rng = (state.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function chance(state: GameState | { rng: number }, p: number): boolean {
  return nextRandom(state) < p;
}

export function randInt(state: { rng: number }, lo: number, hi: number): number {
  return lo + Math.floor(nextRandom(state) * (hi - lo + 1));
}

export function pick<T>(state: { rng: number }, list: readonly T[]): T {
  return list[Math.floor(nextRandom(state) * list.length)];
}

/** Rounds an expected count to an integer without systematic bias. */
export function stochasticRound(state: { rng: number }, x: number): number {
  const base = Math.floor(x);
  return base + (nextRandom(state) < x - base ? 1 : 0);
}

export function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
