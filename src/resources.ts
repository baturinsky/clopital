import { FIR } from "./biomes";
import { asArray, objMap } from "./util";

export const
  convertResources = (raw: any) => {
    raw = asArray(raw);
    return { sprite: raw[0], color: raw[1]?.split(",") }
  },

  resources = objMap({
    unknown: 106,
    working: 80,
    workingHard: 81,
    sowing: 98,
    crops: [82, "#0f0"],
    deposits: 8,
    ore: [83, "#00f,,#008"],
    salt: [83, "#fff,,#aaa"],
    trees: FIR,
    soil: [105, "#000"],
    deepwater: [86, "#048,#fff"],
    irrigation: [86, "#00f,#fff"],
    water: [86, "#08f,#fff"],

    walking: [100, "#fff"],
    flying: [101, "#fff"],
    swimming: [102, "#fff"],

    walkingFar: [100, "#f80"],
    flyingFar: [101, "#f80"],
    swimmingFar: [102, "#f80"],

    stone: [83, "#444,,#444"],
    lumber: [112, "#a80"],
    berries: [99, "#808,,#fff"],
    axing: 109,
    grass: [90, "#0a0,#0a0"],
    seaweed: [90, "#0a0,#0a0"],
    magic: 94,
    food: 87,
    fertilisers: [89, "#620,#220"],
    thinking: [91, "#fca"],
    spelunking: [91, "#006"],
    digging: 110,
    transport: 100
  }, convertResources) as {
    [key: string]: {
      sprite: number
      color?: string[],
      sc?: HTMLCanvasElement
    }
  }
