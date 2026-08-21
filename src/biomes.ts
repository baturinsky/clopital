import { RGBA, hexToRgb } from "./root";

export type Biome = { 
  color: string, 
  trees?: number, 
  name: string, 
  rgba: RGBA,
  prop?: number,
  sprites:HTMLCanvasElement[];
}

export type BiomeName = keyof typeof biomesByNames;

export const biomeMatrix = [
  ["rainforest", "swamp", "taiga", "snow"],
  ["savannah", "forest", "forest", "snow"],
  ["desert", "plains", "tundra", "snow"],
] as BiomeName[][];

export const FIR=1, TREE=2, PALM=3, MOUNTAIN=4, GRASS=5, WAVES=6, DUNES=7;

export const biomesByNames:{ [name: string]: Biome } = {
  snow: {
    color: "#fff"
  },
  tundra: {
    color: "#8fa",
    prop: GRASS
  },
  plains: {
    color: "#0f0",
    prop: GRASS
  },
  swamp: {
    color: "#0aa",
    prop: GRASS
  },
  desert: {
    color: "#f80",
    prop: DUNES
  },
  savannah: {
    color: "#6f2",
    prop: GRASS
  },
  rainforest: {
    color: "#2a2",
    prop: PALM
  },
  forest: {
    color: "#084",
    prop: TREE
  },
  taiga: {
    color: "#086",
    prop: FIR
  },
  ocean: {
    color: "#03b",
    prop: WAVES
  },
  sea: {
    color: "#04c",
    prop: WAVES
  },
} as { [name: string]: Partial<Biome> } as any;

for (let k in biomesByNames) {
  let b = biomesByNames[k]
  b.name = k;
  b.rgba = hexToRgb(b.color)
}