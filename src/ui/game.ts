import { BALANCE } from "../data/balance";
import { BUILDINGS, BUILDING_IDS, buildTurns, moraleEffect, powerNeed, upkeep, workerNeed, type BuildingId, type Category } from "../data/buildings";
import { PLANET_BY_ID } from "../data/planets";
import { ORES } from "../data/resources";
import { NEWSPAPER } from "../data/story";
import {
  demolish,
  landLander,
  placeKit,
  placeRobot,
  placeStructure,
  recallRobot,
  robotTaskFor,
  setFactoryProduct,
  setLightProduct,
  toggleDisabled,
  type RobotOrder,
} from "../sim/actions";
import {
  activeRobots,
  checkPlacement,
  countBuilt,
  isUnlocked,
  maxTier,
  population,
  robotCap,
  spareCapacity,
  structureCost,
} from "../sim/colony";
import { FACTORY_PRODUCTS, endTurn } from "../sim/turn";
import type { Direction, FactoryProduct, GameState, LightProduct, RobotKind, Structure } from "../sim/types";
import { saveToSlot } from "../save";
import { add, bar, clear, fmt, h, toast } from "./dom";
import { IsoView } from "./iso";
import { openEnding, openEvent, openReport, type ReportId } from "./reports";

type Mode =
  | { kind: "select" }
  | { kind: "build"; id: BuildingId }
  | { kind: "robot"; robot: RobotKind }
  | { kind: "lander"; lander: "colonist" | "cargo" }
  | { kind: "kit"; kit: "shipTokamak" | "solarReceiver" };

const CATEGORY_LABEL: Record<Category, string> = {
  seed: "Seed",
  core: "Network & Command",
  life: "Life Support",
  industry: "Industry",
  power: "Power",
  science: "Science",
  society: "Society",
  transport: "Transport",
  space: "Space",
  lander: "Landers",
};

const IDLE_TEXT: Record<string, string> = {
  power: "Not enough power",
  workers: "Not enough workers",
  scientists: "Not enough scientists",
  resources: "Missing upkeep resources",
  tube: "Not connected to the tube network",
  air: "No air",
  disabled: "Turned off",
  output: "Output storage full",
};

export interface GameHost {
  quitToTitle(): void;
}

export class GameScreen {
  private s: GameState;
  private root: HTMLElement;
  private view!: IsoView;
  private mode: Mode = { kind: "select" };
  private digDir: Direction = "e";
  private picker!: HTMLElement;
  private inspector!: HTMLElement;
  private topbar!: HTMLElement;
  private news!: HTMLElement;
  private levelBar!: HTMLElement;
  private canvas!: HTMLCanvasElement;
  private dragStart: { x: number; y: number } | null = null;
  private panning: { x: number; y: number } | null = null;
  private keys = new Set<string>();
  private running = false;
  private host: GameHost;
  private onKeyDown = (e: KeyboardEvent) => this.keyDown(e);
  private onKeyUp = (e: KeyboardEvent) => this.keys.delete(e.key.toLowerCase());
  private onResize = () => this.view.resize();
  private panTimer = 0;

  constructor(root: HTMLElement, state: GameState, host: GameHost) {
    this.root = root;
    this.s = state;
    this.host = host;
    this.build();
  }

  destroy() {
    this.view.destroy();
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("resize", this.onResize);
    clearInterval(this.panTimer);
  }

