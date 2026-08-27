import { RGBA, hexToRgb } from "./util";

export type Biome = {
  color: string,
  trees?: number,
  name: string,
  rgba: RGBA,
  prop?: number,
  travel?: number
  seaTravel?: number
  sprites: HTMLCanvasElement[];
}

export type BiomeName = keyof typeof biomesByNames;

/**   wet 
 *hot    cold
 *   arid
 */
export const biomeMatrix = [
  ["rainforest", "swamp", "taiga", "snow"],
  ["plains", "forest", "taiga", "snow"],
  ["desert", "savannah", "tundra", "snow"],
] as BiomeName[][];

export const FIR = 1, TREE = 2, PALM = 3, HILLS = 4, GRASS = 5, WAVES = 6, DUNES = 7, MESA = 8, HUTS = 9, HUTS2 = 10;

export const biomesByNames: { [name: string]: Biome } = {
  snow: {
    color: "#fff",
    travel: 2,
  },
  tundra: {
    color: "#8fa",
    prop: GRASS,
    travel: 2,
  },
  plains: {
    color: "#2c0",
    prop: GRASS,
    travel: 1,
  },
  swamp: {
    color: "#0aa",
    prop: GRASS,
    travel: 4,
  },
  desert: {
    color: "#f80",
    prop: DUNES,
    travel: 2,

  },
  savannah: {
    color: "#6f2",
    prop: GRASS,
    travel: 1,
  },
  rainforest: {
    color: "#060",
    prop: PALM,
    travel: 4,
  },
  forest: {
    color: "#0a0",
    prop: TREE,
    travel: 2,
  },
  taiga: {
    color: "#fff",
    prop: FIR,
    travel: 3,
  },
  ocean: {
    color: "#03b",
    prop: WAVES,
    seaTravel: 2
  },
  sea: {
    color: "#04c",
    prop: WAVES,
    seaTravel: 1
  },
} as { [name: string]: Partial<Biome> } as any;

for (let k in biomesByNames) {
  let b = biomesByNames[k]
  b.name = k;
  b.rgba = hexToRgb(b.color)
}