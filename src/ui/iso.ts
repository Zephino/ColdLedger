import { BUILDINGS, type BuildingId } from "../data/buildings";
import { PLANET_BY_ID } from "../data/planets";
import { NEIGHBORS4 } from "../sim/map";
import type { GameState, Robot, Structure, Tile } from "../sim/types";

const TW = 64;
const TH = 32;

export interface Preview {
  tiles: Array<[number, number]>;
  ok: boolean;
  id?: BuildingId;
}

function hash(x: number, y: number, l: number) {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ Math.imul(l + 7, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, Math.round(((n >> 16) & 255) * f)));
  const g = Math.max(0, Math.min(255, Math.round(((n >> 8) & 255) * f)));
  const b = Math.max(0, Math.min(255, Math.round((n & 255) * f)));
  return `rgb(${r},${g},${b})`;
}

function mix(a: string, b: string, t: number): string {
  const na = parseInt(a.slice(1), 16);
  const nb = parseInt(b.slice(1), 16);
  const c = (s: number) => Math.round(((na >> s) & 255) * (1 - t) + ((nb >> s) & 255) * t);
  return `#${((c(16) << 16) | (c(8) << 8) | c(0)).toString(16).padStart(6, "0")}`;
}

const SURFACE_COLORS: Record<string, string> = {
  clear: "#5b5247",
  rough: "#6e5a45",
  hostile: "#7a4434",
  impassable: "#2f2a27",
};
const UG_COLORS: Record<string, string> = { easy: "#3b3229", diff: "#4a3a2e", imposs: "#4d2626" };

const DOMES = new Set<BuildingId>(["agridome", "chap", "park", "rec", "terraform"]);
const LOW = new Set<BuildingId>(["tube", "ugTube", "road", "monorail", "airShaft", "ugShaft"]);

export class IsoView {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  state: GameState;
  level = 0;
  zoom = 1;
  camX = 0;
  camY = 0;
  hover: { x: number; y: number } | null = null;
  selected: { x: number; y: number } | null = null;
  preview: Preview | null = null;
  private raf = 0;
  private dpr = 1;

  constructor(canvas: HTMLCanvasElement, state: GameState) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.state = state;
    this.centerOn(state.center.x, state.center.y);
    const loop = () => {
      this.draw();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
  }

  resize() {
    this.dpr = window.devicePixelRatio || 1;
    const r = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.max(1, Math.floor(r.width * this.dpr));
    this.canvas.height = Math.max(1, Math.floor(r.height * this.dpr));
  }

  centerOn(x: number, y: number) {
    this.camX = (x - y) * (TW / 2);
    this.camY = (x + y) * (TH / 2);
  }

  private origin() {
    const w = this.canvas.width / this.dpr;
    const hgt = this.canvas.height / this.dpr;
    return { ox: w / 2 - this.camX * this.zoom, oy: hgt / 2 - this.camY * this.zoom };
  }

  tileToScreen(x: number, y: number) {
    const { ox, oy } = this.origin();
    return { sx: ox + (x - y) * (TW / 2) * this.zoom, sy: oy + (x + y) * (TH / 2) * this.zoom };
  }

  screenToTile(px: number, py: number): { x: number; y: number } | null {
    const { ox, oy } = this.origin();
    const a = (px - ox) / ((TW / 2) * this.zoom);
    const b = (py - oy) / ((TH / 2) * this.zoom);
    const x = Math.floor((a + b) / 2 + 0.5);
    const y = Math.floor((b - a) / 2 + 0.5);
    if (x < 0 || y < 0 || x >= this.state.width || y >= this.state.height) return null;
    return { x, y };
  }

  pan(dx: number, dy: number) {
    this.camX += dx / this.zoom;
    this.camY += dy / this.zoom;
  }

  zoomBy(f: number) {
    this.zoom = Math.max(0.45, Math.min(2.2, this.zoom * f));
  }

  private diamond(sx: number, sy: number, z: number) {
    const c = this.ctx;
    c.beginPath();
    c.moveTo(sx, sy - (TH / 2) * z);
    c.lineTo(sx + (TW / 2) * z, sy);
    c.lineTo(sx, sy + (TH / 2) * z);
    c.lineTo(sx - (TW / 2) * z, sy);
    c.closePath();
  }

