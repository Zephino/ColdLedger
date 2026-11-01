import { BALANCE } from "../data/balance";
import { BUILDINGS } from "../data/buildings";
import { PLANET_BY_ID } from "../data/planets";
import { FIELDS, TOPICS, TOPIC_BY_ID } from "../data/research";
import { PROCESSED, RESOURCE_GROUPS, type Processed } from "../data/resources";
import { ENDINGS, EVENT_BY_ID, FACTIONS } from "../data/story";
import {
  SATELLITES,
  STARSHIP_COMPONENT_COST,
  availableTopics,
  broadcastBlocked,
  broadcastLedger,
  canTrade,
  giftRebels,
  launchArk,
  launchSatellite,
  resolveEvent,
  setFactoryProduct,
  setResearch,
  spaceProgramMissing,
  startArkProgram,
  starshipBlocked,
  trade,
  tradeRate,
} from "../sim/actions";
import { countActive, countBuilt, housing, population, resourceCap, structures, warehouseCap, warehouseUsed } from "../sim/colony";
import { FACTORY_PRODUCTS } from "../sim/turn";
import type { FactionId, FactoryProduct, GameState } from "../sim/types";
import { downloadSave, saveToSlot } from "../save";
import { bar, clear, fmt, h, modal, toast, type ModalHandle } from "./dom";

export type ReportId = "summary" | "population" | "resources" | "research" | "factories" | "rebels" | "ledger" | "space" | "system";

interface Ctx {
  refresh(): void;
  quit(): void;
  select(x: number, y: number, level: number): void;
}

const kv = (k: string, v: string | number | Node, cls = "") => h("div", { class: `kv ${cls}` }, h("span", {}, k), typeof v === "object" ? v : h("b", {}, String(v)));

export function openReport(id: ReportId, s: GameState, ctx: Ctx) {
  const titles: Record<ReportId, string> = {
    summary: "Executive Summary",
    population: "Population",
    resources: "Resources & Storage",
    research: "Research",
    factories: "Master Factory Report",
    rebels: "Free Berth",
    ledger: "The Cold Ledger",
    space: "Space Program",
    system: "Colony Menu",
  };
  const body = h("div", {});
  const m = modal(titles[id], body, { wide: id === "research" || id === "ledger" || id === "resources" });
  const render = () => {
    clear(body);
    body.append(REPORTS[id](s, ctx, render, m));
    ctx.refresh();
  };
  render();
}

