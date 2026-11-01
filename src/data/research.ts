/**
 * Research topics follow the reference research tree.
 * Costs are lab-turns (estimate). Effects are keys the simulation checks.
 */
export interface Topic {
  id: string;
  name: string;
  field: string;
  parent?: string;
  cost: number;
  hot?: boolean;
  effects?: string[];
  desc: string;
}

const T = (
  id: string,
  name: string,
  field: string,
  cost: number,
  desc: string,
  opts: { parent?: string; hot?: boolean; effects?: string[] } = {},
): Topic => ({ id, name, field, cost, desc, ...opts });

export const TOPICS: Topic[] = [
  T("astrophysics", "Astrophysics", "Astronomy", 40, "Stellar processes. Required for a space program.", { effects: ["space:astrophysics"] }),
  T("basicAstronomy", "Basic Astronomy", "Astronomy", 20, "Orbital survey basics. Improves storm warnings.", { effects: ["warning"] }),
  T("planetaryAstronomy", "Planetary Astronomy", "Astronomy", 30, "Better geological readings from orbit.", { effects: ["explorer+"] }),
  T("stellarAstronomy", "Stellar Astronomy", "Astronomy", 30, "Predicts flares on the hot face.", { effects: ["warning"] }),

  T("medicine", "Medicine", "Biology", 30, "Extends colonist lifespan.", { effects: ["lifespan"] }),
  T("pharmacology", "Pharmacology", "Biology", 45, "Cuts plague antidote work in half.", { parent: "medicine", effects: ["plague-half"] }),
  T("alienPharmacology", "Alien Pharmacology", "Biology", 70, "Antidotes for native pathogens. Plague is cured on detection.", { parent: "pharmacology", effects: ["plague-cure"] }),
  T("genetics", "Genetics", "Biology", 50, "Population health and birth rate.", { parent: "medicine", effects: ["births+"] }),
  T("geneticEngineering", "Genetic Engineering", "Biology", 80, "Designer crops and organisms.", { parent: "genetics", hot: true }),
  T("agriculture2", "Agriculture 2", "Biology", 60, "Third-generation AgriDomes.", { parent: "geneticEngineering", effects: ["tier:agridome:3"] }),
  T("exobiology", "Exobiology", "Biology", 40, "Native microbiology. Lowers plague chance.", { effects: ["plague-chance-"] }),
  T("botany", "Plant Biology (Botany)", "Biology", 25, "Plant growth under artificial light.", {}),
  T("agriculture1", "Agriculture 1", "Biology", 40, "Second-generation AgriDomes.", { parent: "botany", effects: ["tier:agridome:2"] }),
  T("physiology", "Physiology", "Biology", 30, "Adaptation to local gravity.", { effects: ["deaths-"] }),
  T("anatomy", "Anatomy", "Biology", 30, "Better trauma care.", { parent: "physiology", effects: ["deaths-"] }),
  T("comparativePhysiology", "Comparative Physiology", "Biology", 40, "Long-term low-gravity health.", { parent: "physiology", effects: ["lifespan"] }),
  T("embryology", "Embryology", "Biology", 35, "Safer births.", { effects: ["births+"] }),
  T("immunology", "Immunology", "Biology", 35, "Lowers plague chance.", { effects: ["plague-chance-"] }),
  T("entomology", "Entomology", "Biology", 25, "Pollinator management in domes.", { effects: ["food+"] }),
  T("ecology", "Ecology", "Biology", 30, "Closed-loop habitat ecology.", {}),
  T("alienEcology", "Alien Ecology", "Biology", 45, "Native biosphere surveys.", { parent: "ecology" }),
  T("atmosphericEcology", "Atmospheric Ecology", "Biology", 70, "Required for terraforming.", { parent: "alienEcology", effects: ["terraform:atmo"] }),
  T("terrestrialEcology", "Terrestrial Ecology", "Biology", 50, "Soil engineering. Food yield up.", { parent: "alienEcology", effects: ["food+"] }),
  T("marineEcology", "Marine Ecology", "Biology", 50, "Subsurface ice ecology.", { parent: "alienEcology" }),

  T("biochemistry", "Biochemistry", "Chemistry", 30, "Medicine production efficiency.", {}),
  T("physicalChemistry", "Physical Chemistry", "Chemistry", 30, "Foundation for materials work.", {}),
  T("metallurgy", "Metallurgy", "Chemistry", 45, "Mine yield up.", { parent: "physicalChemistry", effects: ["mine+"] }),
  T("materialsProcessing", "Materials Processing", "Chemistry", 60, "Second-generation Smelters.", { parent: "physicalChemistry", effects: ["tier:smelter:2"] }),
  T("quantumChemistry", "Quantum Chemistry", "Chemistry", 70, "Third-generation Laboratories.", { effects: ["tier:lab:3"] }),

  T("meteorology", "Meteorology", "Planetary Sciences", 30, "Storm forecasts reduce damage.", { effects: ["warning"] }),
  T("geography", "Geography", "Planetary Sciences", 20, "Survey mapping.", {}),
  T("geology", "Geology", "Planetary Sciences", 25, "Foundation for mining science.", {}),
  T("terrestrialGeology", "Terrestrial Geology", "Planetary Sciences", 35, "Rock mechanics.", { parent: "geology" }),
  T("tectonics", "Tectonics and Earthquakes", "Planetary Sciences", 45, "Quake damage reduced.", { parent: "terrestrialGeology", effects: ["quake-"] }),
  T("mineralogy", "Mineralogy", "Planetary Sciences", 40, "Explorers find more deposits.", { parent: "terrestrialGeology", effects: ["explorer+"] }),
  T("vulcanology", "Vulcanology", "Planetary Sciences", 50, "Geothermal plants on fumaroles.", { parent: "terrestrialGeology", effects: ["unlock:geothermal"] }),
  T("mineralResources", "Mineral Resources", "Planetary Sciences", 35, "Deposit assessment.", { parent: "geology" }),
  T("terrestrialMining", "Terrestrial Mining", "Planetary Sciences", 40, "Mine yield up.", { parent: "mineralResources", effects: ["mine+"] }),
  T("extraterrestrialMining", "Extraterrestrial Mining", "Planetary Sciences", 60, "Required for a space program.", { parent: "mineralResources", effects: ["space:mining", "mine+"] }),
  T("engineeringGeology", "Engineering Geology (Structural)", "Planetary Sciences", 45, "Faster underground digging.", { parent: "geology", effects: ["dig+"] }),

  T("mathematics", "Mathematics", "Mathematics", 30, "Required for a space program; speeds all research slightly.", { effects: ["space:math", "research+"] }),

  T("ai", "Artificial Intelligence", "Computer Science", 40, "Machine reasoning.", {}),
  T("aiManagers", "AI Managers", "Computer Science", 60, "AI personalities can run secondary colonies.", { parent: "ai", effects: ["ai-managers"] }),
  T("aiPersonality", "AI Personality Problems", "Computer Science", 50, "Stabilizes AI managers.", { parent: "aiManagers", effects: ["ai-stable"] }),
  T("nanotech1", "Nanotechnology 1", "Computer Science", 90, "Nanotechnology Facility.", { parent: "ai", hot: true, effects: ["unlock:nano"] }),
  T("probeIntelligence", "Space Probe Intelligence", "Computer Science", 40, "Smarter satellites.", { parent: "ai" }),
  T("robotics1", "Robotics 1", "Computer Science", 45, "Second-generation Robot Command.", { parent: "ai", effects: ["tier:roboCommand:2"] }),
  T("airbots", "Airbots", "Computer Science", 40, "Airborne robots are never lost in rough terrain.", { parent: "robotics1", effects: ["robot:airbot"] }),
  T("repairbots", "Repairbots", "Computer Science", 40, "Robots that swap dead fuel cells.", { parent: "robotics1", effects: ["robot:repairbot"] }),
  T("humanoidWorkers", "Humanoid Workers", "Computer Science", 60, "Robots that fill labor jobs.", { parent: "robotics1", effects: ["robot:humanoid"] }),
  T("advancedProcessors", "Advanced Processors", "Computer Science", 50, "Second-generation Laboratories.", { effects: ["tier:lab:2"] }),
  T("systemsAnalysis", "Systems Analysis", "Computer Science", 35, "Process auditing. Reveals Ledger discrepancies.", { effects: ["ledger"] }),
  T("efficiency1", "Efficiency Studies 1", "Computer Science", 45, "Second-generation Factories.", { parent: "systemsAnalysis", effects: ["tier:factory:2"] }),
  T("efficiency2", "Efficiency Studies 2", "Computer Science", 70, "Third-generation Factories.", { parent: "efficiency1", effects: ["tier:factory:3"] }),

  T("aerospace", "Aerospace", "Physics", 40, "Flight engineering.", {}),
  T("windTunnels", "Wind Tunnels", "Physics", 40, "Required for a space program.", { parent: "aerospace", effects: ["space:wind"] }),
  T("spacecraftTesting", "Spacecraft Testing and Analysis", "Physics", 60, "Spaceport. Required for a space program.", { parent: "aerospace", effects: ["space:testing", "unlock:spaceport"] }),
  T("orbitalStations", "Orbital Space Stations", "Physics", 70, "Orbital assembly for the starship.", { parent: "aerospace" }),
  T("satellites", "Satellites and Probes", "Physics", 45, "Satellite manufacture.", { parent: "aerospace" }),
  T("meteorsat", "Meteorsat", "Physics", 30, "Meteor warnings.", { parent: "satellites", effects: ["sat:meteorsat"] }),
  T("comsat", "Comsat", "Physics", 30, "Robots keep contact anywhere.", { parent: "satellites", effects: ["sat:comsat"] }),
  T("solarSat", "Solar Power Satellite", "Physics", 50, "Orbital power.", { parent: "satellites", effects: ["sat:solarSat"] }),
  T("geoProbe", "Geological Penetrator Probe", "Physics", 30, "Deep deposit survey.", { parent: "satellites", effects: ["sat:geoProbe"] }),
  T("weathersat", "Weathersat", "Physics", 30, "Storm forecasts.", { parent: "satellites", effects: ["sat:weathersat"] }),
  T("orbitalObserver", "Orbital Observer", "Physics", 35, "Watches the Free Berth colony.", { parent: "satellites", effects: ["sat:observer"] }),
  T("flybyProbe", "Interstellar Flyby Probe", "Physics", 50, "Scout other systems.", { parent: "satellites" }),
  T("ulbiProbe", "ULBI Probe", "Physics", 50, "Long-baseline interferometry.", { parent: "satellites" }),
  T("communications", "Communications", "Physics", 30, "Longer robot range.", { effects: ["comm+"] }),
  T("harshSignals", "Harsh Environment Signals Processing", "Physics", 45, "Signals survive terminator storms. Needed to broadcast the Ledger.", { parent: "communications", effects: ["comm+", "broadcast"] }),
  T("seti", "SETI", "Physics", 60, "Listens beyond the system.", { parent: "communications", effects: ["ledger"] }),
  T("orbitalMechanics", "Orbital Mechanics", "Physics", 50, "Mass Driver. Required for a space program.", { effects: ["space:orbital", "unlock:massDriver"] }),
  T("electricalEngineering", "Electrical Engineering", "Physics", 35, "Power distribution.", {}),
  T("robotics2", "Robotics 2", "Physics", 60, "Fuel cells last longer.", { parent: "electricalEngineering", effects: ["fuel+"] }),
  T("optics", "Optics", "Physics", 25, "Better surveys.", {}),
  T("powerGeneration", "Power Generation", "Physics", 35, "Plant efficiency.", {}),
  T("altPower", "Advanced Alternative Systems", "Physics", 50, "Solar Power Receiver Arrays.", { parent: "powerGeneration", effects: ["unlock:solarReceiver"] }),
  T("propulsion", "Propulsion Systems", "Physics", 40, "Rocketry.", {}),
  T("standardPropulsion", "Standard Propulsion", "Physics", 60, "Required for a space program.", { parent: "propulsion", effects: ["space:propulsion"] }),
  T("asteroidMiner", "Asteroid Miner", "Physics", 70, "Orbital mining runs.", { parent: "propulsion" }),
  T("heavyLifter", "Heavy Lifter", "Physics", 70, "Bigger launches.", { parent: "propulsion" }),
  T("lowOrbitFreighter", "Low Orbit Freighter", "Physics", 60, "Cheaper launches.", { parent: "propulsion" }),
  T("theoreticalPhysics", "Theoretical Physics", "Physics", 40, "Foundations.", {}),
  T("antimatter", "Antimatter", "Physics", 120, "Dangerous fuel research.", { parent: "theoreticalPhysics", hot: true }),
  T("nuclearPhysics", "Nuclear Physics", "Physics", 60, "Reactor safety. Fewer Tokamak accidents.", { parent: "theoreticalPhysics", hot: true, effects: ["tokamak-safe"] }),
  T("plasmaPhysics", "Plasma Physics", "Physics", 70, "Build new Tokamak reactors.", { parent: "theoreticalPhysics", hot: true, effects: ["unlock:tokamak"] }),
  T("superconductivity", "Superconductivity", "Physics", 60, "Monorail power.", { parent: "theoreticalPhysics" }),
  T("quantumMechanics", "Quantum Mechanics", "Physics", 70, "Foundation for nanotechnology.", { parent: "theoreticalPhysics" }),
  T("nanotech2", "Nanotechnology 2", "Physics", 90, "Nanomachine design.", { parent: "quantumMechanics", hot: true }),
  T("nanomachines", "Nanomachines", "Physics", 80, "Working nanomachines.", { parent: "nanotech2", hot: true }),
  T("assembler", "Assembler", "Physics", 80, "Construction 25% faster.", { parent: "nanomachines", effects: ["build+"] }),
  T("replicator", "Replicator", "Physics", 100, "Self-copying machines.", { parent: "nanomachines", hot: true }),
  T("repConstruction", "Replicator–Construction", "Physics", 80, "Construction 25% faster.", { parent: "replicator", effects: ["build+"] }),
  T("repMedical", "Replicator–Medical", "Physics", 80, "Death rate down.", { parent: "replicator", effects: ["deaths-"] }),
  T("repMining", "Replicator–Mining", "Physics", 80, "Mine yield up.", { parent: "replicator", effects: ["mine+"] }),
  T("repTerraforming", "Replicator–Terraforming", "Physics", 120, "Terraforming Facility.", { parent: "replicator", effects: ["terraform:rep"] }),
  T("repFood", "Replicator–Food Production", "Physics", 80, "Food yield up.", { parent: "replicator", effects: ["food+"] }),

  T("economics", "Economics", "Social Sciences", 35, "Better trade rates. Reveals Ledger discrepancies.", { effects: ["trade+", "ledger"] }),
  T("politicalScience", "Political Science", "Social Sciences", 40, "Better trade rates. Needed to publish the Ledger.", { effects: ["trade+", "charter"] }),
  T("psychology", "Psychology", "Social Sciences", 30, "Morale insight.", { effects: ["morale+"] }),
  T("tradeNegotiation", "Trade Negotiation", "Social Sciences", 45, "Better trade rates.", { parent: "psychology", effects: ["trade+"] }),
  T("teaching", "Advanced Teaching Methods", "Social Sciences", 40, "Universities graduate scientists faster.", { parent: "psychology", effects: ["school+"] }),
  T("sociology", "Sociology", "Social Sciences", 30, "Community studies.", {}),
  T("crowdPsychology", "Crowd Psychology", "Social Sciences", 40, "Morale up.", { parent: "sociology", effects: ["morale+"] }),
  T("industrialSociology", "Industrial Sociology", "Social Sciences", 40, "Fewer factory breakdowns.", { parent: "sociology", effects: ["breakdown-"] }),
  T("socialStratification", "Social Stratification", "Social Sciences", 40, "Reveals Ledger discrepancies.", { parent: "sociology", effects: ["ledger"] }),
  T("culturalChange", "Cultural Change", "Social Sciences", 50, "Third-generation Residences.", { parent: "sociology", effects: ["tier:residence:3"] }),
  T("urbanStudies", "Urban Studies", "Social Sciences", 35, "Second-generation Residences.", { effects: ["tier:residence:2"] }),
  T("cityPlanning", "City Planning", "Social Sciences", 50, "Monorail system.", { parent: "urbanStudies", effects: ["unlock:monorail"] }),
  T("policeScience", "Police Science", "Social Sciences", 35, "Police reduce crime more.", { effects: ["police+"] }),

  T("drama", "Drama", "Humanities", 25, "Morale up.", { effects: ["morale+"] }),
  T("fineArts", "Fine Arts", "Humanities", 25, "Morale up.", { effects: ["morale+"] }),
  T("history", "History", "Humanities", 25, "The colony remembers. Reveals Ledger discrepancies.", { effects: ["ledger"] }),
  T("music", "Music", "Humanities", 25, "Morale up.", { effects: ["morale+"] }),
  T("philosophy", "Philosophy", "Humanities", 25, "Morale up.", { effects: ["morale+"] }),
];

export const TOPIC_BY_ID: Record<string, Topic> = Object.fromEntries(TOPICS.map((t) => [t.id, t]));

/** Topics the manual names as prerequisites for building and launching a starship. */
export const SPACE_PROGRAM_KEYS = [
  "space:astrophysics",
  "space:mining",
  "space:orbital",
  "space:propulsion",
  "space:math",
  "space:wind",
  "space:testing",
];

export const FIELDS = [...new Set(TOPICS.map((t) => t.field))];
