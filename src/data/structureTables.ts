// Structure build and operating tables.
// resourceUnits and crew are inferred column meanings; turns, power, workers and
// morale match the reference manual's structure table.

export interface RawBuild {
  resources: string[];
  resourceUnits: number;
  crew: number;
  turns: number;
  field38: number;
}

export interface RawOps {
  resources: string[];
  power: number;
  workers: number;
  morale: number;
}

export const RAW_BUILD: Record<string, RawBuild> = {
  "Unknown": {
    "resources": [],
    "resourceUnits": 0,
    "crew": 0,
    "turns": 0,
    "field38": 0
  },
  "Clear": {
    "resources": [],
    "resourceUnits": 0,
    "crew": 0,
    "turns": 0,
    "field38": 0
  },
  "Rough": {
    "resources": [],
    "resourceUnits": 0,
    "crew": 0,
    "turns": 0,
    "field38": 0
  },
  "Hostile": {
    "resources": [],
    "resourceUnits": 0,
    "crew": 0,
    "turns": 0,
    "field38": 0
  },
  "Hopeless": {
    "resources": [],
    "resourceUnits": 0,
    "crew": 0,
    "turns": 0,
    "field38": 0
  },
  "Dozed": {
    "resources": [],
    "resourceUnits": 0,
    "crew": 0,
    "turns": 0,
    "field38": 0
  },
  "UGEasy": {
    "resources": [],
    "resourceUnits": 0,
    "crew": 0,
    "turns": 0,
    "field38": 0
  },
  "UGDiff": {
    "resources": [],
    "resourceUnits": 0,
    "crew": 0,
    "turns": 0,
    "field38": 0
  },
  "UGImposs": {
    "resources": [],
    "resourceUnits": 0,
    "crew": 0,
    "turns": 0,
    "field38": 0
  },
  "UGDozed": {
    "resources": [],
    "resourceUnits": 0,
    "crew": 0,
    "turns": 0,
    "field38": 0
  },
  "Seed": {
    "resources": [],
    "resourceUnits": 0,
    "crew": 0,
    "turns": 0,
    "field38": 10
  },
  "SeedCommand": {
    "resources": [],
    "resourceUnits": 0,
    "crew": 0,
    "turns": 10,
    "field38": 10
  },
  "SeedSmelter": {
    "resources": [],
    "resourceUnits": 0,
    "crew": 0,
    "turns": 6,
    "field38": 10
  },
  "SeedPower": {
    "resources": [],
    "resourceUnits": 0,
    "crew": 0,
    "turns": 4,
    "field38": 10
  },
  "SeedFact": {
    "resources": [],
    "resourceUnits": 0,
    "crew": 0,
    "turns": 8,
    "field38": 10
  },
  "SpacePort": {
    "resources": [
      "MetalA",
      "MetalD",
      "MinA",
      "MinB",
      "MinC"
    ],
    "resourceUnits": 6,
    "crew": 4,
    "turns": 7,
    "field38": 10
  },
  "DisMine": {
    "resources": [
      "MetalA",
      "MinA"
    ],
    "resourceUnits": 6,
    "crew": 2,
    "turns": 7,
    "field38": 0
  },
  "MassDrv": {
    "resources": [
      "MetalA",
      "MetalB",
      "MetalC",
      "MetalD",
      "PrecA",
      "PrecB",
      "MinA",
      "MinB",
      "MinC",
      "FusionB"
    ],
    "resourceUnits": 6,
    "crew": 4,
    "turns": 9,
    "field38": 5
  },
  "SolrPwrRecvr": {
    "resources": [
      "MetalA",
      "MetalB",
      "MetalD",
      "PrecA",
      "PrecB",
      "MinA"
    ],
    "resourceUnits": 2,
    "crew": 2,
    "turns": 4,
    "field38": 7
  },
  "MShipTokamak": {
    "resources": [],
    "resourceUnits": 1,
    "crew": 2,
    "turns": 2,
    "field38": 10
  },
  "Tokamak": {
    "resources": [
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
      "FusionC"
    ],
    "resourceUnits": 1,
    "crew": 2,
    "turns": 9,
    "field38": 10
  },
  "Tokamak2": {
    "resources": [
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
      "FusionC"
    ],
    "resourceUnits": 1,
    "crew": 2,
    "turns": 9,
    "field38": 10
  },
  "LMono": {
    "resources": [
      "MetalA",
      "MetalB",
      "MetalC",
      "MetalD",
      "MinA",
      "MinB",
      "MinC"
    ],
    "resourceUnits": 5,
    "crew": 2,
    "turns": 7,
    "field38": 2
  },
  "RMono": {
    "resources": [
      "MetalA",
      "MetalB",
      "MetalC",
      "MetalD",
      "MinA",
      "MinB",
      "MinC"
    ],
    "resourceUnits": 5,
    "crew": 2,
    "turns": 7,
    "field38": 2
  },
  "XMono": {
    "resources": [
      "MetalA",
      "MetalB",
      "MetalC",
      "MetalD",
      "MinA",
      "MinB",
      "MinC"
    ],
    "resourceUnits": 5,
    "crew": 2,
    "turns": 12,
    "field38": 3
  },
  "LMonoTrain": {
    "resources": [
      "MetalA",
      "MetalB",
      "MetalC",
      "MetalD",
      "MinA",
      "MinB",
      "MinC"
    ],
    "resourceUnits": 5,
    "crew": 2,
    "turns": 7,
    "field38": 2
  },
  "RMonoTrain": {
    "resources": [
      "MetalA",
      "MetalB",
      "MetalC",
      "MetalD",
      "MinA",
      "MinB",
      "MinC"
    ],
    "resourceUnits": 5,
    "crew": 2,
    "turns": 7,
    "field38": 2
  },
  "AgriDome": {
    "resources": [
      "MetalA",
      "MinA",
      "MinB",
      "MinC"
    ],
    "resourceUnits": 3,
    "crew": 2,
    "turns": 5,
    "field38": 5
  },
  "AgriDome2": {
    "resources": [
      "MetalA",
      "MinA",
      "MinB",
      "MinC"
    ],
    "resourceUnits": 3,
    "crew": 2,
    "turns": 5,
    "field38": 5
  },
  "AgriDome3": {
    "resources": [
      "MetalA",
      "MinA",
      "MinB",
      "MinC"
    ],
    "resourceUnits": 3,
    "crew": 2,
    "turns": 5,
    "field38": 5
  },
  "Fact": {
    "resources": [
      "MetalA",
      "MetalB",
      "MetalC",
      "MetalD",
      "PrecA",
      "PrecB",
      "MinA",
      "MinB",
      "MinC",
      "FusionA"
    ],
    "resourceUnits": 6,
    "crew": 2,
    "turns": 6,
    "field38": 8
  },
  "Fact2": {
    "resources": [
      "MetalA",
      "MetalB",
      "MetalC",
      "MetalD",
      "PrecA",
      "PrecB",
      "MinA",
      "MinB",
      "MinC",
      "FusionA"
    ],
    "resourceUnits": 6,
    "crew": 2,
    "turns": 6,
    "field38": 8
  },
  "Fact3": {
    "resources": [
      "MetalA",
      "MetalB",
      "MetalC",
      "MetalD",
      "PrecA",
      "PrecB",
      "MinA",
      "MinB",
      "MinC",
      "FusionA"
    ],
    "resourceUnits": 6,
    "crew": 2,
    "turns": 6,
    "field38": 8
  },
  "Trade": {
    "resources": [
      "MetalA",
      "MetalC",
      "PrecA",
      "MinA",
      "MinB"
    ],
    "resourceUnits": 1,
    "crew": 2,
    "turns": 2,
    "field38": 1
  },
  "Spew": {
    "resources": [
      "MetalA",
      "MetalC",
      "MetalD",
      "MinA",
      "MinB",
      "MinC"
    ],
    "resourceUnits": 4,
    "crew": 3,
    "turns": 8,
    "field38": 7
  },
  "Spew2": {
    "resources": [
      "MetalA",
      "MetalC",
      "MetalD",
      "MinA",
      "MinB",
      "MinC"
    ],
    "resourceUnits": 4,
    "crew": 3,
    "turns": 8,
    "field38": 7
  },
  "Spew3": {
    "resources": [
      "MetalA",
      "MetalC",
      "MetalD",
      "MinA",
      "MinB",
      "MinC"
    ],
    "resourceUnits": 4,
    "crew": 3,
    "turns": 8,
    "field38": 7
  },
  "CommTwr": {
    "resources": [
      "MetalA",
      "MetalC",
      "PrecB",
      "MinA"
    ],
    "resourceUnits": 5,
    "crew": 2,
    "turns": 2,
    "field38": 3
  },
  "CommTwr2": {
    "resources": [
      "MetalA",
      "MetalC",
      "PrecB",
      "MinA"
    ],
    "resourceUnits": 5,
    "crew": 2,
    "turns": 2,
    "field38": 3
  },
  "CommTwr3": {
    "resources": [
      "MetalA",
      "MetalC",
      "PrecB",
      "MinA"
    ],
    "resourceUnits": 5,
    "crew": 2,
    "turns": 2,
    "field38": 3
  },
  "HotLab": {
    "resources": [
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
      "FusionB"
    ],
    "resourceUnits": 5,
    "crew": 3,
    "turns": 5,
    "field38": 5
  },
  "HotLab2": {
    "resources": [
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
      "FusionB"
    ],
    "resourceUnits": 5,
    "crew": 3,
    "turns": 5,
    "field38": 5
  },
  "Chap": {
    "resources": [
      "MetalA",
      "MetalC",
      "MetalD",
      "PrecA",
      "MinA",
      "MinC"
    ],
    "resourceUnits": 6,
    "crew": 4,
    "turns": 6,
    "field38": 8
  },
  "Chap2": {
    "resources": [
      "MetalA",
      "MetalC",
      "MetalD",
      "PrecA",
      "MinA",
      "MinC"
    ],
    "resourceUnits": 6,
    "crew": 4,
    "turns": 6,
    "field38": 8
  },
  "Nano": {
    "resources": [
      "MetalA",
      "MetalB",
      "MetalD",
      "PrecA",
      "PrecB",
      "MinA",
      "MinB",
      "MinC"
    ],
    "resourceUnits": 4,
    "crew": 3,
    "turns": 5,
    "field38": 5
  },
  "TerraForm": {
    "resources": [
      "MetalA",
      "MetalB",
      "MetalC",
      "MetalD",
      "PrecA",
      "PrecB",
      "MinA",
      "MinB",
      "MinC"
    ],
    "resourceUnits": 6,
    "crew": 4,
    "turns": 9,
    "field38": 9
  },
  "TerraForm2": {
    "resources": [
      "MetalA",
      "MetalB",
      "MetalC",
      "MetalD",
      "PrecA",
      "PrecB",
      "MinA",
      "MinB",
      "MinC"
    ],
    "resourceUnits": 6,
    "crew": 4,
    "turns": 9,
    "field38": 9
  },
  "Dirt": {
    "resources": [
      "MetalA",
      "MetalB",
      "MetalC",
      "MetalD",
      "PrecA",
      "MinA",
      "MinB"
    ],
    "resourceUnits": 5,
    "crew": 3,
    "turns": 5,
    "field38": 8
  },
  "Dirt2": {
    "resources": [
      "MetalA",
      "MetalB",
      "MetalC",
      "MetalD",
      "PrecA",
      "MinA",
      "MinB"
    ],
    "resourceUnits": 5,
    "crew": 3,
    "turns": 5,
    "field38": 8
  },
  "Cops": {
    "resources": [
      "MetalA",
      "MetalB",
      "MetalD",
      "MinA"
    ],
    "resourceUnits": 4,
    "crew": 3,
    "turns": 4,
    "field38": 3
  },
  "Cops2": {
    "resources": [
      "MetalA",
      "MetalB",
      "MetalD",
      "MinA"
    ],
    "resourceUnits": 4,
    "crew": 3,
    "turns": 4,
    "field38": 3
  },
  "ActiveMine": {
    "resources": [
      "MetalA",
      "MinA"
    ],
    "resourceUnits": 6,
    "crew": 2,
    "turns": 7,
    "field38": 5
  },
  "ActiveMine2": {
    "resources": [],
    "resourceUnits": 7,
    "crew": 5,
    "turns": 0,
    "field38": 5
  },
  "Smelter": {
    "resources": [
      "MetalA",
      "MetalB",
      "MetalC",
      "MetalD",
      "MinA",
      "MinB",
      "MinC"
    ],
    "resourceUnits": 6,
    "crew": 4,
    "turns": 7,
    "field38": 8
  },
  "Smelter2": {
    "resources": [
      "MetalA",
      "MetalB",
      "MetalC",
      "MetalD",
      "MinA",
      "MinB",
      "MinC"
    ],
    "resourceUnits": 6,
    "crew": 4,
    "turns": 7,
    "field38": 8
  },
  "Command": {
    "resources": [
      "MetalA",
      "MetalC",
      "PrecA",
      "MinA",
      "MinB"
    ],
    "resourceUnits": 0,
    "crew": 2,
    "turns": 3,
    "field38": 0
  },
  "RoboCmd": {
    "resources": [
      "MetalA",
      "MetalC",
      "PrecA",
      "MinA",
      "MinB"
    ],
    "resourceUnits": 4,
    "crew": 2,
    "turns": 3,
    "field38": 7
  },
  "RoboCmd2": {
    "resources": [
      "MetalA",
      "MetalC",
      "PrecA",
      "MinA",
      "MinB"
    ],
    "resourceUnits": 4,
    "crew": 2,
    "turns": 3,
    "field38": 7
  },
  "Warehouse": {
    "resources": [
      "MetalA",
      "MetalD",
      "MinA"
    ],
    "resourceUnits": 2,
    "crew": 2,
    "turns": 2,
    "field38": 3
  },
  "Warehouse2": {
    "resources": [
      "MetalA",
      "MetalD",
      "MinA"
    ],
    "resourceUnits": 2,
    "crew": 2,
    "turns": 2,
    "field38": 3
  },
  "Storage": {
    "resources": [
      "MetalA",
      "MetalB"
    ],
    "resourceUnits": 2,
    "crew": 1,
    "turns": 2,
    "field38": 2
  },
  "Storage2": {
    "resources": [
      "MetalA",
      "MetalB"
    ],
    "resourceUnits": 2,
    "crew": 1,
    "turns": 2,
    "field38": 2
  },
  "ColonistLander": {
    "resources": [],
    "resourceUnits": 0,
    "crew": 0,
    "turns": 0,
    "field38": 1
  },
  "MonoStation": {
    "resources": [
      "MetalA",
      "MetalB",
      "MetalC",
      "MetalD",
      "MinA",
      "MinB",
      "MinC"
    ],
    "resourceUnits": 4,
    "crew": 2,
    "turns": 6,
    "field38": 2
  },
  "MonoXFormer": {
    "resources": [
      "MetalA",
      "MetalB",
      "MetalC",
      "MetalD",
      "MinA",
      "MinB",
      "MinC"
    ],
    "resourceUnits": 4,
    "crew": 1,
    "turns": 6,
    "field38": 2
  },
  "CargoLander": {
    "resources": [],
    "resourceUnits": 0,
    "crew": 0,
    "turns": 0,
    "field38": 1
  },
  "Const": {
    "resources": [],
    "resourceUnits": 0,
    "crew": 0,
    "turns": 0,
    "field38": 0
  },
  "LRoadConst": {
    "resources": [],
    "resourceUnits": 0,
    "crew": 0,
    "turns": 0,
    "field38": 0
  },
  "RRoadConst": {
    "resources": [],
    "resourceUnits": 0,
    "crew": 0,
    "turns": 0,
    "field38": 0
  },
  "XRoadConst": {
    "resources": [],
    "resourceUnits": 0,
    "crew": 0,
    "turns": 0,
    "field38": 0
  },
  "ExpDigConst": {
    "resources": [],
    "resourceUnits": 0,
    "crew": 0,
    "turns": 0,
    "field38": 0
  },
  "Core": {
    "resources": [],
    "resourceUnits": 0,
    "crew": 0,
    "turns": 0,
    "field38": 1
  },
  "Destroyed": {
    "resources": [],
    "resourceUnits": 0,
    "crew": 0,
    "turns": 0,
    "field38": 0
  },
  "Destroyed2": {
    "resources": [],
    "resourceUnits": 0,
    "crew": 0,
    "turns": 0,
    "field38": 0
  },
  "Destroyed3": {
    "resources": [],
    "resourceUnits": 0,
    "crew": 0,
    "turns": 0,
    "field38": 0
  },
  "LanderConst": {
    "resources": [],
    "resourceUnits": 0,
    "crew": 0,
    "turns": 0,
    "field38": 0
  },
  "LRoad": {
    "resources": [
      "MetalA"
    ],
    "resourceUnits": 0,
    "crew": 6,
    "turns": 2,
    "field38": 0
  },
  "RRoad": {
    "resources": [
      "MetalA"
    ],
    "resourceUnits": 0,
    "crew": 6,
    "turns": 2,
    "field38": 0
  },
  "XRoad": {
    "resources": [
      "MetalA"
    ],
    "resourceUnits": 0,
    "crew": 6,
    "turns": 2,
    "field38": 0
  },
  "UGResident": {
    "resources": [
      "MetalA",
      "MetalB",
      "MinA",
      "MinC"
    ],
    "resourceUnits": 3,
    "crew": 2,
    "turns": 3,
    "field38": 2
  },
  "UGResident2": {
    "resources": [
      "MetalA",
      "MetalB",
      "MinA",
      "MinC"
    ],
    "resourceUnits": 3,
    "crew": 2,
    "turns": 3,
    "field38": 2
  },
  "UGResident3": {
    "resources": [
      "MetalA",
      "MetalB",
      "MinA",
      "MinC"
    ],
    "resourceUnits": 3,
    "crew": 2,
    "turns": 3,
    "field38": 2
  },
  "UGRec": {
    "resources": [
      "MetalA",
      "MetalC",
      "MetalD",
      "PrecA",
      "MinA",
      "MinB",
      "MinC"
    ],
    "resourceUnits": 2,
    "crew": 2,
    "turns": 4,
    "field38": 2
  },
  "UGRec2": {
    "resources": [
      "MetalA",
      "MetalC",
      "MetalD",
      "PrecA",
      "MinA",
      "MinB",
      "MinC"
    ],
    "resourceUnits": 2,
    "crew": 2,
    "turns": 4,
    "field38": 2
  },
  "UGUniv": {
    "resources": [
      "MetalA",
      "MetalB",
      "MetalC",
      "PrecB",
      "MinA",
      "MinB",
      "MinC"
    ],
    "resourceUnits": 3,
    "crew": 2,
    "turns": 4,
    "field38": 2
  },
  "UGUniv2": {
    "resources": [
      "MetalA",
      "MetalB",
      "MetalC",
      "PrecB",
      "MinA",
      "MinB",
      "MinC"
    ],
    "resourceUnits": 3,
    "crew": 2,
    "turns": 4,
    "field38": 2
  },
  "UGUniv3": {
    "resources": [
      "MetalA",
      "MetalB",
      "MetalC",
      "PrecB",
      "MinA",
      "MinB",
      "MinC"
    ],
    "resourceUnits": 3,
    "crew": 2,
    "turns": 4,
    "field38": 2
  },
  "UGCommercial": {
    "resources": [
      "MetalA",
      "MetalB",
      "MetalD",
      "MinA"
    ],
    "resourceUnits": 4,
    "crew": 2,
    "turns": 3,
    "field38": 2
  },
  "UGCommercial2": {
    "resources": [
      "MetalA",
      "MetalB",
      "MetalD",
      "MinA"
    ],
    "resourceUnits": 4,
    "crew": 2,
    "turns": 3,
    "field38": 2
  },
  "UGCommercial3": {
    "resources": [
      "MetalA",
      "MetalB",
      "MetalD",
      "MinA"
    ],
    "resourceUnits": 4,
    "crew": 2,
    "turns": 3,
    "field38": 2
  },
  "UGPark": {
    "resources": [
      "MetalA",
      "MinA",
      "MinB",
      "MinC"
    ],
    "resourceUnits": 2,
    "crew": 1,
    "turns": 3,
    "field38": 1
  },
  "UGFact": {
    "resources": [
      "MetalA",
      "PrecA",
      "PrecB",
      "MinA",
      "MinB",
      "MinC"
    ],
    "resourceUnits": 4,
    "crew": 3,
    "turns": 4,
    "field38": 4
  },
  "UGFact2": {
    "resources": [
      "MetalA",
      "PrecA",
      "PrecB",
      "MinA",
      "MinB",
      "MinC"
    ],
    "resourceUnits": 4,
    "crew": 3,
    "turns": 4,
    "field38": 4
  },
  "UGLab": {
    "resources": [
      "MetalA",
      "MetalB",
      "MetalC",
      "MetalD",
      "PrecA",
      "PrecB",
      "MinA",
      "MinB",
      "MinC"
    ],
    "resourceUnits": 4,
    "crew": 3,
    "turns": 4,
    "field38": 2
  },
  "UGLab2": {
    "resources": [
      "MetalA",
      "MetalB",
      "MetalC",
      "MetalD",
      "PrecA",
      "PrecB",
      "MinA",
      "MinB",
      "MinC"
    ],
    "resourceUnits": 4,
    "crew": 3,
    "turns": 4,
    "field38": 2
  },
  "UGLab3": {
    "resources": [
      "MetalA",
      "MetalB",
      "MetalC",
      "MetalD",
      "PrecA",
      "PrecB",
      "MinA",
      "MinB",
      "MinC"
    ],
    "resourceUnits": 4,
    "crew": 3,
    "turns": 4,
    "field38": 2
  },
  "UGMine": {
    "resources": [],
    "resourceUnits": 0,
    "crew": 0,
    "turns": 0,
    "field38": 1
  },
  "UGMine2": {
    "resources": [],
    "resourceUnits": 0,
    "crew": 0,
    "turns": 0,
    "field38": 1
  },
  "UGTokamak": {
    "resources": [],
    "resourceUnits": 0,
    "crew": 0,
    "turns": 0,
    "field38": 1
  },
  "UGTokamak2": {
    "resources": [],
    "resourceUnits": 0,
    "crew": 0,
    "turns": 0,
    "field38": 1
  },
  "UGSpacePort": {
    "resources": [
      "MetalA",
      "MetalD",
      "MinA"
    ],
    "resourceUnits": 2,
    "crew": 2,
    "turns": 2,
    "field38": 3
  },
  "UGRed": {
    "resources": [
      "MetalA",
      "MetalD",
      "PrecA"
    ],
    "resourceUnits": 3,
    "crew": 2,
    "turns": 4,
    "field38": 0
  },
  "UGAdmin": {
    "resources": [
      "MetalA",
      "MetalC",
      "PrecA",
      "MinA",
      "MinB"
    ],
    "resourceUnits": 2,
    "crew": 2,
    "turns": 3,
    "field38": 2
  },
  "UGAdmin2": {
    "resources": [
      "MinA",
      "MinB"
    ],
    "resourceUnits": 2,
    "crew": 2,
    "turns": 3,
    "field38": 2
  },
  "UGMed": {
    "resources": [
      "MetalA",
      "MetalB",
      "MetalC",
      "PrecB",
      "MinA",
      "MinB",
      "MinC"
    ],
    "resourceUnits": 3,
    "crew": 2,
    "turns": 4,
    "field38": 4
  },
  "UGMed2": {
    "resources": [
      "MetalA",
      "MetalB",
      "MetalC",
      "PrecB",
      "MinA",
      "MinB",
      "MinC"
    ],
    "resourceUnits": 3,
    "crew": 2,
    "turns": 4,
    "field38": 4
  },
  "UGCore": {
    "resources": [],
    "resourceUnits": 0,
    "crew": 0,
    "turns": 0,
    "field38": 1
  },
  "UGConst": {
    "resources": [],
    "resourceUnits": 0,
    "crew": 0,
    "turns": 0,
    "field38": 0
  },
  "UGCops": {
    "resources": [
      "MetalA",
      "MetalB",
      "MetalD",
      "MinA"
    ],
    "resourceUnits": 4,
    "crew": 3,
    "turns": 3,
    "field38": 3
  },
  "UGCops2": {
    "resources": [
      "MetalA",
      "MetalB",
      "MetalD",
      "MinA"
    ],
    "resourceUnits": 4,
    "crew": 3,
    "turns": 3,
    "field38": 3
  },
  "UGGeoTherm": {
    "resources": [
      "MetalA",
      "MetalB",
      "MetalC",
      "MetalD",
      "MinA",
      "MinB",
      "MinC"
    ],
    "resourceUnits": 3,
    "crew": 2,
    "turns": 9,
    "field38": 10
  },
  "UGTrade": {
    "resources": [],
    "resourceUnits": 0,
    "crew": 0,
    "turns": 2,
    "field38": 1
  },
  "UGDestroyed": {
    "resources": [],
    "resourceUnits": 0,
    "crew": 0,
    "turns": 0,
    "field38": 0
  },
  "UGDestroyed2": {
    "resources": [],
    "resourceUnits": 0,
    "crew": 0,
    "turns": 0,
    "field38": 0
  },
  "UGDestroyed3": {
    "resources": [],
    "resourceUnits": 0,
    "crew": 0,
    "turns": 0,
    "field38": 0
  },
  "RoboDoze": {
    "resources": [],
    "resourceUnits": 0,
    "crew": 0,
    "turns": 0,
    "field38": 0
  },
  "RoboDig": {
    "resources": [],
    "resourceUnits": 0,
    "crew": 0,
    "turns": 0,
    "field38": 0
  },
  "RoboMine": {
    "resources": [],
    "resourceUnits": 0,
    "crew": 0,
    "turns": 0,
    "field38": 0
  },
  "RoboExplr": {
    "resources": [],
    "resourceUnits": 0,
    "crew": 0,
    "turns": 0,
    "field38": 0
  },
  "UGRoboDoze": {
    "resources": [],
    "resourceUnits": 0,
    "crew": 0,
    "turns": 0,
    "field38": 0
  },
  "UGRoboDig": {
    "resources": [],
    "resourceUnits": 0,
    "crew": 0,
    "turns": 0,
    "field38": 0
  },
  "UGTargetDig": {
    "resources": [],
    "resourceUnits": 0,
    "crew": 0,
    "turns": 0,
    "field38": 0
  },
  "XPipe": {
    "resources": [
      "MetalA"
    ],
    "resourceUnits": 1,
    "crew": 1,
    "turns": 1,
    "field38": 1
  },
  "LPipe": {
    "resources": [
      "MetalA"
    ],
    "resourceUnits": 1,
    "crew": 1,
    "turns": 1,
    "field38": 1
  },
  "RPipe": {
    "resources": [
      "MetalA"
    ],
    "resourceUnits": 1,
    "crew": 1,
    "turns": 1,
    "field38": 1
  },
  "UGRPipe": {
    "resources": [
      "MetalA"
    ],
    "resourceUnits": 1,
    "crew": 1,
    "turns": 1,
    "field38": 1
  },
  "UGLPipe": {
    "resources": [
      "MetalA"
    ],
    "resourceUnits": 1,
    "crew": 1,
    "turns": 1,
    "field38": 1
  },
  "UGXPipe": {
    "resources": [
      "MetalA"
    ],
    "resourceUnits": 1,
    "crew": 1,
    "turns": 1,
    "field38": 1
  },
  "Colonists": {
    "resources": [],
    "resourceUnits": 0,
    "crew": 0,
    "turns": 0,
    "field38": 0
  },
  "Food": {
    "resources": [],
    "resourceUnits": 0,
    "crew": 0,
    "turns": 0,
    "field38": 0
  },
  "LifeSupport": {
    "resources": [],
    "resourceUnits": 0,
    "crew": 0,
    "turns": 0,
    "field38": 0
  },
  "SolarSat": {
    "resources": [],
    "resourceUnits": 0,
    "crew": 0,
    "turns": 0,
    "field38": 0
  },
  "GeoProbe": {
    "resources": [],
    "resourceUnits": 0,
    "crew": 0,
    "turns": 0,
    "field38": 0
  },
  "WeatherSat": {
    "resources": [],
    "resourceUnits": 0,
    "crew": 0,
    "turns": 0,
    "field38": 0
  },
  "InterStellarProbe": {
    "resources": [],
    "resourceUnits": 0,
    "crew": 0,
    "turns": 0,
    "field38": 0
  },
  "CommSat": {
    "resources": [],
    "resourceUnits": 0,
    "crew": 0,
    "turns": 0,
    "field38": 0
  },
  "OrbitObserve": {
    "resources": [],
    "resourceUnits": 0,
    "crew": 0,
    "turns": 0,
    "field38": 0
  },
  "ULBIProbe": {
    "resources": [],
    "resourceUnits": 0,
    "crew": 0,
    "turns": 0,
    "field38": 0
  }
};