const REPORTS: Record<ReportId, (s: GameState, ctx: Ctx, rerender: () => void, m: ModalHandle) => Node> = {
  summary(s) {
    const r = s.lastReport;
    const pop = population(s);
    const facts = r.moraleFactors.slice().sort((a, b) => a[1] - b[1]);
    const robotsBusy = Object.keys(s.robots).length;
    return h(
      "div",
      { class: "report-grid" },
      h(
        "div",
        {},
        h("h3", {}, "Colony"),
        kv("Power", `${fmt(r.powerUsed)} used of ${fmt(r.powerMade)}`, r.powerUsed >= r.powerMade && r.powerMade > 0 ? "warn" : ""),
        kv("Population", pop),
        kv("Residences", `${pop} people, ${r.housing} beds (${r.housing ? Math.round((pop / r.housing) * 100) : 0}%)`, pop > r.housing * 2 ? "bad" : pop > r.housing ? "warn" : ""),
        kv("Atmosphere", r.atmosphere ? "CHAP operating" : s.colonistsLanded ? `Life support for ${Math.floor(s.air / Math.max(1, pop))} turns` : "Not needed yet", r.atmosphere || !s.colonistsLanded ? "" : "bad"),
        kv("Food", `${fmt(s.items.food)} stored · +${fmt(r.foodMade, 1)} / −${fmt(r.foodEaten, 1)} per turn`, r.foodMade < r.foodEaten ? "warn" : ""),
        kv("Mining", `${countActive(s, "mine")} active mines · ${fmt(r.oreMined)} ore mined · ${fmt(r.oreSmelted)} smelted`),
        kv("Luxuries", `${fmt(s.items.luxury)} in stock · ${countActive(s, "commercial")} commercial outlets`),
        kv("Crime", `${fmt(s.crime)}%`, s.crime > 40 ? "bad" : s.crime > 20 ? "warn" : ""),
        kv("Robots", `${robotsBusy} working · ${Object.values(s.idleRobots).reduce((a, b) => a + b, 0)} idle · ${s.trucks} trucks`),
        kv("Research", `${fmt(r.research, 1)} lab points per turn`),
        s.seedCollapsed ? null : kv("Seed equipment", `Fails in ${Math.max(0, BALANCE.seedCollapseTurn - s.turn)} turns`, BALANCE.seedCollapseTurn - s.turn < 30 ? "warn" : ""),
      ),
      h(
        "div",
        {},
        h("h3", {}, "Morale"),
        kv("Current", fmt(s.morale)),
        kv("Heading toward", fmt(r.moraleTarget)),
        bar(s.morale, BALANCE.moraleMax, s.morale < 300 ? "bad" : s.morale < 500 ? "warn" : "good"),
        h("div", { class: "factor-list" }, facts.map(([name, v]) => h("div", { class: `factor ${v < 0 ? "bad" : "good"}` }, h("span", {}, name), h("b", {}, v > 0 ? `+${v}` : v)))),
        h("p", { class: "small muted" }, "Morale drifts toward its target each turn. Births, deaths, research and events nudge it directly."),
      ),
    );
  },

  population(s) {
    const p = s.pop;
    const pop = population(s);
    const r = s.lastReport;
    const row = (label: string, n: number, note: string) => h("tr", {}, h("td", {}, label), h("td", { class: "num" }, n), h("td", { class: "muted small" }, note));
    return h(
      "div",
      {},
      h(
        "table",
        { class: "table" },
        h("tbody", {}, [
          row("Children", p.children, "Become students after about 30 turns."),
          row("Students", p.students, "Graduate as workers or scientists. Universities produce more scientists."),
          row("Workers", p.workers, "Staff most structures."),
          row("Scientists", p.scientists, "Staff labs; can fill worker jobs when needed."),
          row("Retired", p.retired, "No longer work."),
          row("Total", pop, ""),
        ]),
      ),
      kv("Births last turn", r.births),
      kv("Deaths last turn", r.deaths),
      kv("Births / deaths overall", `${s.stats.births} / ${s.stats.deaths}`),
      kv("Peak population", s.stats.peakPop),
      kv("Housing", `${housing(s)} beds`),
      kv("Universities", `${countActive(s, "university")} (${countActive(s, "university") * BALANCE.universityCapacity} seats)`),
      kv("Medical facilities", countActive(s, "medical")),
      h("p", { class: "small muted" }, s.turn <= BALANCE.fertileTurns ? `For the first ${BALANCE.fertileTurns} turns couples average six children; afterward, four. Deaths run high early on.` : "Birth rates have settled to four children per couple."),
    );
  },

  resources(s) {
    const cap = resourceCap(s);
    const groups = RESOURCE_GROUPS.map((g) =>
      h(
        "div",
        { class: "res-group" },
        h("h3", {}, g.label),
        g.members.map((r) => h("div", { class: "res-row" }, h("span", {}, r), bar(s.stock[r], cap, s.stock[r] < 10 ? "bad" : ""), h("b", {}, `${fmt(s.stock[r])}`))),
      ),
    );
    const items = s.items;
    return h(
      "div",
      {},
      h("p", { class: "muted small" }, `Storage tanks hold up to ${fmt(cap)} of each processed resource (${fmt(resourceCap(s) * 6)} tank capacity). Smelter output beyond that is lost as slag.`),
      h("div", { class: "res-grid" }, groups),
      h(
        "div",
        { class: "report-grid" },
        h(
          "div",
          {},
          h("h3", {}, "Warehouse goods"),
          kv("Capacity", `${warehouseUsed(s)} / ${warehouseCap(s)} mass units`),
          kv("Luxuries", fmt(items.luxury)),
          kv("Clothing", fmt(items.clothing)),
          kv("Medicine", fmt(items.medicine)),
          kv("Fuel cells", fmt(items.fuelCells)),
          kv("Road material", fmt(items.roadMaterial)),
          kv("Multi-Purpose Goo", fmt(items.mpg)),
        ),
        h(
          "div",
          {},
          h("h3", {}, "Ore at smelters"),
          kv("Ore yard", `${fmt(s.ore)} / ${fmt(countActive(s, "smelter", "seedSmelter") * BALANCE.smelterCapacity)}`),
          h("div", { class: "ore-mix" }, Object.entries(s.oreMix).filter(([, v]) => (v ?? 0) > 1).map(([o, v]) => h("span", { class: "ore-chip" }, `${o.replace("Ore", "")} ${fmt(v ?? 0)}`))),
          h("p", { class: "small muted" }, "Metal ore smelts to half its weight in metal. Mineral ore yields minerals plus some precious metal."),
        ),
      ),
    );
  },

  research(s, _ctx, rerender) {
    const avail = availableTopics(s);
    const current = s.research.current ? TOPIC_BY_ID[s.research.current] : null;
    const hot = s.research.hotCurrent ? TOPIC_BY_ID[s.research.hotCurrent] : null;
    const labs = countActive(s, "lab");
    const hotLabs = countActive(s, "hotLab");
    const choose = (id: string, isHot: boolean) => {
      const res = setResearch(s, id, isHot);
      if (!res.ok) toast(res.reason ?? "", "bad");
      rerender();
    };
    const fieldBlocks = FIELDS.map((field) => {
      const topics = TOPICS.filter((t) => t.field === field);
      return h(
        "div",
        { class: "field" },
        h("h3", {}, field),
        topics.map((t) => {
          const done = s.research.done.includes(t.id);
          const open = avail.includes(t);
          const isCurrent = s.research.current === t.id || s.research.hotCurrent === t.id;
          const progress = s.research.current === t.id ? s.research.progress : s.research.hotCurrent === t.id ? s.research.hotProgress : 0;
          return h(
            "button",
            {
              class: `topic ${done ? "done" : open ? "open" : "locked"} ${isCurrent ? "current" : ""} ${t.hot ? "hot" : ""}`,
              disabled: !open || done,
              title: `${t.desc}${t.parent ? `\nRequires ${TOPIC_BY_ID[t.parent].name}` : ""}${t.hot ? "\nHot Laboratory only" : ""}`,
              onclick: () => choose(t.id, !!t.hot),
            },
            h("span", { class: "topic-name" }, t.parent ? "↳ " : "", t.name),
            h("span", { class: "topic-meta" }, done ? "✓" : isCurrent ? `${Math.floor((progress / t.cost) * 100)}%` : `${t.cost}`),
          );
        }),
      );
    });
    return h(
      "div",
      {},
      h(
        "div",
        { class: "report-grid" },
        h(
          "div",
          {},
          kv("Laboratories", `${labs} operating`),
          kv("Current topic", current ? `${current.name} · ${fmt(s.research.progress, 1)} / ${current.cost}` : "None: pick a topic below"),
          current ? bar(s.research.progress, current.cost) : null,
        ),
        h(
          "div",
          {},
          kv("Hot laboratories", `${hotLabs} operating`),
          kv("Hot topic", hot ? `${hot.name} · ${fmt(s.research.hotProgress, 1)} / ${hot.cost}` : "None"),
          hot ? bar(s.research.hotProgress, hot.cost, "warn") : null,
        ),
      ),
      s.plague ? h("div", { class: "alert bad" }, `Plague: all labs are working on an antidote (${fmt(s.plague.cure, 1)} / ${s.plague.cureNeeded}).`) : null,
      h("p", { class: "small muted" }, `Costs are in lab-turns. Basic research speeds everything up by ${Math.round(BALANCE.basicResearchBonus * 100)}% after turn ${BALANCE.basicResearchTurns}. Orange topics need a Hot Laboratory; when one lab type has no topic, its points help the other.`),
      h("div", { class: "fields" }, fieldBlocks),
    );
  },

  factories(s, ctx, rerender, m) {
    const list = structures(s).filter((st) => st.factory && st.state !== "destroyed");
    if (!list.length) return h("p", { class: "muted" }, "No factories.");
    return h(
      "div",
      {},
      h(
        "table",
        { class: "table" },
        h("thead", {}, h("tr", {}, h("th", {}, "Factory"), h("th", {}, "Status"), h("th", {}, "Product"), h("th", {}, "Progress"), h("th", {}, ""))),
        h(
          "tbody",
          {},
          list.map((st) => {
            const products: FactoryProduct[] = st.type === "seedFactory" ? ["none", "dozer", "digger", "miner", "explorer", "truck"] : ["none", ...(Object.keys(FACTORY_PRODUCTS) as FactoryProduct[])];
            const spec = st.factory!.product !== "none" ? FACTORY_PRODUCTS[st.factory!.product] : null;
            return h(
              "tr",
              {},
              h("td", {}, BUILDINGS[st.type].name),
              h("td", {}, st.state),
              h(
                "td",
                {},
                h(
                  "select",
                  {
                    onchange: (e: Event) => {
                      const res = setFactoryProduct(s, st.id, (e.target as HTMLSelectElement).value as FactoryProduct);
                      if (!res.ok) toast(res.reason ?? "", "bad");
                      rerender();
                    },
                  },
                  products.map((p) => h("option", { value: p, selected: st.factory!.product === p }, p === "none" ? "Paused" : FACTORY_PRODUCTS[p].name)),
                ),
              ),
              h("td", {}, spec ? `${fmt(st.factory!.progress, 1)} / ${spec.turns}` : "—"),
              h(
                "td",
                {},
                h(
                  "button",
                  {
                    class: "btn small",
                    onclick: () => {
                      m.close();
                      ctx.select(st.x, st.y, st.level);
                    },
                  },
                  "Show",
                ),
              ),
            );
          }),
        ),
      ),
      kv("Idle robots", Object.entries(s.idleRobots).filter(([, n]) => n > 0).map(([k, n]) => `${n} ${k}`).join(", ") || "none"),
      kv("Trucks", `${s.trucks} (plus one built into each mine)`),
      h("p", { class: "small muted" }, "Factories hold up to 10 finished robots each. Production speed rises with morale."),
    );
  },

  rebels(s, _ctx, rerender) {
    const r = s.rebels;
    const observed = s.satellites.includes("observer");
    const blocked = canTrade(s);
    const give = h("select", {}, PROCESSED.map((p) => h("option", { value: p }, p))) as HTMLSelectElement;
    const get = h("select", {}, PROCESSED.map((p) => h("option", { value: p, selected: p === "MetalA" }, p))) as HTMLSelectElement;
    const amount = h("input", { type: "number", class: "text-input small", value: 50, min: 1, step: 10 }) as HTMLInputElement;
    const rate = tradeRate(s) * 0.8;
    return h(
      "div",
      {},
      h("p", {}, "Free Berth was founded by colonists who split off at landing after seeing the berth list. They live somewhere beyond your colony's radius."),
      kv("Population", observed ? fmt(r.population) : `about ${Math.round(r.population / 25) * 25}`),
      kv("Hostility", observed ? `${fmt(r.hostility)} / 100` : r.hostility > 70 ? "Hostile" : r.hostility > 40 ? "Wary" : "Friendly", r.hostility > 70 ? "bad" : r.hostility > 40 ? "warn" : "good"),
      observed ? h("div", { class: "ore-mix" }, Object.entries(r.stock).map(([k, v]) => h("span", { class: "ore-chip" }, `${k} ${fmt(v ?? 0)}`))) : h("p", { class: "small muted" }, "Launch an Orbital Observer to see their exact numbers and stores."),
      h("h3", {}, "Trade"),
      blocked ? h("div", { class: "alert warn" }, blocked) : h("p", { class: "small" }, `Current rate: you receive ${fmt(rate * 100)}% of what you give.`),
      h(
        "div",
        { class: "row gap" },
        h("span", {}, "Give"),
        amount,
        give,
        h("span", {}, "for"),
        get,
        h(
          "button",
          {
            class: "btn small primary",
            disabled: !!blocked,
            onclick: () => {
              const res = trade(s, give.value as Processed, get.value as Processed, Math.floor(+amount.value));
              if (!res.ok) toast(res.reason ?? "", "bad");
              rerender();
            },
          },
          "Trade",
        ),
        h(
          "button",
          {
            class: "btn small",
            onclick: () => {
              const res = giftRebels(s, give.value as Processed, Math.floor(+amount.value));
              if (!res.ok) toast(res.reason ?? "", "bad");
              rerender();
            },
          },
          "Send as gift",
        ),
      ),
      h("p", { class: "small muted" }, "Gifts lower hostility. If hostility stays above 70, saboteurs strike. Low morale drives your colonists to defect; morale above 800 draws Free Berth's people to you."),
    );
  },

  ledger(s) {
    const st = s.story;
    const factions = (Object.keys(FACTIONS) as FactionId[]).map((f) =>
      h("div", { class: "faction" }, h("div", { class: "row space" }, h("b", {}, FACTIONS[f].name), h("span", {}, st.trust[f])), bar(st.trust[f], 100, st.trust[f] < 30 ? "bad" : st.trust[f] > 60 ? "good" : ""), h("div", { class: "small muted" }, FACTIONS[f].desc)),
    );
    const entries = st.evidenceSeen.map((e) => {
      if (e.startsWith("research:")) return `Audit via ${TOPIC_BY_ID[e.slice(9)]?.name ?? e}`;
      return EVENT_BY_ID[e]?.title ?? { contractTerms: "Contract fine print", envoySlate: "The envoy's slate", crates: "Trust reserve crates", pods: "Empty pods", berthList: "The berth list" }[e] ?? e;
    });
    const missing = spaceProgramMissing(s);
    const arkBlocked = starshipBlocked(s);
    const charterBlocked = broadcastBlocked(s);
    const planet = PLANET_BY_ID[s.planetId];
    return h(
      "div",
      { class: "report-grid" },
      h("div", {}, h("h3", {}, "Factions"), factions),
      h(
        "div",
        {},
        h("h3", {}, `Ledger entries: ${st.evidence}`),
        entries.length ? h("ul", { class: "ledger-list" }, entries.map((e) => h("li", {}, e))) : h("p", { class: "muted" }, "Nothing recorded yet. Research in economics, history, sociology and systems analysis can expose discrepancies."),
        h("h3", {}, "Paths forward"),
        h(
          "div",
          { class: "path" },
          h("b", {}, ENDINGS.secondArk.title),
          h("div", { class: "small" }, `Ark components ${s.starship.components} / ${BALANCE.starshipComponents}.`),
          h("div", { class: "small muted" }, missing.length ? `Space program research missing: ${missing.join(", ")}.` : arkBlocked ?? "Ready to assemble at the spaceport."),
        ),
        h("div", { class: "path" }, h("b", {}, ENDINGS.greenHorizon.title), h("div", { class: "small" }, `Atmosphere ${fmt(s.terraform, 1)}% breathable · ${countActive(s, "terraform")} terraforming facilities · world factor ${Math.round(planet.terraform * 100)}%.`)),
        h("div", { class: "path" }, h("b", {}, ENDINGS.openCharter.title), h("div", { class: "small muted" }, charterBlocked ?? "Ready to broadcast from the Space report.")),
      ),
    );
  },

  space(s, _ctx, rerender) {
    const port = countActive(s, "spaceport") > 0;
    const sats = (Object.keys(SATELLITES) as Array<keyof typeof SATELLITES>).map((k) => {
      const def = SATELLITES[k];
      const has = s.satellites.filter((x) => x === k).length;
      return h(
        "div",
        { class: "sat-row" },
        h("div", {}, h("b", {}, def.name), has ? h("span", { class: "muted small" }, ` · ${has} in orbit`) : null, h("div", { class: "small muted" }, Object.entries(def.cost).map(([r, n]) => `${r} ${n}`).join(", "))),
        h(
          "button",
          {
            class: "btn small",
            onclick: () => {
              const res = launchSatellite(s, k);
              if (!res.ok) toast(res.reason ?? "", "bad");
              rerender();
            },
          },
          "Launch",
        ),
      );
    });
    const ark = starshipBlocked(s);
    const charter = broadcastBlocked(s);
    return h(
      "div",
      {},
      kv("Spaceport", port ? "Operating" : "None operating", port ? "good" : "warn"),
      kv("Mass driver", countActive(s, "massDriver") ? "Operating" : "None", countActive(s, "massDriver") ? "good" : "warn"),
      kv("In orbit", s.satellites.length ? s.satellites.join(", ") : "nothing"),
      h("h3", {}, "Satellites"),
      sats,
      h("h3", {}, "The Second Ark"),
      kv("Components in orbit", `${s.starship.components} / ${BALANCE.starshipComponents}`),
      s.story.flags.arkProgram ? kv("Current component", s.starship.progress > 0 ? `${Math.floor(s.starship.progress)} / ${BALANCE.starshipComponentTurns} turns` : "Waiting for materials") : null,
      h("div", { class: "small muted" }, `Each component costs ${Object.entries(STARSHIP_COMPONENT_COST).map(([r, n]) => `${r} ${n}`).join(", ")}.`),
      ark ? h("div", { class: "alert warn" }, ark) : null,
      h(
        "div",
        { class: "row gap" },
        h(
          "button",
          {
            class: "btn",
            disabled: !!ark || !!s.story.flags.arkProgram,
            onclick: () => {
              const res = startArkProgram(s);
              if (!res.ok) toast(res.reason ?? "", "bad");
              rerender();
            },
          },
          s.story.flags.arkProgram ? "Assembly under way" : "Begin ark assembly",
        ),
        h(
          "button",
          {
            class: "btn primary",
            disabled: s.starship.components < BALANCE.starshipComponents,
            onclick: () => {
              const res = launchArk(s);
              if (!res.ok) toast(res.reason ?? "", "bad");
              rerender();
            },
          },
          "Launch the ark",
        ),
      ),
      h("h3", {}, "Broadcast the Ledger"),
      charter ? h("div", { class: "alert warn" }, charter) : h("p", {}, "Everything is ready. Once sent, it cannot be unsent."),
      h(
        "button",
        {
          class: "btn primary",
          disabled: !!charter,
          onclick: () => {
            const res = broadcastLedger(s);
            if (!res.ok) toast(res.reason ?? "", "bad");
            rerender();
          },
        },
        "Broadcast",
      ),
    );
  },

  system(s, ctx, _rerender, m) {
    const name = h("input", { class: "text-input", value: s.colonyName }) as HTMLInputElement;
    return h(
      "div",
      { class: "col gap" },
      h("div", { class: "row gap" }, name, h("button", { class: "btn primary", onclick: () => (saveToSlot(s, name.value || s.colonyName), toast("Saved.")) }, "Save")),
      h("button", { class: "btn", onclick: () => downloadSave(s) }, "Export save file"),
      h("button", { class: "btn", onclick: () => help() }, "How to play"),
      h(
        "button",
        {
          class: "btn danger",
          onclick: () => {
            m.close();
            ctx.quit();
          },
        },
        "Quit to title",
      ),
      h("p", { class: "small muted" }, `Difficulty: ${s.difficulty}. The game autosaves every 10 turns.`),
    );
  },
};

