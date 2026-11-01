import { BALANCE, DIFFICULTIES, type Difficulty } from "../data/balance";
import { CARGO, checkManifest, recommendedManifest, type CargoId, type Manifest } from "../data/cargo";
import { PLANETS, STAR_NAME, type PlanetDef } from "../data/planets";
import { BRIEFING, TITLE } from "../data/story";
import { generateMap, siteSeed } from "../sim/map";
import { newGame } from "../sim/newGame";
import type { GameState } from "../sim/types";
import { deserialize } from "../save";
import { listSlots, loadSlot, deleteSlot } from "../save";
import { clear, h, modal, toast } from "./dom";
import { drawMinimap } from "./iso";
import { VERSION } from "../version";

export interface SetupHost {
  root: HTMLElement;
  start(state: GameState, fresh: boolean): void;
}

const DIFF_TEXT: Record<Difficulty, string> = {
  beginner: "No disasters or plague. Nanotechnology-level upkeep: structures need no resources to run. A small rebel faction.",
  easy: "Rare disasters. Friendly trade.",
  medium: "The game as designed.",
  hard: "Frequent disasters and plague, a large hostile rebel colony, poor trade.",
};

export function titleScreen(host: SetupHost) {
  const { root } = host;
  clear(root);
  const slots = listSlots();
  const fileInput = h("input", { type: "file", accept: ".json,application/json", style: "display:none" }) as HTMLInputElement;
  fileInput.addEventListener("change", async () => {
    const f = fileInput.files?.[0];
    if (!f) return;
    const loaded = deserialize(await f.text());
    if (typeof loaded === "string") toast(loaded, "bad");
    else host.start(loaded, false);
  });
  root.append(
    h(
      "div",
      { class: "title-screen" },
      h("div", { class: "starfield" }),
      h(
        "div",
        { class: "title-card" },
        h("div", { class: "title-kicker" }, "A colony survival game"),
        h("h1", { class: "title" }, TITLE.toUpperCase()),
        h("div", { class: "title-sub" }, `The ark Meridian arrives at ${STAR_NAME}`),
        h(
          "div",
          { class: "title-buttons" },
          h("button", { class: "btn primary", onclick: () => briefingScreen(host) }, "New Colony"),
          slots.length ? h("button", { class: "btn", onclick: () => loadDialog(host) }, "Load Colony") : null,
          h("button", { class: "btn", onclick: () => fileInput.click() }, "Import Save File"),
          fileInput,
        ),
        h("div", { class: "title-foot" }, "A turn-based colony survival game. All art and text are original."),
        h("div", { class: "title-foot" }, `Version ${VERSION}`),
      ),
    ),
  );
}

function loadDialog(host: SetupHost) {
  const list = h("div", { class: "slot-list" });
  const render = () => {
    clear(list);
    for (const slot of listSlots()) {
      list.append(
        h(
          "div",
          { class: "slot" },
          h("div", {}, h("b", {}, slot.name), h("div", { class: "muted" }, `Turn ${slot.turn} · ${new Date(slot.savedAt).toLocaleString()}`)),
          h(
            "div",
            {},
            h(
              "button",
              {
                class: "btn small primary",
                onclick: () => {
                  const s = loadSlot(slot.key);
                  if (typeof s === "string") return toast(s, "bad");
                  m.close();
                  host.start(s, false);
                },
              },
              "Load",
            ),
            h(
              "button",
              {
                class: "btn small",
                onclick: () => {
                  deleteSlot(slot.key);
                  render();
                },
              },
              "Delete",
            ),
          ),
        ),
      );
    }
  };
  render();
  const m = modal("Load Colony", list);
}

function briefingScreen(host: SetupHost) {
  const { root } = host;
  clear(root);
  let i = 0;
  const text = h("p", { class: "briefing-text" });
  const next = h("button", { class: "btn primary" }, "Continue");
  const show = () => {
    text.textContent = BRIEFING[i];
    next.textContent = i === BRIEFING.length - 1 ? "Take command" : "Continue";
  };
  next.addEventListener("click", () => {
    i++;
    if (i >= BRIEFING.length) difficultyScreen(host);
    else show();
  });
  show();
  root.append(
    h(
      "div",
      { class: "setup-screen" },
      h("div", { class: "starfield" }),
      h(
        "div",
        { class: "panel briefing" },
        h("div", { class: "panel-kicker" }, "Comptroller's log · Meridian, high orbit"),
        text,
        h("div", { class: "row end" }, h("button", { class: "btn ghost", onclick: () => difficultyScreen(host) }, "Skip"), next),
      ),
    ),
  );
}