  private tileColor(t: Tile, x: number, y: number): string {
    const s = this.state;
    const n = hash(x, y, this.level);
    if (this.level === 0) {
      let base = SURFACE_COLORS[t.terrain] ?? "#555";
      const planet = PLANET_BY_ID[s.planetId];
      if (planet.tidallyLocked) {
        const side = (x - y) / (s.width * 2) + 0.5;
        base = mix(base, side < 0.5 ? "#9a6a3e" : "#3c4f66", Math.abs(side - 0.5) * 0.9);
      }
      if (t.dozed) base = mix(base, "#8b8072", 0.45);
      return shade(base, 0.88 + n * 0.22);
    }
    if (!t.seen) return "#0a0b0d";
    if (!t.dug) return shade(UG_COLORS[t.terrain] ?? "#333", 0.6 + n * 0.15);
    let base = mix(UG_COLORS[t.terrain] ?? "#333", "#6d6356", 0.5);
    if (t.dozed) base = mix(base, "#8a8070", 0.4);
    return shade(base, 0.9 + n * 0.15);
  }

  draw() {
    const c = this.ctx;
    const s = this.state;
    const z = this.zoom;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const w = this.canvas.width / this.dpr;
    const hgt = this.canvas.height / this.dpr;
    const sky = c.createLinearGradient(0, 0, w, hgt);
    if (this.level === 0) {
      sky.addColorStop(0, "#1b130f");
      sky.addColorStop(0.5, "#0d0f14");
      sky.addColorStop(1, "#070a12");
    } else {
      sky.addColorStop(0, "#07080a");
      sky.addColorStop(1, "#050506");
    }
    c.fillStyle = sky;
    c.fillRect(0, 0, w, hgt);
    const time = performance.now() / 1000;
    const level = s.levels[this.level];
    if (!level) return;

    // Draw in back-to-front order (x + y ascending).
    for (let sum = 0; sum <= s.width + s.height - 2; sum++) {
      for (let x = Math.max(0, sum - s.height + 1); x <= Math.min(sum, s.width - 1); x++) {
        const y = sum - x;
        const { sx, sy } = this.tileToScreen(x, y);
        if (sx < -TW * z || sx > w + TW * z || sy < -TH * 3 * z || sy > hgt + TH * z) continue;
        const t = level[y][x];
        this.diamond(sx, sy, z);
        c.fillStyle = this.tileColor(t, x, y);
        c.fill();
        if (z > 0.7 && (t.dozed || (this.level > 0 && t.dug))) {
          c.strokeStyle = "rgba(0,0,0,0.18)";
          c.lineWidth = 1;
          c.stroke();
        }
        if (this.level === 0 && t.terrain === "impassable") this.drawRocks(sx, sy, z, x, y);
        if (this.level === 0 && t.terrain === "hostile" && hash(x, y, 9) > 0.6) this.drawCrack(sx, sy, z, x, y);
        if (this.level > 0 && t.seen && !t.dug && t.terrain === "imposs") this.drawRocks(sx, sy, z, x, y);
        if (t.beacon?.known && t.structure === undefined && this.level === 0) this.drawBeacon(sx, sy, z, time);
        if (t.structure !== undefined) {
          const st = s.structures[t.structure];
          if (st) this.drawStructure(st, sx, sy, z, time);
        }
        if (t.robot !== undefined) {
          const r = s.robots[t.robot];
          if (r) this.drawRobot(r, sx, sy, z, time);
        }
      }
    }

    if (this.preview) {
      for (const [x, y] of this.preview.tiles) {
        const { sx, sy } = this.tileToScreen(x, y);
        this.diamond(sx, sy, z);
        c.fillStyle = this.preview.ok ? "rgba(90,220,140,0.25)" : "rgba(230,80,70,0.25)";
        c.fill();
        c.strokeStyle = this.preview.ok ? "#6fe0a0" : "#ff6a5a";
        c.lineWidth = 2;
        c.stroke();
      }
    }
    if (this.hover && !this.preview) {
      const { sx, sy } = this.tileToScreen(this.hover.x, this.hover.y);
      this.diamond(sx, sy, z);
      c.strokeStyle = "rgba(255,255,255,0.7)";
      c.lineWidth = 1.5;
      c.stroke();
    }
    if (this.selected) {
      const { sx, sy } = this.tileToScreen(this.selected.x, this.selected.y);
      this.diamond(sx, sy, z);
      c.strokeStyle = `rgba(255,214,120,${0.6 + 0.4 * Math.sin(time * 4)})`;
      c.lineWidth = 2;
      c.stroke();
    }
  }

