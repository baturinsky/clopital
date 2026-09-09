import { GoodNumbers } from "./market";
import { RGBA, asArray, hexToRgb } from "./util";

export type Biome = {
  color: string,
  name: string,
  rgba: RGBA,
  prop: number,
  travel?: number
  seaTravel?: number
  habitability: number
  races: string[]
  sprites: HTMLCanvasElement[]
  soil: number
  trees: number
  deposits: number
  deepwater: number
  special?: GoodNumbers
}

export type BiomeName = keyof typeof biomesByNames;

/**   wet 
 *hot    cold
 *   arid
 */
export const biomeMatrix = [
  ["jungles", "swamp", "taiga", "snowfield"],
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
    prop: MESA2,
    travel: 2,
    habitability: 0,
    races: "goats",
    special: { gems: 1 },
    deposits: 3,
    soil: 1
  },
  snowfield: {
    color: "#fff",
    travel: 2,
    habitability: 0,
    races: "deers",
    special: { coal: 1 },
  },
  tundra: {
    color: "#8fa",
    prop: GRASS,
    travel: 2,
    habitability: 1,
    races: "deers",
    special: { moss: 1 },
    soil: 2
  },
  plains: {
    color: "#2c0",
    prop: GRASS,
    travel: 1,
    habitability: 2,
    races: "horses",
    special: { wheat: 5 },
    specialx: 3,
    soil: 6
  },
  swamp: {
    color: "#0aa",
    prop: GRASS,
    travel: 4,
    habitability: 1,
    soil: 3,
    races: "unicorns",
    special: { sugarcane: 1 },
  },
  desert: {
    color: "#f80",
    prop: DUNES,
    travel: 2,
    habitability: 1,
    races: "zebras",
    special: { cacao: 5 },
    soil: 2
  },
  steppe: {
    color: "#af2",
    prop: GRASS,
    travel: 1,
    habitability: 2,
    races: ["zebras", "horses"],
    special: { cotton: 1 },
    soil: 4
  },
  jungles: {
    color: "#060",
    prop: PALM,
    travel: 4,
    habitability: 1,
    races: "zebras",
    special: { rubber: 3 },
    soil: 3,
    trees: 4
  },
  forest: {
    color: "#0a0",
    prop: TREE,
    travel: 2,
    habitability: 2,
    races: ["deers", "horses"],
    special: { apples: 1 },
    soil: 3,
    trees: 3
  },
  taiga: {
    color: "#fff",
    prop: FIR,
    travel: 3,
    habitability: 1,
    races: "deers",
    special: { honey: 1 },
    soil: 2,
    trees: 2
  },
  ocean: {
    color: "#03b",
    prop: WAVES,
    seaTravel: 2,
    habitability: 0,
    races: "seahorses",
    special: { pearls: .3 },
    deepwater: 1
  },
  sea: {
    color: "#04c",
    prop: WAVES,
    seaTravel: 1,
    habitability: 0,
    races: "seahorses",
    special: { oil: 1 },
    deepwater: 1
  },
} as { [name: string]: Biome };

for (let k in biomesByNames) {
  let b = biomesByNames[k]
  b.name = k;
  b.rgba = hexToRgb(b.color)
  b.races = asArray(b.races)
}