function difficultyScreen(host: SetupHost) {
  const { root } = host;
  clear(root);
  root.append(
    h(
      "div",
      { class: "setup-screen" },
      h("div", { class: "starfield" }),
      h(
        "div",
        { class: "panel" },
        h("h2", {}, "Choose difficulty"),
        h("p", { class: "muted" }, "The difficulty cannot be changed once the colony is founded."),
        h(
          "div",
          { class: "choice-grid" },
          DIFFICULTIES.map((d) =>
            h(
              "button",
              { class: "choice", onclick: () => packingScreen(host, d) },
              h("div", { class: "choice-title" }, d[0].toUpperCase() + d.slice(1)),
              h("div", { class: "choice-text" }, DIFF_TEXT[d]),
            ),
          ),
        ),
      ),
    ),
  );
}

function packingScreen(host: SetupHost, difficulty: Difficulty, start: Manifest = recommendedManifest()) {
  const { root } = host;
  clear(root);
  const manifest: Manifest = { ...start };
  const tbody = h("tbody");
  const summary = h("div", { class: "pack-summary" });
  const launch = h("button", { class: "btn primary" }, "Launch probes");
  const render = () => {
    clear(tbody);
    for (const c of CARGO) {
      const qty = manifest[c.id];
      tbody.append(
        h(
          "tr",
          {},
          h("td", {}, h("div", { class: "cargo-name" }, c.name), h("div", { class: "muted small" }, c.desc)),
          h("td", { class: "num" }, c.weight),
          h("td", { class: "num" }, c.cost),
          h(
            "td",
            { class: "qty" },
            h("button", { class: "icon-btn", onclick: () => change(c.id, -1), disabled: qty <= 0 || (c.id === "seedFactory" && qty <= 1) }, "−"),
            h("span", { class: "qty-n" }, qty),
            h("button", { class: "icon-btn", onclick: () => change(c.id, 1), disabled: qty >= c.max }, "+"),
          ),
        ),
      );
    }
    const check = checkManifest(manifest, BALANCE.packFunds, BALANCE.packWeight, BALANCE.baseColonists);
    clear(summary);
    summary.append(
      h("div", { class: `stat ${check.cost > BALANCE.packFunds ? "bad" : ""}` }, h("span", {}, "Funds"), h("b", {}, `${BALANCE.packFunds - check.cost} / ${BALANCE.packFunds}`)),
      h("div", { class: `stat ${check.weight > BALANCE.packWeight ? "bad" : ""}` }, h("span", {}, "Weight left"), h("b", {}, `${BALANCE.packWeight - check.weight} / ${BALANCE.packWeight}`)),
      h("div", { class: "stat" }, h("span", {}, "Colonists"), h("b", {}, `${check.colonists} (seats ${check.colonistSeats})`)),
      h("div", { class: `stat ${check.landedWeight > check.landerCapacity ? "bad" : ""}` }, h("span", {}, "Lander cargo"), h("b", {}, `${check.landedWeight} / ${check.landerCapacity}`)),
      check.errors.length ? h("ul", { class: "errors" }, check.errors.map((e) => h("li", {}, e))) : h("div", { class: "ok-line" }, "Manifest is valid."),
    );
    launch.toggleAttribute("disabled", check.errors.length > 0);
  };
  const change = (id: CargoId, d: number) => {
    manifest[id] = Math.max(0, manifest[id] + d);
    render();
  };
  launch.addEventListener("click", () => planetScreen(host, difficulty, manifest));
  render();
  root.append(
    h(
      "div",
      { class: "setup-screen" },
      h("div", { class: "starfield" }),
      h(
        "div",
        { class: "panel wide" },
        h("h2", {}, "Ship configuration"),
        h("p", { class: "muted" }, `${BALANCE.baseColonists} colonists are always aboard. Everything that reaches the surface rides a lander: colonists need Colonist Landers (50 each), and food, life support, the Tokamak and solar receivers need Cargo Landers (20 weight each).`),
        h(
          "div",
          { class: "pack-layout" },
          h("table", { class: "cargo" }, h("thead", {}, h("tr", {}, h("th", {}, "Cargo"), h("th", {}, "Wt"), h("th", {}, "Cost"), h("th", {}, "Qty"))), tbody),
          h(
            "div",
            {},
            summary,
            h(
              "div",
              { class: "col gap" },
              h(
                "button",
                {
                  class: "btn ghost",
                  onclick: () => {
                    Object.assign(manifest, recommendedManifest());
                    render();
                  },
                },
                "Recommended load",
              ),
              launch,
              h("button", { class: "btn ghost", onclick: () => difficultyScreen(host) }, "Back"),
            ),
          ),
        ),
      ),
    ),
  );
}

function planetRow(label: string, value: string | null) {
  return h("div", { class: "kv" }, h("span", {}, label), h("b", {}, value ?? "Unknown"));
}