export function help() {
  modal(
    "How to play",
    h(
      "div",
      { class: "help" },
      h("h3", {}, "The first turns"),
      h("ol", {}, [
        h("li", {}, "The seed units finish in order: power (turn 4), smelter, robot factory, command facility. Right away, put the robominer on a red mining beacon, a robodozer next to a tube end, and the robodigger on a tile beside a tube to sink an air shaft."),
        h("li", {}, "Once the Seed Command Facility is done, bring down the Cargo Lander and Colonist Landers. From then on the colonists' air is running out: build a CHAP and an AgriDome right away."),
        h("li", {}, "Go underground through the air shaft (the level buttons, or Q and E). Bulldoze the excavated tiles there, then build Residential Units, Labs, a University, a Park and a Medical Facility."),
        h("li", {}, "Build Storage Tanks for processed resources and a Smelter of your own. Around turn 150 the seed power, smelter and factory fail."),
      ]),
      h("h3", {}, "Rules"),
      h("ul", {}, [
        h("li", {}, "Except for the Command Center and landers, structures go on bulldozed ground, next to a tube or a connected building."),
        h("li", {}, "The Tile Picker only lets you build what you can afford in resources, spare power and spare workers."),
        h("li", {}, "Mines need no tubes. Their ore is trucked automatically to the nearest smelter; extra trucks, roads and a short distance all move ore faster."),
        h("li", {}, "Keep housing occupancy under 200%. Morale drives births, deaths, productivity and defection."),
        h("li", {}, "Every structure draws a little of the resources listed in its upkeep. A SPEW facility recycles waste into Multi-Purpose Goo, which covers missing upkeep."),
        h("li", {}, "Research unlocks better structures, satellites, the space program, terraforming, and the evidence for the Ledger."),
      ]),
      h("h3", {}, "Controls"),
      h("p", {}, "Left-click to select or place. Drag with the right mouse button or use WASD and the arrow keys to pan; scroll to zoom. Esc cancels, Enter ends the turn, and Q and E change levels."),
    ),
    { wide: true },
  );
}

