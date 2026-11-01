import { describe, expect, it } from "vitest";
import { recommendedManifest, checkManifest } from "../src/data/cargo";
import { BALANCE } from "../src/data/balance";
import { buildCost, buildTurns, opsData } from "../src/data/buildings";
import { placeRobot } from "../src/sim/actions";
import { countBuilt, population } from "../src/sim/colony";
import { deserialize, serialize } from "../src/save";
import { botGame, botTurn } from "./bot";

describe("data", () => {
  it("uses the original structure table values", () => {
    expect(buildTurns("agridome")).toBe(5);
    expect(buildTurns("chap")).toBe(6);
    expect(opsData("mine").power).toBe(5);
    expect(opsData("mine").workers).toBe(1);
    expect(opsData("tokamak").resources).toEqual(["FusionA", "FusionB", "FusionC"]);
    expect(Object.keys(buildCost("agridome"))).toEqual(["MetalA", "MinA", "MinB", "MinC"]);
  });

  it("recommended manifest fits the budget", () => {
    const check = checkManifest(recommendedManifest(), BALANCE.packFunds, BALANCE.packWeight, BALANCE.baseColonists);
    expect(check.errors).toEqual([]);
  });
});

describe("simulation", () => {
  it("seed complex completes in the manual's order", () => {
    const s = botGame(1);
    const done: string[] = [];
    for (let t = 0; t < 12; t++) {
      botTurn(s);
      for (const st of Object.values(s.structures)) if (st.type.startsWith("seed") && st.state === "active" && !done.includes(st.type)) done.push(st.type);
    }
    expect(done.filter((d) => d !== "seedLander")).toEqual(["seedPower", "seedSmelter", "seedFactory", "seedCommand"]);
  });

  it("robots can be deployed on the first turn", () => {
    const s = botGame(5);
    const x = s.center.x + 5;
    const y = s.center.y - 2;
    expect(s.levels[0][y][x].beacon).toBeTruthy();
    expect(placeRobot(s, "miner", 0, x, y, {}).ok).toBe(true);
  });

  it("a tutorial-style colony survives 220 turns on medium", () => {
    const results: string[] = [];
    for (const seed of [1, 2, 3]) {
      const s = botGame(seed);
      for (let t = 0; t < 220 && !s.ending; t++) botTurn(s);
      const pop = population(s);
      results.push(
        `seed ${seed}: turn ${s.turn} pop ${pop} morale ${Math.round(s.morale)} births ${s.stats.births} deaths ${s.stats.deaths} ` +
          `res ${countBuilt(s, "residence")} domes ${countBuilt(s, "agridome")} mines ${countBuilt(s, "mine")} topics ${s.research.done.length} ` +
          `metalA ${Math.round(s.stock.MetalA)} ore ${Math.round(s.ore)} power ${s.lastReport.powerMade}/${s.lastReport.powerUsed} ending ${s.ending?.id ?? "-"}`,
      );
      expect(s.colonistsLanded).toBe(true);
      expect(pop).toBeGreaterThan(50);
    }
    console.log(results.join("\n"));
  });

  it("saves round-trip", () => {
    const s = botGame(4);
    for (let t = 0; t < 30; t++) botTurn(s);
    const copy = deserialize(serialize(s));
    expect(typeof copy).toBe("object");
    expect(serialize(copy as typeof s)).toBe(serialize(s));
  });
});
