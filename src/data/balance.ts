/**
 * Tunable rules. Each value records where it comes from:
 *   manual   – stated in the reference manual
 *   data     – read from the structure tables (structureTables.ts)
 *   estimate – not published; chosen to make the documented rules playable
 * Rebalance by editing values here; nothing else hard-codes them.
 */
export const BALANCE = {
  // Packing (manual, Packing for the Trip)
  packFunds: 172,
  packWeight: 78,
  baseColonists: 100,

  // Time and limits (manual, The Numbers Game)
  minBuildTurns: 2,
  maxBuildTurns: 12,
  maxMiningLevels: 4,
  colonyRadius: 30,
  seedCollapseTurn: 150,
  occupancyMoraleLimit: 200,
  defectionMorale: 200,
  immigrationMorale: 800,
  moraleMax: 1000,
  startingMorale: 600, // estimate (tutorial shows 574 at turn 19)
  fertileTurns: 60,

  // Food and air
  agriFoodPerTurn: 10, // manual: 10 units per dome per turn
  colonistsPerFood: 10, // manual: one unit feeds 10 per turn
  agriStorage: 1000, // manual
  cargoFoodUnits: 100, // estimate: food units per packed cargo unit
  cargoAirPersonTurns: 1000, // estimate: colonist-turns of air per Life Support unit

  // Power (manual power table and tutorial)
  seedPower: 50,
  tokamakPower: 1000,
  solarReceiverPower: 1000, // manual: one satellite feeds up to 2000 across two receivers
  receiversPerSolarSat: 2,
  geothermalPower: 600, // estimate

  // Construction and upkeep
  buildUnitScale: 3, // estimate: resource units per BLDGBLD unit column
  seedTrucks: 2, // estimate, matching the secondary colony package
  upkeepPerResource: 0.2, // estimate: units per listed BLDGOPS resource per turn
  breakdownScale: 0.0003, // estimate: manual breakdown % × this = chance per turn
  repairTurns: 3, // estimate
  repairCostFraction: 0.25, // estimate

  // Mining, trucking, smelting
  mineOreStorage: 500, // manual
  mineOrePerLevel: 40, // estimate
  mineLifeMin: 100, // manual: mines last 100-400 turns by digging depth
  mineLifeMax: 400,
  truckLoad: 100, // manual
  truckTilesPerTurn: { rough: 1, clear: 3, dirt: 4, paved: 5 }, // manual
  smelterCapacity: 1000, // manual
  smelterOrePerTurn: 100, // manual: one truck load per turn
  storageTankCapacity: 1000, // manual
  seedStorageCapacity: 1500, // estimate: the seed complex holds processed output
  // estimate: the tutorial places an AgriDome and CHAP on turn 18, so the seed lander must carry stock
  seedStock: { MetalA: 170, MetalB: 100, MetalC: 100, MetalD: 100, PrecA: 70, PrecB: 50, MinA: 150, MinB: 100, MinC: 100, FusionA: 40, FusionB: 30, FusionC: 30 },
  metalYield: 0.5, // manual: metal ore yields half its weight
  preciousFraction: 0.25, // estimate: share of mineral ore recovered as precious metal

  // Warehouse (manual, Storage)
  warehouseCapacity: 100,
  massUnits: { clothing: 3, fuelCells: 2, luxury: 3, medicine: 1, roadMaterial: 3, robots: 5, trucks: 6 },
  factoryRobotStorage: 10, // manual

  // Factories (manual, Factories)
  robotBuildTurns: 5,
  truckBuildTurns: 5,
  fuelCellBuildTurns: 10,
  fuelCellLife: 200,

  // Robots
  robotControlBase: 6, // estimate: seed command link
  robotsPerCommand: 10, // manual
  commRangeBase: 10, // estimate
  commRangePerTower: 8, // estimate
  robotLossChance: 0.02, // estimate: per turn outside comm range
  dozeTurns: { clear: 1, rough: 3, hostile: 6, ugEasy: 1, ugDiff: 3 },
  shaftTurns: 4, // estimate
  digStripLength: 5, // estimate
  digStripWidth: 3,
  digTurns: 3,
  explorerFindChance: 0.06, // estimate

  // Population (manual gives the shape; rates are estimates)
  residenceCapacity: [25, 32, 40], // estimate, by tier
  seedHousing: 120, // estimate
  birthRateEarly: 0.009,
  birthRateLate: 0.006,
  deathRateBase: 0.0018,
  deathRateEarlyMultiplier: 2,
  childTurns: 30,
  studentTurns: 20,
  retireRate: 1 / 400,
  elderDeathRate: 1 / 60,
  universityCapacity: 20,

  // Morale model (estimate)
  moraleApproach: 0.06,
  moralePerBuildingPoint: 12,
  moralePerLuxury: 25,
  moraleDeathHit: 2,
  moraleBirthGain: 1,
  moraleResearchGain: 25,
  moraleHostilityPenalty: 35,

  // Crime (estimate)
  crimePerPolice: 18,
  redLightCrime: 65,

  // Research (estimate)
  labPointsPerTurn: 1,
  basicResearchTurns: 100, // manual: basic research accelerates after ~100 turns
  basicResearchBonus: 0.25,

  // Plague (manual: ~20 turns, ~40 with a medical facility)
  disasterGraceTurns: 40, // estimate: lets landers come down before the first disaster
  plagueWindow: 20,
  plagueWindowMedical: 40,
  plagueCureLabTurns: 18,
  plagueLethality: 0.55,

  // Light industry (manual: one unit per turn)
  lightIndustryPerTurn: 1,
  commercialLuxuryDraw: 1,
  redLightLuxuryDraw: 2,

  // SPEW (manual, Recycling)
  mpgPerResidence: 1,
  recycleFraction: 0.5,

  // Secondary colony package (manual, Starting Secondary Colonies)
  colonyPackage: {
    robots: { dozer: 2, digger: 2, miner: 2 },
    trucks: 2,
    resources: { MetalA: 100, MetalB: 100, MetalC: 100, MetalD: 100, PrecA: 40, PrecB: 40, MinB: 50, MinC: 50, FusionA: 30, FusionB: 30, FusionC: 30, MinA: 70 },
    food: 100,
    colonists: 2,
  },

  // Endgame (estimate)
  terraformPerFacility: 0.08, // percent per turn
  starshipComponents: 5,
  starshipComponentTurns: 20,
};

export const DIFFICULTIES = ["beginner", "easy", "medium", "hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

/** Difficulty knobs (manual describes the direction; magnitudes are estimates). */
export const DIFFICULTY: Record<
  Difficulty,
  { rebelShare: number; disaster: number; plague: number; accident: number; hostilityShift: number; tradeRate: number; nanoFree: boolean }
> = {
  beginner: { rebelShare: 0.1, disaster: 0, plague: 0, accident: 0, hostilityShift: -1, tradeRate: 1.3, nanoFree: true },
  easy: { rebelShare: 0.2, disaster: 0.0004, plague: 0.0004, accident: 0.0002, hostilityShift: 0, tradeRate: 1.15, nanoFree: false },
  medium: { rebelShare: 0.35, disaster: 0.0015, plague: 0.0012, accident: 0.0006, hostilityShift: 0, tradeRate: 1, nanoFree: false },
  hard: { rebelShare: 0.5, disaster: 0.003, plague: 0.0025, accident: 0.0012, hostilityShift: 1, tradeRate: 0.85, nanoFree: false },
};
