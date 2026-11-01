import { countBuilt, population, structures } from "../src/sim/colony";
import { botGame, botTurn } from "./bot";

const seed = Number(process.argv[2] ?? 1);
const turns = Number(process.argv[3] ?? 120);
const every = Number(process.argv[4] ?? 5);
const s = botGame(seed);
for (let t = 0; t < turns && !s.ending; t++) {
  botTurn(s);
  if (s.turn % every === 0) {
    const r = s.lastReport;
    const idle = structures(s)
      .filter((st) => st.state === "idle")
      .map((st) => `${st.type}:${st.idleReason}`)
      .join(",");
    const building = structures(s)
      .filter((st) => st.state === "building")
      .map((st) => st.type)
      .join(",");
    console.log(
      `t${s.turn} pop ${population(s)} (${s.pop.workers}w ${s.pop.scientists}s ${s.pop.children}c ${s.pop.students}st ${s.pop.retired}r) morale ${Math.round(s.morale)}→${Math.round(r.moraleTarget)} ` +
        `food ${Math.round(s.items.food)} (+${r.foodMade}/-${Math.round(r.foodEaten)}) air ${r.atmosphere ? "CHAP" : s.air} smelters ${countBuilt(s, "smelter")} chap ${countBuilt(s, "chap")} storage ${countBuilt(s, "storage")} power ${r.powerMade}/${r.powerUsed} ` +
        `work ${r.workersNeeded}/${r.workersAvailable} house ${r.housing} ore ${Math.round(s.ore)} mined ${Math.round(r.oreMined)} smelt ${Math.round(r.oreSmelted)} ` +
        `MetalA ${Math.round(s.stock.MetalA)} MinA ${Math.round(s.stock.MinA)} MinB ${Math.round(s.stock.MinB)} MinC ${Math.round(s.stock.MinC)} PrecA ${Math.round(s.stock.PrecA)} ` +
        `mines ${countBuilt(s, "mine")} trucks ${s.trucks} robots ${JSON.stringify(s.idleRobots)} active ${Object.keys(s.robots).length} lvls ${s.openLevels}`,
    );
    console.log(`   idle[${idle}] building[${building}] factors ${JSON.stringify(r.moraleFactors)}`);
  }
}
const recent = s.messages.slice(-25).map((m) => `${m.turn}: ${m.text}`);
console.log(recent.join("\n"));
console.log("ending", s.ending);
