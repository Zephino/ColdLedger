/**
 * Original star system for Cold Ledger. Planet fields are what the planet
 * selection screen reports: hostility, gravity, day length, mineral richness,
 * digging depth and disaster mix.
 */
export interface PlanetDef {
  id: string;
  name: string;
  kind: string;
  /** 0 benign .. 3 extreme; raises deaths and lowers morale. */
  hostility: number;
  gravity: number;
  /** Surface share by terrain type. */
  terrain: { clear: number; rough: number; hostile: number; impassable: number };
  /** Mining beacons per 1000 tiles. */
  beacons: number;
  /** Multiplies mine output. */
  richness: number;
  /** Maximum underground levels (manual: up to 4). */
  digDepth: number;
  /** Solar power satellite efficiency. */
  solar: number;
  /** Relative disaster weights. */
  disasters: { meteor: number; quake: number; storm: number; vent: number };
  /** Terraforming speed multiplier. */
  terraform: number;
  desc: string;
  tidallyLocked: boolean;
}

export const STAR_NAME = "Kestrel's Lamp";

export const PLANETS: PlanetDef[] = [
  {
    id: "vigil",
    name: "Vigil",
    kind: "Tidally locked terrestrial",
    hostility: 1,
    gravity: 0.92,
    terrain: { clear: 0.5, rough: 0.28, hostile: 0.14, impassable: 0.08 },
    beacons: 9,
    richness: 1,
    digDepth: 4,
    solar: 1,
    disasters: { meteor: 0.2, quake: 0.25, storm: 0.45, vent: 0.1 },
    terraform: 1,
    desc: "One face burns, one face freezes. The colony belongs in the twilight band, where the terminator storms roll through.",
    tidallyLocked: true,
  },
  {
    id: "ashfall",
    name: "Ashfall",
    kind: "Volcanic inner world",
    hostility: 2,
    gravity: 1.12,
    terrain: { clear: 0.35, rough: 0.33, hostile: 0.22, impassable: 0.1 },
    beacons: 14,
    richness: 1.35,
    digDepth: 3,
    solar: 1.4,
    disasters: { meteor: 0.1, quake: 0.35, storm: 0.15, vent: 0.4 },
    terraform: 0.7,
    desc: "Rich ore and abundant sunlight on a crust that won't stay still.",
    tidallyLocked: false,
  },
  {
    id: "marrow",
    name: "Marrow",
    kind: "Cold ice-crust moon",
    hostility: 1,
    gravity: 0.61,
    terrain: { clear: 0.6, rough: 0.22, hostile: 0.1, impassable: 0.08 },
    beacons: 6,
    richness: 0.85,
    digDepth: 4,
    solar: 0.5,
    disasters: { meteor: 0.55, quake: 0.15, storm: 0.15, vent: 0.15 },
    terraform: 0.85,
    desc: "Flat, quiet and poor in ore. Meteors fall often through the thin sky.",
    tidallyLocked: false,
  },
  {
    id: "cinder",
    name: "Cinder Reach",
    kind: "Super-terrestrial",
    hostility: 3,
    gravity: 1.38,
    terrain: { clear: 0.28, rough: 0.34, hostile: 0.26, impassable: 0.12 },
    beacons: 17,
    richness: 1.6,
    digDepth: 4,
    solar: 1.1,
    disasters: { meteor: 0.2, quake: 0.3, storm: 0.3, vent: 0.2 },
    terraform: 0.5,
    desc: "Heavy, hot and violent. The richest seams in the system for those who survive.",
    tidallyLocked: false,
  },
];

export const PLANET_BY_ID: Record<string, PlanetDef> = Object.fromEntries(PLANETS.map((p) => [p.id, p]));