export function openEvent(s: GameState, refresh: () => void) {
  const pending = s.story.pending;
  if (!pending) return;
  const ev = EVENT_BY_ID[pending.id];
  if (!ev) {
    delete s.story.pending;
    return;
  }
  const body = h(
    "div",
    { class: "event" },
    h("div", { class: "event-kicker" }, `Turn ${s.turn} · Comptroller's desk`),
    h("p", { class: "event-body" }, ev.body(s)),
    h(
      "div",
      { class: "col gap" },
      ev.choices.map((c, i) => {
        const ok = !c.available || c.available(s);
        return h(
          "button",
          {
            class: `btn choice-btn ${ok ? "" : "dim"}`,
            disabled: !ok,
            onclick: () => {
              const res = resolveEvent(s, i);
              if (!res.ok) return toast(res.reason ?? "", "bad");
              m.close();
              const last = s.messages[s.messages.length - 1];
              modal(ev.title, h("p", { class: "event-body" }, last?.text.replace(`${ev.title}: `, "") ?? ""), { onClose: refresh });
              refresh();
            },
          },
          c.label,
        );
      }),
    ),
  );
  const m = modal(ev.title, body, { closable: false });
}

export function openEnding(s: GameState, quit: () => void) {
  const e = s.ending;
  if (!e) return;
  const text = ENDINGS[e.id];
  const pop = population(s);
  modal(
    text.title,
    h(
      "div",
      { class: "ending" },
      h("div", { class: `ending-badge ${e.won ? "good" : "bad"}` }, e.won ? "Colony victory" : e.id === "ghostTown" ? "Colony lost" : "Ending"),
      h("p", { class: "event-body" }, text.text),
      kv("Turn", e.turn),
      kv("Population", pop),
      kv("Peak population", s.stats.peakPop),
      kv("Topics researched", s.research.done.length),
      kv("Ledger entries", s.story.evidence),
      kv("Structures standing", countBuilt(s, ...Object.keys(BUILDINGS).filter((k) => !BUILDINGS[k as keyof typeof BUILDINGS].passive) as Array<keyof typeof BUILDINGS>)),
      h("div", { class: "row gap end" }, h("button", { class: "btn", onclick: quit }, "Return to title")),
    ),
    { closable: true },
  );
}