  private drawRocks(sx: number, sy: number, z: number, x: number, y: number) {
    const c = this.ctx;
    for (let i = 0; i < 3; i++) {
      const hx = (hash(x, y, 20 + i) - 0.5) * TW * 0.5 * z;
      const hy = (hash(x, y, 30 + i) - 0.5) * TH * 0.4 * z;
      const r = (5 + hash(x, y, 40 + i) * 7) * z;
      c.beginPath();
      c.moveTo(sx + hx - r, sy + hy);
      c.lineTo(sx + hx - r * 0.2, sy + hy - r * 1.4);
      c.lineTo(sx + hx + r, sy + hy);
      c.closePath();
      c.fillStyle = shade("#4a423c", 0.8 + hash(x, y, 50 + i) * 0.4);
      c.fill();
    }
  }

  private drawCrack(sx: number, sy: number, z: number, x: number, y: number) {
    const c = this.ctx;
    c.strokeStyle = "rgba(255,140,80,0.35)";
    c.lineWidth = 1;
    c.beginPath();
    const a = (hash(x, y, 61) - 0.5) * TW * 0.5 * z;
    c.moveTo(sx + a, sy - 6 * z);
    c.lineTo(sx - a * 0.3, sy + 2 * z);
    c.lineTo(sx + a * 0.6, sy + 7 * z);
    c.stroke();
  }

  private drawBeacon(sx: number, sy: number, z: number, time: number) {
    const c = this.ctx;
    const pulse = 0.6 + 0.4 * Math.sin(time * 3);
    c.beginPath();
    c.moveTo(sx, sy - 9 * z);
    c.lineTo(sx + 7 * z, sy - 2 * z);
    c.lineTo(sx, sy + 5 * z);
    c.lineTo(sx - 7 * z, sy - 2 * z);
    c.closePath();
    c.fillStyle = `rgba(235,60,60,${pulse})`;
    c.fill();
    c.strokeStyle = "#ffb0a0";
    c.lineWidth = 1;
    c.stroke();
  }

  private box(sx: number, sy: number, z: number, scale: number, height: number, color: string) {
    const c = this.ctx;
    const hw = (TW / 2) * z * scale;
    const hh = (TH / 2) * z * scale;
    const top = sy - height * z;
    c.beginPath();
    c.moveTo(sx - hw, sy);
    c.lineTo(sx, sy + hh);
    c.lineTo(sx, top + hh);
    c.lineTo(sx - hw, top);
    c.closePath();
    c.fillStyle = shade(color, 0.62);
    c.fill();
    c.beginPath();
    c.moveTo(sx + hw, sy);
    c.lineTo(sx, sy + hh);
    c.lineTo(sx, top + hh);
    c.lineTo(sx + hw, top);
    c.closePath();
    c.fillStyle = shade(color, 0.8);
    c.fill();
    c.beginPath();
    c.moveTo(sx, top - hh);
    c.lineTo(sx + hw, top);
    c.lineTo(sx, top + hh);
    c.lineTo(sx - hw, top);
    c.closePath();
    c.fillStyle = color;
    c.fill();
    return top;
  }

