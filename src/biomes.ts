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
  sprites: HTMLCanvasElement[];
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
    crop: "moss"
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
    crop: "moss"
  },
  plains: {
    color: "#2c0",
    prop: GRASS,
    travel: 1,
    habitability: 2,
    races: "horses",
    crop: "wheat"
  },
  swamp: {
    color: "#0aa",
    prop: GRASS,
    travel: 4,
    habitability: 1,
  },
  desert: {
    color: "#f80",
    prop: DUNES,
    travel: 2,
    habitability: 1,
    races: "zebras",
    crop: "cactus"
  },
  steppe: {
    color: "#af2",
    prop: GRASS,
    travel: 1,
    habitability: 2,
    races: ["zebras", "horses"],
    crop: "cotton"
  },
  rainforest: {
    color: "#060",
    prop: PALM,
    travel: 4,
    habitability: 1,
    races: "zebras",
    mine: "gems"
  },
  forest: {
    color: "#0a0",
    prop: TREE,
    travel: 2,
    habitability: 2,
    races: ["deers", "horses"],
    crop: "apples"
  },
  taiga: {
    color: "#fff",
    prop: FIR,
    travel: 3,
    habitability: 1,
    races: "deers",
    crop: "honey"
  },
  ocean: {
    color: "#03b",
    prop: WAVES,
    seaTravel: 2,
    habitability: 0,
    races: "seahorses",
    crop: "fish"
  },
  sea: {
    color: "#04c",
    prop: WAVES,
    seaTravel: 1,
    habitability: 0,
    races: "seahorses",
    crop: "fish"
  },
} as { [name: string]: Biome };

export const resources = {
  fish: {
    biomes: { sea: 2, ocean: 1 },
    food: 1
  },
  wheat: {
    biomes: { plains: 2, steppe: 1 },
    food: 1
  },

}

for (let k in biomesByNames) {
  let b = biomesByNames[k]
  b.name = k;
  b.rgba = hexToRgb(b.color)
  b.prop = asArray(b.prop) as number[]
  b.races = asArray(b.races)
}