  private build() {
    clear(this.root);
    this.topbar = h("div", { class: "topbar" });
    this.levelBar = h("div", { class: "levels" });
    this.picker = h("div", { class: "picker" });
    this.inspector = h("div", { class: "inspector" });
    this.news = h("div", { class: "news-items" });
    this.canvas = h("canvas", { class: "map" }) as HTMLCanvasElement;
    const reports: Array<[ReportId, string]> = [
      ["summary", "Summary"],
      ["population", "Population"],
      ["resources", "Resources"],
      ["research", "Research"],
      ["factories", "Factories"],
      ["rebels", "Free Berth"],
      ["ledger", "Ledger"],
      ["space", "Space"],
      ["system", "Save / Menu"],
    ];
    this.root.append(
      h(
        "div",
        { class: "game" },
        this.topbar,
        h("div", { class: "left" }, this.levelBar, this.picker),
        h("div", { class: "center" }, this.canvas, h("div", { class: "map-hint" }, "Drag with right mouse or WASD to pan · wheel to zoom · Esc to cancel · Enter to end turn")),
        h(
          "div",
          { class: "right" },
          h("div", { class: "report-buttons" }, reports.map(([id, label]) => h("button", { class: "btn small", onclick: () => this.openReport(id) }, label))),
          this.inspector,
        ),
        h(
          "div",
          { class: "bottom" },
          h("div", { class: "news" }, h("div", { class: "news-head" }, NEWSPAPER), this.news),
          h(
            "div",
            { class: "turn-controls" },
            h("button", { class: "btn primary big", onclick: () => this.runTurns(1) }, "End Turn"),
            h("button", { class: "btn", onclick: () => this.runTurns(5) }, "Run 5"),
            h("button", { class: "btn", onclick: () => this.runTurns(20) }, "Run 20"),
          ),
        ),
      ),
    );
    this.view = new IsoView(this.canvas, this.s);
    requestAnimationFrame(() => this.view.resize());
    window.addEventListener("resize", this.onResize);
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    this.panTimer = window.setInterval(() => this.keyPan(), 16);
    this.bindCanvas();
    this.refresh();
    if (this.s.story.pending) this.showEvent();
  }

  private openReport(id: ReportId) {
    openReport(id, this.s, { refresh: () => this.refresh(), quit: () => this.host.quitToTitle(), select: (x, y, level) => this.selectTile(x, y, level, true) });
  }