  private dome(sx: number, sy: number, z: number, scale: number, height: number, color: string) {
    const c = this.ctx;
    const hw = (TW / 2) * z * scale;
    const hh = (TH / 2) * z * scale;
    this.box(sx, sy, z, scale, 4, "#7c838a");
    const base = sy - 4 * z;
    c.beginPath();
    c.ellipse(sx, base, hw * 0.92, hh * 0.92, 0, 0, Math.PI * 2);
    c.fillStyle = shade(color, 0.7);
    c.fill();
    const g = c.createRadialGradient(sx - hw * 0.3, base - height * z * 0.8, 2, sx, base - height * z * 0.3, hw);
    g.addColorStop(0, "rgba(255,255,255,0.75)");
    g.addColorStop(0.3, color);
    g.addColorStop(1, shade(color, 0.55));
    c.beginPath();
    c.ellipse(sx, base, hw * 0.92, height * z, 0, Math.PI, Math.PI * 2);
    c.ellipse(sx, base, hw * 0.92, hh * 0.92, 0, 0, Math.PI);
    c.fillStyle = g;
    c.globalAlpha = 0.92;
    c.fill();
    c.globalAlpha = 1;
  }

  private connectorsFor(st: Structure): Array<[number, number]> {
    const s = this.state;
    const out: Array<[number, number]> = [];
    for (const [dx, dy] of NEIGHBORS4) {
      const t = s.levels[st.level][st.y + dy]?.[st.x + dx];
      if (t?.structure === undefined) continue;
      const other = s.structures[t.structure];
      if (!other || other.state === "destroyed") continue;
      const def = BUILDINGS[other.type];
      if (st.type === "road" ? other.type === "road" : st.type === "monorail" ? other.type === "monorail" || other.type === "monoStation" : def.needsTube || other.type === "tube" || other.type === "ugTube" || other.type === "seedLander" || other.type === "airShaft" || other.type === "ugShaft")
        out.push([dx, dy]);
    }
    return out;
  }