export const RAW_OPS: Record<string, RawOps> = {
  "Unknown": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "Clear": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "Rough": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "Hostile": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "Hopeless": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "Dozed": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "UGEasy": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "UGDiff": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "UGImposs": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "UGDozed": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "Seed": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "SeedCommand": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "SeedSmelter": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "SeedPower": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "SeedFact": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "SpacePort": {
    "resources": [
      "PrecA",
      "MinA",
      "FusionA"
    ],
    "power": 5,
    "workers": 4,
    "morale": 0
  },
  "DisMine": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "MassDrv": {
    "resources": [
      "MetalA",
      "MetalB",
      "MetalC",
      "MetalD",
      "PrecA"
    ],
    "power": 5,
    "workers": 4,
    "morale": 0
  },
  "SolrPwrRecvr": {
    "resources": [],
    "power": 0,
    "workers": 1,
    "morale": 0
  },
  "MShipTokamak": {
    "resources": [
      "FusionA",
      "FusionB",
      "FusionC"
    ],
    "power": 0,
    "workers": 1,
    "morale": 0
  },
  "Tokamak": {
    "resources": [
      "FusionA",
      "FusionB",
      "FusionC"
    ],
    "power": 0,
    "workers": 1,
    "morale": 0
  },
  "Tokamak2": {
    "resources": [
      "FusionA",
      "FusionB",
      "FusionC"
    ],
    "power": 0,
    "workers": 1,
    "morale": 0
  },
  "LMono": {
    "resources": [],
    "power": 4,
    "workers": 1,
    "morale": 0
  },
  "RMono": {
    "resources": [],
    "power": 4,
    "workers": 1,
    "morale": 0
  },
  "XMono": {
    "resources": [],
    "power": 4,
    "workers": 1,
    "morale": 0
  },
  "LMonoTrain": {
    "resources": [],
    "power": 4,
    "workers": 1,
    "morale": 0
  },
  "RMonoTrain": {
    "resources": [],
    "power": 4,
    "workers": 1,
    "morale": 0
  },
  "AgriDome": {
    "resources": [
      "MinA",
      "MinB",
      "MinC"
    ],
    "power": 2,
    "workers": 1,
    "morale": 1
  },
  "AgriDome2": {
    "resources": [
      "MinA",
      "MinB",
      "MinC"
    ],
    "power": 2,
    "workers": 1,
    "morale": 1
  },
  "AgriDome3": {
    "resources": [
      "MinA",
      "MinB",
      "MinC"
    ],
    "power": 2,
    "workers": 1,
    "morale": 1
  },
  "Fact": {
    "resources": [
      "MetalA",
      "MetalB",
      "MetalC",
      "MetalD",
      "PrecA",
      "PrecB",
      "MinA",
      "MinB",
      "MinC",
      "FusionA"
    ],
    "power": 5,
    "workers": 1,
    "morale": 0
  },
  "Fact2": {
    "resources": [
      "MetalA",
      "MetalB",
      "MetalC",
      "MetalD",
      "PrecA",
      "PrecB",
      "MinA",
      "MinB",
      "MinC",
      "FusionA"
    ],
    "power": 5,
    "workers": 1,
    "morale": 0
  },
  "Fact3": {
    "resources": [
      "MetalA",
      "MetalB",
      "MetalC",
      "MetalD",
      "PrecA",
      "PrecB",
      "MinA",
      "MinB",
      "MinC",
      "FusionA"
    ],
    "power": 5,
    "workers": 1,
    "morale": 0
  },
  "Trade": {
    "resources": [],
    "power": 1,
    "workers": 1,
    "morale": 0
  },
  "Spew": {
    "resources": [
      "MinA",
      "MinB",
      "MinC"
    ],
    "power": 3,
    "workers": 2,
    "morale": 1
  },
  "Spew2": {
    "resources": [
      "MinA",
      "MinB",
      "MinC"
    ],
    "power": 3,
    "workers": 2,
    "morale": 1
  },
  "Spew3": {
    "resources": [
      "MinA",
      "MinB",
      "MinC"
    ],
    "power": 3,
    "workers": 2,
    "morale": 1
  },
  "CommTwr": {
    "resources": [],
    "power": 4,
    "workers": 1,
    "morale": 0
  },
  "CommTwr2": {
    "resources": [],
    "power": 4,
    "workers": 1,
    "morale": 0
  },
  "CommTwr3": {
    "resources": [],
    "power": 4,
    "workers": 1,
    "morale": 0
  },
  "HotLab": {
    "resources": [
      "MetalA",
      "MetalB",
      "PrecA",
      "PrecB",
      "MinA",
      "MinB",
      "MinC"
    ],
    "power": 4,
    "workers": 2,
    "morale": -1
  },
  "HotLab2": {
    "resources": [
      "MetalA",
      "MetalB",
      "PrecA",
      "PrecB",
      "MinA",
      "MinB",
      "MinC"
    ],
    "power": 4,
    "workers": 2,
    "morale": -1
  },
  "Chap": {
    "resources": [
      "PrecA",
      "MinA",
      "MinC"
    ],
    "power": 5,
    "workers": 4,
    "morale": 0
  },
  "Chap2": {
    "resources": [
      "PrecA",
      "MinA",
      "MinC"
    ],
    "power": 5,
    "workers": 4,
    "morale": 0
  },
  "Nano": {
    "resources": [],
    "power": 3,
    "workers": 2,
    "morale": 1
  },
  "TerraForm": {
    "resources": [
      "MinA",
      "MinB",
      "MinC"
    ],
    "power": 5,
    "workers": 4,
    "morale": 5
  },
  "TerraForm2": {
    "resources": [
      "MinA",
      "MinB",
      "MinC"
    ],
    "power": 5,
    "workers": 4,
    "morale": 5
  },
  "Dirt": {
    "resources": [
      "MetalA",
      "MetalB",
      "MetalC",
      "MetalD",
      "PrecA",
      "MinA",
      "MinB"
    ],
    "power": 4,
    "workers": 2,
    "morale": 1
  },
  "Dirt2": {
    "resources": [
      "MetalA",
      "MetalB",
      "MetalC",
      "MetalD",
      "PrecA",
      "MinA",
      "MinB"
    ],
    "power": 4,
    "workers": 2,
    "morale": 1
  },
  "Cops": {
    "resources": [
      "MetalA",
      "MetalB",
      "MinA"
    ],
    "power": 3,
    "workers": 2,
    "morale": 0
  },
  "Cops2": {
    "resources": [
      "MetalA",
      "MetalB",
      "MinA"
    ],
    "power": 3,
    "workers": 2,
    "morale": 0
  },
  "ActiveMine": {
    "resources": [],
    "power": 5,
    "workers": 1,
    "morale": 0
  },
  "ActiveMine2": {
    "resources": [],
    "power": 5,
    "workers": 1,
    "morale": 0
  },
  "Smelter": {
    "resources": [
      "MetalA",
      "MetalB",
      "MetalC",
      "MetalD",
      "MinA",
      "MinB",
      "MinC"
    ],
    "power": 5,
    "workers": 3,
    "morale": 0
  },
  "Smelter2": {
    "resources": [
      "MetalA",
      "MetalB",
      "MetalC",
      "MetalD",
      "MinA",
      "MinB",
      "MinC"
    ],
    "power": 5,
    "workers": 3,
    "morale": 0
  },
  "Command": {
    "resources": [],
    "power": 0,
    "workers": 1,
    "morale": 0
  },
  "RoboCmd": {
    "resources": [],
    "power": 3,
    "workers": 1,
    "morale": 0
  },
  "RoboCmd2": {
    "resources": [],
    "power": 3,
    "workers": 1,
    "morale": 0
  },
  "Warehouse": {
    "resources": [],
    "power": 1,
    "workers": 1,
    "morale": 0
  },
  "Warehouse2": {
    "resources": [],
    "power": 1,
    "workers": 1,
    "morale": 0
  },
  "Storage": {
    "resources": [],
    "power": 1,
    "workers": 0,
    "morale": 0
  },
  "Storage2": {
    "resources": [],
    "power": 1,
    "workers": 0,
    "morale": 0
  },
  "ColonistLander": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "MonoStation": {
    "resources": [],
    "power": 3,
    "workers": 1,
    "morale": 0
  },
  "MonoXFormer": {
    "resources": [],
    "power": 1,
    "workers": 1,
    "morale": 0
  },
  "CargoLander": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "Const": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "LRoadConst": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "RRoadConst": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "XRoadConst": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "ExpDigConst": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "Core": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "Destroyed": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "Destroyed2": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "Destroyed3": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "LanderConst": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "LRoad": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "RRoad": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "XRoad": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "UGResident": {
    "resources": [],
    "power": 2,
    "workers": 1,
    "morale": 0
  },
  "UGResident2": {
    "resources": [],
    "power": 2,
    "workers": 1,
    "morale": 0
  },
  "UGResident3": {
    "resources": [],
    "power": 2,
    "workers": 1,
    "morale": 0
  },
  "UGRec": {
    "resources": [],
    "power": 1,
    "workers": 1,
    "morale": 1
  },
  "UGRec2": {
    "resources": [],
    "power": 1,
    "workers": 1,
    "morale": 1
  },
  "UGUniv": {
    "resources": [
      "PrecB"
    ],
    "power": 2,
    "workers": 2,
    "morale": 1
  },
  "UGUniv2": {
    "resources": [
      "PrecB"
    ],
    "power": 2,
    "workers": 2,
    "morale": 1
  },
  "UGUniv3": {
    "resources": [
      "PrecB"
    ],
    "power": 2,
    "workers": 2,
    "morale": 1
  },
  "UGCommercial": {
    "resources": [],
    "power": 3,
    "workers": 2,
    "morale": 1
  },
  "UGCommercial2": {
    "resources": [],
    "power": 3,
    "workers": 2,
    "morale": 1
  },
  "UGCommercial3": {
    "resources": [],
    "power": 3,
    "workers": 2,
    "morale": 1
  },
  "UGPark": {
    "resources": [],
    "power": 1,
    "workers": 0,
    "morale": 1
  },
  "UGFact": {
    "resources": [
      "MetalA",
      "MinA",
      "MinB",
      "MinC"
    ],
    "power": 3,
    "workers": 2,
    "morale": 0
  },
  "UGFact2": {
    "resources": [
      "MetalA",
      "MinA",
      "MinB",
      "MinC"
    ],
    "power": 3,
    "workers": 2,
    "morale": 0
  },
  "UGLab": {
    "resources": [
      "PrecA",
      "PrecB",
      "MinA",
      "MinB",
      "MinC"
    ],
    "power": 3,
    "workers": 2,
    "morale": 0
  },
  "UGLab2": {
    "resources": [
      "PrecA",
      "PrecB",
      "MinA",
      "MinB",
      "MinC"
    ],
    "power": 3,
    "workers": 2,
    "morale": 0
  },
  "UGLab3": {
    "resources": [
      "PrecA",
      "PrecB",
      "MinA",
      "MinB",
      "MinC"
    ],
    "power": 3,
    "workers": 2,
    "morale": 0
  },
  "UGMine": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "UGMine2": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "UGTokamak": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "UGTokamak2": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "UGSpacePort": {
    "resources": [],
    "power": 1,
    "workers": 1,
    "morale": 0
  },
  "UGRed": {
    "resources": [],
    "power": 2,
    "workers": 2,
    "morale": 2
  },
  "UGAdmin": {
    "resources": [],
    "power": 1,
    "workers": 1,
    "morale": 0
  },
  "UGAdmin2": {
    "resources": [],
    "power": 1,
    "workers": 1,
    "morale": 0
  },
  "UGMed": {
    "resources": [
      "PrecB"
    ],
    "power": 2,
    "workers": 2,
    "morale": 0
  },
  "UGMed2": {
    "resources": [
      "PrecB"
    ],
    "power": 2,
    "workers": 2,
    "morale": 0
  },
  "UGCore": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "UGConst": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "UGCops": {
    "resources": [
      "MetalA",
      "MetalB",
      "MinA"
    ],
    "power": 3,
    "workers": 2,
    "morale": 0
  },
  "UGCops2": {
    "resources": [
      "MetalA",
      "MetalB",
      "MinA"
    ],
    "power": 3,
    "workers": 2,
    "morale": 0
  },
  "UGGeoTherm": {
    "resources": [],
    "power": 0,
    "workers": 1,
    "morale": 0
  },
  "UGTrade": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "UGDestroyed": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "UGDestroyed2": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "UGDestroyed3": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "RoboDoze": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "RoboDig": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "RoboMine": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "RoboExplr": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "UGRoboDoze": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "UGRoboDig": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "UGTargetDig": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "XPipe": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "LPipe": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "RPipe": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "UGRPipe": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "UGLPipe": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "UGXPipe": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "Colonists": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "Food": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "LifeSupport": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "SolarSat": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "GeoProbe": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "WeatherSat": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "InterStellarProbe": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "CommSat": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "OrbitObserve": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  },
  "ULBIProbe": {
    "resources": [],
    "power": 0,
    "workers": 0,
    "morale": 0
  }
};