  private keyDown(e: KeyboardEvent) {
    if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "SELECT") return;
    if (document.querySelector(".overlay")) return;
    const k = e.key.toLowerCase();
    this.keys.add(k);
    if (k === "escape") this.setMode({ kind: "select" });
    if (k === "enter") this.runTurns(1);
    if (k === "pageup" || k === "q") this.setLevel(Math.max(0, this.view.level - 1));
    if (k === "pagedown" || k === "e") this.setLevel(Math.min(this.s.openLevels, this.view.level + 1));
    if (k === "+" || k === "=") this.view.zoomBy(1.15);
    if (k === "-") this.view.zoomBy(1 / 1.15);
  }

  private keyPan() {
    const speed = 14;
    let dx = 0;
    let dy = 0;
    if (this.keys.has("a") || this.keys.has("arrowleft")) dx -= speed;
    if (this.keys.has("d") || this.keys.has("arrowright")) dx += speed;
    if (this.keys.has("w") || this.keys.has("arrowup")) dy -= speed;
    if (this.keys.has("s") || this.keys.has("arrowdown")) dy += speed;
    if (dx || dy) this.view.pan(dx, dy);
  }

  private bindCanvas() {
    const c = this.canvas;
    const pos = (e: MouseEvent) => {
      const r = c.getBoundingClientRect();
      return { px: e.clientX - r.left, py: e.clientY - r.top };
    };
    c.addEventListener("contextmenu", (e) => e.preventDefault());
    c.addEventListener("mousedown", (e) => {
      const { px, py } = pos(e);
      if (e.button === 2 || e.button === 1) {
        this.panning = { x: px, y: py };
        return;
      }
      const t = this.view.screenToTile(px, py);
      if (!t) return;
      if (this.mode.kind === "robot" && (this.mode.robot === "dozer" || this.mode.robot === "airbot")) this.dragStart = t;
    });
    c.addEventListener("mousemove", (e) => {
      const { px, py } = pos(e);
      if (this.panning) {
        this.view.pan(this.panning.x - px, this.panning.y - py);
        this.panning = { x: px, y: py };
        return;
      }
      this.view.hover = this.view.screenToTile(px, py);
      this.updatePreview();
    });
    c.addEventListener("mouseleave", () => {
      this.view.hover = null;
      this.view.preview = null;
      this.panning = null;
    });
    window.addEventListener("mouseup", (e) => {
      if (this.panning && (e.button === 2 || e.button === 1)) {
        this.panning = null;
        return;
      }
      if (e.target !== c || e.button !== 0) {
        this.dragStart = null;
        return;
      }
      const { px, py } = pos(e);
      const t = this.view.screenToTile(px, py);
      const start = this.dragStart;
      this.dragStart = null;
      if (t) this.click(t.x, t.y, start);
    });
    c.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        this.view.zoomBy(e.deltaY < 0 ? 1.12 : 1 / 1.12);
      },
      { passive: false },
    );
  }

  private order(start?: { x: number; y: number } | null, end?: { x: number; y: number }): RobotOrder {
    if (this.mode.kind !== "robot") return {};
    if ((this.mode.robot === "dozer" || this.mode.robot === "airbot") && start && end) return { rect: [start.x, start.y, end.x, end.y] };
    if (this.mode.robot === "digger") return { dir: this.digDir };
    return {};
  }

  private updatePreview() {
    const hv = this.view.hover;
    if (!hv || this.mode.kind === "select") {
      this.view.preview = null;
      return;
    }
    const level = this.view.level;
    const m = this.mode;
    if (m.kind === "build") {
      this.view.preview = { tiles: [[hv.x, hv.y]], ok: checkPlacement(this.s, m.id, level, hv.x, hv.y).ok, id: m.id };
    } else if (m.kind === "robot") {
      if ((m.robot === "dozer" || m.robot === "airbot") && this.dragStart) {
        const tiles: Array<[number, number]> = [];
        const a = this.dragStart;
        for (let y = Math.min(a.y, hv.y); y <= Math.max(a.y, hv.y); y++) for (let x = Math.min(a.x, hv.x); x <= Math.max(a.x, hv.x); x++) tiles.push([x, y]);
        this.view.preview = { tiles, ok: true };
      } else {
        const task = robotTaskFor(this.s, m.robot, level, hv.x, hv.y, this.order(null, hv));
        this.view.preview = { tiles: [[hv.x, hv.y]], ok: typeof task !== "string" };
      }
    } else {
      const t = this.s.levels[level][hv.y][hv.x];
      this.view.preview = { tiles: [[hv.x, hv.y]], ok: level === 0 && t.structure === undefined && t.terrain !== "impassable" };
    }
  }

  private click(x: number, y: number, start: { x: number; y: number } | null) {
    const level = this.view.level;
    const m = this.mode;
    let result: { ok: boolean; reason?: string } | null = null;
    if (m.kind === "select") {
      this.selectTile(x, y, level);
      return;
    }
    if (m.kind === "build") result = placeStructure(this.s, m.id, level, x, y);
    else if (m.kind === "robot") result = placeRobot(this.s, m.robot, level, x, y, this.order(start, { x, y }));
    else if (m.kind === "lander") result = level === 0 ? landLander(this.s, m.lander, x, y) : { ok: false, reason: "Landers come down on the surface." };
    else if (m.kind === "kit") result = level === 0 ? placeKit(this.s, m.kit, x, y) : { ok: false, reason: "Place it on the surface." };
    if (result && !result.ok) toast(result.reason ?? "Can't do that.", "bad");
    if (result?.ok) {
      const keep = m.kind === "build" && (m.id === "tube" || m.id === "ugTube" || m.id === "road");
      if (!keep) this.setMode({ kind: "select" });
      this.view.selected = { x, y };
    }
    this.refresh();
  }

  private selectTile(x: number, y: number, level: number, center = false) {
    if (level !== this.view.level) this.setLevel(level);
    this.view.selected = { x, y };
    if (center) this.view.centerOn(x, y);
    this.renderInspector();
  }

  private setMode(m: Mode) {
    this.mode = m;
    this.view.preview = null;
    this.dragStart = null;
    this.canvas.style.cursor = m.kind === "select" ? "default" : "crosshair";
    this.renderPicker();
  }

  private setLevel(l: number) {
    this.view.level = l;
    if (this.mode.kind === "build" && (BUILDINGS[this.mode.id].layer === "surface") !== (l === 0)) this.setMode({ kind: "select" });
    this.renderLevels();
    this.renderPicker();
  }

  private runTurns(n: number) {
    if (this.running) return;
    if (this.s.ending) return this.showEnding();
    if (this.s.story.pending) return this.showEvent();
    this.running = true;
    let i = 0;
    const step = () => {
      endTurn(this.s);
      i++;
      if (this.s.turn % 10 === 0) {
        try {
          saveToSlot(this.s, `Autosave · ${this.s.colonyName}`);
        } catch {
          /* storage may be full; manual saves still work */
        }
      }
      this.refresh();
      if (this.s.ending) {
        this.running = false;
        this.showEnding();
        return;
      }
      if (this.s.story.pending) {
        this.running = false;
        this.showEvent();
        return;
      }
      if (i < n) setTimeout(step, 90);
      else this.running = false;
    };
    step();
  }

  private showEvent() {
    openEvent(this.s, () => this.refresh());
  }

  private showEnding() {
    openEnding(this.s, () => this.host.quitToTitle());
  }

  refresh() {
    this.renderTop();
    this.renderLevels();
    this.renderPicker();
    this.renderInspector();
    this.renderNews();
  }

  private renderTop() {
    const s = this.s;
    const r = s.lastReport;
    const pop = population(s);
    const planet = PLANET_BY_ID[s.planetId];
    const moraleCls = s.morale < 300 ? "bad" : s.morale < 500 ? "warn" : "good";
    const foodTurns = r.foodEaten > r.foodMade ? Math.floor(s.items.food / Math.max(0.1, r.foodEaten - r.foodMade)) : Infinity;
    const airText = !s.colonistsLanded ? "—" : r.atmosphere ? "CHAP" : `${Math.floor(s.air / Math.max(1, pop))} turns`;
    clear(this.topbar);
    add(
      this.topbar,
      h("div", { class: "brand" }, h("b", {}, s.colonyName), h("span", { class: "muted" }, ` · ${planet.name}`)),
      h("div", { class: "stat" }, h("span", {}, "Turn"), h("b", {}, s.turn)),
      h("div", { class: `stat ${moraleCls}` }, h("span", {}, "Morale"), h("b", {}, fmt(s.morale)), bar(s.morale, BALANCE.moraleMax, moraleCls)),
      h("div", { class: "stat" }, h("span", {}, "Population"), h("b", {}, pop), s.orbit.colonists ? h("span", { class: "muted small" }, ` +${s.orbit.colonists} in orbit`) : null),
      h("div", { class: `stat ${r.powerUsed > r.powerMade * 0.9 ? "warn" : ""}` }, h("span", {}, "Power"), h("b", {}, `${fmt(r.powerUsed)} / ${fmt(r.powerMade)}`)),
      h("div", { class: `stat ${r.workersNeeded > r.workersAvailable ? "bad" : ""}` }, h("span", {}, "Staff"), h("b", {}, `${r.workersNeeded} / ${r.workersAvailable}`)),
      h("div", { class: `stat ${foodTurns < 15 ? "bad" : ""}` }, h("span", {}, "Food"), h("b", {}, fmt(s.items.food)), h("span", { class: "muted small" }, ` +${fmt(r.foodMade, 1)}/-${fmt(r.foodEaten, 1)}`)),
      h("div", { class: `stat ${s.colonistsLanded && !r.atmosphere ? "bad" : ""}` }, h("span", {}, "Air"), h("b", {}, airText)),
      h("div", { class: `stat ${pop > r.housing ? "warn" : ""}` }, h("span", {}, "Housing"), h("b", {}, `${pop} / ${r.housing}`)),
      h("div", { class: "stat" }, h("span", {}, "Robots"), h("b", {}, `${activeRobots(s)} / ${robotCap(s)}`)),
      h("div", { class: "stat story" }, h("span", {}, "Ledger"), h("b", {}, s.story.evidence)),
      s.plague ? h("div", { class: "stat bad" }, h("span", {}, "Plague"), h("b", {}, `${s.plague.turnsLeft} turns`)) : null,
    );
  }

  private renderLevels() {
    clear(this.levelBar);
    const names = ["Surface", ...Array.from({ length: this.s.openLevels }, (_, i) => `UG ${i + 1}`)];
    names.forEach((n, i) => this.levelBar.append(h("button", { class: `btn small ${this.view.level === i ? "active" : ""}`, onclick: () => this.setLevel(i) }, n)));
  }

  private renderPicker() {
    const s = this.s;
    const level = this.view.level;
    clear(this.picker);
    const spare = spareCapacity(s);
    this.picker.append(
      h("div", { class: "picker-head" }, h("span", {}, "Tile Picker"), this.mode.kind !== "select" ? h("button", { class: "btn small ghost", onclick: () => this.setMode({ kind: "select" }) }, "Cancel") : null),
      h("div", { class: "muted small pad" }, `Spare power ${fmt(spare.power)} · spare staff ${fmt(spare.people)}`),
    );

    const robotsSec = h("div", { class: "pick-section" }, h("div", { class: "pick-title" }, "Robots"));
    const kinds: RobotKind[] = level === 0 ? ["dozer", "digger", "miner", "explorer", "airbot"] : ["dozer", "digger"];
    for (const k of kinds) {
      const n = s.idleRobots[k];
      if (k === "airbot" && n === 0) continue;
      const active = this.mode.kind === "robot" && this.mode.robot === k;
      robotsSec.append(
        h(
          "button",
          { class: `pick ${active ? "active" : ""}`, disabled: n < 1, onclick: () => this.setMode(active ? { kind: "select" } : { kind: "robot", robot: k }) },
          h("span", { class: `swatch robot-${k}` }),
          h("span", { class: "pick-name" }, `Robo${k}`),
          h("span", { class: "pick-meta" }, `×${n}`),
        ),
      );
    }
    if (this.mode.kind === "robot" && this.mode.robot === "digger") {
      robotsSec.append(
        h(
          "div",
          { class: "dig-dirs" },
          h("span", { class: "muted small" }, level === 0 ? "Surface: digs an air shaft." : "Dig direction:"),
          level > 0
            ? (["n", "e", "s", "w"] as Direction[]).map((d) =>
                h(
                  "button",
                  {
                    class: `btn small ${this.digDir === d ? "active" : ""}`,
                    onclick: () => {
                      this.digDir = d;
                      this.renderPicker();
                    },
                  },
                  { n: "↖ N", e: "↗ E", s: "↘ S", w: "↙ W" }[d],
                ),
              )
            : null,
          h("div", { class: "muted small" }, "Place on an air shaft to open the next level down."),
        ),
      );
    }
    if (this.mode.kind === "robot" && this.mode.robot === "dozer") robotsSec.append(h("div", { class: "muted small pad" }, "Click a tile, or drag to bulldoze an area."));
    this.picker.append(robotsSec);

    if (level === 0 && (s.orbit.colonistLanders > 0 || s.orbit.cargoLanders > 0 || s.kits.shipTokamak > 0 || s.kits.solarReceiver > 0)) {
      const ready = countBuilt(s, "seedCommand", "command") > 0;
      const sec = h("div", { class: "pick-section" }, h("div", { class: "pick-title" }, "From orbit"));
      const lander = (kind: "colonist" | "cargo", n: number, label: string) => {
        if (n <= 0) return;
        const active = this.mode.kind === "lander" && this.mode.lander === kind;
        sec.append(
          h(
            "button",
            { class: `pick ${active ? "active" : ""}`, disabled: !ready, title: ready ? "" : "Waiting for the Seed Command Facility", onclick: () => this.setMode(active ? { kind: "select" } : { kind: "lander", lander: kind }) },
            h("span", { class: "swatch lander" }),
            h("span", { class: "pick-name" }, label),
            h("span", { class: "pick-meta" }, `×${n}`),
          ),
        );
      };
      lander("colonist", s.orbit.colonists > 0 ? s.orbit.colonistLanders : 0, "Colonist Lander");
      lander("cargo", s.orbit.cargoLanders, "Cargo Lander");
      for (const kit of ["shipTokamak", "solarReceiver"] as const) {
        if (s.kits[kit] <= 0) continue;
        const active = this.mode.kind === "kit" && this.mode.kit === kit;
        sec.append(
          h(
            "button",
            { class: `pick ${active ? "active" : ""}`, onclick: () => this.setMode(active ? { kind: "select" } : { kind: "kit", kit }) },
            h("span", { class: "swatch", style: `background:${BUILDINGS[kit].color}` }),
            h("span", { class: "pick-name" }, BUILDINGS[kit].name),
            h("span", { class: "pick-meta" }, `×${s.kits[kit]}`),
          ),
        );
      }
      if (!ready) sec.append(h("div", { class: "muted small pad" }, "Landers can come down once the Seed Command Facility is finished."));
      this.picker.append(sec);
    }

    const groups = new Map<Category, BuildingId[]>();
    for (const id of BUILDING_IDS) {
      const def = BUILDINGS[id];
      if (!def.buildable) continue;
      if ((def.layer === "surface") !== (level === 0)) continue;
      if (!isUnlocked(s, id)) continue;
      if (!groups.has(def.category)) groups.set(def.category, []);
      groups.get(def.category)!.push(id);
    }
    for (const [cat, ids] of groups) {
      const sec = h("div", { class: "pick-section" }, h("div", { class: "pick-title" }, CATEGORY_LABEL[cat]));
      for (const id of ids) {
        const def = BUILDINGS[id];
        const tier = maxTier(s, id);
        const cost = structureCost(s, id, tier);
        const affordable = Object.entries(cost).every(([r, n]) => s.stock[r as keyof typeof s.stock] >= (n ?? 0)) && (id !== "road" || s.items.roadMaterial >= 1);
        const p = powerNeed(id, tier);
        const w = workerNeed(id, tier);
        const fits = def.passive || def.powerOutput || (p <= spare.power && (!s.colonistsLanded || w <= spare.people));
        const active = this.mode.kind === "build" && this.mode.id === id;
        const reasons: string[] = [];
        if (!affordable) reasons.push(id === "road" ? "needs road material" : "not enough resources");
        if (!fits) reasons.push("not enough power or staff");
        sec.append(
          h(
            "button",
            {
              class: `pick ${active ? "active" : ""} ${affordable && fits ? "" : "dim"}`,
              title: `${def.desc}\nBuild: ${buildTurns(id, tier)} turns · Power ${p} · Staff ${w}${reasons.length ? `\nBlocked: ${reasons.join(", ")}` : ""}`,
              onclick: () => this.setMode(active ? { kind: "select" } : { kind: "build", id }),
            },
            h("span", { class: "swatch", style: `background:${def.color}` }),
            h("span", { class: "pick-name" }, def.name, tier > 1 ? h("sup", {}, ` ${["", "", "II", "III"][tier]}`) : null),
            h("span", { class: "pick-meta" }, `${buildTurns(id, tier)}t`),
          ),
        );
      }
      this.picker.append(sec);
    }
    if (this.mode.kind === "build") {
      const id = this.mode.id;
      const tier = maxTier(s, id);
      const cost = structureCost(s, id, tier);
      this.picker.append(
        h(
          "div",
          { class: "pick-detail" },
          h("b", {}, BUILDINGS[id].name),
          h("p", { class: "small" }, BUILDINGS[id].desc),
          h(
            "div",
            { class: "cost-list" },
            Object.entries(cost).map(([r, n]) => h("span", { class: `cost ${s.stock[r as keyof typeof s.stock] >= (n ?? 0) ? "" : "bad"}` }, `${r} ${n}`)),
            id === "road" ? h("span", { class: `cost ${s.items.roadMaterial >= 1 ? "" : "bad"}` }, "Road material 1") : null,
          ),
        ),
      );
    }
  }

  private renderInspector() {
    const s = this.s;
    clear(this.inspector);
    const sel = this.view.selected;
    if (!sel) {
      this.inspector.append(h("div", { class: "muted pad" }, "Select a tile to inspect it."));
      return;
    }
    const level = this.view.level;
    const t = s.levels[level][sel.y][sel.x];
    const terrain = level === 0 ? t.terrain : t.dug ? `${t.terrain === "diff" ? "Difficult" : t.terrain === "imposs" ? "Impossible" : "Easy"} rock (excavated)` : t.seen ? `Solid ${t.terrain} rock` : "Unexplored";
    this.inspector.append(
      h("div", { class: "insp-head" }, h("b", {}, `(${sel.x}, ${sel.y})`), h("span", { class: "muted" }, ` ${level === 0 ? "Surface" : `UG ${level}`}`)),
      h("div", { class: "kv" }, h("span", {}, "Terrain"), h("b", {}, `${terrain}${t.dozed ? ", bulldozed" : ""}`)),
    );
    if (t.beacon?.known && level === 0) {
      const total = Object.values(t.beacon.mix).reduce((a, b) => a + (b ?? 0), 0) || 1;
      this.inspector.append(
        h("div", { class: "insp-sec" }, h("div", { class: "insp-title" }, "Mining beacon"), h("div", { class: "kv" }, h("span", {}, "Richness"), h("b", {}, `${Math.round(t.beacon.richness * 100)}%`)), oreMix(t.beacon.mix, total)),
      );
    }
    if (t.robot !== undefined) {
      const r = s.robots[t.robot];
      if (r) {
        this.inspector.append(
          h(
            "div",
            { class: "insp-sec" },
            h("div", { class: "insp-title" }, `Robo${r.kind}`),
            h("div", { class: "kv" }, h("span", {}, "Task"), h("b", {}, r.task.kind)),
            h("div", { class: "kv" }, h("span", {}, "Turns left"), h("b", {}, r.turnsLeft)),
            h("div", { class: "kv" }, h("span", {}, "Fuel cell"), h("b", {}, `${r.fuel} turns`)),
            h(
              "button",
              {
                class: "btn small",
                onclick: () => {
                  const res = recallRobot(s, r.id);
                  if (!res.ok) toast(res.reason ?? "", "bad");
                  this.refresh();
                },
              },
              "Recall",
            ),
          ),
        );
      }
    }
    if (t.structure !== undefined) {
      const st = s.structures[t.structure];
      if (st) this.inspector.append(this.structureReport(st));
    }
  }

  private structureReport(st: Structure): HTMLElement {
    const s = this.s;
    const def = BUILDINGS[st.type];
    const stateText =
      st.state === "building"
        ? `Under construction · ${st.buildLeft} turn${st.buildLeft === 1 ? "" : "s"} left`
        : st.state === "idle"
          ? `Idle · ${IDLE_TEXT[st.idleReason ?? ""] ?? "waiting"}`
          : st.state === "broken"
            ? `Broken${st.repairLeft !== undefined ? ` · repair in ${st.repairLeft}` : " · awaiting repair crew"}`
            : st.state[0].toUpperCase() + st.state.slice(1);
    const sec = h(
      "div",
      { class: "insp-sec" },
      h("div", { class: "insp-title" }, def.name, st.tier > 1 ? ` (generation ${st.tier})` : ""),
      h("p", { class: "small muted" }, def.desc),
      h("div", { class: `kv ${st.state === "active" ? "good" : st.state === "building" ? "" : "warn"}` }, h("span", {}, "Status"), h("b", {}, stateText)),
    );
    if (!def.passive) {
      const upk = upkeep(st.type, st.tier);
      add(
        sec,
        def.powerOutput ? h("div", { class: "kv" }, h("span", {}, "Power output"), h("b", {}, def.powerOutput)) : h("div", { class: "kv" }, h("span", {}, "Power"), h("b", {}, powerNeed(st.type, st.tier))),
        h("div", { class: "kv" }, h("span", {}, def.scientists ? "Scientists" : "Workers"), h("b", {}, workerNeed(st.type, st.tier))),
        h("div", { class: "kv" }, h("span", {}, "Upkeep"), h("b", {}, upk.length ? upk.join(", ") : "none")),
        h("div", { class: "kv" }, h("span", {}, "Morale effect"), h("b", {}, signed(moraleEffect(st.type, st.tier)))),
        h("div", { class: "kv" }, h("span", {}, "Breakdown chance"), h("b", {}, `${def.breakdown}%`)),
        def.needsTube ? h("div", { class: `kv ${st.connected ? "" : "bad"}` }, h("span", {}, "Tube network"), h("b", {}, st.connected ? "Connected" : "Disconnected")) : null,
      );
    }
    if (st.mine) {
      const m = st.mine;
      const total = Object.values(m.mix).reduce((a, b) => a + (b ?? 0), 0) || 1;
      sec.append(
        h("div", { class: "kv" }, h("span", {}, "Depth"), h("b", {}, `${m.levels} level${m.levels > 1 ? "s" : ""}`)),
        h("div", { class: "kv" }, h("span", {}, "Ore at mine"), h("b", {}, `${fmt(m.stock)} / ${BALANCE.mineOreStorage}`)),
        h("div", { class: "kv" }, h("span", {}, "Trucks"), h("b", {}, m.trucks)),
        h("div", { class: "kv" }, h("span", {}, "Life"), h("b", {}, `${m.extracted} / ${m.life} turns`)),
        oreMix(m.mix, total),
        h("p", { class: "small muted" }, "Place a robominer on this mine to dig it deeper."),
      );
    }
    if (st.factory) {
      const products: FactoryProduct[] = st.type === "seedFactory" ? ["none", "dozer", "digger", "miner", "explorer", "truck"] : ["none", "dozer", "digger", "miner", "explorer", "truck", "fuelCells", "roadMaterial", "repairbot", "airbot", "humanoid"];
      const select = h(
        "select",
        {
          onchange: (e: Event) => {
            const res = setFactoryProduct(s, st.id, (e.target as HTMLSelectElement).value as FactoryProduct);
            if (!res.ok) toast(res.reason ?? "", "bad");
            this.refresh();
          },
        },
        products.map((p) => h("option", { value: p, selected: st.factory!.product === p }, p === "none" ? "Paused" : FACTORY_PRODUCTS[p].name)),
      );
      const spec = st.factory.product !== "none" ? FACTORY_PRODUCTS[st.factory.product] : null;
      add(
        sec,
        h("div", { class: "kv" }, h("span", {}, "Product"), select),
        spec ? h("div", { class: "kv" }, h("span", {}, "Progress"), h("b", {}, `${fmt(st.factory.progress, 1)} / ${spec.turns}`)) : null,
        spec ? h("div", { class: "small muted" }, `Cost per unit: ${Object.entries(spec.cost).map(([r, n]) => `${r} ${n}`).join(", ")}`) : null,
        h("div", { class: "kv" }, h("span", {}, "Produced"), h("b", {}, st.factory.produced)),
      );
    }
    if (st.light) {
      const select = h(
        "select",
        {
          onchange: (e: Event) => {
            setLightProduct(s, st.id, (e.target as HTMLSelectElement).value as LightProduct);
            this.refresh();
          },
        },
        (["luxury", "clothing", "medicine"] as LightProduct[]).map((p) => h("option", { value: p, selected: st.light!.product === p }, p[0].toUpperCase() + p.slice(1))),
      );
      sec.append(h("div", { class: "kv" }, h("span", {}, "Product"), select));
    }
    if (st.type === "lab" || st.type === "hotLab") sec.append(h("button", { class: "btn small", onclick: () => this.openReport("research") }, "Research topics"));
    if (st.type === "trade") sec.append(h("button", { class: "btn small", onclick: () => this.openReport("rebels") }, "Trade"));
    if (st.type === "spaceport") sec.append(h("button", { class: "btn small", onclick: () => this.openReport("space") }, "Space program"));
    if (st.type === "seedCommand" || st.type === "command" || st.type === "chap") sec.append(h("button", { class: "btn small", onclick: () => this.openReport("summary") }, "Executive summary"));
    const actions = h("div", { class: "row gap" });
    if (!def.passive && st.state !== "building" && st.state !== "destroyed" && !def.automated)
      actions.append(
        h(
          "button",
          {
            class: "btn small",
            onclick: () => {
              toggleDisabled(s, st.id);
              this.refresh();
            },
          },
          st.disabled ? "Turn on" : "Turn off",
        ),
      );
    if (!st.type.startsWith("seed") || st.state === "destroyed")
      if (st.type !== "airShaft" && st.type !== "ugShaft")
        actions.append(
          h(
            "button",
            {
              class: "btn small danger",
              onclick: () => {
                const res = demolish(s, st.id);
                if (!res.ok) toast(res.reason ?? "", "bad");
                this.refresh();
              },
            },
            "Bulldoze",
          ),
        );
    sec.append(actions);
    return sec;
  }

  private renderNews() {
    clear(this.news);
    const items = this.s.messages.slice(-40).reverse();
    for (const m of items) this.news.append(h("div", { class: `news-item ${m.kind}` }, h("span", { class: "news-turn" }, m.turn), m.text));
  }
}

function signed(n: number) {
  return n > 0 ? `+${n}` : String(n);
}

function oreMix(mix: Partial<Record<string, number>>, total: number) {
  return h(
    "div",
    { class: "ore-mix" },
    ORES.filter((o) => (mix[o] ?? 0) > 0).map((o) => h("span", { class: "ore-chip" }, `${o.replace("Ore", "")} ${Math.round(((mix[o] ?? 0) / total) * 100)}%`)),
  );
}