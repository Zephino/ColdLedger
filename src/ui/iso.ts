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
      sky.addColorStop(0, "#0a1628");
      sky.addColorStop(0.45, "#071018");
      sky.addColorStop(1, "#04060c");
    } else {
      sky.addColorStop(0, "#06080f");
      sky.addColorStop(1, "#03040a");
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

  private accent(color: string): string {
    // Pull building colors toward cool cyan/violet for a futuristic read.
    return mix(color, "#5ee7ff", 0.28);
  }

  private glowRing(sx: number, sy: number, z: number, rx: number, ry: number, rgba: string, width = 1.5) {
    const c = this.ctx;
    c.save();
    c.shadowColor = rgba;
    c.shadowBlur = 8 * z;
    c.strokeStyle = rgba;
    c.lineWidth = width * z;
    c.beginPath();
    c.ellipse(sx, sy, rx * z, ry * z, 0, 0, Math.PI * 2);
    c.stroke();
    c.restore();
  }

  private box(sx: number, sy: number, z: number, scale: number, height: number, color: string) {
    const c = this.ctx;
    const hw = (TW / 2) * z * scale;
    const hh = (TH / 2) * z * scale;
    const top = sy - height * z;
    const body = mix(color, "#1a2433", 0.35);
    c.beginPath();
    c.moveTo(sx - hw, sy);
    c.lineTo(sx, sy + hh);
    c.lineTo(sx, top + hh);
    c.lineTo(sx - hw, top);
    c.closePath();
    c.fillStyle = shade(body, 0.55);
    c.fill();
    c.beginPath();
    c.moveTo(sx + hw, sy);
    c.lineTo(sx, sy + hh);
    c.lineTo(sx, top + hh);
    c.lineTo(sx + hw, top);
    c.closePath();
    c.fillStyle = shade(body, 0.72);
    c.fill();
    c.beginPath();
    c.moveTo(sx, top - hh);
    c.lineTo(sx + hw, top);
    c.lineTo(sx, top + hh);
    c.lineTo(sx - hw, top);
    c.closePath();
    const roof = c.createLinearGradient(sx - hw, top - hh, sx + hw, top + hh);
    roof.addColorStop(0, shade(this.accent(color), 1.15));
    roof.addColorStop(0.45, mix(color, "#d7f7ff", 0.25));
    roof.addColorStop(1, shade(body, 0.9));
    c.fillStyle = roof;
    c.fill();
    c.strokeStyle = "rgba(120,220,255,0.28)";
    c.lineWidth = Math.max(0.6, 0.9 * z);
    c.stroke();
    return top;
  }

  private ledStrip(sx: number, syTop: number, z: number, active: boolean, time: number, rows = 2) {
    if (z < 0.5) return;
    const c = this.ctx;
    const pulse = active ? 0.55 + 0.35 * Math.sin(time * 3) : 0.2;
    for (let r = 0; r < rows; r++) {
      const wy = syTop + 7 * z + r * 5 * z;
      c.fillStyle = `rgba(80,230,255,${pulse})`;
      c.fillRect(sx - 10 * z, wy, 20 * z, 1.6 * z);
      c.fillStyle = `rgba(180,120,255,${pulse * 0.55})`;
      c.fillRect(sx - 6 * z, wy + 2.2 * z, 12 * z, 1.1 * z);
    }
  }

  private vent(sx: number, sy: number, z: number, color: string, active: boolean, time: number) {
    const c = this.ctx;
    this.box(sx, sy, z, 0.2, 20, mix(color, "#2a3548", 0.4));
    this.glowRing(sx, sy - 22 * z, z, 4, 2, active ? `rgba(90,240,255,${0.45 + 0.3 * Math.sin(time * 4)})` : "rgba(90,140,180,0.25)", 2);
    if (active) {
      c.fillStyle = `rgba(140,250,255,${0.2 + 0.15 * Math.sin(time * 5)})`;
      c.beginPath();
      c.ellipse(sx, sy - 28 * z, 3.5 * z, 6 * z, 0, 0, Math.PI * 2);
      c.fill();
    }
  }

  private tank(sx: number, sy: number, z: number, color: string, tall = false, active = false, time = 0) {
    const c = this.ctx;
    const h = tall ? 18 : 12;
    const top = this.box(sx, sy, z, 0.55, h, mix(color, "#3a4b63", 0.35));
    c.beginPath();
    c.ellipse(sx, top, 14 * z, 7 * z, 0, 0, Math.PI * 2);
    c.fillStyle = mix(color, "#9fdfff", 0.35);
    c.fill();
    this.glowRing(sx, top + 5 * z, z, 11, 5, active ? `rgba(90,230,255,${0.4 + 0.25 * Math.sin(time * 2)})` : "rgba(90,160,200,0.25)");
    this.glowRing(sx, top + 10 * z, z, 11, 5, "rgba(160,120,255,0.22)");
  }

  private dish(sx: number, sy: number, z: number, color: string, time: number) {
    const c = this.ctx;
    this.box(sx, sy, z, 0.32, 7, "#2c3648");
    const ang = Math.sin(time * 0.8) * 0.2;
    c.save();
    c.translate(sx, sy - 14 * z);
    c.rotate(ang);
    c.beginPath();
    c.ellipse(0, 0, 15 * z, 7.5 * z, 0, 0, Math.PI * 2);
    c.fillStyle = mix(color, "#1b2a3d", 0.4);
    c.fill();
    c.strokeStyle = "rgba(120,235,255,0.85)";
    c.lineWidth = 1.4 * z;
    c.stroke();
    c.strokeStyle = `rgba(180,120,255,${0.35 + 0.25 * Math.sin(time * 3)})`;
    c.beginPath();
    c.ellipse(0, 0, 8 * z, 4 * z, 0, 0, Math.PI * 2);
    c.stroke();
    c.fillStyle = "rgba(180,250,255,0.9)";
    c.fillRect(-1 * z, 0, 2 * z, 9 * z);
    c.restore();
  }

  private crane(sx: number, sy: number, z: number, color: string, time: number) {
    const c = this.ctx;
    this.box(sx, sy, z, 0.55, 8, mix(color, "#243044", 0.3));
    const swing = Math.sin(time * 1.1) * 7 * z;
    c.strokeStyle = "rgba(140,230,255,0.9)";
    c.lineWidth = 2 * z;
    c.beginPath();
    c.moveTo(sx, sy - 8 * z);
    c.lineTo(sx + swing, sy - 26 * z);
    c.lineTo(sx + swing + 12 * z, sy - 21 * z);
    c.stroke();
    c.fillStyle = `rgba(255,120,220,${0.55 + 0.35 * Math.sin(time * 4)})`;
    c.beginPath();
    c.arc(sx + swing + 12 * z, sy - 21 * z, 2.2 * z, 0, Math.PI * 2);
    c.fill();
  }

  private dome(sx: number, sy: number, z: number, scale: number, height: number, color: string, time = 0) {
    const c = this.ctx;
    const hw = (TW / 2) * z * scale;
    const hh = (TH / 2) * z * scale;
    this.box(sx, sy, z, scale * 0.9, 4, "#1e2a3a");
    const base = sy - 4 * z;
    this.glowRing(sx, base + 1 * z, z, (hw * 0.95) / z, (hh * 0.95) / z, `rgba(90,230,255,${0.25 + 0.15 * Math.sin(time * 2)})`, 1.2);
    const g = c.createRadialGradient(sx - hw * 0.2, base - height * z * 0.75, 1, sx, base - height * z * 0.15, hw);
    g.addColorStop(0, "rgba(210,250,255,0.85)");
    g.addColorStop(0.35, mix(color, "#5ee7ff", 0.45));
    g.addColorStop(0.75, mix(color, "#7a5cff", 0.25));
    g.addColorStop(1, "rgba(20,30,50,0.35)");
    c.beginPath();
    c.ellipse(sx, base, hw * 0.88, height * z, 0, Math.PI, Math.PI * 2);
    c.ellipse(sx, base, hw * 0.88, hh * 0.82, 0, 0, Math.PI);
    c.fillStyle = g;
    c.globalAlpha = 0.88;
    c.fill();
    c.globalAlpha = 1;
    c.strokeStyle = "rgba(180,250,255,0.55)";
    c.lineWidth = 1.2 * z;
    c.beginPath();
    c.ellipse(sx, base - height * z * 0.4, hw * 0.5, height * z * 0.32, 0, Math.PI * 1.1, Math.PI * 1.9);
    c.stroke();
    // Geo panel ribs
    c.strokeStyle = "rgba(120,200,255,0.25)";
    c.lineWidth = 0.8 * z;
    for (const t of [-0.45, 0, 0.45]) {
      c.beginPath();
      c.moveTo(sx + t * hw, base);
      c.quadraticCurveTo(sx + t * hw * 0.4, base - height * z, sx, base - height * z);
      c.stroke();
    }
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
    const active = st.state === "active";
    if (st.state === "destroyed") {
      this.box(sx, sy, z, 0.65, 3, "#2a2e36");
      c.fillStyle = "rgba(255,70,90,0.35)";
      c.fillRect(sx - 9 * z, sy - 8 * z, 18 * z, 3 * z);
      return;
    }
    if (st.state === "exhausted") color = mix(color, "#4a5566", 0.7);
    if (st.connected === false && def.needsTube) color = mix(color, "#3a4455", 0.55);

    if (LOW.has(st.type)) {
      const conns = this.connectorsFor(st);
      const isRoad = st.type === "road";
      const isMono = st.type === "monorail";
      const width = isRoad ? 8 : isMono ? 3.5 : 5.5;
      const pulse = 0.45 + 0.25 * Math.sin(time * 2 + st.x * 0.2);
      c.lineCap = "round";
      if (isRoad) {
        c.strokeStyle = "#2a3140";
        c.lineWidth = width * z;
      } else if (isMono) {
        c.strokeStyle = `rgba(180,210,255,${0.75 + pulse * 0.2})`;
        c.lineWidth = width * z;
        c.shadowColor = "rgba(120,200,255,0.55)";
        c.shadowBlur = 6 * z;
      } else {
        c.strokeStyle = st.state === "building" ? "rgba(90,140,170,0.7)" : `rgba(90,230,255,${0.55 + pulse * 0.35})`;
        c.lineWidth = width * z;
        c.shadowColor = "rgba(80,220,255,0.45)";
        c.shadowBlur = 5 * z;
      }
      for (const [dx, dy] of conns) {
        const ex = sx + ((dx - dy) * TW * z) / 4;
        const ey = sy + ((dx + dy) * TH * z) / 4;
        c.beginPath();
        c.moveTo(sx, sy - 2 * z);
        c.lineTo(ex, ey - 2 * z);
        c.stroke();
      }
      c.shadowBlur = 0;
      if (st.type === "airShaft" || st.type === "ugShaft") {
        c.beginPath();
        c.ellipse(sx, sy - 3 * z, 12 * z, 6 * z, 0, 0, Math.PI * 2);
        c.fillStyle = "#1c2736";
        c.fill();
        this.glowRing(sx, sy - 5 * z, z, 8, 4, `rgba(90,240,255,${0.35 + 0.25 * Math.sin(time * 3)})`, 2);
        c.beginPath();
        c.ellipse(sx, sy - 5 * z, 6 * z, 3 * z, 0, 0, Math.PI * 2);
        c.fillStyle = "#05080e";
        c.fill();
      } else if (!conns.length || st.type === "tube" || st.type === "ugTube") {
        this.glowRing(sx, sy - 2 * z, z, 5, 2.5, `rgba(90,230,255,${0.4 + pulse * 0.3})`, 2);
      }
      return;
    }

    if (st.state === "building") {
      const p = 1 - st.buildLeft / Math.max(1, st.buildTotal);
      const top = this.box(sx, sy, z, 0.78, 4 + 16 * p, mix(color, "#2a3648", 0.45));
      c.strokeStyle = `rgba(90,230,255,${0.45 + 0.35 * Math.sin(time * 4)})`;
      c.setLineDash([3 * z, 3 * z]);
      c.lineWidth = 1.2 * z;
      c.strokeRect(sx - 14 * z, top - 10 * z, 28 * z, 20 * z);
      c.setLineDash([]);
      this.glowRing(sx, sy + 2 * z, z, 16, 8, "rgba(120,180,255,0.2)", 1);
      return;
    }

    const height = st.type === "commTower" ? 0 : def.category === "seed" ? 18 : st.type === "residence" ? 16 + st.tier * 4 : 14;
    if (DOMES.has(st.type)) this.dome(sx, sy, z, 0.85, 20, color, time);
    else if (st.type === "commTower") {
      this.box(sx, sy, z, 0.35, 6, "#2a3648");
      c.strokeStyle = "rgba(160,220,255,0.9)";
      c.lineWidth = 2 * z;
      c.beginPath();
      c.moveTo(sx, sy - 6 * z);
      c.lineTo(sx, sy - 44 * z);
      c.stroke();
      this.glowRing(sx, sy - 28 * z, z, 6, 3, `rgba(180,120,255,${0.35 + 0.3 * Math.sin(time * 3)})`);
      c.fillStyle = `rgba(255,90,140,${0.55 + 0.4 * Math.sin(time * 5)})`;
      c.beginPath();
      c.arc(sx, sy - 45 * z, 2.8 * z, 0, Math.PI * 2);
      c.fill();
    } else if (st.type === "mine") {
      this.box(sx, sy, z, 0.58, 7, mix(color, "#243044", 0.25));
      this.crane(sx, sy, z, color, time);
      if (active) this.glowRing(sx, sy - 30 * z, z, 4, 2, `rgba(255,180,90,${0.4 + 0.35 * Math.sin(time * 5 + st.id)})`, 2);
    } else if (st.type === "tokamak" || st.type === "shipTokamak") {
      this.box(sx, sy, z, 0.8, 8, "#2a3140");
      const pulse = active ? 0.55 + 0.4 * Math.sin(time * 3) : 0.2;
      this.glowRing(sx, sy - 16 * z, z, 16, 8, `rgba(255,200,120,${pulse})`, 4);
      this.glowRing(sx, sy - 16 * z, z, 10, 5, `rgba(120,220,255,${pulse * 0.8})`, 2);
      c.fillStyle = `rgba(255,240,180,${pulse})`;
      c.beginPath();
      c.ellipse(sx, sy - 16 * z, 4 * z, 2 * z, 0, 0, Math.PI * 2);
      c.fill();
    } else if (st.type === "colonistLander" || st.type === "cargoLander" || st.type === "seedLander") {
      const tall = st.type === "seedLander" ? 38 : 28;
      c.beginPath();
      c.moveTo(sx - 14 * z, sy);
      c.lineTo(sx - 8 * z, sy - tall * 0.35 * z);
      c.lineTo(sx, sy - tall * z);
      c.lineTo(sx + 8 * z, sy - tall * 0.35 * z);
      c.lineTo(sx + 14 * z, sy);
      c.closePath();
      const hull = c.createLinearGradient(sx - 14 * z, sy, sx + 14 * z, sy - tall * z);
      hull.addColorStop(0, "#1a2433");
      hull.addColorStop(0.45, mix(color, "#9fdfff", 0.35));
      hull.addColorStop(1, "#e8f7ff");
      c.fillStyle = hull;
      c.fill();
      c.strokeStyle = "rgba(120,230,255,0.7)";
      c.lineWidth = 1.2 * z;
      c.stroke();
      this.glowRing(sx, sy - tall * 0.55 * z, z, 6, 3, `rgba(90,230,255,${0.35 + 0.25 * Math.sin(time * 2)})`);
      c.strokeStyle = "rgba(180,200,220,0.7)";
      c.lineWidth = 2 * z;
      c.beginPath();
      c.moveTo(sx - 12 * z, sy);
      c.lineTo(sx - 18 * z, sy + 5 * z);
      c.moveTo(sx + 12 * z, sy);
      c.lineTo(sx + 18 * z, sy + 5 * z);
      c.stroke();
    } else if (st.type === "solarReceiver") {
      this.box(sx, sy, z, 0.65, 4, "#1e2a3a");
      c.beginPath();
      c.moveTo(sx - 18 * z, sy - 8 * z);
      c.lineTo(sx, sy - 24 * z);
      c.lineTo(sx + 18 * z, sy - 8 * z);
      c.lineTo(sx, sy + 1 * z);
      c.closePath();
      const panel = c.createLinearGradient(sx, sy - 24 * z, sx, sy);
      panel.addColorStop(0, "#7ad7ff");
      panel.addColorStop(0.5, "#3a6cff");
      panel.addColorStop(1, "#1a2040");
      c.fillStyle = panel;
      c.fill();
      c.strokeStyle = `rgba(255,220,120,${0.5 + 0.35 * Math.sin(time * 2)})`;
      c.lineWidth = 1.4 * z;
      c.stroke();
    } else if (st.type === "storage") {
      this.tank(sx, sy, z, color, true, active, time);
    } else if (st.type === "smelter" || st.type === "seedSmelter" || st.type === "factory" || st.type === "seedFactory" || st.type === "lightIndustry") {
      const top = this.box(sx, sy, z, 0.82, height, color);
      this.ledStrip(sx, top, z, active, time, 3);
      this.vent(sx + 10 * z, sy, z, color, active, time);
    } else if (st.type === "seedPower" || st.type === "geothermal") {
      const top = this.box(sx, sy, z, 0.75, height, color);
      this.glowRing(sx, top + 8 * z, z, 10, 5, active ? `rgba(255,200,100,${0.4 + 0.3 * Math.sin(time * 3)})` : "rgba(180,140,80,0.25)", 2);
      this.ledStrip(sx, top, z, active, time, 2);
    } else if (st.type === "warehouse" || st.type === "monoStation" || st.type === "monoTransformer") {
      const top = this.box(sx, sy, z, 0.8, height - 2, color);
      this.ledStrip(sx, top, z, active || st.type.startsWith("mono"), time, 2);
      if (st.type !== "warehouse") this.dish(sx, sy, z, color, time);
    } else if (st.type === "spaceport" || st.type === "massDriver") {
      const top = this.box(sx, sy, z, 0.82, height, color);
      this.ledStrip(sx, top, z, active, time, 2);
      c.strokeStyle = `rgba(180,240,255,${0.55 + 0.3 * Math.sin(time * 2)})`;
      c.lineWidth = 2 * z;
      c.beginPath();
      c.moveTo(sx, top);
      c.lineTo(sx + 8 * z, top - 26 * z);
      c.stroke();
      this.glowRing(sx + 8 * z, top - 26 * z, z, 3, 1.5, "rgba(255,140,220,0.55)", 2);
    } else if (st.type === "residence" || st.type === "command" || st.type === "seedCommand" || st.type === "admin" || st.type === "university" || st.type === "lab" || st.type === "hotLab" || st.type === "medical" || st.type === "commercial" || st.type === "police" || st.type === "ugPolice" || st.type === "roboCommand") {
      const top = this.box(sx, sy, z, 0.82, height, color);
      this.ledStrip(sx, top, z, active || def.category === "seed" || st.type === "residence", time, st.type === "residence" ? 1 + st.tier : 2);
      if (st.type === "roboCommand" || st.type === "hotLab") this.dish(sx - 2 * z, sy, z, color, time);
    } else {
      const top = this.box(sx, sy, z, 0.82, height, color);
      this.ledStrip(sx, top, z, active, time, 2);
      if (st.type === "nano" || st.type === "trade" || st.type === "dirt" || st.type === "spew") {
        this.glowRing(sx, top + 6 * z, z, 9, 4.5, `rgba(180,120,255,${0.25 + 0.2 * Math.sin(time * 2 + st.id)})`);
      }
    }

    if (st.state === "idle" && !def.passive) {
      c.fillStyle = `rgba(255,200,80,${0.55 + 0.35 * Math.sin(time * 3)})`;
      c.beginPath();
      c.arc(sx + 12 * z, sy - 26 * z, 3.5 * z, 0, Math.PI * 2);
      c.fill();
      this.glowRing(sx + 12 * z, sy - 26 * z, z, 5, 5, "rgba(255,200,80,0.35)", 1);
    }
    if (st.state === "broken") {
      const a = 0.45 + 0.45 * Math.sin(time * 8);
      c.strokeStyle = `rgba(255,70,110,${a})`;
      c.lineWidth = 2.5 * z;
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
    const accents: Record<string, string> = {
      dozer: "#ffd166",
      digger: "#ff7a59",
      miner: "#f0a46a",
      explorer: "#7ad7ff",
      airbot: "#8ef0e8",
      repairbot: "#9bff7a",
      humanoid: "#e8f0ff",
    };
    const accent = accents[r.kind] ?? "#fff";
    const bob = Math.sin(time * 5 + r.id) * 1.8 * z;
    const y = sy - 7 * z + bob;
    // Hover pad / shadow
    c.fillStyle = "rgba(40,180,255,0.18)";
    c.beginPath();
    c.ellipse(sx, sy + 3 * z, 11 * z, 5 * z, 0, 0, Math.PI * 2);
    c.fill();
    this.glowRing(sx, sy + 3 * z, z, 9, 4, `rgba(90,220,255,${0.25 + 0.15 * Math.sin(time * 4 + r.id)})`, 1);
    // Chassis
    c.beginPath();
    c.moveTo(sx - 9 * z, y + 4 * z);
    c.lineTo(sx - 7 * z, y - 4 * z);
    c.lineTo(sx + 7 * z, y - 4 * z);
    c.lineTo(sx + 9 * z, y + 4 * z);
    c.closePath();
    c.fillStyle = "#1a2433";
    c.fill();
    c.strokeStyle = accent;
    c.lineWidth = 1.2 * z;
    c.stroke();
    // Canopy / sensor dome
    c.beginPath();
    c.ellipse(sx, y - 2 * z, 5.5 * z, 4.5 * z, 0, 0, Math.PI * 2);
    c.fillStyle = mix(accent, "#d9f7ff", 0.45);
    c.fill();
    c.fillStyle = `rgba(255,255,255,${0.35 + 0.25 * Math.sin(time * 6 + r.id)})`;
    c.beginPath();
    c.arc(sx - 1.5 * z, y - 3.5 * z, 1.4 * z, 0, Math.PI * 2);
    c.fill();
    // Tool cue by kind
    c.strokeStyle = accent;
    c.lineWidth = 1.6 * z;
    c.beginPath();
    if (r.kind === "dozer") {
      c.moveTo(sx - 10 * z, y + 2 * z);
      c.lineTo(sx - 14 * z, y + 5 * z);
      c.lineTo(sx - 6 * z, y + 5 * z);
    } else if (r.kind === "digger" || r.kind === "miner") {
      c.moveTo(sx + 8 * z, y);
      c.lineTo(sx + 14 * z, y + 6 * z);
    } else if (r.kind === "explorer") {
      c.moveTo(sx, y - 7 * z);
      c.lineTo(sx, y - 12 * z);
    } else if (r.kind === "repairbot") {
      c.moveTo(sx + 7 * z, y - 1 * z);
      c.lineTo(sx + 12 * z, y - 5 * z);
    }
    c.stroke();
    if (z > 0.65) {
      c.fillStyle = "#041018";
      c.font = `bold ${Math.round(8 * z)}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText(r.kind[0].toUpperCase(), sx, y - 2 * z);
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
