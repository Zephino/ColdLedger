import type { GameState } from "./sim/types";

const PREFIX = "coldLedger.save.";

export interface SaveSlot {
  key: string;
  name: string;
  turn: number;
  savedAt: string;
}

export function serialize(s: GameState): string {
  return JSON.stringify(s);
}

export function deserialize(text: string): GameState | string {
  try {
    const parsed = JSON.parse(text) as Partial<GameState>;
    if (parsed.version !== 1 || !Array.isArray(parsed.levels) || typeof parsed.turn !== "number") return "Not a Cold Ledger save file.";
    return parsed as GameState;
  } catch {
    return "The save file could not be read.";
  }
}

export function saveToSlot(s: GameState, name: string): void {
  const key = `${PREFIX}${name}`;
  localStorage.setItem(key, serialize(s));
  localStorage.setItem(`${key}.meta`, JSON.stringify({ name, turn: s.turn, savedAt: new Date().toISOString() }));
}

export function listSlots(): SaveSlot[] {
  const slots: SaveSlot[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(PREFIX) || !key.endsWith(".meta")) continue;
    try {
      const meta = JSON.parse(localStorage.getItem(key) ?? "{}");
      slots.push({ key: key.slice(0, -5), name: meta.name, turn: meta.turn, savedAt: meta.savedAt });
    } catch {
      /* ignore damaged metadata */
    }
  }
  return slots.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export function loadSlot(key: string): GameState | string {
  const text = localStorage.getItem(key);
  if (!text) return "That save no longer exists.";
  return deserialize(text);
}

export function deleteSlot(key: string): void {
  localStorage.removeItem(key);
  localStorage.removeItem(`${key}.meta`);
}

export function downloadSave(s: GameState): void {
  const blob = new Blob([serialize(s)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${s.colonyName.replace(/[^\w-]+/g, "_")}-turn${s.turn}.coldledger.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