function planetScreen(host: SetupHost, difficulty: Difficulty, manifest: Manifest) {
  const { root } = host;
  clear(root);
  const detail = manifest.interstellarProbe > 0 || manifest.ulbi > 0;
  const geo = manifest.geoProbe > 0;
  const weather = manifest.weatherSat > 0;
  const card = (p: PlanetDef) =>
    h(
      "button",
      { class: "planet-card", onclick: () => siteScreen(host, difficulty, manifest, p) },
      h("div", { class: `planet-orb orb-${p.id}` }),
      h("div", { class: "choice-title" }, p.name),
      h("div", { class: "muted small" }, p.kind),
      h("p", { class: "choice-text" }, p.desc),
      planetRow("Hostility", detail ? ["Mild", "Moderate", "Severe", "Extreme"][p.hostility] : null),
      planetRow("Gravity", detail ? `${p.gravity.toFixed(2)} g` : null),
      planetRow("Mineral richness", geo || detail ? `${Math.round(p.richness * 100)}%` : null),
      planetRow("Maximum digging depth", geo ? `${p.digDepth} levels` : null),
      planetRow("Solar power", detail ? `${Math.round(p.solar * 100)}%` : null),
      planetRow("Storm risk", weather ? ["Low", "Moderate", "High"][Math.min(2, Math.floor(p.disasters.storm * 5))] : null),
    );
  root.append(
    h(
      "div",
      { class: "setup-screen" },
      h("div", { class: "starfield" }),
      h(
        "div",
        { class: "panel wide" },
        h("h2", {}, `The ${STAR_NAME} system`),
        h("p", { class: "muted" }, detail ? "Probe data has arrived for every planet." : "Without an Interstellar or ULBI probe, most planetary data is unknown."),
        h("div", { class: "planet-grid" }, PLANETS.map(card)),
        h("div", { class: "row" }, h("button", { class: "btn ghost", onclick: () => packingScreen(host, difficulty, manifest) }, "Back to packing")),
      ),
    ),
  );
}

function siteScreen(host: SetupHost, difficulty: Difficulty, manifest: Manifest, planet: PlanetDef) {
  const { root } = host;
  clear(root);
  const seed = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
  const geo = manifest.geoProbe > 0;
  const sites = [0, 1, 2, 3].map((site) => {
    const map = generateMap(siteSeed(seed, planet.id, site), planet, geo);
    const canvas = h("canvas", { width: 192, height: 192, class: "minimap" }) as HTMLCanvasElement;
    drawMinimap(canvas, map.levels[0], geo, map.center);
    const counts = { clear: 0, rough: 0, hostile: 0, impassable: 0 } as Record<string, number>;
    let beacons = 0;
    for (const row of map.levels[0])
      for (const t of row) {
        counts[t.terrain]++;
        if (t.beacon) beacons++;
      }
    const total = map.levels[0].length ** 2;
    return h(
      "button",
      { class: "site-card", onclick: () => nameScreen(host, { seed, difficulty, planetId: planet.id, site, manifest }) },
      canvas,
      h("div", { class: "choice-title" }, `Site ${String.fromCharCode(65 + site)}`),
      planetRow("Clear terrain", `${Math.round((counts.clear / total) * 100)}%`),
      planetRow("Mining beacons", geo ? String(beacons) : null),
    );
  });
  root.append(
    h(
      "div",
      { class: "setup-screen" },
      h("div", { class: "starfield" }),
      h(
        "div",
        { class: "panel wide" },
        h("h2", {}, `Landing sites on ${planet.name}`),
        h(
          "p",
          { class: "muted" },
          "Black is clear terrain, red is rough, green is hostile and yellow-green is impassable.",
          geo ? " Red diamonds mark mining beacons found by the geological probe." : " Pack a geological probe to see mining beacons from orbit.",
        ),
        h("div", { class: "site-grid" }, sites),
        h("div", { class: "row" }, h("button", { class: "btn ghost", onclick: () => planetScreen(host, difficulty, manifest) }, "Back to planets")),
      ),
    ),
  );
}

function nameScreen(host: SetupHost, o: { seed: number; difficulty: Difficulty; planetId: string; site: number; manifest: Manifest }) {
  const { root } = host;
  clear(root);
  const input = h("input", { class: "text-input", value: "Lamplight", maxlength: 24 }) as HTMLInputElement;
  const go = () => host.start(newGame({ ...o, colonyName: input.value.trim() || "Lamplight" }), true);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") go();
  });
  root.append(
    h(
      "div",
      { class: "setup-screen" },
      h("div", { class: "starfield" }),
      h(
        "div",
        { class: "panel" },
        h("h2", {}, "Name the colony"),
        input,
        h("div", { class: "row end" }, h("button", { class: "btn primary", onclick: go }, "Drop the Seed Lander")),
      ),
    ),
  );
  input.focus();
  input.select();
}
