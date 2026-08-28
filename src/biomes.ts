import { RGBA, hexToRgb } from "./util";

export type Biome = {
  color: string,
  trees?: number,
  name: string,
  rgba: RGBA,
  prop?: number,
  travel?: number
  seaTravel?: number
  habitability: number
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
  ["desert", "savannah", "tundra", "snowfield"],
] as BiomeName[][];

export const FIR = 1, TREE = 2, PALM = 3, HILLS = 4, GRASS = 5, WAVES = 6, DUNES = 7, MESA = 8, HUTS = 9, HUTS2 = 10;

export const biomesByNames = {
  peaks: {
    color: "#fff",
    prop: MESA,
    travel: 2,
    habitability: 0,
  },
  snowfield: {
    color: "#fff",
    travel: 2,
    habitability: 0,
  },
  tundra: {
    color: "#8fa",
    prop: GRASS,
    travel: 2,
    habitability: 1,
  },
  plains: {
    color: "#2c0",
    prop: GRASS,
    travel: 1,
    habitability: 2,
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
  },
  savannah: {
    color: "#6f2",
    prop: GRASS,
    travel: 1,
    habitability: 2,
  },
  rainforest: {
    color: "#060",
    prop: PALM,
    travel: 4,
    habitability: 1,
  },
  forest: {
    color: "#0a0",
    prop: TREE,
    travel: 2,
    habitability: 2,
  },
  taiga: {
    color: "#fff",
    prop: FIR,
    travel: 3,
    habitability: 1,
  },
  ocean: {
    color: "#03b",
    prop: WAVES,
    seaTravel: 2,
    habitability: 0,
  },
  sea: {
    color: "#04c",
    prop: WAVES,
    seaTravel: 1,
    habitability: 0,
  },
} as any as { [name: string]: Biome };

for (let k in biomesByNames) {
  let b = biomesByNames[k]
  b.name = k;
  b.rgba = hexToRgb(b.color)
}