  private drawStructure(st: Structure, sx: number, sy: number, z: number, time: number) {
    const c = this.ctx;
    const def = BUILDINGS[st.type];
    let color = def.color;
    if (st.state === "destroyed") {
      this.box(sx, sy, z, 0.7, 3, "#3a3533");
      c.fillStyle = "rgba(20,20,20,0.6)";
      c.fillRect(sx - 8 * z, sy - 6 * z, 16 * z, 4 * z);
      return;
    }
    if (st.state === "exhausted") color = "#5a5552";
    if (st.connected === false && def.needsTube) color = mix(color, "#555555", 0.6);

    if (LOW.has(st.type)) {
      const conns = this.connectorsFor(st);
      const width = st.type === "road" ? 9 : st.type === "monorail" ? 4 : 6;
      const col = st.type === "road" ? "#3b3733" : st.type === "monorail" ? "#a7adb8" : st.state === "building" ? "#7a7f86" : "#9aa3ad";
      c.lineCap = "round";
      c.strokeStyle = col;
      c.lineWidth = width * z;
      for (const [dx, dy] of conns) {
        const ex = sx + ((dx - dy) * TW * z) / 4;
        const ey = sy + ((dx + dy) * TH * z) / 4;
        c.beginPath();
        c.moveTo(sx, sy - 2 * z);
        c.lineTo(ex, ey - 2 * z);
        c.stroke();
      }
      if (st.type === "airShaft" || st.type === "ugShaft") {
        c.beginPath();
        c.ellipse(sx, sy - 3 * z, 12 * z, 6 * z, 0, 0, Math.PI * 2);
        c.fillStyle = "#5a636c";
        c.fill();
        c.beginPath();
        c.ellipse(sx, sy - 5 * z, 8 * z, 4 * z, 0, 0, Math.PI * 2);
        c.fillStyle = "#1c2024";
        c.fill();
      } else if (!conns.length || st.type === "tube" || st.type === "ugTube") {
        c.beginPath();
        c.ellipse(sx, sy - 2 * z, 5 * z, 2.5 * z, 0, 0, Math.PI * 2);
        c.fillStyle = col;
        c.fill();
      }
      return;
    }

    if (st.state === "building") {
      const p = 1 - st.buildLeft / Math.max(1, st.buildTotal);
      const top = this.box(sx, sy, z, 0.8, 4 + 16 * p, mix(color, "#6b6f75", 0.6));
      c.strokeStyle = "rgba(255,210,90,0.8)";
      c.setLineDash([3 * z, 3 * z]);
      c.lineWidth = 1;
      c.strokeRect(sx - 14 * z, top - 12 * z, 28 * z, 22 * z);
      c.setLineDash([]);
      return;
    }

    const height = st.type === "commTower" ? 0 : def.category === "seed" ? 18 : st.type === "residence" ? 16 + st.tier * 4 : 14;
    if (DOMES.has(st.type)) this.dome(sx, sy, z, 0.85, 20, color);
    else if (st.type === "commTower") {
      this.box(sx, sy, z, 0.4, 6, "#8a8f96");
      c.strokeStyle = "#c9ccd2";
      c.lineWidth = 2 * z;
      c.beginPath();
      c.moveTo(sx, sy - 6 * z);
      c.lineTo(sx, sy - 44 * z);
      c.stroke();
      c.fillStyle = `rgba(255,80,60,${0.5 + 0.5 * Math.sin(time * 5)})`;
      c.beginPath();
      c.arc(sx, sy - 45 * z, 2.5 * z, 0, Math.PI * 2);
      c.fill();
    } else if (st.type === "mine") {
      this.box(sx, sy, z, 0.6, 6, "#5c4a3c");
      c.strokeStyle = "#b08a5a";
      c.lineWidth = 2 * z;
      c.beginPath();
      c.moveTo(sx - 10 * z, sy - 4 * z);
      c.lineTo(sx, sy - 30 * z);
      c.lineTo(sx + 10 * z, sy - 4 * z);
      c.moveTo(sx - 6 * z, sy - 14 * z);
      c.lineTo(sx + 6 * z, sy - 14 * z);
      c.stroke();
      if (st.state === "active") {
        c.fillStyle = `rgba(255,180,90,${0.4 + 0.4 * Math.sin(time * 6 + st.id)})`;
        c.fillRect(sx - 2 * z, sy - 32 * z, 4 * z, 4 * z);
      }
    } else if (st.type === "tokamak" || st.type === "shipTokamak") {
      this.box(sx, sy, z, 0.85, 8, "#6c6a60");
      c.lineWidth = 6 * z;
      c.strokeStyle = st.state === "active" ? `rgba(255,${200 + 40 * Math.sin(time * 3)},120,0.95)` : "#77705a";
      c.beginPath();
      c.ellipse(sx, sy - 16 * z, 16 * z, 8 * z, 0, 0, Math.PI * 2);
      c.stroke();
    } else if (st.type === "colonistLander" || st.type === "cargoLander" || st.type === "seedLander") {
      c.fillStyle = st.type === "seedLander" ? "#cfd6de" : "#e2e4ea";
      c.beginPath();
      c.moveTo(sx - 16 * z, sy);
      c.lineTo(sx, sy - (st.type === "seedLander" ? 40 : 30) * z);
      c.lineTo(sx + 16 * z, sy);
      c.closePath();
      c.fill();
      c.fillStyle = "rgba(0,0,0,0.25)";
      c.beginPath();
      c.moveTo(sx, sy - (st.type === "seedLander" ? 40 : 30) * z);
      c.lineTo(sx + 16 * z, sy);
      c.lineTo(sx, sy + 4 * z);
      c.closePath();
      c.fill();
      c.strokeStyle = "#9aa3ad";
      c.lineWidth = 2 * z;
      c.beginPath();
      c.moveTo(sx - 14 * z, sy + 1 * z);
      c.lineTo(sx - 20 * z, sy + 6 * z);
      c.moveTo(sx + 14 * z, sy + 1 * z);
      c.lineTo(sx + 20 * z, sy + 6 * z);
      c.stroke();
    } else if (st.type === "solarReceiver") {
      this.box(sx, sy, z, 0.7, 4, "#555");
      c.fillStyle = "#3d5a8a";
      c.beginPath();
      c.moveTo(sx - 18 * z, sy - 10 * z);
      c.lineTo(sx, sy - 22 * z);
      c.lineTo(sx + 18 * z, sy - 10 * z);
      c.lineTo(sx, sy + 2 * z);
      c.closePath();
      c.fill();
      c.strokeStyle = "#e0b040";
      c.stroke();
    } else {
      const top = this.box(sx, sy, z, st.type === "storage" ? 0.7 : 0.82, height, color);
      if (st.state === "active" && z > 0.6) {
        c.fillStyle = `rgba(255,230,160,${0.55 + 0.25 * Math.sin(time * 2 + st.id)})`;
        for (let i = 0; i < 3; i++) c.fillRect(sx + (4 + i * 6) * z, top + (8 + i * 2) * z, 3 * z, 3 * z);
      }
      if (st.type === "storage") {
        c.beginPath();
        c.ellipse(sx, top, 12 * z, 6 * z, 0, 0, Math.PI * 2);
        c.fillStyle = shade(color, 1.1);
        c.fill();
      }
      if (st.type === "spaceport" || st.type === "massDriver") {
        c.strokeStyle = "#e8eef4";
        c.lineWidth = 2 * z;
        c.beginPath();
        c.moveTo(sx, top);
        c.lineTo(sx + 10 * z, top - 24 * z);
        c.stroke();
      }
    }

    // Status markers
    if (st.state === "idle" && !def.passive) {
      c.fillStyle = "#f2b33d";
      c.beginPath();
      c.arc(sx + 12 * z, sy - 26 * z, 4 * z, 0, Math.PI * 2);
      c.fill();
    }
    if (st.state === "broken") {
      const a = 0.5 + 0.5 * Math.sin(time * 8);
      c.strokeStyle = `rgba(255,70,60,${a})`;
      c.lineWidth = 3 * z;
      c.beginPath();
      c.moveTo(sx - 7 * z, sy - 30 * z);
      c.lineTo(sx + 7 * z, sy - 16 * z);
      c.moveTo(sx + 7 * z, sy - 30 * z);
      c.lineTo(sx - 7 * z, sy - 16 * z);
      c.stroke();
    }
  }

