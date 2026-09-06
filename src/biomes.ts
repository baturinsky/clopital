import { RGBA, asArray, hexToRgb } from "./util";

export type Biome = {
  color: string,
  name: string,
  rgba: RGBA,
  prop: number[],
  travel?: number
  seaTravel?: number
  habitability: number
  races: string[]
  sprites: HTMLCanvasElement[]
  soil: number
  trees: number
  deposits: number
  deepwater: number
}

export type BiomeName = keyof typeof biomesByNames;

/**   wet 
 *hot    cold
 *   arid
 */
export const biomeMatrix = [
  ["rainforest", "swamp", "taiga", "snowfield"],
  ["plains", "forest", "taiga", "snowfield"],
  ["desert", "steppe", "tundra", "snowfield"],
] as BiomeName[][];

export const BEDROCK = 0, FIR = 1, TREE = 2, PALM = 3, HILLS = 4, GRASS = 5, WAVES = 6, DUNES = 7,
  MESA = 8, MESA2 = 9, HUTS = 10, HUTS2 = 11;

//@ts-ignore
export const biomesByNames = {
  bedrock: {
    color: "#000",
    prop: BEDROCK,
    travel: 1e9,
    habitability: 0
  },
  peaks: {
    color: "#fff",
    prop: [MESA, MESA2],
    travel: 2,
    habitability: 0,
    races: "goats",
    crop: "moss",
    deposits: 3,
    soil:1
  },
  snowfield: {
    color: "#fff",
    travel: 2,
    habitability: 0,
    races: "deers"
  },
  tundra: {
    color: "#8fa",
    prop: GRASS,
    travel: 2,
    habitability: 1,
    races: "deers",
    crop: "moss",
    soil: 2
  },
  plains: {
    color: "#2c0",
    prop: GRASS,
    travel: 1,
    habitability: 2,
    races: "horses",
    crop: "wheat",
    soil: 6
  },
  swamp: {
    color: "#0aa",
    prop: GRASS,
    travel: 4,
    habitability: 1,
    soil: 3
  },
  desert: {
    color: "#f80",
    prop: DUNES,
    travel: 2,
    habitability: 1,
    races: "zebras",
    crop: "cactus",
    soil: 2
  },
  steppe: {
    color: "#af2",
    prop: GRASS,
    travel: 1,
    habitability: 2,
    races: ["zebras", "horses"],
    crop: "cotton",
    soil: 4
  },
  rainforest: {
    color: "#060",
    prop: PALM,
    travel: 4,
    habitability: 1,
    races: "zebras",
    mine: "gems",
    soil: 3,
    trees: 4
  },
  forest: {
    color: "#0a0",
    prop: TREE,
    travel: 2,
    habitability: 2,
    races: ["deers", "horses"],
    crop: "apples",
    soil: 3,
    trees: 3
  },
  taiga: {
    color: "#fff",
    prop: FIR,
    travel: 3,
    habitability: 1,
    races: "deers",
    crop: "honey",
    soil: 2,
    trees: 2
  },
  ocean: {
    color: "#03b",
    prop: WAVES,
    seaTravel: 2,
    habitability: 0,
    races: "seahorses",
    crop: "fish",
    deepwater: 1
  },
  sea: {
    color: "#04c",
    prop: WAVES,
    seaTravel: 1,
    habitability: 0,
    races: "seahorses",
    crop: "fish",
    deepwater: 1
  },
} as { [name: string]: Biome };

for (let k in biomesByNames) {
  let b = biomesByNames[k]
  b.name = k;
  b.rgba = hexToRgb(b.color)
  b.prop = asArray(b.prop) as number[]
  b.races = asArray(b.races)
}