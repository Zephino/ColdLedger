/** Processed resources held in Storage Tanks (manual: Mined and Processed Resources). */
export const PROCESSED = [
  "MetalA",
  "MetalB",
  "MetalC",
  "MetalD",
  "PrecA",
  "PrecB",
  "MinA",
  "MinB",
  "MinC",
  "FusionA",
  "FusionB",
  "FusionC",
] as const;
export type Processed = (typeof PROCESSED)[number];

/** Raw ores dug by mines. The OreLife columns exist in the data files but no structure uses them. */
export const ORES = [
  "OreA",
  "OreB",
  "OreC",
  "OreD",
  "OreMinA",
  "OreMinB",
  "OreMinC",
  "OreFusionA",
  "OreFusionB",
  "OreFusionC",
] as const;
export type Ore = (typeof ORES)[number];

export const RESOURCE_GROUPS: Array<{ label: string; members: Processed[] }> = [
  { label: "Metals", members: ["MetalA", "MetalB", "MetalC", "MetalD"] },
  { label: "Precious", members: ["PrecA", "PrecB"] },
  { label: "Minerals", members: ["MinA", "MinB", "MinC"] },
  { label: "Fusion", members: ["FusionA", "FusionB", "FusionC"] },
];

export function isProcessed(name: string): name is Processed {
  return (PROCESSED as readonly string[]).includes(name);
}

export type Stock<K extends string> = Record<K, number>;

export function emptyProcessed(): Stock<Processed> {
  return Object.fromEntries(PROCESSED.map((r) => [r, 0])) as Stock<Processed>;
}

export function emptyOre(): Stock<Ore> {
  return Object.fromEntries(ORES.map((r) => [r, 0])) as Stock<Ore>;
}

/** What each ore becomes in a smelter. */
export function smeltOre(ore: Ore, amount: number, metalYield: number, preciousFraction: number): Partial<Stock<Processed>> {
  switch (ore) {
    case "OreA":
      return { MetalA: amount * metalYield };
    case "OreB":
      return { MetalB: amount * metalYield };
    case "OreC":
      return { MetalC: amount * metalYield };
    case "OreD":
      return { MetalD: amount * metalYield };
    case "OreMinA":
      return { MinA: amount };
    case "OreMinB":
      return { MinB: amount * (1 - preciousFraction), PrecA: amount * preciousFraction };
    case "OreMinC":
      return { MinC: amount * (1 - preciousFraction), PrecB: amount * preciousFraction };
    case "OreFusionA":
      return { FusionA: amount };
    case "OreFusionB":
      return { FusionB: amount };
    case "OreFusionC":
      return { FusionC: amount };
  }
}