  private drawRobot(r: Robot, sx: number, sy: number, z: number, time: number) {
    const c = this.ctx;
    const colors: Record<string, string> = { dozer: "#f2c14e", digger: "#e07a5f", miner: "#c08552", explorer: "#7fc8f8", airbot: "#a6e3e9", repairbot: "#9be564", humanoid: "#ddd" };
    const bob = Math.sin(time * 6 + r.id) * 2 * z;
    c.fillStyle = "rgba(0,0,0,0.35)";
    c.beginPath();
    c.ellipse(sx, sy + 2 * z, 10 * z, 5 * z, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = colors[r.kind] ?? "#fff";
    c.beginPath();
    c.arc(sx, sy - 8 * z + bob, 8 * z, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = "#111";
    c.lineWidth = 1.5;
    c.stroke();
    if (z > 0.6) {
      c.fillStyle = "#111";
      c.font = `bold ${Math.round(10 * z)}px system-ui, sans-serif`;
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText(r.kind[0].toUpperCase(), sx, sy - 8 * z + bob);
    }
  }
}

/** Small top-down preview used by the site chooser. */
export function drawMinimap(canvas: HTMLCanvasElement, tiles: Tile[][], showBeacons: boolean, center?: { x: number; y: number }) {
  const c = canvas.getContext("2d")!;
  const n = tiles.length;
  const px = canvas.width / n;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const t = tiles[y][x];
      c.fillStyle = { clear: "#141414", rough: "#7a2b22", hostile: "#2f6b3a", impassable: "#a4b23a" }[t.terrain as string] ?? "#000";
      c.fillRect(x * px, y * px, Math.ceil(px), Math.ceil(px));
    }
  }
  if (showBeacons) {
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        if (!tiles[y][x].beacon) continue;
        c.fillStyle = "#ff4d4d";
        c.beginPath();
        c.moveTo(x * px + px / 2, y * px - px);
        c.lineTo(x * px + px * 2, y * px + px / 2);
        c.lineTo(x * px + px / 2, y * px + px * 2);
        c.lineTo(x * px - px, y * px + px / 2);
        c.fill();
      }
    }
  }
  if (center) {
    c.strokeStyle = "#fff";
    c.lineWidth = 2;
    c.strokeRect((center.x - 2) * px, (center.y - 2) * px, px * 5, px * 5);
  }
}
